from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Al arrancar: sincroniza automáticamente el catálogo de permisos."""
    from app.core.sync_permissions import sync_permissions
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        sync_permissions(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para la plataforma de gestión de SST de Eureka",
    version="0.1.0",
    lifespan=lifespan,
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Archivos estáticos (imágenes para PDFs, logos genéricos, etc.)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
