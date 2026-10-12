"""
Schemas para documentos propios de empresa (CompanyCustomDocument + DocumentFile).
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.company_document import CustomDocStatusEnum, FileTypeEnum


# ── DocumentFile ──────────────────────────────────────────────────────────────

class DocumentFileOut(BaseModel):
    id:                int
    file_type:         FileTypeEnum
    original_filename: str
    file_size_kb:      Optional[int] = None
    version_label:     Optional[str] = None
    notes:             Optional[str] = None
    uploaded_by_name:  Optional[str] = None
    uploaded_at:       datetime

    model_config = {"from_attributes": True}


# ── CompanyCustomDocument ─────────────────────────────────────────────────────

class CustomDocumentCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    category:    Optional[str] = None
    status:      CustomDocStatusEnum = CustomDocStatusEnum.VIGENTE


class CustomDocumentUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    category:    Optional[str] = None
    status:      Optional[CustomDocStatusEnum] = None


class CustomDocumentOut(BaseModel):
    id:               int
    company_id:       int
    name:             str
    description:      Optional[str] = None
    category:         Optional[str] = None
    status:           CustomDocStatusEnum
    created_by_name:  Optional[str] = None
    created_at:       datetime
    updated_at:       datetime
    files:            List[DocumentFileOut] = []
    file_count:       int = 0
    has_principal:    bool = False

    model_config = {"from_attributes": True}


class CustomDocumentListItem(BaseModel):
    id:              int
    company_id:      int
    name:            str
    description:     Optional[str] = None
    category:        Optional[str] = None
    status:          CustomDocStatusEnum
    created_by_name: Optional[str] = None
    created_at:      datetime
    file_count:      int = 0
    has_principal:   bool = False

    model_config = {"from_attributes": True}
