"""
Catálogo, defaults y validación de formatos de informe (secciones + diseño).

Sección = {key, kind, title, enabled, order, source, content, params}
  kind   : objetivo | alcance | introduccion | metodologia | resultados | matriz |
           hallazgos | recomendaciones | conclusiones | fotografias | firmas | personalizada
  source : static     → texto configurable fijo (admite {{placeholders}})
           captured   → dato capturado (params.field_key = general_data, params.company_attr,
                        o la fuente natural del kind: registros, acciones, recomendaciones)
           calculated → texto/resumen calculado (admite {{placeholders}} con cifras)
"""
from typing import Any, Dict, List

SECTION_KINDS = {
    "objetivo", "alcance", "introduccion", "metodologia", "resultados", "matriz",
    "hallazgos", "recomendaciones", "conclusiones", "fotografias", "firmas", "personalizada",
}
SECTION_SOURCES = {"static", "captured", "calculated"}
ORIENTATIONS = {"portrait", "landscape", "auto"}   # auto = landscape si la matriz tiene >6 columnas
SIGNATURE_MODES = {"auto", "standard", "coordinator_only"}
COMPANY_ATTRS = {"descripcion", "intro_inspeccion"}

# Placeholders disponibles en secciones static/calculated: {{nombre}}
PLACEHOLDERS = [
    "empresa", "tipo", "numero", "fecha", "lugar", "total_items",
    "items_con_hallazgos", "acciones", "acciones_pendientes", "cumplimiento",
]

# Textos por defecto (equivalentes a los del informe genérico actual)
_OBJETIVO = ("Realizar la inspección de <strong>{{tipo}}</strong> en las instalaciones de "
             "<strong>{{empresa}}</strong>, verificando el cumplimiento de los requisitos "
             "normativos y condiciones de seguridad establecidas, identificando condiciones "
             "inseguras y determinando las acciones correctivas correspondientes.")
_INTRO = ("La presente inspección se realiza en cumplimiento del Sistema de Gestión de "
          "Seguridad y Salud en el Trabajo (SG-SST) de <strong>{{empresa}}</strong>, conforme "
          "a lo dispuesto en el Decreto Ejecutivo 2393, el Instrumento Andino de Seguridad y "
          "Salud en el Trabajo (Decisión 584) y la normativa técnica aplicable.")
_CONCL = ("Se inspeccionaron <strong>{{total_items}}</strong> ítem(s), de los cuales "
          "<strong>{{items_con_hallazgos}}</strong> presentaron hallazgos que requieren atención. "
          "Se generaron <strong>{{acciones}}</strong> acción(es) correctiva(s), de las cuales "
          "<strong>{{acciones_pendientes}}</strong> se encuentran pendientes de implementación.")


def _s(kind, title, order, source="captured", enabled=True, content="", params=None, key=None):
    return {"key": key or kind, "kind": kind, "title": title, "enabled": enabled,
            "order": order, "source": source, "content": content, "params": params or {}}


def default_sections() -> List[Dict[str, Any]]:
    """Informe genérico estándar. Opcionales desactivadas por defecto."""
    return [
        _s("objetivo",        "Objetivo",                   1, "static", content=_OBJETIVO),
        _s("alcance",         "Alcance",                    2, "static", enabled=False),
        _s("introduccion",    "Antecedentes",               3, "static", content=_INTRO),
        _s("metodologia",     "Metodología",                4, "static", enabled=False),
        _s("resultados",      "Resultados",                 5, "calculated"),
        _s("matriz",          "Registros de inspección",    6),
        _s("hallazgos",       "Hallazgos y acciones correctivas", 7),
        _s("recomendaciones", "Observaciones y recomendaciones",  8),
        _s("conclusiones",    "Conclusiones",               9, "calculated", content=_CONCL),
        _s("fotografias",     "Registro fotográfico",      10, enabled=False),
        _s("firmas",          "Firmas",                    11),
    ]


def formulario_pdf_sections() -> List[Dict[str, Any]]:
    """Formulario compacto para campo: resultados + matriz + firmas."""
    return [
        _s("resultados", "Lista de verificación", 1, "captured"),
        _s("matriz",     "Registros de inspección", 2),
        _s("firmas",     "Firmas", 3),
    ]


def default_layout() -> Dict[str, Any]:
    return {
        "orientation": "auto",
        "header": {"show_logo": True,
                   "title": "SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO",
                   "subtitle": None},          # None → "INSPECCIÓN DE <TIPO>"
        "doc_code": None,                       # None → número de la inspección
        "doc_version": None,                    # None → versión del formato (01, 02…)
        "footer": {"text": "", "show_page_numbers": True},
        "tables": {"header_color": "#1f3864", "highlight_findings": True},
        "signatures": {"mode": "auto"},         # auto = solo coordinador si elabora un coordinador
    }


def merge_layout(layout: Dict[str, Any] | None) -> Dict[str, Any]:
    """Layout completo: defaults + lo configurado (merge de 1 nivel)."""
    base = default_layout()
    for k, v in (layout or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            base[k] = {**base[k], **v}
        else:
            base[k] = v
    return base


def validate_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Valida y normaliza. Lanza ValueError con mensaje legible."""
    seen, out = set(), []
    for i, raw in enumerate(sections or []):
        kind = raw.get("kind")
        if kind not in SECTION_KINDS:
            raise ValueError(f"Sección {i + 1}: tipo '{kind}' no válido")
        key = raw.get("key") or kind
        if key in seen:
            raise ValueError(f"Clave de sección duplicada: '{key}'")
        seen.add(key)
        source = raw.get("source") or "static"
        if source not in SECTION_SOURCES:
            raise ValueError(f"Sección '{key}': source '{source}' no válido")
        params = raw.get("params") or {}
        ca = params.get("company_attr")
        if ca and ca not in COMPANY_ATTRS:
            raise ValueError(f"Sección '{key}': company_attr '{ca}' no permitido")
        if params.get("check_style") not in (None, "text", "subcolumns"):
            raise ValueError(f"Sección '{key}': check_style debe ser text o subcolumns")
        if params.get("response_style") not in (None, "list", "columns"):
            raise ValueError(f"Sección '{key}': response_style debe ser list o columns")
        if params.get("layout") not in (None, "foto", "resumen"):
            raise ValueError(f"Sección '{key}': layout debe ser foto o resumen")
        bad = set(params.get("columns") or []) - {"item", "foto", "hallazgo", "accion", "clase",
                                                   "responsable", "inicio", "fin"}
        if bad:
            raise ValueError(f"Sección '{key}': columnas no válidas {sorted(bad)}")
        if kind == "personalizada" and not (raw.get("title") or "").strip():
            raise ValueError(f"Sección '{key}': las secciones personalizadas requieren título")
        out.append({
            "key": key, "kind": kind, "title": raw.get("title") or kind.capitalize(),
            "enabled": bool(raw.get("enabled", True)),
            "order": int(raw.get("order", i + 1)),
            "source": source, "content": raw.get("content") or "", "params": params,
        })
    return out


def validate_layout(layout: Dict[str, Any] | None) -> Dict[str, Any]:
    lay = layout or {}
    if lay.get("orientation") and lay["orientation"] not in ORIENTATIONS:
        raise ValueError(f"Orientación '{lay['orientation']}' no válida")
    mode = (lay.get("signatures") or {}).get("mode")
    if mode and mode not in SIGNATURE_MODES:
        raise ValueError(f"Modo de firmas '{mode}' no válido")
    return lay
