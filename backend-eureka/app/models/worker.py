"""
Módulo de Trabajadores — EUREKA SST

Worker es la entidad central que conecta:
  - GERITRA (riesgos via JobPosition)
  - EPP (entregas futuras)
  - Capacitaciones (historial futuro)
  - Salud Ocupacional (exámenes futuros)
  - Accidentes (involucrado/testigo futuro)
  - Permisos de Trabajo (futuro)
  - Organismos Paritarios (futuro)

Multi-tenancy:
  Worker → Company → Organization
  Toda query filtra por company_id validado en endpoint.
"""
import enum

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum as SAEnum,
    ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# JobPosition está definida en app.models.geritra
# Worker se relaciona con ella pero no la importa directamente
# (SQLAlchemy resuelve la relación por nombre de string)


# ── Enums ──────────────────────────────────────────────────────────────────────

class DocTypeEnum(str, enum.Enum):
    CEDULA    = "cedula"
    PASAPORTE = "pasaporte"
    OTRO      = "otro"


class GenderEnum(str, enum.Enum):
    MASCULINO = "masculino"
    FEMENINO  = "femenino"
    OTRO      = "otro"


class ContractTypeEnum(str, enum.Enum):
    INDEFINIDO = "indefinido"
    PLAZO_FIJO = "plazo_fijo"
    OBRA       = "obra"
    SERVICIOS  = "servicios"
    PASANTIA   = "pasantia"
    OTRO       = "otro"


class WorkerStatusEnum(str, enum.Enum):
    ACTIVO     = "activo"
    INACTIVO   = "inactivo"     # licencia, suspensión sin sueldo
    SUSPENDIDO = "suspendido"   # suspensión disciplinaria temporal
    RETIRADO   = "retirado"     # desvinculado — estado terminal


# ── Worker ─────────────────────────────────────────────────────────────────────

class Worker(Base):
    """
    Persona/trabajador perteneciente a una empresa cliente.

    NO confundir con User (usuario del sistema).
    Un User es el técnico SST / admin que opera EUREKA.
    Un Worker es el trabajador de la empresa que se gestiona en EUREKA.

    Reglas de negocio:
    - Nunca se elimina físicamente si tiene historial SST.
    - Al retirar: status=RETIRADO + termination_date. Permanece en historial.
    - doc_type + doc_number es único por empresa (mismo trabajador puede estar
      en dos empresas distintas de la misma organización).
    - job_position_id = puesto ACTUAL (referencia rápida).
      El historial completo está en WorkerPositionHistory.
    """
    __tablename__ = "workers"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "doc_type", "doc_number",
            name="uq_worker_company_document",
        ),
    )

    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # ── Identificación ────────────────────────────────────────────────────────
    employee_code = Column(String(20), nullable=True)          # código interno RRHH
    doc_type      = Column(SAEnum(DocTypeEnum,   name="doc_type_enum"),   nullable=False)
    doc_number    = Column(String(20),  nullable=False)

    # ── Datos personales ──────────────────────────────────────────────────────
    first_name  = Column(String(100), nullable=False)
    last_name   = Column(String(100), nullable=False)
    birth_date  = Column(Date, nullable=True)                  # para vigilancia salud / IESS
    gender      = Column(SAEnum(GenderEnum,      name="gender_enum"),     nullable=True)
    phone       = Column(String(20),  nullable=True)
    email       = Column(String(120), nullable=True)           # distinto al User.email

    # ── Vínculo laboral ───────────────────────────────────────────────────────
    hire_date        = Column(Date, nullable=False)
    termination_date = Column(Date, nullable=True)             # null = activo
    contract_type    = Column(
        SAEnum(ContractTypeEnum, name="contract_type_enum"),
        nullable=True,
    )
    status    = Column(
        SAEnum(WorkerStatusEnum, name="worker_status_enum"),
        nullable=False, default=WorkerStatusEnum.ACTIVO,
    )
    is_active = Column(Boolean, nullable=False, default=True)  # alias para queries rápidas

    # ── Puesto actual (referencia rápida) ─────────────────────────────────────
    # El historial completo está en WorkerPositionHistory
    job_position_id = Column(
        Integer, ForeignKey("job_positions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # ── Discapacidad ──────────────────────────────────────────────────────────
    # A nivel de trabajador (distinto de JobPosition.has_disability que es del puesto)
    # Requerido por Ley Orgánica de Discapacidades — cuota 4% nómina
    disability_type = Column(String(100), nullable=True)       # tipo de discapacidad
    disability_pct  = Column(Integer,     nullable=True)       # % carné CONADIS

    # ── Campos complementarios ────────────────────────────────────────────────
    notes = Column(Text, nullable=True)                        # observaciones SST no clínicas

    # ── Auditoría ─────────────────────────────────────────────────────────────
    created_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    # ── Relaciones ────────────────────────────────────────────────────────────
    company      = relationship("Company")
    job_position = relationship("JobPosition")
    created_by   = relationship("User", foreign_keys=[created_by_id])
    position_history = relationship(
        "WorkerPositionHistory",
        back_populates="worker",
        cascade="all, delete-orphan",
        order_by="WorkerPositionHistory.start_date.desc()",
    )

    # Placeholder para relaciones futuras (se activarán en sus módulos)
    # epp_deliveries    → EppDelivery
    # training_records  → TrainingAttendance
    # health_exams      → HealthExam
    # accident_links    → AccidentWorker
    # permit_links      → WorkPermitWorker
    # paritario_memberships → ParitaryMember

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def age(self) -> int | None:
        if not self.birth_date:
            return None
        from datetime import date
        today = date.today()
        return (today - self.birth_date).days // 365

    def __repr__(self) -> str:
        return f"<Worker id={self.id} {self.full_name} company={self.company_id}>"


# ── WorkerPositionHistory ──────────────────────────────────────────────────────

class WorkerPositionHistory(Base):
    """
    Historial de puestos de trabajo de un trabajador.

    Permite determinar qué puesto tenía un trabajador en una fecha específica,
    lo cual es crítico para:
    - Relacionar accidentes con el puesto/riesgos del momento
    - Auditar EPP entregado según el puesto vigente
    - Validar que capacitaciones correspondían al puesto en ese período

    Regla: solo puede existir UN registro con end_date IS NULL por worker.
    El CRUD lo valida antes de crear un nuevo registro.
    """
    __tablename__ = "worker_position_history"

    id              = Column(Integer, primary_key=True, index=True)
    worker_id       = Column(
        Integer, ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    job_position_id = Column(
        Integer, ForeignKey("job_positions.id", ondelete="SET NULL"),
        nullable=True,
    )
    start_date = Column(Date, nullable=False)
    end_date   = Column(Date, nullable=True)   # null = asignación actual
    reason     = Column(String(200), nullable=True)  # "Promoción", "Restructuración", etc.
    notes      = Column(Text, nullable=True)

    created_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    worker       = relationship("Worker", back_populates="position_history")
    job_position = relationship("JobPosition")
    created_by   = relationship("User", foreign_keys=[created_by_id])