from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class AlertConfigOut(BaseModel):
    id: int
    organization_id: int
    days_before: str          # raw "30,15,7"
    days_list: list[int]      # [30, 15, 7] parseado
    is_enabled: bool
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("days_list", mode="before")
    @classmethod
    def _parse_days(cls, v):
        # Si ya es lista, ok; si viene de ORM, lo parsea el property
        if isinstance(v, list):
            return v
        return v


class AlertConfigUpdate(BaseModel):
    days_before: list[int]   # [30, 15, 7]
    is_enabled: bool = True

    @field_validator("days_before")
    @classmethod
    def validate_days(cls, v):
        if not v:
            raise ValueError("Debe incluir al menos un período de alerta")
        for d in v:
            if d < 1 or d > 365:
                raise ValueError("Los días deben estar entre 1 y 365")
        return sorted(set(v), reverse=True)


class ExpiringDocumentItem(BaseModel):
    """Documento próximo a vencer o vencido, para el panel de alertas."""
    company_document_id: int
    company_id: int
    company_name: str
    catalog_item_id: int
    document_name: str
    document_code: str
    period_display: str
    due_date: Optional[datetime]
    days_remaining: int       # negativo si ya venció
    status: str
    technician_name: Optional[str] = None
    technician_email: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertRunResult(BaseModel):
    sent: int
    skipped: int
    errors: int
    expired_marked: int = 0
    message: str