"""
Motor de informes configurables.

Genera el PDF a partir de un InspectionReportFormat (secciones + diseño),
reutilizando los bloques de template_generico (tablas, hallazgos, checklist,
firmas, cabecera). Los formatos "personalizados" delegan en el template
registrado en pdf_templates (p. ej. eureka_extintores), sin cambios.
"""
import html as _html
import os
import re
from datetime import datetime

from weasyprint import HTML

from app.core.report_formats import (
    default_sections, formulario_pdf_sections, merge_layout, validate_sections,
)
from app.core.pdf_templates import template_generico as G
from app.core.pdf_templates import report_tables as T

_ALLOWED_TAGS = re.compile(r"&lt;(/?)(strong|b|i|em|u|br|ul|ol|li|p)\s*/?&gt;", re.I)


def _safe_html(text: str) -> str:
    """Escapa todo salvo un conjunto mínimo de etiquetas de formato."""
    esc = _html.escape(text or "", quote=False)
    return _ALLOWED_TAGS.sub(lambda m: f"<{m.group(1)}{m.group(2).lower()}>", esc)


def _paragraphs(text: str) -> str:
    if not text.strip():
        return ""
    if re.search(r"<(p|ul|ol)\b", text):
        return text
    return "".join(f"<p>{ln}</p>" for ln in text.split("\n") if ln.strip())


def _retitle(block: str, n: int, title: str) -> str:
    return re.sub(r"<h2>.*?</h2>", f"<h2>{n}. {_html.escape(title)}</h2>", block, count=1, flags=re.S)


def _strip_h2(block: str) -> str:
    return re.sub(r"<h2>.*?</h2>", "", block, count=1, flags=re.S)


# ── Contexto y placeholders ───────────────────────────────────────────────────

def _context(insp, company):
    records = list(insp.records or [])
    actions = list(insp.actions or [])
    total = len(records)
    with_find = sum(1 for r in records if r.has_finding)
    open_act = sum(1 for a in actions if str(getattr(a.status, "value", a.status)) in ("pendiente", "en_progreso"))
    pct = round((total - with_find) / total * 100, 1) if total else 0
    all_fields = sorted(insp.inspection_type_fields, key=lambda f: f.order)
    scope = lambda f: str(getattr(getattr(f, "scope", None), "value", getattr(f, "scope", "matriz")))
    structure = str(getattr(insp.structure_type, "value", insp.structure_type) or "matriz")
    return {
        "insp": insp, "company": company, "structure": structure,
        "general_data": getattr(insp, "general_data", None) or {},
        "all_fields": all_fields,
        "general_fields": [f for f in all_fields if scope(f) == "general"],
        "matrix_fields": [f for f in all_fields if scope(f) != "general"],
        "vars": {
            "empresa": company.razon_social, "tipo": insp.inspection_type_name,
            "numero": insp.inspection_number or "—", "fecha": G._date_long(insp.scheduled_date),
            "lugar": insp.location or "—", "total_items": total,
            "items_con_hallazgos": with_find, "acciones": len(actions),
            "acciones_pendientes": open_act, "cumplimiento": f"{pct}%",
        },
        "total": total, "with_find": with_find, "pct": pct,
    }


def _fill(content: str, ctx) -> str:
    """Sanea el HTML de la plantilla y sustituye {{var}} por valores calculados (escapados)."""
    def rep(m):
        name = m.group(1).strip()
        if name.startswith("gd."):                       # {{gd.field_key}} → dato capturado
            return _html.escape(str(ctx["general_data"].get(name[3:], "") or "—"))
        return _html.escape(str(ctx["vars"].get(name, m.group(0))))
    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", rep, _safe_html(content))


# ── Renderizado por tipo de sección ───────────────────────────────────────────

def _text_section(sec, n, ctx):
    src, params = sec["source"], sec.get("params") or {}
    if src == "captured":
        if params.get("field_key"):
            raw = ctx["general_data"].get(params["field_key"], "")
        elif params.get("company_attr"):
            raw = getattr(ctx["company"], params["company_attr"], "") or ""
        elif sec["kind"] == "recomendaciones":
            raw = "\n".join(x for x in (getattr(ctx["insp"], "general_observations", None),
                                        getattr(ctx["insp"], "recommendations", None)) if x)
        else:
            raw = ""
        body = _paragraphs(_safe_html(str(raw))) if raw else ""
    else:   # static | calculated → plantilla con placeholders
        body = _paragraphs(_fill(sec["content"], ctx)) if sec["content"].strip() else ""
    if not body:
        return ""
    return f"<h2>{n}. {_html.escape(sec['title'])}</h2>{body}"


