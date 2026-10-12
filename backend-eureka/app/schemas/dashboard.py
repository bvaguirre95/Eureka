from typing import Optional

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    """
    Resumen para las tarjetas del dashboard. Algunos campos son None
    según el rol/alcance del usuario:

    - Super-admin de plataforma: organizations, companies, users (globales).
    - Usuario de organización: companies, users (de su org), documents_*
      (agregado de las empresas a las que tiene acceso).
    """

    organizations: Optional[int] = None
    companies: Optional[int] = None
    users: Optional[int] = None
    documents_total: Optional[int] = None
    documents_validated: Optional[int] = None
    documents_pending_review: Optional[int] = None
    compliance_percent: Optional[float] = None
