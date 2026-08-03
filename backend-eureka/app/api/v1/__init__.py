from fastapi import APIRouter

from app.api.v1 import (
    auth, companies, company_documents, dashboard,
    diagnostics, document_catalog, document_categories,
    inspections, organizations, permissions, roles, users,sequence,geritra,public,inspection_templates
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(users.router)
api_router.include_router(companies.router)
api_router.include_router(roles.router)
api_router.include_router(permissions.router)
api_router.include_router(document_catalog.router)
api_router.include_router(document_categories.router)
api_router.include_router(company_documents.router)
api_router.include_router(diagnostics.router)
api_router.include_router(sequence.router)
api_router.include_router(inspections.router)
api_router.include_router(dashboard.router)
api_router.include_router(geritra.router)
api_router.include_router(inspection_templates.router)
api_router.include_router(public.router)


