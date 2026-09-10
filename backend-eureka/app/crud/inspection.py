from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import HTTPException
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.inspection import (
    ActionStatusEnum, CorrectiveAction, FieldTypeEnum, FieldScopeEnum,
    Inspection, InspectionFieldValue, InspectionRecord,
    InspectionStatusEnum, StructureTypeEnum, InspectionType, InspectionTypeField,
)
from app.schemas.inspection import (
    CorrectiveActionCreate, CorrectiveActionOut, CorrectiveActionUpdate,
    FieldValueOut, InspectionCreate, InspectionDashboard,
    InspectionListItem, InspectionOut, InspectionRecordOut,
    InspectionTypeCreate, InspectionTypeOut,
    InspectionTypeStat, InspectionTypeFieldOut, InspectionUpdate,
    ActionSummary, WeeklyStats,
)
from app.models.company import Company, CompanySigners
from app.services.sequence_engine import SequenceEngine
from app.crud.sequence import get_sequence_def_by_code, create_sequence_def
from app.schemas.sequence import SequenceDefCreate
from app.models.user import User
# ── Loaders ───────────────────────────────────────────────────────────────────

def _load_type(db, type_id):
    stmt = (select(InspectionType)
            .options(selectinload(InspectionType.fields))
            .where(InspectionType.id == type_id))
    return db.execute(stmt).scalar_one_or_none()


def _load_inspection(db, inspection_id):
    stmt = (
        select(Inspection)
        .options(
            selectinload(Inspection.inspection_type).selectinload(InspectionType.fields),
            selectinload(Inspection.records).selectinload(InspectionRecord.values)
                .selectinload(InspectionFieldValue.field),
            selectinload(Inspection.actions).selectinload(CorrectiveAction.responsible),
            selectinload(Inspection.assigned_to),
            selectinload(Inspection.created_by),
        )
        .where(Inspection.id == inspection_id)
    )
    return db.execute(stmt).scalar_one_or_none()


# ── Stats ─────────────────────────────────────────────────────────────────────

def _stats(insp: Inspection) -> dict:
    total = len(insp.records)
    findings = sum(1 for r in insp.records if r.has_finding)
    open_act = sum(1 for a in insp.actions
                   if a.status in (ActionStatusEnum.PENDIENTE, ActionStatusEnum.EN_PROGRESO))
    pct = round(((total - findings) / total * 100), 1) if total > 0 else 0.0
    return dict(total_records=total, records_with_findings=findings,
                open_actions=open_act, compliance_percent=pct)


def _to_record_out(record: InspectionRecord) -> InspectionRecordOut:
    values_out = [
        FieldValueOut(
            field_id=v.field_id,
            field_key=v.field.field_key if v.field else "",
            field_name=v.field.name if v.field else "",
            field_type=v.field.field_type if v.field else "",
            scope=v.field.scope if v.field else "matriz",
            value=v.value,
        )
        for v in sorted(record.values, key=lambda x: x.field.order if x.field else 0)
    ]
    return InspectionRecordOut(
        id=record.id, order=record.order,
        has_finding=record.has_finding,
        photo_path=record.photo_path,
        has_photo=bool(record.photo_path),
        values=values_out,
    )


def _to_action_out(a: CorrectiveAction) -> CorrectiveActionOut:
    # Calcular VENCIDA automáticamente
    now = datetime.now(timezone.utc)
    status = a.status
    if (
        status not in (ActionStatusEnum.COMPLETADA,)
        and a.due_date_end
        and a.due_date_end < now
    ):
        status = ActionStatusEnum.VENCIDA

    # responsible_name: primero el campo libre, luego el usuario vinculado
    resp_name = (
        a.responsible_name
        or (a.responsible.full_name if a.responsible else None)
    )

    return CorrectiveActionOut(
        id=a.id, inspection_id=a.inspection_id, record_id=a.record_id,
        item_ref=a.item_ref, description=a.description, action=a.action,
        priority=a.priority, due_date_start=a.due_date_start,
        due_date_end=a.due_date_end, status=status,
        completion_notes=a.completion_notes, completed_at=a.completed_at,
        responsible_id=a.responsible_id,
        responsible_name=resp_name,
        created_at=a.created_at,
    )


