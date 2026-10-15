"""
Aviso al supervisor cuando se carga un documento.

Destinatarios elegibles: usuarios activos de la organización de la empresa con un rol
NO restringido por empresa (supervisor / administrador), excepto quien sube el archivo.
Por defecto se avisa a los supervisores (rol cuyo nombre contiene "supervisor"):
los asignados a la empresa (user_companies) y, si no hay ninguno, todos los de la organización.
El técnico puede cambiar la selección al subir (o no avisar a nadie).
"""
import logging
import unicodedata
from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email_service import build_upload_email, send_email
from app.models.document_alert import DocumentAlertConfig, DocumentUploadNotification
from app.models.role import Role
from app.models.user import User
from app.models.user_company import UserCompany

logger = logging.getLogger(__name__)


def _norm(s: Optional[str]) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def is_enabled(db: Session, organization_id: int) -> bool:
    cfg = db.execute(select(DocumentAlertConfig).where(
        DocumentAlertConfig.organization_id == organization_id)).scalar_one_or_none()
    return True if cfg is None else bool(cfg.notify_on_upload)


def parse_ids(raw: Optional[str]) -> Optional[list[int]]:
    """None → usar destinatarios por defecto;  '' → no avisar a nadie;  '3,5' → esos usuarios."""
    if raw is None:
        return None
    return [int(x) for x in raw.split(",") if x.strip().isdigit()]


def eligible_recipients(db: Session, company, uploader_id: Optional[int]) -> list[User]:
    users = db.execute(
        select(User).join(Role, Role.id == User.role_id)
        .where(User.organization_id == company.organization_id,
               User.is_active.is_(True), Role.is_company_scoped.is_(False))
        .order_by(User.full_name)
    ).scalars().all()
    return [u for u in users if u.id != uploader_id and u.email]


def default_recipient_ids(db: Session, company, eligible: Iterable[User]) -> list[int]:
    supervisors = [u for u in eligible if "supervisor" in _norm(u.role.name)]
    linked = {r for (r,) in db.execute(select(UserCompany.user_id).where(
        UserCompany.company_id == company.id)).all()}
    assigned = [u for u in supervisors if u.id in linked]
    return [u.id for u in (assigned or supervisors)]


def resolve_recipients(db: Session, company, uploader_id: Optional[int],
                       requested: Optional[list[int]]) -> list[User]:
    eligible = eligible_recipients(db, company, uploader_id)
    ids = default_recipient_ids(db, company, eligible) if requested is None else requested
    allowed = {u.id: u for u in eligible}          # nunca se avisa a alguien no elegible
    return [allowed[i] for i in dict.fromkeys(ids) if i in allowed]


def queue_upload_notifications(db: Session, *, company, uploader: User, recipients: list[User],
                               company_document_id: Optional[int] = None,
                               custom_document_id: Optional[int] = None) -> list[int]:
    """Crea las filas de aviso (pendiente) y devuelve sus ids para enviarlas en segundo plano."""
    rows = [DocumentUploadNotification(
        company_id=company.id, company_document_id=company_document_id,
        custom_document_id=custom_document_id, uploaded_by_id=uploader.id,
        recipient_user_id=u.id, recipient_email=u.email) for u in recipients]
    db.add_all(rows)
    db.commit()
    return [r.id for r in rows]


def send_queued(notification_ids: list[int], *, company_name: str, document_name: str,
                period_display: str, uploader_name: str, uploader_email: Optional[str],
                session_factory=None) -> None:
    """Tarea de fondo: envía cada correo y registra enviado/fallido/omitido. No lanza excepciones."""
    if not notification_ids:
        return
    if session_factory is None:
        from app.database import SessionLocal as session_factory
    db = session_factory()
    try:
        rows = db.execute(select(DocumentUploadNotification).where(
            DocumentUploadNotification.id.in_(notification_ids))).scalars().all()
        for r in rows:
            if not settings.MAIL_FROM:
                r.status = "omitido"
                continue
            user = db.get(User, r.recipient_user_id) if r.recipient_user_id else None
            subject, body = build_upload_email(
                to_name=user.full_name if user else r.recipient_email, company_name=company_name,
                document_name=document_name, period_display=period_display, uploader_name=uploader_name)
            ok = send_email(to_email=r.recipient_email, subject=subject, html_body=body,
                            sender_name=uploader_name, reply_to=uploader_email)
            r.status = "enviado" if ok else "fallido"
            r.sent_at = datetime.now(timezone.utc) if ok else None
        db.commit()
    except Exception as exc:                        # noqa: BLE001 — el aviso nunca debe romper la carga
        logger.error("upload notice falló: %s", exc, exc_info=True)
        db.rollback()
    finally:
        db.close()


def notify_after_upload(db: Session, background_tasks, *, company, uploader: User,
                        raw_ids: Optional[str], document_name: str, period_display: str,
                        company_document_id: Optional[int] = None,
                        custom_document_id: Optional[int] = None) -> int:
    """Punto único de entrada desde los endpoints de carga. Devuelve cuántos avisos se encolaron.
    Un fallo aquí nunca debe deshacer la carga del documento."""
    try:
        if not is_enabled(db, company.organization_id):
            return 0
        recipients = resolve_recipients(db, company, uploader.id, parse_ids(raw_ids))
        if not recipients:
            return 0
        ids = queue_upload_notifications(
            db, company=company, uploader=uploader, recipients=recipients,
            company_document_id=company_document_id, custom_document_id=custom_document_id)
        background_tasks.add_task(
            send_queued, ids, company_name=company.razon_social, document_name=document_name,
            period_display=period_display, uploader_name=uploader.full_name, uploader_email=uploader.email)
        return len(ids)
    except Exception as exc:                        # noqa: BLE001
        logger.error("notify_after_upload falló: %s", exc, exc_info=True)
        db.rollback()
        return 0
