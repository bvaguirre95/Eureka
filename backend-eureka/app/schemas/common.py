from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """
    Respuesta paginada genérica.

    `total` es el conteo total de registros que cumplen el filtro (no solo
    los de la página actual), necesario para construir la UI de paginación
    sin tener que traer todos los registros.
    """

    items: List[T]
    total: int
    skip: int
    limit: int
