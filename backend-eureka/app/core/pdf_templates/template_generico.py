"""
Template genérico para cualquier tipo de inspección.
- Encabezado institucional que se repite en CADA página (running header)
- Soporta los tres modos: FORMULARIO, MATRIZ, FORMULARIO_MATRIZ
- Fila azul con nombre del SG-SST y tipo de inspección
"""
import base64, os
from datetime import datetime

from weasyprint import HTML

MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]


def _date_long(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str):
        try: dt = datetime.fromisoformat(dt[:10])
        except: return str(dt)
    return f"{dt.day} de {MESES[dt.month]} de {dt.year}"


def _date_short(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str): return dt[:10]
    return dt.strftime("%d/%m/%Y")


def _logo_b64(logo_path):
    if not logo_path or not os.path.exists(logo_path): return ""
    ext = os.path.splitext(logo_path)[1].lower().replace(".", "")
    mime = "image/svg+xml" if ext == "svg" else \
           f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"
    with open(logo_path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


def _fmt(field_type, value):
    if value is None or value == "": return "—"
    ft = str(field_type)
    if ft == "check_sn":
        return "✔ Sí" if str(value) == "S" else "✘ No"
    if ft == "check_bm":
        return "✔ Bueno" if str(value) == "B" else "✗ Malo"
    if ft == "check_sna":
        return {"S": "✔ Sí", "N": "✘ No", "NA": "N/A"}.get(str(value), str(value))
    return str(value)


def _is_check(ft):
    return str(ft) in ("check_sn", "check_bm", "check_sna")


# ── Encabezado que se repite en cada página ───────────────────────────────────

def _running_header(logo_src, company_name, insp_number, insp_type_name, fecha_hoy):
    logo_html = (
        f'<img src="{logo_src}" style="max-height:55px;max-width:110px;object-fit:contain">'
        if logo_src else
        f'<span style="font-size:9pt;font-weight:bold">{company_name}</span>'
    )
    return f"""
<div class="running-header">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <tr>
      <td rowspan="3" style="width:90px;border:1.5px solid #000;
          text-align:center;vertical-align:middle;padding:4px;">
        {logo_html}
      </td>
      <td rowspan="3" style="border:1.5px solid #000;text-align:center;
          vertical-align:middle;font-size:13pt;font-weight:bold;padding:4px 8px;">
        {company_name}
      </td>
      <td style="width:130px;border:1.5px solid #000;font-size:7.5pt;
          font-weight:bold;padding:3px 8px;text-align:right;">VERSIÓN: 01</td>
    </tr>
    <tr>
      <td style="border:1.5px solid #000;font-size:7.5pt;
          font-weight:bold;padding:3px 8px;text-align:right;">
        CÓDIGO: {insp_number or "—"}
      </td>
    </tr>
    <tr>
      <td style="border:1.5px solid #000;font-size:7.5pt;
          font-weight:bold;padding:3px 8px;text-align:right;">
        FECHA: {fecha_hoy}
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border:1.5px solid #000;background:#1f3864;
          color:#fff;text-align:center;font-size:8.5pt;font-weight:bold;padding:4px;">
        SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border:1.5px solid #000;background:#1f3864;
          color:#fff;text-align:center;font-size:8.5pt;font-weight:bold;padding:4px;">
        INSPECCIÓN DE {insp_type_name.upper()}
      </td>
    </tr>
  </table>
</div>
"""


# ── Secciones de contenido ────────────────────────────────────────────────────

def _info_table(insp):
    hora = ""
    if insp.start_time:
        hora = insp.start_time
        if insp.end_time:
            hora += f" – {insp.end_time}"
    return f"""
<table class="it">
  <tr>
    <td class="lbl">CÓDIGO:</td>
    <td>{getattr(insp, "inspection_number", "") or "—"}</td>
    <td class="lbl">FECHA:</td>
    <td>{_date_long(insp.scheduled_date)}</td>
  </tr>
  <tr>
    <td class="lbl">LUGAR / ÁREA:</td>
    <td>{insp.location or "—"}</td>
    <td class="lbl">HORA:</td>
    <td>{hora or "—"}</td>
  </tr>
  <tr>
    <td class="lbl">ELABORADO POR:</td>
    <td>{insp.elaborated_by or "—"}</td>
    <td class="lbl">RESPONSABLE:</td>
    <td>{insp.assigned_to_name or "—"}</td>
  </tr>
</table>
"""


def _general_data_section(general_fields, general_data: dict, num: int) -> str:
    if not general_fields:
        return ""
    groups: dict = {}
    for f in sorted(general_fields, key=lambda x: x.order):
        groups.setdefault(f.group_name or "", []).append(f)

    html = f"<h2>{num}. Datos generales</h2>"
    for group_name, gfields in groups.items():
        if group_name:
            html += f"<p class='grp'>{group_name}</p>"
        html += "<table class='it'>"
        for f in gfields:
            val = _fmt(f.field_type, general_data.get(f.field_key, ""))
            html += f"<tr><td class='lbl'>{f.name}</td><td>{val}</td></tr>"
        html += "</table>"
    return html


def _formulario_section(fields, records, num: int) -> str:
    html = f"<h2>{num}. Respuestas del formulario</h2>"
    if not records:
        return html + "<p class='i'>Sin respuestas registradas.</p>"

    record = records[0]
    vals = {v.field_id: v.value for v in record.values}
    groups: dict = {}
    for f in sorted(fields, key=lambda x: x.order):
        groups.setdefault(f.group_name or "", []).append(f)

    for group_name, gfields in groups.items():
        if group_name:
            html += f"<p class='grp'>{group_name}</p>"
        html += "<table class='it'>"
        for f in gfields:
            val = _fmt(f.field_type, vals.get(f.id, ""))
            cls = " c" if _is_check(f.field_type) else ""
            html += f"<tr><td class='lbl'>{f.name}</td><td class='{cls}'>{val}</td></tr>"
        html += "</table>"

    if record.has_finding:
        html += "<p class='finding'>⚠ Se registraron hallazgos en esta inspección.</p>"
    return html


def _matrix_section(fields, records, num: int) -> str:
    if not fields:
        return ""
    header_cells = "".join(f"<th>{f.name}</th>" for f in fields)
    rows_html = ""
    for i, r in enumerate(records, 1):
        vals = {v.field_id: v.value for v in r.values}
        cells = "".join(
            f'<td class="{"c" if _is_check(f.field_type) else ""}">'
            f'{_fmt(f.field_type, vals.get(f.id, ""))}</td>'
            for f in fields
        )
        cls = 'class="f"' if r.has_finding else ""
        rows_html += f'<tr {cls}><td class="c n">{i:03d}</td>{cells}</tr>'

    if not rows_html:
        cols = len(fields) + 1
        rows_html = f'<tr><td colspan="{cols}" class="c i">Sin registros</td></tr>'

    return f"""
<h2>{num}. Registros de inspección</h2>
<div class="scroll-wrap">
<table class="dt">
  <thead><tr>
    <th class="c" style="width:38px">N°</th>{header_cells}
  </tr></thead>
  <tbody>{rows_html}</tbody>
</table>
</div>
"""


def _actions_section(actions, num: int) -> str:
    rows = ""
    for a in actions:
        rows += f"""<tr>
          <td class="c">{a.item_ref or "—"}</td>
          <td>{a.description}</td>
          <td>{a.action or "—"}</td>
          <td class="c"><b>{a.priority or "—"}</b></td>
          <td>{a.responsible_name or "—"}</td>
          <td class="c">{_date_short(a.due_date_start)}</td>
          <td class="c">{_date_short(a.due_date_end)}</td>
        </tr>"""
    if not rows:
        rows = '<tr><td colspan="7" class="c i">Sin acciones correctivas</td></tr>'
    return f"""
<h2>{num}. Hallazgos y acciones correctivas</h2>
<table class="dt">
  <thead><tr>
    <th>Ítem</th><th>Hallazgo</th><th>Acción correctiva</th>
    <th class="c">Clase</th><th>Responsable</th>
    <th class="c">Inicio</th><th class="c">Fin</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>
"""


def _firmas(insp) -> str:
    return f"""
<table class="firmas">
  <tr>
    <td></td><td></td><td></td>
  </tr>
  <tr>
    <td class="fl">ELABORADO POR:</td>
    <td class="fl">REVISADO POR:</td>
    <td class="fl">APROBADO POR:</td>
  </tr>
  <tr>
    <td class="fn">{insp.elaborated_by or "___________________"}</td>
    <td class="fn">{insp.reviewed_by or "___________________"}</td>
    <td class="fn">{insp.approved_by or "___________________"}</td>
  </tr>
  <tr>
    <td class="fr">{insp.elaborated_role or ""}</td>
    <td class="fr">{insp.reviewed_role or ""}</td>
    <td class="fr">{insp.approved_role or ""}</td>
  </tr>
</table>
"""


# ── Función principal ─────────────────────────────────────────────────────────

def generate(insp, company, **kwargs) -> bytes:
    structure    = str(getattr(insp, "structure_type", "matriz") or "matriz")
    all_fields   = sorted(insp.inspection_type_fields, key=lambda f: f.order)
    general_data = getattr(insp, "general_data", None) or {}

    general_fields = [f for f in all_fields if str(getattr(f, "scope", "matriz")) == "general"]
    matrix_fields  = [f for f in all_fields if str(getattr(f, "scope", "matriz")) != "general"]

    logo_src   = _logo_b64(getattr(company, "logo_path", None))
    fecha_hoy  = _date_short(datetime.now())
    insp_num   = getattr(insp, "inspection_number", "") or "—"

    header_html = _running_header(
        logo_src, company.razon_social,
        insp_num, insp.inspection_type_name, fecha_hoy
    )

    # ── Cuerpo según estructura ───────────────────────────────────────────────
    body  = ""
    n     = 1

    if structure == "formulario":
        if general_fields and general_data:
            body += _general_data_section(general_fields, general_data, n); n += 1
        body += _formulario_section(matrix_fields or general_fields, insp.records, n); n += 1

    elif structure == "formulario_matriz":
        if general_fields and general_data:
            body += _general_data_section(general_fields, general_data, n); n += 1
        body += _matrix_section(matrix_fields, insp.records, n); n += 1

    else:  # matriz
        body += _matrix_section(matrix_fields or all_fields, insp.records, n); n += 1

    body += _actions_section(insp.actions, n); n += 1

    if getattr(insp, "general_observations", None):
        body += f"<h2>{n}. Observaciones generales</h2><p>{insp.general_observations}</p>"; n += 1
    if getattr(insp, "recommendations", None):
        body += f"<h2>{n}. Recomendaciones</h2><p>{insp.recommendations}</p>"

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  /* ── Página ── */
  @page {{
    size: A4 portrait;
    margin: 55mm 12mm 18mm 12mm;
    @top-left {{ content: element(running-header); width: 100%; }}
  }}

  * {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }}
  body {{ font-size:9pt; color:#1a1a1a; line-height:1.45; }}

  /* ── Running header ── */
  .running-header {{
    position: running(running-header);
    width: 100%;
  }}

  /* ── Tabla info de inspección ── */
  .it {{ width:100%; border-collapse:collapse; margin-bottom:10px; }}
  .it td {{ border:1px solid #ccc; padding:4px 8px; font-size:8.5pt; }}
  .it td.lbl {{ font-weight:bold; background:#f0f0f0; width:22%; white-space:nowrap; }}
  .it td.c {{ text-align:center; }}

  /* ── Secciones ── */
  h2 {{ font-size:10pt; font-weight:bold; color:#1f3864; margin:14px 0 6px;
        border-bottom:1.5px solid #1f3864; padding-bottom:3px; }}
  p {{ margin-bottom:6px; font-size:8.5pt; }}
  p.grp {{ font-weight:bold; color:#444; margin:8px 0 3px; font-size:8pt;
           text-transform:uppercase; letter-spacing:.4px; }}
  p.finding {{ background:#fff3cd; border-left:3px solid #f59e0b;
               padding:4px 8px; margin:6px 0; font-size:8pt; }}
  p.i {{ color:#888; font-style:italic; }}

  /* ── Tabla de registros (matriz) ── */
  .scroll-wrap {{ width:100%; overflow-x:auto; }}
  table.dt {{ width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:10px; }}
  table.dt th {{ background:#1f3864; color:#fff; border:1px solid #888;
                 padding:4px 6px; text-align:left; font-size:7.5pt; line-height:1.3; }}
  table.dt td {{ border:1px solid #ccc; padding:4px 6px; vertical-align:middle; }}
  table.dt td.c {{ text-align:center; }}
  table.dt td.n {{ text-align:center; font-weight:bold; color:#555; width:38px; }}
  table.dt td.i {{ font-style:italic; color:#888; }}
  table.dt tr.f td {{ background:#fff3cd; }}

  /* ── Firmantes ── */
  table.firmas {{ width:100%; border-collapse:collapse; margin-top:28px; }}
  table.firmas td {{ border:1px solid #000; padding:6px 8px;
                     text-align:center; font-size:8pt; width:33.3%; }}
  table.firmas tr:first-child td {{ height:42px; border-bottom:none; }}
  table.firmas td.fl {{ font-weight:bold; background:#f0f0f0; }}
  table.firmas td.fn {{ font-weight:bold; }}
  table.firmas td.fr {{ color:#555; font-size:7.5pt; }}
</style>
</head>
<body>

{header_html}

{_info_table(insp)}

{body}

{_firmas(insp)}

</body>
</html>"""

    return HTML(string=html, base_url="/").write_pdf()