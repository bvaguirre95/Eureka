"""CRUD del módulo EPP."""
from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.epp import EppCatalog, EppDelivery, EppDeliveryStatusEnum, EppType
from app.models.user import User
from app.models.worker import Worker
from app.schemas.epp import (
    EppCatalogCreate, EppCatalogUpdate, EppCatalogOut,
    EppDeliveryCreate, EppDeliveryUpdate, EppDeliveryListItem, EppDeliveryOut,
    EppTypeCreate, EppTypeOut, EppTypeUpdate,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _type_to_out(t: EppType) -> EppTypeOut:
    return EppTypeOut(
        id=t.id, organization_id=t.organization_id,
        name=t.name, description=t.description,
        icon=t.icon, group_name=t.group_name,
        default_useful_life_months=t.default_useful_life_months,
        is_active=t.is_active, order=t.order,
        catalog_count=len(t.catalog_items) if t.catalog_items else 0,
    )


def _catalog_to_out(c: EppCatalog) -> EppCatalogOut:
    effective = c.useful_life_months
    if not effective and c.epp_type:
        effective = c.epp_type.default_useful_life_months
    return EppCatalogOut(
        id=c.id, organization_id=c.organization_id,
        epp_type_id=c.epp_type_id,
        epp_type_name=c.epp_type.name if c.epp_type else None,
        epp_type_icon=c.epp_type.icon if c.epp_type else None,
        name=c.name, code=c.code, brand=c.brand, model=c.model,
        technical_spec=c.technical_spec,
        useful_life_months=c.useful_life_months,
        effective_life_months=effective,
        is_active=c.is_active,
    )


def _delivery_to_out(d: EppDelivery) -> EppDeliveryOut:
    days = None
    if d.expiry_date:
        days = (d.expiry_date - date.today()).days
    return EppDeliveryOut(
        id=d.id, worker_id=d.worker_id,
        worker_name=d.worker.full_name if d.worker else None,
        worker_doc=d.worker.doc_number if d.worker else None,
        epp_catalog_id=d.epp_catalog_id,
        epp_name=d.epp_item.name if d.epp_item else None,
        epp_type_name=d.epp_item.epp_type.name if d.epp_item and d.epp_item.epp_type else None,
        epp_type_icon=d.epp_item.epp_type.icon if d.epp_item and d.epp_item.epp_type else None,
        risk_control_id=d.risk_control_id,
        delivery_date=d.delivery_date,
        expiry_date=d.expiry_date,
        quantity=d.quantity,
        size=d.size,
        serial_number=d.serial_number,
        status=d.status,
        return_date=d.return_date,
        notes=d.notes,
        delivered_by_name=d.delivered_by.full_name if d.delivered_by else None,
        created_at=d.created_at,
    )


def _delivery_to_list(d: EppDelivery) -> EppDeliveryListItem:
    days = None
    if d.expiry_date:
        days = (d.expiry_date - date.today()).days
    return EppDeliveryListItem(
        id=d.id, worker_id=d.worker_id,
        worker_name=d.worker.full_name if d.worker else None,
        epp_name=d.epp_item.name if d.epp_item else None,
        epp_type_name=d.epp_item.epp_type.name if d.epp_item and d.epp_item.epp_type else None,
        epp_type_icon=d.epp_item.epp_type.icon if d.epp_item and d.epp_item.epp_type else None,
        delivery_date=d.delivery_date,
        expiry_date=d.expiry_date,
        status=d.status,
        days_to_expiry=days,
    )


def _calc_expiry(catalog: EppCatalog, delivery_date: date) -> Optional[date]:
    """Calcula fecha de reposición desde vida útil del ítem o su tipo."""
    months = catalog.useful_life_months
    if not months and catalog.epp_type:
        months = catalog.epp_type.default_useful_life_months
    if not months:
        return None
    # Aproximación: +30 días por mes
    return delivery_date + timedelta(days=months * 30)


def _load_delivery(db: Session, delivery_id: int) -> Optional[EppDelivery]:
    return db.execute(
        select(EppDelivery)
        .options(
            selectinload(EppDelivery.worker),
            selectinload(EppDelivery.epp_item).selectinload(EppCatalog.epp_type),
            selectinload(EppDelivery.delivered_by),
        )
        .where(EppDelivery.id == delivery_id)
    ).scalar_one_or_none()


# ── EppType ────────────────────────────────────────────────────────────────────

def list_epp_types(db: Session, org_id: int,
                   include_inactive: bool = False) -> List[EppTypeOut]:
    stmt = (
        select(EppType)
        .options(selectinload(EppType.catalog_items))
        .where(EppType.organization_id == org_id)
        .order_by(EppType.order, EppType.name)
    )
    if not include_inactive:
        stmt = stmt.where(EppType.is_active == True)
    return [_type_to_out(t) for t in db.execute(stmt).scalars().all()]


def create_epp_type(db: Session, org_id: int, data: EppTypeCreate) -> EppTypeOut:
    t = EppType(organization_id=org_id, **data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _type_to_out(t)


def update_epp_type(db: Session, epp_type: EppType,
                    data: EppTypeUpdate) -> EppTypeOut:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(epp_type, k, v)
    db.commit()
    db.refresh(epp_type)
    # reload con items
    t = db.execute(
        select(EppType).options(selectinload(EppType.catalog_items))
        .where(EppType.id == epp_type.id)
    ).scalar_one()
    return _type_to_out(t)


def delete_epp_type(db: Session, epp_type: EppType) -> None:
    """Solo se puede eliminar si no tiene ítems de catálogo."""
    if epp_type.catalog_items:
        raise ValueError(
            f"Este tipo tiene {len(epp_type.catalog_items)} ítem(s) en el catálogo. "
            "Desactívalo en lugar de eliminarlo."
        )
    db.delete(epp_type)
    db.commit()


# ── EppCatalog ─────────────────────────────────────────────────────────────────

def list_epp_catalog(db: Session, org_id: int,
                     epp_type_id: Optional[int] = None,
                     include_inactive: bool = False) -> List[EppCatalogOut]:
    stmt = (
        select(EppCatalog)
        .options(selectinload(EppCatalog.epp_type))
        .where(EppCatalog.organization_id == org_id)
        .order_by(EppCatalog.name)
    )
    if epp_type_id:
        stmt = stmt.where(EppCatalog.epp_type_id == epp_type_id)
    if not include_inactive:
        stmt = stmt.where(EppCatalog.is_active == True)
    return [_catalog_to_out(c) for c in db.execute(stmt).scalars().all()]


def create_epp_catalog(db: Session, org_id: int,
                       data: EppCatalogCreate) -> EppCatalogOut:
    # Verificar que el tipo pertenece a la misma org
    epp_type = db.get(EppType, data.epp_type_id)
    if not epp_type or epp_type.organization_id != org_id:
        raise ValueError("Tipo de EPP no encontrado en esta organización")
    c = EppCatalog(organization_id=org_id, **data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    c_loaded = db.execute(
        select(EppCatalog).options(selectinload(EppCatalog.epp_type))
        .where(EppCatalog.id == c.id)
    ).scalar_one()
    return _catalog_to_out(c_loaded)


def update_epp_catalog(db: Session, catalog: EppCatalog,
                       data: EppCatalogUpdate) -> EppCatalogOut:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(catalog, k, v)
    db.commit()
    c = db.execute(
        select(EppCatalog).options(selectinload(EppCatalog.epp_type))
        .where(EppCatalog.id == catalog.id)
    ).scalar_one()
    return _catalog_to_out(c)


# ── EppDelivery ────────────────────────────────────────────────────────────────

def list_deliveries_for_worker(db: Session,
                                worker_id: int) -> List[EppDeliveryListItem]:
    stmt = (
        select(EppDelivery)
        .options(
            selectinload(EppDelivery.worker),
            selectinload(EppDelivery.epp_item).selectinload(EppCatalog.epp_type),
        )
        .where(EppDelivery.worker_id == worker_id)
        .order_by(EppDelivery.delivery_date.desc())
    )
    return [_delivery_to_list(d) for d in db.execute(stmt).scalars().all()]


def list_deliveries_for_company(db: Session, company_id: int,
                                 status: Optional[EppDeliveryStatusEnum] = None,
                                 expiring_in_days: Optional[int] = None,
                                 skip: int = 0, limit: int = 100,
                                 ) -> tuple[List[EppDeliveryListItem], int]:
    base = (
        select(EppDelivery)
        .join(Worker, Worker.id == EppDelivery.worker_id)
        .options(
            selectinload(EppDelivery.worker),
            selectinload(EppDelivery.epp_item).selectinload(EppCatalog.epp_type),
        )
        .where(Worker.company_id == company_id)
    )
    if status:
        base = base.where(EppDelivery.status == status)
    if expiring_in_days is not None:
        threshold = date.today() + timedelta(days=expiring_in_days)
        base = base.where(
            EppDelivery.expiry_date.isnot(None),
            EppDelivery.expiry_date <= threshold,
            EppDelivery.status == EppDeliveryStatusEnum.ENTREGADO,
        )
    total = db.execute(
        select(func.count()).select_from(base.subquery())
    ).scalar_one()
    items = db.execute(
        base.order_by(EppDelivery.delivery_date.desc()).offset(skip).limit(limit)
    ).scalars().all()
    return [_delivery_to_list(d) for d in items], total


def create_delivery(db: Session, worker_id: int,
                    data: EppDeliveryCreate,
                    delivered_by: User) -> EppDeliveryOut:
    catalog = db.execute(
        select(EppCatalog).options(selectinload(EppCatalog.epp_type))
        .where(EppCatalog.id == data.epp_catalog_id)
    ).scalar_one_or_none()
    if not catalog:
        raise ValueError("Ítem de EPP no encontrado")

    # Calcular fecha de reposición si no se indicó
    expiry = data.expiry_date
    if not expiry:
        expiry = _calc_expiry(catalog, data.delivery_date)

    d = EppDelivery(
        worker_id=worker_id,
        delivered_by_id=delivered_by.id,
        expiry_date=expiry,
        **{k: v for k, v in data.model_dump().items() if k != "expiry_date"},
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _delivery_to_out(_load_delivery(db, d.id))


def update_delivery(db: Session, delivery: EppDelivery,
                    data: EppDeliveryUpdate) -> EppDeliveryOut:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(delivery, k, v)
    if data.status == EppDeliveryStatusEnum.DEVUELTO and data.return_date:
        delivery.return_date = data.return_date
    db.commit()
    return _delivery_to_out(_load_delivery(db, delivery.id))


def get_epp_kpis_for_company(db: Session, company_id: int) -> dict:
    """KPIs de EPP para el dashboard de la empresa."""
    today = date.today()
    threshold_30 = today + timedelta(days=30)

    base = (
        select(func.count())
        .select_from(EppDelivery)
        .join(Worker, Worker.id == EppDelivery.worker_id)
        .where(Worker.company_id == company_id)
    )
    total_active = db.execute(
        base.where(EppDelivery.status == EppDeliveryStatusEnum.ENTREGADO)
    ).scalar_one()

    expiring_soon = db.execute(
        base.where(
            EppDelivery.status == EppDeliveryStatusEnum.ENTREGADO,
            EppDelivery.expiry_date.isnot(None),
            EppDelivery.expiry_date <= threshold_30,
            EppDelivery.expiry_date >= today,
        )
    ).scalar_one()

    overdue = db.execute(
        base.where(
            EppDelivery.status == EppDeliveryStatusEnum.ENTREGADO,
            EppDelivery.expiry_date.isnot(None),
            EppDelivery.expiry_date < today,
        )
    ).scalar_one()

    return {
        "total_active":    total_active,
        "expiring_soon":   expiring_soon,
        "overdue":         overdue,
    }
