import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, ClipboardCheck, FilePlus, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import inspectionService from "../services/inspection.service";
import InspectionCreateModal from "../components/inspections/InspectionCreateModal";

const SEMAFORO = {
  green:  { cls: "bg-green-500",  label: "Cumple",    text: "text-green-700",  bg: "bg-green-50"  },
  yellow: { cls: "bg-amber-400",  label: "Regular",   text: "text-amber-700",  bg: "bg-amber-50"  },
  red:    { cls: "bg-red-500",    label: "Crítico",   text: "text-red-700",    bg: "bg-red-50"    },
};

const StatCard = ({ icon: Icon, label, value, color = "text-gray-900", sub }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-gray-50 flex-shrink-0`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const InspectionDashboardPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("inspections.create");

  const [company, setCompany] = useState(null);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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
            <p className="text-sm text-gray-500">
              Dashboard de cumplimiento SST · Inspecciones
            </p>
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
              <FilePlus className="w-4 h-4 mr-1.5" /> Nueva
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
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={ClipboardCheck}  label="Total inspecciones"     value={dash.total}           color="text-blue-600" />
            <StatCard icon={TrendingUp}       label="Cumplimiento promedio"  value={`${dash.compliance_avg}%`}
              color={dash.compliance_avg >= 80 ? "text-green-600" : dash.compliance_avg >= 50 ? "text-amber-600" : "text-red-600"} />
            <StatCard icon={AlertTriangle}    label="Acciones abiertas"     value={dash.open_actions}
              color={dash.open_actions > 0 ? "text-amber-600" : "text-green-600"}
              sub={dash.overdue_actions > 0 ? `${dash.overdue_actions} vencidas` : undefined} />
            <StatCard icon={CheckCircle2}     label="Completadas / Cerradas" value={`${dash.completada + dash.cerrada}/${dash.total}`} color="text-green-600" />
          </div>

          {/* Estado por tipo — semáforo */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-3">
              Cumplimiento por tipo de inspección
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dash.by_type.map(t => {
                const sem = SEMAFORO[t.semaforo] || SEMAFORO.red;
                return (
                  <div key={t.type_id}
                    className={`rounded-2xl border p-5 ${sem.bg} border-transparent shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`font-bold text-base ${sem.text}`}>{t.type_name}</p>
                      <div className={`w-4 h-4 rounded-full ${sem.cls} flex-shrink-0`} title={sem.label} />
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
                        <span className="text-amber-600 font-medium">
                          {t.open_actions} acc. abiertas
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/40">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${sem.cls} text-white`}>
                        {sem.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estado de inspecciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Estado general</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Borrador",   value: dash.borrador,   color: "text-gray-500",  bg: "bg-gray-100"   },
                { label: "En proceso", value: dash.en_proceso, color: "text-blue-700",  bg: "bg-blue-50"    },
                { label: "Completada", value: dash.completada, color: "text-green-700", bg: "bg-green-50"   },
                { label: "Cerrada",    value: dash.cerrada,    color: "text-emerald-700",bg: "bg-emerald-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className={`text-xs font-medium ${s.color} opacity-80`}>{s.label}</p>
                </div>
              ))}
            </div>

            {dash.overdue_actions > 0 && (
              <div className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  <strong>{dash.overdue_actions}</strong> acción{dash.overdue_actions > 1 ? "es" : ""} correctiva{dash.overdue_actions > 1 ? "s" : ""} vencida{dash.overdue_actions > 1 ? "s" : ""} sin cerrar.
                </p>
              </div>
            )}
          </div>
        </>
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
