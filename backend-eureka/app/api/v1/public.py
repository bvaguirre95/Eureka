"""
Endpoints públicos — sin autenticación.
Usados por la landing page de Eureka y otros recursos públicos.

Datos expuestos: solo información comercial pública (nombre, industria, ciudad,
logo). Sin RUC, emails, número de trabajadores ni datos personales —
compatible con la LOPDP (Ecuador).
"""

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.company import Company
from app.models.organization import Organization

router = APIRouter(prefix="/public", tags=["Público"])

# Máximo absoluto de empresas que puede retornar este endpoint (anti-scraping)
_MAX_LIMIT = 50


# ── Schemas ───────────────────────────────────────────────────────────────────

class PublicCompanyOut(BaseModel):
    id: int
    razon_social: str
    nombre_comercial: Optional[str] = None
    industria: Optional[str] = None
    ciudad: Optional[str] = None
    has_logo: bool

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/companies", response_model=List[PublicCompanyOut])
def get_public_companies(
    org_slug: str,
    limit: int = Query(default=50, le=_MAX_LIMIT, ge=1),
    db: Session = Depends(get_db),
):
    """
    Empresas activas de una organización (por slug) para la landing page.
    Solo expone datos comerciales públicos — ningún dato personal.
    """
    org = db.query(Organization).filter(
        Organization.slug == org_slug,
        Organization.is_active == True,
    ).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organización '{org_slug}' no encontrada",
        )

    companies = (
        db.query(Company)
        .filter(
            Company.organization_id == org.id,
            Company.is_active == True,
        )
        .order_by(Company.razon_social)
        .limit(limit)
        .all()
    )

    return [
        PublicCompanyOut(
            id=c.id,
            razon_social=c.razon_social,
            nombre_comercial=c.nombre_comercial,
            industria=c.industria,
            ciudad=c.ciudad,
            has_logo=bool(c.logo_path),
        )
        for c in companies
    ]


@router.get("/companies/{company_id}/logo")
def get_public_company_logo(
    company_id: int,
    db: Session = Depends(get_db),
):
    """
    Logo público de una empresa activa (para la landing page).
    Solo accesible si la empresa está activa.
    """
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.is_active == True,
    ).first()

    if not company or not company.logo_path or not os.path.exists(company.logo_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logo no disponible",
        )

    return FileResponse(path=company.logo_path)