/**
 * WorkerDetailPage
 * Ruta: /dashboard/empresas/:companyId/trabajadores/:workerId
 *
 * Ficha completa del trabajador con tabs.
 * Tabs activos: Datos, Puesto e Historial
 * Tabs preparados (módulos futuros): Riesgos, EPP, Capacitaciones, Salud, Accidentes, Permisos
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft, Briefcase, Calendar, FileText,
  Heart, Loader2, Pencil, Phone, Mail,
  Shield, ShieldAlert, Users, UserX,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import workerService from "../services/worker.service";
import geritraService from "../services/geritra.service";
import { WorkerFormModal } from "../components/workers/WorkerFormModal";
import { WorkerStatusBadge } from "../components/workers/WorkerStatusBadge";

// ── Constantes ────────────────────────────────────────────────────────────────

const DOC_LABELS       = { cedula: "Cédula", pasaporte: "Pasaporte", otro: "Otro" };
const GENDER_LABELS    = { masculino: "Masculino", femenino: "Femenino", otro: "Otro" };
const CONTRACT_LABELS  = {
  indefinido: "Indefinido", plazo_fijo: "Plazo fijo",
  obra: "Obra", servicios: "Servicios",
  pasantia: "Pasantía", otro: "Otro",
};
const STATUS_ACTIONS   = {
  activo:     [{ label: "Suspender",  value: "suspendido", cls: "text-orange-600" },
               { label: "Inactivar",  value: "inactivo",   cls: "text-yellow-600" },
               { label: "Retirar",    value: "retirado",   cls: "text-red-600"    }],
  inactivo:   [{ label: "Activar",    value: "activo",     cls: "text-green-600"  },
               { label: "Retirar",    value: "retirado",   cls: "text-red-600"    }],
  suspendido: [{ label: "Activar",    value: "activo",     cls: "text-green-600"  },
               { label: "Retirar",    value: "retirado",   cls: "text-red-600"    }],
  retirado:   [],
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

// ── Componente de campo info ───────────────────────────────────────────────────
const InfoField = ({ label, value, mono = false }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
    <p className={`text-sm text-gray-800 ${mono ? "font-mono" : "font-medium"} ${!value ? "text-gray-300" : ""}`}>
      {value || "—"}
    </p>
  </div>
);

// ── Tab placeholder (módulos futuros) ─────────────────────────────────────────
const ComingSoonTab = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-4 bg-gray-100 rounded-2xl mb-4">
      <Icon className="w-8 h-8 text-gray-300" />
    </div>
    <p className="font-semibold text-gray-400 text-lg">{title}</p>
    <p className="text-sm text-gray-300 mt-1 max-w-xs">{description}</p>
    <span className="mt-4 text-xs bg-gray-100 text-gray-400 px-3 py-1 rounded-full font-medium">
      Próximamente
    </span>
  </div>
);

// ── Página principal ───────────────────────────────────────────────────────────
export const WorkerDetailPage = () => {
  const { companyId, workerId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canEdit       = hasPermission("workers.edit");
  const canDeactivate = hasPermission("workers.deactivate");

  const [worker, setWorker]         = useState(null);
  const [history, setHistory]       = useState([]);
  const [risks, setRisks]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("datos");
  const [editOpen, setEditOpen]     = useState(false);
  const [assignPosOpen, setAssignPosOpen] = useState(false);
  const [positions, setPositions]   = useState([]);

  // Para asignar puesto
  const [posForm, setPosForm] = useState({ job_position_id: "", start_date: "", reason: "" });
  const [savingPos, setSavingPos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, hist] = await Promise.all([
        workerService.getWorker(companyId, workerId),
        workerService.listPositions(companyId, workerId),
      ]);
      setWorker(w);
      setHistory(hist);
    } catch { navigate(`/dashboard/empresas/${companyId}/trabajadores`); }
    finally { setLoading(false); }
  }, [companyId, workerId]);

  useEffect(() => { load(); }, [load]);

  // Cargar riesgos cuando se activa el tab
  useEffect(() => {
    if (activeTab === "riesgos" && !risks) {
      workerService.getWorkerRisks(companyId, workerId)
        .then(setRisks).catch(() => setRisks({}));
    }
    if (activeTab === "puesto" && positions.length === 0) {
      geritraService.getJobPositions(companyId)
        .then(data => setPositions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [activeTab]);

  const handleStatusChange = async (newStatus) => {
    let termination_date = null;
    if (newStatus === "retirado") {
      const { value } = await Swal.fire({
        title: "Fecha de retiro", input: "date",
        inputLabel: "Fecha de retiro del trabajador",
        showCancelButton: true, confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancelar",
      });
      if (!value) return;
      termination_date = value;
    } else {
      const labels = { activo: "Activar", suspendido: "Suspender", inactivo: "Inactivar" };
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: `¿${labels[newStatus]} al trabajador?`,
        showCancelButton: true, confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancelar", confirmButtonText: "Confirmar",
      });
      if (!isConfirmed) return;
    }
    try {
      await workerService.changeStatus(companyId, workerId, { status: newStatus, termination_date });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "No se pudo cambiar el estado",
        confirmButtonColor: "#16a34a" });
    }
  };

  const handleAssignPosition = async () => {
    if (!posForm.job_position_id || !posForm.start_date) {
      Swal.fire({ icon: "warning", title: "Completa el puesto y la fecha", confirmButtonColor: "#16a34a" });
      return;
    }
    setSavingPos(true);
    try {
      await workerService.assignPosition(companyId, workerId, {
        job_position_id: Number(posForm.job_position_id),
        start_date: posForm.start_date,
        reason: posForm.reason || null,
      });
      setAssignPosOpen(false);
      setPosForm({ job_position_id: "", start_date: "", reason: "" });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "No se pudo asignar el puesto",
        confirmButtonColor: "#16a34a" });
    } finally { setSavingPos(false); }
  };

  const TABS = [
    { id: "datos",         label: "Datos",           icon: FileText    },
    { id: "puesto",        label: "Puesto e Historial", icon: Briefcase },
    { id: "riesgos",       label: "Riesgos",         icon: ShieldAlert, future: true },
    { id: "epp",           label: "EPP",             icon: Shield,      future: true },
    { id: "capacitaciones",label: "Capacitaciones",  icon: Users,       future: true },
    { id: "salud",         label: "Salud",           icon: Heart,       future: true },
  ];

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    </DashboardLayout>
  );

  if (!worker) return null;

  const statusActions = STATUS_ACTIONS[worker.status] || [];

  return (
    <DashboardLayout>
      {/* Back */}
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}/trabajadores`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500
          hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Trabajadores
      </button>

      {/* Header ficha */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-700
              flex items-center justify-center text-xl font-bold flex-shrink-0">
              {worker.full_name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{worker.full_name}</h2>
                <WorkerStatusBadge status={worker.status} />
                {worker.disability_pct && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Discapacidad {worker.disability_pct}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {DOC_LABELS[worker.doc_type]} <span className="font-mono">{worker.doc_number}</span>
                {worker.employee_code && <span className="text-gray-300"> · {worker.employee_code}</span>}
              </p>
              <p className="text-sm text-gray-500">
                {worker.job_position_name || "Sin puesto asignado"}
                {worker.department && <span className="text-gray-400"> · {worker.department}</span>}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {canEdit && worker.status !== "retirado" && (
              <Button variant="outline" className="text-sm gap-1.5"
                onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            )}
            {canDeactivate && statusActions.map(a => (
              <Button key={a.value} variant="outline"
                className={`text-sm ${a.cls} border-current`}
                onClick={() => handleStatusChange(a.value)}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Info rápida */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Ingreso: <strong className="text-gray-700">{fmtDate(worker.hire_date)}</strong>
          </span>
          {worker.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {worker.phone}
            </span>
          )}
          {worker.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {worker.email}
            </span>
          )}
          {worker.termination_date && (
            <span className="flex items-center gap-1.5 text-red-500">
              <UserX className="w-3.5 h-3.5" />
              Retiro: <strong>{fmtDate(worker.termination_date)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
              whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === t.id
                ? "bg-green-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            } ${t.future ? "opacity-70" : ""}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.future && (
              <span className="text-[9px] bg-white/20 px-1 py-0.5 rounded">
                {activeTab === t.id ? "Próx." : "Próx."}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 min-h-[400px]">

        {/* ── Tab DATOS ── */}
        {activeTab === "datos" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Identificación
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Tipo documento" value={DOC_LABELS[worker.doc_type]} />
                <InfoField label="Número" value={worker.doc_number} mono />
                <InfoField label="Código interno" value={worker.employee_code} />
                <InfoField label="Nombres" value={worker.first_name} />
                <InfoField label="Apellidos" value={worker.last_name} />
                <InfoField label="Género" value={GENDER_LABELS[worker.gender]} />
                <InfoField label="Fecha de nacimiento" value={fmtDate(worker.birth_date)} />
                <InfoField label="Edad" value={worker.age ? `${worker.age} años` : null} />
              </div>
            </div>

            <div className="border-t border-gray-50 pt-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Contacto
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Teléfono" value={worker.phone} />
                <InfoField label="Email" value={worker.email} />
              </div>
            </div>

            <div className="border-t border-gray-50 pt-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Vínculo laboral
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Fecha de ingreso"  value={fmtDate(worker.hire_date)} />
                <InfoField label="Fecha de retiro"   value={fmtDate(worker.termination_date)} />
                <InfoField label="Tipo de contrato"  value={CONTRACT_LABELS[worker.contract_type]} />
                <InfoField label="Estado"            value={worker.status} />
              </div>
            </div>

            {(worker.disability_type || worker.disability_pct) && (
              <div className="border-t border-gray-50 pt-5">
                <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-3">
                  Discapacidad
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Tipo" value={worker.disability_type} />
                  <InfoField label="Porcentaje (CONADIS)" value={worker.disability_pct ? `${worker.disability_pct}%` : null} />
                </div>
              </div>
            )}

            {worker.notes && (
              <div className="border-t border-gray-50 pt-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Observaciones SST
                </h3>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                  {worker.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab PUESTO E HISTORIAL ── */}
        {activeTab === "puesto" && (
          <div className="space-y-5">
            {/* Puesto actual */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Puesto actual
                </h3>
                {canEdit && worker.status !== "retirado" && (
                  <Button variant="outline" className="text-xs h-8 px-3"
                    onClick={() => setAssignPosOpen(true)}>
                    Cambiar puesto
                  </Button>
                )}
              </div>
              {worker.job_position_name ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="font-semibold text-green-800">{worker.job_position_name}</p>
                  {worker.department && (
                    <p className="text-sm text-green-600 mt-0.5">{worker.department}</p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-400">Sin puesto asignado</p>
                  {canEdit && worker.status !== "retirado" && (
                    <Button variant="outline" className="mt-2 text-xs h-7"
                      onClick={() => setAssignPosOpen(true)}>
                      Asignar puesto
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Modal asignar puesto */}
            {assignPosOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">
                    {worker.job_position_name ? "Cambiar puesto" : "Asignar puesto"}
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Puesto de trabajo <span className="text-red-500">*</span>
                    </label>
                    <select value={posForm.job_position_id}
                      onChange={e => setPosForm(f => ({ ...f, job_position_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                        focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none">
                      <option value="">— Seleccionar —</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.department ? ` · ${p.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Fecha de inicio <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={posForm.start_date}
                      onChange={e => setPosForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                        focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Motivo del cambio
                    </label>
                    <input value={posForm.reason}
                      onChange={e => setPosForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Ej: Promoción, Restructuración..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                        focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setAssignPosOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={handleAssignPosition} disabled={savingPos}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      {savingPos ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Historial */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Historial de puestos
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin historial de puestos</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={h.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        !h.end_date ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
                      }`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        !h.end_date ? "bg-green-500" : "bg-gray-300"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {h.job_position_name || "Puesto eliminado"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fmtDate(h.start_date)} → {h.end_date ? fmtDate(h.end_date) : "Actual"}
                        </p>
                        {h.reason && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{h.reason}</p>
                        )}
                      </div>
                      {!h.end_date && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5
                          rounded-full font-medium flex-shrink-0">
                          Actual
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs FUTUROS ── */}
        {activeTab === "riesgos" && (
          risks?.job_position_id ? (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Riesgos del puesto: {risks.job_position_name}
                </p>
                <p className="text-xs text-blue-600 mt-1">{risks.message}</p>
              </div>
              <ComingSoonTab icon={ShieldAlert} title="Integración GERITRA"
                description="La visualización de riesgos del puesto se habilitará en la próxima fase." />
            </div>
          ) : (
            <ComingSoonTab icon={ShieldAlert} title="Riesgos laborales"
              description="Asigna un puesto al trabajador para ver los riesgos asociados vía GERITRA." />
          )
        )}
        {activeTab === "epp" && (
          <ComingSoonTab icon={Shield} title="EPP y Ropa de trabajo"
            description="Historial de entregas, tallas y renovaciones de equipos de protección." />
        )}
        {activeTab === "capacitaciones" && (
          <ComingSoonTab icon={Users} title="Capacitaciones"
            description="Plan anual, asistencias, evaluaciones y certificados del trabajador." />
        )}
        {activeTab === "salud" && (
          <ComingSoonTab icon={Heart} title="Salud Ocupacional"
            description="Exámenes médicos ocupacionales, aptitud y vigilancia de la salud." />
        )}
      </div>

      {/* Modal edición */}
      <WorkerFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={worker}
        companyId={companyId}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default WorkerDetailPage;