"""
Configuración de alertas de vencimiento documental.

Cada organización puede definir cuántos días ANTES del vencimiento
se envía la alerta al técnico asignado a la empresa.

Ejemplo: [30, 15, 7] → alertas 30, 15 y 7 días antes de due_date.

document_alert_logs registra qué alertas ya fueron enviadas para no
duplicar correos en cada ejecución del scheduler.
"""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DocumentAlertConfig(Base):
    """
    Configuración de alertas por organización.
    Una sola fila por organización (upsert).
    days_before: JSON-serialized list almacenado como String.
    Ej.: "30,15,7"
    """
    __tablename__ = "document_alert_configs"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    # Días antes del vencimiento separados por coma: "30,15,7"
    days_before     = Column(String(50), nullable=False, default="30,7")
    is_enabled      = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    organization = relationship("Organization")
    logs         = relationship("DocumentAlertLog", back_populates="config",
                                cascade="all, delete-orphan")

    @property
    def days_list(self) -> list[int]:
        """Retorna la lista de enteros de días."""
        try:
            return sorted(
                {int(d.strip()) for d in self.days_before.split(",") if d.strip().isdigit()},
                reverse=True,
            )
        except Exception:
            return [30, 7]


class DocumentAlertLog(Base):
    """
    Log de alertas enviadas. Evita reenviar el mismo correo en
    cada ejecución del scheduler.

    Una fila = una alerta enviada para un company_document_id + days_before.
    Se limpia automáticamente si el documento es actualizado (nueva carga).
    """
    __tablename__ = "document_alert_logs"
    __table_args__ = (
        UniqueConstraint(
            "company_document_id", "days_before",
            name="uq_alert_log_doc_days",
        ),
    )

    id                  = Column(Integer, primary_key=True, index=True)
    config_id           = Column(Integer, ForeignKey("document_alert_configs.id",
                                                      ondelete="CASCADE"),
                                 nullable=False, index=True)
    company_document_id = Column(Integer, ForeignKey("company_documents.id",
                                                      ondelete="CASCADE"),
                                 nullable=False, index=True)
    days_before         = Column(Integer, nullable=False)
    sent_to_email       = Column(String(200), nullable=True)
    sent_at             = Column(DateTime(timezone=True), server_default=func.now())

    config           = relationship("DocumentAlertConfig", back_populates="logs")
    company_document = relationship("CompanyDocument")