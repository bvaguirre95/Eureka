from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission, require_platform_admin
from app.crud import document_catalog as crud_catalog
from app.models.user import User
from app.schemas.document_catalog import DocumentCatalogCreate, DocumentCatalogOut, DocumentCatalogUpdate

router = APIRouter(prefix="/document-catalog", tags=["Catálogo de Documentos"])


@router.get("/", response_model=List[DocumentCatalogOut])
def list_catalog_items(
    only_active: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    return crud_catalog.get_catalog_items(db, current_user.organization_id, only_active=only_active)


@router.post("/global", response_model=DocumentCatalogOut, status_code=status.HTTP_201_CREATED)
def create_global_catalog_item(
    item_in: DocumentCatalogCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    """Crea un item global (normativa de plataforma). Solo super-admin."""
    if crud_catalog.get_catalog_item_by_code(db, item_in.code, organization_id=None, is_global=True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un item global con ese código")
    return crud_catalog.create_catalog_item(db, item_in, organization_id=None, is_global=True)


@router.post("/", response_model=DocumentCatalogOut, status_code=status.HTTP_201_CREATED)
def create_org_catalog_item(
    item_in: DocumentCatalogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.manage_catalog")),
):
    """Crea un item propio de la organización del usuario."""
    if current_user.organization_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usa /global para crear items de plataforma")
    if crud_catalog.get_catalog_item_by_code(db, item_in.code, current_user.organization_id, is_global=False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un item con ese código en tu organización")
    return crud_catalog.create_catalog_item(db, item_in, current_user.organization_id, is_global=False)


@router.get("/{item_id}", response_model=DocumentCatalogOut)
def get_catalog_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("documents.view")),
):
    item = crud_catalog.get_catalog_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    return item


@router.put("/{item_id}", response_model=DocumentCatalogOut)
def update_catalog_item(
    item_id: int,
    item_in: DocumentCatalogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.manage_catalog")),
):
    item = crud_catalog.get_catalog_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    if item.is_global and not current_user.is_platform_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el super-admin puede editar items globales")
    if not item.is_global and item.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este item")
    return crud_catalog.update_catalog_item(db, item, item_in)


@router.delete("/{item_id}", response_model=DocumentCatalogOut)
def deactivate_catalog_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.manage_catalog")),
):
    item = crud_catalog.get_catalog_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    if item.is_global and not current_user.is_platform_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el super-admin puede desactivar items globales")
    if not item.is_global and item.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este item")
    return crud_catalog.deactivate_catalog_item(db, item)
