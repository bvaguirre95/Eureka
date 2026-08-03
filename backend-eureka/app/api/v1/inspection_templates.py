"""
Endpoints para el sistema de plantillas de inspección.

Acceso:
  GET  /inspection-templates               → lista visible para la org del usuario
  GET  /inspection-templates/{id}          → detalle con fields_schema completo
  POST /inspection-templates               → crear plantilla propia de la org
  PUT  /inspection-templates/{id}          → editar plantilla propia
  DELETE /inspection-templates/{id}        → eliminar plantilla propia
  POST /inspection-templates/{id}/copy     → copiar plantilla global a la org
  POST /inspection-templates/{id}/use      → crear InspectionType desde plantilla

Super-admin:
  POST /inspection-templates/global        → crear plantilla global
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, require_permission, require_platform_admin
from app.crud import inspection_template as crud_tpl
from app.crud import inspection as crud_insp
from app.models.inspection_template import TemplateSourceEnum
from app.models.user import User
from app.schemas.inspection import InspectionTypeOut
from app.schemas.inspection_template import (
    CopyTemplateRequest,
    InspectionTemplateCreate,
    InspectionTemplateListItem,
    InspectionTemplateOut,
    InspectionTemplateUpdate,
    UseTemplateRequest,
)

router = APIRouter(tags=["Plantillas de inspección"])


def _get_org_id(current_user: User) -> int:
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El super-admin debe usar el endpoint /global para crear plantillas globales",
        )
    return current_user.organization_id


def _get_template_or_404(db: Session, template_id: int):
    t = crud_tpl.get_template(db, template_id)
    if not t or not t.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla no encontrada",
        )
    return t


def _check_ownership(template, org_id: int):
    """Verifica que la plantilla pertenece a la org (no es global ni de otra org)."""
    if template.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las plantillas globales no pueden ser modificadas por organizaciones",
        )
    if template.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta plantilla",
        )


# ── GET lista ─────────────────────────────────────────────────────────────────

@router.get("/inspection-templates", response_model=List[InspectionTemplateListItem])
def list_templates(
    only_active: bool = Query(default=True),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    """
    Lista plantillas visibles para la organización del usuario:
    globales (Eureka) + propias de la org.
    """
    org_id = _get_org_id(current_user)
    return crud_tpl.get_templates_for_org(db, org_id, only_active=only_active, category=category)


# ── GET detalle ───────────────────────────────────────────────────────────────

@router.get("/inspection-templates/{template_id}", response_model=InspectionTemplateOut)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.view")),
):
    org_id = _get_org_id(current_user)
    t = _get_template_or_404(db, template_id)

    # Verificar visibilidad: global o de la misma org
    if t.organization_id is not None and t.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes acceso a esta plantilla")

    return crud_tpl.get_template_out(db, template_id)


# ── POST crear propia ─────────────────────────────────────────────────────────

@router.post("/inspection-templates", response_model=InspectionTemplateOut,
             status_code=status.HTTP_201_CREATED)
def create_template(
    template_in: InspectionTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    org_id = _get_org_id(current_user)
    return crud_tpl.create_template(
        db, template_in,
        organization_id=org_id,
        user_id=current_user.id,
        source=TemplateSourceEnum.ORGANIZACION,
    )


# ── POST crear global (solo super-admin) ──────────────────────────────────────

@router.post("/inspection-templates/global", response_model=InspectionTemplateOut,
             status_code=status.HTTP_201_CREATED)
def create_global_template(
    template_in: InspectionTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    return crud_tpl.create_template(
        db, template_in,
        organization_id=None,   # global
        user_id=current_user.id,
        source=TemplateSourceEnum.GLOBAL,
    )


# ── PUT editar propia ─────────────────────────────────────────────────────────

@router.put("/inspection-templates/{template_id}", response_model=InspectionTemplateOut)
def update_template(
    template_id: int,
    template_in: InspectionTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    org_id = _get_org_id(current_user)
    t = _get_template_or_404(db, template_id)
    _check_ownership(t, org_id)
    return crud_tpl.update_template(db, t, template_in)


# ── DELETE eliminar propia ────────────────────────────────────────────────────

@router.delete("/inspection-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    org_id = _get_org_id(current_user)
    t = _get_template_or_404(db, template_id)
    _check_ownership(t, org_id)
    crud_tpl.delete_template(db, t)


# ── POST copiar plantilla → propia ────────────────────────────────────────────

@router.post("/inspection-templates/{template_id}/copy",
             response_model=InspectionTemplateOut, status_code=status.HTTP_201_CREATED)
def copy_template(
    template_id: int,
    payload: CopyTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    """
    Copia una plantilla (global o propia) a la organización del usuario.
    La copia es completamente editable.
    """
    org_id = _get_org_id(current_user)
    source = _get_template_or_404(db, template_id)

    # Si es de otra org (no global), bloquear
    if source.organization_id is not None and source.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes acceso a esta plantilla")

    return crud_tpl.copy_template(
        db, source,
        organization_id=org_id,
        user_id=current_user.id,
        new_name=payload.name,
    )


# ── POST usar plantilla → crear InspectionType ────────────────────────────────

@router.post("/inspection-templates/{template_id}/use",
             response_model=InspectionTypeOut, status_code=status.HTTP_200_OK)
def use_template(
    template_id: int,
    payload: UseTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    """
    Instancia la plantilla creando un InspectionType en la organización.
    Idempotente: si ya existe un tipo con el mismo nombre de esta plantilla,
    lo retorna sin duplicar (útil cuando se crea una inspección desde plantilla
    y el tipo ya fue instanciado previamente).
    """
    from app.schemas.inspection import InspectionTypeCreate, InspectionTypeFieldCreate
    from app.models.inspection import FieldScopeEnum, FieldTypeEnum, InspectionType
    from sqlalchemy import select as sa_select

    org_id = _get_org_id(current_user)
    t = _get_template_or_404(db, template_id)

    # Verificar visibilidad
    if t.organization_id is not None and t.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes acceso a esta plantilla")

    target_name = payload.name or t.name

    # ── Idempotencia: buscar tipo existente con mismo nombre en la org ────────
    existing = db.execute(
        sa_select(InspectionType).where(
            InspectionType.organization_id == org_id,
            InspectionType.name == target_name,
            InspectionType.is_active == True,
        )
    ).scalar_one_or_none()

    if existing:
        # Ya existe — retornar sin crear duplicado
        from app.crud.inspection import get_inspection_type_out
        return get_inspection_type_out(db, existing.id)

    # ── Construir campos desde fields_schema ──────────────────────────────────
    fields = []
    for f in (t.fields_schema or []):
        try:
            fields.append(InspectionTypeFieldCreate(
                name=f.get("name", ""),
                field_key=f.get("field_key", ""),
                field_type=FieldTypeEnum(f.get("field_type", "texto")),
                options=f.get("options"),
                is_required=f.get("is_required", False),
                order=f.get("order", 0),
                group_name=f.get("group_name"),
                scope=FieldScopeEnum(f.get("scope", "matriz")),
            ))
        except (ValueError, KeyError):
            continue

    type_in = InspectionTypeCreate(
        name=target_name,
        description=t.description,
        structure_type=payload.structure_type or t.structure_type,
        periodicity=payload.periodicity or t.suggested_periodicity,
        pdf_template=payload.pdf_template or t.suggested_pdf_template or "generico",
        type_code=payload.type_code,
        fields=fields,
    )

    result = crud_insp.create_inspection_type(db, org_id, current_user.id, type_in)
    crud_tpl.increment_usage(db, t)
    return result

# ── Importar desde Excel ──────────────────────────────────────────────────────

from fastapi import UploadFile, File as FastAPIFile

@router.post("/inspection-templates/import-excel/analyze",
             status_code=status.HTTP_200_OK)
async def analyze_excel(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    """
    Paso 1 de importación: analiza el Excel y retorna la estructura detectada.
    No guarda nada — solo retorna la propuesta para que el usuario la revise.
    """
    from app.core.excel_parser import parse_excel

    _get_org_id(current_user)   # validar que tiene org

    # Validar tipo de archivo
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se aceptan archivos .xlsx o .xls",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:  # 5 MB máximo
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo supera el límite de 5 MB",
        )

    try:
        result = parse_excel(file_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No se pudo leer el archivo: {str(exc)}",
        )

    return result


@router.post("/inspection-templates/import-excel/confirm",
             response_model=InspectionTemplateOut,
             status_code=status.HTTP_201_CREATED)
def confirm_excel_import(
    payload: InspectionTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections.manage")),
):
    """
    Paso 2 de importación: recibe la estructura revisada/corregida por el usuario
    y crea la plantilla definitivamente.
    """
    org_id = _get_org_id(current_user)
    return crud_tpl.create_template(
        db, payload,
        organization_id=org_id,
        user_id=current_user.id,
        source=TemplateSourceEnum.ORGANIZACION,
    )