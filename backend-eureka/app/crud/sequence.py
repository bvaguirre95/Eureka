from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.sequence import Sequence, SequenceDateRange 
from app.schemas.sequence import SequenceCreate, SequenceUpdate

# ==========================================
# 1. MOTOR DE SECUENCIAS (GENERADOR DE CÓDIGOS)
# ==========================================
def get_next_sequence_value(db: Session, sequence_code: str) -> str:
    """
    Busca una secuencia por su código, bloquea la fila para evitar duplicados
    por concurrencia, incrementa el contador y retorna el código formateado.
    """
    today = date.today()
    
    # Buscar y bloquear la secuencia principal (SELECT FOR UPDATE)
    seq = db.query(Sequence).filter(Sequence.code == sequence_code).with_for_update().first()
    if not seq:
        raise ValueError(f"La secuencia con código '{sequence_code}' no existe.")

    # Controlar si usa rangos de fechas o numeración global
    if seq.use_date_range:
        seq_range = db.query(SequenceDateRange).filter(
            SequenceDateRange.sequence_id == seq.id,
            SequenceDateRange.date_from <= today,
            SequenceDateRange.date_to >= today
        ).with_for_update().first()

        # Si no existe el periodo anual actual, lo creamos automáticamente iniciando en 1
        if not seq_range:
            seq_range = SequenceDateRange(
                sequence_id=seq.id,
                date_from=date(today.year, 1, 1),
                date_to=date(today.year, 12, 31),
                number_next=1
            )
            db.add(seq_range)
            db.flush() 

        current_number = seq_range.number_next
        seq_range.number_next += seq.number_increment
    else:
        current_number = seq.number_next
        seq.number_next += seq.number_increment

    # Formatear cadenas finales sustituyendo los formatos de fecha (ej: %Y, %m)
    rendered_prefix = today.strftime(seq.prefix) if seq.prefix else ""
    rendered_suffix = today.strftime(seq.suffix) if seq.suffix else ""
    str_number = str(current_number).zfill(seq.padding)

    return f"{rendered_prefix}{str_number}{rendered_suffix}"


# ==========================================
# 2. OPERACIONES CRUD ESTÁNDAR
# ==========================================

def get_sequence(db: Session, sequence_id: int) -> Optional[Sequence]:
    """Obtiene una secuencia específica por su ID."""
    return db.query(Sequence).filter(Sequence.id == sequence_id).first()


def get_sequence_by_code(db: Session, code: str) -> Optional[Sequence]:
    """Obtiene una secuencia específica por su código único."""
    return db.query(Sequence).filter(Sequence.code == code).first()


def get_sequences(db: Session, skip: int = 0, limit: int = 100) -> List[Sequence]:
    """Obtiene una lista paginada de todas las secuencias registradas."""
    return db.query(Sequence).offset(skip).limit(limit).all()


def create_sequence(db: Session, sequence_in: SequenceCreate) -> Sequence:
    """Crea una nueva secuencia validando que los datos sigan el esquema."""
    db_sequence = Sequence(
        name=sequence_in.name,
        code=sequence_in.code,
        prefix=sequence_in.prefix,
        suffix=sequence_in.suffix,
        padding=sequence_in.padding,
        number_increment=sequence_in.number_increment,
        number_next=sequence_in.number_next,
        use_date_range=sequence_in.use_date_range
    )
    db.add(db_sequence)
    db.commit()
    db.refresh(db_sequence)
    return db_sequence


def update_sequence(db: Session, db_sequence: Sequence, sequence_in: SequenceUpdate) -> Sequence:
    """Actualiza campos permitidos de una secuencia existente."""
    # Convertimos el esquema de entrada a un diccionario omitiendo valores no enviados (None)
    update_data = sequence_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_sequence, field, value)
        
    db.add(db_sequence)
    db.commit()
    db.refresh(db_sequence)
    return db_sequence


def delete_sequence(db: Session, sequence_id: int) -> bool:
    """Elimina una secuencia de la base de datos por su ID."""
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if db_sequence:
        db.delete(db_sequence)
        db.commit()
        return True
    return False
