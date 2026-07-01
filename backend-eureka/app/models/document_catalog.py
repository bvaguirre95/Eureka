import enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PeriodicityEnum(str, enum.Enum):
    UNICO = "unico"
    ANUAL = "anual"
    MENSUAL = "mensual"
    BIMESTRAL = "bimestral"


class DocumentCatalogItem(Base):
    """
    Catálogo de documentos SST.

    - is_global=True, organization_id=NULL  → catálogo de plataforma
      (normativa ecuatoriana, aplica a TODAS las empresas de TODAS las orgs).
      Solo editable por el super-admin de la plataforma.

    - is_global=False, organization_id=X   → catálogo propio de la org X
      (plantillas/checklists internos de esa consultora o empresa directa).
      Editable por el admin de esa organización.

    La matriz de cada empresa = items globales aplicables + items propios
    de su organización aplicables (filtrados ambos por num_trabajadores).
    """

    __tablename__ = "document_catalog"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    is_global = Column(Boolean, default=True, nullable=False)

    code = Column(String(20), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), nullable=False)

    periodicity = Column(
        SAEnum(PeriodicityEnum, name="periodicity_enum"),
        nullable=False,
        default=PeriodicityEnum.ANUAL,
    )

    min_workers = Column(Integer, nullable=False, default=0)
    max_workers = Column(Integer, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="catalog_items")

    def __repr__(self) -> str:
        return f"<DocumentCatalogItem code={self.code} global={self.is_global}>"
