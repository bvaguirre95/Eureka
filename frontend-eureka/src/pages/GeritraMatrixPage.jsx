import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Activity, ArrowLeft, CheckCircle2, ChevronDown,
  ChevronUp, Download, Plus, Trash2,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import geritraService from "../services/geritra.service";
import api from "../services/api";

// ── Configuración visual ──────────────────────────────────────────────────────

const NIVEL = {
  TRIVIAL:     { cls: "bg-green-100 text-green-700",   border: "border-green-200",   dot: "bg-green-500",   label: "Trivial",     er: "4"    },
  TOLERABLE:   { cls: "bg-blue-100 text-blue-700",     border: "border-blue-200",    dot: "bg-blue-500",    label: "Tolerable",   er: "5-8"  },
  MODERADO:    { cls: "bg-amber-100 text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400",   label: "Moderado",    er: "9-16" },
  IMPORTANTE:  { cls: "bg-orange-100 text-orange-700", border: "border-orange-200",  dot: "bg-orange-500",  label: "Importante",  er: "17-24"},
  INTOLERABLE: { cls: "bg-red-100 text-red-700",       border: "border-red-200",     dot: "bg-red-600",     label: "Intolerable", er: "25+"  },
};

const CONTROL_TYPES = [
  { value: "ELIMINACION",    label: "1. Eliminación"               },
  { value: "SUSTITUCION",    label: "2. Sustitución"               },
  { value: "INGENIERIA",     label: "3. Control de ingeniería"     },
  { value: "ADMINISTRATIVO", label: "4. Control administrativo"    },
  { value: "EPP",            label: "5. EPP"                       },
];

const ACTION_STATUS = {
  PENDIENTE:   { cls: "bg-amber-100 text-amber-700",  label: "Pendiente"   },
  EN_PROGRESO: { cls: "bg-blue-100 text-blue-700",    label: "En progreso" },
  COMPLETADA:  { cls: "bg-green-100 text-green-700",  label: "Completada"  },
  VENCIDA:     { cls: "bg-red-100 text-red-700",      label: "Vencida"     },
};

// Índices corregidos según metodología GERITRA oficial
const INDEX_OPTIONS = {
  ip: [
    { value: 1, label: "1 — BAJA (1 a 5 personas)"    },
    { value: 2, label: "2 — MEDIA (6 a 12 personas)"  },
    { value: 3, label: "3 — ALTA (más de 12 personas)" },
  ],
  ic: [
    { value: 1, label: "1 — BAJA: Personal entrenado, conoce el peligro y lo previene"       },
    { value: 2, label: "2 — MEDIA: Personal parcialmente entrenado, no toma control"          },
    { value: 3, label: "3 — ALTA: Personal no entrenado, no conoce el peligro"               },
  ],
  ice: [
    { value: 1, label: "1 — BAJA: Existen y son satisfactorios y suficientes"                },
    { value: 2, label: "2 — MEDIA: Existen parcialmente o no son satisfactorios"             },
    { value: 3, label: "3 — ALTA: No existen"                                               },
  ],
  ie: [
    { value: 1, label: "1 — BAJA: Esporádica, muy inusual, largos periodos"   },
    { value: 2, label: "2 — MEDIA: Eventual, ocasional, lapsos de tiempo medio" },
    { value: 3, label: "3 — ALTA: Continua, frecuente, periodos cortos y seguidos" },
  ],
  consecuencia: [
    { value: 1, label: "1 — Lesión sin incapacidad"             },
    { value: 2, label: "2 — Lesión con incapacidad temporal"    },
    { value: 3, label: "3 — Incapacidad permanente"             },
    { value: 4, label: "4 — Muerte / Catastrófico"              },
  ],
};

// ── IndexSelect ───────────────────────────────────────────────────────────────

