from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "permission_id",
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Role(Base):
    """
    Rol dinámico. Pertenece a una organización (tenant).
    organization_id = NULL → roles de plataforma (super-admin).

    - is_company_scoped: si True, el usuario solo ve empresas asignadas.
    - is_system: protegido, no se puede eliminar ni renombrar.
    """

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )

    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_company_scoped = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="roles")
    permissions = relationship(
        "Permission", secondary=role_permissions, lazy="selectin", order_by="Permission.code"
    )
    users = relationship("User", back_populates="role")

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name} org={self.organization_id}>"
