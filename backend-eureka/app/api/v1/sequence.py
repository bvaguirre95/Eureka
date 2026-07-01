import copy
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, require_platform_admin
from app.crud import company as crud_company
from app.crud import sequence as crud_seq
from app.models.user import User
from app.schemas.sequence import (
    SequenceCreate, SequenceResponse, SequencePreview, SequenceUpdate,
    SequenceDateRangeOut
)

router = APIRouter(tags=["Secuencias"])


# ==========================================
# 1. ENDPOINTS DE GESTIÓN (CRUD)
# ==========================================

@router.post("/", response_model=SequenceResponse, status_code=status.HTTP_201_CREATED)
def create_sequence(
    *,
    db: Session = Depends(get_db),
    sequence_in: SequenceCreate,
    current_user: User = Depends(require_permission("sequence:create"))
):
    """
    Crea una nueva secuencia numérica y devuelve su estructura completa (SequenceResponse).
    """
    db_sequence = crud_seq.get_sequence_by_code(db, code=sequence_in.code)
    if db_sequence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una secuencia configurada con este código técnico."
        )
    return crud_seq.create_sequence(db=db, sequence_in=sequence_in)


@router.get("/", response_model=List[SequenceResponse])
def read_sequences(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("sequence:read"))
):
    """
    Obtiene el listado completo de secuencias mapeadas bajo el esquema SequenceResponse.
    """
    return crud_seq.get_sequences(db=db, skip=skip, limit=limit)


@router.get("/{sequence_id}", response_model=SequenceResponse)
def read_sequence(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequence:read"))
):
    """
    Busca una secuencia y la serializa con sus relaciones internas.
    """
    db_sequence = crud_seq.get_sequence(db=db, sequence_id=sequence_id)
    if not db_sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La secuencia solicitada no existe."
        )
    return db_sequence


@router.patch("/{sequence_id}", response_model=SequenceResponse)
def update_sequence(
    *,
    sequence_id: int,
    db: Session = Depends(get_db),
    sequence_in: SequenceUpdate,
    current_user: User = Depends(require_permission("sequence:update"))
):
    """
    Actualiza parcialmente los valores de control de la secuencia.
    """
    db_sequence = crud_seq.get_sequence(db=db, sequence_id=sequence_id)
    if not db_sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la secuencia para actualizar."
        )
    return crud_seq.update_sequence(db=db, db_sequence=db_sequence, sequence_in=sequence_in)


# ==========================================
# 2. ENDPOINT ADICIONAL PARA AGREGAR/CONSULTAR RANGOS
# ==========================================

@router.get("/{sequence_id}/ranges", response_model=List[SequenceDateRangeOut])
def read_sequence_ranges(
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequence:read"))
):
    """
    Uso explícito de SequenceDateRangeOut: Devuelve la lista exclusiva 
    de los históricos de rangos anuales/mensuales de una secuencia.
    """
    db_sequence = crud_seq.get_sequence(db=db, sequence_id=sequence_id)
    if not db_sequence:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada.")
    return db_sequence.ranges


# ==========================================
# 3. ENDPOINT EJECUTOR (MOTOR)
# ==========================================

@router.post("/next/{sequence_code}", response_model=SequencePreview)
def generate_next_sequence_code(
    sequence_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("sequence:execute"))
):
    """
    Genera, incrementa y retorna el siguiente código correlativo de manera segura.
    """
    try:
        with db.begin_nested():
            next_code = crud_seq.get_next_sequence_value(db=db, sequence_code=sequence_code)
        db.commit()
        return {"code": sequence_code, "generated_value": next_code}
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error de concurrencia en la base de datos.")