def _to_inspection_out(insp: Inspection) -> InspectionOut:
    st = _stats(insp)
    fields_out = [InspectionTypeFieldOut.model_validate(f)
                  for f in insp.inspection_type.fields]
    return InspectionOut(
        id=insp.id, company_id=insp.company_id,
        inspection_type_id=insp.inspection_type_id,
        inspection_type_name=insp.inspection_type.name,
        inspection_type_fields=fields_out,
        structure_type=insp.inspection_type.structure_type or StructureTypeEnum.MATRIZ,
        status=insp.status,
        inspection_number=insp.inspection_number,
        scheduled_date=insp.scheduled_date,
        completed_date=insp.completed_date,
        location=insp.location, start_time=insp.start_time, end_time=insp.end_time,
        general_observations=insp.general_observations,
        recommendations=insp.recommendations,
        elaborated_by=insp.elaborated_by, elaborated_role=insp.elaborated_role,
        reviewed_by=insp.reviewed_by, reviewed_role=insp.reviewed_role,
        approved_by=insp.approved_by, approved_role=insp.approved_role,
        assigned_to_id=insp.assigned_to_id,
        assigned_to_name=insp.assigned_to.full_name if insp.assigned_to else None,
        created_by_name=insp.created_by.full_name if insp.created_by else None,
        general_data=insp.general_data or {},
        records=[_to_record_out(r) for r in insp.records],
        actions=[_to_action_out(a) for a in insp.actions],
        created_at=insp.created_at, **st,
    )


def _to_list_item(insp: Inspection) -> InspectionListItem:
    st = _stats(insp)
    return InspectionListItem(
        id=insp.id, company_id=insp.company_id,
        inspection_type_id=insp.inspection_type_id,
        inspection_type_name=insp.inspection_type.name,
        structure_type=insp.inspection_type.structure_type or StructureTypeEnum.MATRIZ,
        status=insp.status, inspection_number=insp.inspection_number,
        scheduled_date=insp.scheduled_date, completed_date=insp.completed_date,
        location=insp.location,
        assigned_to_name=insp.assigned_to.full_name if insp.assigned_to else None,
        created_at=insp.created_at, **st,
    )


# ── Inspection Types ──────────────────────────────────────────────────────────

def get_inspection_types(db: Session, organization_id: int,
                          only_active: bool = False) -> List[InspectionTypeOut]:
    stmt = (select(InspectionType)
            .options(selectinload(InspectionType.fields))
            .where(InspectionType.organization_id == organization_id))
    if only_active:
        stmt = stmt.where(InspectionType.is_active.is_(True))
    types = db.execute(stmt.order_by(InspectionType.name)).scalars().all()
    result = []
    for t in types:
        out = InspectionTypeOut.model_validate(t)
        out.field_count = len(t.fields)
        out.inspection_count = len(t.inspections)
        result.append(out)
    return result


def get_inspection_type(db: Session, type_id: int) -> Optional[InspectionType]:
    return _load_type(db, type_id)


def get_inspection_type_out(db: Session, type_id: int) -> Optional[InspectionTypeOut]:
    """Retorna un InspectionType serializado como InspectionTypeOut."""
    itype = _load_type(db, type_id)
    if not itype:
        return None
    return InspectionTypeOut.model_validate(itype)


