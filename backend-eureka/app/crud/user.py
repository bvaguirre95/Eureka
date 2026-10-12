from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_password_hash, verify_password
from app.crud.role import get_role
from app.models.company import Company
from app.models.role import Role
from app.models.user import User
from app.models.user_company import UserCompany
from app.schemas.user import UserCreate, UserUpdate


def get_user(db: Session, user_id: int) -> Optional[User]:
    stmt = (
        select(User)
        .options(
            selectinload(User.organization),
            selectinload(User.role).selectinload(Role.permissions),
            selectinload(User.company_links).selectinload(UserCompany.company),
        )
        .where(User.id == user_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    stmt = (
        select(User)
        .options(
            selectinload(User.organization),
            selectinload(User.role).selectinload(Role.permissions),
            selectinload(User.company_links).selectinload(UserCompany.company),
        )
        .where(User.email == email)
    )
    return db.execute(stmt).scalar_one_or_none()


def _apply_user_filters(
    stmt,
    organization_id: Optional[int],
    role_id: Optional[int] = None,
    search: Optional[str] = None,
    is_platform_admin: bool = False,
    filter_org_id: Optional[int] = None,
):
    if not is_platform_admin and organization_id is not None:
        stmt = stmt.where(User.organization_id == organization_id)
    elif is_platform_admin and filter_org_id is not None:
        stmt = stmt.where(User.organization_id == filter_org_id)
    if role_id is not None:
        stmt = stmt.where(User.role_id == role_id)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    return stmt


def get_users(
    db: Session,
    requesting_user: User,
    role_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    org_id: Optional[int] = None,
) -> List[User]:
    stmt = select(User).options(
        selectinload(User.organization),
        selectinload(User.role).selectinload(Role.permissions),
        selectinload(User.company_links).selectinload(UserCompany.company),
    )
    stmt = _apply_user_filters(
        stmt,
        requesting_user.organization_id,
        role_id,
        search,
        requesting_user.is_platform_admin,
        filter_org_id=org_id if requesting_user.is_platform_admin else None,
    )
    stmt = stmt.order_by(User.full_name).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def count_users(
    db: Session,
    requesting_user: User,
    role_id: Optional[int] = None,
    search: Optional[str] = None,
    org_id: Optional[int] = None,
) -> int:
    stmt = select(func.count()).select_from(User)
    stmt = _apply_user_filters(
        stmt,
        requesting_user.organization_id,
        role_id,
        search,
        requesting_user.is_platform_admin,
        filter_org_id=org_id if requesting_user.is_platform_admin else None,
    )
    return db.execute(stmt).scalar_one()


def _set_user_companies(db: Session, user: User, company_ids: List[int]) -> None:
    for link in list(user.company_links):
        db.delete(link)
    db.flush()
    for company_id in company_ids:
        company = db.get(Company, company_id)
        if company is None:
            raise ValueError(f"La empresa con id={company_id} no existe")
        if not user.is_platform_admin and company.organization_id != user.organization_id:
            raise ValueError(
                f"La empresa {company_id} no pertenece a tu organización"
            )
        db.add(UserCompany(user_id=user.id, company_id=company_id))


def _validate_role_and_companies(db: Session, role_id: int, company_ids: List[int]):
    role = get_role(db, role_id)
    if role is None:
        raise ValueError(f"El rol con id={role_id} no existe")
    if role.is_company_scoped and not company_ids:
        raise ValueError(
            f"El rol '{role.name}' requiere al menos una empresa asignada"
        )
    return role


def create_user(
    db: Session, user_in: UserCreate, organization_id: Optional[int]
) -> User:
    _validate_role_and_companies(db, user_in.role_id, user_in.company_ids)
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role_id=user_in.role_id,
        is_active=user_in.is_active,
        organization_id=organization_id,
    )
    db.add(user)
    db.flush()
    if user_in.company_ids:
        _set_user_companies(db, user, user_in.company_ids)
    db.commit()
    db.refresh(user)
    return get_user(db, user.id)


def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data.pop("password"))
    else:
        update_data.pop("password", None)
    company_ids = update_data.pop("company_ids", None)
    role_id = update_data.get("role_id", user.role_id)
    if "role_id" in update_data or company_ids is not None:
        effective = (
            company_ids if company_ids is not None
            else [link.company_id for link in user.company_links]
        )
        _validate_role_and_companies(db, role_id, effective)
    for field, value in update_data.items():
        setattr(user, field, value)
    if company_ids is not None:
        _set_user_companies(db, user, company_ids)
    db.commit()
    db.refresh(user)
    return get_user(db, user.id)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def update_last_login(db: Session, user: User) -> None:
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()


def deactivate_user(db: Session, user: User) -> User:
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user