from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.crud.user import get_user
from app.database import SessionLocal
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = get_user(db, int(user_id))
    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo"
        )
    return current_user


def require_permission(*required_codes: str):
    """
    Dependencia factory para restringir un endpoint según permisos dinámicos
    del rol del usuario (tabla `role_permissions`).

    Si se pasan varios códigos, basta con que el usuario tenga AL MENOS UNO
    de ellos (lógica OR) — útil para endpoints de lectura accesibles por
    varios permisos relacionados (ej. "roles.view" o "roles.manage").

    Uso:
        @router.post("/", dependencies=[Depends(require_permission("companies.create"))])
    """

    def checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_codes = {p.code for p in current_user.role.permissions}

        if not (user_codes & set(required_codes)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para esta acción",
            )
        return current_user

    return checker


def require_platform_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Solo el super-admin de la plataforma (sin organización) puede acceder."""
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el super-admin de la plataforma puede realizar esta acción",
        )
    return current_user
