"""
GERITRA — Gestión Técnica de Riesgos del Trabajo.

Índices según metodología oficial:
  IP  = Índice Personas Expuestas  (1=1-5 / 2=6-12 / 3=+12)
  ICE = Índice Procedimientos Existentes (1=satisfactorios / 2=parciales / 3=no existen)
  IC  = Índice Capacitación y Capacidades Humanas (1=entrenado / 2=parcial / 3=no entrenado)
  IE  = Índice Exposición al Riesgo (1=baja / 2=media / 3=alta)
  C   = Consecuencia/Severidad (1-4)

Fórmula:
  P  = IP + ICE + IC + IE   (4-12)
  ER = P × C                (4-48)

Clasificación:
  ER  4    → TRIVIAL
  ER  5-8  → TOLERABLE
  ER  9-16 → MODERADO
  ER 17-24 → IMPORTANTE
  ER 25-36 → INTOLERABLE
"""
import enum
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RiskLevel(str, enum.Enum):
    TRIVIAL      = "TRIVIAL"
    TOLERABLE    = "TOLERABLE"
    MODERADO     = "MODERADO"
    IMPORTANTE   = "IMPORTANTE"
    INTOLERABLE  = "INTOLERABLE"


class MatrixStatus(str, enum.Enum):
    BORRADOR  = "BORRADOR"
    ACTIVA    = "ACTIVA"
    REVISION  = "REVISION"
    ARCHIVADA = "ARCHIVADA"


class ControlType(str, enum.Enum):
    ELIMINACION    = "ELIMINACION"
    SUSTITUCION    = "SUSTITUCION"
    INGENIERIA     = "INGENIERIA"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    EPP            = "EPP"


class ActionStatus(str, enum.Enum):
    PENDIENTE   = "PENDIENTE"
    EN_PROGRESO = "EN_PROGRESO"
    COMPLETADA  = "COMPLETADA"
    VENCIDA     = "VENCIDA"


class RiskCategory(Base):
    __tablename__ = "risk_categories"
    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    name            = Column(String(100), nullable=False)
    color           = Column(String(20),  nullable=True)
    order           = Column(Integer,     nullable=False, default=0)
    is_active       = Column(Boolean,     nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_risk_category_org_name"),
    )
    factors = relationship("RiskFactorCatalog", back_populates="category",
                           cascade="all, delete-orphan")