def create_inspection_type(db: Session, org_id: int, user_id: int,
                            type_in: InspectionTypeCreate) -> InspectionTypeOut:
    # Normalizar type_code: mayúsculas, sin espacios, máx 20 chars
    type_code = None
    if getattr(type_in, "type_code", None):
        type_code = type_in.type_code.strip().upper()[:20]

    itype = InspectionType(
        organization_id=org_id, name=type_in.name,
        type_code=type_code,
        description=type_in.description, icon=type_in.icon,
        periodicity=type_in.periodicity, is_active=type_in.is_active,
        pdf_template=getattr(type_in, "pdf_template", "generico") or "generico",
        structure_type=getattr(type_in, "structure_type", StructureTypeEnum.MATRIZ),
        created_by_id=user_id,
    )
    db.add(itype)
    db.flush()

    for idx, f in enumerate(type_in.fields):
        key = f.field_key or slugify(f.name, separator="_")
        # Normalizar a minúsculas para evitar errores de enum en PostgreSQL
        raw_ft    = str(f.field_type).lower() if f.field_type else "texto"
        raw_scope = str(getattr(f, "scope", "matriz")).lower()
        try:
            ft_enum    = FieldTypeEnum(raw_ft)
            scope_enum = FieldScopeEnum(raw_scope)
        except ValueError:
            ft_enum    = FieldTypeEnum.TEXTO
            scope_enum = FieldScopeEnum.MATRIZ
        db.add(InspectionTypeField(
            inspection_type_id=itype.id, name=f.name, field_key=key,
            field_type=ft_enum, options=f.options,
            is_required=f.is_required, order=f.order or idx,
            group_name=f.group_name,
            scope=scope_enum,
        ))

    db.commit()

    # Crear SequenceDef para este tipo si tiene type_code
    # code: "insp_<org_id>_<type_id>" — único por organización + tipo
    # scope: organization + company → aislamiento multitenant completo
    if type_code:
        seq_code = f"insp_{org_id}_{itype.id}"
        if not get_sequence_def_by_code(db, seq_code):
            create_sequence_def(db, SequenceDefCreate(
                name=f"Inspecciones — {itype.name}",
                code=seq_code,
                template=f"{{company_code}}-{type_code}-{{number:03}}",
                padding=3,
                increment=1,
                reset_policy="NEVER",
                description=f"Org {org_id} · Tipo {itype.name} (id={itype.id})",
            ))

    t = _load_type(db, itype.id)
    out = InspectionTypeOut.model_validate(t)
    out.field_count = len(t.fields)
    return out


def update_inspection_type(db: Session, itype: InspectionType,
                            type_in) -> InspectionTypeOut:
    for f in ["name", "description", "icon", "periodicity", "is_active", "pdf_template", "type_code", "structure_type"]:
        v = getattr(type_in, f, None)
        if v is not None:
            setattr(itype, f, v)
    if type_in.fields is not None:
        for old in list(itype.fields):
            db.delete(old)
        db.flush()
        for idx, f in enumerate(type_in.fields):
            key = f.field_key or slugify(f.name, separator="_")
            raw_ft = (
                f.field_type.value
                if hasattr(f.field_type, "value")
                else str(f.field_type)
            ).lower()

            raw_scope = getattr(f, "scope", "matriz")

            raw_scope = (
                raw_scope.value
                if hasattr(raw_scope, "value")
                else str(raw_scope)
            ).lower()

            try:
                ft_enum = FieldTypeEnum(raw_ft)
                scope_enum = FieldScopeEnum(raw_scope)
            except ValueError as e:
                print("ERROR CON ENUMS")
                print("raw_ft:", repr(raw_ft))
                print("raw_scope:", repr(raw_scope))
                raise HTTPException(
                    status_code=400,
                    detail=f"Valor inválido: field_type={raw_ft}, scope={raw_scope}"
                )
            db.add(InspectionTypeField(
                inspection_type_id=itype.id, name=f.name, field_key=key,
                field_type=ft_enum, options=f.options,
                is_required=f.is_required, order=f.order or idx,
                group_name=f.group_name,
                scope=scope_enum,
            ))
    db.commit()
    t = _load_type(db, itype.id)
    out = InspectionTypeOut.model_validate(t)
    out.field_count = len(t.fields)
    return out


def deactivate_inspection_type(db: Session, itype: InspectionType) -> InspectionTypeOut:
    itype.is_active = False
    db.commit()
    t = _load_type(db, itype.id)
    return InspectionTypeOut.model_validate(t)


# ── Inspections ───────────────────────────────────────────────────────────────

def get_inspections_for_company(db: Session, company_id: int) -> List[InspectionListItem]:
    stmt = (
        select(Inspection)
        .options(
            selectinload(Inspection.inspection_type),
            selectinload(Inspection.records),
            selectinload(Inspection.actions),
            selectinload(Inspection.assigned_to),
        )
        .where(Inspection.company_id == company_id)
        .order_by(Inspection.created_at.desc())
    )
    return [_to_list_item(i) for i in db.execute(stmt).scalars().all()]


def get_inspection(db: Session, inspection_id: int) -> Optional[InspectionOut]:
    insp = _load_inspection(db, inspection_id)
    return _to_inspection_out(insp) if insp else None

