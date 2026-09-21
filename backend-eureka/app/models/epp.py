"""
Módulo EPP — Equipos de Protección Personal y Ropa de Trabajo

Arquitectura:
  EppType     → tipos configurables por organización (casco, guantes, etc.)
  EppCatalog  → ítems específicos (marca, spec, vida útil)
  EppDelivery → entrega a un Worker (trazabilidad completa)
"""
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum as SAEnum,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class EppDeliveryStatusEnum(str, enum.Enum):
    ENTREGADO  = "entregado"
    DEVUELTO   = "devuelto"
    REPOSICION = "reposicion"


class EppType(Base):
    """
    Tipos de EPP configurables por organización.
    El admin define: Casco, Guantes, Botas, Arnés, Respirador, Overol...
    """
    __tablename__ = "epp_types"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name        = Column(String(150), nullable=False)
    description = Column(Text,        nullable=True)
    icon        = Column(String(50),  nullable=True)   # emoji o código icono
    group_name  = Column(String(100), nullable=True)   # "Protección cabeza", "Ropa trabajo"
    default_useful_life_months = Column(Integer, nullable=True)
    is_active   = Column(Boolean,     nullable=False, default=True)
    order       = Column(Integer,     nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    organization  = relationship("Organization")
    catalog_items = relationship("EppCatalog", back_populates="epp_type",
                                 cascade="all, delete-orphan")


class EppCatalog(Base):
    """
    Ítem específico del catálogo.
    Ejemplo: EppType="Casco" → EppCatalog="Casco 3M H-700 Clase E, vida útil 36m"
    """
    __tablename__ = "epp_catalog"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    epp_type_id = Column(
        Integer, ForeignKey("epp_types.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    name           = Column(String(150), nullable=False)
    code           = Column(String(30),  nullable=True)
    brand          = Column(String(100), nullable=True)
    model          = Column(String(100), nullable=True)
    technical_spec = Column(Text,        nullable=True)   # norma INEN, certificación
    useful_life_months = Column(Integer, nullable=True)   # sobreescribe el del tipo
    is_active      = Column(Boolean,     nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    organization = relationship("Organization")
    epp_type     = relationship("EppType", back_populates="catalog_items")
    deliveries   = relationship("EppDelivery", back_populates="epp_item")


class EppDelivery(Base):
    """
    Entrega de EPP a un trabajador. Genera el acta individual.
    Normativa: Decreto 2393 Art. 11 lit. c), Resolución CD-513.
    """
    __tablename__ = "epp_deliveries"

    id             = Column(Integer, primary_key=True, index=True)
    worker_id      = Column(
        Integer, ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    epp_catalog_id = Column(
        Integer, ForeignKey("epp_catalog.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    risk_control_id = Column(
        Integer, ForeignKey("risk_controls.id", ondelete="SET NULL"),
        nullable=True,
    )

    delivery_date = Column(Date, nullable=False)
    expiry_date   = Column(Date, nullable=True)
    quantity      = Column(Integer, nullable=False, default=1)
    size          = Column(String(20),  nullable=True)
    serial_number = Column(String(100), nullable=True)

    status = Column(
        SAEnum(EppDeliveryStatusEnum, name="epp_delivery_status_enum"),
        nullable=False, default=EppDeliveryStatusEnum.ENTREGADO,
    )
    return_date = Column(Date,  nullable=True)
    notes       = Column(Text,  nullable=True)

    delivered_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    worker       = relationship("Worker")
    epp_item     = relationship("EppCatalog", back_populates="deliveries")
    risk_control = relationship("RiskControl")
    delivered_by = relationship("User", foreign_keys=[delivered_by_id])