def _resultados(sec, n, ctx):
    insp, parts = ctx["insp"], []
    if ctx["general_fields"] and ctx["general_data"]:
        parts.append(_strip_h2(G._general_section(ctx["general_fields"], ctx["general_data"], n)))
    if ctx["structure"] == "formulario":
        if (sec.get("params") or {}).get("response_style") == "columns":
            parts.append(T.checklist_table(ctx["all_fields"], insp.records, sec.get("params")))
        else:
            parts.append(_strip_h2(G._formulario_section(ctx["all_fields"], insp.records, n)))
    elif ctx["total"]:
        ok, nok, pct = ctx["total"] - ctx["with_find"], ctx["with_find"], ctx["pct"]
        color = "#16a34a" if pct >= 80 else "#f59e0b" if pct >= 60 else "#dc2626"
        parts.append(f"""<div class="resumen">
          <div class="res-card"><div class="res-num">{ctx['total']}</div><div class="res-lbl">Ítems</div></div>
          <div class="res-card" style="border-color:#16a34a"><div class="res-num" style="color:#16a34a">{ok}</div><div class="res-lbl">Sin hallazgos</div></div>
          <div class="res-card" style="border-color:#dc2626"><div class="res-num" style="color:#dc2626">{nok}</div><div class="res-lbl">Con hallazgos</div></div>
          <div class="res-card" style="border-color:{color}"><div class="res-num" style="color:{color}">{pct}%</div><div class="res-lbl">Cumplimiento</div></div>
        </div>""")
    if not parts:
        return ""
    return f"<h2>{n}. {_html.escape(sec['title'])}</h2>" + "".join(parts)


def _matriz(sec, n, ctx):
    params = sec.get("params") or {}
    fields = ctx["matrix_fields"] or (ctx["all_fields"] if ctx["structure"] != "formulario" else [])
    if not fields:
        return ""
    records, title = ctx["insp"].records, f"<h2>{n}. {_html.escape(sec['title'])}</h2>"

    # Un bloque por valor de un campo (p. ej. una tabla por localización)
    gb = next((f for f in fields if f.field_key == params.get("group_by")), None)
    if gb:
        rest, buckets = [f for f in fields if f.id != gb.id], {}
        for r in records:
            val = next((v.value for v in r.values if v.field_id == gb.id), "") or "—"
            buckets.setdefault(val, []).append(r)
        return title + "".join(
            f"<p class='grp'>{_html.escape(gb.name)}: {_html.escape(str(k))}</p>" + T.matrix_table(rest, rs, params)
            for k, rs in buckets.items())

    advanced = params.get("check_style") == "subcolumns" or any(f.group_name for f in fields)
    if not advanced:                                  # tabla simple: se reutiliza la genérica
        return _retitle(G._matrix_section(fields, records, n), n, sec["title"])
    return title + T.matrix_table(fields, records, params)


def _hallazgos(sec, n, ctx):
    params = sec.get("params") or {}
    if params.get("columns") or params.get("layout"):
        return f"<h2>{n}. {_html.escape(sec['title'])}</h2>" + \
               T.findings_table(ctx["insp"].actions, ctx["insp"].records, params)
    return _retitle(G._actions_section(ctx["insp"].actions, n), n, sec["title"])


def _fotografias(sec, n, ctx):
    per_row = max(1, min(int((sec.get("params") or {}).get("per_row", 2)), 4))
    cells = []
    for i, r in enumerate(ctx["insp"].records, 1):
        path = getattr(r, "photo_path", None)
        src = G._logo_b64(path) if path and os.path.exists(path) else ""
        if src:
            cells.append(f'<td style="width:{100 // per_row}%;padding:4px;text-align:center;vertical-align:top">'
                         f'<img src="{src}" style="max-width:100%;max-height:70mm"><br>'
                         f'<span style="font-size:7.5pt">Ítem {i:03d}</span></td>')
    if not cells:
        return ""
    rows = ""
    for k in range(0, len(cells), per_row):
        chunk = cells[k:k + per_row]
        chunk += ["<td></td>"] * (per_row - len(chunk))
        rows += f"<tr>{''.join(chunk)}</tr>"
    return f"<h2>{n}. {_html.escape(sec['title'])}</h2><table style='width:100%;border-collapse:collapse'>{rows}</table>"


def _firmas(sec, n, ctx, mode):
    return f'<div style="page-break-inside:avoid">{G._firmas(ctx["insp"], mode)}</div>'


