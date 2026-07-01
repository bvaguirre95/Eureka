import enum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DiagnosticStatusEnum(str, enum.Enum):
    BORRADOR = "borrador"
    COMPLETADO = "completado"


class DiagnosticTypeEnum(str, enum.Enum):
    INSPECCION = "inspeccion"
    REINSPECCION = "reinspeccion"


class AnswerValueEnum(str, enum.Enum):
    CUMPLE = "cumple"
    NO_CUMPLE = "no_cumple"
    NO_APLICA = "no_aplica"


class Diagnostic(Base):
    """
    Diagnóstico Anexo 1 para una empresa. Contiene los datos generales
    de la inspección y los datos de la empresa evaluada.
    """
    __tablename__ = "diagnostics"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Datos de inspección
    inspection_number = Column(String(50), nullable=True)
    diagnostic_type = Column(
        SAEnum(DiagnosticTypeEnum, name="diagnostic_type_enum"),
        nullable=False,
        default=DiagnosticTypeEnum.INSPECCION,
    )
    inspection_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        SAEnum(DiagnosticStatusEnum, name="diagnostic_status_enum"),
        nullable=False,
        default=DiagnosticStatusEnum.BORRADOR,
    )

    # Datos generales de la empresa (pueden diferir de Company al momento del diagnóstico)
    company_type = Column(String(20), nullable=True)      # "publica" | "privada"
    employer_name = Column(String(200), nullable=True)
    razon_social = Column(String(200), nullable=True)
    ruc = Column(String(13), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(20), nullable=True)
    economic_activity = Column(String(200), nullable=True)

    # Centro de trabajo
    workplace_type = Column(String(20), nullable=True)    # "matriz" | "sucursal"
    workplace_address = Column(String(255), nullable=True)
    workplace_count = Column(Integer, nullable=True, default=0)
    work_schedule = Column(String(50), nullable=True)

    # Trabajadores
    total_workers = Column(Integer, nullable=True, default=0)
    iess_payroll = Column(Boolean, nullable=True)
    workers_male = Column(Integer, nullable=True, default=0)
    workers_female = Column(Integer, nullable=True, default=0)
    workers_remote = Column(Integer, nullable=True, default=0)
    workers_foreign = Column(Integer, nullable=True, default=0)
    workers_teen = Column(Integer, nullable=True, default=0)
    workers_pregnant = Column(Integer, nullable=True, default=0)
    workers_senior = Column(Integer, nullable=True, default=0)
    workers_child = Column(Integer, nullable=True, default=0)
    workers_nursing = Column(Integer, nullable=True, default=0)
    interviewed = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    created_by = relationship("User")
    answers = relationship("DiagnosticAnswer", back_populates="diagnostic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Diagnostic id={self.id} company_id={self.company_id} status={self.status}>"


class DiagnosticAnswer(Base):
    """
    Respuesta a una pregunta del Anexo 1. Solo se persiste cuando el usuario
    responde algo — el resto se infiere como sin_respuesta.
    """
    __tablename__ = "diagnostic_answers"

    id = Column(Integer, primary_key=True, index=True)
    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(10), nullable=False)  # e.g. "A01", "T03"
    answer = Column(
        SAEnum(AnswerValueEnum, name="answer_value_enum"),
        nullable=False,
    )
    observation = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    diagnostic = relationship("Diagnostic", back_populates="answers")

    def __repr__(self):
        return f"<DiagnosticAnswer diag={self.diagnostic_id} q={self.question_id} ans={self.answer}>"
