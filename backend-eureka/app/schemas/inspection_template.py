from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.inspection import FieldScopeEnum, FieldTypeEnum, StructureTypeEnum
from app.models.inspection_template import TemplateSourceEnum


# ── Field schema dentro de la plantilla ──────────────────────────────────────

class TemplateFieldSchema(BaseModel):
    name:        str
    field_key:   str
    field_type:  FieldTypeEnum
    options:     Optional[str] = None
    is_required: bool = False
    order:       int = 0
    group_name:  Optional[str] = None
    scope:       FieldScopeEnum = FieldScopeEnum.MATRIZ

    model_config = {"from_attributes": True}


# ── Create / Update ───────────────────────────────────────────────────────────

class InspectionTemplateCreate(BaseModel):
    name:                   str
    description:            Optional[str] = None
    category:               Optional[str] = None
    structure_type:         StructureTypeEnum = StructureTypeEnum.MATRIZ
    suggested_periodicity:  Optional[str] = None
    suggested_pdf_template: str = "generico"
    fields_schema:          List[Dict[str, Any]] = []
    is_active:              bool = True


class InspectionTemplateUpdate(BaseModel):
    name:                   Optional[str] = None
    description:            Optional[str] = None
    category:               Optional[str] = None
    structure_type:         Optional[StructureTypeEnum] = None
    suggested_periodicity:  Optional[str] = None
    suggested_pdf_template: Optional[str] = None
    fields_schema:          Optional[List[Dict[str, Any]]] = None
    is_active:              Optional[bool] = None


# ── Out ───────────────────────────────────────────────────────────────────────

class InspectionTemplateOut(BaseModel):
    id:                     int
    organization_id:        Optional[int] = None
    name:                   str
    description:            Optional[str] = None
    category:               Optional[str] = None
    structure_type:         StructureTypeEnum
    source:                 TemplateSourceEnum
    suggested_periodicity:  Optional[str] = None
    suggested_pdf_template: str = "generico"
    fields_schema:          List[Dict[str, Any]] = []
    is_active:              bool
    times_used:             int = 0
    copied_from_id:         Optional[int] = None
    created_by_id:          Optional[int] = None
    created_by_name:        Optional[str] = None
    created_at:             datetime
    field_count:            int = 0

    model_config = {"from_attributes": True}


class InspectionTemplateListItem(BaseModel):
    id:                     int
    organization_id:        Optional[int] = None
    name:                   str
    description:            Optional[str] = None
    category:               Optional[str] = None
    structure_type:         StructureTypeEnum
    source:                 TemplateSourceEnum
    suggested_periodicity:  Optional[str] = None
    is_active:              bool
    times_used:             int = 0
    field_count:            int = 0
    created_at:             datetime

    model_config = {"from_attributes": True}


# ── Usar plantilla → crear tipo de inspección ─────────────────────────────────

class UseTemplateRequest(BaseModel):
    """Parámetros para instanciar un InspectionType desde una plantilla."""
    name:           Optional[str] = None   # si None, usa el nombre de la plantilla
    type_code:      Optional[str] = None
    periodicity:    Optional[str] = None   # si None, usa suggested_periodicity
    pdf_template:   Optional[str] = None   # si None, usa suggested_pdf_template
    structure_type: Optional[StructureTypeEnum] = None  # si None, usa el de la plantilla


# ── Copiar plantilla global → privada ─────────────────────────────────────────

class CopyTemplateRequest(BaseModel):
    """Copia una plantilla global a la org del usuario para poder editarla."""
    name: Optional[str] = None   # si None, "Copia de <nombre original>"