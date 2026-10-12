"""
Template genérico para cualquier tipo de inspección.
Genera DOS documentos según structure_type y el parámetro doc:

  doc="ambos"   → un PDF con todo
  doc="matriz"  → solo la tabla de registros
  doc="informe" → portada + objetivo + antecedentes + resultados + firmas

Soporta:
  FORMULARIO        → checklist como tabla pregunta/respuesta
  MATRIZ            → tabla de ítems inspeccionados
  FORMULARIO_MATRIZ → datos generales + tabla de ítems
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
    ext  = os.path.splitext(logo_path)[1].lower().replace(".", "")
    mime = "image/svg+xml" if ext == "svg" else \
           f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"
    with open(logo_path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"

def _fmt(ft, value):
    if value is None or value == "": return "—"
    ft = str(ft)
    if ft == "check_sn":  return "✔ Sí" if str(value) == "S" else "✘ No"
    if ft == "check_bm":  return "✔ Bueno" if str(value) == "B" else "✗ Malo"
    if ft == "check_sna": return {"S":"✔ Sí","N":"✘ No","NA":"N/A"}.get(str(value), str(value))
    return str(value)

def _is_check(ft): return str(ft) in ("check_sn","check_bm","check_sna")


# ── CSS compartido ─────────────────────────────────────────────────────────────

def _css(landscape=False):
    size = "A4 landscape" if landscape else "A4 portrait"
    return f"""
