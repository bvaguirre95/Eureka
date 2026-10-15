"""Formatos de informe de inspección (secciones + diseño), versionados."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core import report_formats as cfg
from app.crud import company as crud_company
from app.crud import inspection as crud_insp
from app.crud import inspection_report_format as crud
from app.models.user import User
from app.schemas.inspection_report_format import (
    PreviewInspectionOut, ReportFormatCreate, ReportFormatOut, ReportFormatPreview, ReportFormatUpdate,
)

router = APIRouter(tags=["Formatos de informe"])


def _org_check(user: User, org_id: int):
    if not user.is_platform_admin and user.organization_id != org_id:
        raise HTTPException(403, "Sin acceso a esta organización")


@router.get("/report-formats/catalog")
def catalog(_: User = Depends(require_permission("inspections.view"))):
    """Tipos de sección, orígenes, placeholders y valores por defecto para el editor."""
    return {
        "section_kinds": sorted(cfg.SECTION_KINDS),
        "section_sources": sorted(cfg.SECTION_SOURCES),
        "placeholders": cfg.PLACEHOLDERS,
        "orientations": sorted(cfg.ORIENTATIONS),
        "signature_modes": sorted(cfg.SIGNATURE_MODES),
        "default_sections": cfg.default_sections(),
        "formulario_pdf_sections": cfg.formulario_pdf_sections(),
        "default_layout": cfg.default_layout(),
    }


@router.get("/organizations/{org_id}/report-formats", response_model=List[ReportFormatOut])
def list_formats(org_id: int, all_versions: bool = False, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("inspections.view"))):
    _org_check(user, org_id)
    return [crud.to_out(db, f) for f in crud.list_formats(db, org_id, all_versions)]


@router.post("/organizations/{org_id}/report-formats", response_model=ReportFormatOut, status_code=201)
def create_format(org_id: int, data: ReportFormatCreate, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("inspections.manage"))):
    _org_check(user, org_id)
    try:
        return crud.to_out(db, crud.create_format(db, org_id, user.id, data))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/organizations/{org_id}/report-formats/{format_id}", response_model=ReportFormatOut)
def update_format(org_id: int, format_id: int, data: ReportFormatUpdate, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("inspections.manage"))):
    _org_check(user, org_id)
    f = crud.get_format(db, format_id)
    if not f or f.organization_id != org_id:
        raise HTTPException(404, "Formato no encontrado")
    try:
        return crud.to_out(db, crud.update_format(db, f, data, user.id))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/organizations/{org_id}/report-formats/preview-inspections",
            response_model=List[PreviewInspectionOut])
def preview_inspections(org_id: int, inspection_type_id: int | None = None, db: Session = Depends(get_db),
                        user: User = Depends(require_permission("inspections.view"))):
    """Inspecciones recientes (opcionalmente de un tipo) para probar el formato en edición."""
    _org_check(user, org_id)
    rows = crud.preview_inspections(db, org_id, inspection_type_id)
    return [r for r in rows if crud_company.user_has_access_to_company(db, user, r["company_id"])]


@router.post("/organizations/{org_id}/report-formats/preview")
def preview_format(org_id: int, data: ReportFormatPreview, db: Session = Depends(get_db),
                   user: User = Depends(require_permission("inspections.manage"))):
    """PDF de una inspección real con el borrador del formato (sin guardarlo)."""
    _org_check(user, org_id)
    insp = crud_insp.get_inspection(db, data.inspection_id)
    company = crud_company.get_company(db, insp.company_id) if insp else None
    if not insp or not company or company.organization_id != org_id \
            or not crud_company.user_has_access_to_company(db, user, company.id):
        raise HTTPException(404, "Inspección no encontrada")
    try:
        fmt = crud.draft_format(data)
        from app.core.pdf_inspection import generate_inspection_pdf
        pdf = generate_inspection_pdf(insp, company, doc=data.doc, report_format=fmt)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": 'inline; filename="vista-previa.pdf"'})
