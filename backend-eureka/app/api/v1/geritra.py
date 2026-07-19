"""API del módulo GERITRA — Gestión Técnica de Riesgos del Trabajo."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission
from app.crud import company as crud_company
from app.crud import geritra as crud
from app.models.geritra import (
    JobPosition, RiskAction, RiskCategory,
    RiskControl, RiskFactorCatalog, RiskMatrix, RiskMatrixRow,
)
from app.models.user import User
from app.schemas.geritra import (
    JobPositionCreate, JobPositionOut, JobPositionUpdate,
    RiskActionCreate, RiskActionOut, RiskActionUpdate,
    RiskCategoryCreate, RiskCategoryOut, RiskCategoryUpdate,
    RiskControlCreate, RiskControlOut,
    RiskFactorCreate, RiskFactorOut, RiskFactorUpdate,
    RiskMatrixCreate, RiskMatrixListItem, RiskMatrixOut, RiskMatrixUpdate,
    RiskMatrixRowCreate, RiskMatrixRowOut, RiskMatrixRowUpdate,
)

router = APIRouter( tags=["GERITRA"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check(db, user, company_id):
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(403, "Sin acceso a esta empresa")


def _org_id(user: User) -> int:
    if not user.organization_id:
        raise HTTPException(400, "El super-admin debe seleccionar una organización")
    return user.organization_id


# ── Categorías de riesgo ──────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/risk-categories",
            response_model=List[RiskCategoryOut])
def list_categories(
    org_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    cats = crud.get_categories(db, org_id)
    result = []
    for c in cats:
        out = RiskCategoryOut.model_validate(c)
        out.factor_count = len(c.factors)
        result.append(out)
    return result


@router.post("/organizations/{org_id}/risk-categories",
             response_model=RiskCategoryOut, status_code=201)
def create_category(
    org_id: int, data: RiskCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    cat = crud.create_category(db, org_id, data)
    out = RiskCategoryOut.model_validate(cat)
    out.factor_count = 0
    return out


@router.patch("/organizations/{org_id}/risk-categories/{cat_id}",
              response_model=RiskCategoryOut)
def update_category(
    org_id: int, cat_id: int, data: RiskCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    cat = db.get(RiskCategory, cat_id)
    if not cat or cat.organization_id != org_id:
        raise HTTPException(404, "Categoría no encontrada")
    cat = crud.update_category(db, cat, data)
    out = RiskCategoryOut.model_validate(cat)
    out.factor_count = len(cat.factors)
    return out


@router.delete("/organizations/{org_id}/risk-categories/{cat_id}",
               status_code=204)
def delete_category(
    org_id: int, cat_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    cat = db.get(RiskCategory, cat_id)
    if not cat or cat.organization_id != org_id:
        raise HTTPException(404, "Categoría no encontrada")
    crud.delete_category(db, cat)


# ── Catálogo de factores ──────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/risk-factors",
            response_model=List[RiskFactorOut])
def list_factors(
    org_id: int, category_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.view")),
):
    factors = crud.get_factors(db, org_id, category_id)
    result = []
    for f in factors:
        out = RiskFactorOut.model_validate(f)
        out.category_name = f.category.name if f.category else None
        result.append(out)
    return result


@router.post("/organizations/{org_id}/risk-factors",
             response_model=RiskFactorOut, status_code=201)
def create_factor(
    org_id: int, data: RiskFactorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    factor = crud.create_factor(db, org_id, data)
    out = RiskFactorOut.model_validate(factor)
    out.category_name = factor.category.name if factor.category else None
    return out


@router.patch("/organizations/{org_id}/risk-factors/{factor_id}",
              response_model=RiskFactorOut)
def update_factor(
    org_id: int, factor_id: int, data: RiskFactorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    factor = db.get(RiskFactorCatalog, factor_id)
    if not factor or factor.organization_id != org_id:
        raise HTTPException(404, "Factor no encontrado")
    factor = crud.update_factor(db, factor, data)
    out = RiskFactorOut.model_validate(factor)
    out.category_name = factor.category.name if factor.category else None
    return out


@router.delete("/organizations/{org_id}/risk-factors/{factor_id}",
               status_code=204)
def delete_factor(
    org_id: int, factor_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.manage")),
):
    factor = db.get(RiskFactorCatalog, factor_id)
    if not factor or factor.organization_id != org_id:
        raise HTTPException(404, "Factor no encontrado")
    crud.delete_factor(db, factor)


# ── Puestos de trabajo ────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/job-positions",
            response_model=List[JobPositionOut])
def list_positions(
    company_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.view")),
):
    _check(db, current_user, company_id)
    positions = crud.get_job_positions(db, company_id)
    result = []
    for p in positions:
        out = JobPositionOut.model_validate(p)
        out.matrix_count = len(p.matrices)
        result.append(out)
    return result


@router.post("/companies/{company_id}/job-positions",
             response_model=JobPositionOut, status_code=201)
def create_position(
    company_id: int, data: JobPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    company = crud_company.get_company(db, company_id)
    pos = crud.create_job_position(
        db, company_id, company.organization_id, data)
    out = JobPositionOut.model_validate(pos)
    out.matrix_count = 0
    return out


@router.patch("/companies/{company_id}/job-positions/{position_id}",
              response_model=JobPositionOut)
def update_position(
    company_id: int, position_id: int, data: JobPositionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    pos = db.get(JobPosition, position_id)
    if not pos or pos.company_id != company_id:
        raise HTTPException(404, "Puesto no encontrado")
    pos = crud.update_job_position(db, pos, data)
    out = JobPositionOut.model_validate(pos)
    out.matrix_count = len(pos.matrices)
    return out


@router.delete("/companies/{company_id}/job-positions/{position_id}",
               status_code=204)
def delete_position(
    company_id: int, position_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.delete")),
):
    _check(db, current_user, company_id)
    pos = db.get(JobPosition, position_id)
    if not pos or pos.company_id != company_id:
        raise HTTPException(404, "Puesto no encontrado")
    crud.delete_job_position(db, pos)


# ── Matrices GERITRA ──────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/risk-matrices",
            response_model=List[RiskMatrixListItem])
def list_matrices(
    company_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.view")),
):
    _check(db, current_user, company_id)
    return crud.get_matrices(db, company_id)


@router.post("/companies/{company_id}/job-positions/{position_id}/risk-matrices",
             response_model=RiskMatrixOut, status_code=201)
def create_matrix(
    company_id: int, position_id: int, data: RiskMatrixCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    pos = db.get(JobPosition, position_id)
    if not pos or pos.company_id != company_id:
        raise HTTPException(404, "Puesto no encontrado")
    return crud.create_matrix(
        db, position_id, company_id, pos.organization_id, data)


@router.get("/companies/{company_id}/risk-matrices/{matrix_id}",
            response_model=RiskMatrixOut)
def get_matrix(
    company_id: int, matrix_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.view")),
):
    _check(db, current_user, company_id)
    matrix = db.get(RiskMatrix, matrix_id)
    if not matrix or matrix.company_id != company_id:
        raise HTTPException(404, "Matriz no encontrada")
    return crud._matrix_to_out(matrix)


@router.patch("/companies/{company_id}/risk-matrices/{matrix_id}",
              response_model=RiskMatrixOut)
def update_matrix(
    company_id: int, matrix_id: int, data: RiskMatrixUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    matrix = db.get(RiskMatrix, matrix_id)
    if not matrix or matrix.company_id != company_id:
        raise HTTPException(404, "Matriz no encontrada")
    return crud.update_matrix(db, matrix, data)


@router.delete("/companies/{company_id}/risk-matrices/{matrix_id}",
               status_code=204)
def delete_matrix(
    company_id: int, matrix_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.delete")),
):
    _check(db, current_user, company_id)
    matrix = db.get(RiskMatrix, matrix_id)
    if not matrix or matrix.company_id != company_id:
        raise HTTPException(404, "Matriz no encontrada")
    crud.delete_matrix(db, matrix)


# ── Filas de riesgo ───────────────────────────────────────────────────────────

@router.post("/companies/{company_id}/risk-matrices/{matrix_id}/rows",
             response_model=RiskMatrixRowOut, status_code=201)
def add_row(
    company_id: int, matrix_id: int, data: RiskMatrixRowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    matrix = db.get(RiskMatrix, matrix_id)
    if not matrix or matrix.company_id != company_id:
        raise HTTPException(404, "Matriz no encontrada")
    return crud.add_row(db, matrix_id, data)


@router.patch("/companies/{company_id}/risk-matrices/{matrix_id}/rows/{row_id}",
              response_model=RiskMatrixRowOut)
def update_row(
    company_id: int, matrix_id: int, row_id: int,
    data: RiskMatrixRowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    row = db.get(RiskMatrixRow, row_id)
    if not row or row.matrix_id != matrix_id:
        raise HTTPException(404, "Fila no encontrada")
    return crud.update_row(db, row, data)


@router.delete("/companies/{company_id}/risk-matrices/{matrix_id}/rows/{row_id}",
               status_code=204)
def delete_row(
    company_id: int, matrix_id: int, row_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    row = db.get(RiskMatrixRow, row_id)
    if not row or row.matrix_id != matrix_id:
        raise HTTPException(404, "Fila no encontrada")
    crud.delete_row(db, row)


# ── Controles propuestos ──────────────────────────────────────────────────────

@router.post("/companies/{company_id}/risk-matrices/{matrix_id}/rows/{row_id}/controls",
             response_model=RiskControlOut, status_code=201)
def add_control(
    company_id: int, matrix_id: int, row_id: int,
    data: RiskControlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    row = db.get(RiskMatrixRow, row_id)
    if not row or row.matrix_id != matrix_id:
        raise HTTPException(404, "Fila no encontrada")
    ctrl = crud.add_control(db, row_id, data)
    return crud._ctrl_to_out(ctrl)


@router.delete(
    "/companies/{company_id}/risk-matrices/{matrix_id}/rows/{row_id}/controls/{ctrl_id}",
    status_code=204)
def delete_control(
    company_id: int, matrix_id: int, row_id: int, ctrl_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    ctrl = db.get(RiskControl, ctrl_id)
    if not ctrl or ctrl.row_id != row_id:
        raise HTTPException(404, "Control no encontrado")
    crud.delete_control(db, ctrl)


# ── Acciones correctivas ──────────────────────────────────────────────────────

@router.get("/companies/{company_id}/risk-matrices/{matrix_id}/actions",
            response_model=List[RiskActionOut])
def list_actions(
    company_id: int, matrix_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.view")),
):
    _check(db, current_user, company_id)
    actions = crud.get_actions(db, matrix_id)
    return [crud._action_to_out(a) for a in actions]


@router.patch(
    "/companies/{company_id}/risk-matrices/{matrix_id}/actions/{action_id}",
    response_model=RiskActionOut)
def update_action(
    company_id: int, matrix_id: int, action_id: int,
    data: RiskActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("risks.create")),
):
    _check(db, current_user, company_id)
    action = db.get(RiskAction, action_id)
    if not action or action.matrix_id != matrix_id:
        raise HTTPException(404, "Acción no encontrada")
    action = crud.update_action(db, action, data)
    return crud._action_to_out(action)