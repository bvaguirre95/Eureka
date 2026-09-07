"""
Generación del PDF del Diagnóstico Anexo 1 usando WeasyPrint + HTML/CSS.
"""

from datetime import datetime
from typing import Optional

from weasyprint import HTML

from app.core.anexo1_questions import SECTIONS
from app.models.diagnostic import AnswerValueEnum


def _badge(answer: Optional[str]) -> str:
    if answer == "cumple":
        return '<span class="badge cumple">✔ Cumple</span>'

    if answer == "no_cumple":
        return '<span class="badge no_cumple">✘ No cumple</span>'

    if answer == "no_aplica":
        return '<span class="badge no_aplica">— No aplica</span>'

    return '<span class="badge sin_resp">Sin respuesta</span>'


def _bar(percent: float, color: str = "#16a34a") -> str:
    return f"""
    <div class="bar-wrap">
      <div class="bar-fill"
           style="width:{percent}%;background:{color}">
      </div>
    </div>
    <span class="bar-pct">{percent}%</span>
    """


def _format_date(dt) -> str:
    if not dt:
        return "—"

    if isinstance(dt, str):
        return dt[:10]

    return dt.strftime("%d/%m/%Y")


def generate_diagnostic_pdf(diag_out, company) -> bytes:

    # =========================================================
    # MAPA DE RESPUESTAS
    # =========================================================

    answers_map = {
        a.question_id: a
        for a in diag_out.answers
    }

    # Estadísticas calculadas por el backend
    sections_stats = {
        s.section_id: s
        for s in diag_out.sections
    }

    tipo_label = (
        "Inspección"
        if diag_out.diagnostic_type == "inspeccion"
        else "Reinspección"
    )

    status_label = (
        "Completado"
        if diag_out.status == "completado"
        else "Borrador"
    )

    # =========================================================
    # SECCIONES DE PREGUNTAS
    # =========================================================

    sections_html = ""

    for section in SECTIONS:

        sec_stat = sections_stats.get(section["id"])

        # El porcentaje viene directamente del backend
        sec_pct = sec_stat.percent if sec_stat else 0.0

        rows = ""

        for q in section["questions"]:

            ans = answers_map.get(q["id"])

            badge = _badge(
                ans.answer if ans else None
            )

            obs = (
                f'<p class="obs">{ans.observation}</p>'
                if (
                    ans
                    and ans.observation
                )
                else ""
            )

            legal = (
                q.get("legal_ref", "")
                .replace("\n", "<br>")
            )

            rows += f"""
            <tr>

              <td class="qnum">
                {q['id']}
              </td>

              <td>

                <p class="qtext">
                  {q['text']}
                </p>

                {obs}

                <p class="legal">
                  {legal}
                </p>

              </td>

              <td class="answer-cell">
                {badge}
              </td>

            </tr>
            """

        sections_html += f"""
        <div class="section-block">

          <div class="section-header">

            <span class="section-name">
              {section['name']}
            </span>

            <span class="section-pct">
              {sec_pct}%
            </span>

          </div>

          <table class="questions-table">

            <thead>
              <tr>
                <th style="width:50px">
                  Cód.
                </th>

                <th>
                  Pregunta / Referencia legal
                </th>

                <th style="width:130px">
                  Resultado
                </th>
              </tr>
            </thead>

            <tbody>
              {rows}
            </tbody>

          </table>

        </div>
        """

    # =========================================================
    # RESUMEN POR SECCIÓN
    #
    # IMPORTANTE:
    # El porcentaje viene calculado desde el backend.
    # Aquí solamente se muestra.
    # =========================================================

    summary_rows = ""

    for section in SECTIONS:

        sec = sections_stats.get(
            section["id"]
        )

        if sec:

            summary_rows += f"""
            <tr>

              <td>
                {sec.section_name}
              </td>

              <td class="num green">
                {sec.cumple}
              </td>

              <td class="num red">
                {sec.no_cumple}
              </td>

              <td class="num gray">
                {sec.no_aplica}
              </td>

              <td class="num orange">
                {sec.sin_respuesta}
              </td>

              <td class="num bold">
                {sec.percent}%
              </td>

            </tr>
            """

    # =========================================================
    # HTML COMPLETO
    # =========================================================

    html = f"""
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<style>

  /* =======================================================
     CONFIGURACIÓN GENERAL
     ======================================================= */

  @page {{
    size: A4;
    margin: 18mm 15mm;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: Arial, sans-serif;
    font-size: 9pt;
    color: #1a1a1a;
    line-height: 1.3;
  }}


  /* =======================================================
     PORTADA
     ======================================================= */

  .cover {{
    text-align: center;
    padding: 40px 20px;
    border-bottom: 3px solid #16a34a;
    margin-bottom: 20px;
  }}

  .cover h1 {{
    font-size: 18pt;
    color: #16a34a;
    margin-bottom: 10px;
  }}

  .cover h2 {{
    font-size: 13pt;
    color: #333;
    margin-bottom: 16px;
  }}

  .cover .logo {{
    max-width: 180px;
    max-height: 80px;
    object-fit: contain;
    margin: 10px auto 15px auto;
    display: block;
  }}

  .cover .meta {{
    display: inline-block;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 10px 24px;
    margin-top: 10px;
  }}

  .cover .meta p {{
    font-size: 9pt;
    margin: 3px 0;
  }}

  .cover .meta strong {{
    color: #16a34a;
  }}


  /* =======================================================
     TÍTULOS
     ======================================================= */

  h2.page-title {{
    font-size: 13pt;
    color: #16a34a;
    margin-bottom: 14px;
    border-bottom: 2px solid #16a34a;
    padding-bottom: 6px;

    /* Evita que el título quede solo al final */
    page-break-after: avoid;
  }}


  /* =======================================================
     STATS BANNER
     ======================================================= */

  .stats-banner {{
    display: flex;
    gap: 12px;
    margin-bottom: 18px;
  }}

  .stat-box {{
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    background: #fafafa;
  }}

  .stat-box .num {{
    font-size: 20pt;
    font-weight: bold;
  }}

  .stat-box .lbl {{
    font-size: 7.5pt;
    color: #6b7280;
  }}

  .stat-box.green .num {{
    color: #16a34a;
  }}

  .stat-box.red .num {{
    color: #dc2626;
  }}

  .stat-box.gray .num {{
    color: #6b7280;
  }}

  .stat-box.blue .num {{
    color: #2563eb;
  }}


  /* =======================================================
     PROGRESS BAR
     ======================================================= */

  .bar-wrap {{
    display: inline-block;
    width: 120px;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    vertical-align: middle;
    margin-right: 6px;
  }}

  .bar-fill {{
    height: 100%;
    border-radius: 4px;
  }}

  .bar-pct {{
    font-size: 8.5pt;
    font-weight: bold;
  }}


  /* =======================================================
     RESUMEN POR SECCIÓN
     ======================================================= */

  .summary-block {{
    margin-bottom: 24px;

    /* Evita cortar el encabezado */
    page-break-inside: avoid;
  }}

  .summary-block h3 {{
    font-size: 11pt;
    color: #16a34a;
    margin-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
  }}

  .summary-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }}

  .summary-table th {{
    background: #f3f4f6;
    padding: 5px 8px;
    text-align: left;
    border: 1px solid #e5e7eb;
    font-size: 7.5pt;
  }}

  .summary-table td {{
    padding: 5px 8px;
    border: 1px solid #e5e7eb;
  }}

  .summary-table td.num {{
    text-align: center;
  }}

  .summary-table td.green {{
    color: #16a34a;
    font-weight: bold;
  }}

  .summary-table td.red {{
    color: #dc2626;
    font-weight: bold;
  }}

  .summary-table td.gray {{
    color: #6b7280;
  }}

  .summary-table td.orange {{
    color: #d97706;
  }}

  .summary-table td.bold {{
    font-weight: bold;
  }}


  /* =======================================================
     SECCIONES
     ======================================================= */

  /*
     IMPORTANTE:

     NO usamos page-break-inside: avoid aquí.

     Si una sección tiene muchas preguntas,
     puede continuar naturalmente en la siguiente página.
  */

  .section-block {{
    margin-bottom: 24px;
  }}

  .section-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;

    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;

    padding: 7px 12px;
    margin-bottom: 6px;

    /*
      Mantener el título junto a las primeras filas.
    */
    page-break-after: avoid;
  }}

  .section-name {{
    font-size: 10pt;
    font-weight: bold;
    color: #15803d;
  }}

  .section-pct {{
    font-size: 10pt;
    font-weight: bold;
    color: #16a34a;
  }}


  /* =======================================================
     TABLA DE PREGUNTAS
     ======================================================= */

  .questions-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;

    /*
      Permitimos que la tabla continúe
      en la siguiente página.
    */
    page-break-inside: auto;
  }}

  /*
     Intentar que una pregunta no quede partida
     entre dos páginas.
  */

  .questions-table tr {{
    page-break-inside: avoid;
    page-break-after: auto;
  }}

  /*
     Repetir encabezado de columnas
     cuando la tabla pasa a otra página.
  */

  .questions-table thead {{
    display: table-header-group;
  }}

  .questions-table tfoot {{
    display: table-footer-group;
  }}

  .questions-table th {{
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 5px 8px;
    text-align: left;
    font-size: 7.5pt;
    color: #374151;
  }}

  .questions-table td {{
    border: 1px solid #e5e7eb;
    padding: 6px 8px;
    vertical-align: top;
  }}

  .questions-table td.qnum {{
    text-align: center;
    font-weight: bold;
    color: #6b7280;
    width: 50px;
    font-size: 7.5pt;
  }}

  .qtext {{
    font-weight: 500;
    margin-bottom: 3px;
    line-height: 1.4;
  }}

  .obs {{
    font-style: italic;
    color: #374151;
    margin-top: 4px;
    background: #fef9c3;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
  }}

  .legal {{
    color: #9ca3af;
    font-size: 6.5pt;
    margin-top: 4px;
    line-height: 1.3;
  }}

  .answer-cell {{
    text-align: center;
    width: 130px;
  }}


  /* =======================================================
     BADGES
     ======================================================= */

  .badge {{
    display: inline-block;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: bold;
    white-space: nowrap;
  }}

  .badge.cumple {{
    background: #dcfce7;
    color: #15803d;
  }}

  .badge.no_cumple {{
    background: #fee2e2;
    color: #dc2626;
  }}

  .badge.no_aplica {{
    background: #f3f4f6;
    color: #6b7280;
  }}

  .badge.sin_resp {{
    background: #fef3c7;
    color: #d97706;
  }}


  /* =======================================================
     DATOS GENERALES
     ======================================================= */

  .data-section {{
    margin-bottom: 20px;
  }}

  .data-section h3 {{
    font-size: 10pt;
    font-weight: bold;
    color: #16a34a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin-bottom: 10px;

    page-break-after: avoid;
  }}

  .data-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }}

  .data-item {{
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    padding: 6px 10px;
  }}

  .data-item .lbl {{
    font-size: 7pt;
    color: #9ca3af;
    text-transform: uppercase;
    margin-bottom: 2px;
  }}

  .data-item .val {{
    font-size: 9pt;
    font-weight: 500;
  }}


  /* =======================================================
     INFORMACIÓN LABORAL
     ======================================================= */

  .labor-section {{
    margin-bottom: 20px;

    /*
      Intentar mantener esta pequeña sección junta.
    */
    page-break-inside: avoid;
  }}

  .labor-section h3 {{
    font-size: 10pt;
    font-weight: bold;
    color: #16a34a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }}


  /* =======================================================
     EVITAR FILAS HUÉRFANAS
     ======================================================= */

  .data-item {{
    page-break-inside: avoid;
  }}

</style>

</head>

<body>


<!-- =======================================================
     PORTADA
     ======================================================= -->

<div class="cover">

  <h1>
    Diagnóstico Anexo 1
  </h1>

  <img
    src="{company.logo_path}"
    class="logo"
  >

  <h2>
    Lista de Verificación SST —
    {company.razon_social or diag_out.razon_social or ''}
  </h2>

  <div class="meta">

    <p>
      <strong>Tipo:</strong>
      {tipo_label}

      &nbsp;|&nbsp;

      <strong>Fecha:</strong>
      {_format_date(diag_out.inspection_date)}

      &nbsp;|&nbsp;

      <strong>Estado:</strong>
      {status_label}
    </p>

    <p>
      <strong>Inspección N°:</strong>
      {diag_out.inspection_number or '—'}

      &nbsp;|&nbsp;

      <strong>RUC:</strong>
      {diag_out.ruc or company.ruc or '—'}
    </p>

    <p>
      <strong>Generado:</strong>
      {datetime.now().strftime('%d/%m/%Y %H:%M')}
    </p>

  </div>

</div>


<!-- =======================================================
     RESUMEN GENERAL
     ======================================================= -->

<h2 class="page-title">
  Resumen General
</h2>

<div class="stats-banner">

  <div class="stat-box blue">
    <div class="num">
      {diag_out.answered}/96
    </div>
    <div class="lbl">
      Respondidas
    </div>
  </div>

  <div class="stat-box green">
    <div class="num">
      {diag_out.cumple}
    </div>
    <div class="lbl">
      Cumplen
    </div>
  </div>

  <div class="stat-box red">
    <div class="num">
      {diag_out.no_cumple}
    </div>
    <div class="lbl">
      No cumplen
    </div>
  </div>

  <div class="stat-box gray">
    <div class="num">
      {diag_out.no_aplica}
    </div>
    <div class="lbl">
      No aplica
    </div>
  </div>

  <div class="stat-box green">
    <div class="num">
      {diag_out.compliance_percent}%
    </div>
    <div class="lbl">
      Cumplimiento
    </div>
  </div>

</div>


<!-- =======================================================
     RESUMEN POR SECCIÓN
     ======================================================= -->

<div class="summary-block">

  <h3>
    Cumplimiento por sección
  </h3>

  <table class="summary-table">

    <thead>

      <tr>

        <th>
          Sección
        </th>

        <th>
          Cumplen
        </th>

        <th>
          No cumplen
        </th>

        <th>
          No aplica
        </th>

        <th>
          Sin respuesta
        </th>

        <th>
          % Cumplimiento
        </th>

      </tr>

    </thead>

    <tbody>

      {summary_rows}

    </tbody>

  </table>

</div>


<!-- =======================================================
     DATOS DE INSPECCIÓN
     ======================================================= -->

<h2 class="page-title">
  Datos de la Inspección
</h2>


<!-- DATOS DE LA EMPRESA -->

<div class="data-section">

  <h3>
    Datos de la empresa
  </h3>

  <div class="data-grid">

    <div class="data-item">

      <div class="lbl">
        Razón social
      </div>

      <div class="val">
        {diag_out.razon_social or company.razon_social or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        RUC
      </div>

      <div class="val">
        {diag_out.ruc or company.ruc or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Empleador
      </div>

      <div class="val">
        {diag_out.employer_name or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Actividad económica
      </div>

      <div class="val">
        {diag_out.economic_activity or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Teléfono
      </div>

      <div class="val">
        {diag_out.phone or company.telefono or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Email
      </div>

      <div class="val">
        {diag_out.email or company.email_contacto or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Tipo de empresa
      </div>

      <div class="val">
        {
            (
                'Pública'
                if diag_out.company_type == 'publica'
                else 'Privada'
            )
            if diag_out.company_type
            else '—'
        }
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Centro de trabajo
      </div>

      <div class="val">
        {
            (
                'Matriz'
                if diag_out.workplace_type == 'matriz'
                else 'Sucursal'
            )
            if diag_out.workplace_type
            else '—'
        }
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Dirección
      </div>

      <div class="val">
        {diag_out.workplace_address or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Horario
      </div>

      <div class="val">
        {diag_out.work_schedule or '—'}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Número de centros de trabajo
      </div>

      <div class="val">
        {diag_out.workplace_count or 0}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        Entrevistado
      </div>

      <div class="val">
        {diag_out.interviewed or '—'}
      </div>

    </div>

  </div>

</div>


<!-- =======================================================
     INFORMACIÓN LABORAL
     ======================================================= -->

<div class="labor-section">

  <h3>
    Información Laboral
  </h3>


  <div class="data-grid">

    <div class="data-item">

      <div class="lbl">
        Total trabajadores
      </div>

      <div class="val">
        {diag_out.total_workers or 0}
      </div>

    </div>


    <div class="data-item">

      <div class="lbl">
        IESS
      </div>

      <div class="val">
        {
            "Sí"
            if diag_out.iess_payroll
            else "No"
        }
      </div>

    </div>

  </div>


  <h3 style="margin-top:14px;">
    Detalle de Trabajadores
  </h3>


  <!-- PRIMERA FILA DE TRABAJADORES -->

  <table class="summary-table">

    <thead>

      <tr>

        <th>
          Hombres
        </th>

        <th>
          Mujeres
        </th>

        <th>
          Teletrabajadores
        </th>

        <th>
          Extranjeros
        </th>

      </tr>

    </thead>

    <tbody>

      <tr>

        <td class="num">
          {diag_out.workers_male or 0}
        </td>

        <td class="num">
          {diag_out.workers_female or 0}
        </td>

        <td class="num">
          {diag_out.workers_remote or 0}
        </td>

        <td class="num">
          {diag_out.workers_foreign or 0}
        </td>

      </tr>

    </tbody>

  </table>


  <!-- SEGUNDA FILA DE TRABAJADORES -->

  <table
    class="summary-table"
    style="margin-top:8px;"
  >

    <thead>

      <tr>

        <th>
          Adolescentes
        </th>

        <th>
          Embarazadas
        </th>

        <th>
          Adultos Mayores
        </th>
        <th>
          Lactancia
        </th>

      </tr>

    </thead>

    <tbody>

      <tr>

        <td class="num">
          {diag_out.workers_teen or 0}
        </td>

        <td class="num">
          {diag_out.workers_pregnant or 0}
        </td>

        <td class="num">
          {diag_out.workers_senior or 0}
        </td>
        <td class="num">
          {diag_out.workers_nursing or 0}
        </td>

      </tr>

    </tbody>

  </table>

</div>


<!-- =======================================================
     PREGUNTAS POR SECCIÓN
     ======================================================= -->

<h2 class="page-title">
  Verificación por Sección
</h2>

{sections_html}


</body>

</html>
"""

    # =========================================================
    # GENERAR PDF
    # =========================================================

    pdf = HTML(
        string=html
    ).write_pdf()

    return pdf