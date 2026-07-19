"""CRUD del módulo GERITRA."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.geritra import (
    ActionStatus, RiskAction, RiskCategory,
    RiskControl, RiskFactorCatalog, RiskLevel,
    RiskMatrix, RiskMatrixRow, JobPosition,
)
from app.schemas.geritra import (
    JobPositionCreate, JobPositionUpdate,
    RiskActionCreate, RiskActionUpdate,
    RiskCategoryCreate, RiskCategoryUpdate,
    RiskControlCreate, RiskFactorCreate, RiskFactorUpdate,
    RiskMatrixCreate, RiskMatrixListItem, RiskMatrixOut,
    RiskMatrixRowCreate, RiskMatrixRowOut, RiskMatrixRowUpdate,
    RiskMatrixUpdate,
)


# ── Motor de cálculo GERITRA ──────────────────────────────────────────────────

def _calcular_riesgo(ip, ic, ice, ie, c):
    """
    Fórmula GERITRA oficial:
      P  = IP + ICE + IC + IE   (cada índice 1-3, P rango 4-12)
      ER = P × C                (C rango 1-4, ER rango 4-48)

    Clasificación:
      ER=4     → TRIVIAL
      ER 5-8   → TOLERABLE
      ER 9-16  → MODERADO
      ER 17-24 → IMPORTANTE
      ER 25+   → INTOLERABLE
    """
    if any(v is None for v in [ip, ic, ice, ie, c]):
        return None, None, None
    p  = ip + ic + ice + ie
    er = p * c
    if   er <= 4:  nivel = RiskLevel.TRIVIAL
    elif er <= 8:  nivel = RiskLevel.TOLERABLE
    elif er <= 16: nivel = RiskLevel.MODERADO
    elif er <= 24: nivel = RiskLevel.IMPORTANTE
    else:          nivel = RiskLevel.INTOLERABLE
    return p, er, nivel


def _ctrl_to_out(c: RiskControl):
    from app.schemas.geritra import RiskControlOut
    return RiskControlOut(id=c.id, row_id=c.row_id,
                          control_type=c.control_type, description=c.description)


def _action_to_out(a: RiskAction):
    now = datetime.now(timezone.utc)
    status = a.status
    if (status != ActionStatus.COMPLETADA and a.due_date
            and a.due_date.replace(tzinfo=timezone.utc) < now):
        status = ActionStatus.VENCIDA
    from app.schemas.geritra import RiskActionOut
    return RiskActionOut(
        id=a.id, row_id=a.row_id, matrix_id=a.matrix_id,
        description=a.description, responsible_name=a.responsible_name,
        due_date=a.due_date, status=status,
        completion_notes=a.completion_notes, completed_at=a.completed_at,
        created_at=a.created_at,
    )


def _row_to_out(row: RiskMatrixRow) -> RiskMatrixRowOut:
    return RiskMatrixRowOut(
        id=row.id, matrix_id=row.matrix_id, order=row.order,
        category_id=row.category_id,
        category_name=row.category.name if row.category else None,
        factor_id=row.factor_id,
        factor_name=row.factor.name if row.factor else None,
        peligro=row.peligro, efecto=row.efecto,
        ip=row.ip, ic=row.ic, ice=row.ice, ie=row.ie,
        consecuencia=row.consecuencia,
        probabilidad=row.probabilidad,
        estimacion=row.estimacion,
        nivel_riesgo=row.nivel_riesgo,
        res_ip=row.res_ip, res_ic=row.res_ic,
        res_ice=row.res_ice, res_ie=row.res_ie,
        res_consecuencia=row.res_consecuencia,
        res_probabilidad=row.res_probabilidad,
        res_estimacion=row.res_estimacion,
        res_nivel_riesgo=row.res_nivel_riesgo,
        controls=[_ctrl_to_out(c) for c in row.controls],
        actions=[_action_to_out(a) for a in row.actions],
    )


def _matrix_to_out(matrix: RiskMatrix) -> RiskMatrixOut:
    rows        = [_row_to_out(r) for r in matrix.rows]
    moderado    = sum(1 for r in matrix.rows if r.nivel_riesgo == RiskLevel.MODERADO)
    importante  = sum(1 for r in matrix.rows if r.nivel_riesgo == RiskLevel.IMPORTANTE)
    intolerable = sum(1 for r in matrix.rows if r.nivel_riesgo == RiskLevel.INTOLERABLE)
    open_actions = sum(
        1 for r in matrix.rows for a in r.actions
        if a.status not in (ActionStatus.COMPLETADA,)
    )
    return RiskMatrixOut(
        id=matrix.id, job_position_id=matrix.job_position_id,
        job_position_name=matrix.job_position.name if matrix.job_position else None,
        company_id=matrix.company_id, organization_id=matrix.organization_id,
        version=matrix.version, status=matrix.status,
        elaborated_by=matrix.elaborated_by, reviewed_by=matrix.reviewed_by,
        approved_by=matrix.approved_by,
        elaborated_role=matrix.elaborated_role, reviewed_role=matrix.reviewed_role,
        approved_role=matrix.approved_role,
        notes=matrix.notes, rows=rows,
        total_rows=len(rows), moderado=moderado,
        importante=importante, intolerable=intolerable,
        open_actions=open_actions,
        created_at=matrix.created_at, updated_at=matrix.updated_at,
    )


# ── RiskCategory ──────────────────────────────────────────────────────────────

def get_categories(db: Session, org_id: int) -> List[RiskCategory]:
    return db.execute(
        select(RiskCategory)
        .where(RiskCategory.organization_id == org_id)
        .order_by(RiskCategory.order, RiskCategory.name)
    ).scalars().all()


def create_category(db: Session, org_id: int, data: RiskCategoryCreate) -> RiskCategory:
    cat = RiskCategory(organization_id=org_id, **data.model_dump())
    db.add(cat); db.commit(); db.refresh(cat)
    return cat


def update_category(db: Session, cat: RiskCategory, data: RiskCategoryUpdate) -> RiskCategory:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit(); db.refresh(cat)
    return cat


def delete_category(db: Session, cat: RiskCategory) -> None:
    db.delete(cat); db.commit()


# ── RiskFactorCatalog ─────────────────────────────────────────────────────────

def get_factors(db: Session, org_id: int,
                category_id: Optional[int] = None) -> List[RiskFactorCatalog]:
    stmt = (select(RiskFactorCatalog)
            .where(RiskFactorCatalog.organization_id == org_id)
            .order_by(RiskFactorCatalog.name))
    if category_id:
        stmt = stmt.where(RiskFactorCatalog.category_id == category_id)
    return db.execute(stmt).scalars().all()


def create_factor(db: Session, org_id: int, data: RiskFactorCreate) -> RiskFactorCatalog:
    factor = RiskFactorCatalog(organization_id=org_id, **data.model_dump())
    db.add(factor); db.commit(); db.refresh(factor)
    return factor


def update_factor(db: Session, factor: RiskFactorCatalog,
                  data: RiskFactorUpdate) -> RiskFactorCatalog:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(factor, k, v)
    db.commit(); db.refresh(factor)
    return factor


def delete_factor(db: Session, factor: RiskFactorCatalog) -> None:
    db.delete(factor); db.commit()


# ── JobPosition ───────────────────────────────────────────────────────────────

def get_job_positions(db: Session, company_id: int) -> List[JobPosition]:
    return db.execute(
        select(JobPosition)
        .where(JobPosition.company_id == company_id)
        .order_by(JobPosition.name)
    ).scalars().all()


def get_job_position(db: Session, position_id: int) -> Optional[JobPosition]:
    return db.get(JobPosition, position_id)


def create_job_position(db: Session, company_id: int, org_id: int,
                        data: JobPositionCreate) -> JobPosition:
    pos = JobPosition(company_id=company_id, organization_id=org_id,
                      **data.model_dump())
    db.add(pos); db.commit(); db.refresh(pos)
    return pos


def update_job_position(db: Session, pos: JobPosition,
                        data: JobPositionUpdate) -> JobPosition:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pos, k, v)
    db.commit(); db.refresh(pos)
    return pos


def delete_job_position(db: Session, pos: JobPosition) -> None:
    db.delete(pos); db.commit()


# ── RiskMatrix ────────────────────────────────────────────────────────────────

def get_matrices(db: Session, company_id: int) -> List[RiskMatrixListItem]:
    matrices = db.execute(
        select(RiskMatrix)
        .where(RiskMatrix.company_id == company_id)
        .order_by(RiskMatrix.updated_at.desc())
    ).scalars().all()
    result = []
    for m in matrices:
        moderado    = sum(1 for r in m.rows if r.nivel_riesgo == RiskLevel.MODERADO)
        importante  = sum(1 for r in m.rows if r.nivel_riesgo == RiskLevel.IMPORTANTE)
        intolerable = sum(1 for r in m.rows if r.nivel_riesgo == RiskLevel.INTOLERABLE)
        open_actions = sum(
            1 for r in m.rows for a in r.actions
            if a.status not in (ActionStatus.COMPLETADA,)
        )
        result.append(RiskMatrixListItem(
            id=m.id, job_position_id=m.job_position_id,
            job_position_name=m.job_position.name if m.job_position else None,
            version=m.version, status=m.status,
            total_rows=len(m.rows), moderado=moderado,
            importante=importante, intolerable=intolerable,
            open_actions=open_actions, updated_at=m.updated_at,
        ))
    return result


def get_matrix(db: Session, matrix_id: int) -> Optional[RiskMatrix]:
    return db.get(RiskMatrix, matrix_id)


def create_matrix(db: Session, position_id: int, company_id: int,
                  org_id: int, data: RiskMatrixCreate) -> RiskMatrixOut:
    matrix = RiskMatrix(
        job_position_id=position_id, company_id=company_id,
        organization_id=org_id, **data.model_dump(),
    )
    db.add(matrix); db.commit(); db.refresh(matrix)
    return _matrix_to_out(matrix)


def update_matrix(db: Session, matrix: RiskMatrix,
                  data: RiskMatrixUpdate) -> RiskMatrixOut:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(matrix, k, v)
    db.commit(); db.refresh(matrix)
    return _matrix_to_out(matrix)


def delete_matrix(db: Session, matrix: RiskMatrix) -> None:
    db.delete(matrix); db.commit()


# ── RiskMatrixRow ─────────────────────────────────────────────────────────────

def add_row(db: Session, matrix_id: int, data: RiskMatrixRowCreate) -> RiskMatrixRowOut:
    p, er, nivel = _calcular_riesgo(
        data.ip, data.ic, data.ice, data.ie, data.consecuencia)
    row = RiskMatrixRow(
        matrix_id=matrix_id, **data.model_dump(),
        probabilidad=p, estimacion=er, nivel_riesgo=nivel,
    )
    db.add(row); db.flush()

    # Auto-crear acción según umbral configurado en la empresa
    if nivel is not None:
        matrix  = db.get(RiskMatrix, matrix_id)
        company = db.get(Company, matrix.company_id) if matrix else None
        geritra_cfg = getattr(company, "geritra_config", None) or {}
        umbral_str  = geritra_cfg.get("generar_accion_desde", "MODERADO")
        ORDEN       = ["TRIVIAL","TOLERABLE","MODERADO","IMPORTANTE","INTOLERABLE"]
        umbral_idx  = ORDEN.index(umbral_str) if umbral_str in ORDEN else 2
        nivel_idx   = ORDEN.index(nivel.value) if nivel.value in ORDEN else 0
        if nivel_idx >= umbral_idx:
            db.add(RiskAction(
                row_id=row.id, matrix_id=matrix_id,
                description=f"Control de riesgo: {row.peligro}",
            ))

    db.commit(); db.refresh(row)
    return _row_to_out(row)


def update_row(db: Session, row: RiskMatrixRow,
               data: RiskMatrixRowUpdate) -> RiskMatrixRowOut:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    # Recalcular evaluación inicial
    p, er, nivel = _calcular_riesgo(row.ip, row.ic, row.ice, row.ie, row.consecuencia)
    row.probabilidad = p; row.estimacion = er; row.nivel_riesgo = nivel
    # Recalcular riesgo residual
    rp, rer, rnivel = _calcular_riesgo(
        row.res_ip, row.res_ic, row.res_ice, row.res_ie, row.res_consecuencia)
    row.res_probabilidad = rp; row.res_estimacion = rer; row.res_nivel_riesgo = rnivel
    db.commit(); db.refresh(row)
    return _row_to_out(row)


def delete_row(db: Session, row: RiskMatrixRow) -> None:
    db.delete(row); db.commit()


# ── RiskControl ───────────────────────────────────────────────────────────────

def add_control(db: Session, row_id: int, data: RiskControlCreate) -> RiskControl:
    ctrl = RiskControl(row_id=row_id, **data.model_dump())
    db.add(ctrl); db.commit(); db.refresh(ctrl)
    return ctrl


def delete_control(db: Session, ctrl: RiskControl) -> None:
    db.delete(ctrl); db.commit()


# ── RiskAction ────────────────────────────────────────────────────────────────

def get_actions(db: Session, matrix_id: int) -> List[RiskAction]:
    return db.execute(
        select(RiskAction).where(RiskAction.matrix_id == matrix_id)
    ).scalars().all()


def update_action(db: Session, action: RiskAction,
                  data: RiskActionUpdate) -> RiskAction:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(action, k, v)
    if data.status == ActionStatus.COMPLETADA and not action.completed_at:
        action.completed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(action)
    return action