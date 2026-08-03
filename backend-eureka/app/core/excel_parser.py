"""
Parser de Excel para importación de plantillas de inspección.

Detecta la estructura del archivo y propone:
  - FORMULARIO/CHECKLIST: una sola sección de preguntas con respuesta simple
  - MATRIZ: tabla con encabezados de columna donde cada fila es un ítem
  - FORMULARIO_MATRIZ: combinación de ambas

Heurísticas:
  1. Si hay una fila de encabezados seguida de N filas de datos similares → MATRIZ
  2. Si hay columnas tipo "Cumple / No cumple / N/A" o "Sí/No" → CHECK
  3. Si hay campos de cabecera (Empresa, Fecha, Responsable) antes de la tabla → FORMULARIO_MATRIZ
  4. Si todas las filas son del estilo "pregunta | respuesta" → FORMULARIO
"""

import re
from typing import Any, Dict, List, Optional, Tuple

try:
    import openpyxl
    from openpyxl.utils import get_column_letter
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


# ── Palabras clave para detectar tipos de campo ───────────────────────────────

_KW_DATE     = {"fecha", "date", "vencimiento", "vigencia", "plazo", "caducidad"}
_KW_CHECK_SN = {"cumple", "sí", "si", "no", "aplica", "n/a", "na", "conforme",
                "ok", "check", "cumplimiento"}
_KW_CHECK_BM = {"bueno", "malo", "regular", "estado", "condición", "condicion"}
_KW_OBS      = {"observaci", "nota", "comentario", "descripci", "detalle", "remark"}
_KW_FOTO     = {"foto", "imagen", "photo", "evidencia", "image"}
_KW_NUM      = {"número", "numero", "cantidad", "capacidad", "peso", "kg", "litro",
                "presión", "presion", "temperatura", "psi", "bar", "code", "código"}

_KW_GENERAL  = {"empresa", "organización", "organizacion", "area", "área",
                "responsable", "inspector", "fecha", "turno", "período", "periodo",
                "sede", "sucursal", "departamento", "cargo", "jefe"}

_KW_ANSWER   = {"sí", "si", "no", "n/a", "na", "x", "✓", "✗", "ok",
                "bueno", "malo", "conforme", "no conforme"}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def _detect_field_type(header: str, sample_values: List[str]) -> str:
    h = _normalize(header)

    # Por nombre del encabezado
    if any(kw in h for kw in _KW_DATE):
        return "fecha"
    if any(kw in h for kw in _KW_OBS):
        return "observacion"
    if any(kw in h for kw in _KW_FOTO):
        return "foto"
    if any(kw in h for kw in _KW_NUM):
        return "numero"

    # Por valores de muestra
    sv = {_normalize(v) for v in sample_values if v}
    if sv and sv <= _KW_ANSWER:
        if {"bueno", "malo", "regular"} & sv:
            return "check_bm"
        if {"n/a", "na"} & sv:
            return "check_sna"
        return "check_sn"

    if any(kw in h for kw in _KW_CHECK_SN):
        return "check_sna"
    if any(kw in h for kw in _KW_CHECK_BM):
        return "check_bm"

    return "texto"


def _slugify(text: str) -> str:
    s = _normalize(text)
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", "_", s).strip("_")
    return s[:50] or "campo"


def _is_empty_row(row) -> bool:
    return all(cell.value is None or str(cell.value).strip() == "" for cell in row)


def _cell_value(cell) -> str:
    if cell.value is None:
        return ""
    return str(cell.value).strip()


# ── Función principal ─────────────────────────────────────────────────────────

