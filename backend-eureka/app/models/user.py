from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """
    Usuario del sistema. Pertenece a una organización (tenant).
    organization_id = NULL → super-admin de la plataforma (solo Eureka).
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="users")
    role = relationship("Role", back_populates="users", lazy="joined")

    company_links = relationship(
        "UserCompany", back_populates="user", cascade="all, delete-orphan"
    )
    companies = association_proxy("company_links", "company")

    @property
    def is_platform_admin(self) -> bool:
        """Super-admin de la plataforma: sin organización."""
        return self.organization_id is None

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} org={self.organization_id}>"
