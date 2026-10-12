from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.crud.company import _base_companies_stmt_for_user
from app.crud.user import count_users
from app.models.company import Company
from app.models.company_document import CompanyDocument, DocumentStatusEnum
from app.models.organization import Organization
from app.models.user import User
from app.schemas.dashboard import DashboardSummary


def get_dashboard_summary(db: Session, user: User, year: Optional[int] = None, org_id: Optional[int] = None) -> DashboardSummary:
    if user.is_platform_admin:
        organizations = db.execute(select(func.count()).select_from(Organization)).scalar_one()
        if org_id is not None:
            companies = db.execute(select(func.count()).select_from(Company).where(Company.organization_id == org_id)).scalar_one()
            users_count = db.execute(select(func.count()).select_from(User).where(User.organization_id == org_id)).scalar_one()
        else:
            companies = db.execute(select(func.count()).select_from(Company)).scalar_one()
            users_count = db.execute(select(func.count()).select_from(User)).scalar_one()
        return DashboardSummary(organizations=organizations, companies=companies, users=users_count)

    year = year or datetime.now(timezone.utc).year

    # Empresas visibles para el usuario (mismo filtro que /companies)
    companies_stmt = _base_companies_stmt_for_user(user)
    companies_count = db.execute(
        select(func.count()).select_from(companies_stmt.subquery())
    ).scalar_one()

    users_count = count_users(db, user)

    company_ids_stmt = select(companies_stmt.subquery().c.id)
    company_ids = [row[0] for row in db.execute(company_ids_stmt).all()]

    documents_total = 0
    documents_validated = 0
    documents_pending_review = 0

    if company_ids:
        # Solo documentos con archivo cargado (registros persistidos), del
        # año consultado (anual/mensual/bimestral) o sin período (único).
        period_filter = or_(
            CompanyDocument.period_label.is_(None),
            CompanyDocument.period_label.like(f"{year}%"),
        )

        base_stmt = select(func.count()).select_from(CompanyDocument).where(
            CompanyDocument.company_id.in_(company_ids),
            CompanyDocument.file_path.isnot(None),
            period_filter,
        )
        documents_total = db.execute(base_stmt).scalar_one()

        validated_stmt = base_stmt.where(CompanyDocument.status == DocumentStatusEnum.VALIDADO)
        documents_validated = db.execute(validated_stmt).scalar_one()

        pending_stmt = base_stmt.where(CompanyDocument.status == DocumentStatusEnum.CARGADO)
        documents_pending_review = db.execute(pending_stmt).scalar_one()

    compliance_percent = (
        round((documents_validated / documents_total) * 100, 1) if documents_total else 0.0
    )

    return DashboardSummary(
        companies=companies_count,
        users=users_count,
        documents_total=documents_total,
        documents_validated=documents_validated,
        documents_pending_review=documents_pending_review,
        compliance_percent=compliance_percent,
    )