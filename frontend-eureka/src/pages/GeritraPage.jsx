import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Activity, AlertTriangle, ArrowLeft, ChevronRight,
  Pencil, Plus, Trash2, Users,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import geritraService from "../services/geritra.service";

// ── Config visual ─────────────────────────────────────────────────────────────

const MATRIX_STATUS = {
  BORRADOR:  { cls: "bg-gray-100 text-gray-500",   dot: "bg-gray-400",  label: "Borrador"    },
  ACTIVA:    { cls: "bg-green-100 text-green-700", dot: "bg-green-500", label: "Activa"      },
  REVISION:  { cls: "bg-amber-100 text-amber-700", dot: "bg-amber-400", label: "En revisión" },
  ARCHIVADA: { cls: "bg-gray-100 text-gray-400",   dot: "bg-gray-300",  label: "Archivada"   },
};

// ── Modal Puesto de Trabajo (completo con campos GERITRA) ─────────────────────

const JobPositionModal = ({ open, onClose, editing, onSaved, companyId }) => {
  const EMPTY = {
    name: "", area: "", process: "", num_workers: 1,
    has_disability: false, disability_pct: "",
    routine_activity: "", non_routine_activity: "",
    machinery: "", technical_aids: "", description: "",
  };
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab]   = useState("basico");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("basico");
    setForm(editing ? {
      name:                 editing.name,
      area:                 editing.area                 || "",
      process:              editing.process              || "",
      num_workers:          editing.num_workers          || 1,
      has_disability:       editing.has_disability       || false,
      disability_pct:       editing.disability_pct       || "",
      routine_activity:     editing.routine_activity     || "",
      non_routine_activity: editing.non_routine_activity || "",
      machinery:            editing.machinery            || "",
      technical_aids:       editing.technical_aids       || "",
      description:          editing.description          || "",
    } : EMPTY);
  }, [editing, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setTab("basico"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        num_workers:   Number(form.num_workers) || 1,
        disability_pct: form.disability_pct ? Number(form.disability_pct) : null,
        has_disability: !!form.has_disability,
      };
      if (editing) {
        await geritraService.updateJobPosition(companyId, editing.id, payload);
      } else {
        await geritraService.createJobPosition(companyId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none transition-all";

  const TABS = [
    { id: "basico",      label: "Datos básicos"  },
    { id: "actividades", label: "Actividades"    },
    { id: "adicional",   label: "Información adicional" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar puesto de trabajo" : "Nuevo puesto de trabajo"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-6 pt-3 border-b flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2
                ${tab === t.id
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Tab: Datos básicos */}
          {tab === "basico" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del puesto *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Ej: Operador de maquinaria, Analista, Conductor..."
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proceso</label>
                  <input value={form.process} onChange={e => set("process", e.target.value)}
                    placeholder="Ej: Manufactura" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <input value={form.area} onChange={e => set("area", e.target.value)}
                    placeholder="Ej: Producción" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de trabajadores</label>
                <input type="number" min={1} value={form.num_workers}
                  onChange={e => set("num_workers", e.target.value)} className={inputCls} />
              </div>
              {/* Discapacidad */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.has_disability}
                    onChange={e => set("has_disability", e.target.checked)}
                    className="w-4 h-4 accent-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Persona con discapacidad en este puesto
                  </span>
                </label>
                {form.has_disability && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Porcentaje de discapacidad (%)</label>
                    <input type="number" min={0} max={100} value={form.disability_pct}
                      onChange={e => set("disability_pct", e.target.value)}
                      placeholder="Ej: 40" className={`${inputCls} w-32`} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tab: Actividades */}
          {tab === "actividades" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actividades rutinarias
                </label>
                <textarea value={form.routine_activity}
                  onChange={e => set("routine_activity", e.target.value)}
                  rows={3} placeholder="Describe las actividades que se realizan de forma habitual..."
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">Actividades cotidianas del puesto.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actividades no rutinarias
                </label>
                <textarea value={form.non_routine_activity}
                  onChange={e => set("non_routine_activity", e.target.value)}
                  rows={3} placeholder="Actividades ocasionales, emergencias, mantenimiento..."
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">Actividades esporádicas o de emergencia.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máquinas, equipos, sustancias y energías
                </label>
                <textarea value={form.machinery}
                  onChange={e => set("machinery", e.target.value)}
                  rows={3} placeholder="Ej: Torno CNC, solventes, electricidad de alta tensión..."
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {/* Tab: Información adicional */}
          {tab === "adicional" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ayudas técnicas en el trabajo
                </label>
                <textarea value={form.technical_aids}
                  onChange={e => set("technical_aids", e.target.value)}
                  rows={3} placeholder="Ej: Silla ergonómica, arnés de seguridad, protección auditiva..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones generales
                </label>
                <textarea value={form.description}
                  onChange={e => set("description", e.target.value)}
                  rows={3} placeholder="Información adicional del puesto..."
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear puesto"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

export const GeritraPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("risks.create");

  const [company, setCompany]     = useState(null);
  const [positions, setPositions] = useState([]);
  const [matrices, setMatrices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [tab, setTab]             = useState("positions");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, pos, mat] = await Promise.all([
        companyService.getCompany(companyId),
        geritraService.getJobPositions(companyId),
        geritraService.getMatrices(companyId),
      ]);
      setCompany(co);
      setPositions(pos);
      setMatrices(mat);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDeletePosition = async (pos) => {
    const r = await Swal.fire({
      icon: "warning", title: `¿Eliminar "${pos.name}"?`,
      text: "Se eliminarán también sus matrices de riesgo.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try { await geritraService.deleteJobPosition(companyId, pos.id); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "No se pudo eliminar",
      text: err.response?.data?.detail, confirmButtonColor: "#16a34a" }); }
  };

  const handleCreateMatrix = async (positionId) => {
    try {
      const matrix = await geritraService.createMatrix(companyId, positionId, {});
      navigate(`/dashboard/empresas/${companyId}/geritra/${matrix.id}`);
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo crear la matriz",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  const totalIntolerable = matrices.reduce((s, m) => s + m.intolerable, 0);
  const totalImportante  = matrices.reduce((s, m) => s + m.importante,  0);
  const totalModerado    = matrices.reduce((s, m) => s + m.moderado,    0);
  const totalActions     = matrices.reduce((s, m) => s + m.open_actions, 0);

  return (
    <DashboardLayout>
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a {company?.razon_social || "Empresa"}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Matriz GERITRA</h2>
            <p className="text-sm text-gray-500">
              {company?.razon_social} · Gestión Técnica de Riesgos
            </p>
          </div>
        </div>
        {canEdit && tab === "positions" && (
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo puesto
          </Button>
        )}
      </div>

      {/* KPIs */}
      {matrices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Intolerables",  value: totalIntolerable, color: "text-red-600",    bg: "bg-red-50"    },
            { label: "Importantes",   value: totalImportante,  color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Moderados",     value: totalModerado,    color: "text-amber-600",  bg: "bg-amber-50"  },
            { label: "Acc. abiertas", value: totalActions,     color: "text-blue-600",   bg: "bg-blue-50"   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {[
          { id: "positions", label: `Puestos (${positions.length})` },
          { id: "matrices",  label: `Matrices (${matrices.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.id ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : tab === "positions" ? (
        positions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Sin puestos de trabajo registrados</p>
            <p className="text-xs text-gray-300 mt-1">
              Crea los puestos para comenzar a evaluar los riesgos laborales.
            </p>
            {canEdit && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }}
                className="mt-5 bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Crear primer puesto
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map(pos => {
              const posMatrices = matrices.filter(m => m.job_position_id === pos.id);
              const hasHighRisk = posMatrices.some(m => m.intolerable > 0 || m.importante > 0);
              return (
                <div key={pos.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{pos.name}</h3>
                        {hasHighRisk && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        {pos.has_disability && (
                          <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            Discapacidad {pos.disability_pct ? `${pos.disability_pct}%` : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                        {pos.process && <span>⚙️ {pos.process}</span>}
                        {pos.area    && <span>📍 {pos.area}</span>}
                        <span>👥 {pos.num_workers} trabajador{pos.num_workers !== 1 ? "es" : ""}</span>
                      </div>
                      {pos.routine_activity && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          📋 {pos.routine_activity}
                        </p>
                      )}
                      {posMatrices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {posMatrices.map(m => {
                            const st = MATRIX_STATUS[m.status] || MATRIX_STATUS.BORRADOR;
                            return (
                              <button key={m.id}
                                onClick={() => navigate(`/dashboard/empresas/${companyId}/geritra/${m.id}`)}
                                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5
                                  hover:shadow-sm transition-all ${st.cls} border-current/20`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                v{m.version} · {m.total_rows} riesgos
                                {m.intolerable > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1 rounded">
                                    {m.intolerable} INT
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <Button onClick={() => handleCreateMatrix(pos.id)}
                          variant="outline" className="text-xs border-green-200 text-green-700 hover:bg-green-50">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Nueva matriz
                        </Button>
                      )}
                      {canEdit && (
                        <button onClick={() => { setEditing(pos); setModalOpen(true); }}
                          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDeletePosition(pos)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        matrices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Sin matrices de riesgo</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Puesto</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-center">Riesgos</th>
                  <th className="px-3 py-3 text-center">INT</th>
                  <th className="px-3 py-3 text-center">IMP</th>
                  <th className="px-3 py-3 text-center">MOD</th>
                  <th className="px-3 py-3 text-center">Acciones</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrices.map(m => {
                  const st = MATRIX_STATUS[m.status] || MATRIX_STATUS.BORRADOR;
                  return (
                    <tr key={m.id}
                      onClick={() => navigate(`/dashboard/empresas/${companyId}/geritra/${m.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.job_position_name}</p>
                        <p className="text-xs text-gray-400">v{m.version}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-700">{m.total_rows}</td>
                      <td className="px-3 py-3 text-center">
                        {m.intolerable > 0
                          ? <span className="font-bold text-red-600">{m.intolerable}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.importante > 0
                          ? <span className="font-bold text-orange-500">{m.importante}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.moderado > 0
                          ? <span className="font-bold text-amber-500">{m.moderado}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.open_actions > 0
                          ? <span className="font-bold text-blue-600">{m.open_actions}</span>
                          : <span className="text-green-500">✓</span>}
                      </td>
                      <td className="px-3 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <JobPositionModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        editing={editing} onSaved={load} companyId={companyId} />
    </DashboardLayout>
  );
};

export default GeritraPage;