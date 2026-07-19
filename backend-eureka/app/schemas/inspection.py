from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.inspection import (
    ActionStatusEnum, FieldTypeEnum, InspectionStatusEnum
)


# ── Fields ────────────────────────────────────────────────────────────────────

class InspectionTypeFieldBase(BaseModel):
    name: str
    field_key: str
    field_type: FieldTypeEnum
    options: Optional[str] = None       # "CO2|PQS|AGUA" separados por |
    is_required: bool = False
    order: int = 0
    group_name: Optional[str] = None


class InspectionTypeFieldCreate(InspectionTypeFieldBase):
    pass


class InspectionTypeFieldOut(InspectionTypeFieldBase):
    id: int

    class Config:
        from_attributes = True

    @property
    def options_list(self) -> List[str]:
        return self.options.split("|") if self.options else []


# ── Inspection Types ──────────────────────────────────────────────────────────

class InspectionTypeCreate(BaseModel):
    name: str
    type_code: Optional[str] = None   # "EXT" | "EPP" — usado por el motor de secuencias
    description: Optional[str] = None
    icon: Optional[str] = None
    periodicity: Optional[str] = None
    is_active: bool = True
    pdf_template: str = "generico"
    fields: List[InspectionTypeFieldCreate] = []


class InspectionTypeUpdate(BaseModel):
    name: Optional[str] = None
    type_code: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    periodicity: Optional[str] = None
    is_active: Optional[bool] = None
    pdf_template: Optional[str] = None
    fields: Optional[List[InspectionTypeFieldCreate]] = None


class InspectionTypeOut(BaseModel):
    id: int
    organization_id: int
    name: str
    type_code: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    periodicity: Optional[str] = None
    is_active: bool
    pdf_template: str = "generico"
    fields: List[InspectionTypeFieldOut] = []
    field_count: int = 0
    inspection_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionTypeMini(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    field_count: int = 0

    class Config:
        from_attributes = True


# ── Records & Values ──────────────────────────────────────────────────────────

class FieldValueIn(BaseModel):
    field_id: int
    value: Optional[str] = None


class FieldValueOut(BaseModel):
    field_id: int
    field_key: str = ""
    field_name: str = ""
    field_type: str = ""
    value: Optional[str] = None

    class Config:
        from_attributes = True


class InspectionRecordIn(BaseModel):
    order: int = 0
    has_finding: bool = False
    values: List[FieldValueIn] = []


class InspectionRecordOut(BaseModel):
    id: int
    order: int
    has_finding: bool
    photo_path: Optional[str] = None
    has_photo: bool = False
    values: List[FieldValueOut] = []

    class Config:
        from_attributes = True


# ── Corrective Actions ────────────────────────────────────────────────────────

class CorrectiveActionCreate(BaseModel):
    record_id: Optional[int] = None
    item_ref: Optional[str] = None
    description: str
    action: Optional[str] = None
    priority: Optional[str] = None     # "A" | "B" | "C"
    responsible_name: Optional[str] = None   # nombre libre
    responsible_id: Optional[int] = None     # usuario del sistema (opcional)
    due_date_start: Optional[datetime] = None
    due_date_end: Optional[datetime] = None


class CorrectiveActionUpdate(BaseModel):
    description: Optional[str] = None
    action: Optional[str] = None
    priority: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_id: Optional[int] = None
    due_date_start: Optional[datetime] = None
    due_date_end: Optional[datetime] = None
    status: Optional[ActionStatusEnum] = None
    completion_notes: Optional[str] = None


class CorrectiveActionOut(BaseModel):
    id: int
    inspection_id: int
    record_id: Optional[int] = None
    item_ref: Optional[str] = None
    description: str
    action: Optional[str] = None
    priority: Optional[str] = None
    due_date_start: Optional[datetime] = None
    due_date_end: Optional[datetime] = None
    status: ActionStatusEnum
    completion_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    responsible_id: Optional[int] = None
    responsible_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Inspection ────────────────────────────────────────────────────────────────

class InspectionCreate(BaseModel):
    inspection_type_id: int
    inspection_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    elaborated_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    elaborated_role: Optional[str] = None
    reviewed_role: Optional[str] = None
    approved_role: Optional[str] = None


class InspectionUpdate(BaseModel):
    status: Optional[InspectionStatusEnum] = None
    inspection_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    general_observations: Optional[str] = None
    recommendations: Optional[str] = None
    elaborated_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    elaborated_role: Optional[str] = None
    reviewed_role: Optional[str] = None
    approved_role: Optional[str] = None
    records: Optional[List[InspectionRecordIn]] = None


class InspectionOut(BaseModel):
    id: int
    company_id: int
    inspection_type_id: int
    inspection_type_name: str = ""
    inspection_type_fields: List[InspectionTypeFieldOut] = []
    status: InspectionStatusEnum
    inspection_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    general_observations: Optional[str] = None
    recommendations: Optional[str] = None
    elaborated_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    elaborated_role: Optional[str] = None
    reviewed_role: Optional[str] = None
    approved_role: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    records: List[InspectionRecordOut] = []
    actions: List[CorrectiveActionOut] = []
    # Stats
    total_records: int = 0
    records_with_findings: int = 0
    open_actions: int = 0
    compliance_percent: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionListItem(BaseModel):
    id: int
    company_id: int
    inspection_type_id: int
    inspection_type_name: str = ""
    status: InspectionStatusEnum
    inspection_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    location: Optional[str] = None
    assigned_to_name: Optional[str] = None
    total_records: int = 0
    records_with_findings: int = 0
    open_actions: int = 0
    compliance_percent: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class InspectionTypeStat(BaseModel):
    type_id: int
    type_name: str
    total: int
    completed: int
    compliance_avg: float
    open_actions: int
    semaforo: str   # "green" | "yellow" | "red"


class ActionSummary(BaseModel):
    """Resumen de una acción correctiva para el dashboard."""
    id: int
    inspection_id: int
    inspection_number: Optional[str]
    inspection_type: str
    description: str
    responsible_name: Optional[str]
    due_date_end: Optional[datetime]
    status: str
    priority: Optional[str]
    days_overdue: Optional[int]  # días vencida (negativo = días restantes)


class WeeklyStats(BaseModel):
    """Estadísticas de la semana actual."""
    inspections_this_week: int
    completed_this_week: int
    actions_created_this_week: int
    actions_completed_this_week: int


class InspectionDashboard(BaseModel):
    total: int
    borrador: int
    en_proceso: int
    completada: int
    cerrada: int
    compliance_avg: float
    open_actions: int
    overdue_actions: int
    by_type: List[InspectionTypeStat]
    # Nuevos campos
    weekly: Optional[WeeklyStats] = None
    actions_overdue: List[ActionSummary] = []    # acciones ya vencidas
    actions_due_soon: List[ActionSummary] = []   # vencen en los próximos 7 días