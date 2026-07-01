from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, require_platform_admin
from app.crud import document_category as crud_cat
from app.models.user import User
from app.schemas.document_category import (
    DocumentCategoryCreate,
    DocumentCategoryOut,
    DocumentCategoryUpdate,
)

router = APIRouter(prefix="/document-categories", tags=["Categorías de Documentos"])


@router.get("/", response_model=List[DocumentCategoryOut])
def list_categories(
    only_active: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    return crud_cat.get_categories(db, current_user.organization_id, only_active=only_active)


@router.post("/global", response_model=DocumentCategoryOut, status_code=status.HTTP_201_CREATED)
def create_global_category(
    category_in: DocumentCategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    """Crea una categoría global (plataforma). Solo super-admin."""
    if crud_cat.get_category_by_name(db, category_in.name, None, is_global=True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una categoría global con ese nombre")
    return crud_cat.create_category(db, category_in, organization_id=None, is_global=True)


@router.post("/", response_model=DocumentCategoryOut, status_code=status.HTTP_201_CREATED)
def create_org_category(
    category_in: DocumentCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    """Crea una categoría propia de la organización del usuario."""
    if current_user.organization_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usa /global para crear categorías de plataforma")
    if crud_cat.get_category_by_name(db, category_in.name, current_user.organization_id, is_global=False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una categoría con ese nombre en tu organización")
    return crud_cat.create_category(db, category_in, current_user.organization_id, is_global=False)


@router.put("/{category_id}", response_model=DocumentCategoryOut)
def update_category(
    category_id: int,
    category_in: DocumentCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    category = crud_cat.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    if category.is_global and not current_user.is_platform_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el super-admin puede editar categorías globales")
    if not category.is_global and category.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta categoría")
    return crud_cat.update_category(db, category, category_in)


@router.delete("/{category_id}", response_model=DocumentCategoryOut)
def deactivate_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    category = crud_cat.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    if category.is_global and not current_user.is_platform_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el super-admin puede desactivar categorías globales")
    if not category.is_global and category.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta categoría")
    return crud_cat.deactivate_category(db, category)
