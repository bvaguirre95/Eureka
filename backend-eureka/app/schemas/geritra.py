"""Schemas del módulo GERITRA."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.geritra import (
    RiskLevel, MatrixStatus, ControlType, ActionStatus
)


# ── RiskCategory ──────────────────────────────────────────────────────────────

class RiskCategoryCreate(BaseModel):
    name:      str  = Field(..., min_length=1, max_length=100)
    color:     Optional[str] = None
    order:     int  = 0
    is_active: bool = True


class RiskCategoryUpdate(BaseModel):
    name:      Optional[str]  = None
    color:     Optional[str]  = None
    order:     Optional[int]  = None
    is_active: Optional[bool] = None


class RiskCategoryOut(BaseModel):
    id:              int
    organization_id: int
    name:            str
    color:           Optional[str]
    order:           int
    is_active:       bool
    factor_count:    int = 0
    class Config: from_attributes = True


# ── RiskFactorCatalog ─────────────────────────────────────────────────────────

class RiskFactorCreate(BaseModel):
    category_id: int
    name:        str  = Field(..., min_length=1, max_length=200)
    effect:      Optional[str] = None
    is_active:   bool = True


class RiskFactorUpdate(BaseModel):
    name:      Optional[str]  = None
    effect:    Optional[str]  = None
    is_active: Optional[bool] = None


class RiskFactorOut(BaseModel):
    id:              int
    organization_id: int
    category_id:     int
    category_name:   Optional[str] = None
    name:            str
    effect:          Optional[str]
    is_active:       bool
    class Config: from_attributes = True


# ── JobPosition ───────────────────────────────────────────────────────────────

class JobPositionCreate(BaseModel):
    name:                 str  = Field(..., min_length=1, max_length=150)
    area:                 Optional[str] = None
    process:              Optional[str] = None
    num_workers:          int  = Field(1, ge=1)
    has_disability:       Optional[bool] = None
    disability_pct:       Optional[int]  = Field(None, ge=0, le=100)
    routine_activity:     Optional[str]  = None
    non_routine_activity: Optional[str]  = None
    machinery:            Optional[str]  = None
    technical_aids:       Optional[str]  = None
    description:          Optional[str]  = None
    is_active:            bool = True


class JobPositionUpdate(BaseModel):
    name:                 Optional[str]  = None
    area:                 Optional[str]  = None
    process:              Optional[str]  = None
    num_workers:          Optional[int]  = Field(None, ge=1)
    has_disability:       Optional[bool] = None
    disability_pct:       Optional[int]  = Field(None, ge=0, le=100)
    routine_activity:     Optional[str]  = None
    non_routine_activity: Optional[str]  = None
    machinery:            Optional[str]  = None
    technical_aids:       Optional[str]  = None
    description:          Optional[str]  = None
    is_active:            Optional[bool] = None


class JobPositionOut(BaseModel):
    id:                   int
    company_id:           int
    organization_id:      int
    name:                 str
    area:                 Optional[str]
    process:              Optional[str]
    num_workers:          int
    has_disability:       Optional[bool]
    disability_pct:       Optional[int]
    routine_activity:     Optional[str]
    non_routine_activity: Optional[str]
    machinery:            Optional[str]
    technical_aids:       Optional[str]
    description:          Optional[str]
    is_active:            bool
    matrix_count:         int = 0
    created_at:           datetime
    class Config: from_attributes = True


# ── RiskControl ───────────────────────────────────────────────────────────────

class RiskControlCreate(BaseModel):
    control_type: ControlType
    description:  str = Field(..., min_length=1)


class RiskControlOut(BaseModel):
    id:           int
    row_id:       int
    control_type: ControlType
    description:  str
    class Config: from_attributes = True


# ── RiskAction ────────────────────────────────────────────────────────────────

class RiskActionCreate(BaseModel):
    description:      str = Field(..., min_length=1)
    responsible_name: Optional[str]      = None
    due_date:         Optional[datetime] = None


class RiskActionUpdate(BaseModel):
    description:      Optional[str]      = None
    responsible_name: Optional[str]      = None
    due_date:         Optional[datetime] = None
    status:           Optional[ActionStatus] = None
    completion_notes: Optional[str]      = None


class RiskActionOut(BaseModel):
    id:               int
    row_id:           int
    matrix_id:        int
    description:      str
    responsible_name: Optional[str]
    due_date:         Optional[datetime]
    status:           ActionStatus
    completion_notes: Optional[str]
    completed_at:     Optional[datetime]
    created_at:       datetime
    class Config: from_attributes = True


# ── RiskMatrixRow ─────────────────────────────────────────────────────────────

class RiskMatrixRowCreate(BaseModel):
    order:        int = 0
    category_id:  Optional[int] = None
    factor_id:    Optional[int] = None
    peligro:      str = Field(..., min_length=1, max_length=300)
    efecto:       Optional[str] = None
    # Índices evaluación inicial (1-3, excepto C que es 1-4)
    ip:           Optional[int] = Field(None, ge=1, le=3)
    ic:           Optional[int] = Field(None, ge=1, le=3)
    ice:          Optional[int] = Field(None, ge=1, le=3)
    ie:           Optional[int] = Field(None, ge=1, le=3)
    consecuencia: Optional[int] = Field(None, ge=1, le=4)


class RiskMatrixRowUpdate(BaseModel):
    order:        Optional[int] = None
    category_id:  Optional[int] = None
    factor_id:    Optional[int] = None
    peligro:      Optional[str] = None
    efecto:       Optional[str] = None
    # Evaluación inicial
    ip:           Optional[int] = Field(None, ge=1, le=3)
    ic:           Optional[int] = Field(None, ge=1, le=3)
    ice:          Optional[int] = Field(None, ge=1, le=3)
    ie:           Optional[int] = Field(None, ge=1, le=3)
    consecuencia: Optional[int] = Field(None, ge=1, le=4)
    # Riesgo residual (post-control)
    res_ip:           Optional[int] = Field(None, ge=1, le=3)
    res_ic:           Optional[int] = Field(None, ge=1, le=3)
    res_ice:          Optional[int] = Field(None, ge=1, le=3)
    res_ie:           Optional[int] = Field(None, ge=1, le=3)
    res_consecuencia: Optional[int] = Field(None, ge=1, le=4)


class RiskMatrixRowOut(BaseModel):
    id:            int
    matrix_id:     int
    order:         int
    category_id:   Optional[int]
    category_name: Optional[str] = None
    factor_id:     Optional[int]
    factor_name:   Optional[str] = None
    peligro:       str
    efecto:        Optional[str]
    # Evaluación inicial
    ip:            Optional[int]
    ic:            Optional[int]
    ice:           Optional[int]
    ie:            Optional[int]
    consecuencia:  Optional[int]
    probabilidad:  Optional[int]
    estimacion:    Optional[int]
    nivel_riesgo:  Optional[RiskLevel]
    # Riesgo residual
    res_ip:           Optional[int]     = None
    res_ic:           Optional[int]     = None
    res_ice:          Optional[int]     = None
    res_ie:           Optional[int]     = None
    res_consecuencia: Optional[int]     = None
    res_probabilidad: Optional[int]     = None
    res_estimacion:   Optional[int]     = None
    res_nivel_riesgo: Optional[RiskLevel] = None
    controls:      List[RiskControlOut] = []
    actions:       List[RiskActionOut]  = []
    class Config: from_attributes = True


# ── RiskMatrix ────────────────────────────────────────────────────────────────

class RiskMatrixCreate(BaseModel):
    elaborated_by:   Optional[str] = None
    elaborated_role: Optional[str] = None
    notes:           Optional[str] = None


class RiskMatrixUpdate(BaseModel):
    status:          Optional[MatrixStatus] = None
    elaborated_by:   Optional[str]          = None
    reviewed_by:     Optional[str]          = None
    approved_by:     Optional[str]          = None
    elaborated_role: Optional[str]          = None
    reviewed_role:   Optional[str]          = None
    approved_role:   Optional[str]          = None
    notes:           Optional[str]          = None


class RiskMatrixOut(BaseModel):
    id:                int
    job_position_id:   int
    job_position_name: Optional[str] = None
    company_id:        int
    organization_id:   int
    version:           int
    status:            MatrixStatus
    elaborated_by:     Optional[str]
    reviewed_by:       Optional[str]
    approved_by:       Optional[str]
    elaborated_role:   Optional[str]
    reviewed_role:     Optional[str]
    approved_role:     Optional[str]
    notes:             Optional[str]
    rows:              List[RiskMatrixRowOut] = []
    total_rows:        int = 0
    moderado:          int = 0
    importante:        int = 0
    intolerable:       int = 0
    open_actions:      int = 0
    created_at:        datetime
    updated_at:        datetime
    class Config: from_attributes = True


class RiskMatrixListItem(BaseModel):
    id:                int
    job_position_id:   int
    job_position_name: Optional[str] = None
    version:           int
    status:            MatrixStatus
    total_rows:        int = 0
    intolerable:       int = 0
    importante:        int = 0
    moderado:          int = 0
    open_actions:      int = 0
    updated_at:        datetime
    class Config: from_attributes = True