import os
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core.email_service import build_validation_email, send_email
from app.core.config import settings
from app.crud import company as crud_company
from app.crud import company_document as crud_doc
from app.crud import document_catalog as crud_catalog
from app.models.company_document import DocumentStatusEnum
from app.models.document_catalog import PeriodicityEnum
from app.models.user import User
from app.schemas.company_document import (
    CompanyDocumentSummary,
    DocumentMatrixItem,
    DocumentValidationRequest,
)

router = APIRouter(prefix="/companies/{company_id}/documents", tags=["Gestión Documental"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


def _get_company_or_404(db: Session, company_id: int):
    company = crud_company.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return company


def _check_company_access(db: Session, current_user: User, company_id: int):
    if not crud_company.user_has_access_to_company(db, current_user, company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta empresa",
        )


def _period_year(period_label: Optional[str]) -> Optional[int]:
    if not period_label:
        return None
    try:
        return int(period_label.split("-")[0])
    except ValueError:
        return None


def _send_notification(
    *,
    to_email: Optional[str],
    to_name: str,
    company_name: str,
    document_name: str,
    period_display: str,
    validator_name: str,
    validator_email: Optional[str],
    approved: bool,
    rejection_reason: Optional[str],
) -> None:
    """Envía email en background. No lanza excepción."""
    if not to_email:
        return
    if not settings.MAIL_FROM:
        print("[email] MAIL_FROM no configurado — email omitido")
        return

    subject, html_body = build_validation_email(
        to_name=to_name,
        company_name=company_name,
        document_name=document_name,
        period_display=period_display,
        validator_name=validator_name,
        approved=approved,
        rejection_reason=rejection_reason,
    )
    send_email(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        sender_name=validator_name,
        reply_to=validator_email,   # el destinatario puede responder directo al validador
    )


# ── GET matriz ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[DocumentMatrixItem])
def get_documents_matrix(
    company_id: int,
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)

    user_codes = {p.code for p in current_user.role.permissions}
    only_validated = (
        "documents.upload" not in user_codes
        and not current_user.is_platform_admin
    )
    return crud_doc.get_document_matrix(db, company, year=year, only_validated=only_validated)


# ── GET resumen ───────────────────────────────────────────────────────────────

@router.get("/summary", response_model=CompanyDocumentSummary)
def get_documents_summary(
    company_id: int,
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)
    return crud_doc.get_company_document_summary(db, company, year=year)


# ── POST upload ───────────────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentMatrixItem, status_code=status.HTTP_201_CREATED)
async def upload_document(
    company_id: int,
    catalog_item_id: int,
    period_label: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)

    catalog_item = crud_catalog.get_catalog_item(db, catalog_item_id)
    if not catalog_item or not catalog_item.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El item del catálogo no existe o está desactivado",
        )

    if catalog_item.periodicity == PeriodicityEnum.UNICO:
        period_label = None
    elif not period_label:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este documento requiere indicar el período (period_label)",
        )

    existing = crud_doc.get_document_for_period(db, company.id, catalog_item.id, period_label)
    if existing and existing.status == DocumentStatusEnum.VALIDADO:
        user_codes = {p.code for p in current_user.role.permissions}
        if "documents.replace_validated" not in user_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este documento ya fue validado. Solo un supervisor o administrador puede reemplazarlo.",
            )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión no permitida. Usa: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo supera el tamaño máximo permitido (15 MB)",
        )

    doc = crud_doc.upload_document(
        db, company, catalog_item, period_label, file.filename, file_bytes, current_user
    )

    matrix = crud_doc.get_document_matrix(db, company, year=_period_year(period_label))
    for row in matrix:
        if row.catalog_item_id == catalog_item.id and row.period_label == period_label:
            return row

    return DocumentMatrixItem(
        catalog_item_id=catalog_item.id,
        code=catalog_item.code,
        name=catalog_item.name,
        category=catalog_item.category,
        periodicity=catalog_item.periodicity,
        period_label=doc.period_label,
        period_display=doc.period_label or "Único",
        company_document_id=doc.id,
        status=doc.status,
        has_file=bool(doc.file_path),
        original_filename=doc.original_filename,
        uploaded_at=doc.uploaded_at,
        due_date=doc.due_date,
    )


