"""
Formato de informe/documento para tipos de inspección.

Complementa (no reemplaza) lo existente:
  - Plantilla de captura  → InspectionType.structure_type + InspectionTypeField.scope
  - Plantilla de documento → document_kind (+ pdf_template si es especializada)
  - Diseño                 → layout (JSON)
  - Secciones del informe  → sections (JSON, ordenables/opcionales)

Versionado: cada fila es INMUTABLE una vez usada por una inspección.
Editar un formato en uso crea una nueva versión (misma org + code, version+1);
las inspecciones ya generadas siguen apuntando a su versión original.
organization_id = NULL → formato genérico global reutilizable (solo lectura).
"""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, JSON, String,
    Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

DOC_FORMULARIO_PDF        = "formulario_pdf"
DOC_INFORME_CONFIGURABLE  = "informe_configurable"
DOC_INFORME_PERSONALIZADO = "informe_personalizado"
DOCUMENT_KINDS = (DOC_FORMULARIO_PDF, DOC_INFORME_CONFIGURABLE, DOC_INFORME_PERSONALIZADO)


class InspectionReportFormat(Base):
    __tablename__ = "inspection_report_formats"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", "version",
                         name="uq_report_format_org_code_version"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=True)            # NULL = genérico global
    code            = Column(String(50), nullable=False)   # estable entre versiones
    version         = Column(Integer, nullable=False, default=1)
    name            = Column(String(150), nullable=False)
    description     = Column(Text, nullable=True)

    document_kind   = Column(String(30), nullable=False, default=DOC_INFORME_CONFIGURABLE)
    # Clave registrada en app.core.pdf_templates (ej. "eureka_extintores").
    # Solo aplica a informe_personalizado / formulario_pdf especializados.
    pdf_template    = Column(String(50), nullable=True)

    sections        = Column(JSON, nullable=False, default=list)
    layout          = Column(JSON, nullable=False, default=dict)

    is_active       = Column(Boolean, nullable=False, default=True)
    copied_from_id  = Column(Integer, ForeignKey("inspection_report_formats.id",
                             ondelete="SET NULL"), nullable=True)
    created_by_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(),
                             onupdate=func.now())

    organization = relationship("Organization")
    created_by   = relationship("User")

    def __repr__(self):
        return f"<InspectionReportFormat {self.code} v{self.version} kind={self.document_kind}>"
