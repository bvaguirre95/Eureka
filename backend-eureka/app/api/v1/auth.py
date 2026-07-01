from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.crud.user import authenticate_user, get_user, update_last_login
from app.models.user import User
from app.schemas.token import RefreshRequest, Token
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo, contacta al administrador",
        )

    update_last_login(db, user)

    access_token = create_access_token(subject=user.id, role=user.role.name)
    refresh_token = create_refresh_token(subject=user.id, role=user.role.name)

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    user_id = data.get("sub")
    user = get_user(db, int(user_id)) if user_id else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    access_token = create_access_token(subject=user.id, role=user.role.name)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role.name)

    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user