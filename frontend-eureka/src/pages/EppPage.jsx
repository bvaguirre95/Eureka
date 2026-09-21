/**
 * EppPage
 * Ruta: /dashboard/empresas/:companyId/epp
 *
 * Vista principal de EPP por empresa:
 * - KPIs (activos, por vencer, vencidos)
 * - Listado de todas las entregas
 * - Acceso a modal de nueva entrega
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  AlertTriangle, ArrowLeft, CheckCircle2,
  Clock, Loader2, Plus, RefreshCw, Shield,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import companyService from "../services/company.service";
import eppService from "../services/epp.service";
import { EppDeliveryModal } from "../components/epp/EppDeliveryModal";

const STATUS_CFG = {
  entregado:  { label: "Entregado",  cls: "bg-green-100 text-green-700"   },
  devuelto:   { label: "Devuelto",   cls: "bg-gray-100 text-gray-500"     },
  reposicion: { label: "Reposición", cls: "bg-blue-100 text-blue-700"     },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const DaysChip = ({ days }) => {
  if (days === null || days === undefined) return null;
  if (days < 0)  return <span className="text-xs text-red-600 font-bold">Vencido {Math.abs(days)}d</span>;
  if (days <= 30) return <span className="text-xs text-orange-600 font-medium">Vence en {days}d</span>;
  return <span className="text-xs text-gray-400">Vence en {days}d</span>;
};

export const EppPage = () => {
  const { companyId } = useParams();
  const navigate      = useNavigate();
  const { user, hasPermission } = useAuth();
  const { selectedOrgId }       = useOrganization();

  const orgId    = user?.organization?.id ?? selectedOrgId;
  const canView  = hasPermission("epp.view");
  const canDeliver = hasPermission("epp.deliver");

  const [company, setCompany]     = useState(null);
  const [kpis, setKpis]           = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter)   params.status = statusFilter;
      if (expiringFilter) params.expiring_in_days = 30;

      const [co, kpisData, data] = await Promise.all([
        companyService.getCompany(companyId),
        eppService.getKpis(companyId),
        eppService.listCompanyDeliveries(companyId, params),
      ]);
      setCompany(co);
      setKpis(kpisData);
      setDeliveries(data.items || []);
      setTotal(data.total || 0);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [companyId, statusFilter, expiringFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      {/* Back */}
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500
          hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a {company?.razon_social || "Empresa"}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              EPP y Ropa de Trabajo
            </h2>
            <p className="text-sm text-gray-500">
              {company?.razon_social} · Entregas y trazabilidad
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canDeliver && (
            <Button onClick={() => setModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nueva entrega
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{kpis.total_active}</p>
            <p className="text-xs text-green-600 mt-0.5 font-medium">EPP activos</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{kpis.expiring_soon}</p>
            <p className="text-xs text-orange-500 mt-0.5 font-medium">Por vencer (30d)</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{kpis.overdue}</p>
            <p className="text-xs text-red-500 mt-0.5 font-medium">Vencidos</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4
        flex flex-wrap gap-2 items-center">
        {["", "entregado", "devuelto", "reposicion"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {s === "" ? "Todos" : STATUS_CFG[s]?.label || s}
          </button>
        ))}
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <button onClick={() => setExpiringFilter(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
            font-medium transition-colors ${
            expiringFilter
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          <Clock className="w-3 h-3" />
          Por vencer (30d)
        </button>
        <span className="text-xs text-gray-400 ml-auto">{total} entrega{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-14 text-center">
          <Shield className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500">Sin entregas registradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Registra las entregas de EPP a los trabajadores para tener trazabilidad completa.
          </p>
          {canDeliver && (
            <Button onClick={() => setModalOpen(true)}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Registrar primera entrega
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trabajador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">EPP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entrega</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deliveries.map(d => {
                  const cfg = STATUS_CFG[d.status] || {};
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{d.worker_name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">
                          {d.epp_type_icon && <span className="mr-1">{d.epp_type_icon}</span>}
                          {d.epp_name}
                        </p>
                        <p className="text-xs text-gray-400">{d.epp_type_name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(d.delivery_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-600">{fmtDate(d.expiry_date)}</span>
                          <DaysChip days={d.days_to_expiry} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EppDeliveryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        companyId={companyId}
        orgId={orgId}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default EppPage;
