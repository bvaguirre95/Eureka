"""
Utilidades para acceder a imágenes estáticas desde los templates de PDF.

Los archivos van en:  app/static/pdf/<categoria>/<archivo>

WeasyPrint necesita los datos embebidos (base64) o una URL absoluta.
Esta función devuelve siempre data URI base64 para máxima compatibilidad.

Uso:
    from app.core.pdf_templates.static_assets import static_img, EXTINTOR_PQS, EXTINTOR_CO2

    <img src="{EXTINTOR_PQS}">
    # o dinámico:
    src = static_img("pdf/extintores/extintor_pqs.jpeg")
"""
import base64
import os

# Directorio raíz de estáticos: app/static/
# __file__ está en app/core/pdf_templates/static_assets.py
# → dirname → app/core/pdf_templates/
# → dirname → app/core/
# → dirname → app/
STATIC_DIR = os.path.join(
    os.path.dirname(  # app/
        os.path.dirname(  # app/core/
            os.path.dirname(  # app/core/pdf_templates/
                os.path.abspath(__file__)
            )
        )
    ),
    "static"
)


def static_img(relative_path: str) -> str:
    """
    Lee una imagen desde app/static/<relative_path> y devuelve un data URI base64.
    Devuelve cadena vacía si el archivo no existe.
    """
    full_path = os.path.join(STATIC_DIR, relative_path)
    if not os.path.exists(full_path):
        return ""

    ext = os.path.splitext(full_path)[1].lower().lstrip(".")
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png", "svg": "image/svg+xml",
                "webp": "image/webp", "gif": "image/gif"}
    mime = mime_map.get(ext, f"image/{ext}")

    with open(full_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    return f"data:{mime};base64,{b64}"


# ── Constantes precargadas (para templates que las usan frecuentemente) ───────
# Se cargan lazy la primera vez que se importan (no al arrancar el servidor)

_cache: dict[str, str] = {}


def _cached(path: str) -> str:
    if path not in _cache:
        _cache[path] = static_img(path)
    return _cache[path]


# Extintores
def get_extintor_pqs() -> str:
    return _cached("extintores/pqs.png")

def get_extintor_co2() -> str:
    return _cached("extintores/co2.png")
def get_logo() -> str:
    return _cached("logo.png")