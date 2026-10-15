from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

DocumentKind = Literal["formulario_pdf", "informe_configurable", "informe_personalizado"]


class ReportFormatBase(BaseModel):
    name:          str
    description:   Optional[str] = None
    document_kind: DocumentKind = "informe_configurable"
    pdf_template:  Optional[str] = None
    sections:      List[Dict[str, Any]] = []
    layout:        Dict[str, Any] = {}


class ReportFormatCreate(ReportFormatBase):
    code:         Optional[str] = None       # se genera desde el nombre si falta
    copy_from_id: Optional[int] = None       # copiar sections/layout de otro formato


class ReportFormatUpdate(BaseModel):
    name:          Optional[str] = None
    description:   Optional[str] = None
    document_kind: Optional[DocumentKind] = None
    pdf_template:  Optional[str] = None
    sections:      Optional[List[Dict[str, Any]]] = None
    layout:        Optional[Dict[str, Any]] = None
    is_active:     Optional[bool] = None


class ReportFormatOut(ReportFormatBase):
    id:              int
    organization_id: Optional[int] = None
    code:            str
    version:         int
    is_active:       bool
    is_global:       bool = False
    in_use:          bool = False            # tiene inspecciones → editar crea nueva versión
    copied_from_id:  Optional[int] = None
    created_at:      Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportFormatPreview(BaseModel):
    """Borrador sin guardar para generar una vista previa con una inspección real."""
    inspection_id: int
    document_kind: DocumentKind = "informe_configurable"
    pdf_template:  Optional[str] = None
    sections:      List[Dict[str, Any]] = []
    layout:        Dict[str, Any] = {}
    doc:           Literal["ambos", "informe", "matriz"] = "ambos"


class PreviewInspectionOut(BaseModel):
    id: int
    company_id: int
    company_name: str
    inspection_number: Optional[str] = None
    inspection_type_id: int
    inspection_type_name: str
    scheduled_date: Optional[datetime] = None
