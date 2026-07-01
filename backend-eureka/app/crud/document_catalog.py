from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.document_catalog import DocumentCatalogItem
from app.schemas.document_catalog import DocumentCatalogCreate, DocumentCatalogUpdate


def get_catalog_item(db: Session, item_id: int) -> Optional[DocumentCatalogItem]:
    return db.get(DocumentCatalogItem, item_id)


def get_catalog_item_by_code(
    db: Session, code: str, organization_id: Optional[int] = None, is_global: bool = True
) -> Optional[DocumentCatalogItem]:
    stmt = select(DocumentCatalogItem).where(
        DocumentCatalogItem.code == code,
        DocumentCatalogItem.is_global == is_global,
        DocumentCatalogItem.organization_id == organization_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_catalog_items(
    db: Session,
    organization_id: Optional[int],
    only_active: bool = False,
) -> List[DocumentCatalogItem]:
    """
    Devuelve el catálogo visible para una organización:
    - Items globales (is_global=True, org=NULL): normativa de plataforma.
    - Items propios de esa organización (is_global=False, org=organization_id).
    Super-admin (organization_id=None): solo ve el catálogo global.
    """
    if organization_id is None:
        stmt = select(DocumentCatalogItem).where(
            DocumentCatalogItem.is_global.is_(True)
        )
    else:
        stmt = select(DocumentCatalogItem).where(
            or_(
                DocumentCatalogItem.is_global.is_(True),
                DocumentCatalogItem.organization_id == organization_id,
            )
        )
    if only_active:
        stmt = stmt.where(DocumentCatalogItem.is_active.is_(True))
    stmt = stmt.order_by(DocumentCatalogItem.code)
    return list(db.execute(stmt).scalars().all())


def get_applicable_catalog_items(
    db: Session, organization_id: Optional[int], num_trabajadores: int
) -> List[DocumentCatalogItem]:
    """Items activos aplicables para una empresa según su número de trabajadores."""
    items = get_catalog_items(db, organization_id, only_active=True)
    return [
        item
        for item in items
        if num_trabajadores >= item.min_workers
        and (item.max_workers is None or num_trabajadores <= item.max_workers)
    ]


def create_catalog_item(
    db: Session,
    item_in: DocumentCatalogCreate,
    organization_id: Optional[int],
    is_global: bool,
) -> DocumentCatalogItem:
    data = item_in.model_dump()
    item = DocumentCatalogItem(**data, organization_id=organization_id, is_global=is_global)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_catalog_item(
    db: Session, item: DocumentCatalogItem, item_in: DocumentCatalogUpdate
) -> DocumentCatalogItem:
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def deactivate_catalog_item(db: Session, item: DocumentCatalogItem) -> DocumentCatalogItem:
    item.is_active = False
    db.commit()
    db.refresh(item)
    return item
