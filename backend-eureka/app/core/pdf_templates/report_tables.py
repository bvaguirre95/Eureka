"""
Tablas avanzadas para el motor de informes (no sustituyen a las de template_generico):
  - matrix_table    : encabezados agrupados (group_name) y checks en subcolumnas (S|N, B|M, Cumple|No cumple…)
  - checklist_table : lista de verificación con columnas de respuesta + observación por fila
  - findings_table  : hallazgos con columnas configurables (incl. registro fotográfico, fechas)
"""
import html as _h
import os

from app.core.pdf_templates import template_generico as G

CHECK_CHOICES = {
    "check_sn":  [("S", "S"), ("N", "N")],
    "check_bm":  [("B", "B"), ("M", "M")],
    "check_sna": [("S", "S"), ("N", "N"), ("NA", "N/A")],
}
NEGATIVE = {"N", "M"}


def ftype(f) -> str:
    return str(getattr(f.field_type, "value", f.field_type))


def choices(f, labels=None):
    """[(valor, etiqueta)] si el campo es de respuesta cerrada; None si es libre."""
    ft = ftype(f)
    if ft in CHECK_CHOICES:
        ch = list(CHECK_CHOICES[ft])
    elif ft == "seleccion" and f.options:
        ch = [(o.strip(), o.strip()) for o in f.options.split("|")
              if o.strip() and not o.startswith("__")]
        if not ch:
            return None
    else:
        return None
    return [(v, (labels or {}).get(v, l)) for v, l in ch]


def _vals(record):
    return {v.field_id: v.value for v in record.values}


def _mark(value, v):
    if str(value or "") != v:
        return "<td class='c'></td>"
    neg = " neg" if v in NEGATIVE else ""
    return f"<td class='c x{neg}'>X</td>"


# ── Matriz ────────────────────────────────────────────────────────────────────

def matrix_table(fields, records, params=None) -> str:
    params = params or {}
    labels = params.get("labels")
    sub = params.get("check_style") == "subcolumns"
    number_col = params.get("number_col", True)
    chs = {f.id: (choices(f, labels) if sub else None) for f in fields}
    has_group = params.get("group_headers", True) and any(f.group_name for f in fields)
    has_sub = any(chs.values())
    H = (1 if has_group else 0) + 1 + (1 if has_sub else 0)
    rows = [[] for _ in range(H)]
    if number_col:
        rows[0].append(f"<th class='c' rowspan='{H}' style='width:30px'>N°</th>")

    i = 0
    while i < len(fields):
        f = fields[i]
        gname = f.group_name if has_group else None
        run = [f]
        if gname:
            while i + len(run) < len(fields) and fields[i + len(run)].group_name == gname:
                run.append(fields[i + len(run)])
        r0 = 1 if gname else 0
        if gname:
            span = sum(len(chs[x.id]) if chs[x.id] else 1 for x in run)
            rows[0].append(f"<th class='c grp' colspan='{span}'>{_h.escape(gname)}</th>")
        for x in run:
            ch = chs[x.id]
            name = _h.escape(x.name)
            if ch:
                rows[r0].append(f"<th class='c' colspan='{len(ch)}' rowspan='{H - 1 - r0}'>{name}</th>")
                rows[H - 1] += [f"<th class='c sub'>{_h.escape(l)}</th>" for _, l in ch]
            else:
                rows[r0].append(f"<th class='c' rowspan='{H - r0}'>{name}</th>")
        i += len(run)

    thead = "".join(f"<tr>{''.join(r)}</tr>" for r in rows)
    ncols = (1 if number_col else 0) + sum(len(c) if c else 1 for c in chs.values())
    body = ""
    for n, rec in enumerate(records, 1):
        vals = _vals(rec)
        cells = f"<td class='c n'>{n:03d}</td>" if number_col else ""
        for f in fields:
            v = vals.get(f.id, "")
            if chs[f.id]:
                cells += "".join(_mark(v, val) for val, _ in chs[f.id])
            else:
                cells += f"<td class='{'c' if G._is_check(f.field_type) else ''}'>{G._fmt(f.field_type, v)}</td>"
        body += f"<tr class='{'f' if rec.has_finding else ''}'>{cells}</tr>"
    if not body:
        body = f"<tr><td colspan='{ncols}' class='c i'>Sin registros</td></tr>"
    tight = " tight" if ncols > 10 else ""
    return f"<table class='dt{tight}'><thead>{thead}</thead><tbody>{body}</tbody></table>"


# ── Checklist con columnas de respuesta ───────────────────────────────────────

_OBS_SUFFIXES = ("_obs", "_observacion")


def _obs_key(f):
    for s in _OBS_SUFFIXES:
        if f.field_key.endswith(s):
            return f.field_key[: -len(s)]
    return None


