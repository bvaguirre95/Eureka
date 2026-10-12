"""
Dispatcher de PDFs de inspección.
Delega al template correcto y pasa el parámetro doc (matriz|informe|ambos).
"""
from app.core.pdf_templates import get_template


def generate_inspection_pdf(insp, company,
                             template_key: str = "generico",
                             doc: str = "ambos") -> bytes:
    fn = get_template(template_key)
    # Los templates que soportan doc lo reciben como kwarg.
    # El genérico lo ignora (siempre genera un solo doc).
    try:
        return fn(insp, company, doc=doc)
    except TypeError:
        return fn(insp, company)
