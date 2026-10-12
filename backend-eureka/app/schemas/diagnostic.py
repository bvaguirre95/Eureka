from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from app.models.diagnostic import AnswerValueEnum, DiagnosticStatusEnum, DiagnosticTypeEnum


class DiagnosticAnswerIn(BaseModel):
    question_id: str
    answer: AnswerValueEnum
    observation: Optional[str] = None


class DiagnosticAnswerOut(BaseModel):
    question_id: str
    answer: AnswerValueEnum
    observation: Optional[str] = None

    class Config:
        from_attributes = True


class DiagnosticBase(BaseModel):
    inspection_number: Optional[str] = None
    diagnostic_type: DiagnosticTypeEnum = DiagnosticTypeEnum.INSPECCION
    inspection_date: Optional[datetime] = None
    company_type: Optional[str] = None
    employer_name: Optional[str] = None
    razon_social: Optional[str] = None
    ruc: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    economic_activity: Optional[str] = None
    workplace_type: Optional[str] = None
    workplace_address: Optional[str] = None
    workplace_count: Optional[int] = 0
    work_schedule: Optional[str] = None
    total_workers: Optional[int] = 0
    iess_payroll: Optional[bool] = None
    workers_male: Optional[int] = 0
    workers_female: Optional[int] = 0
    workers_remote: Optional[int] = 0
    workers_foreign: Optional[int] = 0
    workers_teen: Optional[int] = 0
    workers_pregnant: Optional[int] = 0
    workers_senior: Optional[int] = 0
    workers_child: Optional[int] = 0
    workers_nursing: Optional[int] = 0
    interviewed: Optional[str] = None


class DiagnosticCreate(DiagnosticBase):
    pass


class DiagnosticUpdate(DiagnosticBase):
    answers: Optional[List[DiagnosticAnswerIn]] = None
    status: Optional[DiagnosticStatusEnum] = None


class DiagnosticSectionResult(BaseModel):
    section_id: str
    section_name: str
    total: int
    cumple: int
    no_cumple: int
    no_aplica: int
    sin_respuesta: int
    percent: float


class DiagnosticOut(DiagnosticBase):
    id: int
    company_id: int
    status: DiagnosticStatusEnum
    created_at: datetime
    updated_at: datetime
    answers: List[DiagnosticAnswerOut] = []
    # Campo adicional: trabajadores de la empresa (para pre-poblar en el form)
    company_num_trabajadores: Optional[int] = None
    # Stats calculados al vuelo
    total_questions: int = 96
    answered: int = 0
    cumple: int = 0
    no_cumple: int = 0
    no_aplica: int = 0
    progress_percent: float = 0.0
    compliance_percent: float = 0.0
    sections: List[DiagnosticSectionResult] = []

    class Config:
        from_attributes = True


class DiagnosticListItem(BaseModel):
    id: int
    company_id: int
    status: DiagnosticStatusEnum
    diagnostic_type: DiagnosticTypeEnum
    inspection_date: Optional[datetime] = None
    inspection_number: Optional[str] = None
    razon_social: Optional[str] = None
    answered: int = 0
    compliance_percent: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True