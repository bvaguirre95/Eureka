"""
Template Eureka — Inspección de Extintores Portátiles.
Genera DOS documentos en un solo PDF:
  1. MATRIZ DE INSPECCIÓN  (replicando el formato Word exacto)
  2. INFORME DE INSPECCIÓN (con portada, secciones, hallazgos, firmas)
"""
import base64, os
from datetime import datetime
from weasyprint import HTML
from app.core.pdf_templates.static_assets import get_extintor_pqs, get_extintor_co2, get_logo


MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

def _date_long(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str):
        try: dt = datetime.fromisoformat(dt[:10])
        except: return dt
    return f"{dt.day} de {MESES[dt.month]} de {dt.year}"

def _date_long_upper(dt) -> str:
    return _date_long(dt).upper()

def _date_short(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str): return dt[:10]
    return dt.strftime("%d/%m/%Y")

def _img_b64(path: str, fallback_b64: str = "") -> str:
    if path and os.path.exists(path):
        ext = os.path.splitext(path)[1].lower().replace(".", "")
        mime = "image/svg+xml" if ext == "svg" else \
               f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"
        with open(path, "rb") as f:
            return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"
    return fallback_b64

# Mapa de campos a columnas fijas de la MATRIZ
# field_key → columna en la tabla (para reconocer campos especiales)
FIXED_COLS = [
    ("n_de_extintor",   "N° de Extintor",          "txt",   "30px"),
    ("tipo_de_extintor", "Tipo de Extintor",         "txt",   "40px"),
    ("clase_de_agente_extintor",   "Clase de Agente Extintor", "txt",   "40px"),
    ("capacidad_lb",      "Capacidad (Lb)",            "txt",   "35px"),
    ("actual",  "Fecha Recarga Actual",      "txt",   "45px"),
    ("proxima",   "Próxima Recarga",           "txt",   "45px"),
    ("ubicacion",      "Ubicación",                 "txt",   "55px"),
    # ── Condiciones del Extintor ────────────────────────────────────────
    ("sello_de_garantia", "Sello de garantía",         "check", "30px"),
    ("manometro",      "Manómetro",                 "check", "30px"),
    ("presion",        "Presión",                   "check", "30px"),
    ("recipiente",     "Recipiente",                "check", "30px"),
    ("manija",         "Manija",                    "check", "30px"),
    ("manguera",       "Manguera",                  "check", "30px"),
    ("pintura",        "Pintura",                   "check", "30px"),
    ("senalizacion_demarcacion",   "Señalización/Demarcación",  "check2","30px"),
]
# check  → S/N subcolumnas (Bueno/Malo)
# check2 → S/N subcolumnas (Sí/No)

def _get_val(record, field_key: str) -> str:
    for v in record.values:
        if v.field_key == field_key:
            return v.value or ""
    return ""

def _x(val, expected="S", td=True) -> str:
    """
    Genera celda <td> para una subcolumna S/N o B/M.
    expected = el valor que hace que ESTA columna tenga la X.
    Si val == expected → X verde (condición buena).
    Si val != expected → celda vacía.
    Si val == "" → celda vacía.
    """
    if not val:
        cell = ''
        cls = "chk"
    elif val == expected:
        cell = "✕"
        cls = "chk-ok"
    else:
        cell = ''
        cls = "chk"
    if td:
        return f'<td class="c {cls}">{cell}</td>'
    return cell

