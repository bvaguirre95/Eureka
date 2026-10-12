import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle2,
  ClipboardCheck, Clock, FilePlus, TrendingUp, Calendar,
  ListChecks, ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import inspectionService from "../services/inspection.service";
import InspectionCreateModal from "../components/inspections/InspectionCreateModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEMAFORO = {
  green:  { cls: "bg-green-500",  label: "Cumple",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  yellow: { cls: "bg-amber-400",  label: "Regular", text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  red:    { cls: "bg-red-500",    label: "Crítico", text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"   },
};

const PRIORITY_CLS = {
  A: "bg-red-100 text-red-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-gray-100 text-gray-500",
};

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("es-EC", { day: "2-digit", month: "short" }) : "—";

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color = "text-gray-900", sub, onClick }) => (
  <div onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4
      ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
    <div className="p-3 rounded-xl bg-gray-50 flex-shrink-0">
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-amber-600 font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── WeekCard ──────────────────────────────────────────────────────────────────

const WeekCard = ({ weekly }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div className="flex items-center gap-2 mb-4">
      <Calendar className="w-4 h-4 text-blue-500" />
      <h3 className="text-sm font-bold text-gray-700">Esta semana</h3>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Inspecciones iniciadas", value: weekly.inspections_this_week, color: "text-blue-600" },
        { label: "Completadas",            value: weekly.completed_this_week,    color: "text-green-600" },
        { label: "Acciones creadas",       value: weekly.actions_created_this_week,   color: "text-amber-600" },
        { label: "Acciones resueltas",     value: weekly.actions_completed_this_week, color: "text-emerald-600" },
      ].map(s => (
        <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── ActionRow — fila de acción vencida o próxima ──────────────────────────────

const ActionRow = ({ action, navigate, companyId, isOverdue }) => (
  <div
    onClick={() => navigate(`/dashboard/empresas/${companyId}/inspecciones/${action.inspection_id}`)}
    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all
      ${isOverdue ? "bg-red-50 border-red-100 hover:border-red-300" : "bg-amber-50 border-amber-100 hover:border-amber-300"}`}>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        {action.priority && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_CLS[action.priority] || PRIORITY_CLS.C}`}>
            {action.priority}
          </span>
        )}
        <span className="text-xs text-gray-500 truncate">{action.inspection_type} · {action.inspection_number || `#${action.inspection_id}`}</span>
      </div>
      <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-1">{action.description}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
        {action.responsible_name && <span>👤 {action.responsible_name}</span>}
        <span className={isOverdue ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"}>
          📅 {fmt(action.due_date_end)}
          {isOverdue
            ? ` · Vencida hace ${action.days_overdue} día${action.days_overdue !== 1 ? "s" : ""}`
            : ` · Vence en ${Math.abs(action.days_overdue)} día${Math.abs(action.days_overdue) !== 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

export const InspectionDashboardPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("inspections.create");

  const [company, setCompany]   = useState(null);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [showAllOverdue, setShowAllOverdue]   = useState(false);
  const [showAllDueSoon, setShowAllDueSoon]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, d] = await Promise.all([
        companyService.getCompany(companyId),
        inspectionService.getDashboard(companyId),
      ]);
      setCompany(co);
      setDash(d);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/empresas")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Empresas
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {company?.razon_social || "Inspecciones"}
            </h2>
            <p className="text-sm text-gray-500">Tablero de control SST · Inspecciones</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/dashboard/empresas/${companyId}/inspecciones`)}
            variant="outline" className="text-sm">
            <ClipboardCheck className="w-4 h-4 mr-1.5" /> Ver todas
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm">
              <FilePlus className="w-4 h-4 mr-1.5" /> Nueva inspección
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : !dash || dash.total === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ClipboardCheck className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin inspecciones registradas</h3>
          <p className="text-gray-400 text-sm mb-5">
            Crea la primera inspección para comenzar a monitorear el cumplimiento SST.
          </p>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white">
              <FilePlus className="w-4 h-4 mr-2" /> Crear primera inspección
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardCheck} label="Total inspecciones" value={dash.total} color="text-blue-600" />
            <StatCard icon={TrendingUp} label="Cumplimiento promedio"
              value={`${dash.compliance_avg}%`}
              color={dash.compliance_avg >= 80 ? "text-green-600" : dash.compliance_avg >= 50 ? "text-amber-600" : "text-red-600"} />
            <StatCard icon={AlertTriangle} label="Acciones abiertas" value={dash.open_actions}
              color={dash.open_actions > 0 ? "text-amber-600" : "text-green-600"}
              sub={dash.overdue_actions > 0 ? `${dash.overdue_actions} vencidas` : undefined} />
            <StatCard icon={CheckCircle2} label="Completadas / Cerradas"
              value={`${dash.completada + dash.cerrada}/${dash.total}`} color="text-green-600" />
          </div>

          {/* Estado + Esta semana */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Estado general */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Estado de inspecciones</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Borrador",   value: dash.borrador,   color: "text-gray-500",    bg: "bg-gray-100"    },
                  { label: "En proceso", value: dash.en_proceso, color: "text-blue-700",    bg: "bg-blue-50"     },
                  { label: "Completada", value: dash.completada, color: "text-green-700",   bg: "bg-green-50"    },
                  { label: "Cerrada",    value: dash.cerrada,    color: "text-emerald-700", bg: "bg-emerald-50"  },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className={`text-xs font-medium ${s.color} opacity-80`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Esta semana */}
            {dash.weekly && <WeekCard weekly={dash.weekly} />}
          </div>

          {/* Semáforo por tipo */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3">
              Cumplimiento por tipo de inspección
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dash.by_type.map(t => {
                const sem = SEMAFORO[t.semaforo] || SEMAFORO.red;
                return (
                  <div key={t.type_id}
                    className={`rounded-2xl border p-5 ${sem.bg} ${sem.border} shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`font-bold text-base ${sem.text}`}>{t.type_name}</p>
                      <div className={`w-4 h-4 rounded-full ${sem.cls} flex-shrink-0`} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-white/60 rounded-full h-3">
                        <div className={`h-3 rounded-full transition-all ${sem.cls}`}
                          style={{ width: `${t.compliance_avg}%` }} />
                      </div>
                      <span className={`text-lg font-bold w-14 text-right ${sem.text}`}>
                        {t.compliance_avg}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{t.completed}/{t.total} completadas</span>
                      {t.open_actions > 0 && (
                        <span className="text-amber-600 font-medium">{t.open_actions} acc. abiertas</span>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/40">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sem.cls} text-white`}>
                        {sem.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acciones vencidas */}
          {dash.actions_overdue?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold text-red-700">
                    Acciones vencidas ({dash.actions_overdue.length})
                  </h3>
                </div>
              </div>
              <div className="space-y-2">
                {(showAllOverdue ? dash.actions_overdue : dash.actions_overdue.slice(0, 4)).map(a => (
                  <ActionRow key={a.id} action={a} navigate={navigate} companyId={companyId} isOverdue={true} />
                ))}
              </div>
              {dash.actions_overdue.length > 4 && (
                <button onClick={() => setShowAllOverdue(v => !v)}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium">
                  {showAllOverdue ? "Ver menos" : `Ver ${dash.actions_overdue.length - 4} más`}
                </button>
              )}
            </div>
          )}

          {/* Acciones próximas a vencer */}
          {dash.actions_due_soon?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-700">
                  Próximas a vencer — 7 días ({dash.actions_due_soon.length})
                </h3>
              </div>
              <div className="space-y-2">
                {(showAllDueSoon ? dash.actions_due_soon : dash.actions_due_soon.slice(0, 4)).map(a => (
                  <ActionRow key={a.id} action={a} navigate={navigate} companyId={companyId} isOverdue={false} />
                ))}
              </div>
              {dash.actions_due_soon.length > 4 && (
                <button onClick={() => setShowAllDueSoon(v => !v)}
                  className="mt-3 text-xs text-amber-500 hover:text-amber-700 font-medium">
                  {showAllDueSoon ? "Ver menos" : `Ver ${dash.actions_due_soon.length - 4} más`}
                </button>
              )}
            </div>
          )}

        </div>
      )}

      <InspectionCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        companyId={companyId}
        orgId={user?.organization?.id}
        onCreated={(ins) => navigate(`/dashboard/empresas/${companyId}/inspecciones/${ins.id}`)}
      />
    </DashboardLayout>
  );
};

export default InspectionDashboardPage;