const IndexSelect = ({ label, field, value, onChange, disabled }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    <select value={value || ""} onChange={e => onChange(field, Number(e.target.value) || null)}
      disabled={disabled}
      className="w-full border rounded-lg px-2 py-1.5 text-xs focus:border-green-500 outline-none bg-white disabled:bg-gray-50">
      <option value="">—</option>
      {INDEX_OPTIONS[field].map(o => (
        <option key={o.value} value={o.value}>{o.value}</option>
      ))}
    </select>
    {value && (
      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
        {INDEX_OPTIONS[field].find(o => o.value === value)?.label.split("—")[1]?.trim()}
      </p>
    )}
  </div>
);

// ── EvaluacionBlock ───────────────────────────────────────────────────────────

const EvaluacionBlock = ({ prefix, form, onChange, disabled, nivel, estimacion, probabilidad, title, color = "gray" }) => {
  const bg = color === "blue" ? "bg-blue-50" : "bg-gray-50";
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {["ip","ic","ice","ie","consecuencia"].map(f => (
          <IndexSelect key={f}
            label={{ ip:"IP", ic:"IC", ice:"ICE", ie:"IE", consecuencia:"C" }[f]}
            field={f}
            value={form[prefix ? `${prefix}_${f}` : f]}
            onChange={(field, val) => onChange(prefix ? `${prefix}_${field}` : field, val)}
            disabled={disabled} />
        ))}
      </div>
      {estimacion && (
        <div className={`mt-3 rounded-xl p-3 flex items-center justify-between ${NIVEL[nivel]?.cls || "bg-gray-100"}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">Resultado</p>
            <p className="text-lg font-black">P={probabilidad} · ER={estimacion} → {NIVEL[nivel]?.label}</p>
          </div>
          <div className={`w-4 h-4 rounded-full ${NIVEL[nivel]?.dot || "bg-gray-300"}`} />
        </div>
      )}
    </div>
  );
};

// ── RiskRowCard ───────────────────────────────────────────────────────────────

const RiskRowCard = ({ row, categories, index, companyId, matrixId,
                       onUpdate, onDelete, canEdit }) => {
  const [open, setOpen]               = useState(true);
  const [activeSection, setActiveSection] = useState("evaluacion"); // evaluacion | controles | residual | acciones
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [showAddControl, setShowAddControl] = useState(false);
  const [newControl, setNewControl]   = useState({ control_type: "ELIMINACION", description: "" });

  useEffect(() => {
    setForm({
      peligro: row.peligro, efecto: row.efecto || "",
      category_id: row.category_id || "",
      ip: row.ip, ic: row.ic, ice: row.ice, ie: row.ie,
      consecuencia: row.consecuencia,
      // Paso 20
      risk_type: row.risk_type || "",
      // Riesgo residual
      res_ip: row.res_ip, res_ic: row.res_ic,
      res_ice: row.res_ice, res_ie: row.res_ie,
      res_consecuencia: row.res_consecuencia,
      // Pasos 34-37
      health_effects:      row.health_effects      || "",
      health_surveillance: row.health_surveillance || "",
      control_date:        row.control_date
        ? new Date(row.control_date).toISOString().split("T")[0] : "",
      improvement_notes:   row.improvement_notes   || "",
    });
  }, [row]);

  const nivel    = row.nivel_riesgo    ? NIVEL[row.nivel_riesgo]    : null;
  const resNivel = row.res_nivel_riesgo ? NIVEL[row.res_nivel_riesgo] : null;

  const handleChange = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id:  form.category_id  || null,
        control_date: form.control_date
          ? new Date(form.control_date + "T00:00:00").toISOString() : null,
      };
      await onUpdate(row.id, payload);
    } finally { setSaving(false); }
  };

  const handleAddControl = async () => {
    if (!newControl.description.trim()) return;
    try {
      await geritraService.addControl(companyId, matrixId, row.id, newControl);
      setNewControl({ control_type: "ELIMINACION", description: "" });
      setShowAddControl(false);
      await onUpdate(row.id, null);
    } catch { /**/ }
  };

  const SECTIONS = [
    { id: "evaluacion", label: "Evaluación inicial" },
    { id: "controles",  label: `Controles (${row.controls.length})` },
    { id: "residual",   label: "Riesgo residual" },
    { id: "gestion",    label: "Gestión" },
    { id: "acciones",   label: `Acciones (${row.actions.length})` },
  ];

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${nivel?.border || "border-gray-100"} bg-white`}>
      {/* Cabecera */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white
            ${nivel ? nivel.dot : "bg-gray-300"}`}>{index}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{row.peligro}</p>
            {row.category_name && <p className="text-xs text-gray-400">{row.category_name}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {nivel && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${nivel.cls}`}>
                {nivel.label} · ER={row.estimacion}
              </span>
            )}
            {row.risk_type && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {{
                  FISICO: "Físico", QUIMICO_BIOLOGICO: "Químico-Biol.",
                  ERGONOMICO: "Ergonómico", PSICOSOCIAL: "Psicosocial",
                  SEGURIDAD: "Seguridad", AMBIENTAL: "Ambiental",
                }[row.risk_type] || row.risk_type}
              </span>
            )}
            {resNivel && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${resNivel.cls}`}>
                Residual: {resNivel.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <button type="button" onClick={e => { e.stopPropagation(); onDelete(row.id); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Identificación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
              <select value={form.category_id || ""} onChange={e => handleChange("category_id", e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none bg-white disabled:bg-gray-50">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Peligro / Factor de riesgo *</label>
              <input value={form.peligro || ""} onChange={e => handleChange("peligro", e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none disabled:bg-gray-50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Efecto / Daño potencial</label>
              <input value={form.efecto || ""} onChange={e => handleChange("efecto", e.target.value)}
                disabled={!canEdit} placeholder="Ej: Amputación, golpe, enfermedad..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none disabled:bg-gray-50" />
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${activeSection === s.id ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Evaluación inicial */}
          {activeSection === "evaluacion" && (
            <>
              <EvaluacionBlock
                prefix="" form={form} onChange={handleChange}
                disabled={!canEdit}
                nivel={row.nivel_riesgo}
                estimacion={row.estimacion}
                probabilidad={row.probabilidad}
                title="Evaluación inicial del riesgo"
              />
              {canEdit && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    {saving ? "Guardando..." : "Guardar evaluación"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Controles */}
          {activeSection === "controles" && (
            <div className="space-y-2">
              {row.controls.length === 0 && !showAddControl && (
                <p className="text-xs text-gray-400 italic">Sin controles propuestos.</p>
              )}
              {row.controls.map(ctrl => (
                <div key={ctrl.id}
                  className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5 w-40">
                    {CONTROL_TYPES.find(c => c.value === ctrl.control_type)?.label}
                  </span>
                  <p className="text-xs text-gray-700 flex-1">{ctrl.description}</p>
                  {canEdit && (
                    <button onClick={async () => {
                      await geritraService.deleteControl(companyId, matrixId, row.id, ctrl.id);
                      await onUpdate(row.id, null);
                    }} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                showAddControl ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                    <select value={newControl.control_type}
                      onChange={e => setNewControl(f => ({ ...f, control_type: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none bg-white focus:border-blue-500">
                      {CONTROL_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input value={newControl.description}
                      onChange={e => setNewControl(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe el control propuesto..."
                      className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAddControl(false)} className="text-xs flex-1">Cancelar</Button>
                      <Button onClick={handleAddControl} className="text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white">Agregar</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddControl(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar control
                  </button>
                )
              )}
            </div>
          )}

          {/* Riesgo residual */}
          {activeSection === "residual" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                <p className="text-xs text-amber-700">
                  Reevalúa el riesgo <strong>después de aplicar los controles</strong>.
                  Compara el nivel inicial con el residual para medir la efectividad.
                </p>
              </div>
              <EvaluacionBlock
                prefix="res" form={form} onChange={handleChange}
                disabled={!canEdit}
                nivel={row.res_nivel_riesgo}
                estimacion={row.res_estimacion}
                probabilidad={row.res_probabilidad}
                title="Riesgo residual (post-control)"
                color="blue"
              />
              {/* Comparación */}
              {row.nivel_riesgo && row.res_nivel_riesgo && (
                <div className="flex items-center gap-3 justify-center mt-2">
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${NIVEL[row.nivel_riesgo]?.cls}`}>
                    {NIVEL[row.nivel_riesgo]?.label} (ER={row.estimacion})
                  </span>
                  <span className="text-gray-400 text-lg">→</span>
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${NIVEL[row.res_nivel_riesgo]?.cls}`}>
                    {NIVEL[row.res_nivel_riesgo]?.label} (ER={row.res_estimacion})
                  </span>
                </div>
              )}
              {canEdit && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    {saving ? "Guardando..." : "Guardar riesgo residual"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Acciones correctivas */}
          {activeSection === "gestion" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 italic">
                Completa los campos de gestión del riesgo residual (Pasos 20, 34–37 guía GERITRA).
                Guarda al terminar.
              </p>

              {/* Paso 20 — Clasificación del tipo de riesgo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paso 20 · Clasificación del tipo de riesgo
                </label>
                <select
                  disabled={!canEdit}
                  value={form.risk_type || ""}
                  onChange={e => handleChange("risk_type", e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none disabled:bg-gray-50"
                >
                  <option value="">— Seleccionar tipo —</option>
                  <option value="FISICO">Factores de riesgo del medio ambiente físico</option>
                  <option value="QUIMICO_BIOLOGICO">Factores de riesgo por contaminantes químico-biológicos</option>
                  <option value="ERGONOMICO">Factores de riesgo ergonómico</option>
                  <option value="PSICOSOCIAL">Factores de riesgo psicosocial</option>
                  <option value="SEGURIDAD">Factores de riesgo a la seguridad</option>
                  <option value="AMBIENTAL">Factores de riesgo ambiental</option>
                </select>
              </div>

              {/* Paso 34 — Efectos sobre la salud */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paso 34 · Efectos sobre la salud de los trabajadores
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Describe los efectos que provoca la exposición al riesgo sobre la salud del trabajador..."
                  value={form.health_effects}
                  onChange={e => handleChange("health_effects", e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Paso 35 — Vigilancia de la salud */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paso 35 · Vigilancia de la salud
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Exámenes médicos preempleo, periódicos, de retiro. Periodicidad y fechas de control..."
                  value={form.health_surveillance}
                  onChange={e => handleChange("health_surveillance", e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Paso 36 — Fecha de control e inspecciones */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paso 36 · Fecha de control e inspecciones
                </label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={form.control_date}
                  onChange={e => handleChange("control_date", e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Paso 37 — Actividades de mejora continua */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paso 37 · Actividades de mejora continua
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Novedades, observaciones, ajustes o metodologías específicas de evaluación que deben desarrollarse..."
                  value={form.improvement_notes}
                  onChange={e => handleChange("improvement_notes", e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none disabled:bg-gray-50"
                />
              </div>

              {canEdit && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    {saving ? "Guardando..." : "Guardar gestión"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Acciones correctivas */}
          {activeSection === "acciones" && (
            <div className="space-y-2">
              {row.actions.length === 0 && (
                <p className="text-xs text-gray-400 italic">Sin acciones correctivas.</p>
              )}
              {row.actions.map(a => {
                const st = ACTION_STATUS[a.status] || ACTION_STATUS.PENDIENTE;
                return (
                  <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-800">{a.description}</p>
                      {a.responsible_name && <p className="text-[11px] text-gray-400 mt-0.5">👤 {a.responsible_name}</p>}
                      {a.due_date && (
                        <p className="text-[11px] text-gray-400">
                          📅 {new Date(a.due_date).toLocaleDateString("es-EC")}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const EMPTY_ROW = {
  peligro: "", efecto: "", category_id: "",
  ip: "", ic: "", ice: "", ie: "", consecuencia: "",
};

export const GeritraMatrixPage = () => {
  const { companyId, matrixId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("risks.create");

  const [matrix, setMatrix]         = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [addingRow, setAddingRow]   = useState(false);
  const [newRow, setNewRow]         = useState(EMPTY_ROW);
  const [savingRow, setSavingRow]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await geritraService.getMatrix(companyId, matrixId);
      setMatrix(m);
      if (m.organization_id) {
        const cats = await geritraService.getCategories(m.organization_id).catch(() => []);
        setCategories(cats);
      }
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId, matrixId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateRow = async (rowId, data) => {
    if (data) await geritraService.updateRow(companyId, matrixId, rowId, data);
    await load();
  };

  const handleDeleteRow = async (rowId) => {
    const r = await Swal.fire({ icon: "warning", title: "¿Eliminar este riesgo?",
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar" });
    if (!r.isConfirmed) return;
    await geritraService.deleteRow(companyId, matrixId, rowId);
    await load();
  };

  const handleAddRow = async () => {
    if (!newRow.peligro.trim()) return;
    setSavingRow(true);
    try {
      await geritraService.addRow(companyId, matrixId, {
        ...newRow,
        category_id: newRow.category_id || null,
        ip: newRow.ip || null, ic: newRow.ic || null,
        ice: newRow.ice || null, ie: newRow.ie || null,
        consecuencia: newRow.consecuencia || null,
      });
      setNewRow(EMPTY_ROW);
      setAddingRow(false);
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSavingRow(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await geritraService.updateMatrix(companyId, matrixId, { status: newStatus });
      await load();
    } catch { /**/ }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(
        `/api/v1/companies/${companyId}/risk-matrices/${matrixId}/pdf`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `GERITRA_${matrix?.job_position_name || matrixId}_v${matrix?.version || 1}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al generar PDF",
        text: err.response?.data?.detail || "Intenta nuevamente.",
        confirmButtonColor: "#16a34a",
      });
    } finally { setDownloading(false); }
  };

  if (loading || !matrix) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    </DashboardLayout>
  );

  const STATUS_CLS = {
    BORRADOR:  "bg-gray-100 text-gray-500",
    ACTIVA:    "bg-green-100 text-green-700",
    REVISION:  "bg-amber-100 text-amber-700",
    ARCHIVADA: "bg-gray-100 text-gray-400",
  };

  return (
    <DashboardLayout>
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}/geritra`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a GERITRA
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl flex-shrink-0">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">
                  Matriz GERITRA — {matrix.job_position_name}
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[matrix.status]}`}>
                  {matrix.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                v{matrix.version} · {matrix.total_rows} riesgos evaluados
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowResults(r => !r)}
              variant="outline"
              className={`text-sm ${showResults ? "bg-green-50 border-green-300 text-green-700" : ""}`}>
              📊 {showResults ? "Ocultar resultados" : "Ver resultados"}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}
              variant="outline" className="text-sm">
              <Download className="w-4 h-4 mr-1.5" />
              {downloading ? "Generando..." : "Descargar PDF"}
            </Button>
            {canEdit && matrix.status === "BORRADOR" && (
              <Button onClick={() => handleStatusChange("ACTIVA")}
                className="bg-green-600 hover:bg-green-700 text-white text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activar
              </Button>
            )}
            {canEdit && matrix.status === "ACTIVA" && (
              <Button onClick={() => handleStatusChange("REVISION")}
                variant="outline" className="text-sm">
                Enviar a revisión
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {[
            { label: "Total",        value: matrix.total_rows,  color: "text-gray-700"   },
            { label: "Intolerables", value: matrix.intolerable, color: "text-red-600"    },
            { label: "Importantes",  value: matrix.importante,  color: "text-orange-600" },
            { label: "Moderados",    value: matrix.moderado,    color: "text-amber-600"  },
            { label: "Acc. abiertas",value: matrix.open_actions,color: "text-blue-600"   },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(NIVEL).map(([k, v]) => (
          <span key={k} className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${v.cls}`}>
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            {v.label} ({v.er})
          </span>
        ))}
      </div>

      {/* ── Panel de Resultados ── */}
      {showResults && matrix.rows.length > 0 && (() => {
        const rows = matrix.rows;
        const counts = (field) => rows.reduce((acc, r) => {
          const k = r[field];
          if (k) acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});
        const initialCounts  = counts("nivel_riesgo");
        const residualCounts = counts("res_nivel_riesgo");
        const nivelOrder = ["INTOLERABLE","IMPORTANTE","MODERADO","TOLERABLE","TRIVIAL"];

        // Reducción de riesgo por fila
        const nivelVal = { TRIVIAL:1, TOLERABLE:2, MODERADO:3, IMPORTANTE:4, INTOLERABLE:5 };
        const improved = rows.filter(r =>
          r.nivel_riesgo && r.res_nivel_riesgo &&
          (nivelVal[r.res_nivel_riesgo] || 99) < (nivelVal[r.nivel_riesgo] || 99)
        ).length;
        const noChange = rows.filter(r =>
          r.nivel_riesgo && r.res_nivel_riesgo &&
          r.res_nivel_riesgo === r.nivel_riesgo
        ).length;
        const noResidual = rows.filter(r => !r.res_nivel_riesgo).length;

        // Por tipo de riesgo
        const byType = rows.reduce((acc, r) => {
          const k = r.risk_type || "SIN_CLASIFICAR";
          if (!acc[k]) acc[k] = { total: 0, criticos: 0 };
          acc[k].total++;
          if (["IMPORTANTE","INTOLERABLE"].includes(r.nivel_riesgo)) acc[k].criticos++;
          return acc;
        }, {});

        const TYPE_LABEL = {
          FISICO: "Físico", QUIMICO_BIOLOGICO: "Químico-Biol.",
          ERGONOMICO: "Ergonómico", PSICOSOCIAL: "Psicosocial",
          SEGURIDAD: "Seguridad", AMBIENTAL: "Ambiental",
          SIN_CLASIFICAR: "Sin clasificar",
        };

        return (
          <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm mb-2">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              📊 Resultados de la Gestión de Riesgos
              <span className="text-xs font-normal text-gray-400">
                {rows.length} riesgos evaluados · {matrix.job_position_name}
              </span>
            </h3>

            <div className="grid sm:grid-cols-3 gap-4 mb-5">

              {/* Evaluación inicial */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Evaluación inicial
                </p>
                <div className="space-y-2">
                  {nivelOrder.map(n => {
                    const count = initialCounts[n] || 0;
                    if (!count) return null;
                    const cfg = NIVEL[n];
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-gray-600 flex-1">{cfg.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Después de controles */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Riesgo residual
                </p>
                <div className="space-y-2">
                  {nivelOrder.map(n => {
                    const count = residualCounts[n] || 0;
                    if (!count) return null;
                    const cfg = NIVEL[n];
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-gray-600 flex-1">{cfg.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  {noResidual > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="text-xs text-gray-400 flex-1">Sin evaluar</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {noResidual}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de reducción */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Efecto de controles
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✅</span>
                    <span className="text-xs text-gray-600 flex-1">Nivel reducido</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {improved}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">➡️</span>
                    <span className="text-xs text-gray-600 flex-1">Sin cambio</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {noChange}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⏳</span>
                    <span className="text-xs text-gray-600 flex-1">Pendiente evaluar</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                      {noResidual}
                    </span>
                  </div>
                  {improved > 0 && (
                    <p className="text-[11px] text-green-600 font-medium mt-2 pt-2 border-t border-gray-200">
                      {Math.round((improved / rows.filter(r => r.res_nivel_riesgo).length) * 100)}% de riesgos con mejora
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Por tipo de riesgo */}
            {Object.keys(byType).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Por tipo de riesgo (Paso 20)
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byType).map(([type, data]) => (
                    <div key={type}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                      <span className="font-medium text-gray-700">
                        {TYPE_LABEL[type] || type}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600">{data.total} riesgos</span>
                      {data.criticos > 0 && (
                        <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {data.criticos} críticos
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla comparativa fila a fila */}
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Comparativo por peligro
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2 text-left font-semibold">Peligro</th>
                      <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                      <th className="px-3 py-2 text-center font-semibold">Inicial</th>
                      <th className="px-3 py-2 text-center font-semibold">Controles</th>
                      <th className="px-3 py-2 text-center font-semibold">Residual</th>
                      <th className="px-3 py-2 text-center font-semibold">Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const ini = r.nivel_riesgo  ? NIVEL[r.nivel_riesgo]  : null;
                      const res = r.res_nivel_riesgo ? NIVEL[r.res_nivel_riesgo] : null;
                      const ini_v = nivelVal[r.nivel_riesgo]     || 0;
                      const res_v = nivelVal[r.res_nivel_riesgo] || 0;
                      const trend = !res_v ? "⏳" : res_v < ini_v ? "⬇️" : res_v > ini_v ? "⬆️" : "➡️";
                      const ctrlCount = r.controls?.length || 0;
                      return (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px]">
                            <div className="truncate" title={r.peligro}>{r.peligro}</div>
                            {r.efecto && (
                              <div className="text-[10px] text-gray-400 truncate">{r.efecto}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {TYPE_LABEL[r.risk_type] || "—"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ini ? (
                              <span className={`px-2 py-0.5 rounded-full font-bold ${ini.cls}`}>
                                {ini.label}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {ctrlCount > 0 ? `${ctrlCount} control${ctrlCount > 1 ? "es" : ""}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {res ? (
                              <span className={`px-2 py-0.5 rounded-full font-bold ${res.cls}`}>
                                {res.label}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-base">{trend}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filas */}
      <div className="space-y-3">
        {matrix.rows.length === 0 && !addingRow ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Sin riesgos evaluados.</p>
            {canEdit && (
              <Button onClick={() => setAddingRow(true)}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Agregar primer riesgo
              </Button>
            )}
          </div>
        ) : (
          matrix.rows.map((row, idx) => (
            <RiskRowCard key={row.id} row={row} categories={categories}
              index={idx + 1} companyId={companyId} matrixId={matrixId}
              onUpdate={handleUpdateRow} onDelete={handleDeleteRow} canEdit={canEdit} />
          ))
        )}

        {/* Form agregar */}
        {addingRow && canEdit ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-green-800">Nuevo factor de riesgo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <select value={newRow.category_id}
                  onChange={e => setNewRow(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 bg-white">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Peligro *</label>
                <input value={newRow.peligro}
                  onChange={e => setNewRow(f => ({ ...f, peligro: e.target.value }))}
                  placeholder="Describe el peligro identificado..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Efecto potencial</label>
                <input value={newRow.efecto}
                  onChange={e => setNewRow(f => ({ ...f, efecto: e.target.value }))}
                  placeholder="Ej: Amputación, golpe, enfermedad..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {["ip","ic","ice","ie","consecuencia"].map(field => (
                <IndexSelect key={field}
                  label={{ ip:"IP", ic:"IC", ice:"ICE", ie:"IE", consecuencia:"C" }[field]}
                  field={field} value={newRow[field]}
                  onChange={(f, v) => setNewRow(r => ({ ...r, [f]: v }))}
                  disabled={false} />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAddingRow(false); setNewRow(EMPTY_ROW); }}>
                Cancelar
              </Button>
              <Button onClick={handleAddRow} disabled={savingRow}
                className="bg-green-600 hover:bg-green-700 text-white">
                {savingRow ? "Guardando..." : "Agregar riesgo"}
              </Button>
            </div>
          </div>
        ) : canEdit && matrix.rows.length > 0 ? (
          <button onClick={() => setAddingRow(true)}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400
              hover:border-green-300 hover:text-green-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Agregar riesgo
          </button>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default GeritraMatrixPage;