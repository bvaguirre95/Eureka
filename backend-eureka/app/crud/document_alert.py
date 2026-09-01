"""
CRUD y lógica del scheduler de alertas de vencimiento documental.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.orm import Session, selectinload

from app.models.company_document import CompanyDocument, DocumentStatusEnum
from app.models.document_alert import DocumentAlertConfig, DocumentAlertLog
from app.models.user import User
from app.models.user_company import UserCompany


# ── Configuración ──────────────────────────────────────────────────────────────

def get_alert_config(db: Session, organization_id: int) -> Optional[DocumentAlertConfig]:
    return db.execute(
        select(DocumentAlertConfig).where(
            DocumentAlertConfig.organization_id == organization_id
        )
    ).scalar_one_or_none()


def upsert_alert_config(
    db: Session,
    organization_id: int,
    days_before: list[int],
    is_enabled: bool = True,
) -> DocumentAlertConfig:
    """Crea o actualiza la configuración de alertas para una organización."""
    days_str = ",".join(str(d) for d in sorted(set(days_before), reverse=True))
    config = get_alert_config(db, organization_id)
    if config:
        config.days_before = days_str
        config.is_enabled  = is_enabled
    else:
        config = DocumentAlertConfig(
            organization_id=organization_id,
            days_before=days_str,
            is_enabled=is_enabled,
        )
        db.add(config)
    db.commit()
    db.refresh(config)
    return config


# ── Scheduler logic ────────────────────────────────────────────────────────────

def _get_technician_email(db: Session, company_id: int) -> Optional[tuple[str, str]]:
    """
    Devuelve (email, full_name) del primer técnico SST asignado a la empresa.
    Prioriza por role.name conteniendo 'técnico' o 'tecnico' (case-insensitive).
    """
    stmt = (
        select(User)
        .join(UserCompany, UserCompany.user_id == User.id)
        .where(
            UserCompany.company_id == company_id,
            User.is_active == True,
        )
        .options(selectinload(User.role))
    )
    users = list(db.execute(stmt).scalars().all())
    if not users:
        return None

    # Preferir técnico SST
    for u in users:
        role_name = (u.role.name if u.role else "").lower()
        if "técnico" in role_name or "tecnico" in role_name:
            return (u.email, u.full_name)

    # Cualquier usuario asignado
    return (users[0].email, users[0].full_name)


def run_expiry_alerts(db: Session, force: bool = False) -> dict:
    """
    Lógica de alertas de vencimiento.

    Solo aplica a documentos VALIDADOS con due_date definida:
      - Si due_date < hoy       → marcar como VENCIDO + notificar renovación
      - Si due_date <= hoy + N  → notificar próximo vencimiento (por cada umbral configurado)

    force=True (botón "Enviar ahora"): ignora logs previos y re-envía todo
    force=False (scheduler diario):    respeta logs para no duplicar correos
    """
    from app.core.email_service import send_email
    from app.models.company import Company

    now   = datetime.now(timezone.utc)
    today = now.date()
    sent = skipped = errors = expired_marked = 0

    configs = list(db.execute(
        select(DocumentAlertConfig).where(DocumentAlertConfig.is_enabled == True)
    ).scalars().all())

    for config in configs:
        # ── 1. Marcar como VENCIDO los que ya pasaron la fecha ──────────────
        overdue_stmt = (
            select(CompanyDocument)
            .join(Company, Company.id == CompanyDocument.company_id)
            .where(
                Company.organization_id == config.organization_id,
                CompanyDocument.due_date.isnot(None),
                CompanyDocument.status == DocumentStatusEnum.VALIDADO,
            )
            .options(
                selectinload(CompanyDocument.catalog_item),
                selectinload(CompanyDocument.company),
            )
        )
        all_validated = list(db.execute(overdue_stmt).scalars().all())

        for doc in all_validated:
            due = doc.due_date
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)

            if due.date() < today:
                # Marcar como vencido
                doc.status = DocumentStatusEnum.VENCIDO
                expired_marked += 1

                # Notificar al técnico que debe renovar
                tech = _get_technician_email(db, doc.company_id)
                if tech:
                    email, full_name = tech
                    company_name = doc.company.razon_social if doc.company else f"#{doc.company_id}"
                    doc_name     = doc.catalog_item.name    if doc.catalog_item else "Documento"
                    due_str      = due.strftime("%d/%m/%Y")

                    # Solo notificar vencimiento una vez (log con days_before=0)
                    already = db.execute(
                        select(DocumentAlertLog).where(
                            DocumentAlertLog.company_document_id == doc.id,
                            DocumentAlertLog.days_before == 0,
                        )
                    ).scalar_one_or_none()

                    if not already or force:
                        subject, html = build_expiry_alert_email(
                            technician_name=full_name,
                            company_name=company_name,
                            document_name=doc_name,
                            period_display=doc.period_label or "—",
                            due_date_str=due_str,
                            days_remaining=0,   # 0 = ya venció
                            overdue=True,
                        )
                        try:
                            ok = send_email(to_email=email, subject=subject, html_body=html)
                            if ok:
                                if not already:
                                    db.add(DocumentAlertLog(
                                        config_id=config.id,
                                        company_document_id=doc.id,
                                        days_before=0,
                                        sent_to_email=email,
                                    ))
                                sent += 1
                            else:
                                errors += 1
                        except Exception as exc:
                            print(f"[alerts] Error vencimiento: {exc}")
                            errors += 1

        db.commit()

        # ── 2. Alertas preventivas por umbral (solo docs VALIDADOS vigentes) ──
        for days in config.days_list:
            threshold = now + timedelta(days=days)

            # Docs VALIDADOS cuya due_date es ≤ umbral (y no vencidos aún)
            stmt = (
                select(CompanyDocument)
                .join(Company, Company.id == CompanyDocument.company_id)
                .where(
                    Company.organization_id == config.organization_id,
                    CompanyDocument.due_date.isnot(None),
                    CompanyDocument.status == DocumentStatusEnum.VALIDADO,
                    CompanyDocument.due_date <= threshold,
                    CompanyDocument.due_date >= now,   # no vencidos (ya se trataron arriba)
                )
                .options(
                    selectinload(CompanyDocument.catalog_item),
                    selectinload(CompanyDocument.company),
                )
            )
            docs = list(db.execute(stmt).scalars().all())

            for doc in docs:
                due = doc.due_date
                if due and due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)

                days_rem = (due - now).days

                # ¿Ya se envió la alerta para este umbral?
                already = db.execute(
                    select(DocumentAlertLog).where(
                        DocumentAlertLog.company_document_id == doc.id,
                        DocumentAlertLog.days_before == days,
                    )
                ).scalar_one_or_none()

                if already and not force:
                    skipped += 1
                    continue

                tech = _get_technician_email(db, doc.company_id)
                if not tech:
                    skipped += 1
                    continue

                email, full_name = tech
                company_name = doc.company.razon_social if doc.company else f"#{doc.company_id}"
                doc_name     = doc.catalog_item.name    if doc.catalog_item else "Documento"
                due_str      = due.strftime("%d/%m/%Y")

                subject, html = build_expiry_alert_email(
                    technician_name=full_name,
                    company_name=company_name,
                    document_name=doc_name,
                    period_display=doc.period_label or "—",
                    due_date_str=due_str,
                    days_remaining=days_rem,
                    overdue=False,
                )
                try:
                    ok = send_email(to_email=email, subject=subject, html_body=html)
                    if ok:
                        if not already:
                            db.add(DocumentAlertLog(
                                config_id=config.id,
                                company_document_id=doc.id,
                                days_before=days,
                                sent_to_email=email,
                            ))
                        db.commit()
                        sent += 1
                    else:
                        errors += 1
                except Exception as exc:
                    print(f"[alerts] Error preventiva: {exc}")
                    errors += 1

    return {"sent": sent, "skipped": skipped, "errors": errors,
            "expired_marked": expired_marked}


def clear_alert_logs_for_document(db: Session, company_document_id: int) -> None:
    """
    Limpia los logs de alertas cuando un documento es re-subido,
    para que las alertas futuras se vuelvan a enviar.
    """
    logs = list(db.execute(
        select(DocumentAlertLog).where(
            DocumentAlertLog.company_document_id == company_document_id
        )
    ).scalars().all())
    for log in logs:
        db.delete(log)
    db.commit()


# ── Template de email ──────────────────────────────────────────────────────────

def build_expiry_alert_email(
    *,
    technician_name: str,
    company_name: str,
    document_name: str,
    period_display: str,
    due_date_str: str,
    days_remaining: int,
    overdue: bool = False,
) -> tuple[str, str]:
    """Construye (subject, html_body) para alerta de vencimiento o renovación."""

    if overdue:
        urgency_color = "#7c3aed"
        urgency_icon  = "🔴"
        urgency_label = "DOCUMENTO VENCIDO — REQUIERE RENOVACIÓN"
        subject = f"🔴 Documento VENCIDO — {document_name} · {company_name}"
        action_msg = (
            "El documento ha <strong>vencido</strong> y su estado fue actualizado automáticamente. "
            "Es necesario gestionar la renovación y subir el nuevo documento al sistema."
        )
    elif days_remaining <= 0:
        urgency_color = "#dc2626"
        urgency_icon  = "🔴"
        urgency_label = "VENCE HOY"
        subject = f"🔴 Documento vence HOY — {document_name} · {company_name}"
        action_msg = "El documento <strong>vence hoy</strong>. Gestiona su renovación de inmediato."
    elif days_remaining <= 7:
        urgency_color = "#dc2626"
        urgency_icon  = "🔴"
        urgency_label = f"VENCE EN {days_remaining} DÍA{'S' if days_remaining > 1 else ''}"
        subject = f"🔴 Documento por vencer — {document_name} · {company_name}"
        action_msg = "El documento está <strong>próximo a vencer</strong>. Verifica su estado y prepara la renovación."
    elif days_remaining <= 15:
        urgency_color = "#f97316"
        urgency_icon  = "🟠"
        urgency_label = f"VENCE EN {days_remaining} DÍAS"
        subject = f"🟠 Documento por vencer — {document_name} · {company_name}"
        action_msg = "El documento vencerá pronto. Planifica la renovación con anticipación."
    else:
        urgency_color = "#eab308"
        urgency_icon  = "🟡"
        urgency_label = f"VENCE EN {days_remaining} DÍAS"
        subject = f"🟡 Aviso de vencimiento — {document_name} · {company_name}"
        action_msg = "Te avisamos con anticipación para que puedas planificar la renovación del documento."

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:12px;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;max-width:100%;">
      <tr>
        <td style="background:{urgency_color};padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">
            {urgency_icon} {urgency_label}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8);">
            Gestión Documental SST · Eureka SST
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <p style="color:#111827;font-size:15px;margin:0 0 12px;">
            Hola <strong>{technician_name}</strong>,
          </p>
          <p style="color:#374151;font-size:14px;margin:0 0 20px;">
            {action_msg}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;">Empresa</span><br>
                <strong style="font-size:14px;color:#111827;">{company_name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;">Documento</span><br>
                <strong style="font-size:14px;color:#111827;">{document_name}</strong>
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;">Período</span><br>
                <strong style="font-size:14px;color:#111827;">{period_display}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#fef9c3;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;">
                  {"Venció el" if overdue else "Fecha de vencimiento"}
                </span><br>
                <strong style="font-size:16px;color:{urgency_color};">{due_date_str}</strong>
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;">Estado</span><br>
                <strong style="font-size:14px;color:{urgency_color};">
                  {"⚠️ Vencido — pendiente de renovación" if overdue else f"⏳ {urgency_label}"}
                </strong>
              </td>
            </tr>
          </table>
          <p style="margin-top:24px;color:#9ca3af;font-size:12px;text-align:center;">
            Mensaje automático de Eureka SST · No respondas a este correo.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Eureka Consultoría SST &mdash; Gestión Documental
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""

    return subject, html

    subject = f"{urgency_icon} Documento por vencer — {document_name} · {company_name}"

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:12px;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;max-width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:{urgency_color};padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">
            {urgency_icon} {urgency_label}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8);">
            Alerta de Vencimiento Documental · Eureka SST
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:28px 32px;">
          <p style="color:#111827;font-size:15px;margin:0 0 16px;">
            Hola <strong>{technician_name}</strong>,
          </p>
          <p style="color:#374151;font-size:14px;margin:0 0 20px;">
            El siguiente documento SST está próximo a vencer y requiere tu atención.
            Por favor verifica su estado y actualiza el archivo si es necesario.
          </p>

          <!-- Ficha -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Empresa</span><br>
                <strong style="font-size:14px;color:#111827;">{company_name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Documento</span><br>
                <strong style="font-size:14px;color:#111827;">{document_name}</strong>
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Período</span><br>
                <strong style="font-size:14px;color:#111827;">{period_display}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#fef9c3;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Fecha de vencimiento</span><br>
                <strong style="font-size:16px;color:{urgency_color};">{due_date_str}</strong>
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Tiempo restante</span><br>
                <strong style="font-size:14px;color:{urgency_color};">{urgency_label}</strong>
              </td>
            </tr>
          </table>

          <p style="margin-top:24px;color:#9ca3af;font-size:12px;text-align:center;">
            Este mensaje fue generado automáticamente por Eureka SST.<br>
            No respondas a este correo.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Eureka Consultoría SST &mdash; Gestión Documental
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""

    return subject, html