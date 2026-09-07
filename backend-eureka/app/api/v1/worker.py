"""
API del módulo de Trabajadores.

Patrón de seguridad (igual que geritra.py):
  1. require_permission("workers.X") → valida permiso
  2. _check(db, user, company_id)    → valida acceso a la empresa
  3. CRUD filtra siempre por company_id
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_permission
from app.crud import company as crud_company
from app.crud import worker as crud
from app.models.user import User
from app.schemas.worker import (
    WorkerCreate, WorkerListItem, WorkerOut,
    WorkerPage, WorkerPositionAssign, WorkerPositionHistoryOut,
    WorkerStatusUpdate, WorkerUpdate,
)
from app.models.worker import WorkerStatusEnum

router = APIRouter(tags=["Trabajadores"])


def _check(db: Session, user: User, company_id: int) -> None:
    """Valida que el usuario tiene acceso a la empresa. Igual que en geritra."""
    if not crud_company.user_has_access_to_company(db, user, company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin acceso a esta empresa",
        )


# ── Listado y creación ─────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/workers", response_model=WorkerPage)
def list_workers(
    company_id: int,
    search:          Optional[str]             = Query(None),
    status_filter:   Optional[WorkerStatusEnum] = Query(None, alias="status"),
    department:      Optional[str]             = Query(None),
    job_position_id: Optional[int]             = Query(None),
    include_retired: bool                       = Query(False),
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.view")),
):
    _check(db, current_user, company_id)
    items, total = crud.list_workers(
        db, company_id,
        search=search,
        status=status_filter,
        department=department,
        job_position_id=job_position_id,
        include_retired=include_retired,
        skip=skip,
        limit=limit,
    )
    return WorkerPage(
        items=[crud._worker_to_list_item(w) for w in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/companies/{company_id}/workers",
             response_model=WorkerOut,
             status_code=status.HTTP_201_CREATED)
def create_worker(
    company_id: int,
    data: WorkerCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.create")),
):
    _check(db, current_user, company_id)
    try:
        worker = crud.create_worker(db, company_id, data, created_by=current_user)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return crud._worker_to_out(worker)


# ── Detalle, edición, estado ───────────────────────────────────────────────────

@router.get("/companies/{company_id}/workers/{worker_id}",
            response_model=WorkerOut)
def get_worker(
    company_id: int,
    worker_id:  int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.view")),
):
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    return crud._worker_to_out(worker)


@router.patch("/companies/{company_id}/workers/{worker_id}",
              response_model=WorkerOut)
def update_worker(
    company_id: int,
    worker_id:  int,
    data: WorkerUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.edit")),
):
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    worker = crud.update_worker(db, worker, data)
    return crud._worker_to_out(worker)


@router.patch("/companies/{company_id}/workers/{worker_id}/status",
              response_model=WorkerOut)
def change_status(
    company_id: int,
    worker_id:  int,
    data: WorkerStatusUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.deactivate")),
):
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    try:
        worker = crud.change_worker_status(db, worker, data, changed_by=current_user)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return crud._worker_to_out(worker)


# ── KPIs ───────────────────────────────────────────────────────────────────────

@router.get("/companies/{company_id}/workers-kpis")
def worker_kpis(
    company_id: int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.view")),
):
    _check(db, current_user, company_id)
    return crud.get_worker_kpis(db, company_id)


# ── Historial de puestos ───────────────────────────────────────────────────────

@router.get("/companies/{company_id}/workers/{worker_id}/positions",
            response_model=list[WorkerPositionHistoryOut])
def list_positions(
    company_id: int,
    worker_id:  int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.view")),
):
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    return [
        WorkerPositionHistoryOut(
            id=h.id,
            worker_id=h.worker_id,
            job_position_id=h.job_position_id,
            job_position_name=h.job_position.name if h.job_position else None,
            start_date=h.start_date,
            end_date=h.end_date,
            reason=h.reason,
            notes=h.notes,
            created_at=h.created_at,
        )
        for h in worker.position_history
    ]


@router.post("/companies/{company_id}/workers/{worker_id}/positions",
             response_model=WorkerPositionHistoryOut,
             status_code=status.HTTP_201_CREATED)
def assign_position(
    company_id: int,
    worker_id:  int,
    data: WorkerPositionAssign,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_permission("workers.edit")),
):
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    if worker.status == WorkerStatusEnum.RETIRADO:
        raise HTTPException(400, "No se puede cambiar el puesto de un trabajador retirado")
    try:
        history = crud.assign_position(db, worker, data, assigned_by=current_user)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return WorkerPositionHistoryOut(
        id=history.id,
        worker_id=history.worker_id,
        job_position_id=history.job_position_id,
        job_position_name=history.job_position.name if history.job_position else None,
        start_date=history.start_date,
        end_date=history.end_date,
        reason=history.reason,
        notes=history.notes,
        created_at=history.created_at,
    )


# ── Endpoints futuros (stub — retornan 501 hasta que se implementen los módulos)

@router.get("/companies/{company_id}/workers/{worker_id}/risks")
def worker_risks(company_id: int, worker_id: int,
                 db: Session = Depends(get_db),
                 current_user: User = Depends(require_permission("workers.view"))):
    """Riesgos del puesto actual del trabajador via GERITRA. Fase futura."""
    _check(db, current_user, company_id)
    worker = crud.get_worker(db, company_id, worker_id)
    if not worker:
        raise HTTPException(404, "Trabajador no encontrado")
    # Si tiene puesto, retornar link al módulo GERITRA
    if worker.job_position_id:
        return {
            "job_position_id": worker.job_position_id,
            "job_position_name": worker.job_position.name if worker.job_position else None,
            "message": "Consulta las matrices de riesgo de este puesto en el módulo GERITRA",
            "risks": [],  # se llenará cuando se implemente la integración
        }
    return {"job_position_id": None, "risks": [], "message": "Sin puesto asignado"}