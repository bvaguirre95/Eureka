"""
CRUD de formatos de informe (versionados).

Regla de versionado: un formato con inspecciones asociadas es inmutable en
contenido; editarlo crea la versión N+1 (mismo code), reapunta los tipos de la
organización a esa versión y deja intactas las inspecciones ya emitidas.
"""
from typing import List, Optional

from slugify import slugify
from types import SimpleNamespace

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.report_formats import (
    default_layout, default_sections, formulario_pdf_sections,
    validate_layout, validate_sections,
)
from app.models.company import Company
from app.models.inspection import Inspection, InspectionType
from app.models.inspection_report_format import InspectionReportFormat as RF
from app.schemas.inspection_report_format import (
    ReportFormatCreate, ReportFormatOut, ReportFormatUpdate,
)

_CONTENT_FIELDS = ("name", "document_kind", "pdf_template", "sections", "layout")


def is_in_use(db: Session, format_id: int) -> bool:
    return db.execute(select(func.count()).select_from(Inspection)
                      .where(Inspection.report_format_id == format_id)).scalar_one() > 0


def to_out(db: Session, f: RF) -> ReportFormatOut:
    out = ReportFormatOut.model_validate(f)
    out.is_global = f.organization_id is None
    out.in_use = is_in_use(db, f.id)
    return out


def get_format(db: Session, format_id: int) -> Optional[RF]:
    return db.get(RF, format_id)


def list_formats(db: Session, org_id: int, all_versions: bool = False) -> List[RF]:
    rows = db.execute(
        select(RF).where(or_(RF.organization_id.is_(None), RF.organization_id == org_id))
        .order_by(RF.organization_id.is_not(None), RF.name, RF.version.desc())
    ).scalars().all()
    if all_versions:
        return rows
    seen, latest = set(), []
    for r in rows:                      # ya viene version desc por (name)
        k = (r.organization_id, r.code)
        if k not in seen:
            seen.add(k)
            latest.append(r)
    return latest


def check_assignable(db: Session, format_id: int, org_id: int) -> RF:
    """El formato debe ser global u de la misma organización, y estar activo."""
    f = get_format(db, format_id)
    if not f or (f.organization_id not in (None, org_id)):
        raise ValueError("Formato de informe no encontrado")
    if not f.is_active:
        raise ValueError("El formato de informe está inactivo")
    return f


def _unique_code(db: Session, org_id: int, base: str) -> str:
    code, i = base, 2
    while db.execute(select(RF.id).where(RF.organization_id == org_id, RF.code == code)).first():
        code, i = f"{base}_{i}", i + 1
    return code


def create_format(db: Session, org_id: int, user_id: int, data: ReportFormatCreate) -> RF:
    src = None
    if data.copy_from_id:
        src = check_assignable(db, data.copy_from_id, org_id)
    kind = data.document_kind or (src.document_kind if src else "informe_configurable")
    sections = data.sections or (src.sections if src else
                                 (formulario_pdf_sections() if kind == "formulario_pdf" else default_sections()))
    layout = data.layout or (src.layout if src else default_layout())
    code = (data.code or slugify(data.name, separator="_")).upper()[:50]
    f = RF(
        organization_id=org_id, code=_unique_code(db, org_id, code), version=1,
        name=data.name, description=data.description, document_kind=kind,
        pdf_template=data.pdf_template or (src.pdf_template if src else None),
        sections=validate_sections(sections), layout=validate_layout(layout),
        copied_from_id=src.id if src else None, created_by_id=user_id,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def update_format(db: Session, f: RF, data: ReportFormatUpdate, user_id: int) -> RF:
    if f.organization_id is None:
        raise ValueError("Los formatos genéricos son de solo lectura; crea una copia para personalizarlos")
    changes = data.model_dump(exclude_unset=True)
    if "sections" in changes and changes["sections"] is not None:
        changes["sections"] = validate_sections(changes["sections"])
    if "layout" in changes and changes["layout"] is not None:
        changes["layout"] = validate_layout(changes["layout"])

    content_change = any(k in changes and changes[k] is not None and changes[k] != getattr(f, k)
                         for k in _CONTENT_FIELDS)
    target = f
    if content_change and is_in_use(db, f.id):
        last = db.execute(select(func.max(RF.version)).where(
            RF.organization_id == f.organization_id, RF.code == f.code)).scalar_one()
        target = RF(
            organization_id=f.organization_id, code=f.code, version=(last or f.version) + 1,
            name=f.name, description=f.description, document_kind=f.document_kind,
            pdf_template=f.pdf_template, sections=f.sections, layout=f.layout,
            is_active=f.is_active, copied_from_id=f.id, created_by_id=user_id,
        )
        db.add(target)
        db.flush()
        # Los tipos que usaban la versión anterior pasan a la nueva (solo afecta inspecciones nuevas)
        for t in db.execute(select(InspectionType).where(
                InspectionType.report_format_id == f.id)).scalars().all():
            t.report_format_id = target.id
    for k, v in changes.items():
        if v is not None:
            setattr(target, k, v)
    db.commit()
    db.refresh(target)
    return target


def preview_inspections(db: Session, org_id: int, type_id: Optional[int] = None, limit: int = 25) -> list[dict]:
    """Inspecciones recientes de la organización para probar un formato."""
    q = (select(Inspection.id, Inspection.company_id, Company.razon_social, Inspection.inspection_number,
                Inspection.inspection_type_id, InspectionType.name, Inspection.scheduled_date)
         .join(Company, Company.id == Inspection.company_id)
         .join(InspectionType, InspectionType.id == Inspection.inspection_type_id)
         .where(Company.organization_id == org_id)
         .order_by(Inspection.id.desc()).limit(limit))
    if type_id:
        q = q.where(Inspection.inspection_type_id == type_id)
    return [dict(id=r[0], company_id=r[1], company_name=r[2], inspection_number=r[3],
                 inspection_type_id=r[4], inspection_type_name=r[5], scheduled_date=r[6])
            for r in db.execute(q).all()]


def draft_format(data) -> SimpleNamespace:
    """Formato temporal (no persistido) validado, listo para el motor de PDF."""
    return SimpleNamespace(
        document_kind=data.document_kind, pdf_template=data.pdf_template, version=1,
        sections=validate_sections(data.sections) if data.sections else [],
        layout=validate_layout(data.layout),
    )