def parse_excel(file_bytes: bytes) -> Dict[str, Any]:
    """
    Analiza un archivo Excel y retorna la estructura detectada.

    Retorna:
    {
        "detected_structure": "formulario" | "matriz" | "formulario_matriz",
        "confidence": "alta" | "media" | "baja",
        "sheet_name": str,
        "general_fields": [...],   # campos de cabecera detectados
        "matrix_fields": [...],    # columnas de la tabla detectada
        "preview_rows": [...],     # primeras filas de datos (para previsualización)
        "warnings": [...],         # advertencias sobre la detección
        "raw_headers": [...],      # encabezados crudos detectados
    }
    """
    if not HAS_OPENPYXL:
        raise RuntimeError("openpyxl no está instalado. Ejecuta: pip install openpyxl")

    import io
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active

    all_rows = list(ws.iter_rows())
    if not all_rows:
        return _empty_result("El archivo está vacío")

    warnings = []
    general_fields = []
    matrix_fields  = []
    preview_rows   = []

    # ── Paso 1: Detectar filas de cabecera (Empresa, Fecha...) ───────────────
    header_row_idx = None   # índice de la fila que tiene los encabezados de columna
    pre_header_rows = []    # filas antes de la tabla (posibles datos generales)

    for i, row in enumerate(all_rows):
        if _is_empty_row(row):
            continue
        values = [_cell_value(c) for c in row if _cell_value(c)]
        if len(values) >= 3:
            # Fila con 3+ celdas pobladas → candidata a encabezado de matriz
            header_row_idx = i
            break
        else:
            pre_header_rows.append((i, row))

    if header_row_idx is None:
        return _empty_result("No se detectó una estructura tabular en el archivo")

    # ── Paso 2: Extraer encabezados de la tabla ───────────────────────────────
    header_row = all_rows[header_row_idx]
    raw_headers = [_cell_value(c) for c in header_row if _cell_value(c)]

    if not raw_headers:
        return _empty_result("No se detectaron encabezados de columna")

    # ── Paso 3: Leer filas de datos (hasta 50) ────────────────────────────────
    data_rows = []
    for row in all_rows[header_row_idx + 1:header_row_idx + 51]:
        if _is_empty_row(row):
            continue
        vals = [_cell_value(c) for c in row]
        # Alinear con headers
        vals = vals[:len(raw_headers)]
        while len(vals) < len(raw_headers):
            vals.append("")
        data_rows.append(vals)

    if len(data_rows) == 0:
        warnings.append("No se encontraron filas de datos después de los encabezados")

    # ── Paso 4: Recopilar valores de muestra por columna ─────────────────────
    sample_by_col = {h: [] for h in raw_headers}
    for row_vals in data_rows[:10]:
        for h, v in zip(raw_headers, row_vals):
            if v:
                sample_by_col[h].append(v)

    # ── Paso 5: Construir matrix_fields con tipo detectado ───────────────────
    seen_keys = set()
    for order, header in enumerate(raw_headers):
        if not header:
            continue
        key = _slugify(header)
        # Evitar duplicados
        orig_key = key
        cnt = 1
        while key in seen_keys:
            key = f"{orig_key}_{cnt}"
            cnt += 1
        seen_keys.add(key)

        field_type = _detect_field_type(header, sample_by_col.get(header, []))
        matrix_fields.append({
            "name":        header,
            "field_key":   key,
            "field_type":  field_type,
            "options":     None,
            "is_required": False,
            "order":       order,
            "group_name":  None,
            "scope":       "matriz",
        })

    # ── Paso 6: Detectar campos generales en filas pre-tabla ─────────────────
    for _, row in pre_header_rows:
        cells = [_cell_value(c) for c in row]
        non_empty = [c for c in cells if c]
        if len(non_empty) == 2:
            # Patrón "Etiqueta: Valor" → posible campo general
            label, _ = non_empty[0], non_empty[1]
            label_n = _normalize(label).rstrip(":")
            if any(kw in label_n for kw in _KW_GENERAL):
                ft = _detect_field_type(label, [])
                general_fields.append({
                    "name":        label.rstrip(":").strip(),
                    "field_key":   _slugify(label),
                    "field_type":  ft,
                    "options":     None,
                    "is_required": False,
                    "order":       len(general_fields),
                    "group_name":  None,
                    "scope":       "general",
                })
        elif len(non_empty) == 1:
            # Podría ser un título — ignorar
            pass

    # ── Paso 7: Detectar si parece FORMULARIO (no matriz) ────────────────────
    # Heurística: pocas columnas (≤3) donde una se llama "aspecto/ítem/descripción"
    # y otra "cumple/sí/no/resultado"
    is_checklist = False
    if len(raw_headers) <= 4:
        h_norm = [_normalize(h) for h in raw_headers]
        has_item_col = any(
            any(kw in h for kw in {"aspecto", "ítem", "item", "descripci", "verificar", "criterio"})
            for h in h_norm
        )
        has_answer_col = any(
            any(kw in h for kw in _KW_CHECK_SN | _KW_CHECK_BM)
            for h in h_norm
        )
        if has_item_col and has_answer_col and len(data_rows) > 2:
            # Parece un checklist — convertir a formulario con campos check
            is_checklist = True

    if is_checklist:
        # Cada fila de datos se convierte en un campo del formulario
        general_fields = []
        matrix_fields  = []
        for dr_idx, row_vals in enumerate(data_rows):
            # Buscar la columna que tiene el nombre del ítem
            item_col_idx = 0
            for ci, h in enumerate(raw_headers):
                if any(kw in _normalize(h) for kw in
                       {"aspecto", "ítem", "item", "descripci", "verificar", "criterio"}):
                    item_col_idx = ci
                    break
            item_name = row_vals[item_col_idx] if row_vals else f"Ítem {dr_idx + 1}"
            if not item_name:
                continue
            # Detectar tipo de campo por las otras columnas
            other_headers = [h for i, h in enumerate(raw_headers) if i != item_col_idx]
            ft = "check_sna" if any(
                any(kw in _normalize(h) for kw in {"n/a", "na", "aplica"})
                for h in other_headers
            ) else "check_sn"

            general_fields.append({
                "name":        item_name,
                "field_key":   _slugify(item_name),
                "field_type":  ft,
                "options":     None,
                "is_required": False,
                "order":       dr_idx,
                "group_name":  None,
                "scope":       "general",
            })

        # Agregar campo de observaciones al final si había columna de obs
        if any(any(kw in _normalize(h) for kw in _KW_OBS) for h in raw_headers):
            general_fields.append({
                "name": "Observaciones", "field_key": "observaciones",
                "field_type": "observacion", "options": None,
                "is_required": False, "order": len(general_fields),
                "group_name": None, "scope": "general",
            })

    # ── Paso 8: Determinar estructura y confianza ─────────────────────────────
    if is_checklist:
        structure = "formulario"
        confidence = "alta" if len(general_fields) >= 3 else "media"
    elif general_fields and matrix_fields:
        structure = "formulario_matriz"
        confidence = "alta"
    elif matrix_fields:
        structure = "matriz"
        confidence = "alta" if len(data_rows) > 1 else "media"
    else:
        structure = "formulario"
        confidence = "baja"
        warnings.append("No se pudo determinar la estructura con certeza")

    # ── Preview (primeras 5 filas) ────────────────────────────────────────────
    for row_vals in data_rows[:5]:
        preview_rows.append(dict(zip(raw_headers, row_vals)))

    wb.close()

    return {
        "detected_structure": structure,
        "confidence":         confidence,
        "sheet_name":         ws.title,
        "general_fields":     general_fields,
        "matrix_fields":      matrix_fields,
        "preview_rows":       preview_rows,
        "warnings":           warnings,
        "raw_headers":        raw_headers,
        "total_data_rows":    len(data_rows),
    }


def _empty_result(warning: str) -> Dict[str, Any]:
    return {
        "detected_structure": "formulario",
        "confidence":         "baja",
        "sheet_name":         "",
        "general_fields":     [],
        "matrix_fields":      [],
        "preview_rows":       [],
        "warnings":           [warning],
        "raw_headers":        [],
        "total_data_rows":    0,
    }