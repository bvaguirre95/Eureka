from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Company(Base):
    """
    Empresa cliente. Pertenece a una organización (tenant).
    """

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )

    ruc = Column(String(13), unique=True, index=True, nullable=False)
    razon_social = Column(String(200), nullable=False)
    nombre_comercial = Column(String(200), nullable=True)
    company_code = Column(String(20), nullable=True, index=True)  # "MET", "ABC" — usado en secuencias
    industria = Column(String(100), nullable=True)
    num_trabajadores = Column(Integer, nullable=False, default=0)

    direccion = Column(String(255), nullable=True)
    ciudad = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    email_contacto = Column(String(120), nullable=True)
    logo_path      = Column(String(500), nullable=True)
    descripcion    = Column(Text, nullable=True)   # texto libre sobre qué hace la empresa
    intro_inspeccion = Column(Text, nullable=True) # intro personalizada para informes PDF
    geritra_config   = Column(JSON, nullable=True)  # configuración GERITRA por empresa

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    show_on_website = Column(Boolean, default=False,nullable=True)
    organization = relationship("Organization", back_populates="companies")
    user_links = relationship(
        "UserCompany", back_populates="company", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Company id={self.id} ruc={self.ruc} org={self.organization_id}>"
class CompanySigners(Base):
    __tablename__ = "company_signers"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    elaborated_by   = Column(String(150), nullable=True)
    elaborated_role = Column(String(100), nullable=True)
    reviewed_by     = Column(String(150), nullable=True)
    reviewed_role   = Column(String(100), nullable=True)
    approved_by     = Column(String(150), nullable=True)
    approved_role   = Column(String(100), nullable=True)
    company = relationship("Company", backref="signers")