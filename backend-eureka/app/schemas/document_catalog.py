from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.document_catalog import PeriodicityEnum


class DocumentCatalogBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: str
    periodicity: PeriodicityEnum = PeriodicityEnum.ANUAL
    min_workers: int = 0
    max_workers: Optional[int] = None
    is_active: bool = True

    @field_validator("min_workers")
    @classmethod
    def validate_min_workers(cls, v: int) -> int:
        if v < 0:
            raise ValueError("min_workers no puede ser negativo")
        return v

    @field_validator("max_workers")
    @classmethod
    def validate_max_workers(cls, v: Optional[int], info) -> Optional[int]:
        if v is None:
            return v
        if v < 0:
            raise ValueError("max_workers no puede ser negativo")
        min_workers = info.data.get("min_workers", 0)
        if v < min_workers:
            raise ValueError("max_workers no puede ser menor que min_workers")
        return v


class DocumentCatalogCreate(DocumentCatalogBase):
    pass


class DocumentCatalogUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    periodicity: Optional[PeriodicityEnum] = None
    min_workers: Optional[int] = None
    max_workers: Optional[int] = None
    is_active: Optional[bool] = None


class DocumentCatalogOut(DocumentCatalogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
