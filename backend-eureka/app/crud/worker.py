"""
CRUD del módulo de Trabajadores.

Toda función recibe db + company_id explícito para garantizar
el aislamiento multi-tenant. El endpoint ya validó el acceso.
"""
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.geritra import JobPosition
from app.models.user import User
from app.models.worker import (
    Worker, WorkerPositionHistory,
    WorkerStatusEnum, DocTypeEnum,
)
from app.schemas.worker import (
    WorkerCreate, WorkerUpdate, WorkerStatusUpdate,
    WorkerPositionAssign, WorkerOut, WorkerListItem,
)


# ── Helpers internos ───────────────────────────────────────────────────────────

def _worker_to_list_item(w: Worker) -> WorkerListItem:
    pos = w.job_position
    return WorkerListItem(
        id=w.id,
        company_id=w.company_id,
        employee_code=w.employee_code,
        full_name=w.full_name,
        doc_type=w.doc_type,
        doc_number=w.doc_number,
        status=w.status,
        hire_date=w.hire_date,
        job_position_name=pos.name if pos else None,
        department=pos.department if pos else None,
        has_disability=bool(w.disability_pct or w.disability_type),
    )


def _worker_to_out(w: Worker) -> WorkerOut:
    pos = w.job_position
    created_by = w.created_by
    return WorkerOut(
        id=w.id,
        company_id=w.company_id,
        employee_code=w.employee_code,
        doc_type=w.doc_type,
        doc_number=w.doc_number,
        full_name=w.full_name,
        first_name=w.first_name,
        last_name=w.last_name,
        birth_date=w.birth_date,
        gender=w.gender,
        phone=w.phone,
        email=w.email,
        age=w.age,
        hire_date=w.hire_date,
        termination_date=w.termination_date,
        contract_type=w.contract_type,
        status=w.status,
        is_active=w.is_active,
        job_position_id=w.job_position_id,
        job_position_name=pos.name if pos else None,
        department=pos.department if pos else None,
        disability_type=w.disability_type,
        disability_pct=w.disability_pct,
        notes=w.notes,
        created_at=w.created_at,
        updated_at=w.updated_at,
        created_by_name=created_by.full_name if created_by else None,
    )


def _validate_cedula(number: str) -> bool:
    """Valida cédula ecuatoriana con algoritmo módulo 10."""
    if not number.isdigit() or len(number) != 10:
        return False
    digits = [int(d) for d in number]
    province = int(number[:2])
    if province < 1 or province > 24:
        return False
    coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = 0
    for i, coef in enumerate(coefficients):
        val = digits[i] * coef
        total += val - 9 if val > 9 else val
    check = (10 - (total % 10)) % 10
    return check == digits[9]


# ── Worker ─────────────────────────────────────────────────────────────────────

