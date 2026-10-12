from typing import Optional

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission
from app.core.config import settings
from app.crud import company as crud_company
from app.models.user import User
from app.schemas.common import Page
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["Empresas"])

LOGO_ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


@router.get("/", response_model=Page[CompanyOut])
def list_companies(
    search: Optional[str] = Query(None),
    org_id: Optional[int] = Query(None, description="Filtrar por organización (solo super-admin)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # org_id solo aplica para super-admin; usuarios normales ignoran el parámetro
    effective_org_id = org_id if current_user.is_platform_admin else None
    items = crud_company.get_companies_for_user(db, current_user, search=search, skip=skip, limit=limit, org_id=effective_org_id)
    total = crud_company.count_companies_for_user(db, current_user, search=search, org_id=effective_org_id)
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_new_company(
    company_in: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.create")),
):
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El super-admin de plataforma no puede crear empresas directamente. Usa el panel de organizaciones.",
        )
    if crud_company.get_company_by_ruc(db, company_in.ruc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una empresa registrada con ese RUC",
        )
    return crud_company.create_company(db, company_in, current_user.organization_id)


@router.get("/{company_id}", response_model=CompanyOut)
def get_company_by_id(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return company


@router.put("/{company_id}", response_model=CompanyOut)
def update_existing_company(
    company_id: int,
    company_in: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.edit")),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return crud_company.update_company(db, company, company_in)


@router.delete("/{company_id}", response_model=CompanyOut)
def deactivate_existing_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.delete")),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return crud_company.deactivate_company(db, company)


@router.post("/{company_id}/logo", response_model=CompanyOut)
async def upload_company_logo(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.edit")),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in LOGO_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión no permitida. Usa: {', '.join(sorted(LOGO_ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > LOGO_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El logo supera el tamaño máximo permitido (2 MB)",
        )

    # Eliminar logo anterior si existe
    if company.logo_path and os.path.exists(company.logo_path):
        try:
            os.remove(company.logo_path)
        except OSError:
            pass

    dir_path = os.path.join(settings.UPLOAD_DIR, "companies", str(company.id), "logo")
    os.makedirs(dir_path, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(dir_path, stored_name)
    with open(full_path, "wb") as f:
        f.write(file_bytes)

    return crud_company.set_company_logo(db, company, full_path)


@router.get("/{company_id}/logo")
def get_company_logo(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company or not company.logo_path or not os.path.exists(company.logo_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esta empresa no tiene logo")
    return FileResponse(path=company.logo_path)


@router.delete("/{company_id}/logo", response_model=CompanyOut)
def delete_company_logo(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.delete")),
):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta empresa")
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")

    if company.logo_path and os.path.exists(company.logo_path):
        try:
            os.remove(company.logo_path)
        except OSError:
            pass

    return crud_company.remove_company_logo(db, company)