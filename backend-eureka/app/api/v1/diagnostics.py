import io
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission
from app.core.anexo1_questions import SECTIONS
from app.crud import company as crud_company
from app.crud import diagnostic as crud_diag
from app.models.diagnostic import Diagnostic
from app.models.user import User
from app.schemas.diagnostic import (
    DiagnosticCreate,
    DiagnosticListItem,
    DiagnosticOut,
    DiagnosticUpdate,
)

router = APIRouter(prefix="/companies/{company_id}/diagnostics", tags=["Diagnóstico Anexo 1"])


def _get_company_or_404(db, company_id):
    c = crud_company.get_company(db, company_id)
    if not c:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return c


def _check_access(db, user, company_id):
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(status_code=403, detail="Sin acceso a esta empresa")


def _get_diag_or_404(db, diagnostic_id, company_id):
    d = crud_diag._load_diagnostic(db, diagnostic_id)
    if not d or d.company_id != company_id:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return d


@router.get("/", response_model=List[DiagnosticListItem])
def list_diagnostics(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    _get_company_or_404(db, company_id)
    return crud_diag.get_diagnostics_for_company(db, company_id)


@router.post("/", response_model=DiagnosticOut, status_code=status.HTTP_201_CREATED)
def create_diagnostic(
    company_id: int,
    diag_in: DiagnosticCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    _get_company_or_404(db, company_id)
    return crud_diag.create_diagnostic(db, company_id, diag_in, current_user.id)


@router.get("/{diagnostic_id}", response_model=DiagnosticOut)
def get_diagnostic(
    company_id: int,
    diagnostic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    _get_diag_or_404(db, diagnostic_id, company_id)
    result = crud_diag.get_diagnostic(db, diagnostic_id)
    if not result:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return result


@router.put("/{diagnostic_id}", response_model=DiagnosticOut)
def update_diagnostic(
    company_id: int,
    diagnostic_id: int,
    diag_in: DiagnosticUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.upload")),
):
    _check_access(db, current_user, company_id)
    diag = _get_diag_or_404(db, diagnostic_id, company_id)
    return crud_diag.update_diagnostic(db, diag, diag_in)


@router.delete("/{diagnostic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagnostic(
    company_id: int,
    diagnostic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.manage_catalog")),
):
    _check_access(db, current_user, company_id)
    diag = _get_diag_or_404(db, diagnostic_id, company_id)
    crud_diag.delete_diagnostic(db, diag)


@router.get("/{diagnostic_id}/pdf")
def download_pdf(
    company_id: int,
    diagnostic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents.view")),
):
    _check_access(db, current_user, company_id)
    _get_diag_or_404(db, diagnostic_id, company_id)
    diag_out = crud_diag.get_diagnostic(db, diagnostic_id)
    company = _get_company_or_404(db, company_id)

    from app.core.pdf_diagnostic import generate_diagnostic_pdf
    pdf_bytes = generate_diagnostic_pdf(diag_out, company)
    filename = f"diagnostico_anexo1_{diagnostic_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
