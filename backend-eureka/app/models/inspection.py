"""
Módulo de Gestión de Inspecciones SST.

Arquitectura:
- InspectionType: tipo configurable (Extintores, Baños, EPP...)
- InspectionTypeField: campos del formulario para ese tipo
  (pueden ser texto, número, fecha, select, check_si_no)
- Inspection: instancia por empresa + período
- InspectionRecord: un registro por ítem inspeccionado (ej. cada extintor)
- InspectionFieldValue: valor de cada campo para ese registro
- CorrectiveAction: acción correctiva por hallazgo
"""
import enum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class FieldTypeEnum(str, enum.Enum):
    TEXTO       = "texto"        # campo de texto libre
    NUMERO      = "numero"       # número o capacidad
    FECHA       = "fecha"        # fecha de recarga, vencimiento, etc.
    SELECCION   = "seleccion"    # dropdown con opciones predefinidas
    CHECK_SN    = "check_sn"     # Si / No (columnas binarias como S/N del extintor)
    CHECK_BM    = "check_bm"     # Bueno / Malo (condiciones del extintor)
    UBICACION   = "ubicacion"    # campo de ubicación
    OBSERVACION = "observacion"  # texto largo de hallazgo/observación
    FOTO        = "foto"         # imagen capturada en campo (base64 o path)


class InspectionStatusEnum(str, enum.Enum):
    BORRADOR   = "borrador"    # creada sin iniciar
    EN_PROCESO = "en_proceso"  # técnico está registrando
    COMPLETADA = "completada"  # cerrada por técnico
    CERRADA    = "cerrada"     # validada por supervisor


class ActionStatusEnum(str, enum.Enum):
    PENDIENTE   = "pendiente"
    EN_PROGRESO = "en_progreso"
    COMPLETADA  = "completada"
    VENCIDA     = "vencida"


class InspectionType(Base):
    """
    Tipo de inspección configurable por organización.
    El Supervisor define el nombre y los campos del formulario.
    Solo roles con inspections.manage pueden crear/editar.
    """
    __tablename__ = "inspection_types"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name            = Column(String(150), nullable=False)       # "Extintores", "Baños", "EPP"
    description     = Column(String(500), nullable=True)
    icon            = Column(String(50), nullable=True)         # "fire-extinguisher" | "bath" etc.
    periodicity     = Column(String(20), nullable=True)         # "mensual" | "trimestral" | etc.
    is_active       = Column(Boolean, default=True, nullable=False)
    pdf_template    = Column(String(50), nullable=True, default="generico")
    # Valores: "generico" | "eureka_extintores" | "baños" | cualquier key futuro
    created_by_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by   = relationship("User")
    fields       = relationship("InspectionTypeField", back_populates="inspection_type",
                                cascade="all, delete-orphan", order_by="InspectionTypeField.order")
    inspections  = relationship("Inspection", back_populates="inspection_type")
    type_code   = Column(String(50), nullable=True)  # "extintores" | "baños" | "epp" | etc.


    def __repr__(self):
        return f"<InspectionType id={self.id} name={self.name}>"


class InspectionTypeField(Base):
    """
    Campo del formulario de un tipo de inspección.
    Ejemplo para Extintores:
      - N° Extintor (texto, requerido=True)
      - Tipo (seleccion: CO2|PQS|AGUA|ESPUMA)
      - Clase agente (seleccion: ABC|BC|D|K)
      - Capacidad (numero)
      - Fecha recarga (fecha)
      - Próxima recarga (fecha)
      - Ubicación (ubicacion)
      - Sello de garantía (check_sn)
      - Manómetro (check_bm)
      - Presión (check_bm)
      - Recipiente (check_bm)
      - Manija (check_bm)
      - Manguera (check_bm)
      - Pintura (check_bm)
      - Señalización/Demarcación (check_sn)
      - Observaciones (observacion)
    """
    __tablename__ = "inspection_type_fields"

    id                 = Column(Integer, primary_key=True, index=True)
    inspection_type_id = Column(Integer, ForeignKey("inspection_types.id", ondelete="CASCADE"), nullable=False)
    name               = Column(String(150), nullable=False)    # "Sello de garantía"
    field_key          = Column(String(50),  nullable=False)    # "sello_garantia" (slug)
    field_type         = Column(SAEnum(FieldTypeEnum, name="field_type_enum"), nullable=False)
    options            = Column(String(500), nullable=True)     # para seleccion: "CO2|PQS|AGUA"
    is_required        = Column(Boolean, default=False, nullable=False)
    order              = Column(Integer, default=0, nullable=False)
    group_name         = Column(String(100), nullable=True)     # "Condiciones del extintor"
    inspection_type = relationship("InspectionType", back_populates="fields")

    def __repr__(self):
        return f"<InspectionTypeField key={self.field_key} type={self.field_type}>"


