"""
Sistema de templates de PDF para inspecciones.

Cómo agregar un template nuevo:
1. Crea un archivo en este directorio: pdf_templates/mi_template.py
2. Define una función: def generate(insp, company) -> bytes
3. Regístralo en TEMPLATES abajo.

El template "generico" es el fallback para cualquier tipo no registrado.
"""
from typing import Callable


def _load_templates() -> dict:
    from app.core.pdf_templates import template_generico, template_eureka_extintores
    return {
        "generico":           template_generico.generate,
        "eureka_extintores":  template_eureka_extintores.generate,
        # ── Agrega aquí nuevos templates ──────────────────────────────────
        # "banos":         template_banos.generate,
        # "epp":           template_epp.generate,
        # "andamios":      template_andamios.generate,
    }


TEMPLATES: dict[str, Callable] = {}   # se llena en el primer uso


def get_template(key: str) -> Callable:
    global TEMPLATES
    if not TEMPLATES:
        TEMPLATES = _load_templates()
    return TEMPLATES.get(key) or TEMPLATES["generico"]


AVAILABLE_TEMPLATES = [
    {"key": "generico",          "label": "Genérico (aplica para cualquier tipo)"},
    {"key": "eureka_extintores", "label": "Eureka — Informe de Extintores Portátiles"},
    # Agrega aquí la descripción de los nuevos templates para mostrarlos en el frontend
]
