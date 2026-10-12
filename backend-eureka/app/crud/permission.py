from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission


def get_permissions(db: Session) -> List[Permission]:
    stmt = select(Permission).order_by(Permission.module, Permission.code)
    return list(db.execute(stmt).scalars().all())


def get_permissions_by_ids(db: Session, permission_ids: List[int]) -> List[Permission]:
    if not permission_ids:
        return []
    stmt = select(Permission).where(Permission.id.in_(permission_ids))
    return list(db.execute(stmt).scalars().all())


def get_permission_by_code(db: Session, code: str) -> Optional[Permission]:
    stmt = select(Permission).where(Permission.code == code)
    return db.execute(stmt).scalar_one_or_none()