def create_inspection(db:Session, company_id: int, user_id: int, insp_in) -> "InspectionOut":
    itype = db.get(InspectionType, insp_in.inspection_type_id)
    # Número automático
    inspection_number = insp_in.inspection_number
    if not inspection_number and itype:
        inspection_number = next_inspection_number(db, itype, company_id)

    # Firmantes predeterminados
    signers = get_company_signers(db, company_id)
    creator = db.get(User, user_id)

    elaborated_by   = insp_in.elaborated_by   or (creator.full_name if creator else None)
    elaborated_role = insp_in.elaborated_role or (signers.elaborated_role if signers else None)
    reviewed_by     = insp_in.reviewed_by     or (signers.reviewed_by   if signers else None)
    reviewed_role   = insp_in.reviewed_role   or (signers.reviewed_role if signers else None)
    approved_by     = insp_in.approved_by     or (signers.approved_by   if signers else None)
    approved_role   = insp_in.approved_role   or (signers.approved_role if signers else None)

    data = insp_in.model_dump(exclude={
        "inspection_number",
        "elaborated_by", "elaborated_role",
        "reviewed_by", "reviewed_role",
        "approved_by", "approved_role",
    })
    insp = Inspection(
        company_id=company_id, created_by_id=user_id,
        inspection_number=inspection_number,
        elaborated_by=elaborated_by, elaborated_role=elaborated_role,
        reviewed_by=reviewed_by, reviewed_role=reviewed_role,
        approved_by=approved_by, approved_role=approved_role,
        **data,
    )
    db.add(insp)
    db.commit()
    return _to_inspection_out(_load_inspection(db, insp.id))

def add_record(db: Session, inspection: Inspection, record_in) -> InspectionOut:
    record = InspectionRecord(
        inspection_id=inspection.id,
        order=record_in.order, has_finding=record_in.has_finding,
    )
    db.add(record)
    db.flush()
    for v in record_in.values:
        db.add(InspectionFieldValue(
            record_id=record.id, field_id=v.field_id, value=v.value,
        ))
    db.commit()
    return _to_inspection_out(_load_inspection(db, inspection.id))


def update_record(db: Session, record: InspectionRecord, record_in) -> InspectionOut:
    record.has_finding = record_in.has_finding
    existing = {v.field_id: v for v in record.values}
    for v_in in record_in.values:
        if v_in.field_id in existing:
            existing[v_in.field_id].value = v_in.value
        else:
            db.add(InspectionFieldValue(
                record_id=record.id, field_id=v_in.field_id, value=v_in.value,
            ))
    db.commit()
    return _to_inspection_out(_load_inspection(db, record.inspection_id))


def delete_record(db: Session, record: InspectionRecord) -> InspectionOut:
    insp_id = record.inspection_id
    db.delete(record)
    db.commit()
    return _to_inspection_out(_load_inspection(db, insp_id))


def update_inspection_meta(db: Session, inspection: Inspection,
                            insp_in: InspectionUpdate) -> InspectionOut:
    # Bloquear edición si ya está COMPLETADA o CERRADA
    # Solo se permite cambiar el status (para cerrar) y campos de firmas
    locked = inspection.status in (
        InspectionStatusEnum.COMPLETADA, InspectionStatusEnum.CERRADA
    )
    if locked:
        allowed_when_locked = {
            "status", "elaborated_by", "reviewed_by", "approved_by",
            "elaborated_role", "reviewed_role", "approved_role",
            "recommendations", "general_observations",
        }
        fields = list(allowed_when_locked)
    else:
        fields = [
            "status", "inspection_number", "scheduled_date", "completed_date",
            "assigned_to_id", "location", "start_time", "end_time",
            "general_observations", "recommendations", "general_data",
            "elaborated_by", "reviewed_by", "approved_by",
            "elaborated_role", "reviewed_role", "approved_role",
        ]

    for f in fields:
        v = getattr(insp_in, f, None)
        if v is not None:
            setattr(inspection, f, v)

    if insp_in.status == InspectionStatusEnum.COMPLETADA and not inspection.completed_date:
        inspection.completed_date = datetime.now(timezone.utc)

    db.commit()
    return _to_inspection_out(_load_inspection(db, inspection.id))


