/**
 * WorkersPage
 * Ruta: /dashboard/empresas/:companyId/trabajadores
 *
 * Gestiona el personal de la empresa.
 * Multi-tenant: todos los datos se filtran por companyId validado en backend.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft, Briefcase, Loader2, Plus,
  RefreshCw, Search, Shield, Users,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import workerService from "../services/worker.service";
import { WorkerFormModal } from "../components/workers/WorkerFormModal";
import { WorkerStatusBadge } from "../components/workers/WorkerStatusBadge";

const DOC_LABELS = { cedula: "Cédula", pasaporte: "Pasaporte", otro: "Otro" };
const CONTRACT_LABELS = {
  indefinido: "Indefinido", plazo_fijo: "Plazo fijo",
  obra: "Obra", servicios: "Servicios", pasantia: "Pasantía", otro: "Otro",
};

export const WorkersPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canView       = hasPermission("workers.view");
  const canCreate     = hasPermission("workers.create");
  const canEdit       = hasPermission("workers.edit");
  const canDeactivate = hasPermission("workers.deactivate");

  const [company, setCompany]           = useState(null);
  const [workers, setWorkers]           = useState([]);
  const [kpis, setKpis]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [includeRetired, setIncludeRetired] = useState(false);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 50;

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, kpisData, data] = await Promise.all([
        companyService.getCompany(companyId),
        workerService.getKpis(companyId),
        workerService.listWorkers(companyId, {
          search: search || undefined,
          status: statusFilter || undefined,
          include_retired: includeRetired,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        }),
      ]);
      setCompany(co);
      setKpis(kpisData);
      setWorkers(data.items || []);
      setTotal(data.total || 0);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [companyId, search, statusFilter, includeRetired, page]);

  useEffect(() => { load(); }, [load]);
  // Reset página al cambiar filtros
  useEffect(() => { setPage(1); }, [search, statusFilter, includeRetired]);

  const handleStatusChange = async (worker, newStatus) => {
    const labels = {
      inactivo: "Inactivo", suspendido: "Suspendido", retirado: "Retirar",
    };
    let termination_date = null;
    if (newStatus === "retirado") {
      const { value: fecha } = await Swal.fire({
        title: "Fecha de retiro",
        input: "date",
        inputLabel: "Ingresa la fecha de retiro del trabajador",
        showCancelButton: true,
        confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancelar",
      });
      if (!fecha) return;
      termination_date = fecha;
    } else {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: `¿Cambiar estado a ${labels[newStatus]}?`,
        text: `Trabajador: ${worker.full_name}`,
        showCancelButton: true,
        confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancelar",
        confirmButtonText: "Confirmar",
      });
      if (!isConfirmed) return;
    }
    try {
      await workerService.changeStatus(companyId, worker.id, {
        status: newStatus,
        termination_date,
      });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "No se pudo cambiar el estado",
        confirmButtonColor: "#16a34a" });
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout>
      {/* Back */}
      <button
        onClick={() => navigate(`/dashboard/empresas/${companyId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a {company?.razon_social || "Empresa"}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Trabajadores</h2>
            <p className="text-sm text-gray-500">
              {company?.razon_social} · Gestión de personal SST
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canCreate && (
            <Button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nuevo trabajador
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Activos",          value: kpis.total_active,    color: "text-green-700",  bg: "bg-green-50"  },
            { label: "Inactivos",         value: kpis.total_inactive,  color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Retirados",         value: kpis.total_retired,   color: "text-gray-600",   bg: "bg-gray-50"   },
            { label: "Con discapacidad",  value: kpis.with_disability, color: "text-purple-700", bg: "bg-purple-50" },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
              focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2
            focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="suspendido">Suspendido</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeRetired}
            onChange={e => setIncludeRetired(e.target.checked)}
            className="w-4 h-4 accent-green-600" />
          Incluir retirados
        </label>

        <span className="text-xs text-gray-400 ml-auto">{total} trabajador{total !== 1 ? "es" : ""}</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-14 text-center">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 text-lg">Sin trabajadores registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || statusFilter
              ? "No hay trabajadores que coincidan con los filtros aplicados."
              : "Registra el personal de la empresa para comenzar la gestión SST."}
          </p>
          {canCreate && !search && !statusFilter && (
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Registrar primer trabajador
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trabajador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Puesto / Área</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingreso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workers.map(w => (
                    <tr key={w.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/empresas/${companyId}/trabajadores/${w.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar inicial */}
                          <div className="w-9 h-9 rounded-full bg-green-100 text-green-700
                            flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {w.full_name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{w.full_name}</p>
                            {w.employee_code && (
                              <p className="text-xs text-gray-400">{w.employee_code}</p>
                            )}
                            {w.has_disability && (
                              <span className="text-[10px] bg-purple-100 text-purple-700
                                px-1.5 py-0.5 rounded font-medium">Discapacidad</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="text-xs text-gray-400">{DOC_LABELS[w.doc_type] || w.doc_type}</span>
                        <br />
                        <span className="font-mono">{w.doc_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{w.job_position_name || <span className="text-gray-300">—</span>}</p>
                        {w.department && (
                          <p className="text-xs text-gray-400">{w.department}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(w.hire_date).toLocaleDateString("es-EC", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <WorkerStatusBadge status={w.status} />
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && w.status !== "retirado" && (
                            <button
                              onClick={() => { setEditing(w); setModalOpen(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600
                                hover:bg-green-50 transition-colors text-xs"
                              title="Editar">
                              ✏️
                            </button>
                          )}
                          {canDeactivate && w.status === "activo" && (
                            <button
                              onClick={() => handleStatusChange(w, "retirado")}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600
                                hover:bg-red-50 transition-colors text-xs"
                              title="Retirar">
                              🚪
                            </button>
                          )}
                          {canDeactivate && w.status === "retirado" && (
                            <span className="text-xs text-gray-300 px-2">Retirado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Página {page} de {totalPages} · {total} trabajadores
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-xs h-8 px-3"
                    disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" className="text-xs h-8 px-3"
                    disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <WorkerFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing}
        companyId={companyId}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default WorkersPage;