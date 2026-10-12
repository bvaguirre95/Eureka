"""
CRUD para plantillas de inspección.
"""
from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.inspection_template import InspectionTemplate, TemplateSourceEnum
from app.models.inspection import StructureTypeEnum
from app.schemas.inspection_template import (
    InspectionTemplateCreate, InspectionTemplateOut,
    InspectionTemplateListItem, InspectionTemplateUpdate,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_out(t: InspectionTemplate) -> InspectionTemplateOut:
    return InspectionTemplateOut(
        id=t.id,
        organization_id=t.organization_id,
        name=t.name,
        description=t.description,
        category=t.category,
        structure_type=t.structure_type or StructureTypeEnum.MATRIZ,
        source=t.source,
        suggested_periodicity=t.suggested_periodicity,
        suggested_pdf_template=t.suggested_pdf_template or "generico",
        fields_schema=t.fields_schema or [],
        is_active=t.is_active,
        times_used=t.times_used,
        copied_from_id=t.copied_from_id,
        created_by_id=t.created_by_id,
        created_by_name=t.created_by.full_name if t.created_by else None,
        created_at=t.created_at,
        field_count=len(t.fields_schema or []),
    )


def _to_list_item(t: InspectionTemplate) -> InspectionTemplateListItem:
    return InspectionTemplateListItem(
        id=t.id,
        organization_id=t.organization_id,
        name=t.name,
        description=t.description,
        category=t.category,
        structure_type=t.structure_type or StructureTypeEnum.MATRIZ,
        source=t.source,
        suggested_periodicity=t.suggested_periodicity,
        is_active=t.is_active,
        times_used=t.times_used,
        field_count=len(t.fields_schema or []),
        created_at=t.created_at,
    )


# ── Queries ───────────────────────────────────────────────────────────────────

def get_templates_for_org(
    db: Session,
    organization_id: int,
    only_active: bool = True,
    category: Optional[str] = None,
) -> List[InspectionTemplateListItem]:
    """
    Retorna plantillas visibles para una organización:
    - Todas las globales (organization_id IS NULL)
    - Las propias de la org (organization_id = org_id)
    """
    stmt = select(InspectionTemplate).where(
        or_(
            InspectionTemplate.organization_id == None,
            InspectionTemplate.organization_id == organization_id,
        )
    )
    if only_active:
        stmt = stmt.where(InspectionTemplate.is_active == True)
    if category:
        stmt = stmt.where(InspectionTemplate.category == category)

    stmt = stmt.order_by(
        InspectionTemplate.source,   # GLOBAL primero
        InspectionTemplate.category,
        InspectionTemplate.name,
    )
    templates = db.execute(stmt).scalars().all()
    return [_to_list_item(t) for t in templates]


def get_template(db: Session, template_id: int) -> Optional[InspectionTemplate]:
    return db.get(InspectionTemplate, template_id)


def get_template_out(db: Session, template_id: int) -> Optional[InspectionTemplateOut]:
    t = db.get(InspectionTemplate, template_id)
    return _to_out(t) if t else None


# ── Mutaciones ────────────────────────────────────────────────────────────────

def create_template(
    db: Session,
    template_in: InspectionTemplateCreate,
    organization_id: Optional[int],   # None = global (solo super-admin)
    user_id: int,
    source: TemplateSourceEnum = TemplateSourceEnum.ORGANIZACION,
) -> InspectionTemplateOut:
    t = InspectionTemplate(
        organization_id=organization_id,
        name=template_in.name,
        description=template_in.description,
        category=template_in.category,
        structure_type=template_in.structure_type,
        source=source,
        suggested_periodicity=template_in.suggested_periodicity,
        suggested_pdf_template=template_in.suggested_pdf_template or "generico",
        fields_schema=template_in.fields_schema,
        is_active=template_in.is_active,
        times_used=0,
        created_by_id=user_id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_out(t)


def update_template(
    db: Session,
    template: InspectionTemplate,
    template_in: InspectionTemplateUpdate,
) -> InspectionTemplateOut:
    for field in ["name", "description", "category", "structure_type",
                  "suggested_periodicity", "suggested_pdf_template",
                  "fields_schema", "is_active"]:
        v = getattr(template_in, field, None)
        if v is not None:
            setattr(template, field, v)
    db.commit()
    db.refresh(template)
    return _to_out(template)


def copy_template(
    db: Session,
    source_template: InspectionTemplate,
    organization_id: int,
    user_id: int,
    new_name: Optional[str] = None,
) -> InspectionTemplateOut:
    """
    Copia una plantilla (global o de otra org) a la organización del usuario.
    La copia es editable y pertenece a la org.
    """
    copy = InspectionTemplate(
        organization_id=organization_id,
        name=new_name or f"Copia de {source_template.name}",
        description=source_template.description,
        category=source_template.category,
        structure_type=source_template.structure_type,
        source=TemplateSourceEnum.ORGANIZACION,
        suggested_periodicity=source_template.suggested_periodicity,
        suggested_pdf_template=source_template.suggested_pdf_template,
        fields_schema=source_template.fields_schema,
        is_active=True,
        times_used=0,
        copied_from_id=source_template.id,
        created_by_id=user_id,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return _to_out(copy)


def delete_template(db: Session, template: InspectionTemplate) -> None:
    """Solo elimina plantillas propias de la org — las globales no se borran."""
    db.delete(template)
    db.commit()


def increment_usage(db: Session, template: InspectionTemplate) -> None:
    template.times_used += 1
    db.commit()