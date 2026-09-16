from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.organization import OrganizationMini
from app.schemas.role import RoleMini


class CompanyMini(BaseModel):
    id: int
    ruc: str
    razon_social: str

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    role_id: int
    organization_id: Optional[int] = None 
    company_ids: List[int] = []

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    company_ids: Optional[List[int]] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserOut(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    role: RoleMini
    organization: Optional[OrganizationMini] = None
    companies: List[CompanyMini] = []

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
