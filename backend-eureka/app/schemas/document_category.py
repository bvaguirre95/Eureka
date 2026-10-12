from typing import Optional

from pydantic import BaseModel


class DocumentCategoryBase(BaseModel):
    name: str
    is_active: bool = True


class DocumentCategoryCreate(DocumentCategoryBase):
    pass


class DocumentCategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class DocumentCategoryOut(DocumentCategoryBase):
    id: int
    is_global: bool
    organization_id: Optional[int] = None

    class Config:
        from_attributes = True
