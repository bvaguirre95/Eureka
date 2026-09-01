"""
Endpoints para el módulo de alertas de vencimiento documental.

GET  /organizations/{org_id}/document-alerts/config    → ver configuración
PUT  /organizations/{org_id}/document-alerts/config    → guardar configuración
GET  /organizations/{org_id}/document-alerts/expiring  → docs próximos a vencer
POST /organizations/{org_id}/document-alerts/run       → ejecutar alertas ahora
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_active_user, get_db, require_permission
from app.crud.document_alert import (
    get_alert_config,
    upsert_alert_config,
    run_expiry_alerts,
    _get_technician_email,
)
from app.models.company import Company
from app.models.company_document import CompanyDocument, DocumentStatusEnum
from app.models.user import User
from app.schemas.document_alert import (
    AlertConfigOut,
    AlertConfigUpdate,
    AlertRunResult,
    ExpiringDocumentItem,
)

router = APIRouter(tags=["Alertas de Vencimiento"])


def _resolve_org(user: User, org_id: int) -> int:
    if user.is_platform_admin:
        return org_id
    if user.organization_id != org_id:
        raise HTTPException(403, "Sin acceso a esta organización")
    return org_id


# ── Configuración ──────────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/document-alerts/config",
            response_model=AlertConfigOut)
def get_config(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _resolve_org(current_user, org_id)
    config = get_alert_config(db, org_id)
    if not config:
        from app.models.document_alert import DocumentAlertConfig
        config = DocumentAlertConfig(
            organization_id=org_id,
            days_before="30,7",
            is_enabled=True,
        )
    return AlertConfigOut(
        id=getattr(config, "id", None) or 0,
        organization_id=org_id,
        days_before=config.days_before,
        days_list=config.days_list,
        is_enabled=config.is_enabled,
        updated_at=getattr(config, "updated_at", None),
    )


@router.put("/organizations/{org_id}/document-alerts/config",
            response_model=AlertConfigOut)
def update_config(
    org_id: int,
    data: AlertConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _resolve_org(current_user, org_id)
    config = upsert_alert_config(
        db, org_id,
        days_before=data.days_before,
        is_enabled=data.is_enabled,
    )
    return AlertConfigOut(
        id=config.id,
        organization_id=org_id,
        days_before=config.days_before,
        days_list=config.days_list,
        is_enabled=config.is_enabled,
        updated_at=config.updated_at,
    )


# ── Documentos próximos a vencer ───────────────────────────────────────────────

@router.get("/organizations/{org_id}/document-alerts/expiring",
            response_model=List[ExpiringDocumentItem])
def list_expiring(
    org_id: int,
    days: int = Query(60, ge=1, le=365),
    include_overdue: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _resolve_org(current_user, org_id)

    now    = datetime.now(timezone.utc)
    future = now + timedelta(days=days)

    # Solo documentos VALIDADOS (próximos a vencer) o VENCIDOS (ya pasó la fecha)
    # Los pendientes/cargados/rechazados no tienen fecha de vencimiento real aún
    base_filters = [
        Company.organization_id == org_id,
        CompanyDocument.due_date.isnot(None),
        CompanyDocument.status.in_([
            DocumentStatusEnum.VALIDADO,
            DocumentStatusEnum.VENCIDO,
        ]),
    ]

    if include_overdue:
        # Vencidos (due_date < ahora) + por vencer (due_date <= future)
        base_filters.append(CompanyDocument.due_date <= future)
    else:
        # Solo por vencer
        base_filters.extend([
            CompanyDocument.due_date >= now,
            CompanyDocument.due_date <= future,
        ])

    stmt = (
        select(CompanyDocument)
        .join(Company, Company.id == CompanyDocument.company_id)
        .where(*base_filters)
        .options(
            selectinload(CompanyDocument.catalog_item),
            selectinload(CompanyDocument.company),
        )
        .order_by(CompanyDocument.due_date.asc())
    )
    docs = list(db.execute(stmt).scalars().all())

    result = []
    for doc in docs:
        # Normalizar timezone: si due_date no tiene tz, agregarlo
        due = doc.due_date
        if due and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        days_rem = (due - now).days

        tech = _get_technician_email(db, doc.company_id)
        company_name = doc.company.razon_social if doc.company else f"#{doc.company_id}"
        doc_name     = doc.catalog_item.name if doc.catalog_item else "—"
        doc_code     = doc.catalog_item.code if doc.catalog_item else "—"

        result.append(ExpiringDocumentItem(
            company_document_id=doc.id,
            company_id=doc.company_id,
            company_name=company_name,
            catalog_item_id=doc.catalog_item_id,
            document_name=doc_name,
            document_code=doc_code,
            period_display=doc.period_label or "—",
            due_date=due,
            days_remaining=days_rem,
            status=doc.status.value if doc.status else "pendiente",
            technician_name=tech[1] if tech else None,
            technician_email=tech[0] if tech else None,
        ))
    return result


# ── Ejecución manual ───────────────────────────────────────────────────────────

@router.post("/organizations/{org_id}/document-alerts/run",
             response_model=AlertRunResult)
def run_alerts_now(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Ejecuta las alertas manualmente con force=True:
    - Marca como VENCIDO los documentos validados cuya fecha ya pasó
    - Envía correos preventivos a todos los que están dentro del umbral
      configurado, sin importar si ya se envió antes
    """
    _resolve_org(current_user, org_id)
    result = run_expiry_alerts(db, force=True)
    expired = result.get("expired_marked", 0)
    return AlertRunResult(
        sent=result["sent"],
        skipped=result["skipped"],
        errors=result["errors"],
        expired_marked=expired,
        message=(
            f"Enviados: {result['sent']} · "
            f"Vencidos marcados: {expired} · "
            f"Errores: {result['errors']}"
        ),
    )