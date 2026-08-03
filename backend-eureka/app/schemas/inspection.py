from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.inspection import (
    ActionStatusEnum, FieldTypeEnum, FieldScopeEnum,
    InspectionStatusEnum, StructureTypeEnum,
)


# ── Fields ────────────────────────────────────────────────────────────────────

class InspectionTypeFieldBase(BaseModel):
    name:        str
    field_key:   str
    field_type:  FieldTypeEnum
    options:     Optional[str] = None
    is_required: bool = False
    order:       int = 0
    group_name:  Optional[str] = None
    scope:       Optional[FieldScopeEnum] = FieldScopeEnum.MATRIZ   # ← NUEVO


class InspectionTypeFieldCreate(InspectionTypeFieldBase):
    pass


class InspectionTypeFieldOut(InspectionTypeFieldBase):
    id: int
    scope: FieldScopeEnum = FieldScopeEnum.MATRIZ   # default si viene NULL de la DB

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Campos anteriores a la migración tienen scope=NULL → forzar MATRIZ
        if hasattr(obj, "scope") and obj.scope is None:
            obj.scope = FieldScopeEnum.MATRIZ
        return super().model_validate(obj, **kwargs)

    @property
    def options_list(self) -> List[str]:
        return self.options.split("|") if self.options else []


# ── Inspection Types ──────────────────────────────────────────────────────────

class InspectionTypeCreate(BaseModel):
    name:           str
    type_code:      Optional[str] = None
    description:    Optional[str] = None
    icon:           Optional[str] = None
    periodicity:    Optional[str] = None
    is_active:      bool = True
    pdf_template:   str = "generico"
    structure_type: StructureTypeEnum = StructureTypeEnum.MATRIZ   # ← NUEVO
    fields:         List[InspectionTypeFieldCreate] = []


class InspectionTypeUpdate(BaseModel):
    name:           Optional[str] = None
    type_code:      Optional[str] = None
    description:    Optional[str] = None
    icon:           Optional[str] = None
    periodicity:    Optional[str] = None
    is_active:      Optional[bool] = None
    pdf_template:   Optional[str] = None
    structure_type: Optional[StructureTypeEnum] = None             # ← NUEVO
    fields:         Optional[List[InspectionTypeFieldCreate]] = None


class InspectionTypeOut(BaseModel):
    id:              int
    organization_id: int
    name:            str
    type_code:       Optional[str] = None
    description:     Optional[str] = None
    icon:            Optional[str] = None
    periodicity:     Optional[str] = None
    is_active:       bool
    pdf_template:    str = "generico"
    structure_type:  Optional[StructureTypeEnum] = StructureTypeEnum.MATRIZ  # ← NUEVO
    fields:          List[InspectionTypeFieldOut] = []
    field_count:     int = 0
    inspection_count: int = 0
    created_at:      datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Tipos anteriores a la migración tienen structure_type=NULL → forzar MATRIZ
        if hasattr(obj, "structure_type") and obj.structure_type is None:
            obj.structure_type = StructureTypeEnum.MATRIZ
        return super().model_validate(obj, **kwargs)


class InspectionTypeMini(BaseModel):
    id:          int
    name:        str
    description: Optional[str] = None
    field_count: int = 0

    class Config:
        from_attributes = True


# ── Records & Values ──────────────────────────────────────────────────────────

class FieldValueIn(BaseModel):
    field_id: int
    value:    Optional[str] = None


class FieldValueOut(BaseModel):
    field_id:   int
    field_key:  str = ""
    field_name: str = ""
    field_type: str = ""
    scope:      str = "matriz"                                     # ← NUEVO
    value:      Optional[str] = None

    class Config:
        from_attributes = True


class InspectionRecordIn(BaseModel):
    order:       int = 0
    has_finding: bool = False
    values:      List[FieldValueIn] = []


class InspectionRecordOut(BaseModel):
    id:          int
    order:       int
    has_finding: bool
    photo_path:  Optional[str] = None
    has_photo:   bool = False
    values:      List[FieldValueOut] = []

    class Config:
        from_attributes = True


# ── Corrective Actions ────────────────────────────────────────────────────────

class CorrectiveActionCreate(BaseModel):
    record_id:        Optional[int] = None
    item_ref:         Optional[str] = None
    description:      str
    action:           Optional[str] = None
    priority:         Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_id:   Optional[int] = None
    due_date_start:   Optional[datetime] = None
    due_date_end:     Optional[datetime] = None


class CorrectiveActionUpdate(BaseModel):
    description:      Optional[str] = None
    action:           Optional[str] = None
    priority:         Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_id:   Optional[int] = None
    due_date_start:   Optional[datetime] = None
    due_date_end:     Optional[datetime] = None
    status:           Optional[ActionStatusEnum] = None
    completion_notes: Optional[str] = None


