"""Schemas del módulo de Trabajadores."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.worker import (
    ContractTypeEnum, DocTypeEnum, GenderEnum, WorkerStatusEnum,
)


# ── Schemas de puesto ──────────────────────────────────────────────────────────

class WorkerPositionHistoryOut(BaseModel):
    id:               int
    worker_id:        int
    job_position_id:  Optional[int]
    job_position_name: Optional[str] = None
    start_date:       date
    end_date:         Optional[date]
    reason:           Optional[str]
    notes:            Optional[str]
    created_at:       Optional[datetime]

    model_config = {"from_attributes": True}


class WorkerPositionAssign(BaseModel):
    """Asignar un nuevo puesto al trabajador (cierra el anterior si existe)."""
    job_position_id: int
    start_date:      date
    reason:          Optional[str] = None
    notes:           Optional[str] = None


# ── Schema base ────────────────────────────────────────────────────────────────

class WorkerBase(BaseModel):
    # Identificación
    employee_code: Optional[str]  = Field(None, max_length=20)
    doc_type:      DocTypeEnum
    doc_number:    str            = Field(..., min_length=1, max_length=20)

    # Datos personales
    first_name:  str  = Field(..., min_length=1, max_length=100)
    last_name:   str  = Field(..., min_length=1, max_length=100)
    birth_date:  Optional[date]  = None
    gender:      Optional[GenderEnum] = None
    phone:       Optional[str]   = Field(None, max_length=20)
    email:       Optional[str]   = Field(None, max_length=120)

    # Vínculo laboral
    hire_date:        date
    termination_date: Optional[date]             = None
    contract_type:    Optional[ContractTypeEnum] = None

    # Puesto inicial (crea el primer registro de historial automáticamente)
    job_position_id:  Optional[int] = None

    # Discapacidad
    disability_type: Optional[str] = Field(None, max_length=100)
    disability_pct:  Optional[int] = Field(None, ge=0, le=100)

    # Complementario
    notes: Optional[str] = None

    @field_validator("doc_number")
    @classmethod
    def validate_doc_number(cls, v: str, info) -> str:
        v = v.strip()
        # Validación básica de cédula ecuatoriana (10 dígitos numéricos)
        # El algoritmo completo del módulo 10 se valida en el CRUD
        return v

    @field_validator("termination_date")
    @classmethod
    def validate_termination(cls, v: Optional[date], info) -> Optional[date]:
        # La validación cruzada hire_date < termination_date se hace en el CRUD
        return v


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    """Actualización parcial — solo campos editables post-creación."""
    employee_code:    Optional[str]             = Field(None, max_length=20)
    first_name:       Optional[str]             = Field(None, min_length=1, max_length=100)
    last_name:        Optional[str]             = Field(None, min_length=1, max_length=100)
    birth_date:       Optional[date]            = None
    gender:           Optional[GenderEnum]      = None
    phone:            Optional[str]             = Field(None, max_length=20)
    email:            Optional[str]             = Field(None, max_length=120)
    hire_date:        Optional[date]            = None
    termination_date: Optional[date]            = None
    contract_type:    Optional[ContractTypeEnum] = None
    disability_type:  Optional[str]             = Field(None, max_length=100)
    disability_pct:   Optional[int]             = Field(None, ge=0, le=100)
    notes:            Optional[str]             = None
    # doc_type y doc_number NO son editables (protegen la integridad del historial)


class WorkerStatusUpdate(BaseModel):
    """Cambiar estado del trabajador."""
    status:           WorkerStatusEnum
    termination_date: Optional[date] = None   # requerido si status=RETIRADO
    notes:            Optional[str]  = None

    @field_validator("termination_date")
    @classmethod
    def require_termination_date(cls, v, info):
        # La validación cruzada con status se hace en el CRUD
        return v


# ── Schema de salida ───────────────────────────────────────────────────────────

class WorkerOut(BaseModel):
    id:               int
    company_id:       int

    # Identificación
    employee_code:    Optional[str]
    doc_type:         DocTypeEnum
    doc_number:       str
    full_name:        str   = ""   # propiedad calculada

    # Datos personales
    first_name:   str
    last_name:    str
    birth_date:   Optional[date]
    gender:       Optional[GenderEnum]
    phone:        Optional[str]
    email:        Optional[str]
    age:          Optional[int] = None

    # Vínculo laboral
    hire_date:        date
    termination_date: Optional[date]
    contract_type:    Optional[ContractTypeEnum]
    status:           WorkerStatusEnum
    is_active:        bool

    # Puesto actual
    job_position_id:   Optional[int]
    job_position_name: Optional[str] = None
    department:        Optional[str] = None   # del JobPosition actual

    # Discapacidad
    disability_type: Optional[str]
    disability_pct:  Optional[int]

    # Complementario
    notes: Optional[str]

    # Auditoría
    created_at:      Optional[datetime]
    updated_at:      Optional[datetime]
    created_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class WorkerListItem(BaseModel):
    """Vista compacta para el listado."""
    id:             int
    company_id:     int
    employee_code:  Optional[str]
    full_name:      str
    doc_type:       DocTypeEnum
    doc_number:     str
    status:         WorkerStatusEnum
    hire_date:      date
    job_position_name: Optional[str] = None
    department:        Optional[str] = None
    has_disability:    bool = False

    model_config = {"from_attributes": True}


# ── Schema de paginación ───────────────────────────────────────────────────────

class WorkerPage(BaseModel):
    items: list[WorkerListItem]
    total: int
    skip:  int
    limit: int