def checklist_table(fields, records, params=None) -> str:
    """Una fila por campo; columnas = opciones de respuesta; observación junto a su pregunta
    (campo 'observacion' con field_key '<clave>_obs')."""
    params = params or {}
    labels = params.get("labels")
    fields = sorted(fields, key=lambda f: f.order)
    keys = {f.field_key for f in fields}
    obs_of = {_obs_key(f): f for f in fields
              if ftype(f) == "observacion" and _obs_key(f) in keys}
    skip = {f.id for f in obs_of.values()}
    main = [f for f in fields if f.id not in skip]
    vals = _vals(records[0]) if records else {}

    cols = []                                   # [(valor, etiqueta)] en orden de aparición
    for f in main:
        for v, l in (choices(f, labels) or []):
            if v not in [c[0] for c in cols]:
                cols.append((v, l))
    has_obs = bool(obs_of)
    span = len(cols) + (1 if has_obs else 0)

    th = "".join(f"<th class='c' style='width:48px'>{_h.escape(l)}</th>" for _, l in cols)
    th += "<th>Observación</th>" if has_obs else ""
    html = f"<table class='dt'><thead><tr><th>Descripción</th>{th}</tr></thead><tbody>"
    last_group = object()
    for f in main:
        if (f.group_name or "") != last_group:
            last_group = f.group_name or ""
            if last_group:
                html += f"<tr><td colspan='{span + 1}' class='gh'>{_h.escape(last_group)}</td></tr>"
        v = vals.get(f.id, "")
        ch = choices(f, labels)
        obs = vals.get(obs_of[f.field_key].id, "") if f.field_key in obs_of else ""
        if ch:
            cells = "".join(_mark(v, val) if val in dict(ch) else "<td></td>" for val, _ in cols)
            cells += f"<td>{_h.escape(str(obs or ''))}</td>" if has_obs else ""
        else:
            cells = f"<td colspan='{span}'>{_h.escape(str(v)) if v not in (None, '') else '—'}</td>"
        html += f"<tr><td>{_h.escape(f.name)}</td>{cells}</tr>"
    return html + "</tbody></table>"


# ── Hallazgos con columnas configurables ──────────────────────────────────────

PRESETS = {
    "foto":    ["item", "foto", "hallazgo", "accion"],
    "resumen": ["item", "hallazgo", "accion", "responsable", "inicio", "fin"],
}
HEADERS = {"item": "Ítem", "foto": "Registro fotográfico", "hallazgo": "Hallazgo",
           "accion": "Acciones a seguir", "clase": "Clase", "responsable": "Responsable",
           "inicio": "Iniciación", "fin": "Terminación"}
VALID_COLUMNS = set(HEADERS)


def findings_table(actions, records, params=None) -> str:
    params = params or {}
    cols = params.get("columns") or PRESETS.get(params.get("layout"), PRESETS["resumen"])
    by_id = {r.id: r for r in records}
    order = {r.id: i for i, r in enumerate(records, 1)}

    def cell(key, a):
        if key == "item":
            return f"<td class='c'>{_h.escape(a.item_ref or (f'{order[a.record_id]:03d}' if a.record_id in order else '—'))}</td>"
        if key == "foto":
            rec = by_id.get(a.record_id)
            p = getattr(rec, "photo_path", None) if rec else None
            src = G._logo_b64(p) if p and os.path.exists(p) else ""
            return (f"<td class='c'><img src='{src}' style='max-width:58mm;max-height:42mm'></td>"
                    if src else "<td class='c i'>—</td>")
        if key == "hallazgo":    return f"<td>{_h.escape(a.description or '')}</td>"
        if key == "accion":      return f"<td>{_h.escape(a.action or '—')}</td>"
        if key == "clase":       return f"<td class='c'><b>{_h.escape(a.priority or '—')}</b></td>"
        if key == "responsable": return f"<td class='c'>{_h.escape(a.responsible_name or '—')}</td>"
        if key == "inicio":      return f"<td class='c'>{G._date_short(a.due_date_start)}</td>"
        if key == "fin":         return f"<td class='c'>{G._date_short(a.due_date_end)}</td>"
        return "<td></td>"

    head = ""
    if "inicio" in cols and "fin" in cols:      # encabezado "Fecha" que agrupa inicio/fin
        i0 = cols.index("inicio")
        top = "".join(f"<th class='c' rowspan='2'>{HEADERS[k]}</th>" for k in cols[:i0])
        top += "<th class='c' colspan='2'>Fecha</th>"
        top += "".join(f"<th class='c' rowspan='2'>{HEADERS[k]}</th>" for k in cols[i0 + 2:])
        head = f"<tr>{top}</tr><tr><th class='c'>Iniciación</th><th class='c'>Terminación</th></tr>"
    else:
        head = "<tr>" + "".join(f"<th class='c'>{HEADERS[k]}</th>" for k in cols) + "</tr>"
    rows = "".join(f"<tr>{''.join(cell(k, a) for k in cols)}</tr>" for a in actions) or \
        f"<tr><td colspan='{len(cols)}' class='c i'>Sin hallazgos</td></tr>"
    return f"<table class='dt'><thead>{head}</thead><tbody>{rows}</tbody></table>"
