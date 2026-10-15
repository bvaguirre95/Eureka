"""
Firmas de los informes — lógica única para todos los templates.

Regla: si el elaborador del informe es COORDINADOR (rol contiene "coordinador"),
el informe muestra solo su firma (sin revisado/aprobado).
Configurable por formato: layout.signatures.mode = auto | standard | coordinator_only
"""
import unicodedata
from typing import List, Optional


def _norm(s: Optional[str]) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def is_coordinator(role: Optional[str]) -> bool:
    return "coordinador" in _norm(role)


def resolve_signatories(insp, mode: str = "auto") -> List[dict]:
    """[{label, name, role}] en el orden en que deben imprimirse."""
    elab = {"label": "ELABORADO POR:", "name": insp.elaborated_by, "role": insp.elaborated_role}
    rev  = {"label": "REVISADO POR:",  "name": insp.reviewed_by,   "role": insp.reviewed_role}
    appr = {"label": "APROBADO POR:",  "name": insp.approved_by,   "role": insp.approved_role}
    only_elab = mode == "coordinator_only" or (mode == "auto" and is_coordinator(insp.elaborated_role))
    return [elab] if only_elab else [elab, rev, appr]


def table_style(n: int) -> str:
    """Con una sola firma la tabla no ocupa todo el ancho; queda centrada."""
    return "" if n >= 3 else f"width:{100 * n / 3:.1f}%;margin-left:auto;margin-right:auto"