# ── POST validate ─────────────────────────────────────────────────────────────

@router.post("/{document_id}/validate", response_model=DocumentMatrixItem)
def validate_document(
    company_id: int,
    document_id: int,
    payload: DocumentValidationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.validate")),
):
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)

    document = crud_doc.get_company_document(db, document_id)
    if not document or document.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

    try:
        crud_doc.validate_document(db, document, payload.approve, payload.reason, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # ── Lógica de destinatario según resultado ──────────────────────────────
    # APROBADO → email a la empresa (correo de contacto)
    # RECHAZADO → email al técnico que subió el documento
    if payload.approve:
        to_email = company.email_contacto
        to_name  = company.razon_social
    else:
        uploader = document.uploaded_by
        to_email = uploader.email    if uploader else None
        to_name  = uploader.full_name if uploader else "Técnico"

    background_tasks.add_task(
        _send_notification,
        to_email=to_email,
        to_name=to_name,
        company_name=company.razon_social,
        document_name=document.catalog_item.name if document.catalog_item else "Documento",
        period_display=document.period_label or "Único",
        validator_name=current_user.full_name,
        validator_email=current_user.email,
        approved=payload.approve,
        rejection_reason=payload.reason,
    )

    matrix = crud_doc.get_document_matrix(db, company, year=_period_year(document.period_label))
    for row in matrix:
        if row.company_document_id == document.id:
            return row

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No se pudo reconstruir el estado",
    )


# ── POST resend email ─────────────────────────────────────────────────────────

@router.post("/{document_id}/resend-email", status_code=status.HTTP_200_OK)
def resend_validation_email(
    company_id: int,
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.validate")),
):
    """
    Reenvía el email de notificación del último estado (VALIDADO → empresa,
    RECHAZADO → técnico que subió el documento).
    """
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)

    document = crud_doc.get_company_document(db, document_id)
    if not document or document.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

    if document.status not in (DocumentStatusEnum.VALIDADO, DocumentStatusEnum.RECHAZADO):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede reenviar para documentos validados o rechazados",
        )

    approved = document.status == DocumentStatusEnum.VALIDADO

    if approved:
        if not company.email_contacto:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta empresa no tiene email de contacto configurado",
            )
        to_email = company.email_contacto
        to_name  = company.razon_social
    else:
        uploader = document.uploaded_by
        if not uploader:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró el técnico que subió el documento",
            )
        to_email = uploader.email
        to_name  = uploader.full_name

    validator_name = (
        document.validated_by.full_name if document.validated_by else current_user.full_name
    )

    validator_email = (
        document.validated_by.email if document.validated_by else current_user.email
    )
    background_tasks.add_task(
        _send_notification,
        to_email=to_email,
        to_name=to_name,
        company_name=company.razon_social,
        document_name=document.catalog_item.name if document.catalog_item else "Documento",
        period_display=document.period_label or "Único",
        validator_name=validator_name,
        validator_email=validator_email,
        approved=approved,
        rejection_reason=document.rejection_reason,
    )

    return {
        "message": f"Email reenviado a {to_email}",
        "document_id": document_id,
        "status": document.status,
    }


# ── GET download ──────────────────────────────────────────────────────────────

@router.get("/{document_id}/download")
def download_document(
    company_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_company_access(db, current_user, company_id)

    document = crud_doc.get_company_document(db, document_id)
    if not document or document.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay archivo cargado")

    return FileResponse(
        path=document.file_path,
        filename=document.original_filename or os.path.basename(document.file_path),
    )


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{document_id}", response_model=DocumentMatrixItem)
def delete_document_file(
    company_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("documents.upload", "documents.manage_catalog")
    ),
):
    _check_company_access(db, current_user, company_id)
    company = _get_company_or_404(db, company_id)

    document = crud_doc.get_company_document(db, document_id)
    if not document or document.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

    crud_doc.delete_document_file(db, document)

    matrix = crud_doc.get_document_matrix(db, company, year=_period_year(document.period_label))
    for row in matrix:
        if (
            row.catalog_item_id == document.catalog_item_id
            and row.period_label == document.period_label
        ):
            return row

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No se pudo reconstruir el estado",
    )
    