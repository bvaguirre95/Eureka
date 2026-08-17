import io
import os
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission, require_platform_admin
from app.core.config import settings
from app.crud import company as crud_company
from app.crud import inspection as crud_insp
from app.crud.sequence import get_sequence_def_by_code, create_sequence_def
from app.models.inspection import Inspection, InspectionRecord, CorrectiveAction, InspectionType
from app.models.user import User
from app.schemas.inspection import (
    CorrectiveActionCreate, CorrectiveActionOut, CorrectiveActionUpdate,
    InspectionCreate, InspectionDashboard, InspectionListItem,
    InspectionOut, InspectionRecordIn, InspectionTypeCreate,
    InspectionTypeOut, InspectionTypeUpdate, InspectionUpdate,
)
from app.schemas.sequence import SequenceDefCreate

router = APIRouter(tags=["Inspecciones"])


@router.get("/pdf-templates")
def list_pdf_templates(_: User = Depends(get_current_active_user)):
    """Lista los templates de PDF disponibles para los tipos de inspección."""
    from app.core.pdf_templates import AVAILABLE_TEMPLATES
    return AVAILABLE_TEMPLATES


def _check(db, user, company_id):
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(403, "Sin acceso a esta empresa")


def _get_company(db, company_id):
    c = crud_company.get_company(db, company_id)
    if not c:
        raise HTTPException(404, "Empresa no encontrada")
    return c


# ── Tipos de inspección (configuración, solo manage) ─────────────────────────

