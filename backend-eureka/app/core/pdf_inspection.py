"""
Dispatcher de PDFs de inspección.
- Con formato de informe (InspectionReportFormat): usa el motor configurable
  (o el template especializado que el formato indique).
- Sin formato (inspecciones/tipos anteriores): comportamiento previo vía pdf_template.
"""
from app.core.pdf_templates import get_template


def generate_inspection_pdf(insp, company,
                             template_key: str = "generico",
                             doc: str = "ambos",
                             report_format=None) -> bytes:
    if report_format is not None:
        from app.core.pdf_templates.report_engine import generate_from_format
        return generate_from_format(insp, company, report_format, doc=doc)

    fn = get_template(template_key)
    # Los templates que soportan doc lo reciben como kwarg.
    # El genérico lo ignora (siempre genera un solo doc).
    try:
        return fn(insp, company, doc=doc)
    except TypeError:
        return fn(insp, company)
