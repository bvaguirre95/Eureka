"""
Endpoints para documentos propios de empresa.
Acceso por empresa — completamente aislado entre empresas.

GET    /companies/{company_id}/custom-documents
POST   /companies/{company_id}/custom-documents
GET    /companies/{company_id}/custom-documents/{doc_id}
PUT    /companies/{company_id}/custom-documents/{doc_id}
DELETE /companies/{company_id}/custom-documents/{doc_id}

POST   /companies/{company_id}/custom-documents/{doc_id}/files
GET    /companies/{company_id}/custom-documents/{doc_id}/files/{file_id}/download
DELETE /companies/{company_id}/custom-documents/{doc_id}/files/{file_id}
"""
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.crud import company as crud_company
from app.crud import custom_document as crud_doc
from app.models.company_document import CustomDocStatusEnum, FileTypeEnum
from app.models.user import User
from app.schemas.custom_document import (
    CustomDocumentCreate, CustomDocumentListItem,
    CustomDocumentOut, CustomDocumentUpdate, DocumentFileOut,
)

router = APIRouter(tags=["Documentos propios de empresa"])

ALLOWED_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx",
               ".jpg", ".jpeg", ".png", ".zip"}
MAX_SIZE    = 20 * 1024 * 1024   # 20 MB


def _check_access(db: Session, user: User, company_id: int):
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes acceso a esta empresa")


def _get_doc_or_404(db: Session, doc_id: int, company_id: int):
    doc = crud_doc.get_custom_document(db, doc_id)
    if not doc or doc.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Documento no encontrado")
    return doc


# ── CRUD documentos ───────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/custom-documents",
            response_model=List[CustomDocumentListItem])
def list_documents(
    company_id: int,
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    status_enum = CustomDocStatusEnum(status_filter) if status_filter else None
    return crud_doc.list_custom_documents(db, company_id,
                                          category=category, status=status_enum)


@router.get("/companies/{company_id}/custom-documents/{doc_id}",
            response_model=CustomDocumentOut)
def get_document(
    company_id: int, doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    out = crud_doc.get_custom_document_out(db, doc_id)
    if not out or out.company_id != company_id:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return out


@router.post("/companies/{company_id}/custom-documents",
             response_model=CustomDocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    company_id: int,
    data: CustomDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    return crud_doc.create_custom_document(db, company_id, current_user.id, data)


@router.put("/companies/{company_id}/custom-documents/{doc_id}",
            response_model=CustomDocumentOut)
def update_document(
    company_id: int, doc_id: int,
    data: CustomDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    doc = _get_doc_or_404(db, doc_id, company_id)
    return crud_doc.update_custom_document(db, doc, data)


@router.delete("/companies/{company_id}/custom-documents/{doc_id}",
               status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    company_id: int, doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    doc = _get_doc_or_404(db, doc_id, company_id)
    crud_doc.delete_custom_document(db, doc)


# ── Archivos ──────────────────────────────────────────────────────────────────

@router.post("/companies/{company_id}/custom-documents/{doc_id}/files",
             response_model=DocumentFileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    company_id: int,
    doc_id: int,
    file: UploadFile = File(...),
    file_type: str   = Form(default="principal"),
    version_label: Optional[str] = Form(default=None),
    notes: Optional[str]         = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    doc = _get_doc_or_404(db, doc_id, company_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400,
                            detail=f"Extensión no permitida. Usa: {', '.join(sorted(ALLOWED_EXT))}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera 20 MB")

    try:
        ft = FileTypeEnum(file_type)
    except ValueError:
        ft = FileTypeEnum.PRINCIPAL

    return crud_doc.upload_file_to_document(
        db, doc, file.filename, file_bytes, ft,
        current_user.id, version_label, notes,
    )


@router.get("/companies/{company_id}/custom-documents/{doc_id}/files/{file_id}/download")
def download_file(
    company_id: int, doc_id: int, file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    _get_doc_or_404(db, doc_id, company_id)

    f = crud_doc.get_file(db, file_id)
    if not f or f.custom_document_id != doc_id:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if not f.file_path or not os.path.exists(f.file_path):
        raise HTTPException(status_code=404, detail="Archivo físico no disponible")

    return FileResponse(path=f.file_path, filename=f.original_filename)


@router.delete("/companies/{company_id}/custom-documents/{doc_id}/files/{file_id}",
               status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    company_id: int, doc_id: int, file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    _get_doc_or_404(db, doc_id, company_id)

    f = crud_doc.get_file(db, file_id)
    if not f or f.custom_document_id != doc_id:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    crud_doc.delete_file(db, f)