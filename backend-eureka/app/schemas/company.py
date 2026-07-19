from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.core.ecuador_validators import is_valid_ruc


class CompanyBase(BaseModel):
    ruc: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    company_code: Optional[str] = None      # "MET", "ABC" — usado en secuencias
    industria: Optional[str] = None
    num_trabajadores: int = 0
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    telefono: Optional[str] = None
    email_contacto: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    descripcion: Optional[str] = None
    intro_inspeccion: Optional[str] = None
    geritra_config: Optional[dict] = None

    @field_validator("num_trabajadores")
    @classmethod
    def validate_num_trabajadores(cls, v: int) -> int:
        if v < 0:
            raise ValueError("El número de trabajadores no puede ser negativo")
        return v


class CompanyCreate(CompanyBase):
    @field_validator("ruc")
    @classmethod
    def validate_ruc(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 13:
            raise ValueError("El RUC debe tener exactamente 13 dígitos numéricos")
        if not is_valid_ruc(v):
            raise ValueError(
                "El RUC no es válido. Verifica el número (dígito verificador "
                "o código de provincia incorrectos)."
            )
        return v


class CompanyUpdate(BaseModel):
    razon_social: Optional[str] = None
    nombre_comercial: Optional[str] = None
    company_code: Optional[str] = None
    industria: Optional[str] = None
    num_trabajadores: Optional[int] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    telefono: Optional[str] = None
    email_contacto: Optional[EmailStr] = None
    descripcion: Optional[str] = None
    intro_inspeccion: Optional[str] = None
    geritra_config: Optional[dict] = None
    is_active: Optional[bool] = None


class CompanyOut(CompanyBase):
    id: int
    organization_id: int
    has_logo: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def _derive_has_logo(cls, obj):
        # Cuando viene un objeto ORM (Company), derivamos has_logo a partir
        # de logo_path sin exponer la ruta interna del archivo.
        if hasattr(obj, "logo_path") and not isinstance(obj, dict):
            try:
                obj.has_logo = bool(obj.logo_path)
            except Exception:
                pass
        return obj
class CompanySignersBase(BaseModel):
    elaborated_by:   Optional[str] = None
    elaborated_role: Optional[str] = None
    reviewed_by:     Optional[str] = None
    reviewed_role:   Optional[str] = None
    approved_by:     Optional[str] = None
    approved_role:   Optional[str] = None

class CompanySignersUpdate(CompanySignersBase):
    pass

class CompanySignersOut(CompanySignersBase):
    id: int
    company_id: int
    class Config:
        from_attributes = True