import enum

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class OrgTypeEnum(str, enum.Enum):
    CONSULTORA = "consultora"
    EMPRESA_DIRECTA = "empresa_directa"


class Organization(Base):
    """
    Tenant del sistema. Cada consultora o empresa directa que compra
    el servicio tiene su propia organización.

    - CONSULTORA: tiene N empresas (sus clientes), N técnicos, supervisores, etc.
    - EMPRESA_DIRECTA: tiene exactamente 1 empresa (la suya), misma lógica
      pero más simple.

    El super-admin de la plataforma (Eureka) tiene organization_id=NULL y
    puede ver/gestionar todas las organizaciones.
    """

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    org_type = Column(SAEnum(OrgTypeEnum, name="org_type_enum"), nullable=False)

    ruc = Column(String(13), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(20), nullable=True)
    city = Column(String(100), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    users = relationship("User", back_populates="organization")
    companies = relationship("Company", back_populates="organization")
    roles = relationship("Role", back_populates="organization")
    slug = Column(String(100), unique=True, nullable=True, index=True)
    catalog_items = relationship("DocumentCatalogItem", back_populates="organization")

    def __repr__(self) -> str:
        return f"<Organization id={self.id} name={self.name} type={self.org_type}>"
