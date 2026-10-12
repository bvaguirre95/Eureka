from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.schemas.permission import PermissionOut


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    # Si es True, este rol solo verá las empresas que tenga asignadas.
    is_company_scoped: bool = True


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_company_scoped: Optional[bool] = None
    permission_ids: Optional[List[int]] = None


class RoleOut(RoleBase):
    id: int
    is_system: bool
    created_at: datetime
    permissions: List[PermissionOut] = []

    class Config:
        from_attributes = True


class RoleMini(BaseModel):
    """Versión reducida del rol, para anidar dentro de UserOut."""

    id: int
    name: str
    is_company_scoped: bool
    is_system: bool
    permissions: List[str] = []  # solo los códigos, para el frontend

    class Config:
        from_attributes = True

    @field_validator("permissions", mode="before")
    @classmethod
    def extract_permission_codes(cls, v):
        if v and hasattr(next(iter(v)), "code"):
            return [p.code for p in v]
        return v