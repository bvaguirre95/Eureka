"""
Gestión documental por empresa.

Dos tipos de documentos:
  1. CompanyDocument     — vinculado al catálogo normativo (SST obligatorio)
  2. CompanyCustomDocument — creado libremente por/para la empresa

Ambos comparten DocumentFile para múltiples archivos por documento.
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


# ── Enums ─────────────────────────────────────────────────────────────────────

class DocumentStatusEnum(str, enum.Enum):
    PENDIENTE  = "pendiente"   # aplica pero sin archivo
    CARGADO    = "cargado"     # técnico subió archivo, pendiente validación
    VALIDADO   = "validado"    # validado por supervisor/admin
    RECHAZADO  = "rechazado"   # rechazado, debe volver a subir
    VENCIDO    = "vencido"     # pasó la fecha límite


class CustomDocStatusEnum(str, enum.Enum):
    BORRADOR  = "borrador"    # en construcción
    VIGENTE   = "vigente"     # activo y disponible
    ARCHIVADO = "archivado"   # ya no vigente pero conservado


class FileTypeEnum(str, enum.Enum):
    PRINCIPAL = "principal"   # el archivo principal / versión actual
    VERSION   = "version"     # versión anterior (historial)
    ADJUNTO   = "adjunto"     # archivo complementario
    EVIDENCIA = "evidencia"   # foto o evidencia de cumplimiento


# ── CompanyDocument (normativo) ────────────────────────────────────────────────

class CompanyDocument(Base):
    """
    Instancia de un ítem del catálogo normativo para una empresa y período.
    Ahora soporta múltiples archivos via DocumentFile.
    Se mantiene file_path/original_filename por compatibilidad con código existente.
    """
    __tablename__ = "company_documents"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "catalog_item_id", "period_label",
            name="uq_company_doc_period"
        ),
    )

    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),
                             nullable=False)
    catalog_item_id = Column(Integer, ForeignKey("document_catalog.id", ondelete="CASCADE"),
                             nullable=False)
    period_label    = Column(String(20), nullable=True)

    status = Column(
        SAEnum(DocumentStatusEnum, name="document_status_enum"),
        nullable=False, default=DocumentStatusEnum.PENDIENTE,
    )

    # Archivo principal (compatibilidad — apunta al archivo más reciente)
    file_path         = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)

    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at    = Column(DateTime(timezone=True), nullable=True)
    due_date       = Column(DateTime(timezone=True), nullable=True)

    validated_by_id  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_at     = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())

    company      = relationship("Company")
    catalog_item = relationship("DocumentCatalogItem")
    uploaded_by  = relationship("User", foreign_keys=[uploaded_by_id])
    validated_by = relationship("User", foreign_keys=[validated_by_id])
    files        = relationship("DocumentFile",
                                foreign_keys="DocumentFile.company_document_id",
                                back_populates="company_document",
                                cascade="all, delete-orphan",
                                order_by="DocumentFile.uploaded_at.desc()")

    def __repr__(self):
        return (f"<CompanyDocument company={self.company_id} "
                f"item={self.catalog_item_id} period={self.period_label}>")


# ── CompanyCustomDocument (documentos propios de empresa) ──────────────────────

class CompanyCustomDocument(Base):
    """
    Documento creado libremente para una empresa específica.
    No está vinculado al catálogo normativo.
    Ejemplos: Rutas de evacuación, Reglamento interno, Actas de reunión SST.
    """
    __tablename__ = "company_custom_documents"

    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),
                         nullable=False)

    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category    = Column(String(100), nullable=True)   # "Emergencias", "RRHH", etc.

    status = Column(
        SAEnum(CustomDocStatusEnum, name="custom_doc_status_enum"),
        nullable=False, default=CustomDocStatusEnum.VIGENTE,
    )

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(),
                           onupdate=func.now())

    company    = relationship("Company")
    created_by = relationship("User", foreign_keys=[created_by_id])
    files      = relationship("DocumentFile",
                              foreign_keys="DocumentFile.custom_document_id",
                              back_populates="custom_document",
                              cascade="all, delete-orphan",
                              order_by="DocumentFile.uploaded_at.desc()")

    def __repr__(self):
        return f"<CompanyCustomDocument company={self.company_id} name={self.name}>"


# ── DocumentFile (archivos de ambos tipos) ─────────────────────────────────────

class DocumentFile(Base):
    """
    Archivo individual. Puede pertenecer a:
      - CompanyDocument      (normativo)  via company_document_id
      - CompanyCustomDocument (propio)    via custom_document_id
    Solo uno de los dos FK debe estar poblado.
    """
    __tablename__ = "document_files"

    id                   = Column(Integer, primary_key=True, index=True)
    company_document_id  = Column(Integer,
                                  ForeignKey("company_documents.id", ondelete="CASCADE"),
                                  nullable=True)
    custom_document_id   = Column(Integer,
                                  ForeignKey("company_custom_documents.id", ondelete="CASCADE"),
                                  nullable=True)

    file_path         = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size_kb      = Column(Integer, nullable=True)

    file_type = Column(
        SAEnum(FileTypeEnum, name="document_file_type_enum"),
        nullable=False, default=FileTypeEnum.PRINCIPAL,
    )
    version_label = Column(String(50), nullable=True)  # "v1", "v2", "Enero 2026"
    notes         = Column(String(500), nullable=True)  # descripción del adjunto

    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at    = Column(DateTime(timezone=True), server_default=func.now())

    company_document = relationship("CompanyDocument",
                                    foreign_keys=[company_document_id],
                                    back_populates="files")
    custom_document  = relationship("CompanyCustomDocument",
                                    foreign_keys=[custom_document_id],
                                    back_populates="files")
    uploaded_by      = relationship("User", foreign_keys=[uploaded_by_id])

    def __repr__(self):
        return (f"<DocumentFile id={self.id} type={self.file_type} "
                f"file={self.original_filename}>")
