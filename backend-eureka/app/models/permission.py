from sqlalchemy import Column, Integer, String

from app.database import Base


class Permission(Base):
    """
    Catálogo de permisos granulares del sistema.

    `code` es el identificador estable usado en el backend (require_permission)
    y en el frontend (para mostrar/ocultar menús y acciones). Convención:
    "<modulo>.<accion>", ej: "companies.create", "documents.validate".

    El catálogo se siembra vía seed y se amplía a medida que se agregan
    módulos nuevos (cada módulo nuevo simplemente agrega sus propios códigos).
    """

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, index=True, nullable=False)
    module = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<Permission code={self.code}>"
