from pydantic import BaseModel


class PermissionOut(BaseModel):
    id: int
    code: str
    module: str
    name: str
    description: str

    class Config:
        from_attributes = True
