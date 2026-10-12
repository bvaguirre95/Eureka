"""
Template PDF para la Matriz GERITRA.
Genera un documento landscape A4 con:
  - Portada con datos empresa/puesto + KPIs
  - Tabla completa de riesgos (evaluación inicial + controles + residual)
  - Firmas
  - Anexo 01: Compromiso de la máxima autoridad
  - Anexo 03: Detalle de procesos, puestos y actividades
"""
import base64
import os
from datetime import datetime

from weasyprint import HTML

MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

NIVEL_COLOR = {
    "TRIVIAL":     "#22c55e",
    "TOLERABLE":   "#3b82f6",
    "MODERADO":    "#f59e0b",
    "IMPORTANTE":  "#f97316",
    "INTOLERABLE": "#ef4444",
}
NIVEL_LABEL = {
    "TRIVIAL": "Trivial", "TOLERABLE": "Tolerable",
    "MODERADO": "Moderado", "IMPORTANTE": "Importante",
    "INTOLERABLE": "Intolerable",
}
CONTROL_LABEL = {
    "ELIMINACION":    "1. Eliminación",
    "SUSTITUCION":    "2. Sustitución",
    "INGENIERIA":     "3. Ingeniería",
    "ADMINISTRATIVO": "4. Administrativo",
    "EPP":            "5. EPP",
}
RISK_TYPE_LABEL = {
    "FISICO":           "Medio ambiente físico",
    "QUIMICO_BIOLOGICO":"Químico-biológico",
    "ERGONOMICO":       "Ergonómico",
    "PSICOSOCIAL":      "Psicosocial",
    "SEGURIDAD":        "Seguridad",
    "AMBIENTAL":        "Ambiental",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _date_long(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str):
        try: dt = datetime.fromisoformat(dt[:10])
        except: return str(dt)
    return f"{dt.day} de {MESES[dt.month]} de {dt.year}"


def _logo_b64(logo_path):
    if not logo_path or not os.path.exists(logo_path): return ""
    ext  = os.path.splitext(logo_path)[1].lower().replace(".", "")
    mime = "image/svg+xml" if ext == "svg" else \
           f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"
    with open(logo_path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


def _nivel_badge(nivel: str) -> str:
    if not nivel: return "—"
    color = NIVEL_COLOR.get(nivel, "#6b7280")
    label = NIVEL_LABEL.get(nivel, nivel)
    return (f'<span style="background:{color};color:#fff;padding:2px 6px;'
            f'border-radius:4px;font-size:8px;font-weight:700;white-space:nowrap">'
            f'{label}</span>')


def _controls_html(controls: list) -> str:
    if not controls:
        return '<span style="color:#9ca3af;font-size:8px">Sin controles</span>'
    items = []
    for c in controls:
        lbl  = CONTROL_LABEL.get(c.get("control_type", ""), c.get("control_type", ""))
        desc = c.get("description", "")
        items.append(
            f'<div style="margin-bottom:2px">'
            f'<span style="color:#6b7280;font-size:7px">{lbl}:</span> '
            f'<span style="font-size:8px">{desc}</span></div>'
        )
    return "".join(items)


def _firma_box(title: str, name: str, role: str = "") -> str:
    return (
        f'<div style="flex:1;border-top:1.5px solid #374151;padding-top:6px;text-align:center">'
        f'<p style="font-size:8pt;font-weight:700;color:#374151;min-height:28px">{name or ""}</p>'
        f'<p style="font-size:7pt;color:#6b7280">{role or "—"}</p>'
        f'<p style="font-size:7pt;color:#9ca3af;margin-top:2px">{title}</p>'
        f'</div>'
    )


def _val(v, default="—") -> str:
    return str(v) if v else default


# ── ANEXO 01: Compromiso de la máxima autoridad ───────────────────────────────

def _anexo01_html(company_name: str, company_ruc: str, elab_by: str) -> str:
    return f"""
<div style="page-break-before:always;padding:16mm 20mm;font-family:Arial,Helvetica,sans-serif">
  <p style="font-size:9pt;font-weight:700;color:#16a34a;text-align:center;
             letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">
    ANEXO 01
  </p>
  <h2 style="font-size:14pt;font-weight:900;color:#111827;text-align:center;margin-bottom:2px">
    COMPROMISO DE LA MÁXIMA AUTORIDAD
  </h2>
  <p style="text-align:center;font-size:8pt;color:#6b7280;margin-bottom:20px">
    Matriz GERITRA — Gestión Técnica de Riesgos del Trabajo
  </p>

  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;
              background:#f9fafb">
    <p style="font-size:10pt;color:#374151;line-height:1.8;margin:0">
      En _____________ a los _____ días del mes de _____________ del 20__,
    </p>
    <br>
    <p style="font-size:10pt;color:#374151;line-height:1.8;margin:0">
      Yo <span style="border-bottom:1px solid #374151;display:inline-block;min-width:120px">
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      representante legal de
      <strong>{company_name}</strong>
      con RUC <strong>{company_ruc or "______________________"}</strong>,
      expreso que, al amparo de la política de Seguridad y Salud Ocupacional
      de la organización, asumo el compromiso de realizar la gestión de prevención
      de riesgos, basada en los parámetros establecidos en la
      <strong>"MATRIZ DE GESTIÓN DE RIESGOS DEL TRABAJO (GERITRA),
      UNA HERRAMIENTA TÉCNICA PARA LA GESTIÓN DE SEGURIDAD Y SALUD LABORAL"</strong>,
      por lo tanto pongo en manifiesto que se entregarán los recursos necesarios
      para las tareas de control, seguimiento y vigilancia de la salud de los trabajadores.
    </p>
  </div>

  <div style="display:flex;gap:32px;margin-top:32px">
    {_firma_box("Representante legal", "", "Máxima Autoridad")}
    {_firma_box("Responsable SST", elab_by, "Técnico de Seguridad")}
    {_firma_box("Fecha de firma", "", "")}
  </div>

  <div style="margin-top:32px;background:#fef9c3;border:1px solid #fde68a;
              border-radius:6px;padding:10px 14px">
    <p style="font-size:8pt;color:#92400e;margin:0">
      <strong>Nota:</strong> Este documento debe ser firmado por la máxima autoridad de
      la organización antes del inicio del proceso de evaluación de riesgos.
      El original debe conservarse en el archivo de SST de la empresa.
    </p>
  </div>
</div>"""


# ── ANEXO 03: Detalle de procesos, puestos y actividades ─────────────────────

def _anexo03_html(
    company_name: str,
    position: dict,
    rows: list,
) -> str:
    pos_name     = _val(position.get("name"))
    department   = _val(position.get("department"))
    area         = _val(position.get("area"))
    process      = _val(position.get("process"))
    num_workers  = _val(position.get("num_workers"), "1")
    has_disab    = position.get("has_disability", False)
    disab_pct    = position.get("disability_pct")
    routine      = _val(position.get("routine_activity"))
    non_routine  = _val(position.get("non_routine_activity"))
    machinery    = _val(position.get("machinery"))
    tech_aids    = _val(position.get("technical_aids"))
    description  = _val(position.get("description"))

    disab_txt = "Sí"
    if has_disab and disab_pct:
        disab_txt = f"Sí — {disab_pct}%"
    elif not has_disab:
        disab_txt = "No"

    # Tabla de peligros identificados para este puesto
    peligros_rows = ""
    for i, r in enumerate(rows, 1):
        tipo   = RISK_TYPE_LABEL.get(r.get("risk_type", ""), "—")
        nivel  = NIVEL_LABEL.get(r.get("nivel_riesgo", ""), "—")
        r_nivel = NIVEL_LABEL.get(r.get("res_nivel_riesgo", ""), "—")
        color  = NIVEL_COLOR.get(r.get("nivel_riesgo", ""), "#9ca3af")
        r_color = NIVEL_COLOR.get(r.get("res_nivel_riesgo", ""), "#9ca3af")
        bg     = "#fff" if i % 2 == 0 else "#f9fafb"
        ctrl_n = len(r.get("controls", []))
        peligros_rows += f"""
        <tr style="background:{bg}">
          <td style="text-align:center;font-weight:700;color:#6b7280">{i}</td>
          <td>{_val(r.get("category_name"))}</td>
          <td style="font-weight:600">{_val(r.get("peligro"))}</td>
          <td style="color:#6b7280;font-size:8px">{_val(r.get("efecto"))}</td>
          <td style="color:#6b7280;font-size:8px">{tipo}</td>
          <td style="text-align:center">
            <span style="background:{color};color:#fff;padding:2px 5px;
              border-radius:4px;font-size:7.5px;font-weight:700">{nivel}</span>
          </td>
          <td style="text-align:center">{ctrl_n}</td>
          <td style="text-align:center">
            <span style="background:{r_color};color:#fff;padding:2px 5px;
              border-radius:4px;font-size:7.5px;font-weight:700">{r_nivel}</span>
          </td>
        </tr>"""

    def _info_row(label, value, highlight=False):
        bg = 'background:#f0fdf4;' if highlight else ''
        return (
            f'<tr style="{bg}">'
            f'<td style="width:35%;font-weight:600;color:#374151;padding:6px 10px;'
            f'border:1px solid #e5e7eb;font-size:9pt">{label}</td>'
            f'<td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:9pt">{value}</td>'
            f'</tr>'
        )

    return f"""
<div style="page-break-before:always;padding:12mm 16mm;font-family:Arial,Helvetica,sans-serif">
  <p style="font-size:9pt;font-weight:700;color:#16a34a;text-align:center;
             letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">
    ANEXO 03
  </p>
  <h2 style="font-size:13pt;font-weight:900;color:#111827;text-align:center;margin-bottom:2px">
    DETALLE DE PROCESOS, PUESTOS DE TRABAJO Y ACTIVIDADES
  </h2>
  <p style="text-align:center;font-size:8pt;color:#6b7280;margin-bottom:16px">
    {company_name}
  </p>

  <!-- Datos del puesto -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:#16a34a">
        <td colspan="2" style="padding:6px 10px;color:#fff;font-weight:700;
          font-size:9pt;letter-spacing:.5px">
          IDENTIFICACIÓN DEL PUESTO DE TRABAJO
        </td>
      </tr>
    </thead>
    <tbody>
      {_info_row("Puesto de trabajo",   pos_name,    highlight=True)}
      {_info_row("Departamento",        department)}
      {_info_row("Área",                area)}
      {_info_row("Proceso",             process)}
      {_info_row("N° de trabajadores",  num_workers)}
      {_info_row("Persona con discapacidad", disab_txt)}
      {_info_row("Ayudas técnicas",     tech_aids) if has_disab else ""}
      {_info_row("Observaciones discapacidad", description) if has_disab and description != "—" else ""}
    </tbody>
  </table>

  <!-- Actividades -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:#1d4ed8">
        <td colspan="2" style="padding:6px 10px;color:#fff;font-weight:700;font-size:9pt">
          ACTIVIDADES
        </td>
      </tr>
    </thead>
    <tbody>
      {_info_row("Actividades rutinarias (Paso 7)",       routine)}
      {_info_row("Actividades no rutinarias (Paso 8)",   non_routine)}
      {_info_row("Máquinas, equipos y energías (Paso 9)", machinery)}
    </tbody>
  </table>

  <!-- Peligros identificados -->
  <p style="font-size:9pt;font-weight:700;color:#374151;margin-bottom:6px">
    PELIGROS IDENTIFICADOS Y NIVELES DE RIESGO
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:8.5pt">
    <thead>
      <tr style="background:#374151;color:#fff">
        <th style="padding:5px 6px;width:24px">#</th>
        <th style="padding:5px 6px;text-align:left">Categoría</th>
        <th style="padding:5px 6px;text-align:left">Peligro</th>
        <th style="padding:5px 6px;text-align:left">Efecto</th>
        <th style="padding:5px 6px;text-align:left">Tipo de riesgo</th>
        <th style="padding:5px 6px;text-align:center">Nivel inicial</th>
        <th style="padding:5px 6px;text-align:center">Controles</th>
        <th style="padding:5px 6px;text-align:center">Nivel residual</th>
      </tr>
    </thead>
    <tbody>
      {peligros_rows if peligros_rows else
       '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:16px">Sin riesgos evaluados</td></tr>'}
    </tbody>
  </table>

  <!-- Firmas Anexo 03 -->
  <div style="display:flex;gap:32px;margin-top:28px">
    {_firma_box("Jefe de Talento Humano", "", "")}
    {_firma_box("Gestión por Procesos",   "", "")}
    {_firma_box("Seguridad y Salud en el Trabajo", "", "")}
  </div>
</div>"""


# ── Función principal ─────────────────────────────────────────────────────────

def generate_geritra_pdf(
    *,
    matrix: dict,
    position: dict = None,
    company_name: str,
    company_ruc: str = "",
    company_address: str = "",
    company_phone: str = "",
    org_name: str = "",
    logo_path: str = None,
) -> bytes:
    position  = position or {}
    rows      = matrix.get("rows", [])
    pos_name  = matrix.get("job_position_name") or position.get("name") or "—"
    version   = matrix.get("version", 1)
    status    = matrix.get("status", "BORRADOR")
    elab_by   = matrix.get("elaborated_by") or "—"
    elab_role = matrix.get("elaborated_role") or ""
    rev_by    = matrix.get("reviewed_by")  or "—"
    rev_role  = matrix.get("reviewed_role") or ""
    app_by    = matrix.get("approved_by")  or "—"
    app_role  = matrix.get("approved_role") or ""
    notes     = matrix.get("notes") or ""
    created   = _date_long(matrix.get("created_at"))

    # KPIs evaluación inicial
    total       = len(rows)
    intolerable = sum(1 for r in rows if r.get("nivel_riesgo") == "INTOLERABLE")
    importante  = sum(1 for r in rows if r.get("nivel_riesgo") == "IMPORTANTE")
    moderado    = sum(1 for r in rows if r.get("nivel_riesgo") == "MODERADO")
    tolerable   = sum(1 for r in rows if r.get("nivel_riesgo") == "TOLERABLE")
    trivial     = sum(1 for r in rows if r.get("nivel_riesgo") == "TRIVIAL")

    # KPIs riesgo residual
    r_intolerable = sum(1 for r in rows if r.get("res_nivel_riesgo") == "INTOLERABLE")
    r_importante  = sum(1 for r in rows if r.get("res_nivel_riesgo") == "IMPORTANTE")
    r_moderado    = sum(1 for r in rows if r.get("res_nivel_riesgo") == "MODERADO")

    logo_tag = ""
    if logo_path:
        b64 = _logo_b64(logo_path)
        if b64:
            logo_tag = f'<img src="{b64}" style="height:44px;object-fit:contain;margin-bottom:4px">'

    # ── Filas de la tabla ────────────────────────────────────────────────────
    rows_html = ""
    for i, row in enumerate(rows, 1):
        bg = "#fff" if i % 2 == 0 else "#f9fafb"

        def v(k): return row.get(k) or "—"

        # Efectos sobre la salud, vigilancia, fecha control, mejora continua
        health_eff  = row.get("health_effects")      or ""
        health_surv = row.get("health_surveillance")  or ""
        ctrl_date   = _date_long(row.get("control_date")) if row.get("control_date") else "—"
        improv      = row.get("improvement_notes")   or ""

        extra_cols = ""
        if health_eff or health_surv or ctrl_date != "—" or improv:
            extra_cols = (
                f'<td style="font-size:7px;max-width:70px">{health_eff[:80] or "—"}</td>'
                f'<td style="font-size:7px;max-width:70px">{health_surv[:80] or "—"}</td>'
                f'<td style="font-size:7px;text-align:center">{ctrl_date}</td>'
                f'<td style="font-size:7px;max-width:70px">{improv[:80] or "—"}</td>'
            )
        else:
            extra_cols = (
                '<td style="color:#d1d5db;text-align:center;font-size:7px">—</td>'
                '<td style="color:#d1d5db;text-align:center;font-size:7px">—</td>'
                '<td style="color:#d1d5db;text-align:center;font-size:7px">—</td>'
                '<td style="color:#d1d5db;text-align:center;font-size:7px">—</td>'
            )

        rows_html += f"""
        <tr style="background:{bg}">
          <td style="text-align:center;font-weight:700;color:#6b7280">{i}</td>
          <td style="color:#6b7280;font-size:7.5px">{v("category_name")}</td>
          <td>
            <strong style="font-size:8.5px">{v("peligro")}</strong>
            <div style="color:#6b7280;font-size:7px">{row.get("efecto") or ""}</div>
          </td>
          <td style="text-align:center">{v("ip")}</td>
          <td style="text-align:center">{v("ic")}</td>
          <td style="text-align:center">{v("ice")}</td>
          <td style="text-align:center">{v("ie")}</td>
          <td style="text-align:center">{v("consecuencia")}</td>
          <td style="text-align:center;font-weight:700">{v("probabilidad")}</td>
          <td style="text-align:center;font-weight:700">{v("estimacion")}</td>
          <td style="text-align:center">{_nivel_badge(row.get("nivel_riesgo",""))}</td>
          <td style="font-size:7.5px">{_controls_html(row.get("controls",[]))}</td>
          <td style="text-align:center">{v("res_ip")}</td>
          <td style="text-align:center">{v("res_ic")}</td>
          <td style="text-align:center">{v("res_ice")}</td>
          <td style="text-align:center">{v("res_ie")}</td>
          <td style="text-align:center">{v("res_consecuencia")}</td>
          <td style="text-align:center;font-weight:700">{v("res_probabilidad")}</td>
          <td style="text-align:center;font-weight:700">{v("res_estimacion")}</td>
          <td style="text-align:center">{_nivel_badge(row.get("res_nivel_riesgo",""))}</td>
          {extra_cols}
        </tr>"""

    # ¿Hay datos de gestión residual en alguna fila?
    has_gestion = any(
        row.get("health_effects") or row.get("health_surveillance") or
        row.get("control_date") or row.get("improvement_notes")
        for row in rows
    )

    gestion_headers = ""
    if has_gestion:
        gestion_headers = """
          <th colspan="4" style="background:#065f46;color:#fff;font-size:7pt;
            padding:4px 3px;text-align:center;font-weight:700;border:1px solid #064e3b">
            GESTIÓN RESIDUAL (Pasos 34–37)
          </th>"""
        gestion_sub = """
          <th style="background:#065f46;color:#fff;font-size:6.5pt;padding:3px;
            border:1px solid #064e3b" title="Efectos sobre la salud (Paso 34)">Efect. salud</th>
          <th style="background:#065f46;color:#fff;font-size:6.5pt;padding:3px;
            border:1px solid #064e3b" title="Vigilancia de la salud (Paso 35)">Vigilancia</th>
          <th style="background:#065f46;color:#fff;font-size:6.5pt;padding:3px;
            border:1px solid #064e3b" title="Fecha de control e inspecciones (Paso 36)">F. control</th>
          <th style="background:#065f46;color:#fff;font-size:6.5pt;padding:3px;
            border:1px solid #064e3b" title="Actividades de mejora continua (Paso 37)">Mejora</th>"""
    else:
        gestion_sub = ""

    legend_html = "".join(
        f'<div style="display:flex;align-items:center;gap:4px;font-size:7pt;font-weight:600">'
        f'<div style="width:10px;height:10px;border-radius:3px;background:{c}"></div>{l}</div>'
        for l, c in [
            ("Trivial",     NIVEL_COLOR["TRIVIAL"]),
            ("Tolerable",   NIVEL_COLOR["TOLERABLE"]),
            ("Moderado",    NIVEL_COLOR["MODERADO"]),
            ("Importante",  NIVEL_COLOR["IMPORTANTE"]),
            ("Intolerable", NIVEL_COLOR["INTOLERABLE"]),
        ]
    )

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
@page {{
  size: A4 landscape;
  margin: 10mm 8mm 12mm 8mm;
  @top-left   {{ content: element(hdr-left);  vertical-align: bottom; }}
  @top-right  {{ content: element(hdr-right); vertical-align: bottom; }}
  @bottom-center {{
    content: "Página " counter(page) " de " counter(pages)
             " · GERITRA — Gestión Técnica de Riesgos del Trabajo";
    font-size: 7pt; color: #9ca3af;
  }}
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #1f2937; }}
#hdr-left  {{ position: running(hdr-left);  }}
#hdr-right {{ position: running(hdr-right); }}
.hdr {{ border-bottom: 2px solid #16a34a; padding-bottom: 3px; }}
table {{ width: 100%; border-collapse: collapse; font-size: 7.5pt; }}
th {{ padding: 4px 3px; text-align: center; font-weight: 700; border: 1px solid rgba(0,0,0,.15); }}
td {{ padding: 4px 3px; border: 1px solid #e5e7eb; vertical-align: top; }}
.sec-eval  {{ background: #1d4ed8; color:#fff; }}
.sec-ctrl  {{ background: #7c3aed; color:#fff; }}
.sec-resid {{ background: #b45309; color:#fff; }}
</style>
</head>
<body>

<!-- Running header -->
<div id="hdr-left" class="hdr">
  <span style="font-size:8pt;font-weight:700;color:#16a34a">GERITRA</span>
  <span style="font-size:7pt;color:#6b7280"> · {company_name}</span>
</div>
<div id="hdr-right" class="hdr" style="text-align:right">
  <span style="font-size:7pt;color:#6b7280">
    Puesto: <strong>{pos_name}</strong> · v{version} · {status}
  </span>
</div>

<!-- ══ PORTADA ══ -->
<div style="page-break-after:always;display:flex;flex-direction:column;
            align-items:center;justify-content:center;min-height:155mm;gap:14px">

  {logo_tag}

  <div style="text-align:center">
    <p style="font-size:8pt;color:#6b7280;font-weight:600;letter-spacing:1.5px;
               text-transform:uppercase;margin-bottom:4px">{org_name}</p>
    <h1 style="font-size:24pt;font-weight:900;color:#16a34a;margin-bottom:2px">
      MATRIZ GERITRA
    </h1>
    <h2 style="font-size:12pt;color:#374151;font-weight:400">
      Gestión Técnica de Riesgos del Trabajo
    </h2>
  </div>

  <!-- Info empresa/puesto -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;
              width:100%;max-width:200mm">
    {"".join(f'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px">'
             f'<div style="font-size:7pt;color:#6b7280;font-weight:700;text-transform:uppercase">{lbl}</div>'
             f'<div style="font-size:10pt;font-weight:600;color:#111827;margin-top:2px">{val}</div></div>'
             for lbl, val in [
               ("Empresa",               company_name),
               ("RUC",                   company_ruc   or "—"),
               ("Puesto de trabajo",     pos_name),
               ("Departamento",          position.get("department") or "—"),
               ("Estado / Versión",      f"{status} · v{version}"),
               ("Trabajadores en puesto", str(position.get("num_workers") or "—")),
               ("Elaborado por",         elab_by),
               ("Revisado / Aprobado",   f"{rev_by} / {app_by}"),
             ])}
    <div style="grid-column:span 2;background:#f9fafb;border:1px solid #e5e7eb;
                border-radius:6px;padding:8px 12px">
      <div style="font-size:7pt;color:#6b7280;font-weight:700;text-transform:uppercase">
        Fecha de elaboración</div>
      <div style="font-size:10pt;font-weight:600;color:#111827;margin-top:2px">{created}</div>
    </div>
  </div>

  {f'<div style="max-width:200mm;width:100%;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 14px"><p style="font-size:8pt;color:#92400e"><strong>Observaciones:</strong> {notes}</p></div>' if notes else ""}

  <!-- KPIs evaluación inicial vs residual -->
  <div style="display:flex;gap:8px;max-width:200mm;width:100%">
    {"".join(f'<div style="flex:1;border-radius:8px;padding:8px;text-align:center;background:{bg}">'
             f'<div style="font-size:15pt;font-weight:900;color:{cl}">{ini}</div>'
             f'<div style="font-size:6pt;font-weight:600;color:{cl};margin-top:1px">{lbl}</div>'
             f'<div style="font-size:6pt;color:{cl};opacity:.7">→ {res} residual</div>'
             f'</div>'
             for lbl, ini, res, cl, bg in [
               ("Intolerable", intolerable, r_intolerable, "#dc2626", "#fee2e2"),
               ("Importante",  importante,  r_importante,  "#ea580c", "#ffedd5"),
               ("Moderado",    moderado,    r_moderado,    "#d97706", "#fef9c3"),
               ("Tolerable",   tolerable,   "—",           "#2563eb", "#dbeafe"),
               ("Trivial",     trivial,     "—",           "#16a34a", "#dcfce7"),
               ("Total",       total,       "—",           "#374151", "#f3f4f6"),
             ])}
  </div>
</div>

<!-- ══ TABLA DE RIESGOS ══ -->
<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
  {legend_html}
</div>

<table>
  <thead>
    <tr>
      <th rowspan="2" style="background:#16a34a;color:#fff;width:22px">#</th>
      <th rowspan="2" style="background:#16a34a;color:#fff;width:52px">Categoría</th>
      <th rowspan="2" style="background:#16a34a;color:#fff;width:96px">Peligro / Efecto</th>
      <th colspan="8" class="sec-eval">EVALUACIÓN INICIAL</th>
      <th rowspan="2" class="sec-ctrl" style="width:76px">Jerarquía de controles</th>
      <th colspan="8" class="sec-resid">RIESGO RESIDUAL</th>
      {gestion_headers}
    </tr>
    <tr>
      <th class="sec-eval" title="Índice Personas Expuestas">IP</th>
      <th class="sec-eval" title="Índice Capacitación">IC</th>
      <th class="sec-eval" title="Índice Controles Existentes">ICE</th>
      <th class="sec-eval" title="Índice Exposición">IE</th>
      <th class="sec-eval" title="Consecuencia">C</th>
      <th class="sec-eval" title="Probabilidad">P</th>
      <th class="sec-eval" title="Estimación de Riesgo">ER</th>
      <th class="sec-eval">Nivel</th>
      <th class="sec-resid">IP</th>
      <th class="sec-resid">IC</th>
      <th class="sec-resid">ICE</th>
      <th class="sec-resid">IE</th>
      <th class="sec-resid">C</th>
      <th class="sec-resid">P</th>
      <th class="sec-resid">ER</th>
      <th class="sec-resid">Nivel</th>
      {gestion_sub}
    </tr>
  </thead>
  <tbody>
    {rows_html or
     '<tr><td colspan="20" style="text-align:center;color:#9ca3af;padding:20px">'
     'Sin riesgos evaluados</td></tr>'}
  </tbody>
</table>

<!-- Firmas de la matriz -->
<div style="margin-top:16px;display:flex;gap:20px;justify-content:space-around">
  {_firma_box("Elaborado por", elab_by, elab_role)}
  {_firma_box("Revisado por",  rev_by,  rev_role)}
  {_firma_box("Aprobado por",  app_by,  app_role)}
</div>

<!-- ══ ANEXO 01 ══ -->
{_anexo01_html(company_name, company_ruc, elab_by)}

<!-- ══ ANEXO 03 ══ -->
{_anexo03_html(company_name, position, rows)}

</body>
</html>"""

    return HTML(string=html, base_url="/").write_pdf()