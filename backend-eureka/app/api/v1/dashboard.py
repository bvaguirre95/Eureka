from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.crud.dashboard import get_dashboard_summary
from app.models.user import User
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    year: Optional[int] = Query(None),
    org_id: Optional[int] = Query(None, description="Filtrar por organización (solo super-admin)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    effective_org_id = org_id if current_user.is_platform_admin else None
    return get_dashboard_summary(db, current_user, year=year, org_id=effective_org_id)