class CorrectiveActionOut(BaseModel):
    id:               int
    inspection_id:    int
    record_id:        Optional[int] = None
    item_ref:         Optional[str] = None
    description:      str
    action:           Optional[str] = None
    priority:         Optional[str] = None
    due_date_start:   Optional[datetime] = None
    due_date_end:     Optional[datetime] = None
    status:           ActionStatusEnum
    completion_notes: Optional[str] = None
    completed_at:     Optional[datetime] = None
    responsible_id:   Optional[int] = None
    responsible_name: Optional[str] = None
    created_at:       datetime

    class Config:
        from_attributes = True


# ── Inspection ────────────────────────────────────────────────────────────────

class InspectionCreate(BaseModel):
    inspection_type_id: int
    inspection_number:  Optional[str] = None
    scheduled_date:     Optional[datetime] = None
    assigned_to_id:     Optional[int] = None
    location:           Optional[str] = None
    start_time:         Optional[str] = None
    end_time:           Optional[str] = None
    elaborated_by:      Optional[str] = None
    reviewed_by:        Optional[str] = None
    approved_by:        Optional[str] = None
    elaborated_role:    Optional[str] = None
    reviewed_role:      Optional[str] = None
    approved_role:      Optional[str] = None


class InspectionUpdate(BaseModel):
    status:               Optional[InspectionStatusEnum] = None
    inspection_number:    Optional[str] = None
    scheduled_date:       Optional[datetime] = None
    completed_date:       Optional[datetime] = None
    assigned_to_id:       Optional[int] = None
    location:             Optional[str] = None
    start_time:           Optional[str] = None
    end_time:             Optional[str] = None
    general_observations: Optional[str] = None
    recommendations:      Optional[str] = None
    elaborated_by:        Optional[str] = None
    reviewed_by:          Optional[str] = None
    approved_by:          Optional[str] = None
    elaborated_role:      Optional[str] = None
    reviewed_role:        Optional[str] = None
    approved_role:        Optional[str] = None
    records:              Optional[List[InspectionRecordIn]] = None
    general_data:         Optional[Dict[str, Any]] = None          # ← NUEVO


class InspectionOut(BaseModel):
    id:                    int
    company_id:            int
    inspection_type_id:    int
    inspection_type_name:  str = ""
    inspection_type_fields: List[InspectionTypeFieldOut] = []
    structure_type:        Optional[StructureTypeEnum] = StructureTypeEnum.MATRIZ  # ← NUEVO
    status:                InspectionStatusEnum
    inspection_number:     Optional[str] = None
    scheduled_date:        Optional[datetime] = None
    completed_date:        Optional[datetime] = None
    location:              Optional[str] = None
    start_time:            Optional[str] = None
    end_time:              Optional[str] = None
    general_observations:  Optional[str] = None
    recommendations:       Optional[str] = None
    elaborated_by:         Optional[str] = None
    reviewed_by:           Optional[str] = None
    approved_by:           Optional[str] = None
    elaborated_role:       Optional[str] = None
    reviewed_role:         Optional[str] = None
    approved_role:         Optional[str] = None
    assigned_to_id:        Optional[int] = None
    assigned_to_name:      Optional[str] = None
    created_by_name:       Optional[str] = None
    general_data:          Optional[Dict[str, Any]] = None         # ← NUEVO
    records:               List[InspectionRecordOut] = []
    actions:               List[CorrectiveActionOut] = []
    # Stats
    total_records:         int = 0
    records_with_findings: int = 0
    open_actions:          int = 0
    compliance_percent:    float = 0.0
    created_at:            datetime

    class Config:
        from_attributes = True


class InspectionListItem(BaseModel):
    id:                    int
    company_id:            int
    inspection_type_id:    int
    inspection_type_name:  str = ""
    structure_type:        Optional[StructureTypeEnum] = StructureTypeEnum.MATRIZ  # ← NUEVO
    status:                InspectionStatusEnum
    inspection_number:     Optional[str] = None
    scheduled_date:        Optional[datetime] = None
    completed_date:        Optional[datetime] = None
    location:              Optional[str] = None
    assigned_to_name:      Optional[str] = None
    total_records:         int = 0
    records_with_findings: int = 0
    open_actions:          int = 0
    compliance_percent:    float = 0.0
    created_at:            datetime

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class InspectionTypeStat(BaseModel):
    type_id:        int
    type_name:      str
    total:          int
    completed:      int
    compliance_avg: float
    open_actions:   int
    semaforo:       str


class ActionSummary(BaseModel):
    id:               int
    inspection_id:    int
    inspection_number: Optional[str]
    inspection_type:  str
    description:      str
    responsible_name: Optional[str]
    due_date_end:     Optional[datetime]
    status:           str
    priority:         Optional[str]
    days_overdue:     Optional[int]


class WeeklyStats(BaseModel):
    inspections_this_week:        int
    completed_this_week:          int
    actions_created_this_week:    int
    actions_completed_this_week:  int


class InspectionDashboard(BaseModel):
    total:            int
    borrador:         int
    en_proceso:       int
    completada:       int
    cerrada:          int
    compliance_avg:   float
    open_actions:     int
    overdue_actions:  int
    by_type:          List[InspectionTypeStat]
    weekly:           Optional[WeeklyStats] = None
    actions_overdue:  List[ActionSummary] = []
    actions_due_soon: List[ActionSummary] = []