from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserCompany(Base):
    """
    Relación muchos-a-muchos entre usuarios y empresas.

    - Para un usuario `tecnico_sst`: una fila por cada empresa que tiene
      asignada (puede tener varias).
    - Para un usuario `empresa`: normalmente una sola fila apuntando a
      su propia empresa.
    - Para `admin`/`supervisor`: no requieren filas aquí, ya que su acceso
      no se filtra por empresa.
    """

    __tablename__ = "user_companies"
    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_user_company"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="company_links")
    company = relationship("Company", back_populates="user_links")

    def __repr__(self) -> str:
        return f"<UserCompany user_id={self.user_id} company_id={self.company_id}>"