<style>
@page {{
  size: {size};
  margin: 52mm 10mm 15mm 10mm;
  @top-left {{ content: element(running-header); width: 100%; }}
}}
* {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }}
body {{ font-size:9pt; color:#1a1a1a; line-height:1.45; }}

.running-header {{ position:running(running-header); width:100%; }}
.logo {{ max-height:52px; max-width:105px; object-fit:contain; }}

table.hdr {{ width:100%; border-collapse:collapse; }}
table.hdr td {{ border:1.5px solid #000; padding:3px 7px; font-size:7.5pt; vertical-align:middle; }}
.hdr-blue {{ background:#1f3864; color:#fff; font-weight:bold; text-align:center; font-size:8pt; padding:4px; }}

.it {{ width:100%; border-collapse:collapse; margin-bottom:10px; }}
.it td {{ border:1px solid #ccc; padding:4px 8px; font-size:8.5pt; }}
.it td.lbl {{ font-weight:bold; background:#f0f0f0; width:38%; white-space:nowrap; }}
.it td.c   {{ text-align:center; }}

h2 {{ font-size:10pt; font-weight:bold; color:#1f3864; margin:14px 0 5px;
      border-bottom:1.5px solid #1f3864; padding-bottom:3px; }}
p {{ margin-bottom:6px; font-size:8.5pt; line-height:1.5; }}
p.grp {{ font-weight:bold; color:#444; margin:8px 0 3px; font-size:8pt;
         text-transform:uppercase; letter-spacing:.4px; }}
p.i {{ color:#888; font-style:italic; }}
p.finding {{ background:#fff3cd; border-left:3px solid #f59e0b;
             padding:4px 8px; margin:6px 0; font-size:8pt; }}

.resumen {{ display:flex; gap:12px; margin-bottom:12px; }}
.res-card {{ flex:1; border:1.5px solid #e5e7eb; border-radius:6px; padding:8px; text-align:center; }}
.res-num {{ font-size:16pt; font-weight:bold; }}
.res-lbl {{ font-size:7pt; color:#555; text-transform:uppercase; }}

table.dt {{ width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:10px; }}
table.dt th {{ background:#1f3864; color:#fff; border:1px solid #888;
               padding:3px 5px; text-align:left; font-size:7.5pt; line-height:1.3; }}
table.dt th.c, table.dt td.c {{ text-align:center; }}
table.dt td {{ border:1px solid #ccc; padding:3px 5px; vertical-align:middle; }}
table.dt td.n {{ width:32px; font-weight:bold; color:#555; text-align:center; }}
table.dt td.i {{ font-style:italic; color:#888; }}
table.dt tr.f td {{ background:#fff3cd; }}

table.firmas {{ width:100%; border-collapse:collapse; margin-top:28px; }}
table.firmas td {{ border:1px solid #000; padding:6px 8px; text-align:center; font-size:8pt; width:33.3%; }}
table.firmas tr:first-child td {{ height:42px; border-bottom:none; }}
table.firmas td.fl {{ font-weight:bold; background:#f0f0f0; }}
table.firmas td.fn {{ font-weight:bold; }}
table.firmas td.fr {{ color:#555; font-size:7.5pt; }}

.page-break {{ page-break-before:always; }}
</style>"""


# ── Encabezado running ─────────────────────────────────────────────────────────

def _header_html(logo_src, company_name, insp_num, type_name, fecha_hoy):
    logo_html = (f'<img src="{logo_src}" class="logo">'
                 if logo_src else f'<span style="font-size:9pt;font-weight:bold">{company_name}</span>')
    return f"""
<div class="running-header">
  <table class="hdr">
    <tr>
      <td rowspan="3" style="width:90px;text-align:center">{logo_html}</td>
      <td rowspan="3" style="text-align:center;font-size:12pt;font-weight:bold;padding:4px 8px">
        {company_name}</td>
      <td style="width:130px;font-weight:bold;text-align:right;font-size:7.5pt">VERSIÓN: 01</td>
    </tr>
    <tr><td style="font-weight:bold;text-align:right;font-size:7.5pt">CÓDIGO: {insp_num}</td></tr>
    <tr><td style="font-weight:bold;text-align:right;font-size:7.5pt">FECHA: {fecha_hoy}</td></tr>
    <tr><td colspan="3" class="hdr-blue">
      SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO</td></tr>
    <tr><td colspan="3" class="hdr-blue">INSPECCIÓN DE {type_name.upper()}</td></tr>
  </table>
</div>"""


# ── Info table ─────────────────────────────────────────────────────────────────

def _info_table(insp):
    hora = insp.start_time or ""
    if hora and insp.end_time:
        hora += f" – {insp.end_time}"
    return f"""
<table class="it">
  <tr><td class="lbl">CÓDIGO:</td><td>{insp.inspection_number or '—'}</td>
      <td class="lbl">FECHA:</td><td>{_date_long(insp.scheduled_date)}</td></tr>
  <tr><td class="lbl">LUGAR / ÁREA:</td><td>{insp.location or '—'}</td>
      <td class="lbl">HORA:</td><td>{hora or '—'}</td></tr>
  <tr><td class="lbl">ELABORADO POR:</td><td>{insp.elaborated_by or '—'}</td>
      <td class="lbl">RESPONSABLE:</td><td>{insp.assigned_to_name or '—'}</td></tr>
</table>"""


# ── Secciones de contenido ─────────────────────────────────────────────────────

def _general_section(general_fields, general_data, num):
    if not general_fields: return ""
    groups = {}
    for f in sorted(general_fields, key=lambda x: x.order):
        groups.setdefault(f.group_name or "", []).append(f)
    html = f"<h2>{num}. Datos generales</h2>"
    for gname, gf in groups.items():
        if gname: html += f"<p class='grp'>{gname}</p>"
        html += "<table class='it'>"
        for f in gf:
            val = _fmt(f.field_type, general_data.get(f.field_key, ""))
            html += f"<tr><td class='lbl'>{f.name}</td><td>{val}</td></tr>"
        html += "</table>"
    return html


def _formulario_section(fields, records, num):
    """Checklist — cada campo como fila con su respuesta."""
    html = f"<h2>{num}. Lista de verificación</h2>"
    if not records:
        return html + "<p class='i'>Sin respuestas registradas.</p>"
    rec  = records[0]
    vals = {v.field_id: v.value for v in rec.values}

    # Contar cumplimiento
    ok = nok = 0
    check_fields = [f for f in fields if _is_check(f.field_type)]
    for f in check_fields:
        v = str(vals.get(f.id, "") or "")
        if v in ("S","B"):  ok  += 1
        if v in ("N","M"):  nok += 1
    total = ok + nok
    pct   = round(ok/total*100, 1) if total else 0
    color = "#16a34a" if pct >= 80 else "#f59e0b" if pct >= 60 else "#dc2626"

    if total > 0:
        html += f"""<div class="resumen">
          <div class="res-card"><div class="res-num">{total}</div><div class="res-lbl">Ítems</div></div>
          <div class="res-card" style="border-color:#16a34a">
            <div class="res-num" style="color:#16a34a">{ok}</div><div class="res-lbl">Conformes</div></div>
          <div class="res-card" style="border-color:#dc2626">
            <div class="res-num" style="color:#dc2626">{nok}</div><div class="res-lbl">No conformes</div></div>
          <div class="res-card" style="border-color:{color}">
            <div class="res-num" style="color:{color}">{pct}%</div><div class="res-lbl">Cumplimiento</div></div>
        </div>"""

    groups = {}
    for f in sorted(fields, key=lambda x: x.order):
        groups.setdefault(f.group_name or "", []).append(f)

    for gname, gf in groups.items():
        if gname: html += f"<p class='grp'>{gname}</p>"
        html += "<table class='dt'><thead><tr><th>Ítem a verificar</th><th class='c' style='width:80px'>Respuesta</th></tr></thead><tbody>"
        for f in gf:
            v   = vals.get(f.id, "")
            fmt = _fmt(f.field_type, v)
            cls = ""
            if str(v) in ("N","M"): cls = 'style="color:#dc2626;font-weight:bold"'
            if str(v) in ("S","B"): cls = 'style="color:#16a34a;font-weight:bold"'
            html += f"<tr><td>{f.name}</td><td class='c' {cls}>{fmt}</td></tr>"
        html += "</tbody></table>"
    return html


def _matrix_section(fields, records, num):
    """Tabla de registros de inspección."""
    if not fields: return ""
    ths = "".join(f"<th>{f.name}</th>" for f in fields)
    rows_html = ""
    for i, r in enumerate(records, 1):
        vals  = {v.field_id: v.value for v in r.values}
        cells = "".join(
            f'<td class="{"c" if _is_check(f.field_type) else ""}">'
            f'{_fmt(f.field_type, vals.get(f.id,""))}</td>'
            for f in fields
        )
        cls = 'class="f"' if r.has_finding else ""
        rows_html += f'<tr {cls}><td class="c n">{i:03d}</td>{cells}</tr>'
    if not rows_html:
        cols = len(fields) + 1
        rows_html = f'<tr><td colspan="{cols}" class="c i">Sin registros</td></tr>'
    return f"""
<h2>{num}. Registros de inspección</h2>
<table class="dt">
  <thead><tr><th class="c" style="width:35px">N°</th>{ths}</tr></thead>
  <tbody>{rows_html}</tbody>
</table>"""


def _actions_section(actions, num):
    rows = "".join(f"""<tr>
      <td class="c">{a.item_ref or '—'}</td>
      <td>{a.description}</td>
      <td>{a.action or '—'}</td>
      <td class="c"><b>{a.priority or '—'}</b></td>
      <td>{a.responsible_name or '—'}</td>
      <td class="c">{_date_short(a.due_date_end)}</td>
    </tr>""" for a in actions) or \
    '<tr><td colspan="6" class="c i">Sin acciones correctivas</td></tr>'
    return f"""
<h2>{num}. Hallazgos y acciones correctivas</h2>
<table class="dt">
  <thead><tr><th>Ítem</th><th>Hallazgo</th><th>Acción correctiva</th>
    <th class="c">Clase</th><th>Responsable</th><th class="c">Fecha límite</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>"""


def _firmas(insp):
    return f"""
<table class="firmas">
  <tr><td></td><td></td><td></td></tr>
  <tr><td class="fl">ELABORADO POR:</td>
      <td class="fl">REVISADO POR:</td>
      <td class="fl">APROBADO POR:</td></tr>
  <tr><td class="fn">{insp.elaborated_by or '___________________'}</td>
      <td class="fn">{insp.reviewed_by or '___________________'}</td>
      <td class="fn">{insp.approved_by or '___________________'}</td></tr>
  <tr><td class="fr">{insp.elaborated_role or ''}</td>
      <td class="fr">{insp.reviewed_role or ''}</td>
      <td class="fr">{insp.approved_role or ''}</td></tr>
</table>"""


# ── Generadores de documentos ──────────────────────────────────────────────────

def _build_matriz_doc(insp, company, logo_src, fecha_hoy, matrix_fields):
    """Solo la tabla de registros — compacto, para imprimir en campo."""
    landscape = len(matrix_fields) > 6
    header    = _header_html(logo_src, company.razon_social,
                             insp.inspection_number or "—",
                             insp.inspection_type_name, fecha_hoy)
    body = _info_table(insp) + _matrix_section(matrix_fields, insp.records, 1)
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
{_css(landscape=landscape)}</head><body>
{header}{body}
</body></html>"""


def _build_informe_doc(insp, company, logo_src, fecha_hoy,
                       general_fields, matrix_fields, general_data, structure):
    """Informe completo con objetivo, antecedentes, resultados y firmas."""
    header = _header_html(logo_src, company.razon_social,
                          insp.inspection_number or "—",
                          insp.inspection_type_name, fecha_hoy)
    n    = 1
    body = _info_table(insp)

    # 1. Objetivo
    body += f"""<h2>{n}. Objetivo</h2>
<p>Realizar la inspección de <strong>{insp.inspection_type_name}</strong> en las
instalaciones de <strong>{company.razon_social}</strong>, verificando el cumplimiento
de los requisitos normativos y condiciones de seguridad establecidas, identificando
condiciones inseguras y determinando las acciones correctivas correspondientes.</p>"""
    n += 1

    # 2. Antecedentes / Base legal
    body += f"""<h2>{n}. Antecedentes</h2>
<p>La presente inspección se realiza en cumplimiento del Sistema de Gestión de
Seguridad y Salud en el Trabajo (SG-SST) de <strong>{company.razon_social}</strong>,
conforme a lo dispuesto en el Decreto Ejecutivo 2393, el Instrumento Andino de
Seguridad y Salud en el Trabajo (Decisión 584) y la normativa técnica aplicable.</p>"""
    n += 1

    # 3. Datos generales (si aplica)
    if general_fields and general_data:
        body += _general_section(general_fields, general_data, n); n += 1

    # 4. Resultados
    if structure == "formulario":
        all_f = sorted(insp.inspection_type_fields, key=lambda f: f.order)
        body += _formulario_section(all_f, insp.records, n); n += 1
    else:
        body += _matrix_section(matrix_fields, insp.records, n); n += 1

    # 5. Hallazgos y acciones
    body += _actions_section(insp.actions, n); n += 1

    # 6. Observaciones y recomendaciones
    if getattr(insp, "general_observations", None):
        body += f"<h2>{n}. Observaciones generales</h2><p>{insp.general_observations}</p>"; n += 1
    if getattr(insp, "recommendations", None):
        body += f"<h2>{n}. Recomendaciones</h2><p>{insp.recommendations}</p>"; n += 1

    # 7. Conclusiones
    total_r   = len(insp.records)
    with_find = sum(1 for r in insp.records if r.has_finding)
    open_act  = sum(1 for a in insp.actions if str(a.status) in ("pendiente","en_progreso"))
    body += f"""<h2>{n}. Conclusiones</h2>
<p>Se inspeccionaron <strong>{total_r}</strong> ítem(s), de los cuales
<strong>{with_find}</strong> presentaron hallazgos que requieren atención.
Se generaron <strong>{len(insp.actions)}</strong> acción(es) correctiva(s),
de las cuales <strong>{open_act}</strong> se encuentran pendientes de implementación.</p>"""
    n += 1

    body += _firmas(insp)

    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
{_css()}</head><body>
{header}{body}
</body></html>"""


# ── Función principal ──────────────────────────────────────────────────────────

def generate(insp, company, doc="ambos", **kwargs) -> bytes:
    structure    = str(getattr(insp, "structure_type", "matriz") or "matriz")
    all_fields   = sorted(insp.inspection_type_fields, key=lambda f: f.order)
    general_data = getattr(insp, "general_data", None) or {}
    logo_src     = _logo_b64(getattr(company, "logo_path", None))
    fecha_hoy    = _date_short(datetime.now())

    general_fields = [f for f in all_fields if str(getattr(f,"scope","matriz")) == "general"]
    matrix_fields  = [f for f in all_fields if str(getattr(f,"scope","matriz")) != "general"]

    if doc == "matriz":
        html = _build_matriz_doc(insp, company, logo_src, fecha_hoy,
                                 matrix_fields or all_fields)
        return HTML(string=html, base_url="/").write_pdf()

    if doc == "informe":
        html = _build_informe_doc(insp, company, logo_src, fecha_hoy,
                                  general_fields, matrix_fields, general_data, structure)
        return HTML(string=html, base_url="/").write_pdf()

    # "ambos" — primero informe, luego matriz en nueva página (para formulario_matriz)
    if structure == "formulario_matriz":
        informe_html = _build_informe_doc(insp, company, logo_src, fecha_hoy,
                                          general_fields, matrix_fields, general_data, structure)
        matriz_html  = _build_matriz_doc(insp, company, logo_src, fecha_hoy,
                                         matrix_fields or all_fields)
        # Combinar en un solo PDF
        from weasyprint import HTML as WH
        docs = [WH(string=informe_html, base_url="/").render(),
                WH(string=matriz_html,  base_url="/").render()]
        all_pages = [p for d in docs for p in d.pages]
        return docs[0].copy(all_pages).write_pdf()

    # formulario o matriz solos
    html = _build_informe_doc(insp, company, logo_src, fecha_hoy,
                              general_fields, matrix_fields, general_data, structure)
    return HTML(string=html, base_url="/").write_pdf()
