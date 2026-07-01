from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.permission import get_permissions_by_ids
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate


def get_role(db: Session, role_id: int) -> Optional[Role]:
    return db.get(Role, role_id)


def get_role_by_name(
    db: Session, name: str, organization_id: Optional[int]
) -> Optional[Role]:
    stmt = select(Role).where(
        Role.name == name, Role.organization_id == organization_id
    )
    return db.execute(stmt).scalar_one_or_none()


def get_roles(
    db: Session, organization_id: Optional[int], skip: int = 0, limit: int = 100
) -> List[Role]:
    """
    Devuelve los roles de la organización indicada.
    Super-admin (organization_id=None) ve todos.
    """
    stmt = select(Role)
    if organization_id is not None:
        stmt = stmt.where(Role.organization_id == organization_id)
    stmt = stmt.order_by(Role.name).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def _set_role_permissions(db: Session, role: Role, permission_ids: List[int]) -> None:
    permissions = get_permissions_by_ids(db, permission_ids)
    if len(permissions) != len(set(permission_ids)):
        found_ids = {p.id for p in permissions}
        missing = set(permission_ids) - found_ids
        raise ValueError(f"Permiso(s) inexistente(s): {sorted(missing)}")
    role.permissions = permissions


def create_role(
    db: Session, role_in: RoleCreate, organization_id: Optional[int]
) -> Role:
    role = Role(
        name=role_in.name,
        description=role_in.description,
        is_company_scoped=role_in.is_company_scoped,
        is_system=False,
        organization_id=organization_id,
    )
    db.add(role)
    db.flush()
    if role_in.permission_ids:
        _set_role_permissions(db, role, role_in.permission_ids)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role: Role, role_in: RoleUpdate) -> Role:
    update_data = role_in.model_dump(exclude_unset=True)
    permission_ids = update_data.pop("permission_ids", None)
    if role.is_system:
        update_data.pop("name", None)
        update_data.pop("is_company_scoped", None)
    for field, value in update_data.items():
        setattr(role, field, value)
    if permission_ids is not None:
        _set_role_permissions(db, role, permission_ids)
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role: Role) -> None:
    if role.is_system:
        raise ValueError("No se puede eliminar un rol del sistema")
    if role.users:
        raise ValueError(
            "No se puede eliminar este rol porque tiene usuarios asignados."
        )
    db.delete(role)
    db.commit()
