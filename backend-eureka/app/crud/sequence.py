from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sequence import SequenceDef, SequenceCounter
from app.schemas.sequence import SequenceDefCreate, SequenceDefUpdate


# ── SequenceDef ───────────────────────────────────────────────────────────────

def get_sequence_def(db: Session, sequence_id: int) -> Optional[SequenceDef]:
    return db.get(SequenceDef, sequence_id)


def get_sequence_def_by_code(db: Session, code: str) -> Optional[SequenceDef]:
    stmt = select(SequenceDef).where(SequenceDef.code == code)
    return db.execute(stmt).scalar_one_or_none()


def get_all_sequence_defs(
    db: Session,
    only_active: bool = False,
) -> List[SequenceDef]:
    stmt = select(SequenceDef).order_by(SequenceDef.name)
    if only_active:
        stmt = stmt.where(SequenceDef.is_active.is_(True))
    return db.execute(stmt).scalars().all()


def create_sequence_def(db: Session, seq_in: SequenceDefCreate) -> SequenceDef:
    seq = SequenceDef(**seq_in.model_dump())
    db.add(seq)
    db.commit()
    db.refresh(seq)
    return seq


def update_sequence_def(
    db: Session,
    seq: SequenceDef,
    seq_in: SequenceDefUpdate,
) -> SequenceDef:
    for field, value in seq_in.model_dump(exclude_unset=True).items():
        setattr(seq, field, value)
    db.commit()
    db.refresh(seq)
    return seq


def delete_sequence_def(db: Session, seq: SequenceDef) -> None:
    """Elimina la definición y sus contadores (CASCADE)."""
    db.delete(seq)
    db.commit()


# ── SequenceCounter ───────────────────────────────────────────────────────────

def get_counters_for_sequence(
    db: Session,
    sequence_def_id: int,
) -> List[SequenceCounter]:
    stmt = (
        select(SequenceCounter)
        .where(SequenceCounter.sequence_def_id == sequence_def_id)
        .order_by(SequenceCounter.scope_key)
    )
    return db.execute(stmt).scalars().all()


def reset_counter(db: Session, counter_id: int) -> Optional[SequenceCounter]:
    """
    Reinicia manualmente un contador a 0.
    Útil para administración o correcciones.
    """
    counter = db.get(SequenceCounter, counter_id)
    if counter:
        counter.current_value = 0
        counter.reset_at = None
        db.commit()
        db.refresh(counter)
    return counter