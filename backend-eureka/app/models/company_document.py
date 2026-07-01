import enum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DocumentStatusEnum(str, enum.Enum):
    PENDIENTE = "pendiente"  # aplica, pero aún no se ha cargado nada
    CARGADO = "cargado"  # el técnico subió un archivo, pendiente de validación
    VALIDADO = "validado"  # la empresa (o admin) validó el documento
    RECHAZADO = "rechazado"  # la empresa rechazó el archivo cargado
    VENCIDO = "vencido"  # pasó la fecha límite sin estar validado


class CompanyDocument(Base):
    """
    Instancia concreta de un item del catálogo normativo para una empresa
    (y, si aplica, un período específico: mes, bimestre o año).

    `period_label` identifica el período:
      - None              -> documentos "unico"
      - "2026"            -> documentos "anual"
      - "2026-01".."2026-12" -> documentos "mensual"
      - "2026-B1".."2026-B6" -> documentos "bimestral"

    No se crea una fila para cada combinación posible de antemano (con
    miles de empresas sería insostenible); la fila solo existe una vez que
    hay actividad (carga de archivo o cambio de estado manual). Los
    períodos "pendientes" sin fila se calculan al vuelo en la capa CRUD.
    """

    __tablename__ = "company_documents"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "catalog_item_id", "period_label", name="uq_company_doc_period"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    catalog_item_id = Column(
        Integer, ForeignKey("document_catalog.id", ondelete="CASCADE"), nullable=False
    )

    period_label = Column(String(20), nullable=True)

    status = Column(
        SAEnum(DocumentStatusEnum, name="document_status_enum"),
        nullable=False,
        default=DocumentStatusEnum.PENDIENTE,
    )

    file_path = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)

    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=True)

    due_date = Column(DateTime(timezone=True), nullable=True)

    validated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    company = relationship("Company")
    catalog_item = relationship("DocumentCatalogItem")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    validated_by = relationship("User", foreign_keys=[validated_by_id])

    def __repr__(self) -> str:
        return (
            f"<CompanyDocument company_id={self.company_id} "
            f"catalog_item_id={self.catalog_item_id} period={self.period_label} "
            f"status={self.status}>"
        )