_RENDER = {
    "objetivo": _text_section, "alcance": _text_section, "introduccion": _text_section,
    "metodologia": _text_section, "personalizada": _text_section,
    "recomendaciones": _text_section, "conclusiones": _text_section,
    "resultados": _resultados, "matriz": _matriz, "hallazgos": _hallazgos,
    "fotografias": _fotografias,
}


# ── Documento ─────────────────────────────────────────────────────────────────

_TABLE_CSS = """
table.dt th.grp { background:#1f3864; }
table.dt th.sub { font-size:6.5pt; padding:1px 2px; }
table.dt td.x { font-weight:bold; }
table.dt td.x.neg { color:#dc2626; }
table.dt td.gh { background:#e8edf6; font-weight:bold; font-size:7.5pt; text-transform:uppercase; }
table.dt.tight th, table.dt.tight td { padding:2px 2px; font-size:6.8pt; }
table.dt { page-break-inside:auto; } table.dt tr { page-break-inside:avoid; }
"""


def _footer_css(layout) -> str:
    f = layout.get("footer") or {}
    esc = lambda t: (t or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    rules = []
    if f.get("text"):
        rules.append(f'@bottom-left {{ content: "{esc(f["text"])}"; font-size:7pt; color:#555; }}')
    if f.get("show_page_numbers", True):
        rules.append('@bottom-right { content: "Página " counter(page) " de " counter(pages); font-size:7pt; color:#555; }')
    extra = "" if (layout.get("tables") or {}).get("highlight_findings", True) \
        else "table.dt tr.f td { background: transparent; }"
    return f"<style>@page {{ {' '.join(rules)} }} {_TABLE_CSS} {extra}</style>"


def _build_html(insp, company, fmt, sections, layout, compact=False):
    ctx = _context(insp, company)
    lay_h = layout.get("header") or {}
    landscape = {"landscape": True, "portrait": False}.get(
        layout.get("orientation"), len(ctx["matrix_fields"]) > 6)
    code = layout.get("doc_code") or insp.inspection_number or "—"
    version = layout.get("doc_version") or f"{int(getattr(fmt, 'version', 1) or 1):02d}"
    logo = G._logo_b64(getattr(company, "logo_path", None)) if lay_h.get("show_logo", True) else ""
    header = G._header_html(logo, company.razon_social, code, insp.inspection_type_name,
                            G._date_short(datetime.now()), version=version,
                            title=_html.escape(lay_h.get("title") or "") or None,
                            subtitle=_html.escape(lay_h.get("subtitle") or "") or None)
    color = (layout.get("tables") or {}).get("header_color") or "#1f3864"
    if not re.fullmatch(r"#[0-9a-fA-F]{3,8}", color):
        color = "#1f3864"
    css = G._css(landscape=landscape).replace("#1f3864", color) + _footer_css(layout)
    sig_mode = (layout.get("signatures") or {}).get("mode", "auto")

    body, n = G._info_table(insp), 1
    for sec in sorted((s for s in sections if s["enabled"]), key=lambda s: s["order"]):
        if sec["kind"] == "firmas":
            body += _firmas(sec, n, ctx, sig_mode)
            continue
        out = _RENDER[sec["kind"]](sec, n, ctx)
        if out:
            body += out
            n += 1
    return (f'<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">{css}</head>'
            f'<body>{header}{body}</body></html>')


def generate_from_format(insp, company, fmt, doc: str = "ambos") -> bytes:
    kind = fmt.document_kind
    tpl = getattr(fmt, "pdf_template", None)

    # Plantilla PDF especializada (p. ej. extintores): se conserva tal cual.
    if kind in ("informe_personalizado", "formulario_pdf") and tpl and tpl != "generico":
        from app.core.pdf_templates import get_template
        fn = get_template(tpl)
        try:
            return fn(insp, company, doc=doc)
        except TypeError:
            return fn(insp, company)

    layout = merge_layout(getattr(fmt, "layout", None))
    if kind == "formulario_pdf":
        sections = validate_sections(fmt.sections or formulario_pdf_sections())
    elif doc == "matriz":       # compat con el botón "Matriz": tabla compacta para campo
        sections = validate_sections([
            {"kind": "resultados", "title": "Lista de verificación", "order": 1, "source": "captured"},
            {"kind": "matriz", "title": "Registros de inspección", "order": 2}])
    else:
        sections = validate_sections(fmt.sections or default_sections())
    return HTML(string=_build_html(insp, company, fmt, sections, layout), base_url="/").write_pdf()
