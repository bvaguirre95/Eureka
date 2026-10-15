/**
 * Editor de formatos de informe: secciones (orden, activación, contenido, origen) + diseño.
 * Se usa desde ReportFormatsPage. Los formatos genéricos se abren en solo lectura.
 */
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

const KIND_LABELS = {
  objetivo: "Objetivo", alcance: "Alcance", introduccion: "Introducción / Antecedentes",
  metodologia: "Metodología", resultados: "Resultados", matriz: "Matriz / registros",
  hallazgos: "Hallazgos y acciones", recomendaciones: "Recomendaciones", conclusiones: "Conclusiones",
  fotografias: "Registro fotográfico", firmas: "Firmas", personalizada: "Sección personalizada",
};
const TEXT_KINDS = ["objetivo", "alcance", "introduccion", "metodologia", "conclusiones", "personalizada", "recomendaciones"];
const DOC_KINDS = [
  { v: "informe_configurable", t: "Informe configurable", d: "Secciones y diseño a tu medida." },
  { v: "formulario_pdf", t: "Formulario PDF", d: "Compacto para campo: verificación, matriz y firmas." },
  { v: "informe_personalizado", t: "Informe personalizado", d: "Plantilla PDF especializada (ej. extintores)." },
];

const renumber = (arr) => arr.map((s, i) => ({ ...s, order: i + 1 }));
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v != null));
const deepMerge = (base, over = {}) => {
  const out = { ...base };
  Object.entries(over || {}).forEach(([k, v]) => {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object" ? { ...base[k], ...v } : v;
  });
  return out;
};

const Switch = ({ checked, onChange, disabled }) => (
  <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-green-600" : "bg-gray-300"}`}>
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
  </button>
);

