"""
Módulo de Gestión de Inspecciones SST.

Arquitectura:
- InspectionType: tipo configurable (Extintores, Baños, EPP...)
- InspectionTypeField: campos del formulario para ese tipo
  (scope: general = datos cabecera, matriz = columnas de la tabla)
- Inspection: instancia por empresa + período
- InspectionRecord: un registro por ítem inspeccionado (ej. cada extintor)
- InspectionFieldValue: valor de cada campo para ese registro
- CorrectiveAction: acción correctiva por hallazgo
"""
import enum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, JSON
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class FieldTypeEnum(str, enum.Enum):
    TEXTO       = "texto"
    NUMERO      = "numero"
    FECHA       = "fecha"
    SELECCION   = "seleccion"
    CHECK_SN    = "check_sn"
    CHECK_BM    = "check_bm"
    CHECK_SNA   = "check_sna"   # Sí / No / N/A  ← NUEVO
    UBICACION   = "ubicacion"
    OBSERVACION = "observacion"
    FOTO        = "foto"
    FIRMA       = "firma"       # ← NUEVO


class StructureTypeEnum(str, enum.Enum):
    """
    Define cómo se capturan los datos en la inspección.

    FORMULARIO      → campos simples, un único registro implícito (checklist)
    MATRIZ          → N filas/ítems sin datos generales (comportamiento actual)
    FORMULARIO_MATRIZ → datos generales + N filas (lo más común en campo)
    """
    FORMULARIO        = "formulario"
    MATRIZ            = "matriz"
    FORMULARIO_MATRIZ = "formulario_matriz"


class FieldScopeEnum(str, enum.Enum):
    """
    GENERAL → aparece en la sección de datos generales (solo para
              structure_type FORMULARIO o FORMULARIO_MATRIZ).
    MATRIZ  → aparece como columna en cada fila/registro de la tabla.
    """
    GENERAL = "general"
    MATRIZ  = "matriz"


class InspectionStatusEnum(str, enum.Enum):
    BORRADOR   = "borrador"
    EN_PROCESO = "en_proceso"
    COMPLETADA = "completada"
    CERRADA    = "cerrada"


class ActionStatusEnum(str, enum.Enum):
    PENDIENTE   = "pendiente"
    EN_PROGRESO = "en_progreso"
    COMPLETADA  = "completada"
    VENCIDA     = "vencida"


class InspectionType(Base):
    __tablename__ = "inspection_types"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name            = Column(String(150), nullable=False)
    description     = Column(String(500), nullable=True)
    icon            = Column(String(50), nullable=True)
    periodicity     = Column(String(20), nullable=True)
    is_active       = Column(Boolean, default=True, nullable=False)
    pdf_template    = Column(String(50), nullable=True, default="generico")
    type_code       = Column(String(50), nullable=True)

    # ── NUEVO Fase 1 ──────────────────────────────────────────────────────────
    structure_type  = Column(
        SAEnum(StructureTypeEnum, name="structure_type_enum"),
        nullable=False,
        default=StructureTypeEnum.MATRIZ,   # default = comportamiento actual
    )

    created_by_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by   = relationship("User")
    fields       = relationship(
        "InspectionTypeField", back_populates="inspection_type",
        cascade="all, delete-orphan", order_by="InspectionTypeField.order"
    )
    inspections  = relationship("Inspection", back_populates="inspection_type")

    def __repr__(self):
        return f"<InspectionType id={self.id} name={self.name} structure={self.structure_type}>"


class InspectionTypeField(Base):
    __tablename__ = "inspection_type_fields"

    id                 = Column(Integer, primary_key=True, index=True)
    inspection_type_id = Column(Integer, ForeignKey("inspection_types.id", ondelete="CASCADE"), nullable=False)
    name               = Column(String(150), nullable=False)
    field_key          = Column(String(50),  nullable=False)
    field_type         = Column(SAEnum(FieldTypeEnum, name="field_type_enum"), nullable=False)
    options            = Column(String(500), nullable=True)
    is_required        = Column(Boolean, default=False, nullable=False)
    order              = Column(Integer, default=0, nullable=False)
    group_name         = Column(String(100), nullable=True)

    # ── NUEVO Fase 1 ──────────────────────────────────────────────────────────
    scope = Column(
        SAEnum(FieldScopeEnum, name="field_scope_enum"),
        nullable=True,
        default=FieldScopeEnum.MATRIZ,   # default = comportamiento actual
    )

    inspection_type = relationship("InspectionType", back_populates="fields")

    def __repr__(self):
        return f"<InspectionTypeField key={self.field_key} type={self.field_type} scope={self.scope}>"


