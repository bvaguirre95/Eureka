import enum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ResetPolicyEnum(str, enum.Enum):
    NEVER   = "NEVER"    # nunca reinicia  → scope: "global" | "company=1"
    YEARLY  = "YEARLY"   # reinicia en año → scope incluye year automáticamente
    MONTHLY = "MONTHLY"  # reinicia en mes → scope incluye year+month


class SequenceDef(Base):
    """
    Definición de una secuencia.  Solo contiene configuración; nunca estado.

    template soporta:
      {number}          → número con padding automático (padding define ancho)
      {number:05}       → padding explícito en la plantilla (tiene prioridad)
      {company}         → cualquier clave del context dict
      {inspection_type}
      {year}, {month}   → inyectados automáticamente por el motor si aparecen

    Ejemplos de template:
      "EMP-{number:05}"
      "FAC-{year}-{number:06}"
      "{company}-{inspection_type}-{number:03}"
      "OT-{branch}-{year}-{number:04}"
    """
    __tablename__ = "sequence_definitions"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(150), nullable=False)
    code        = Column(String(80),  nullable=False, unique=True, index=True)
    template    = Column(String(255), nullable=False)           # p. ej. "{company}-{number:03}"
    padding     = Column(Integer,     nullable=False, default=4) # ancho por defecto si {number} sin formato
    increment   = Column(Integer,     nullable=False, default=1)
    reset_policy = Column(
        SAEnum(ResetPolicyEnum, name="reset_policy_enum"),
        nullable=False,
        default=ResetPolicyEnum.NEVER,
    )
    is_active   = Column(Boolean,  nullable=False, default=True)
    description = Column(Text,     nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    counters = relationship(
        "SequenceCounter",
        back_populates="sequence_def",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<SequenceDef code={self.code!r} template={self.template!r}>"


class SequenceCounter(Base):
    """
    Contador por (secuencia, scope).

    Una fila por combinación única de secuencia + scope_key.
    Ejemplos de scope_key:
      "global"
      "company=1"
      "company=1|year=2026"
      "company=1|inspection_type=2"
      "company=1|inspection_type=2|year=2026"

    Concurrencia:
      El motor usa SELECT ... FOR UPDATE sobre esta fila antes de leer
      o crear el contador, de modo que dos transacciones simultáneas
      nunca pueden leer el mismo current_value.  PostgreSQL serializa
      el acceso a nivel de fila; no hay duplicados posibles.

    reset_at:
      Guarda el período activo ("2026" para yearly, "2026-07" para monthly).
      El motor compara este valor con el período actual; si difieren,
      reinicia current_value a 0 antes de incrementar.
    """
    __tablename__ = "sequence_counters"

    __table_args__ = (
        UniqueConstraint("sequence_def_id", "scope_key", name="uq_counter_def_scope"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    sequence_def_id = Column(
        Integer,
        ForeignKey("sequence_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope_key       = Column(String(500), nullable=False)   # clave canónica del scope
    current_value   = Column(Integer,     nullable=False, default=0)
    reset_at        = Column(String(10),  nullable=True)    # "2026" | "2026-07" | None
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sequence_def = relationship("SequenceDef", back_populates="counters")

    def __repr__(self) -> str:
        return (
            f"<SequenceCounter def={self.sequence_def_id} "
            f"scope={self.scope_key!r} val={self.current_value}>"
        )