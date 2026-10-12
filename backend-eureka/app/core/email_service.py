"""
Servicio de email para Eureka SST.
SMTP SSL (puerto 465) — compatible con hosting cPanel.
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    sender_name: str = "Eureka SST",
    reply_to: Optional[str] = None,
) -> bool:
    """
    Envía un email HTML via SMTP SSL (cPanel).
    Retorna True si fue exitoso, False si falló (no lanza excepción).
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{sender_name} via Eureka SST <{settings.MAIL_FROM}>"
        msg["To"]      = to_email
        msg["Reply-To"] = reply_to or settings.MAIL_FROM
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.MAIL_SERVER, settings.MAIL_PORT, context=context) as server:
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"[email_service] ERROR enviando email a {to_email}: {exc}")
        return False


def build_validation_email(
    *,
    to_name: str,
    company_name: str,
    document_name: str,
    period_display: str,
    validator_name: str,
    approved: bool,
    rejection_reason: Optional[str] = None,
) -> tuple[str, str]:
    """
    Construye (subject, html_body) para notificación de validación.

    - approved=True  → destinatario = empresa (to_name = razon_social)
    - approved=False → destinatario = técnico (to_name = full_name del técnico)
    """
    if approved:
        subject       = f"✅ Documento aprobado: {document_name} — {company_name}"
        header_color  = "#16a34a"
        header_label  = "DOCUMENTO APROBADO"
        header_icon   = "✅"
        salutation    = f"Estimado equipo de <strong>{to_name}</strong>,"
        detail_block  = f"""
        <p style="color:#374151;font-size:14px;margin:0 0 12px;">
            El siguiente documento ha sido <strong style="color:#16a34a;">aprobado</strong>
            y ya está disponible en el sistema de gestión documental de Eureka SST.
        </p>"""
    else:
        subject       = f"❌ Documento rechazado: {document_name} — {company_name}"
        header_color  = "#dc2626"
        header_label  = "DOCUMENTO RECHAZADO"
        header_icon   = "❌"
        salutation    = f"Hola <strong>{to_name}</strong>,"
        reason_text   = rejection_reason or "Sin motivo especificado"
        detail_block  = f"""
        <p style="color:#374151;font-size:14px;margin:0 0 12px;">
            El documento que subiste para <strong>{company_name}</strong> ha sido
            <strong style="color:#dc2626;">rechazado</strong>. Por favor revisa el motivo,
            corrige el documento y vuélvelo a cargar.
        </p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;
                    padding:12px 16px;border-radius:4px;margin:12px 0;">
            <p style="margin:0;font-size:13px;color:#991b1b;">
                <strong>Motivo del rechazo:</strong> {reason_text}
            </p>
        </div>"""

    html_body = f"""<!DOCTYPE html>
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
        <td style="background:{header_color};padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">
            {header_icon} {header_label}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8);">
            Sistema de Gestión Documental · Eureka SST
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:28px 32px;">
          <p style="color:#111827;font-size:15px;margin:0 0 16px;">{salutation}</p>
          {detail_block}

          <!-- Ficha del documento -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="margin-top:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
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
              <td style="padding:10px 16px;">
                <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Revisado por</span><br>
                <strong style="font-size:14px;color:#111827;">{validator_name}</strong>
              </td>
            </tr>
          </table>

          <p style="margin-top:20px;color:#9ca3af;font-size:12px;">
            Este mensaje fue generado automáticamente. No respondas a este correo.
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

    return subject, html_body