@router.get("/organizations/{org_id}/inspection-types", response_model=List[InspectionTypeOut])
def list_types(
    org_id: int,
    only_active: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    if not current_user.is_platform_admin and current_user.organization_id != org_id:
        raise HTTPException(403, "Sin acceso a esta organización")
    return crud_insp.get_inspection_types(db, org_id, only_active=only_active)


@router.post("/organizations/{org_id}/inspection-types",
             response_model=InspectionTypeOut, status_code=201)
def create_type(
    org_id: int, type_in: InspectionTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    if not current_user.is_platform_admin and current_user.organization_id != org_id:
        raise HTTPException(403, "Sin acceso a esta organización")
    return crud_insp.create_inspection_type(db, org_id, current_user.id, type_in)


@router.put("/organizations/{org_id}/inspection-types/{type_id}",
            response_model=InspectionTypeOut)
def update_type(
    org_id: int, type_id: int, type_in: InspectionTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    itype = crud_insp.get_inspection_type(db, type_id)
    if not itype or itype.organization_id != org_id:
        raise HTTPException(404, "Tipo no encontrado")
    return crud_insp.update_inspection_type(db, itype, type_in)


@router.delete("/organizations/{org_id}/inspection-types/{type_id}",
               response_model=InspectionTypeOut)
def deactivate_type(
    org_id: int, type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    itype = crud_insp.get_inspection_type(db, type_id)
    if not itype or itype.organization_id != org_id:
        raise HTTPException(404, "Tipo no encontrado")
    return crud_insp.deactivate_inspection_type(db, itype)


# ── Inspections por empresa ───────────────────────────────────────────────────

@router.get("/companies/{company_id}/inspections", response_model=List[InspectionListItem])
def list_inspections(
    company_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    _check(db, current_user, company_id)
    _get_company(db, company_id)
    return crud_insp.get_inspections_for_company(db, company_id)

@router.get("/companies/{company_id}/signers")
def get_signers(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.edit")),
):
    """
    Retorna los firmantes de la empresa.
    Si la empresa no tiene firmantes propios, hereda los de la organización.
    """
    _check(db, current_user, company_id)
    from app.models.company import Company
    from app.models.organization import Organization

    signers = crud_insp.get_company_signers(db, company_id)

    # Herencia: si no hay firmantes propios, usar los de la organización
    if not signers or not any([
        signers.elaborated_role, signers.reviewed_by, signers.approved_by
    ]):
        company = db.get(Company, company_id)
        if company and company.organization_id:
            org = db.get(Organization, company.organization_id)
            if org:
                return {
                    "id":              getattr(signers, "id", None),
                    "company_id":      company_id,
                    "elaborated_by":   None,
                    "elaborated_role": org.elaborated_role,
                    "reviewed_by":     org.reviewed_by,
                    "reviewed_role":   org.reviewed_role,
                    "approved_by":     org.approved_by,
                    "approved_role":   org.approved_role,
                    "inherited_from_org": True,
                }

    if not signers:
        return {"id": None, "company_id": company_id,
                "elaborated_by": None, "elaborated_role": None,
                "reviewed_by": None, "reviewed_role": None,
                "approved_by": None, "approved_role": None}
    from app.schemas.company import CompanySignersOut
    return CompanySignersOut.model_validate(signers)
@router.put("/companies/{company_id}/signers")
def update_signers(
    company_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("companies.edit")),
):
    _check(db, current_user, company_id)
    from app.schemas.company import CompanySignersOut
    allowed = {"elaborated_by","elaborated_role","reviewed_by",
               "reviewed_role","approved_by","approved_role"}
    data = {k: v for k, v in payload.items() if k in allowed}
    signers = crud_insp.upsert_company_signers(db, company_id, data)
    return CompanySignersOut.model_validate(signers)

@router.post("/companies/{company_id}/inspections",
             response_model=InspectionOut, status_code=201)
def create_inspection(
    company_id: int, insp_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    _get_company(db, company_id)
    itype = crud_insp.get_inspection_type(db, insp_in.inspection_type_id)
    if not itype or not itype.is_active:
        raise HTTPException(400, "Tipo de inspección no válido o inactivo")
    return crud_insp.create_inspection(db, company_id, current_user.id, insp_in)


@router.get("/companies/{company_id}/inspections/{inspection_id}",
            response_model=InspectionOut)
def get_inspection(
    company_id: int, inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    _check(db, current_user, company_id)
    result = crud_insp.get_inspection(db, inspection_id)
    if not result or result.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    return result


@router.put("/companies/{company_id}/inspections/{inspection_id}",
            response_model=InspectionOut)
def update_inspection(
    company_id: int, inspection_id: int, insp_in: InspectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    insp = db.get(Inspection, inspection_id)
    if not insp or insp.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    return crud_insp.update_inspection_meta(db, insp, insp_in)

@router.post("/companies/{company_id}/inspections/{inspection_id}/close",
             response_model=InspectionOut)
def close_inspection(
    company_id: int, inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    """Cierra una inspección completada solo si todas las acciones están resueltas."""
    _check(db, current_user, company_id)
    insp = db.get(Inspection, inspection_id)
    if not insp or insp.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    try:
        return crud_insp.try_close_inspection(db, insp)
    except ValueError as e:
        raise HTTPException(400, str(e))
@router.delete("/companies/{company_id}/inspections/{inspection_id}",
               status_code=204)
def delete_inspection(
    company_id: int, inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.delete")),
):
    _check(db, current_user, company_id)
    insp = db.get(Inspection, inspection_id)
    if not insp or insp.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    db.delete(insp)
    db.commit()


# ── Records ───────────────────────────────────────────────────────────────────

@router.post("/companies/{company_id}/inspections/{inspection_id}/records",
             response_model=InspectionOut)
def add_record(
    company_id: int, inspection_id: int, record_in: InspectionRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    insp = db.get(Inspection, inspection_id)
    if not insp or insp.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    return crud_insp.add_record(db, insp, record_in)


@router.put("/companies/{company_id}/inspections/{inspection_id}/records/{record_id}",
            response_model=InspectionOut)
def update_record(
    company_id: int, inspection_id: int, record_id: int,
    record_in: InspectionRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    record = db.get(InspectionRecord, record_id)
    if not record or record.inspection_id != inspection_id:
        raise HTTPException(404, "Registro no encontrado")
    return crud_insp.update_record(db, record, record_in)


@router.delete("/companies/{company_id}/inspections/{inspection_id}/records/{record_id}",
               response_model=InspectionOut)
def delete_record(
    company_id: int, inspection_id: int, record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    record = db.get(InspectionRecord, record_id)
    if not record or record.inspection_id != inspection_id:
        raise HTTPException(404, "Registro no encontrado")
    return crud_insp.delete_record(db, record)


@router.post("/companies/{company_id}/inspections/{inspection_id}/records/{record_id}/photo",
             response_model=InspectionOut)
async def upload_record_photo(
    company_id: int, inspection_id: int, record_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    """Sube o reemplaza la foto de un registro de inspección."""
    _check(db, current_user, company_id)
    record = db.get(InspectionRecord, record_id)
    if not record or record.inspection_id != inspection_id:
        raise HTTPException(404, "Registro no encontrado")

    allowed = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Extensión no permitida. Usa: {', '.join(sorted(allowed))}")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "La imagen supera el límite de 10 MB")

    # Eliminar foto anterior
    if record.photo_path and os.path.exists(record.photo_path):
        try: os.remove(record.photo_path)
        except OSError: pass

    import uuid
    dir_path = os.path.join(settings.UPLOAD_DIR, "inspections",
                            str(inspection_id), "records")
    os.makedirs(dir_path, exist_ok=True)
    path = os.path.join(dir_path, f"{record_id}_{uuid.uuid4().hex[:8]}{ext}")
    with open(path, "wb") as f:
        f.write(data)

    record.photo_path = path
    db.commit()
    return crud_insp.get_inspection(db, inspection_id)


@router.delete("/companies/{company_id}/inspections/{inspection_id}/records/{record_id}/photo",
               response_model=InspectionOut)
def delete_record_photo(
    company_id: int, inspection_id: int, record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    record = db.get(InspectionRecord, record_id)
    if not record or record.inspection_id != inspection_id:
        raise HTTPException(404, "Registro no encontrado")
    if record.photo_path and os.path.exists(record.photo_path):
        try: os.remove(record.photo_path)
        except OSError: pass
    record.photo_path = None
    db.commit()
    return crud_insp.get_inspection(db, inspection_id)


@router.get("/companies/{company_id}/inspections/{inspection_id}/records/{record_id}/photo")
def get_record_photo(
    company_id: int, inspection_id: int, record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    _check(db, current_user, company_id)
    record = db.get(InspectionRecord, record_id)
    if not record or record.inspection_id != inspection_id:
        raise HTTPException(404, "Registro no encontrado")
    if not record.photo_path or not os.path.exists(record.photo_path):
        raise HTTPException(404, "Sin foto")
    return FileResponse(path=record.photo_path)


# ── Corrective Actions ────────────────────────────────────────────────────────

@router.post("/companies/{company_id}/inspections/{inspection_id}/actions",
             response_model=CorrectiveActionOut, status_code=201)
def create_action(
    company_id: int, inspection_id: int, action_in: CorrectiveActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    return crud_insp.create_action(db, inspection_id, action_in)


@router.put("/companies/{company_id}/inspections/{inspection_id}/actions/{action_id}",
            response_model=CorrectiveActionOut)
def update_action(
    company_id: int, inspection_id: int, action_id: int,
    action_in: CorrectiveActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    action = db.get(CorrectiveAction, action_id)
    if not action or action.inspection_id != inspection_id:
        raise HTTPException(404, "Acción no encontrada")
    return crud_insp.update_action(db, action, action_in)


@router.delete("/companies/{company_id}/inspections/{inspection_id}/actions/{action_id}",
               status_code=204)
def delete_action(
    company_id: int, inspection_id: int, action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.create")),
):
    _check(db, current_user, company_id)
    action = db.get(CorrectiveAction, action_id)
    if not action:
        raise HTTPException(404, "Acción no encontrada")
    crud_insp.delete_action(db, action)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/inspections-dashboard",
            response_model=InspectionDashboard)
def dashboard(
    company_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    _check(db, current_user, company_id)
    _get_company(db, company_id)
    return crud_insp.get_dashboard(db, company_id)


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/inspections/{inspection_id}/pdf")
def download_pdf(
    company_id: int,
    inspection_id: int,
    doc: str = "ambos",   # "matriz" | "informe" | "ambos"
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    _check(db, current_user, company_id)
    insp_out = crud_insp.get_inspection(db, inspection_id)
    if not insp_out or insp_out.company_id != company_id:
        raise HTTPException(404, "Inspección no encontrada")
    company = _get_company(db, company_id)

    from app.core.pdf_inspection import generate_inspection_pdf
    itype = crud_insp.get_inspection_type(db, insp_out.inspection_type_id)
    template_key = getattr(itype, "pdf_template", None) or "generico"
    pdf_bytes = generate_inspection_pdf(insp_out, company,
                                        template_key=template_key, doc=doc)

    doc_label = {"matriz": "Matriz", "informe": "Informe"}.get(doc, "Inspeccion")
    tipo = insp_out.inspection_type_name.replace(" ", "_")
    nro  = insp_out.inspection_number or str(inspection_id)
    filename = f"{doc_label}_{tipo}_{nro}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Sincronización de SequenceDefs para tipos existentes ─────────────────────

@router.post("/inspection-types/sync-sequences", tags=["Secuencias"])
def sync_inspection_sequences(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    Crea automáticamente las SequenceDef faltantes para todos los tipos
    de inspección que tengan type_code pero no tengan su secuencia aún.

    Solo accesible por el super-admin de plataforma.
    Útil para migrar tipos creados antes de implementar el motor de secuencias.
    """
    tipos = db.execute(
        select(InspectionType).where(InspectionType.type_code.isnot(None))
    ).scalars().all()

    creados = []
    ya_existian = []

    for tipo in tipos:
        seq_code = f"insp_{tipo.organization_id}_{tipo.id}"
        if get_sequence_def_by_code(db, seq_code):
            ya_existian.append(seq_code)
            continue

        create_sequence_def(db, SequenceDefCreate(
            name=f"Inspecciones — {tipo.name}",
            code=seq_code,
            template=f"{{company_code}}-{tipo.type_code}-{{number:03}}",
            padding=3,
            increment=1,
            reset_policy="NEVER",
            description=f"Org {tipo.organization_id} · Tipo {tipo.name} (id={tipo.id})",
        ))
        creados.append({"code": seq_code, "type": tipo.name, "type_code": tipo.type_code})

    return {
        "creados": creados,
        "ya_existian": ya_existian,
        "total_tipos_con_code": len(tipos),
    }