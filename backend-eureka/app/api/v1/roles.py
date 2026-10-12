from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.crud import role as crud_role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["Roles"])


def _resolve_org(current_user: User, org_id: Optional[int] = None) -> Optional[int]:
    """
    Determina la organización a gestionar:
    - Super admin: usa el org_id del query param (obligatorio para listar/crear).
    - Admin de org: siempre su propia organización, ignora org_id.
    """
    if current_user.is_platform_admin:
        return org_id  # puede ser None si no pasó param (devuelve vacío)
    return current_user.organization_id


def _check_role_access(current_user: User, role) -> None:
    """Super admin accede a todo. Admin de org solo a su organización."""
    if current_user.is_platform_admin:
        return
    if role.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este rol")


@router.get("/", response_model=List[RoleOut])
def list_roles(
    org_id: Optional[int] = Query(None, description="Para super admin: ID de la organización a consultar"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.view", "roles.manage")),
):
    target_org = _resolve_org(current_user, org_id)
    return crud_role.get_roles(db, target_org, skip=skip, limit=limit)


@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_new_role(
    role_in: RoleCreate,
    org_id: Optional[int] = Query(None, description="Para super admin: ID de la organización"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.manage")),
):
    target_org = _resolve_org(current_user, org_id)
    if target_org is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes indicar la organización (org_id) para crear el rol",
        )
    if crud_role.get_role_by_name(db, role_in.name, target_org):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un rol con ese nombre")
    try:
        return crud_role.create_role(db, role_in, target_org)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{role_id}", response_model=RoleOut)
def get_role_by_id(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.view", "roles.manage")),
):
    role = crud_role.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    _check_role_access(current_user, role)
    return role


@router.put("/{role_id}", response_model=RoleOut)
def update_existing_role(
    role_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.manage")),
):
    role = crud_role.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    _check_role_access(current_user, role)

    if role_in.name and role_in.name != role.name:
        existing = crud_role.get_role_by_name(db, role_in.name, role.organization_id)
        if existing and existing.id != role.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un rol con ese nombre")
    try:
        return crud_role.update_role(db, role, role_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.manage")),
):
    role = crud_role.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    _check_role_access(current_user, role)
    try:
        crud_role.delete_role(db, role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
