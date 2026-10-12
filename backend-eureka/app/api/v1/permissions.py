from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.crud.permission import get_permissions
from app.models.user import User
from app.schemas.permission import PermissionOut

router = APIRouter(prefix="/permissions", tags=["Permisos"])


class PermissionGroup(BaseModel):
    module: str
    permissions: List[PermissionOut]


@router.get("/", response_model=List[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("roles.view", "roles.manage")),
):
    """Lista plana de todos los permisos disponibles."""
    return get_permissions(db)


@router.get("/grouped", response_model=List[PermissionGroup])
def list_permissions_grouped(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("roles.view", "roles.manage")),
):
    """
    Permisos agrupados por módulo — usado por el frontend para
    mostrar checkboxes organizados en el formulario de roles.
    """
    perms = get_permissions(db)
    groups: Dict[str, List[PermissionOut]] = {}
    for p in perms:
        groups.setdefault(p.module, []).append(p)
    return [PermissionGroup(module=module, permissions=perms) for module, perms in groups.items()]
