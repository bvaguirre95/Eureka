"""
Formatos de informe globales (genéricos reutilizables + especializados).
Ejecutar después de la migración:   python scripts/seed_report_formats.py
Idempotente: no duplica por (code, version=1).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.report_formats import default_layout, default_sections, formulario_pdf_sections
from app.database import SessionLocal
from app.models.inspection_report_format import InspectionReportFormat as RF

GLOBAL_FORMATS = [
    dict(code="GENERICO_INFORME", name="Informe genérico configurable",
         description="Informe estándar con secciones opcionales (objetivo, alcance, metodología, fotografías…).",
         document_kind="informe_configurable", pdf_template=None,
         sections=default_sections(), layout=default_layout()),
    dict(code="GENERICO_FORMULARIO", name="Formulario PDF genérico",
         description="Formulario compacto para campo: verificación, matriz y firmas.",
         document_kind="formulario_pdf", pdf_template=None,
         sections=formulario_pdf_sections(), layout=default_layout()),
    dict(code="MATRIZ_AGRUPADA", name="Matriz con encabezados agrupados y subcolumnas",
         description="Matriz con grupos de columnas y checks S|N / B|M (gabinetes, pisos, tableros) + resumen de hallazgos.",
         document_kind="formulario_pdf", pdf_template=None,
         sections=[
             dict(key="matriz", kind="matriz", title="Matriz de inspección", enabled=True, order=1,
                  source="captured", content="", params={"check_style": "subcolumns"}),
             dict(key="hallazgos", kind="hallazgos", title="Resumen de hallazgos", enabled=True, order=2,
                  source="captured", content="", params={"layout": "resumen"}),
             dict(key="firmas", kind="firmas", title="Firmas", enabled=True, order=3,
                  source="captured", content="", params={})],
         layout={**default_layout(), "orientation": "landscape"}),
    dict(code="CHECKLIST_COLUMNAS", name="Checklist con columnas de respuesta",
         description="Lista de verificación Cumple / No cumple / N/A con observación por fila (luminarias, montacargas, vehículos).",
         document_kind="formulario_pdf", pdf_template=None,
         sections=[
             dict(key="resultados", kind="resultados", title="Lista de verificación", enabled=True, order=1,
                  source="captured", content="",
                  params={"response_style": "columns", "labels": {"S": "Cumple", "N": "No cumple"}}),
             dict(key="firmas", kind="firmas", title="Firmas", enabled=True, order=2,
                  source="captured", content="", params={})],
         layout=default_layout()),
    dict(code="INFORME_HALLAZGOS_FOTO", name="Informe con hallazgos y registro fotográfico",
         description="Objetivo, áreas inspeccionadas con foto | hallazgo | acción, recomendaciones y firmas.",
         document_kind="informe_configurable", pdf_template=None,
         sections=[
             dict(key="objetivo", kind="objetivo", title="Objetivo", enabled=True, order=1, source="static",
                  content="Realizar la inspección de <strong>{{tipo}}</strong> en <strong>{{empresa}}</strong> e identificar condiciones inseguras.",
                  params={}),
             dict(key="hallazgos", kind="hallazgos", title="Áreas inspeccionadas", enabled=True, order=2,
                  source="captured", content="", params={"layout": "foto"}),
             dict(key="recomendaciones", kind="recomendaciones", title="Recomendaciones generales", enabled=True,
                  order=3, source="captured", content="", params={}),
             dict(key="firmas", kind="firmas", title="Firmas", enabled=True, order=4,
                  source="captured", content="", params={})],
         layout=default_layout()),
    dict(code="EUREKA_EXTINTORES", name="Eureka — Informe de Extintores Portátiles",
         description="Informe personalizado con tablas y orientaciones propias del informe de extintores.",
         document_kind="informe_personalizado", pdf_template="eureka_extintores",
         sections=[], layout={}),
]


def seed():
    db = SessionLocal()
    try:
        for d in GLOBAL_FORMATS:
            if db.query(RF).filter(RF.organization_id.is_(None), RF.code == d["code"], RF.version == 1).first():
                print(f"  ⏭  Ya existe: {d['name']}")
                continue
            db.add(RF(organization_id=None, version=1, **d))
            print(f"  ✅ Creado: {d['name']}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