class Inspection(Base):
    __tablename__ = "inspections"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    inspection_type_id = Column(Integer, ForeignKey("inspection_types.id", ondelete="RESTRICT"), nullable=False)
    assigned_to_id     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_id      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    status             = Column(SAEnum(InspectionStatusEnum, name="inspection_status_enum"),
                                nullable=False, default=InspectionStatusEnum.BORRADOR)
    inspection_number  = Column(String(50), nullable=True)
    scheduled_date     = Column(DateTime(timezone=True), nullable=True)
    completed_date     = Column(DateTime(timezone=True), nullable=True)
    start_time         = Column(String(10), nullable=True)
    end_time           = Column(String(10), nullable=True)
    location           = Column(String(255), nullable=True)
    general_observations = Column(Text, nullable=True)
    recommendations    = Column(Text, nullable=True)

    # Firmantes del informe
    elaborated_by  = Column(String(150), nullable=True)
    reviewed_by    = Column(String(150), nullable=True)
    approved_by    = Column(String(150), nullable=True)
    elaborated_role = Column(String(100), nullable=True)
    reviewed_role  = Column(String(100), nullable=True)
    approved_role  = Column(String(100), nullable=True)

    # ── NUEVO Fase 1 ──────────────────────────────────────────────────────────
    # Valores de campos con scope=GENERAL (aplica a FORMULARIO y FORMULARIO_MATRIZ)
    # Estructura: { field_key: value, ... }
    general_data = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company         = relationship("Company")
    inspection_type = relationship("InspectionType", back_populates="inspections")
    assigned_to     = relationship("User", foreign_keys=[assigned_to_id])
    created_by      = relationship("User", foreign_keys=[created_by_id])
    records         = relationship("InspectionRecord", back_populates="inspection",
                                   cascade="all, delete-orphan", order_by="InspectionRecord.order")
    actions         = relationship("CorrectiveAction", back_populates="inspection",
                                   cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Inspection id={self.id} type={self.inspection_type_id} status={self.status}>"


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id            = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    order         = Column(Integer, default=0, nullable=False)
    has_finding   = Column(Boolean, default=False, nullable=False)
    photo_path    = Column(String(500), nullable=True)

    inspection = relationship("Inspection", back_populates="records")
    values     = relationship("InspectionFieldValue", back_populates="record",
                              cascade="all, delete-orphan")
    actions    = relationship("CorrectiveAction", back_populates="record")

    def __repr__(self):
        return f"<InspectionRecord id={self.id} insp={self.inspection_id} order={self.order}>"


class InspectionFieldValue(Base):
    """Valor de un campo de scope=MATRIZ para un registro específico."""
    __tablename__ = "inspection_field_values"

    id        = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("inspection_records.id", ondelete="CASCADE"), nullable=False)
    field_id  = Column(Integer, ForeignKey("inspection_type_fields.id", ondelete="CASCADE"), nullable=False)
    value     = Column(Text, nullable=True)

    record = relationship("InspectionRecord", back_populates="values")
    field  = relationship("InspectionTypeField")

    def __repr__(self):
        return f"<InspectionFieldValue field={self.field_id} val={self.value}>"


class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id             = Column(Integer, primary_key=True, index=True)
    inspection_id  = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    record_id      = Column(Integer, ForeignKey("inspection_records.id", ondelete="SET NULL"), nullable=True)
    responsible_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    item_ref         = Column(String(50),  nullable=True)
    description      = Column(Text, nullable=False)
    action           = Column(Text, nullable=True)
    priority         = Column(String(10),  nullable=True)
    due_date_start   = Column(DateTime(timezone=True), nullable=True)
    due_date_end     = Column(DateTime(timezone=True), nullable=True)
    status           = Column(SAEnum(ActionStatusEnum, name="action_status_enum"),
                              nullable=False, default=ActionStatusEnum.PENDIENTE)
    completion_notes = Column(Text, nullable=True)
    completed_at     = Column(DateTime(timezone=True), nullable=True)
    responsible_name = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    inspection  = relationship("Inspection", back_populates="actions")
    record      = relationship("InspectionRecord", back_populates="actions")
    responsible = relationship("User")

    def __repr__(self):
        return f"<CorrectiveAction id={self.id} item={self.item_ref} status={self.status}>"