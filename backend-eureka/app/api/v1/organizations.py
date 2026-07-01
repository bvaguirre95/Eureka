from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_platform_admin
from app.crud import organization as crud_org
from app.crud.user import get_user_by_email
from app.models.user import User
from app.schemas.common import Page
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationCreatedOut,
    OrganizationOut,
    OrganizationUpdate,
)

router = APIRouter(prefix="/organizations", tags=["Organizaciones"])


@router.get("/", response_model=Page[OrganizationOut])
def list_organizations(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    items = crud_org.get_organizations(db, search=search, skip=skip, limit=limit)
    total = crud_org.count_organizations(db, search=search)
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=OrganizationCreatedOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    """
    Crea la organización y automáticamente:
    - Los 4 roles base (Administrador, Supervisor, Técnico SST, Empresa).
    - El usuario administrador inicial con las credenciales indicadas.

    Las credenciales se muestran UNA SOLA VEZ en la respuesta.
    """
    if get_user_by_email(db, org_in.admin_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario con el email '{org_in.admin_email}'",
        )

    org, admin_user, password = crud_org.create_organization_with_admin(db, org_in)

    return OrganizationCreatedOut(
        organization=OrganizationOut.model_validate(org),
        admin_email=admin_user.email,
        admin_password=password,
    )


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    org = crud_org.get_organization(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organización no encontrada"
        )
    return org


@router.put("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: int,
    org_in: OrganizationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    org = crud_org.get_organization(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organización no encontrada"
        )
    return crud_org.update_organization(db, org, org_in)
