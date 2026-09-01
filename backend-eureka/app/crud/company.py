from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.user_company import UserCompany
from app.schemas.company import CompanyCreate, CompanyUpdate


def get_company(db: Session, company_id: int) -> Optional[Company]:
    return db.get(Company, company_id)


def get_company_by_ruc(db: Session, ruc: str) -> Optional[Company]:
    stmt = select(Company).where(Company.ruc == ruc)
    return db.execute(stmt).scalar_one_or_none()


def _apply_company_search(stmt, search: Optional[str] = None):
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Company.razon_social.ilike(pattern),
                Company.nombre_comercial.ilike(pattern),
                Company.ruc.ilike(pattern),
            )
        )
    return stmt


def _base_companies_stmt_for_user(user: User, search: Optional[str] = None, org_id: Optional[int] = None):
    """
    Filtra empresas por organización del usuario Y por alcance de su rol:
    - No acotado (is_company_scoped=False): ve todas las empresas de su org.
    - Acotado: ve solo las empresas asignadas en user_companies.
    - Super-admin (org=None): ve todas las empresas de todas las orgs,
      con filtro opcional org_id para acotar a una organización específica.
    """
    if user.is_platform_admin:
        stmt = select(Company)
        if org_id is not None:
            stmt = stmt.where(Company.organization_id == org_id)
    elif not user.role.is_company_scoped:
        stmt = select(Company).where(Company.organization_id == user.organization_id)
    else:
        stmt = (
            select(Company)
            .join(UserCompany, UserCompany.company_id == Company.id)
            .where(
                UserCompany.user_id == user.id,
                Company.organization_id == user.organization_id,
            )
        )
    return _apply_company_search(stmt, search)


def get_companies_for_user(
    db: Session, user: User, search: Optional[str] = None, skip: int = 0, limit: int = 50,
    org_id: Optional[int] = None,
) -> List[Company]:
    stmt = _base_companies_stmt_for_user(user, search, org_id=org_id)
    stmt = stmt.order_by(Company.razon_social).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def count_companies_for_user(
    db: Session, user: User, search: Optional[str] = None, org_id: Optional[int] = None,
) -> int:
    stmt = _base_companies_stmt_for_user(user, search, org_id=org_id)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    return db.execute(count_stmt).scalar_one()


def user_has_access_to_company(db: Session, user: User, company_id: int) -> bool:
    company = get_company(db, company_id)
    if not company:
        return False

    if user.is_platform_admin:
        return True

    # La empresa debe pertenecer a la misma organización
    if company.organization_id != user.organization_id:
        return False

    if not user.role.is_company_scoped:
        return True

    stmt = select(UserCompany).where(
        UserCompany.user_id == user.id,
        UserCompany.company_id == company_id,
    )
    return db.execute(stmt).scalar_one_or_none() is not None


def create_company(db: Session, company_in: CompanyCreate, organization_id: int) -> Company:
    data = company_in.model_dump()
    company = Company(**data, organization_id=organization_id)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update_company(db: Session, company: Company, company_in: CompanyUpdate) -> Company:
    for field, value in company_in.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


def deactivate_company(db: Session, company: Company) -> Company:
    company.is_active = False
    db.commit()
    db.refresh(company)
    return company


def set_company_logo(db: Session, company: Company, logo_path: str) -> Company:
    company.logo_path = logo_path
    db.commit()
    db.refresh(company)
    return company


def remove_company_logo(db: Session, company: Company) -> Company:
    company.logo_path = None
    db.commit()
    db.refresh(company)
    return company