from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from app.database import Base


class DocumentCategory(Base):
    """
    Categorías para agrupar el catálogo normativo (ej. "Gestión de SST",
    "Comité Paritario"). Mismo patrón que DocumentCatalogItem:

    - is_global=True, organization_id=NULL -> categorías de plataforma,
      visibles para todas las organizaciones.
    - is_global=False, organization_id=X   -> categorías propias de la
      organización X, visibles solo para ella.
    """

    __tablename__ = "document_categories"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    is_global = Column(Boolean, default=True, nullable=False)

    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<DocumentCategory name={self.name} global={self.is_global}>"