def try_close_inspection(db: Session, inspection: Inspection) -> InspectionOut:
    """
    Intenta cerrar la inspección.
    Solo se puede cerrar si:
      1. Está en estado COMPLETADA
      2. Todas las acciones correctivas están COMPLETADAS
    Retorna la inspección actualizada (cerrada o no).
    """
    if inspection.status != InspectionStatusEnum.COMPLETADA:
        raise ValueError("Solo se puede cerrar una inspección completada.")

    now = datetime.now(timezone.utc)
    pending = [
        a for a in inspection.actions
        if a.status not in (ActionStatusEnum.COMPLETADA,)
        and not (a.due_date_end and a.due_date_end < now)  # excluir vencidas ya aceptadas
    ]
    if pending:
        raise ValueError(
            f"Hay {len(pending)} acción(es) correctiva(s) pendientes. "
            "Completa todas antes de cerrar la inspección."
        )

    inspection.status = InspectionStatusEnum.CERRADA
    db.commit()
    return _to_inspection_out(_load_inspection(db, inspection.id))


# ── Corrective Actions ────────────────────────────────────────────────────────

def create_action(db: Session, inspection_id: int,
                  action_in: CorrectiveActionCreate) -> CorrectiveActionOut:
    action = CorrectiveAction(inspection_id=inspection_id, **action_in.model_dump())
    db.add(action)
    db.commit()
    db.refresh(action)
    return _to_action_out(action)


def update_action(db: Session, action: CorrectiveAction,
                  action_in: CorrectiveActionUpdate) -> CorrectiveActionOut:
    for f, v in action_in.model_dump(exclude_unset=True).items():
        setattr(action, f, v)
    if action.status == ActionStatusEnum.COMPLETADA and not action.completed_at:
        action.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return _to_action_out(action)


def delete_action(db: Session, action: CorrectiveAction) -> None:
    db.delete(action)
    db.commit()


# ── Dashboard ─────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, company_id: int) -> InspectionDashboard:
    stmt = (
        select(Inspection)
        .options(
            selectinload(Inspection.inspection_type),
            selectinload(Inspection.records),
            selectinload(Inspection.actions),
        )
        .where(Inspection.company_id == company_id)
    )
    inspections = db.execute(stmt).scalars().all()
    now = datetime.now(timezone.utc)

    total = len(inspections)
    borrador = en_proceso = completada = cerrada = 0
    compliance_sum = compliance_cnt = open_actions = overdue = 0
    type_map: dict = {}

    for insp in inspections:
        if   insp.status == InspectionStatusEnum.BORRADOR:   borrador += 1
        elif insp.status == InspectionStatusEnum.EN_PROCESO: en_proceso += 1
        elif insp.status == InspectionStatusEnum.COMPLETADA: completada += 1
        elif insp.status == InspectionStatusEnum.CERRADA:    cerrada += 1

        st = _stats(insp)
        if st["total_records"] > 0:
            compliance_sum += st["compliance_percent"]
            compliance_cnt += 1
        open_actions += st["open_actions"]

        for a in insp.actions:
            if a.status in (ActionStatusEnum.PENDIENTE, ActionStatusEnum.EN_PROGRESO):
                end = a.due_date_end
                if end:
                    end_aware = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
                    if end_aware < now:
                        overdue += 1

        tid = insp.inspection_type_id
        if tid not in type_map:
            type_map[tid] = {"name": insp.inspection_type.name,
                             "items": [], "open": 0}
        type_map[tid]["items"].append(st)
        type_map[tid]["open"] += st["open_actions"]

    compliance_avg = round(compliance_sum / compliance_cnt, 1) if compliance_cnt else 0.0

    by_type = []
    for tid, data in type_map.items():
        items = data["items"]
        avg = round(sum(i["compliance_percent"] for i in items) / len(items), 1) if items else 0.0
        semaforo = "green" if avg >= 80 else ("yellow" if avg >= 50 else "red")
        done = sum(1 for i in inspections
                   if i.inspection_type_id == tid
                   and i.status in (InspectionStatusEnum.COMPLETADA, InspectionStatusEnum.CERRADA))
        by_type.append(InspectionTypeStat(
            type_id=tid, type_name=data["name"],
            total=len(items), completed=done,
            compliance_avg=avg, open_actions=data["open"],
            semaforo=semaforo,
        ))
    by_type.sort(key=lambda x: x.compliance_avg)

    # ── Estadísticas semanales ────────────────────────────────────────────────
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    inspections_this_week = sum(
        1 for i in inspections
        if i.created_at and i.created_at.replace(tzinfo=timezone.utc) >= week_start
    )
    completed_this_week = sum(
        1 for i in inspections
        if i.completed_date
        and i.completed_date.replace(tzinfo=timezone.utc) >= week_start
    )
    all_actions = [a for i in inspections for a in i.actions]
    actions_created_week = sum(
        1 for a in all_actions
        if a.created_at and a.created_at.replace(tzinfo=timezone.utc) >= week_start
    )
    actions_completed_week = sum(
        1 for a in all_actions
        if a.completed_at and a.completed_at.replace(tzinfo=timezone.utc) >= week_start
    )

    weekly = WeeklyStats(
        inspections_this_week=inspections_this_week,
        completed_this_week=completed_this_week,
        actions_created_this_week=actions_created_week,
        actions_completed_this_week=actions_completed_week,
    )

    # ── Acciones vencidas y próximas a vencer ─────────────────────────────────
    due_soon_limit = now + timedelta(days=7)
    actions_overdue = []
    actions_due_soon = []

    for insp in inspections:
        for a in insp.actions:
            if a.status == ActionStatusEnum.COMPLETADA:
                continue
            end = a.due_date_end
            if not end:
                continue
            end_aware = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
            summary = ActionSummary(
                id=a.id,
                inspection_id=insp.id,
                inspection_number=insp.inspection_number,
                inspection_type=insp.inspection_type.name,
                description=a.description,
                responsible_name=a.responsible_name or (
                    a.responsible.full_name if a.responsible else None
                ),
                due_date_end=end_aware,
                status=a.status.value,
                priority=a.priority,
                days_overdue=int((now - end_aware).days) if end_aware < now else -int((end_aware - now).days),
            )
            if end_aware < now:
                actions_overdue.append(summary)
            elif end_aware <= due_soon_limit:
                actions_due_soon.append(summary)

    actions_overdue.sort(key=lambda x: x.days_overdue, reverse=True)
    actions_due_soon.sort(key=lambda x: x.due_date_end)

    return InspectionDashboard(
        total=total, borrador=borrador, en_proceso=en_proceso,
        completada=completada, cerrada=cerrada,
        compliance_avg=compliance_avg,
        open_actions=open_actions, overdue_actions=overdue,
        by_type=by_type,
        weekly=weekly,
        actions_overdue=actions_overdue,
        actions_due_soon=actions_due_soon,
    )
