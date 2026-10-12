/**
 * JobPositionsPage
 * Ruta: /dashboard/empresas/:companyId/puestos-trabajo
 *
 * Gestiona puestos de trabajo y departamentos por empresa.
 * Agrupa los puestos por departamento.
 * Desde aquí se puede navegar directamente a la matriz GERITRA de cada puesto.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  AlertTriangle, ArrowLeft, Building2, ChevronRight,
  Loader2, Pencil, Plus, Trash2, Users,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import geritraService from "../services/geritra.service";

// ── Modal Puesto de Trabajo ───────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", department: "", area: "", process: "", num_workers: 1,
  has_disability: false, disability_pct: "",
  routine_activity: "", non_routine_activity: "",
  machinery: "", technical_aids: "", description: "",
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all";

const JobPositionModal = ({ open, onClose, editing, onSaved, companyId, departments }) => {
  const [form, setForm]   = useState(EMPTY_FORM);
  const [tab, setTab]     = useState("basico");
  const [saving, setSaving] = useState(false);
  const [deptInput, setDeptInput] = useState("");
  const [showDeptList, setShowDeptList] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("basico");
    if (editing) {
      setForm({
        name:                 editing.name,
        department:           editing.department           || "",
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
      });
      setDeptInput(editing.department || "");
    } else {
      setForm(EMPTY_FORM);
      setDeptInput("");
    }
  }, [editing, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredDepts = departments.filter(d =>
    d.toLowerCase().includes(deptInput.toLowerCase()) && d !== deptInput
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setTab("basico");
      Swal.fire({ icon: "warning", title: "El nombre del puesto es obligatorio",
        confirmButtonColor: "#16a34a" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        department:    form.department || null,
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
      Swal.fire({ icon: "error", title: "Error al guardar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const TABS = [
    { id: "basico",      label: "Datos básicos"  },
    { id: "actividades", label: "Actividades"    },
    { id: "adicional",   label: "Adicional"      },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar puesto de trabajo" : "Nuevo puesto de trabajo"}
          </h3>
          <button onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-6 pt-3 border-b flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
                tab === t.id
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Datos básicos */}
          {tab === "basico" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del puesto <span className="text-red-500">*</span>
                </label>
                <input value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Ej: Operador de maquinaria, Analista SST..."
                  className={inputCls} />
              </div>

              {/* Departamento con autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <input
                  value={deptInput}
                  onChange={e => {
                    setDeptInput(e.target.value);
                    set("department", e.target.value);
                    setShowDeptList(true);
                  }}
                  onFocus={() => setShowDeptList(true)}
                  onBlur={() => setTimeout(() => setShowDeptList(false), 150)}
                  placeholder="Ej: Producción, Administración, RRHH..."
                  className={inputCls}
                />
                {showDeptList && filteredDepts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-36 overflow-y-auto">
                    {filteredDepts.map(d => (
                      <button key={d} type="button"
                        onMouseDown={() => {
                          setDeptInput(d);
                          set("department", d);
                          setShowDeptList(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700">
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Escribe uno nuevo o selecciona un departamento existente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proceso</label>
                  <input value={form.process}
                    onChange={e => set("process", e.target.value)}
                    placeholder="Ej: Manufactura" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <input value={form.area}
                    onChange={e => set("area", e.target.value)}
                    placeholder="Ej: Planta A" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de trabajadores en este puesto
                </label>
                <input type="number" min={1} value={form.num_workers}
                  onChange={e => set("num_workers", e.target.value)}
                  className={`${inputCls} w-32`} />
              </div>

              {/* Discapacidad */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.has_disability}
                    onChange={e => set("has_disability", e.target.checked)}
                    className="w-4 h-4 accent-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Persona con discapacidad en este puesto (Paso 3 GERITRA)
                  </span>
                </label>
                {form.has_disability && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Porcentaje de discapacidad (%)
                    </label>
                    <input type="number" min={0} max={100}
                      value={form.disability_pct}
                      onChange={e => set("disability_pct", e.target.value)}
                      placeholder="Ej: 40" className={`${inputCls} w-32`} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actividades */}
          {tab === "actividades" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actividades rutinarias <span className="text-xs text-gray-400">(Paso 7)</span>
                </label>
                <textarea value={form.routine_activity}
                  onChange={e => set("routine_activity", e.target.value)}
                  rows={3} placeholder="Actividades permanentes y diarias del puesto..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actividades no rutinarias <span className="text-xs text-gray-400">(Paso 8)</span>
                </label>
                <textarea value={form.non_routine_activity}
                  onChange={e => set("non_routine_activity", e.target.value)}
                  rows={3} placeholder="Actividades esporádicas, emergencias, mantenimiento..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máquinas, equipos, sustancias y energías <span className="text-xs text-gray-400">(Paso 9)</span>
                </label>
                <textarea value={form.machinery}
                  onChange={e => set("machinery", e.target.value)}
                  rows={3} placeholder="Ej: Torno CNC, solventes, electricidad de alta tensión..."
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {/* Adicional */}
          {tab === "adicional" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ayudas técnicas en el trabajo <span className="text-xs text-gray-400">(Paso 5)</span>
                </label>
                <textarea value={form.technical_aids}
                  onChange={e => set("technical_aids", e.target.value)}
                  rows={3} placeholder="Silla de ruedas, bastón, audífonos, lupas, órtesis, prótesis..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones generales <span className="text-xs text-gray-400">(Paso 6)</span>
                </label>
                <textarea value={form.description}
                  onChange={e => set("description", e.target.value)}
                  rows={3} placeholder="Descripción de discapacidad, medicamentos, alergias..."
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
            {saving
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Guardando...</span>
              : editing ? "Guardar cambios" : "Crear puesto"
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Card de puesto ─────────────────────────────────────────────────────────────
const PositionCard = ({ pos, matrices, companyId, canEdit, onEdit, onDelete, navigate }) => {
  const hasHighRisk = matrices.some(m => m.intolerable > 0 || m.importante > 0);
  const totalRisks  = matrices.reduce((s, m) => s + m.total_rows, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Nombre */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{pos.name}</h4>
            {hasHighRisk && (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" title="Riesgos críticos" />
            )}
            {pos.has_disability && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Discapacidad {pos.disability_pct ? `${pos.disability_pct}%` : ""}
              </span>
            )}
            {!pos.is_active && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Inactivo
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
            {pos.process && <span>⚙️ {pos.process}</span>}
            {pos.area    && <span>📍 {pos.area}</span>}
            <span>👥 {pos.num_workers} trabajador{pos.num_workers !== 1 ? "es" : ""}</span>
            {totalRisks > 0 && (
              <span className="text-gray-500 font-medium">
                🔍 {totalRisks} riesgo{totalRisks !== 1 ? "s" : ""} evaluado{totalRisks !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Matrices asociadas */}
          {matrices.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {matrices.map(m => {
                const statusCls = {
                  BORRADOR:  "bg-gray-100 text-gray-500 border-gray-200",
                  ACTIVA:    "bg-green-50 text-green-700 border-green-200",
                  REVISION:  "bg-amber-50 text-amber-700 border-amber-200",
                  ARCHIVADA: "bg-gray-50 text-gray-400 border-gray-200",
                }[m.status] || "bg-gray-100 text-gray-500 border-gray-200";

                return (
                  <button key={m.id}
                    onClick={() => navigate(`/dashboard/empresas/${companyId}/geritra/${m.id}`)}
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5
                      hover:shadow-sm transition-all ${statusCls}`}>
                    📊 Matriz v{m.version} · {m.total_rows} riesgos
                    {m.intolerable > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        {m.intolerable} INT
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Acciones */}
        {canEdit && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit}
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

export const JobPositionsPage = () => {
  const { companyId } = useParams();
  const navigate      = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit  = hasPermission("risks.create");
  const canView  = hasPermission("risks.view");

  const [company, setCompany]     = useState(null);
  const [positions, setPositions] = useState([]);
  const [matrices, setMatrices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);

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
    } catch { /**/ }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Lista de departamentos únicos para el autocomplete
  const departments = [...new Set(
    positions.map(p => p.department).filter(Boolean)
  )].sort();

  // Agrupar puestos por departamento
  const grouped = positions.reduce((acc, pos) => {
    const dept = pos.department || "Sin departamento";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(pos);
    return acc;
  }, {});
  const deptKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Sin departamento") return 1;
    if (b === "Sin departamento") return -1;
    return a.localeCompare(b);
  });

  const handleDelete = async (pos) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar "${pos.name}"?`,
      text: "Se eliminarán también sus matrices de riesgo asociadas.",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    try {
      await geritraService.deleteJobPosition(companyId, pos.id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo eliminar",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
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

  // KPIs globales
  const totalPositions = positions.length;
  const totalWorkers   = positions.reduce((s, p) => s + (p.num_workers || 0), 0);
  const withDisability = positions.filter(p => p.has_disability).length;
  const totalMatrices  = matrices.length;

  return (
    <DashboardLayout>
      {/* Back */}
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a {company?.razon_social || "Empresa"}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Puestos de Trabajo</h2>
            <p className="text-sm text-gray-500">
              {company?.razon_social} · Identificación por departamento
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/empresas/${companyId}/geritra`)}
              className="text-sm gap-2">
              📊 Ver matrices GERITRA
            </Button>
            <Button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nuevo puesto
            </Button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Puestos totales",    value: totalPositions, color: "text-green-700",  bg: "bg-green-50"  },
          { label: "Trabajadores",        value: totalWorkers,   color: "text-blue-700",   bg: "bg-blue-50"   },
          { label: "Con discapacidad",    value: withDisability, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Matrices GERITRA",   value: totalMatrices,  color: "text-gray-700",   bg: "bg-gray-50"   },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 text-lg">Sin puestos registrados</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Define los puestos de trabajo para comenzar a identificar peligros y evaluar riesgos con la Matriz GERITRA.
          </p>
          {canEdit && (
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Crear primer puesto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {deptKeys.map(dept => (
            <div key={dept}>
              {/* Cabecera de departamento */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    {dept}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {grouped[dept].length} puesto{grouped[dept].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex-1 h-px bg-gray-100" />
                {canEdit && (
                  <Button
                    variant="outline"
                    className="text-xs h-7 px-2.5 text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => {
                      setEditing(null);
                      setModalOpen(true);
                      // Pre-rellenar departamento al crear desde el header del grupo
                      setTimeout(() => {
                        setEditing({ _preDept: dept });
                      }, 10);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar a {dept === "Sin departamento" ? "este grupo" : dept}
                  </Button>
                )}
              </div>

              {/* Puestos del departamento */}
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[dept].map(pos => {
                  const posMatrices = matrices.filter(m => m.job_position_id === pos.id);
                  return (
                    <div key={pos.id} className="relative group">
                      <PositionCard
                        pos={pos}
                        matrices={posMatrices}
                        companyId={companyId}
                        canEdit={canEdit}
                        navigate={navigate}
                        onEdit={() => { setEditing(pos); setModalOpen(true); }}
                        onDelete={() => handleDelete(pos)}
                      />
                      {/* Botón crear matriz si no tiene ninguna */}
                      {canEdit && posMatrices.length === 0 && (
                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => handleCreateMatrix(pos.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            Crear matriz GERITRA
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <JobPositionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing?._preDept ? null : editing}
        onSaved={load}
        companyId={companyId}
        departments={departments}
      />
    </DashboardLayout>
  );
};

export default JobPositionsPage;