export default function ReportFormatEditor({ orgId, format, types = [], readOnly = false, onClose, onSaved }) {
  const [catalog, setCatalog] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openSec, setOpenSec] = useState(null);
  const [newKind, setNewKind] = useState("alcance");
  // vista previa
  const [pvType, setPvType] = useState("");
  const [pvList, setPvList] = useState([]);
  const [pvId, setPvId] = useState("");
  const [pvLoading, setPvLoading] = useState(false);

  useEffect(() => {
    Promise.all([inspectionService.getReportFormatCatalog(), inspectionService.getTemplates().catch(() => [])])
      .then(([cat, tpls]) => {
        setCatalog(cat); setTemplates(tpls || []);
        setForm({
          name: format?.name || "", description: format?.description || "",
          document_kind: format?.document_kind || "informe_configurable",
          pdf_template: format?.pdf_template || "",
          sections: renumber([...(format?.sections?.length ? format.sections : cat.default_sections)]
            .sort((a, b) => a.order - b.order)),
          layout: deepMerge(cat.default_layout, format?.layout),
        });
      });
  }, [format]);

  useEffect(() => {
    inspectionService.getPreviewInspections(orgId, pvType || undefined)
      .then((l) => { setPvList(l); setPvId(l[0]?.id ?? ""); }).catch(() => setPvList([]));
  }, [orgId, pvType]);

  const specialized = useMemo(
    () => form && form.document_kind !== "informe_configurable" && form.pdf_template && form.pdf_template !== "generico",
    [form]);

  if (!form) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>);

  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const setLay = (group, key, value) => setForm((f) => ({
    ...f, layout: group ? { ...f.layout, [group]: { ...f.layout[group], [key]: value } } : { ...f.layout, [key]: value } }));
  const setSections = (fn) => setForm((f) => ({ ...f, sections: renumber(fn(f.sections)) }));
  const patch = (i, p) => setSections((a) => a.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const patchParams = (i, p) => setSections((a) => a.map((s, k) => (k === i ? { ...s, params: clean({ ...s.params, ...p }) } : s)));
  const move = (i, d) => setSections((a) => {
    const j = i + d; if (j < 0 || j >= a.length) return a;
    const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const remove = (i) => setSections((a) => a.filter((_, k) => k !== i));
  const uniqueKey = (kind) => {
    const keys = new Set(form.sections.map((s) => s.key));
    if (kind !== "personalizada" && !keys.has(kind)) return kind;
    let n = 1; while (keys.has(`${kind}_${n}`)) n++; return `${kind}_${n}`;
  };
  const add = () => {
    const key = uniqueKey(newKind);
    setSections((a) => [...a, {
      key, kind: newKind, title: newKind === "personalizada" ? "Nueva sección" : KIND_LABELS[newKind],
      enabled: true, order: a.length + 1,
      source: TEXT_KINDS.includes(newKind) ? "static" : "captured", content: "", params: {} }]);
    setOpenSec(form.sections.length);
  };
  const switchKind = (k) => setForm((f) => {
    const defs = (kind) => (kind === "formulario_pdf" ? catalog.formulario_pdf_sections : catalog.default_sections);
    const sig = (arr) => JSON.stringify(arr.map((x) => [x.kind, x.enabled]));
    const untouched = sig(f.sections) === sig(defs(f.document_kind));
    return { ...f, document_kind: k,
      sections: untouched && k !== "informe_personalizado" ? renumber([...defs(k)]) : f.sections };
  });
  const resetSections = () => setSections(() => [...(form.document_kind === "formulario_pdf"
    ? catalog.formulario_pdf_sections : catalog.default_sections)]);

  const payload = () => ({
    name: form.name.trim(), description: form.description || null, document_kind: form.document_kind,
    pdf_template: form.document_kind === "informe_configurable" ? null : (form.pdf_template || null),
    sections: specialized ? [] : form.sections,
    layout: specialized ? {} : {
      ...form.layout,
      doc_code: form.layout.doc_code || null, doc_version: form.layout.doc_version || null,
      header: { ...form.layout.header, subtitle: form.layout.header?.subtitle || null },
    },
  });

  const errMsg = async (err) => {
    const d = err.response?.data;
    if (d instanceof Blob) { try { return JSON.parse(await d.text()).detail; } catch { return "Error al generar"; } }
    return d?.detail || "Intenta nuevamente";
  };

  const save = async () => {
    if (!form.name.trim()) { Swal.fire({ icon: "warning", title: "Escribe un nombre", confirmButtonColor: "#16a34a" }); return; }
    if (format?.in_use) {
      const r = await Swal.fire({
        icon: "info", title: `Se creará la versión ${format.version + 1}`,
        text: "Este formato ya tiene inspecciones emitidas. Esas conservan su versión actual; las nuevas usarán esta.",
        showCancelButton: true, confirmButtonText: "Guardar nueva versión", cancelButtonText: "Cancelar",
        confirmButtonColor: "#16a34a" });
      if (!r.isConfirmed) return;
    }
    setSaving(true);
    try {
      const saved = format && !format.is_global
        ? await inspectionService.updateReportFormat(orgId, format.id, payload())
        : await inspectionService.createReportFormat(orgId, payload());
      Swal.fire({ icon: "success", title: saved.version > (format?.version ?? 0) && format ? `Versión ${saved.version} guardada` : "Formato guardado",
        timer: 1600, showConfirmButton: false });
      onSaved(saved);
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo guardar", text: await errMsg(err), confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const preview = async () => {
    if (!pvId) { Swal.fire({ icon: "info", title: "Elige una inspección para la vista previa", confirmButtonColor: "#16a34a" }); return; }
    setPvLoading(true);
    try {
      const body = { ...payload(), inspection_id: Number(pvId), doc: "ambos" };
      const blob = await inspectionService.previewReportFormat(orgId, body);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo generar la vista previa", text: await errMsg(err), confirmButtonColor: "#16a34a" });
    } finally { setPvLoading(false); }
  };

  const tabBtn = (k, label) => (
    <button key={k} onClick={() => setTab(k)}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
      {label}
    </button>);

  /* ── Tarjeta de sección ───────────────────────────────────────── */
  const renderSection = (s, i) => {
    const open = openSec === i;
    const isText = TEXT_KINDS.includes(s.kind);
    const sources = s.kind === "recomendaciones"
      ? [["captured", "Observaciones y recomendaciones capturadas"], ["static", "Texto fijo"]]
      : [["static", "Texto fijo"], ["calculated", "Texto con datos calculados"], ["captured", "Dato capturado"]];
    const labels = s.params?.labels || {};
    return (
      <div key={s.key} className={`border rounded-xl bg-white ${s.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex flex-col">
            <button disabled={readOnly || i === 0} onClick={() => move(i, -1)} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
            <button disabled={readOnly || i === form.sections.length - 1} onClick={() => move(i, 1)} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
          </div>
          <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
          <div role="button" tabIndex={0} className="flex-1 text-left min-w-0 cursor-pointer"
            onClick={() => setOpenSec(open ? null : i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpenSec(open ? null : i)}>
            <p className="font-semibold text-sm text-gray-900 truncate">{s.title}</p>
            <p className="text-[11px] text-gray-400">{KIND_LABELS[s.kind]}</p>
          </div>
          <Switch checked={s.enabled} disabled={readOnly} onChange={(v) => patch(i, { enabled: v })} />
          {!readOnly && (
            <button onClick={() => remove(i)} className="p-1 text-gray-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>

        {open && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            <div>
              <label className={labelCls}>Título en el informe</label>
              <input className={inputCls} value={s.title} onChange={(e) => patch(i, { title: e.target.value })} />
            </div>

            {isText && (
              <>
                <div>
                  <label className={labelCls}>Origen del contenido</label>
                  <select className={inputCls} value={s.source} onChange={(e) => patch(i, { source: e.target.value })}>
                    {sources.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
                {s.source !== "captured" ? (
                  <div>
                    <label className={labelCls}>Contenido</label>
                    <textarea rows={5} className={inputCls} value={s.content}
                      onChange={(e) => patch(i, { content: e.target.value })} />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {catalog.placeholders.map((p) => (
                        <button type="button" key={p} disabled={readOnly}
                          onClick={() => patch(i, { content: `${s.content}{{${p}}}` })}
                          className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-100">
                          {`{{${p}}}`}
                        </button>))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Los datos entre llaves se reemplazan al generar el PDF. Usa {"{{gd.clave_del_campo}}"} para un campo general. Admite negrita (&lt;strong&gt;) y listas.
                    </p>
                  </div>
                ) : s.kind !== "recomendaciones" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Clave de campo general</label>
                      <input className={inputCls} placeholder="ej. area_inspeccionada" value={s.params?.field_key || ""}
                        onChange={(e) => patchParams(i, { field_key: e.target.value, company_attr: "" })} />
                    </div>
                    <div>
                      <label className={labelCls}>o dato de la empresa</label>
                      <select className={inputCls} value={s.params?.company_attr || ""}
                        onChange={(e) => patchParams(i, { company_attr: e.target.value, field_key: "" })}>
                        <option value="">—</option>
                        {["descripcion", "intro_inspeccion"].map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {s.kind === "resultados" && (
              <div>
                <label className={labelCls}>Presentación de la verificación</label>
                <select className={inputCls} value={s.params?.response_style || "list"}
                  onChange={(e) => patchParams(i, { response_style: e.target.value === "list" ? "" : e.target.value })}>
                  <option value="list">Lista simple</option>
                  <option value="columns">Columnas de respuesta + observación por fila</option>
                </select>
              </div>
            )}

            {s.kind === "matriz" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Casillas (S/N, B/M…)</label>
                  <select className={inputCls} value={s.params?.check_style || "text"}
                    onChange={(e) => patchParams(i, { check_style: e.target.value === "text" ? "" : e.target.value })}>
                    <option value="text">Valor en texto</option>
                    <option value="subcolumns">Subcolumnas con X</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Una tabla por…</label>
                  <input className={inputCls} placeholder="clave de campo (ej. localizacion)" value={s.params?.group_by || ""}
                    onChange={(e) => patchParams(i, { group_by: e.target.value })} />
                </div>
              </div>
            )}

            {(s.kind === "resultados" || s.kind === "matriz") && (
              <div>
                <label className={labelCls}>Etiquetas de respuesta (opcional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["S", "Sí"], ["N", "No"], ["NA", "N/A"]].map(([k, ph]) => (
                    <input key={k} className={inputCls} placeholder={`${k} → ${ph}`} value={labels[k] || ""}
                      onChange={(e) => patchParams(i, { labels: clean({ ...labels, [k]: e.target.value }) })} />
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Ej.: S → Cumple, N → No cumple.</p>
              </div>
            )}

            {s.kind === "hallazgos" && (
              <div>
                <label className={labelCls}>Formato de la tabla</label>
                <select className={inputCls} value={s.params?.layout || ""}
                  onChange={(e) => patchParams(i, { layout: e.target.value })}>
                  <option value="">Estándar (hallazgo, acción, clase, responsable, fecha)</option>
                  <option value="foto">Con registro fotográfico (ítem | foto | hallazgo | acción)</option>
                  <option value="resumen">Resumen con fechas de iniciación y terminación</option>
                </select>
              </div>
            )}

            {s.kind === "fotografias" && (
              <div>
                <label className={labelCls}>Fotos por fila</label>
                <select className={inputCls} value={s.params?.per_row || 2}
                  onChange={(e) => patchParams(i, { per_row: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}

            {s.kind === "firmas" && (
              <p className="text-xs text-gray-500">Quién firma se define en la pestaña Diseño (modo de firmas).</p>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-4xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-bold text-gray-900">
              {format ? (readOnly ? "Ver formato" : "Editar formato") : "Nuevo formato"}
              {format && <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">v{format.version}</span>}
            </h3>
            {readOnly && <p className="text-xs text-amber-600">Formato genérico de solo lectura: usa "Copiar y personalizar" para modificarlo.</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex gap-1 px-5 border-b">
          {tabBtn("general", "General")}
          {tabBtn("secciones", `Secciones${specialized ? "" : ` (${form.sections.filter((s) => s.enabled).length})`}`)}
          {tabBtn("diseno", "Diseño")}
        </div>

        <fieldset disabled={readOnly} className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
          {tab === "general" && (
            <>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea rows={2} className={inputCls} value={form.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Tipo de documento</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DOC_KINDS.map((k) => (
                    <button type="button" key={k.v} onClick={() => switchKind(k.v)}
                      className={`text-left border rounded-xl p-3 ${form.document_kind === k.v ? "border-green-600 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
                      <p className="text-sm font-semibold text-gray-900">{k.t}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{k.d}</p>
                    </button>))}
                </div>
              </div>
              {form.document_kind !== "informe_configurable" && (
                <div>
                  <label className={labelCls}>Plantilla PDF especializada</label>
                  <select className={inputCls} value={form.pdf_template} onChange={(e) => set({ pdf_template: e.target.value })}>
                    <option value="">Ninguna (usar el motor genérico)</option>
                    {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  {specialized && <p className="text-xs text-amber-600 mt-1">Esta plantilla define sus propias tablas y orientación; las secciones y el diseño genéricos no se aplican.</p>}
                </div>
              )}
            </>
          )}

          {tab === "secciones" && (specialized ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">La plantilla especializada seleccionada controla las secciones del documento.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Ordena con las flechas, activa u oculta cada sección y abre una para editar su contenido.</p>
                {!readOnly && (
                  <button onClick={resetSections} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                    <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                  </button>)}
              </div>
              <div className="space-y-2">{form.sections.map(renderSection)}</div>
              {!readOnly && (
                <div className="flex gap-2 pt-1">
                  <select className={inputCls} value={newKind} onChange={(e) => setNewKind(e.target.value)}>
                    {catalog.section_kinds.map((k) => <option key={k} value={k}>{KIND_LABELS[k] || k}</option>)}
                  </select>
                  <Button type="button" variant="outline" onClick={add}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>)}
            </>
          ))}

          {tab === "diseno" && (specialized ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">La plantilla especializada seleccionada define su propio diseño.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Orientación</label>
                  <select className={inputCls} value={form.layout.orientation} onChange={(e) => setLay(null, "orientation", e.target.value)}>
                    <option value="auto">Automática (horizontal si la matriz es ancha)</option>
                    <option value="portrait">Vertical</option>
                    <option value="landscape">Horizontal</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Color de encabezados de tabla</label>
                  <input type="color" className="h-10 w-full border border-gray-200 rounded-lg p-1"
                    value={form.layout.tables?.header_color || "#1f3864"} onChange={(e) => setLay("tables", "header_color", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Título del encabezado</label>
                  <input className={inputCls} value={form.layout.header?.title || ""} onChange={(e) => setLay("header", "title", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Subtítulo (vacío = "INSPECCIÓN DE …")</label>
                  <input className={inputCls} value={form.layout.header?.subtitle || ""} onChange={(e) => setLay("header", "subtitle", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Código documental (vacío = n.º de inspección)</label>
                  <input className={inputCls} placeholder="ej. DAH-SST-IGCI-01" value={form.layout.doc_code || ""} onChange={(e) => setLay(null, "doc_code", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Versión documental (vacío = versión del formato)</label>
                  <input className={inputCls} placeholder="ej. 01" value={form.layout.doc_version || ""} onChange={(e) => setLay(null, "doc_version", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Texto del pie de página</label>
                  <input className={inputCls} value={form.layout.footer?.text || ""} onChange={(e) => setLay("footer", "text", e.target.value)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {[["header", "show_logo", "Mostrar logo de la empresa"],
                  ["footer", "show_page_numbers", "Numerar páginas"],
                  ["tables", "highlight_findings", "Resaltar filas con hallazgos"]].map(([g, k, t]) => (
                  <label key={k} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700">
                    {t}
                    <Switch checked={form.layout[g]?.[k] ?? true} onChange={(v) => setLay(g, k, v)} />
                  </label>))}
              </div>

              <div>
                <label className={labelCls}>Firmas</label>
                <select className={inputCls} value={form.layout.signatures?.mode || "auto"} onChange={(e) => setLay("signatures", "mode", e.target.value)}>
                  <option value="auto">Automático: si elabora un coordinador, solo su firma</option>
                  <option value="standard">Siempre elaborado / revisado / aprobado</option>
                  <option value="coordinator_only">Solo la firma de quien elabora</option>
                </select>
              </div>
            </div>
          ))}
        </fieldset>

        {/* Vista previa + guardar */}
        <div className="border-t px-5 py-3 flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50 sm:rounded-b-2xl">
          <div className="flex flex-1 gap-2 min-w-0">
            <select className={`${inputCls} max-w-[11rem]`} value={pvType} onChange={(e) => setPvType(e.target.value)}>
              <option value="">Todos los tipos</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className={inputCls} value={pvId} onChange={(e) => setPvId(e.target.value)}>
              {pvList.length === 0 && <option value="">Sin inspecciones para probar</option>}
              {pvList.map((p) => (
                <option key={p.id} value={p.id}>{p.inspection_number || `#${p.id}`} · {p.company_name} · {p.inspection_type_name}</option>))}
            </select>
            <Button type="button" variant="outline" onClick={preview} disabled={pvLoading || !pvList.length}>
              {pvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Eye className="w-4 h-4 mr-1" /> Vista previa</>}
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{readOnly ? "Cerrar" : "Cancelar"}</Button>
            {!readOnly && (
              <Button type="button" onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Guardar</>}
              </Button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