def get_worker(db: Session, company_id: int, worker_id: int) -> Optional[Worker]:
    stmt = (
        select(Worker)
        .where(Worker.id == worker_id, Worker.company_id == company_id)
        .options(
            selectinload(Worker.job_position),
            selectinload(Worker.created_by),
            selectinload(Worker.position_history).selectinload(
                WorkerPositionHistory.job_position
            ),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def list_workers(
    db: Session,
    company_id: int,
    search: Optional[str] = None,
    status: Optional[WorkerStatusEnum] = None,
    department: Optional[str] = None,
    job_position_id: Optional[int] = None,
    include_retired: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> tuple[List[Worker], int]:
    """Listado paginado con filtros. Retorna (items, total)."""
    base = (
        select(Worker)
        .where(Worker.company_id == company_id)
        .options(
            selectinload(Worker.job_position),
        )
    )

    # Filtro de estado
    if status:
        base = base.where(Worker.status == status)
    elif not include_retired:
        # Por defecto excluir retirados
        base = base.where(Worker.status != WorkerStatusEnum.RETIRADO)

    # Búsqueda por nombre o documento
    if search:
        term = f"%{search.strip()}%"
        base = base.where(
            or_(
                Worker.first_name.ilike(term),
                Worker.last_name.ilike(term),
                Worker.doc_number.ilike(term),
                Worker.employee_code.ilike(term),
            )
        )

    # Filtro por departamento (del JobPosition)
    if department:
        base = base.join(JobPosition, Worker.job_position_id == JobPosition.id,
                         isouter=True)
        base = base.where(JobPosition.department.ilike(f"%{department}%"))

    if job_position_id:
        base = base.where(Worker.job_position_id == job_position_id)

    # Total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Paginado
    items_stmt = base.order_by(Worker.last_name, Worker.first_name).offset(skip).limit(limit)
    items = list(db.execute(items_stmt).scalars().all())

    return items, total


def create_worker(
    db: Session,
    company_id: int,
    data: WorkerCreate,
    created_by: User,
) -> Worker:
    """Crea un trabajador y su primer registro de historial de puesto si se indica."""
    # Validar unicidad doc_type + doc_number en la empresa
    existing = db.execute(
        select(Worker).where(
            Worker.company_id == company_id,
            Worker.doc_type   == data.doc_type,
            Worker.doc_number == data.doc_number,
        )
    ).scalar_one_or_none()
    if existing:
        raise ValueError(
            f"Ya existe un trabajador con {data.doc_type.value} {data.doc_number} en esta empresa"
        )

    # Validar cédula ecuatoriana
    if data.doc_type == DocTypeEnum.CEDULA:
        if not _validate_cedula(data.doc_number):
            raise ValueError("La cédula ecuatoriana ingresada no es válida")

    # Validar fechas
    if data.termination_date and data.hire_date > data.termination_date:
        raise ValueError("La fecha de ingreso no puede ser posterior a la fecha de salida")

    payload = data.model_dump(exclude={"job_position_id"})
    worker = Worker(
        **payload,
        company_id=company_id,
        job_position_id=data.job_position_id,
        created_by_id=created_by.id,
    )
    db.add(worker)
    db.flush()  # para obtener el id antes del commit

    # Crear primer registro de historial si se indicó un puesto
    if data.job_position_id:
        history = WorkerPositionHistory(
            worker_id=worker.id,
            job_position_id=data.job_position_id,
            start_date=data.hire_date,
            reason="Ingreso",
            created_by_id=created_by.id,
        )
        db.add(history)

    db.commit()
    db.refresh(worker)
    return worker


def update_worker(
    db: Session,
    worker: Worker,
    data: WorkerUpdate,
) -> Worker:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(worker, k, v)
    db.commit()
    db.refresh(worker)
    return worker


def change_worker_status(
    db: Session,
    worker: Worker,
    data: WorkerStatusUpdate,
    changed_by: User,
) -> Worker:
    """Cambia el estado del trabajador con validaciones de negocio."""
    from fastapi import HTTPException

    # RETIRADO es terminal
    if worker.status == WorkerStatusEnum.RETIRADO:
        raise HTTPException(400, "Un trabajador retirado no puede cambiar de estado")

    if data.status == WorkerStatusEnum.RETIRADO and not data.termination_date:
        raise HTTPException(400, "La fecha de retiro es obligatoria al retirar un trabajador")

    worker.status = data.status
    worker.is_active = data.status == WorkerStatusEnum.ACTIVO

    if data.status == WorkerStatusEnum.RETIRADO:
        worker.termination_date = data.termination_date
        # Cerrar historial de puesto abierto
        open_history = db.execute(
            select(WorkerPositionHistory).where(
                WorkerPositionHistory.worker_id == worker.id,
                WorkerPositionHistory.end_date.is_(None),
            )
        ).scalar_one_or_none()
        if open_history:
            open_history.end_date = data.termination_date
            open_history.notes = (open_history.notes or "") + f" | Retiro: {data.notes or ''}"

    db.commit()
    db.refresh(worker)
    return worker


# ── WorkerPositionHistory ──────────────────────────────────────────────────────

def assign_position(
    db: Session,
    worker: Worker,
    data: WorkerPositionAssign,
    assigned_by: User,
) -> WorkerPositionHistory:
    """Asigna un nuevo puesto al trabajador. Cierra el registro anterior."""
    # Cerrar registro abierto
    open_record = db.execute(
        select(WorkerPositionHistory).where(
            WorkerPositionHistory.worker_id == worker.id,
            WorkerPositionHistory.end_date.is_(None),
        )
    ).scalar_one_or_none()

    if open_record:
        # La fecha de inicio del nuevo debe ser >= fecha inicio del anterior
        if data.start_date < open_record.start_date:
            raise ValueError(
                "La fecha de inicio del nuevo puesto no puede ser anterior "
                "a la fecha de inicio del puesto actual"
            )
        open_record.end_date = data.start_date
        open_record.notes = (open_record.notes or "") + f" | Cambio: {data.reason or ''}"

    # Crear nuevo registro
    new_record = WorkerPositionHistory(
        worker_id=worker.id,
        job_position_id=data.job_position_id,
        start_date=data.start_date,
        reason=data.reason,
        notes=data.notes,
        created_by_id=assigned_by.id,
    )
    db.add(new_record)

    # Actualizar referencia rápida en Worker
    worker.job_position_id = data.job_position_id

    db.commit()
    db.refresh(new_record)
    return new_record


def get_position_at_date(
    db: Session,
    worker_id: int,
    target_date: date,
) -> Optional[WorkerPositionHistory]:
    """
    Retorna el puesto que tenía el trabajador en una fecha específica.
    Útil para: accidentes, EPP, capacitaciones históricas.
    """
    stmt = (
        select(WorkerPositionHistory)
        .where(
            WorkerPositionHistory.worker_id == worker_id,
            WorkerPositionHistory.start_date <= target_date,
            or_(
                WorkerPositionHistory.end_date.is_(None),
                WorkerPositionHistory.end_date > target_date,
            ),
        )
        .options(selectinload(WorkerPositionHistory.job_position))
        .order_by(WorkerPositionHistory.start_date.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


# ── KPIs por empresa ───────────────────────────────────────────────────────────

def get_worker_kpis(db: Session, company_id: int) -> dict:
    """KPIs para el dashboard de trabajadores."""
    base = select(Worker).where(Worker.company_id == company_id)

    total_active   = db.execute(
        select(func.count()).select_from(
            base.where(Worker.status == WorkerStatusEnum.ACTIVO).subquery()
        )
    ).scalar_one()
    total_inactive = db.execute(
        select(func.count()).select_from(
            base.where(Worker.status == WorkerStatusEnum.INACTIVO).subquery()
        )
    ).scalar_one()
    total_retired  = db.execute(
        select(func.count()).select_from(
            base.where(Worker.status == WorkerStatusEnum.RETIRADO).subquery()
        )
    ).scalar_one()
    with_disability = db.execute(
        select(func.count()).select_from(
            base.where(
                Worker.status == WorkerStatusEnum.ACTIVO,
                Worker.disability_pct.isnot(None),
            ).subquery()
        )
    ).scalar_one()

    return {
        "total_active":    total_active,
        "total_inactive":  total_inactive,
        "total_retired":   total_retired,
        "with_disability": with_disability,
    }