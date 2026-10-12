"""Schemas del módulo EPP."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.epp import EppDeliveryStatusEnum


# ── EppType ────────────────────────────────────────────────────────────────────

class EppTypeCreate(BaseModel):
    name:        str            = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    icon:        Optional[str] = Field(None, max_length=50)
    group_name:  Optional[str] = Field(None, max_length=100)
    default_useful_life_months: Optional[int] = Field(None, ge=1, le=600)
    order:       int = 0


class EppTypeUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    icon:        Optional[str] = None
    group_name:  Optional[str] = None
    default_useful_life_months: Optional[int] = Field(None, ge=1, le=600)
    is_active:   Optional[bool] = None
    order:       Optional[int]  = None


class EppTypeOut(BaseModel):
    id:              int
    organization_id: int
    name:            str
    description:     Optional[str]
    icon:            Optional[str]
    group_name:      Optional[str]
    default_useful_life_months: Optional[int]
    is_active:       bool
    order:           int
    catalog_count:   int = 0   # cuántos ítems tiene este tipo

    model_config = {"from_attributes": True}


# ── EppCatalog ─────────────────────────────────────────────────────────────────

class EppCatalogCreate(BaseModel):
    epp_type_id:    int
    name:           str  = Field(..., min_length=1, max_length=150)
    code:           Optional[str] = Field(None, max_length=30)
    brand:          Optional[str] = Field(None, max_length=100)
    model:          Optional[str] = Field(None, max_length=100)
    technical_spec: Optional[str] = None
    useful_life_months: Optional[int] = Field(None, ge=1, le=600)


class EppCatalogUpdate(BaseModel):
    name:           Optional[str]  = Field(None, min_length=1, max_length=150)
    code:           Optional[str]  = None
    brand:          Optional[str]  = None
    model:          Optional[str]  = None
    technical_spec: Optional[str]  = None
    useful_life_months: Optional[int] = Field(None, ge=1, le=600)
    is_active:      Optional[bool] = None


class EppCatalogOut(BaseModel):
    id:              int
    organization_id: int
    epp_type_id:     int
    epp_type_name:   Optional[str] = None
    epp_type_icon:   Optional[str] = None
    name:            str
    code:            Optional[str]
    brand:           Optional[str]
    model:           Optional[str]
    technical_spec:  Optional[str]
    useful_life_months: Optional[int]
    effective_life_months: Optional[int] = None  # del tipo si no tiene el propio
    is_active:       bool

    model_config = {"from_attributes": True}


# ── EppDelivery ────────────────────────────────────────────────────────────────

class EppDeliveryCreate(BaseModel):
    epp_catalog_id:  int
    risk_control_id: Optional[int] = None
    delivery_date:   date
    expiry_date:     Optional[date] = None   # si None, se calcula desde useful_life_months
    quantity:        int  = Field(1, ge=1, le=100)
    size:            Optional[str] = Field(None, max_length=20)
    serial_number:   Optional[str] = Field(None, max_length=100)
    notes:           Optional[str] = None


class EppDeliveryUpdate(BaseModel):
    status:       Optional[EppDeliveryStatusEnum] = None
    return_date:  Optional[date] = None
    expiry_date:  Optional[date] = None
    notes:        Optional[str]  = None


class EppDeliveryOut(BaseModel):
    id:              int
    worker_id:       int
    worker_name:     Optional[str] = None
    worker_doc:      Optional[str] = None
    epp_catalog_id:  int
    epp_name:        Optional[str] = None
    epp_type_name:   Optional[str] = None
    epp_type_icon:   Optional[str] = None
    risk_control_id: Optional[int]
    delivery_date:   date
    expiry_date:     Optional[date]
    quantity:        int
    size:            Optional[str]
    serial_number:   Optional[str]
    status:          EppDeliveryStatusEnum
    return_date:     Optional[date]
    notes:           Optional[str]
    delivered_by_name: Optional[str] = None
    created_at:      Optional[datetime]

    model_config = {"from_attributes": True}


class EppDeliveryListItem(BaseModel):
    """Vista compacta para listas de entregas."""
    id:            int
    worker_id:     int
    worker_name:   Optional[str]
    epp_name:      Optional[str]
    epp_type_name: Optional[str]
    epp_type_icon: Optional[str]
    delivery_date: date
    expiry_date:   Optional[date]
    status:        EppDeliveryStatusEnum
    days_to_expiry: Optional[int] = None   # negativo = ya venció

    model_config = {"from_attributes": True}
