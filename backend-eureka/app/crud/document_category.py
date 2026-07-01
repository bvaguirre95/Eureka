from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.document_category import DocumentCategory
from app.schemas.document_category import DocumentCategoryCreate, DocumentCategoryUpdate


def get_category(db: Session, category_id: int) -> Optional[DocumentCategory]:
    return db.get(DocumentCategory, category_id)


def get_category_by_name(
    db: Session, name: str, organization_id: Optional[int], is_global: bool
) -> Optional[DocumentCategory]:
    stmt = select(DocumentCategory).where(
        DocumentCategory.name == name,
        DocumentCategory.is_global == is_global,
        DocumentCategory.organization_id == organization_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_categories(
    db: Session, organization_id: Optional[int], only_active: bool = False
) -> List[DocumentCategory]:
    """
    Categorías visibles para una organización: globales (plataforma) +
    propias de esa organización. Super-admin (organization_id=None): solo
    las globales.
    """
    if organization_id is None:
        stmt = select(DocumentCategory).where(DocumentCategory.is_global.is_(True))
    else:
        stmt = select(DocumentCategory).where(
            or_(
                DocumentCategory.is_global.is_(True),
                DocumentCategory.organization_id == organization_id,
            )
        )
    if only_active:
        stmt = stmt.where(DocumentCategory.is_active.is_(True))
    stmt = stmt.order_by(DocumentCategory.name)
    return list(db.execute(stmt).scalars().all())


def create_category(
    db: Session,
    category_in: DocumentCategoryCreate,
    organization_id: Optional[int],
    is_global: bool,
) -> DocumentCategory:
    category = DocumentCategory(
        **category_in.model_dump(), organization_id=organization_id, is_global=is_global
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, category: DocumentCategory, category_in: DocumentCategoryUpdate
) -> DocumentCategory:
    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def deactivate_category(db: Session, category: DocumentCategory) -> DocumentCategory:
    category.is_active = False
    db.commit()
    db.refresh(category)
    return category
