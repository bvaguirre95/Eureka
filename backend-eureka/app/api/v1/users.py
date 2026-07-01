from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.crud import user as crud_user
from app.crud.user import count_users, get_user, get_user_by_email, get_users
from app.models.user import User
from app.schemas.common import Page
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("/", response_model=Page[UserOut])
def list_users(
    role_id: Optional[int] = None,
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.view")),
):
    items = get_users(db, current_user, role_id=role_id, search=search, skip=skip, limit=limit)
    total = count_users(db, current_user, role_id=role_id, search=search)
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.create")),
):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un usuario con ese email")
    try:
        return crud_user.create_user(db, user_in, current_user.organization_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.view")),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if not current_user.is_platform_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este usuario")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_existing_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.edit")),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if not current_user.is_platform_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este usuario")
    try:
        return crud_user.update_user(db, user, user_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{user_id}", response_model=UserOut)
def deactivate_existing_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.delete")),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes desactivar tu propio usuario")
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if not current_user.is_platform_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este usuario")
    return crud_user.deactivate_user(db, user)
