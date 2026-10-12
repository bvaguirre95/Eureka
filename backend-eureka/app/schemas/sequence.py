"""
Schemas del Sequence Engine.

Siguen el mismo patrón Base / Create / Update / Out del resto del proyecto.
Se agregan schemas específicos para la API del motor:
  - SequenceNextRequest  → payload para generar el siguiente código
  - SequenceNextResponse → resultado con el código generado
  - SequencePreviewRequest → previsualizar sin consumir número
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.sequence import ResetPolicyEnum


# ── SequenceDef ───────────────────────────────────────────────────────────────

class SequenceDefBase(BaseModel):
    name:         str            = Field(..., min_length=1, max_length=150)
    code:         str            = Field(..., min_length=1, max_length=80)
    template:     str            = Field(..., min_length=1, max_length=255)
    padding:      int            = Field(4, ge=1, le=10)
    increment:    int            = Field(1, ge=1)
    reset_policy: ResetPolicyEnum = ResetPolicyEnum.NEVER
    is_active:    bool           = True
    description:  Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_lowercase(cls, v: str) -> str:
        """El code siempre se normaliza a snake_case sin espacios."""
        return v.strip().lower().replace(" ", "_")

    @field_validator("template")
    @classmethod
    def template_has_number(cls, v: str) -> str:
        """El template debe contener {number} o {number:Xd}."""
        if "{number" not in v:
            raise ValueError("El template debe contener {number} o {number:Xd}")
        return v.strip()


class SequenceDefCreate(SequenceDefBase):
    pass


class SequenceDefUpdate(BaseModel):
    name:         Optional[str]            = None
    template:     Optional[str]            = None
    padding:      Optional[int]            = Field(None, ge=1, le=10)
    increment:    Optional[int]            = Field(None, ge=1)
    reset_policy: Optional[ResetPolicyEnum] = None
    is_active:    Optional[bool]           = None
    description:  Optional[str]           = None

    @field_validator("template")
    @classmethod
    def template_has_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and "{number" not in v:
            raise ValueError("El template debe contener {number} o {number:Xd}")
        return v


class SequenceDefOut(SequenceDefBase):
    id:         int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SequenceDefMini(BaseModel):
    """Vista compacta para listas/selects."""
    id:       int
    name:     str
    code:     str
    template: str
    is_active: bool

    class Config:
        from_attributes = True


# ── SequenceCounter ───────────────────────────────────────────────────────────

class SequenceCounterOut(BaseModel):
    """Solo lectura — los contadores los gestiona el motor internamente."""
    id:              int
    sequence_def_id: int
    scope_key:       str
    current_value:   int
    reset_at:        Optional[str]
    updated_at:      datetime

    class Config:
        from_attributes = True


# ── Motor: generar siguiente código ──────────────────────────────────────────

class SequenceNextRequest(BaseModel):
    """
    Payload para llamar al motor y obtener el siguiente código.

    Ejemplo:
        {
            "code": "inspection",
            "context": {"company": "EMP", "inspection_type": "IEXT"},
            "scope":   {"company": 1, "inspection_type": 2}
        }
    """
    code:    str                  = Field(..., description="code de la SequenceDef")
    context: Dict[str, Any]       = Field(default_factory=dict,
                                          description="Variables para renderizar el template")
    scope:   Dict[str, Any]       = Field(default_factory=dict,
                                          description="Claves para identificar el contador")

    @field_validator("code")
    @classmethod
    def code_lowercase(cls, v: str) -> str:
        return v.strip().lower()


class SequenceNextResponse(BaseModel):
    """Respuesta del motor."""
    code:          str           # code de la secuencia usada
    generated:     str           # el código generado, p. ej. "EMP-IEXT-001"
    scope_key:     str           # scope canónico usado
    current_value: int           # número consumido


class SequencePreviewRequest(BaseModel):
    """
    Previsualizar cómo quedaría el próximo código SIN consumirlo.
    Útil para mostrar al usuario en la UI antes de crear una inspección.
    """
    code:    str            = Field(...)
    context: Dict[str, Any] = Field(default_factory=dict)
    scope:   Dict[str, Any] = Field(default_factory=dict)

    @field_validator("code")
    @classmethod
    def code_lowercase(cls, v: str) -> str:
        return v.strip().lower()


class SequencePreviewResponse(BaseModel):
    code:        str
    preview:     str   # número simulado, no consumido
    next_value:  int   # valor que se consumiría


# ── Respuesta lista con contadores ───────────────────────────────────────────

class SequenceDefWithCounters(SequenceDefOut):
    counters: List[SequenceCounterOut] = []