def generate(insp, company, doc: str = "ambos") -> bytes:
    # Cargar imágenes del glosario desde archivos estáticos
    pqs_b64 = get_extintor_pqs()
    co2_b64 = get_extintor_co2()
    logo_eureka=get_logo()

    # ── Logos ────────────────────────────────────────────────────────────────
    logo_src = _img_b64(getattr(company, "logo_path", None))
    logo_html = (f'<img src="{logo_src}" style="max-height:55px;max-width:120px;object-fit:contain">'
                 if logo_src else f'<span style="font-size:9pt;font-weight:bold">{company.razon_social}</span>')

    comp_desc = (getattr(company, "descripcion", None))
    comp_intr= (getattr(company, "intro_inspeccion", None))
    nro = insp.inspection_number or "1"
    fecha_insp = _date_short(insp.scheduled_date)
    fecha_larga = _date_long_upper(insp.scheduled_date)
    fecha_elab = _date_long_upper(insp.completed_date or datetime.now())
    company_rs = company.razon_social
    itype_upper = insp.inspection_type_name.upper()
    insp_nro = insp.inspection_number or "—"
    fecha_hoy = _date_short(datetime.now())
    elaborado_by = (insp.elaborated_by or "—").upper()
    # Logo grande para portada
    logo_html_large = (
        f'<img src="{logo_src}" style="height:;width:7.3cm;object-fit:contain">'
        if logo_src else
        f'<p style="font-size:24pt;font-weight:bold;color:#1f3864">{company.razon_social}</p>'
    )

    # ── Construir filas de la MATRIZ ─────────────────────────────────────────
    matrix_rows = ""
   
    for i, record in enumerate(insp.records, 1):
        def gv(key): return _get_val(record, key)

        cond_bad = any([
            gv("sello_de_garantia") == "N",
            gv("manometro") == "M",
            gv("presion") == "M",
            gv("recipiente") == "M",
            gv("manija") == "M",
            gv("manguera") == "M",
            gv("pintura") == "M",
            gv(" senalizacion_demarcacion") == "N",
        ])
        tr_cls = "finding" if (cond_bad or record.has_finding) else ""
        obs_val = gv("observaciones") or ""

        matrix_rows += f"""
        <tr class="{tr_cls}">
          <td class="c">{i}</td>
          <td class="c">{gv('n_de_extintor') or f'00{i}'}</td>
          <td class="c">{gv('tipo_de_extintor')}</td>
          <td class="c">{gv('clase_de_agente_extintor')}</td>
          <td class="c">{gv('capacidad_lb')}</td>
          <td class="c">{gv('actual')}</td>
          <td class="c">{gv('proxima')}</td>
          <td>{gv('ubicacion')}</td>
          {_x(gv('sello_de_garantia'),'S')}{_x(gv('sello_de_garantia'),'N')}
          {_x(gv('manometro'),'B')}{_x(gv('manometro'),'M')}
          {_x(gv('presion'),'B')}{_x(gv('presion'),'M')}
          {_x(gv('recipiente'),'B')}{_x(gv('recipiente'),'M')}
          {_x(gv('manija'),'B')}{_x(gv('manija'),'M')}
          {_x(gv('manguera'),'B')}{_x(gv('manguera'),'M')}
          {_x(gv('pintura'),'B')}{_x(gv('pintura'),'M')}
          {_x(gv('senalizacion_demarcacion'),'S')}{_x(gv('senalizacion_demarcacion'),'N')}
        </tr>"""
        if obs_val:
            matrix_rows += f'<tr class="{tr_cls}"><td colspan="25" class="obs">Obs. ítem {i}: {obs_val}</td></tr>'

    # ── Hallazgos para la MATRIZ ─────────────────────────────────────────────
    hallazgos_matrix = ""
    for a in insp.actions:
        hallazgos_matrix += f"""<tr>
          <td class="c">{a.item_ref or "—"}</td>
          <td>{a.description}</td>
          <td>{a.action or "—"}</td>
          <td>{a.responsible_name or "—"}</td>
          <td class="c">{_date_short(a.due_date_start)}</td>
          <td class="c">{_date_short(a.due_date_end)}</td>
        </tr>"""
    if not hallazgos_matrix:
        hallazgos_matrix = '<tr><td colspan="6" class="c i">Sin hallazgos</td></tr>'

    # ── Hallazgos para el INFORME (2 filas por extintor) ────────────────────
    hallazgos_informe = ""
    for a in insp.actions:
        ubic = ""
        tipo_txt = ""
        foto_html = '<span style="font-size:7pt;color:#ccc;">Sin foto</span>'
        num_extintor = a.item_ref or "—"

        for record in insp.records:
            if record.id == a.record_id or _get_val(record, "n_de_extintor") == a.item_ref:
                ubic      = _get_val(record, "ubicacion")
                num_ext   = _get_val(record, "n_de_extintor")
                tipo_val  = _get_val(record, "tipo_de_extintor")
                clase_val = _get_val(record, "clase_de_agente_extintor")
                cap_val   = _get_val(record, "capacidad_lb")
                if num_ext:
                    num_extintor = f"Extintor N° {num_ext}"
                tipo_txt = f"Tipo: {tipo_val}<br>Clase: {clase_val}<br>Capacidad: {cap_val} lbs"
                if getattr(record, "photo_path", None):
                    foto_src = _img_b64(record.photo_path)
                    if foto_src:
                        foto_html = f'<img src="{foto_src}" style="max-width:70px;max-height:65px;object-fit:cover;border-radius:3px;border:1px solid #ddd;">'
                break

        hallazgos_informe += f"""
        <tr>
          <td class="c bold" rowspan="2">{num_extintor}</td>
          <td class="c foto" rowspan="2">{foto_html}</td>
          <td>{tipo_txt}<br><br><em>Observación:</em> {a.description}</td>
          <td>{a.action or "—"}</td>
        </tr>
        <tr>
          <td colspan="2" class="ubic">UBICACIÓN: {ubic.upper() if ubic else "—"}</td>
        </tr>"""
    if not hallazgos_informe:
        hallazgos_informe = '<tr><td colspan="4" class="c i">Sin hallazgos registrados</td></tr>'
    # ── Recomendaciones ──────────────────────────────────────────────────────
    recs = getattr(insp, "recommendations", None) or ""
    recs_default = [
        "Establecer una zona de demarcación para los extintores. La demarcación es adaptable de acuerdo al espacio disponible. Mantener despejado el área para facilitar el acceso en caso de emergencia.",
        "Mantener los extintores limpios y sin ningún tipo de suciedad. El extintor debe contar con su respectivo gancho y señalética fotoluminiscente.",
        "Situar los extintores a una altura visible y accesible, aproximadamente 1.20 a 1.50 metros sobre el suelo.",
        "Realizar un adecuado mantenimiento a los extintores al menos una vez al año.",
        "Verificar que se encuentre recargado.",
        "Revisar que el sello de seguridad no esté deteriorado, manipulado o dañado.",
        "Solicitar y documentar la hoja de vida de los extintores.",
        "Establecer un cronograma para las respectivas inspecciones.",
    ]
    recs_html = "".join(f"<li>{r}</li>" for r in (recs.split("\n") if recs else recs_default))

    # ── Firmas HTML ──────────────────────────────────────────────────────────
    firmas_html = f"""
    <table class="firmas">
      <tr>
        <td></td><td></td><td></td>
      </tr>
      <tr>
        <td class="firma-label">ELABORADO POR:</td>
        <td class="firma-label">REVISADO POR:</td>
        <td class="firma-label">APROBADO POR:</td>
      </tr>
      <tr>
        <td class="firma-name">{insp.elaborated_by or "___________________"}</td>
        <td class="firma-name">{insp.reviewed_by or "___________________"}</td>
        <td class="firma-name">{insp.approved_by or "___________________"}</td>
      </tr>
      <tr>
        <td class="firma-role">{insp.elaborated_role or ""}</td>
        <td class="firma-role">{insp.reviewed_role or ""}</td>
        <td class="firma-role">{insp.approved_role or ""}</td>
      </tr>
    </table>"""

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page matriz {{
    size: A4 landscape;
    margin: 10mm;
    @top-center {{
      content: "INSPECCIÓN DE {insp.inspection_type_name.upper()} N°{nro}";
      font-family: Arial, sans-serif;
      font-size: 8pt;
      font-weight: bold;
      color: #1f3864;
    }}
  }}
  @page informe  {{
    size: A4 portrait;
    margin: 52mm 10mm 14mm 10mm;
    @top-left-corner {{ content: none; }}
    @top-left   {{ content: element(running-header); width: 100%; }}
    @top-center {{ content: none; }}
    @top-right  {{ content: none; }}
  }}
  @page portada-page {{
    size: A4 portrait;
    margin: 52mm 10mm 14mm 10mm;
    @top-left {{ content: element(running-header); width: 100%; }}
  }}
  @page :first {{ @top-center {{ content: none; }} }}

  * {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,sans-serif; }}
  body {{ font-size:8.5pt; color:#1a1a1a; line-height:1.4; }}
  /* ── RUNNING HEADER (se repite en cada página del informe) ── */
  .running-header {{
    position: running(running-header);
    width: auto;
  }}
  .page-border {{
    position: absolute;
    top: -5mm;
    left: -5mm;
    right: -5mm;
    bottom: -230mm;
    border: 1.5px solid #000;
    pointer-events: none;
    z-index: -1;
}}

  /* ── PORTADA ── */
  @page portada-page {{ @top-left {{ content: element(running-header); width: 100%; }} }}
  .portada {{
    min-height: 200mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
    page: portada-page;
  }}
  .portada .logo-area {{ margin-bottom: 30px; }}
  .portada h1 {{ font-size:18pt; font-weight:bold; color:#1f3864; margin-bottom:8px; }}
  .portada h2 {{ font-size:14pt; color:#1f3864; margin-bottom:6px; }}
  .portada h3 {{ font-size:12pt; color:#444; margin-bottom:30px; }}
  .portada .fecha-portada {{ font-size:10pt; color:#666; margin-top:20px; }}

  /* ── ENCABEZADO DOCUMENTO ── */
  .doc-header {{ width:100%; border-collapse:collapse; margin-bottom:8px; }}
  .doc-header td {{ border:1.5px solid #000; padding:4px 8px; font-size:8pt; vertical-align:middle; }}
  .doc-header .logo-cell {{ width:90px; text-align:center; padding:4px; }}
  .doc-header .title-cell {{ text-align:center; font-weight:bold; font-size:9pt; }}
  .doc-header .blue {{ background:#1f3864; color:#fff; font-weight:bold; text-align:center; font-size:9pt; }}
  .doc-header .meta {{ text-align:right; font-size:7.5pt; font-weight:bold; }}

  /* ── TABLA INFO (fechas) ── */
/* ── TABLA INFO (fechas) ── */
.info-table {{
    width: 100%;               /* Solo ocupa lo necesario */
    border-collapse: collapse;
    margin-bottom: 10px;
    font-family: Arial, sans-serif;
    font-size: 10pt;
}}
.info-table td {{
    border: 1px solid #999;
    padding: 4px 8px;
    font-size: 10pt;
    font-family: Arial, sans-serif;
    font-weight: normal;
    white-space: nowrap;        /* Evita que el texto se parta */
}}

.info-table td:first-child {{
    font-weight: bold;
}}

  /* ── ENCABEZADO SUBRAYADO ── */
  h2.sec {{ font-size:10pt; font-weight:bold; color:#1f3864; margin:12px 0 5px;
    border-bottom:2px solid #1f3864; padding-bottom:2px; }}
  h3.sub {{ font-size:9pt; font-weight:bold; margin:8px 0 4px; }}
  p {{ margin-bottom:6px; font-size:8.5pt; line-height:1.5; }}
  ul {{ margin-left:18px; margin-bottom:8px; }}
  ul li {{ margin-bottom:3px; font-size:8.5pt; }}

  /* ── TABLA DATOS ── */
  table.dt {{ width:100%; border-collapse:collapse; margin-bottom:10px; font-size:7.5pt; }}
  table.dt th {{ background:#1f3864; color:#fff; border:1px solid #888;
    padding:3px 5px; text-align:center; font-size:7pt; line-height:1.2; }}
  table.dt th.sub {{ background:#2d6a9f; }}
  table.dt td {{ border:1px solid #ccc; padding:3px 5px; vertical-align:middle; }}
  table.dt td.c {{ text-align:center; }}
  table.dt td.chk {{ text-align:center; width:18px; font-weight:bold; font-size:10pt; }}
  table.dt td.chk-ok {{ text-align:center; width:18px; color:#16a34a; font-weight:bold; font-size:12pt; }}
  table.dt td.chk-no {{ text-align:center; width:18px; color:#dc2626; font-weight:bold; font-size:12pt; }}
  table.dt td.obs {{ font-style:italic; color:#555; font-size:7pt; background:#fffde7; }}
  table.dt td.ubic {{ font-size:7pt; color:#555; font-style:italic; }}
  table.dt td.foto {{ text-align:center; width:65px; padding:2px; }}
  table.dt td.foto img {{ max-width:60px; max-height:55px; object-fit:cover; border-radius:3px; border:1px solid #ddd; }}
  table.dt td.foto .nf {{ font-size:6.5pt; color:#ccc; }}
  table.dt td.bold {{ font-weight:bold; }}
  table.dt td.i {{ font-style:italic; color:#888; }}
  table.dt tr.finding td {{ background:#fff3cd; }}

  /* ── TABLA TIPOS FUEGO / CLASES ── */
  table.tipos {{ width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:8pt; }}
  table.tipos th {{ background:#2d6a4f; color:#fff; border:1px solid #999; padding:4px 8px; }}
  table.tipos td {{ border:1px solid #ccc; padding:4px 8px; vertical-align:top; }}
  table.prio {{ width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:8pt; }}
  table.prio th {{ background:#1f3864; color:#fff; border:1px solid #999; padding:4px 8px; }}
  table.prio td {{ border:1px solid #ccc; padding:4px 8px; }}
  table.prio td:first-child {{ text-align:center; font-weight:bold; font-size:11pt; }}

  /* ── GLOSARIO ── */
  .glosario {{ background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;
    padding:8px 12px; font-size:8pt; margin-bottom:10px; }}

  /* ── FIRMAS ── */
  table.firmas {{ width:100%; border-collapse:collapse; margin-top:24px; }}
  table.firmas td {{ border:1px solid #000; padding:6px 8px; text-align:center;
    font-size:8pt; width:33.3%; }}
  table.firmas tr:first-child td {{ height:40px; border-bottom:none; }}
  table.firmas .firma-label {{ font-weight:bold; background:#f0f0f0; }}
  table.firmas .firma-name {{ font-weight:bold; }}
  table.firmas .firma-role {{ color:#555; }}

  .page-break {{ page-break-before: always; }}
  .matriz {{ page: matriz; }}
  .informe {{ page: informe; }}

  /* Justificar el texto del cuerpo del informe sin afectar tablas ni portada */
  .informe p,
  .informe li {{
    text-align: justify;
  }}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════════════════════
     DOCUMENTO 1: MATRIZ DE INSPECCIÓN
══════════════════════════════════════════════════════════════════════════ -->
<div class="matriz">
<!-- Encabezado de la Matriz -->
<table class="doc-header">
  <tr>
    <td class="logo-cell" rowspan="4">{logo_html}</td>
    <td class="title-cell" rowspan="3">{company.razon_social}<br>
      <span style="font-size:8pt;font-weight:normal">SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO</span>
    </td>
    <td class="meta">VERSIÓN: 01</td>
  </tr>
  <tr><td class="meta">CÓDIGO: {insp.inspection_number}</td></tr>
  <tr><td class="meta">FECHA: {_date_short(datetime.now())}</td></tr>
  <tr>
    <td class="blue" colspan="2">
      INSPECCIÓN DE {insp.inspection_type_name.upper()} N°{nro}
    </td>
  </tr>
</table>

<!-- Tabla de datos generales de la inspección -->
<table class="dt" style="margin-bottom:6px">
  <tr>
    <td style="width:33%"><strong>FECHA:</strong> {fecha_insp}</td>
    <td style="width:33%"><strong>HORA INICIO:</strong> {insp.start_time or "—"}</td>
    <td style="width:34%"><strong>HORA DE FINALIZACIÓN:</strong> {insp.end_time or "—"}</td>
  </tr>
  <tr>
    <td><strong>LUGAR:</strong> {insp.location or company.razon_social}</td>
    <td></td>
    <td><strong>RESPONSABLE:</strong> {insp.elaborated_by or "—"}</td>
  </tr>
</table>

<!-- ── TABLA PRINCIPAL DE INSPECCIÓN (con cabecera doble) ── -->
<table class="dt">
  <thead>
    <tr>
      <th rowspan="3" style="width:22px">Item</th>
      <th rowspan="3" style="width:30px">N° de Extintor</th>
      <th rowspan="3" style="width:35px">Tipo de Extintor</th>
      <th rowspan="3" style="width:40px">Clase de Agente Extintor</th>
      <th rowspan="3" style="width:35px">Capacidad (Lb)</th>
      <th colspan="2" style="width:80px">Fecha Recarga</th>
      <th rowspan="3" style="width:55px">Ubicación</th>
      <th colspan="16">Condiciones del Extintor</th>
    </tr>
    <tr>
      <th rowspan="2" style="width:40px">Actual</th>
      <th rowspan="2" style="width:40px">Próxima</th>
      <th colspan="2">Sello de garantía</th>
      <th colspan="2">Manómetro</th>
      <th colspan="2">Presión</th>
      <th colspan="2">Recipiente</th>
      <th colspan="2">Manija</th>
      <th colspan="2">Manguera</th>
      <th colspan="2">Pintura</th>
      <th colspan="2">Señaliz./Demarc.</th>
    </tr>
    <tr>
      <th class="sub">S</th><th class="sub">N</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">B</th><th class="sub">M</th>
      <th class="sub">S</th><th class="sub">N</th>
    </tr>
  </thead>
  <tbody>
    {matrix_rows or '<tr><td colspan="24" class="c i">Sin registros</td></tr>'}
  </tbody>
</table>

<!-- Glosario con imágenes — exacto al formato Word -->
<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8pt;">
  <tr>
    <td style="border:1px solid #999;padding:6px 10px;width:22%;vertical-align:top;">
      <p style="text-align:center;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #ccc;padding-bottom:3px;">GLOSARIO:</p>
      <p style="margin-bottom:4px"><strong>PQS=</strong> Polvo Químico Seco</p>
      <p style="margin-bottom:8px"><strong>CO2=</strong> Dióxido de Carbono</p>
      <p style="margin-bottom:2px"><strong>S=</strong> Sí</p>
      <p style="margin-bottom:2px"><strong>N=</strong> No</p>
      <p style="margin-bottom:2px"><strong>B=</strong> Bueno</p>
      <p style="margin-bottom:2px"><strong>M=</strong> Malo</p>
    </td>
    <td style="border:1px solid #999;padding:6px;text-align:center;vertical-align:top;width:39%;">
      <img src="{pqs_b64}" style="max-height:120px;max-width:100%;object-fit:contain;">
    </td>
    <td style="border:1px solid #999;padding:6px;text-align:center;vertical-align:top;width:39%;">
      <img src="{co2_b64}" style="max-height:120px;max-width:100%;object-fit:contain;">
    </td>
  </tr>
</table>

<!-- Hallazgos Matriz -->
<table class="dt">
  <thead>
    <tr>
      <th rowspan="2" style="width:35px">N° Extintor</th>
      <th>Resumen estado de Extintores</th>
      <th>Acciones a seguir</th>
      <th style="width:80px">Responsable</th>
      <th colspan="2">Fecha</th>
    </tr>
    <tr>
      <th></th><th></th><th></th>
      <th style="width:50px">Inicio</th>
      <th style="width:60px">Terminación</th>
    </tr>
  </thead>
  <tbody>{hallazgos_matrix}</tbody>
</table>

{firmas_html}
</div>
<!-- ##SPLIT## -->
<div class="informe">

<!-- ENCABEZADO RUNNING — se repite en todas las páginas del informe -->
<div class="running-header">
  <div class="page-border"></div>
  <table class="doc-header" style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <tr>
      <td rowspan="3" style="width:80px;border:1.5px solid #000;text-align:center;vertical-align:middle;padding:3px;">
        {logo_html}
      </td>
      <td rowspan="3" style="border:1.5px solid #000;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:14pt;font-weight:bold;padding:4px 6px;">
        {company_rs}
      </td>
      <td style="width:130px;border:1.5px solid #000;font-family:Arial,sans-serif;font-size:7pt;font-weight:bold;padding:3px 6px;">VERSIÓN: 01</td>
    </tr>
    <tr>
      <td style="border:1.5px solid #000;font-family:Arial,sans-serif;font-size:7pt;font-weight:bold;padding:3px 6px;">CÓDIGO: {insp_nro}</td>
    </tr>
    <tr>
      <td style="border:1.5px solid #000;font-family:Arial,sans-serif;font-size:7pt;font-weight:bold;padding:3px 6px;">FECHA: {fecha_hoy}</td>
    </tr>
    <tr>
      <td colspan="3" style="border:1.5px solid #000;background:#1f3864;color:#fff;text-align:center;font-family:Arial,sans-serif;font-size:8pt;font-weight:bold;padding:3px 6px;">
        SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border:1.5px solid #000;background:#1f3864;color:#fff;text-align:center;font-family:Arial,sans-serif;font-size:8pt;font-weight:bold;padding:3px 6px;">
        INFORME DE INSPECCIÓN DE {itype_upper}
      </td>
    </tr>
  </table>
</div>
<!-- ══ PORTADA ══ -->
<div class="portada">
  <p style="text-align:center;font-size:28pt;font-weight:bold;color:#000000;margin-bottom:12px">INFORME DE INSPECCIÓN</p>
  <p style="text-align:center;font-size:28pt;font-weight:bold;color:#000000;margin-bottom:8px">{itype_upper}</p>
  <div style="text-align:center;margin:20px 0;">
    {logo_html_large}
  </div>
  <div>
    <p style="text-align:center;font-size:24pt;font-weight:bold;color:#000000;margin-bottom:12px">{company_rs}</p>
  </div>
  <br>
<br>
<br>
  <table class="info-table">
  <tr><td>FECHA DE INSPECCIÓN:</td><td>{fecha_larga}</td></tr>
  <tr><td>FECHA DE ELABORACIÓN DE INFORME:</td><td>{fecha_elab}</td></tr>
  <tr><td>ELABORADO POR:</td><td>{elaborado_by}</td></tr>
</table>
<br>
<br>
<br>
<div style="text-align:center; margin-top:20px;">
    <img src="{logo_eureka}"
         style="width:7.3cm;height:auto;">
</div>
</div>

<!-- ══ CUERPO DEL INFORME ══ -->

<h2 class="sec">1. Introducción</h2>
<p><strong>{company_rs}</strong> {comp_desc}</p>
<p>Durante el desarrollo de la presente inspección se tomarán en cuenta diversos aspectos que influyen en el funcionamiento seguro del establecimiento; para ello, se elaborará una lista de chequeo que permitirá conocer el estado de los extintores, su correcta clasificación de acuerdo con el área donde se encuentran ubicados y el cumplimiento de la normativa vigente. Posteriormente, se comunicarán al responsable las condiciones identificadas, con el fin de establecer medidas preventivas y/o correctivas que garanticen la seguridad de los trabajadores, clientes e instalaciones.</p>
<h2 class="sec">2. Objetivos</h2>
<h3 class="sub">2.1 Objetivo general</h3>
<p>Evaluar el estado y las condiciones en las que se encuentran los extintores de <strong>{company_rs}</strong>, por medio de una inspección técnica utilizando el formato de check list para proponer medidas preventivas y correctivas que minimicen los peligros y riesgos.</p>
<h3 class="sub">2.2 Objetivos específicos</h3>
<ul>
  <li>Identificar las deficiencias de los extintores portátiles con los que cuenta la empresa por medio de la inspección técnica utilizando el formato de check list.</li>
  <li>Identificar anomalías de los extintores que puedan afectar el desarrollo de las operaciones.</li>
  <li>Realizar medidas preventivas y correctivas para minimizar la exposición a incidentes, accidentes laborales y pérdidas materiales.</li>
</ul>

<h2 class="sec">3. Áreas de aplicación y/o Alcance</h2>
<p>Aplica para todas las áreas operativa y administrativa en donde se presenten peligros y riesgos dentro de las instalaciones de <strong>{company_rs}</strong>.</p>

<h2 class="sec">4. Definiciones</h2>
<p><strong>Extintor:</strong> aparato mecánico portátil que contiene un agente de extinción para proyectar y dirigirlo sobre el fuego por efecto de una presión interna.</p>
<p><strong>Agente extintor:</strong> sustancia utilizada para confinar, controlar y/o extinguir incendios.</p>
<p><strong>Potencial de extinción:</strong> capacidad relativa de extinción del extintor de acuerdo con la clase de fuego.</p>
<p><strong>Tipos de fuego</strong></p>
<table class="tipos">
  <tr><th>Tipo de fuego</th><th>Agente de extinción</th></tr>
  <tr><td><strong>Tipo A:</strong> fuegos en materias de combustibles comunes como madera, tela, papel, caucho y plásticos.</td>
      <td>Polvo químico seco ABC · Agua presurizada · Espuma</td></tr>
  <tr><td><strong>Tipo B:</strong> son los fuegos de líquidos inflamables, grasas, solventes, aceites y gases inflamables.</td>
      <td>Polvo químico seco ABC-BC · Espuma · Dióxido de carbono (CO2)</td></tr>
  <tr><td><strong>Tipo C:</strong> incendios en equipos eléctricos, ya sea en uso o des-energizados.</td>
      <td>Polvo químico multipropósito o dióxido de carbono</td></tr>
  <tr><td><strong>Tipo D:</strong> fuegos en metales combustibles como magnesio, titanio, circonio, sodio, litio y potasio.</td>
      <td>Polvo químico especial para metales (no recomendado en ABC o BC)</td></tr>
  <tr><td><strong>Tipo K:</strong> fuegos en aparatos de cocina que involucren medios de cocción combustibles.</td>
      <td>Químico húmedo o multipropósito</td></tr>
</table>

<h2 class="sec">5. Estándares</h2>
<ul>
  <li>En todas las áreas de <strong>{company_rs}</strong>, donde se presenten riesgos potenciales de combustión, deben estar equipadas con sistemas de extinción de incendios del tipo más adecuado a la naturaleza del combustible utilizado.</li>
  <li>Todos los extintores portátiles, a implementar o que se encuentren implementados en las instalaciones, deben cumplir con los requisitos establecidos en las normas técnicas ecuatorianas RTE INEN 006 y la norma NFPA 10 vigente.</li>
</ul>

<h2 class="sec">6. Metodología</h2>
<p>Recorrido por las instalaciones de <strong>{company_rs}</strong>, para la verificación de los extintores existentes, estado y ubicación. Se evaluará cada uno de los siguientes ítems:</p>
<ul>
  <li>Estado del extintor</li>
  <li>Número de extintor · Tipo de extintor · Clase de agente extintor · Capacidad</li>
  <li>Fecha de recarga / fecha de vencimiento · Ubicación</li>
  <li>Condiciones: Señalización/Demarcación · Sello de garantía · Manómetro · Presión · Recipiente · Manija · Manguera · Pintura</li>
</ul>
<p>Para determinar la priorización se utilizará el siguiente método que clasifica las condiciones o actos observados según su potencial de pérdidas:</p>
<table class="prio">
  <tr><th>CLASE</th><th>POTENCIAL DE PÉRDIDAS</th><th>GRADO DE ACCIÓN</th></tr>
  <tr><td>A</td><td>Muerte, incapacidad permanente o pérdida de alguna parte del cuerpo y/o daño considerable a la propiedad.</td><td><strong>INMEDIATA</strong></td></tr>
  <tr><td>B</td><td>Lesión, o enfermedad grave, incapacidad temporal, y/o daño menor a la propiedad.</td><td><strong>PRONTA</strong></td></tr>
  <tr><td>C</td><td>Lesiones menores incapacitantes, enfermedad leve o daños menores a la propiedad.</td><td><strong>POSTERIOR</strong></td></tr>
</table>
<p>Se realizó la visita e inspección visual a cada uno de los extintores de <strong>{company_rs}</strong>, llevando registro fotográfico y llenando el formato de lista de chequeo respectivo.</p>

<h2 class="sec">7. Descripción de la empresa</h2>
<p><strong>{company_rs}</strong> {comp_desc}</p>

<h2 class="sec">8. Hallazgos</h2>
<p>Se evaluaron los extintores de acuerdo con la norma NFPA 10 vigente y al Reglamento RTE INEN 006.</p>
<table class="dt">
  <thead>
    <tr>
      <th style="width:40px">Ítem</th>
      <th style="width:80px">Registro fotográfico</th>
      <th>Hallazgo</th>
      <th>Acciones a seguir</th>
    </tr>
  </thead>
  <tbody>{hallazgos_informe}</tbody>
</table>

<h2 class="sec">9. Recomendaciones generales</h2>
<ul>{recs_html}</ul>

{firmas_html}
</div>
</body>
</html>"""

    # ── Según doc, generar solo matriz, solo informe, o ambos ────────────────
    if doc == "ambos":
        return HTML(string=html, base_url="/").write_pdf()

    MARKER = "<!-- ##SPLIT## -->"
    if MARKER not in html:
        return HTML(string=html, base_url="/").write_pdf()

    head_end = html.index("<body>") + 6
    head_css  = html[:head_end]
    body_all  = html[head_end:html.rindex("</body>")]
    CLOSE     = "\n</body>\n</html>"

    parts = body_all.split(MARKER)
    if len(parts) < 2:
        return HTML(string=html, base_url="/").write_pdf()

    if doc == "matriz":
        final = head_css + parts[0].strip() + CLOSE
    elif doc == "informe":
        final = head_css + parts[1].strip() + CLOSE
    else:
        return HTML(string=html, base_url="/").write_pdf()

    return HTML(string=final, base_url="/").write_pdf()