class RiskFactorCatalog(Base):
    __tablename__ = "risk_factor_catalog"
    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    category_id     = Column(Integer, ForeignKey("risk_categories.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    name            = Column(String(200), nullable=False)
    effect          = Column(String(300), nullable=True)
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    category = relationship("RiskCategory", back_populates="factors")


class JobPosition(Base):
    __tablename__ = "job_positions"
    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    name                 = Column(String(150), nullable=False)
    area                 = Column(String(150), nullable=True)
    process              = Column(String(150), nullable=True)
    num_workers          = Column(Integer, nullable=False, default=1)
    # Campos adicionales GERITRA
    has_disability       = Column(Boolean, nullable=True)
    disability_pct       = Column(Integer, nullable=True)
    routine_activity     = Column(Text, nullable=True)
    non_routine_activity = Column(Text, nullable=True)
    machinery            = Column(Text, nullable=True)
    technical_aids       = Column(Text, nullable=True)
    description          = Column(Text, nullable=True)
    is_active            = Column(Boolean, nullable=False, default=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(),
                                  onupdate=func.now())
    matrices = relationship("RiskMatrix", back_populates="job_position",
                            cascade="all, delete-orphan")


class RiskMatrix(Base):
    __tablename__ = "risk_matrices"
    id              = Column(Integer, primary_key=True, index=True)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    version         = Column(Integer, nullable=False, default=1)
    status          = Column(SAEnum(MatrixStatus, name="matrix_status_enum"),
                             nullable=False, default=MatrixStatus.BORRADOR)
    elaborated_by   = Column(String(200), nullable=True)
    reviewed_by     = Column(String(200), nullable=True)
    approved_by     = Column(String(200), nullable=True)
    elaborated_role = Column(String(100), nullable=True)
    reviewed_role   = Column(String(100), nullable=True)
    approved_role   = Column(String(100), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(),
                             onupdate=func.now())
    job_position = relationship("JobPosition", back_populates="matrices")
    rows         = relationship("RiskMatrixRow", back_populates="matrix",
                                cascade="all, delete-orphan",
                                order_by="RiskMatrixRow.order")


class RiskMatrixRow(Base):
    """
    Una fila = un peligro evaluado.

    Evaluación inicial:
      IP  (1-3), ICE (1-3), IC (1-3), IE (1-3), C (1-4)
      P = IP + ICE + IC + IE  →  ER = P × C

    Riesgo residual (res_*): mismos índices pero post-control
    """
    __tablename__ = "risk_matrix_rows"
    id          = Column(Integer, primary_key=True, index=True)
    matrix_id   = Column(Integer, ForeignKey("risk_matrices.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    order       = Column(Integer, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey("risk_categories.id", ondelete="SET NULL"), nullable=True)
    factor_id   = Column(Integer, ForeignKey("risk_factor_catalog.id", ondelete="SET NULL"), nullable=True)
    peligro     = Column(String(300), nullable=False)
    efecto      = Column(String(300), nullable=True)
    # Evaluación inicial
    ip          = Column(Integer, nullable=True)
    ic          = Column(Integer, nullable=True)
    ice         = Column(Integer, nullable=True)
    ie          = Column(Integer, nullable=True)
    consecuencia    = Column(Integer, nullable=True)
    probabilidad    = Column(Integer, nullable=True)
    estimacion      = Column(Integer, nullable=True)
    nivel_riesgo    = Column(SAEnum(RiskLevel, name="risk_level_enum"), nullable=True)
    # Riesgo residual (post-control)
    res_ip          = Column(Integer, nullable=True)
    res_ic          = Column(Integer, nullable=True)
    res_ice         = Column(Integer, nullable=True)
    res_ie          = Column(Integer, nullable=True)
    res_consecuencia = Column(Integer, nullable=True)
    res_probabilidad = Column(Integer, nullable=True)
    res_estimacion   = Column(Integer, nullable=True)
    res_nivel_riesgo = Column(SAEnum(RiskLevel, name="risk_level_enum"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    matrix   = relationship("RiskMatrix", back_populates="rows")
    category = relationship("RiskCategory")
    factor   = relationship("RiskFactorCatalog")
    controls = relationship("RiskControl", back_populates="row", cascade="all, delete-orphan")
    actions  = relationship("RiskAction",  back_populates="row", cascade="all, delete-orphan")


class RiskControl(Base):
    __tablename__ = "risk_controls"
    id           = Column(Integer, primary_key=True, index=True)
    row_id       = Column(Integer, ForeignKey("risk_matrix_rows.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    control_type = Column(SAEnum(ControlType, name="control_type_enum"), nullable=False)
    description  = Column(Text, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    row = relationship("RiskMatrixRow", back_populates="controls")


class RiskAction(Base):
    __tablename__ = "risk_actions"
    id               = Column(Integer, primary_key=True, index=True)
    row_id           = Column(Integer, ForeignKey("risk_matrix_rows.id", ondelete="CASCADE"),
                              nullable=False, index=True)
    matrix_id        = Column(Integer, ForeignKey("risk_matrices.id", ondelete="CASCADE"),
                              nullable=False, index=True)
    description      = Column(Text, nullable=False)
    responsible_name = Column(String(200), nullable=True)
    due_date         = Column(DateTime(timezone=True), nullable=True)
    status           = Column(SAEnum(ActionStatus, name="risk_action_status_enum"),
                              nullable=False, default=ActionStatus.PENDIENTE)
    completion_notes = Column(Text, nullable=True)
    completed_at     = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    row = relationship("RiskMatrixRow", back_populates="actions")