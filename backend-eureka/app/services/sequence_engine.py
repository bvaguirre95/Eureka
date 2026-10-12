"""
Sequence Engine — Motor de secuencias genérico y concurrente.

Uso desde cualquier módulo:

    from app.services.sequence_engine import SequenceEngine

    code = SequenceEngine.next(
        db=db,
        code="inspection",
        context={"company": "EMP", "inspection_type": "IEXT"},
        scope={"company": 1, "inspection_type": 2},
    )
    # → "EMP-IEXT-001"

Garantías de concurrencia:
  - SELECT ... FOR UPDATE bloquea la fila del contador a nivel de PostgreSQL.
  - Dos transacciones simultáneas con el mismo scope_key se serializan;
    la segunda espera a que la primera haga commit antes de leer.
  - UNIQUE(sequence_def_id, scope_key) evita que dos transacciones creen
    el mismo contador si ambas llegan cuando no existe aún (INSERT OR conflict).
  - No hay números duplicados aunque 100 usuarios generen inspecciones
    en el mismo milisegundo.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.sequence import ResetPolicyEnum, SequenceCounter, SequenceDef


# ── Helpers internos ──────────────────────────────────────────────────────────

def _build_scope_key(scope: Dict[str, Any]) -> str:
    """
    Genera una clave canónica y estable a partir del dict de scope.

    Reglas:
      - Claves ordenadas alfabéticamente → reproducible siempre.
      - Valores convertidos a str y en minúsculas.
      - Formato: "clave1=valor1|clave2=valor2"
      - Si el dict está vacío → "global"

    Ejemplos:
        {}                              → "global"
        {"company": 1}                  → "company=1"
        {"company": 1, "inspection_type": 2}
                                        → "company=1|inspection_type=2"
        {"inspection_type": 2, "company": 1}   # misma clave aunque distinto orden
                                        → "company=1|inspection_type=2"
    """
    if not scope:
        return "global"
    parts = [f"{k}={str(v).lower()}" for k, v in sorted(scope.items())]
    return "|".join(parts)


def _current_period(policy: ResetPolicyEnum) -> Optional[str]:
    """
    Devuelve el período actual según la política de reset.
      NEVER   → None  (nunca se reinicia)
      YEARLY  → "2026"
      MONTHLY → "2026-07"
    """
    now = datetime.now(timezone.utc)
    if policy == ResetPolicyEnum.YEARLY:
        return now.strftime("%Y")
    if policy == ResetPolicyEnum.MONTHLY:
        return now.strftime("%Y-%m")
    return None


def _render_template(template: str, context: Dict[str, Any], number: int, padding: int) -> str:
    """
    Renderiza el template sustituyendo variables del context y {number}.

    Soporte:
      {number}      → número con padding por defecto de la SequenceDef
      {number:05}   → padding explícito en el template (tiene prioridad)
      {year}        → año actual (inyectado si aparece en template)
      {month}       → mes actual (inyectado si aparece en template)
      {company}     → cualquier clave del context dict
      {cualquier}   → cualquier clave del context dict

    Errores:
      Si el template referencia una variable que no está en context
      se lanza KeyError con mensaje claro.
    """
    now = datetime.now(timezone.utc)

    # Variables disponibles: context + inyecciones automáticas
    variables: Dict[str, Any] = {
        "year":  now.strftime("%Y"),
        "month": now.strftime("%m"),
        **{k: str(v) for k, v in context.items()},
    }

    # Sustituir {number} sin formato → usar padding de SequenceDef
    # Sustituir {number:Xd} o {number:0Xd} → respetar el formato del template
    def _replace_number(match: re.Match) -> str:
        fmt = match.group(1)  # p. ej. ":05" o "" si es solo {number}
        if fmt:
            # Extraer solo el número de ancho del format spec
            width = re.search(r"\d+", fmt)
            if width:
                return str(number).zfill(int(width.group()))
        return str(number).zfill(padding)

    result = re.sub(r"\{number(:[^}]*)?\}", _replace_number, template)

    # Sustituir el resto de variables
    try:
        result = result.format_map(variables)
    except KeyError as exc:
        missing = str(exc).strip("'")
        available = list(variables.keys())
        raise ValueError(
            f"El template '{template}' referencia '{missing}' "
            f"pero no está en el context. Disponibles: {available}"
        ) from exc

    return result


# ── Motor principal ───────────────────────────────────────────────────────────

class SequenceEngine:
    """
    Motor de secuencias.  Todos los métodos son @staticmethod para que
    cualquier módulo pueda llamarlos sin instanciar nada.
    """

    @staticmethod
    def next(
        db: Session,
        code: str,
        context: Optional[Dict[str, Any]] = None,
        scope: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Genera y devuelve el siguiente código de la secuencia identificada
        por `code`.  Consume el número (lo incrementa en la base de datos).

        Parámetros:
            db       → sesión SQLAlchemy activa
            code     → código de la SequenceDef (p. ej. "inspection")
            context  → variables para renderizar el template
            scope    → claves para identificar el contador correcto

        Retorna:
            El código generado como string (p. ej. "EMP-IEXT-001").

        Lanza:
            ValueError si la secuencia no existe o está inactiva.
            ValueError si el template referencia variables no presentes.
        """
        context = context or {}
        scope   = scope   or {}

        # 1. Obtener la definición
        seq_def: Optional[SequenceDef] = db.execute(
            select(SequenceDef).where(SequenceDef.code == code)
        ).scalar_one_or_none()

        if seq_def is None:
            raise ValueError(f"No existe una secuencia con code='{code}'")
        if not seq_def.is_active:
            raise ValueError(f"La secuencia '{code}' está inactiva")

        # 2. Construir scope_key canónico
        scope_key = _build_scope_key(scope)

        # 3. Período actual según política de reset
        current_period = _current_period(seq_def.reset_policy)

        # 4. Obtener o crear el contador CON bloqueo pesimista
        #    Primer intento: INSERT ... ON CONFLICT DO NOTHING
        #    Esto evita race condition en la creación simultánea.
        db.execute(
            pg_insert(SequenceCounter).values(
                sequence_def_id=seq_def.id,
                scope_key=scope_key,
                current_value=0,
                reset_at=current_period,
            ).on_conflict_do_nothing(
                index_elements=["sequence_def_id", "scope_key"]
            )
        )
        db.flush()

        # SELECT FOR UPDATE: solo una transacción puede modificar esta fila
        # a la vez. Las demás esperan hasta que la primera haga commit.
        counter: SequenceCounter = db.execute(
            select(SequenceCounter)
            .where(
                SequenceCounter.sequence_def_id == seq_def.id,
                SequenceCounter.scope_key == scope_key,
            )
            .with_for_update()
        ).scalar_one()

        # 5. Verificar si hay que reiniciar por cambio de período
        if (
            current_period is not None
            and counter.reset_at != current_period
        ):
            counter.current_value = 0
            counter.reset_at = current_period

        # 6. Incrementar
        counter.current_value += seq_def.increment
        db.flush()

        # 7. Renderizar template
        generated = _render_template(
            template=seq_def.template,
            context=context,
            number=counter.current_value,
            padding=seq_def.padding,
        )

        db.commit()
        return generated

    @staticmethod
    def preview(
        db: Session,
        code: str,
        context: Optional[Dict[str, Any]] = None,
        scope: Optional[Dict[str, Any]] = None,
    ) -> tuple[str, int]:
        """
        Previsualiza el próximo código SIN consumirlo.
        Útil para mostrar al usuario en la UI antes de confirmar.

        Retorna:
            (preview_string, next_value)
        """
        context = context or {}
        scope   = scope   or {}

        seq_def = db.execute(
            select(SequenceDef).where(SequenceDef.code == code)
        ).scalar_one_or_none()

        if seq_def is None:
            raise ValueError(f"No existe una secuencia con code='{code}'")

        scope_key      = _build_scope_key(scope)
        current_period = _current_period(seq_def.reset_policy)

        # Leer contador actual sin bloquearlo (solo lectura)
        counter = db.execute(
            select(SequenceCounter).where(
                SequenceCounter.sequence_def_id == seq_def.id,
                SequenceCounter.scope_key == scope_key,
            )
        ).scalar_one_or_none()

        if counter is None:
            current = 0
        elif (
            current_period is not None
            and counter.reset_at != current_period
        ):
            current = 0  # se reiniciaría
        else:
            current = counter.current_value

        next_value = current + seq_def.increment

        preview = _render_template(
            template=seq_def.template,
            context=context,
            number=next_value,
            padding=seq_def.padding,
        )

        return preview, next_value