class Inspection(Base):
    """
    Instancia de una inspección: tipo + empresa + período + responsable.
    Una inspección tiene N registros (uno por ítem, ej. un extintor).
    """
    __tablename__ = "inspections"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    inspection_type_id = Column(Integer, ForeignKey("inspection_types.id", ondelete="RESTRICT"), nullable=False)
    assigned_to_id     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_id      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    status             = Column(SAEnum(InspectionStatusEnum, name="inspection_status_enum"),
                                nullable=False, default=InspectionStatusEnum.BORRADOR)
    inspection_number  = Column(String(50), nullable=True)          # "N° 1"
    scheduled_date     = Column(DateTime(timezone=True), nullable=True)
    completed_date     = Column(DateTime(timezone=True), nullable=True)
    start_time         = Column(String(10), nullable=True)          # "10H00"
    end_time           = Column(String(10), nullable=True)          # "11H00"
    location           = Column(String(255), nullable=True)
    general_observations = Column(Text, nullable=True)
    recommendations    = Column(Text, nullable=True)

    # Firmantes del informe
    elaborated_by      = Column(String(150), nullable=True)
    reviewed_by        = Column(String(150), nullable=True)
    approved_by        = Column(String(150), nullable=True)
    elaborated_role    = Column(String(100), nullable=True)
    reviewed_role      = Column(String(100), nullable=True)
    approved_role      = Column(String(100), nullable=True)

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
    """
    Un ítem inspeccionado (ej. un extintor EXT-01).
    Contiene N valores de campos según la plantilla del tipo de inspección.
    """
    __tablename__ = "inspection_records"

    id            = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    order         = Column(Integer, default=0, nullable=False)  # ítem 1, 2, 3...
    has_finding   = Column(Boolean, default=False, nullable=False)  # True si tiene hallazgo
    photo_path    = Column(String(500), nullable=True)  # foto del ítem inspeccionado

    inspection = relationship("Inspection", back_populates="records")
    values     = relationship("InspectionFieldValue", back_populates="record",
                              cascade="all, delete-orphan")
    actions    = relationship("CorrectiveAction", back_populates="record")

    def __repr__(self):
        return f"<InspectionRecord id={self.id} insp={self.inspection_id} order={self.order}>"


class InspectionFieldValue(Base):
    """Valor de un campo para un registro específico."""
    __tablename__ = "inspection_field_values"

    id        = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("inspection_records.id", ondelete="CASCADE"), nullable=False)
    field_id  = Column(Integer, ForeignKey("inspection_type_fields.id", ondelete="CASCADE"), nullable=False)
    value     = Column(Text, nullable=True)  # siempre string; el frontend interpreta según field_type

    record = relationship("InspectionRecord", back_populates="values")
    field  = relationship("InspectionTypeField")

    def __repr__(self):
        return f"<InspectionFieldValue field={self.field_id} val={self.value}>"


class CorrectiveAction(Base):
    """
    Acción correctiva derivada de un hallazgo.
    Se puede crear manualmente o automáticamente al registrar un hallazgo.
    """
    __tablename__ = "corrective_actions"

    id             = Column(Integer, primary_key=True, index=True)
    inspection_id  = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    record_id      = Column(Integer, ForeignKey("inspection_records.id", ondelete="SET NULL"), nullable=True)
    responsible_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    item_ref       = Column(String(50),  nullable=True)  # "EXT-001"
    description    = Column(Text, nullable=False)
    action         = Column(Text, nullable=True)         # "Demarcar área 50x50"
    priority       = Column(String(10),  nullable=True)  # "A" | "B" | "C"
    due_date_start = Column(DateTime(timezone=True), nullable=True)
    due_date_end   = Column(DateTime(timezone=True), nullable=True)
    status         = Column(SAEnum(ActionStatusEnum, name="action_status_enum"),
                            nullable=False, default=ActionStatusEnum.PENDIENTE)
    completion_notes = Column(Text, nullable=True)
    completed_at   = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    inspection  = relationship("Inspection", back_populates="actions")
    record      = relationship("InspectionRecord", back_populates="actions")
    responsible = relationship("User")
    responsible_name = Column(String(200), nullable=True)


    def __repr__(self):
        return f"<CorrectiveAction id={self.id} item={self.item_ref} status={self.status}>"
