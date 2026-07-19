

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, require_platform_admin
from app.crud import sequence as crud_seq
from app.models.user import User
from app.schemas.sequence import (
    SequenceCounterOut,
    SequenceDefCreate,
    SequenceDefMini,
    SequenceDefOut,
    SequenceDefUpdate,
    SequenceDefWithCounters,
    SequenceNextRequest,
    SequenceNextResponse,
    SequencePreviewRequest,
    SequencePreviewResponse,
)
from app.services.sequence_engine import SequenceEngine, _build_scope_key

router = APIRouter(prefix="/sequences", tags=["Secuencias"])


# ── CRUD SequenceDef ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[SequenceDefMini])
def list_sequences(
    only_active: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.view")),
):
    """Lista todas las definiciones de secuencia."""
    return crud_seq.get_all_sequence_defs(db, only_active=only_active)


@router.post("/", response_model=SequenceDefOut, status_code=status.HTTP_201_CREATED)
def create_sequence(
    seq_in: SequenceDefCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.create")),
):
    """Crea una nueva definición de secuencia."""
    existing = crud_seq.get_sequence_def_by_code(db, seq_in.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una secuencia con code='{seq_in.code}'",
        )
    return crud_seq.create_sequence_def(db, seq_in)


@router.get("/{sequence_id}", response_model=SequenceDefWithCounters)
def get_sequence(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.view")),
):
    """Devuelve la definición con todos sus contadores."""
    seq = crud_seq.get_sequence_def(db, sequence_id)
    if not seq:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    counters = crud_seq.get_counters_for_sequence(db, sequence_id)
    out = SequenceDefWithCounters.model_validate(seq)
    out.counters = [SequenceCounterOut.model_validate(c) for c in counters]
    return out


@router.patch("/{sequence_id}", response_model=SequenceDefOut)
def update_sequence(
    sequence_id: int,
    seq_in: SequenceDefUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.edit")),
):
    """Actualiza parcialmente una definición de secuencia."""
    seq = crud_seq.get_sequence_def(db, sequence_id)
    if not seq:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    return crud_seq.update_sequence_def(db, seq, seq_in)


@router.delete("/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sequence(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.delete")),
):
    """Elimina una definición y todos sus contadores."""
    seq = crud_seq.get_sequence_def(db, sequence_id)
    if not seq:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    crud_seq.delete_sequence_def(db, seq)


# ── Contadores ────────────────────────────────────────────────────────────────

@router.get("/{sequence_id}/counters", response_model=List[SequenceCounterOut])
def list_counters(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.view")),
):
    """Lista todos los contadores de una secuencia (uno por scope)."""
    seq = crud_seq.get_sequence_def(db, sequence_id)
    if not seq:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    return crud_seq.get_counters_for_sequence(db, sequence_id)


@router.post(
    "/{sequence_id}/counters/{counter_id}/reset",
    response_model=SequenceCounterOut,
)
def reset_counter(
    sequence_id: int,
    counter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    Reinicia manualmente un contador a 0.
    Solo accesible por el super-admin de la plataforma.
    """
    counter = crud_seq.reset_counter(db, counter_id)
    if not counter or counter.sequence_def_id != sequence_id:
        raise HTTPException(status_code=404, detail="Contador no encontrado")
    return counter


# ── Motor ─────────────────────────────────────────────────────────────────────

@router.post("/next", response_model=SequenceNextResponse)
def generate_next(
    req: SequenceNextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.execute")),
):
    """
    Genera el siguiente código de una secuencia consumiendo el número.
    Es seguro para uso concurrente: usa SELECT FOR UPDATE internamente.
    """
    try:
        generated = SequenceEngine.next(
            db=db,
            code=req.code,
            context=req.context,
            scope=req.scope,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la secuencia: {exc}",
        )

    # Leer valor generado para incluirlo en la respuesta
    scope_key = _build_scope_key(req.scope)
    from sqlalchemy import select
    from app.models.sequence import SequenceCounter, SequenceDef
    seq_def = db.execute(
        select(SequenceDef).where(SequenceDef.code == req.code)
    ).scalar_one_or_none()
    counter = db.execute(
        select(SequenceCounter).where(
            SequenceCounter.sequence_def_id == seq_def.id,
            SequenceCounter.scope_key == scope_key,
        )
    ).scalar_one_or_none()

    return SequenceNextResponse(
        code=req.code,
        generated=generated,
        scope_key=scope_key,
        current_value=counter.current_value if counter else 0,
    )


@router.post("/preview", response_model=SequencePreviewResponse)
def preview_next(
    req: SequencePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequences.view")),
):
    """
    Previsualiza el próximo código SIN consumirlo ni incrementar el contador.
    """
    try:
        preview, next_value = SequenceEngine.preview(
            db=db,
            code=req.code,
            context=req.context,
            scope=req.scope,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return SequencePreviewResponse(
        code=req.code,
        preview=preview,
        next_value=next_value,
    )
