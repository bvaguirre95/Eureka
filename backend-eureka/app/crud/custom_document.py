"""
CRUD para documentos propios de empresa (CompanyCustomDocument + DocumentFile).
"""
import os
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.company_document import (
    CompanyCustomDocument, CustomDocStatusEnum,
    DocumentFile, FileTypeEnum,
)
from app.schemas.custom_document import (
    CustomDocumentCreate, CustomDocumentOut,
    CustomDocumentListItem, CustomDocumentUpdate,
    DocumentFileOut,
)

UPLOAD_BASE = "uploads/custom_docs"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _file_out(f: DocumentFile) -> DocumentFileOut:
    return DocumentFileOut(
        id=f.id,
        file_type=f.file_type,
        original_filename=f.original_filename,
        file_size_kb=f.file_size_kb,
        version_label=f.version_label,
        notes=f.notes,
        uploaded_by_name=f.uploaded_by.full_name if f.uploaded_by else None,
        uploaded_at=f.uploaded_at,
    )


def _to_out(doc: CompanyCustomDocument) -> CustomDocumentOut:
    files_out   = [_file_out(f) for f in doc.files]
    has_main    = any(f.file_type == FileTypeEnum.PRINCIPAL for f in doc.files)
    return CustomDocumentOut(
        id=doc.id,
        company_id=doc.company_id,
        name=doc.name,
        description=doc.description,
        category=doc.category,
        status=doc.status,
        created_by_name=doc.created_by.full_name if doc.created_by else None,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        files=files_out,
        file_count=len(files_out),
        has_principal=has_main,
    )


def _to_list_item(doc: CompanyCustomDocument) -> CustomDocumentListItem:
    has_main = any(f.file_type == FileTypeEnum.PRINCIPAL for f in doc.files)
    return CustomDocumentListItem(
        id=doc.id,
        company_id=doc.company_id,
        name=doc.name,
        description=doc.description,
        category=doc.category,
        status=doc.status,
        created_by_name=doc.created_by.full_name if doc.created_by else None,
        created_at=doc.created_at,
        file_count=len(doc.files),
        has_principal=has_main,
    )


# ── Queries ───────────────────────────────────────────────────────────────────

def list_custom_documents(
    db: Session,
    company_id: int,
    category: Optional[str] = None,
    status: Optional[CustomDocStatusEnum] = None,
) -> List[CustomDocumentListItem]:
    q = db.query(CompanyCustomDocument).filter(
        CompanyCustomDocument.company_id == company_id
    )
    if category:
        q = q.filter(CompanyCustomDocument.category == category)
    if status:
        q = q.filter(CompanyCustomDocument.status == status)
    docs = q.order_by(CompanyCustomDocument.name).all()
    return [_to_list_item(d) for d in docs]


def get_custom_document(db: Session, doc_id: int) -> Optional[CompanyCustomDocument]:
    return db.get(CompanyCustomDocument, doc_id)


def get_custom_document_out(db: Session, doc_id: int) -> Optional[CustomDocumentOut]:
    doc = db.get(CompanyCustomDocument, doc_id)
    return _to_out(doc) if doc else None


# ── Mutaciones ────────────────────────────────────────────────────────────────

def create_custom_document(
    db: Session,
    company_id: int,
    user_id: int,
    data: CustomDocumentCreate,
) -> CustomDocumentOut:
    doc = CompanyCustomDocument(
        company_id=company_id,
        name=data.name.strip(),
        description=data.description,
        category=data.category,
        status=data.status,
        created_by_id=user_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


def update_custom_document(
    db: Session,
    doc: CompanyCustomDocument,
    data: CustomDocumentUpdate,
) -> CustomDocumentOut:
    for field in ["name", "description", "category", "status"]:
        v = getattr(data, field, None)
        if v is not None:
            setattr(doc, field, v)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


def delete_custom_document(db: Session, doc: CompanyCustomDocument) -> None:
    # Eliminar archivos físicos
    for f in doc.files:
        if f.file_path and os.path.exists(f.file_path):
            try: os.remove(f.file_path)
            except OSError: pass
    db.delete(doc)
    db.commit()


# ── Archivos ──────────────────────────────────────────────────────────────────

def upload_file_to_document(
    db: Session,
    doc: CompanyCustomDocument,
    filename: str,
    file_bytes: bytes,
    file_type: FileTypeEnum,
    user_id: int,
    version_label: Optional[str] = None,
    notes: Optional[str] = None,
) -> DocumentFileOut:
    """
    Sube un archivo al documento personalizado.
    Si file_type=PRINCIPAL, marca el anterior PRINCIPAL como VERSION.
    """
    # Si es principal, degradar el anterior
    if file_type == FileTypeEnum.PRINCIPAL:
        for f in doc.files:
            if f.file_type == FileTypeEnum.PRINCIPAL:
                f.file_type = FileTypeEnum.VERSION
                if not f.version_label:
                    f.version_label = f"v{len(doc.files)}"

    # Guardar el archivo
    os.makedirs(UPLOAD_BASE, exist_ok=True)
    safe_name  = filename.replace(" ", "_")
    ts         = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    saved_name = f"{doc.company_id}_{doc.id}_{ts}_{safe_name}"
    file_path  = os.path.join(UPLOAD_BASE, saved_name)
    with open(file_path, "wb") as fh:
        fh.write(file_bytes)

    file_obj = DocumentFile(
        custom_document_id=doc.id,
        file_path=file_path,
        original_filename=filename,
        file_size_kb=len(file_bytes) // 1024,
        file_type=file_type,
        version_label=version_label,
        notes=notes,
        uploaded_by_id=user_id,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(file_obj)
    db.commit()
    db.refresh(file_obj)
    return _file_out(file_obj)


def delete_file(db: Session, file_obj: DocumentFile) -> None:
    if file_obj.file_path and os.path.exists(file_obj.file_path):
        try: os.remove(file_obj.file_path)
        except OSError: pass
    db.delete(file_obj)
    db.commit()


def get_file(db: Session, file_id: int) -> Optional[DocumentFile]:
    return db.get(DocumentFile, file_id)
