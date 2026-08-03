"""
Sistema de plantillas reutilizables para tipos de inspección.

Jerarquía:
  - GLOBAL (organization_id=NULL): creadas por el super-admin de Eureka,
    visibles para todas las organizaciones, nunca modificables por empresas.
  - ORGANIZACION (organization_id=N): creadas o copiadas por una org,
    visibles solo para ella.

Una plantilla NO es un InspectionType — es una definición reutilizable
desde la cual se pueden instanciar tipos de inspección.
"""
import enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.inspection import StructureTypeEnum


class TemplateSourceEnum(str, enum.Enum):
    GLOBAL       = "global"        # creada por Eureka, solo lectura para orgs
    ORGANIZACION = "organizacion"  # creada/copiada por una org


class InspectionTemplate(Base):
    """
    Plantilla reutilizable de tipo de inspección.
    Puede ser global (Eureka) o privada de una organización.
    """
    __tablename__ = "inspection_templates"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"),
                             nullable=True)   # NULL = plantilla global

    name            = Column(String(150), nullable=False)
    description     = Column(Text, nullable=True)
    category        = Column(String(100), nullable=True)   # "Equipos de emergencia", "EPP"...
    structure_type  = Column(SAEnum(StructureTypeEnum, name="structure_type_enum"),
                             nullable=False, default=StructureTypeEnum.MATRIZ)
    source          = Column(SAEnum(TemplateSourceEnum, name="template_source_enum"),
                             nullable=False, default=TemplateSourceEnum.ORGANIZACION)

    # Configuración sugerida (puede ser sobreescrita al instanciar)
    suggested_periodicity = Column(String(20), nullable=True)
    suggested_pdf_template = Column(String(50), nullable=True, default="generico")

    # Campos definidos como JSON — misma estructura que InspectionTypeField
    # [{ name, field_key, field_type, options, is_required, order, group_name, scope }]
    fields_schema   = Column(JSON, nullable=False, default=list)

    # Metadatos
    is_active       = Column(Boolean, default=True, nullable=False)
    times_used      = Column(Integer, default=0, nullable=False)  # contador de uso
    copied_from_id  = Column(Integer, ForeignKey("inspection_templates.id",
                             ondelete="SET NULL"), nullable=True)

    created_by_id   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(),
                             onupdate=func.now())

    organization = relationship("Organization")
    created_by   = relationship("User")
    copied_from  = relationship("InspectionTemplate", remote_side="InspectionTemplate.id")

    def __repr__(self):
        scope = "GLOBAL" if self.organization_id is None else f"ORG:{self.organization_id}"
        return f"<InspectionTemplate id={self.id} name={self.name} [{scope}]>"