def next_inspection_number(db: Session, itype: InspectionType, company_id: int) -> str:
    """
    Genera el próximo número de inspección usando el Sequence Engine.

    scope multitenant: organization + company
      - Dos organizaciones con el mismo tipo nunca comparten contador.
      - Dos empresas de la misma organización tienen contadores independientes.

    El motor usa SELECT FOR UPDATE: seguro para uso concurrente.
    """
    org_id = itype.organization_id
    seq_code = f"insp_{org_id}_{itype.id}"
    seq_def = get_sequence_def_by_code(db, seq_code)

    if seq_def:
        db.expire_all()  # fuerza lectura fresca desde BD
        company = db.get(Company, company_id)
        company_code = (
            company.company_code
            or (company.nombre_comercial or company.razon_social or "EMP")[:3].upper()
        ) if company else "EMP"

        type_code = itype.type_code or ""

        return SequenceEngine.next(
            db=db,
            code=seq_code,
            context={
                "company_code": company_code,
                "type_code":    type_code,
            },
            scope={
                "organization": org_id,
                "company":      company_id,
            },
        )

    # Fallback: tipo sin secuencia configurada (no tiene type_code)
    return f"INSP-{itype.id}-{company_id}"
def get_company_signers(db, company_id):
    return db.execute(select(CompanySigners).where(
        CompanySigners.company_id == company_id)).scalar_one_or_none()
def upsert_company_signers(db, company_id: int, data: dict):
    signers = db.execute(select(CompanySigners).where(
        CompanySigners.company_id == company_id)).scalar_one_or_none()
    if signers is None:
        signers = CompanySigners(company_id=company_id, **data)
        db.add(signers)
    else:
        for k, v in data.items():
            setattr(signers, k, v)
    db.commit()
    db.refresh(signers)
    return signers