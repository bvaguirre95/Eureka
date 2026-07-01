from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.company_document import DocumentStatusEnum
from app.models.document_catalog import PeriodicityEnum


class DocumentMatrixItem(BaseModel):
    """
    Una fila de la "matriz" de cumplimiento documental de una empresa:
    combina un item del catálogo (+ período, si aplica) con su estado
    actual. Si todavía no existe una fila en `company_documents`, se
    construye "virtualmente" con status=pendiente (no se persiste hasta
    que haya actividad).
    """

    catalog_item_id: int
    code: str
    name: str
    category: str
    periodicity: PeriodicityEnum

    period_label: Optional[str] = None
    period_display: str

    company_document_id: Optional[int] = None
    status: DocumentStatusEnum
    has_file: bool = False
    original_filename: Optional[str] = None

    uploaded_at: Optional[datetime] = None
    uploaded_by_name: Optional[str] = None

    due_date: Optional[datetime] = None

    validated_at: Optional[datetime] = None
    validated_by_name: Optional[str] = None
    rejection_reason: Optional[str] = None


class DocumentValidationRequest(BaseModel):
    approve: bool
    reason: Optional[str] = None


class CompanyDocumentSummary(BaseModel):
    """Resumen de cumplimiento para tarjetas/dashboard."""

    total: int
    pendiente: int
    cargado: int
    validado: int
    rechazado: int
    vencido: int
