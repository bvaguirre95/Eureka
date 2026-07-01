from datetime import date

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

# Esquema base con campos comunes
class SequenceBase(BaseModel):
    name: str = Field(..., description="Nombre descriptivo de la secuencia", max_length=100)
    code: str = Field(..., description="Código técnico único para identificarla", max_length=50)
    prefix: Optional[str] = Field("", description="Prefijo de texto con o sin formatos de fecha (ej: FAC-%Y-)")
    suffix: Optional[str] = Field("", description="Sufijo de texto (ej: -LOG)")
    padding: int = Field(4, ge=1, le=10, description="Cantidad de ceros a rellenar a la izquierda")
    number_increment: int = Field(1, ge=1, description="Incremento por cada registro creado")
    number_next: int = Field(1, ge=1, description="Siguiente número correlativo global")
    use_date_range: bool = Field(False, description="Activar si la numeración se reinicia por periodos de tiempo")

# Esquema para recibir datos al CREAR una secuencia
class SequenceCreate(SequenceBase):
    pass  # Hereda todos los campos de SequenceBase

# Esquema para recibir datos al ACTUALIZAR una secuencia
class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    padding: Optional[int] = None
    number_next: Optional[int] = None

# Esquema para MOSTRAR los datos en las respuestas de la API
class SequenceResponse(SequenceBase):
    id: int

    # Configuración requerida en Pydantic v2 para leer modelos de SQLAlchemy
    model_config = ConfigDict(from_attributes=True)
class SequenceDateRangeOut(BaseModel):
    id: int
    sequence_id: int
    date_from: date
    date_to: date
    number_next: int

    model_config = ConfigDict(from_attributes=True)
class SequenceOut(SequenceBase):
    id: int
    ranges: List[SequenceDateRangeOut] = Field(default=[])

    model_config = ConfigDict(from_attributes=True)


class SequencePreview(BaseModel):
    code: str
    generated_value: str