"""
Template genérico para cualquier tipo de inspección.
Funciona con cualquier combinación de campos — no asume nada sobre el tipo.
"""
import base64, os
from datetime import datetime

from weasyprint import HTML

MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

def _date_long(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str): dt = datetime.fromisoformat(dt[:10])
    return f"{dt.day} de {MESES[dt.month]} de {dt.year}"

def _date_short(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str): return dt[:10]
    return dt.strftime("%d/%m/%Y")

def _logo_b64(logo_path):
    if not logo_path or not os.path.exists(logo_path): return ""
    ext = os.path.splitext(logo_path)[1].lower().replace(".", "")
    mime = "image/svg+xml" if ext == "svg" else f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"
    with open(logo_path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"

def _fmt(field_type, value):
    if not value: return "—"
    if field_type == "check_sn": return "✔ Sí" if value == "S" else "✘ No"
    if field_type == "check_bm": return "✔ Bueno" if value == "B" else "✗ Malo"
    return value

def generate(insp, company) -> bytes:
    fields = sorted(insp.inspection_type_fields, key=lambda f: f.order)
    logo_src = _logo_b64(getattr(company, "logo_path", None))
    logo_html = f'<img src="{logo_src}" class="logo">' if logo_src else '<div class="logo-ph"></div>'

    header_cells = "".join(f"<th>{f.name}</th>" for f in fields)
    records_rows = ""
    for i, r in enumerate(insp.records, 1):
        vals = {v.field_id: v.value for v in r.values}
        cells = "".join(
            f'<td class="{"c" if f.field_type in ("check_sn","check_bm") else ""}">'
            f'{_fmt(f.field_type, vals.get(f.id,""))}</td>'
            for f in fields
        )
        cls = 'class="f"' if r.has_finding else ""
        records_rows += f"<tr {cls}><td class='c n'>{i:03d}</td>{cells}</tr>"

    actions_rows = ""
    for a in insp.actions:
        actions_rows += f"""<tr>
          <td class="c">{a.item_ref or "—"}</td>
          <td>{a.description}</td>
          <td>{a.action or "—"}</td>
          <td class="c"><b>{a.priority or "—"}</b></td>
          <td>{a.responsible_name or "—"}</td>
          <td>{_date_short(a.due_date_start)}</td>
          <td>{_date_short(a.due_date_end)}</td>
        </tr>"""
    if not actions_rows:
        actions_rows = '<tr><td colspan="7" class="c i">Sin acciones correctivas</td></tr>'

    html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>
  @page {{ margin:15mm 12mm; }}
  * {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }}
  body {{ font-size:9pt; color:#1a1a1a; }}
  .hdr {{ width:100%; border-collapse:collapse; margin-bottom:8px; }}
  .hdr td {{ border:1px solid #000; padding:4px 8px; font-size:8pt; vertical-align:middle; }}
  .hdr .lc {{ width:80px; text-align:center; }}
  .logo {{ max-width:70px; max-height:50px; object-fit:contain; }}
  .logo-ph {{ width:70px; height:50px; background:#f3f4f6; border-radius:4px; }}
  .ttl {{ font-size:13pt; font-weight:bold; text-align:center; margin:10px 0 4px; }}
  .co  {{ font-size:11pt; font-weight:bold; text-align:center; margin-bottom:10px; color:#1f3864; }}
  .it {{ width:100%; border-collapse:collapse; margin-bottom:10px; }}
  .it td {{ border:1px solid #000; padding:4px 8px; font-size:8.5pt; }}
  .it td:first-child {{ font-weight:bold; background:#f0f0f0; width:45%; }}
  h2 {{ font-size:10pt; font-weight:bold; margin:12px 0 5px; border-bottom:1.5px solid #1f3864; padding-bottom:3px; color:#1f3864; }}
  table.dt {{ width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:10px; }}
  table.dt th {{ background:#1f3864; color:#fff; border:1px solid #aaa; padding:4px 6px; text-align:left; font-size:7.5pt; }}
  table.dt td {{ border:1px solid #ccc; padding:4px 6px; vertical-align:middle; }}
  table.dt td.c {{ text-align:center; }}
  table.dt td.n {{ text-align:center; font-weight:bold; color:#555; width:35px; }}
  table.dt td.i {{ font-style:italic; color:#888; }}
  table.dt tr.f td {{ background:#fff3cd; }}
  .sigs {{ display:flex; gap:20px; margin-top:24px; }}
  .sb {{ flex:1; text-align:center; }}
  .sl {{ border-top:1px solid #000; margin-top:36px; padding-top:4px; font-size:8pt; font-weight:bold; }}
  .sr {{ font-size:7.5pt; color:#555; text-transform:uppercase; }}
  p {{ margin-bottom:6px; line-height:1.5; font-size:8.5pt; }}
</style></head><body>

<table class="hdr">
  <tr>
    <td class="lc" rowspan="3">{logo_html}</td>
    <td style="text-align:center;font-size:12pt;font-weight:bold" rowspan="3">{company.razon_social}</td>
    <td style="text-align:right;font-weight:bold;font-size:7.5pt">VERSIÓN: 01</td>
  </tr>
  <tr><td style="text-align:right;font-weight:bold;font-size:7.5pt">FECHA: {_date_short(datetime.now())}</td></tr>
  <tr><td style="text-align:right;font-size:7.5pt">&nbsp;</td></tr>
  <tr><td colspan="3" style="background:#1f3864;color:#fff;text-align:center;font-weight:bold;padding:5px;border:1px solid #000">
    SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
  </td></tr>
  <tr><td colspan="3" style="background:#1f3864;color:#fff;text-align:center;font-weight:bold;padding:5px;border:1px solid #000">
    INSPECCIÓN DE {insp.inspection_type_name.upper()}
  </td></tr>
</table>

<p class="ttl">INFORME DE INSPECCIÓN</p>
<p class="co">{insp.inspection_type_name.upper()}</p>

<table class="it">
  <tr><td>FECHA DE INSPECCIÓN:</td><td>{_date_long(insp.scheduled_date)}</td></tr>
  <tr><td>LUGAR:</td><td>{insp.location or "—"}</td></tr>
  <tr><td>RESPONSABLE:</td><td>{insp.assigned_to_name or insp.elaborated_by or "—"}</td></tr>
  <tr><td>ELABORADO POR:</td><td>{insp.elaborated_by or "—"}</td></tr>
</table>

<h2>1. Registros de inspección</h2>
<table class="dt">
  <thead><tr><th class="c" style="width:40px">N°</th>{header_cells}</tr></thead>
  <tbody>{records_rows or '<tr><td colspan="20" class="c i">Sin registros</td></tr>'}</tbody>
</table>

<h2>2. Resumen de hallazgos y acciones correctivas</h2>
<table class="dt">
  <thead><tr>
    <th>Ítem</th><th>Hallazgo</th><th>Acción</th>
    <th class="c">Clase</th><th>Responsable</th><th>Inicio</th><th>Fin</th>
  </tr></thead>
  <tbody>{actions_rows}</tbody>
</table>

{"<h2>3. Observaciones generales</h2><p>" + (insp.general_observations or "") + "</p>" if insp.general_observations else ""}
{"<h2>4. Recomendaciones</h2><p>" + (insp.recommendations or "") + "</p>" if getattr(insp,"recommendations",None) else ""}

<div class="sigs">
  <div class="sb"><div class="sl">{insp.elaborated_by or "___________________"}</div>
    <div class="sr">{insp.elaborated_role or "ELABORADO POR"}</div></div>
  <div class="sb"><div class="sl">{insp.reviewed_by or "___________________"}</div>
    <div class="sr">{insp.reviewed_role or "REVISADO POR"}</div></div>
  <div class="sb"><div class="sl">{insp.approved_by or "___________________"}</div>
    <div class="sr">{insp.approved_role or "APROBADO POR"}</div></div>
</div>
</body></html>"""

    return HTML(string=html).write_pdf()
