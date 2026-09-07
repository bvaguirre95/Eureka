from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.anexo1_questions import SECTIONS, get_all_questions
from app.models.diagnostic import (
    AnswerValueEnum,
    Diagnostic,
    DiagnosticAnswer,
    DiagnosticStatusEnum,
)
from app.schemas.diagnostic import (
    DiagnosticCreate,
    DiagnosticListItem,
    DiagnosticOut,
    DiagnosticSectionResult,
    DiagnosticUpdate,
)


def _compute_stats(diagnostic: Diagnostic) -> DiagnosticOut:
    """Calcula las estadísticas del diagnóstico y las adjunta al DiagnosticOut."""

    answers_by_qid = {
        a.question_id: a
        for a in diagnostic.answers
    }

    all_questions = get_all_questions()

    # ---------------------------------------------------------
    # ESTADÍSTICAS GENERALES
    # ---------------------------------------------------------
    cumple = 0
    no_cumple = 0
    no_aplica = 0
    answered = 0

    sections_map: dict[str, DiagnosticSectionResult] = {}

    # ---------------------------------------------------------
    # CREAR ESTADÍSTICAS POR SECCIÓN
    #
    # Estructura:
    # SECTIONS
    #   └── questions
    # ---------------------------------------------------------
    for section in SECTIONS:
        questions = section.get("questions", [])

        sections_map[section["id"]] = DiagnosticSectionResult(
            section_id=section["id"],
            section_name=section["name"],
            total=len(questions),
            cumple=0,
            no_cumple=0,
            no_aplica=0,
            sin_respuesta=0,
            percent=0.0,
        )

    # ---------------------------------------------------------
    # PROCESAR RESPUESTAS
    # ---------------------------------------------------------
    for q in all_questions:
        ans = answers_by_qid.get(q["id"])
        sec = sections_map[q["section_id"]]

        if ans is None:
            sec.sin_respuesta += 1

        elif ans.answer == AnswerValueEnum.CUMPLE:
            cumple += 1
            answered += 1
            sec.cumple += 1

        elif ans.answer == AnswerValueEnum.NO_CUMPLE:
            no_cumple += 1
            answered += 1
            sec.no_cumple += 1

        elif ans.answer == AnswerValueEnum.NO_APLICA:
            no_aplica += 1
            answered += 1
            sec.no_aplica += 1

    # ---------------------------------------------------------
    # TOTAL DE PREGUNTAS
    # ---------------------------------------------------------
    total_q = len(all_questions)

    # No aplica no afecta el porcentaje de cumplimiento
    applicable = total_q - no_aplica

    compliance_percent = (
        round((cumple / applicable) * 100, 1)
        if applicable > 0
        else 0.0
    )

    # ---------------------------------------------------------
    # PROGRESO
    #
    # Incluye Cumple + No cumple + No aplica
    # ---------------------------------------------------------
    progress_percent = (
        round((answered / total_q) * 100, 1)
        if total_q > 0
        else 0.0
    )

    # ---------------------------------------------------------
    # PORCENTAJE DE CUMPLIMIENTO POR SECCIÓN
    #
    # Fórmula:
    # Cumple / (Cumple + No cumple) * 100
    #
    # No aplica NO penaliza el porcentaje.
    # Sin respuesta tampoco entra en la evaluación.
    # ---------------------------------------------------------
    for sec in sections_map.values():

        applicable_sec = sec.cumple + sec.no_cumple

        sec.percent = (
            round((sec.cumple / applicable_sec) * 100, 1)
            if applicable_sec > 0
            else 0.0
        )

    # ---------------------------------------------------------
    # CONSTRUIR RESPUESTA
    # ---------------------------------------------------------
    out = DiagnosticOut.model_validate(diagnostic)

    out.answered = answered
    out.cumple = cumple
    out.no_cumple = no_cumple
    out.no_aplica = no_aplica
    out.progress_percent = progress_percent
    out.compliance_percent = compliance_percent
    out.sections = list(sections_map.values())

    return out


def _compute_list_stats(diagnostic: Diagnostic) -> DiagnosticListItem:
    answers_by_qid = {a.question_id: a for a in diagnostic.answers}

    cumple = no_aplica = answered = 0

    all_questions = get_all_questions()

    for q in all_questions:
        ans = answers_by_qid.get(q["id"])

        if ans:
            answered += 1

            if ans.answer == AnswerValueEnum.CUMPLE:
                cumple += 1

            elif ans.answer == AnswerValueEnum.NO_APLICA:
                no_aplica += 1

    total_q = len(all_questions)
    applicable = total_q - no_aplica

    compliance_percent = (
        round((cumple / applicable) * 100, 1)
        if applicable > 0
        else 0.0
    )

    item = DiagnosticListItem.model_validate(diagnostic)

    item.answered = answered
    item.compliance_percent = compliance_percent

    return item

def _load_diagnostic(db: Session, diagnostic_id: int) -> Optional[Diagnostic]:
    stmt = (
        select(Diagnostic)
        .options(selectinload(Diagnostic.answers))
        .where(Diagnostic.id == diagnostic_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_diagnostic(db: Session, diagnostic_id: int) -> Optional[DiagnosticOut]:
    diag = _load_diagnostic(db, diagnostic_id)
    return _compute_stats(diag) if diag else None


def get_diagnostics_for_company(
    db: Session, company_id: int
) -> List[DiagnosticListItem]:
    stmt = (
        select(Diagnostic)
        .options(selectinload(Diagnostic.answers))
        .where(Diagnostic.company_id == company_id)
        .order_by(Diagnostic.created_at.desc())
    )
    diagnostics = db.execute(stmt).scalars().all()
    return [_compute_list_stats(d) for d in diagnostics]


def create_diagnostic(
    db: Session, company_id: int, diag_in: DiagnosticCreate, user_id: int
) -> DiagnosticOut:
    data = diag_in.model_dump()
    diag = Diagnostic(**data, company_id=company_id, created_by_id=user_id)
    db.add(diag)
    db.commit()
    db.refresh(diag)
    return _compute_stats(_load_diagnostic(db, diag.id))


def update_diagnostic(
    db: Session, diagnostic: Diagnostic, diag_in: DiagnosticUpdate
) -> DiagnosticOut:
    update_data = diag_in.model_dump(exclude_unset=True, exclude={"answers"})
    for field, value in update_data.items():
        setattr(diagnostic, field, value)

    if diag_in.answers is not None:
        # Upsert respuestas
        existing = {a.question_id: a for a in diagnostic.answers}
        for ans_in in diag_in.answers:
            if ans_in.question_id in existing:
                existing[ans_in.question_id].answer = ans_in.answer
                existing[ans_in.question_id].observation = ans_in.observation
            else:
                db.add(DiagnosticAnswer(
                    diagnostic_id=diagnostic.id,
                    question_id=ans_in.question_id,
                    answer=ans_in.answer,
                    observation=ans_in.observation,
                ))

    db.commit()
    return _compute_stats(_load_diagnostic(db, diagnostic.id))


def delete_diagnostic(db: Session, diagnostic: Diagnostic) -> None:
    db.delete(diagnostic)
    db.commit()
