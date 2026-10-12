"""
API del módulo EPP.

Rutas:
  /organizations/{org_id}/epp-types          → tipos configurables
  /organizations/{org_id}/epp-catalog        → catálogo de ítems
  /companies/{company_id}/epp                → entregas por empresa
  /companies/{company_id}/workers/{id}/epp   → entregas por trabajador
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission
from app.crud import company as crud_company
from app.crud import epp as crud
from app.models.epp import EppCatalog, EppDelivery, EppType, EppDeliveryStatusEnum
from app.models.user import User
from app.models.worker import Worker
from app.schemas.epp import (
    EppCatalogCreate, EppCatalogOut, EppCatalogUpdate,
    EppDeliveryCreate, EppDeliveryListItem, EppDeliveryOut, EppDeliveryUpdate,
    EppTypeCreate, EppTypeOut, EppTypeUpdate,
)
from sqlalchemy import select

router = APIRouter(tags=["EPP"])


def _check(db: Session, user: User, company_id: int) -> None:
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(403, "Sin acceso a esta empresa")


def _check_org(user: User, org_id: int) -> None:
    if not user.is_platform_admin and user.organization_id != org_id:
        raise HTTPException(403, "Sin acceso a esta organización")


# ── Tipos de EPP ───────────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/epp-types", response_model=List[EppTypeOut])
def list_types(
    org_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.view")),
):
    _check_org(current_user, org_id)
    return crud.list_epp_types(db, org_id, include_inactive)


@router.post("/organizations/{org_id}/epp-types",
             response_model=EppTypeOut, status_code=201)
def create_type(
    org_id: int, data: EppTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.manage")),
):
    _check_org(current_user, org_id)
    return crud.create_epp_type(db, org_id, data)


@router.patch("/organizations/{org_id}/epp-types/{type_id}",
              response_model=EppTypeOut)
def update_type(
    org_id: int, type_id: int, data: EppTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.manage")),
):
    _check_org(current_user, org_id)
    t = db.get(EppType, type_id)
    if not t or t.organization_id != org_id:
        raise HTTPException(404, "Tipo no encontrado")
    return crud.update_epp_type(db, t, data)


@router.delete("/organizations/{org_id}/epp-types/{type_id}",
               status_code=204)
def delete_type(
    org_id: int, type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.manage")),
):
    _check_org(current_user, org_id)
    t = db.get(EppType, type_id)
    if not t or t.organization_id != org_id:
        raise HTTPException(404, "Tipo no encontrado")
    try:
        crud.delete_epp_type(db, t)
    except ValueError as e:
        raise HTTPException(409, str(e))


# ── Catálogo de EPP ────────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/epp-catalog", response_model=List[EppCatalogOut])
def list_catalog(
    org_id: int,
    epp_type_id:      Optional[int]  = None,
    include_inactive: bool            = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.view")),
):
    _check_org(current_user, org_id)
    return crud.list_epp_catalog(db, org_id, epp_type_id, include_inactive)


@router.post("/organizations/{org_id}/epp-catalog",
             response_model=EppCatalogOut, status_code=201)
def create_catalog_item(
    org_id: int, data: EppCatalogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.manage")),
):
    _check_org(current_user, org_id)
    try:
        return crud.create_epp_catalog(db, org_id, data)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.patch("/organizations/{org_id}/epp-catalog/{item_id}",
              response_model=EppCatalogOut)
def update_catalog_item(
    org_id: int, item_id: int, data: EppCatalogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.manage")),
):
    _check_org(current_user, org_id)
    c = db.get(EppCatalog, item_id)
    if not c or c.organization_id != org_id:
        raise HTTPException(404, "Ítem no encontrado")
    return crud.update_epp_catalog(db, c, data)


# ── Entregas por empresa ───────────────────────────────────────────────────────

@router.get("/companies/{company_id}/epp")
def list_company_deliveries(
    company_id: int,
    status_filter: Optional[EppDeliveryStatusEnum] = Query(None, alias="status"),
    expiring_in_days: Optional[int] = Query(None, ge=0, le=365),
    skip:  int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.view")),
):
    _check(db, current_user, company_id)
    items, total = crud.list_deliveries_for_company(
        db, company_id, status_filter, expiring_in_days, skip, limit
    )
    return {"items": items, "total": total}


@router.get("/companies/{company_id}/epp-kpis")
def epp_kpis(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.view")),
):
    _check(db, current_user, company_id)
    return crud.get_epp_kpis_for_company(db, company_id)


# ── Entregas por trabajador ────────────────────────────────────────────────────

@router.get("/companies/{company_id}/workers/{worker_id}/epp",
            response_model=List[EppDeliveryListItem])
def list_worker_deliveries(
    company_id: int, worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.view")),
):
    _check(db, current_user, company_id)
    w = db.execute(
        select(Worker).where(
            Worker.id == worker_id, Worker.company_id == company_id
        )
    ).scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Trabajador no encontrado")
    return crud.list_deliveries_for_worker(db, worker_id)


@router.post("/companies/{company_id}/workers/{worker_id}/epp",
             response_model=EppDeliveryOut, status_code=201)
def create_delivery(
    company_id: int, worker_id: int, data: EppDeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.deliver")),
):
    _check(db, current_user, company_id)
    w = db.execute(
        select(Worker).where(
            Worker.id == worker_id, Worker.company_id == company_id
        )
    ).scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Trabajador no encontrado")
    try:
        return crud.create_delivery(db, worker_id, data, current_user)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.patch("/companies/{company_id}/workers/{worker_id}/epp/{delivery_id}",
              response_model=EppDeliveryOut)
def update_delivery(
    company_id: int, worker_id: int, delivery_id: int,
    data: EppDeliveryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("epp.deliver")),
):
    _check(db, current_user, company_id)
    d = db.execute(
        select(EppDelivery).where(
            EppDelivery.id == delivery_id,
            EppDelivery.worker_id == worker_id,
        )
    ).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Entrega no encontrada")
    return crud.update_delivery(db, d, data)
