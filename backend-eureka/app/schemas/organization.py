from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.core.ecuador_validators import is_valid_cedula, is_valid_ruc
from app.models.organization import OrgTypeEnum


def _validate_optional_ruc_or_cedula(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if not v:
        return None
    if not v.isdigit() or len(v) not in (10, 13):
        raise ValueError("Debe ser una cédula (10 dígitos) o un RUC (13 dígitos) válidos")
    if len(v) == 10 and not is_valid_cedula(v):
        raise ValueError("La cédula no es válida")
    if len(v) == 13 and not is_valid_ruc(v):
        raise ValueError("El RUC no es válido")
    return v


class OrganizationBase(BaseModel):
    name: str
    org_type: OrgTypeEnum
    ruc: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True

    @field_validator("ruc")
    @classmethod
    def validate_ruc(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_ruc_or_cedula(v)


class OrganizationCreate(OrganizationBase):
    """
    Al crear una organización, el super-admin también proporciona los datos
    del administrador inicial que se creará automáticamente para ella.
    """
    admin_full_name: str
    admin_email: EmailStr
    admin_password: str

    @field_validator("admin_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    ruc: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("ruc")
    @classmethod
    def validate_ruc(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_ruc_or_cedula(v)


class OrganizationOut(OrganizationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationCreatedOut(BaseModel):
    """
    Respuesta al crear una organización: incluye la org + credenciales del
    admin inicial (solo se muestran una vez, el super-admin debe comunicarlas).
    """
    organization: OrganizationOut
    admin_email: str
    admin_password: str
    message: str = (
        "Organización creada. Guarda las credenciales del administrador — "
        "no se mostrarán nuevamente."
    )


class OrganizationMini(BaseModel):
    id: int
    name: str
    org_type: OrgTypeEnum

    class Config:
        from_attributes = True
