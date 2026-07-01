import React, { useEffect, useState } from "react";
import { Briefcase, Building2, FileText, ShieldCheck, Users } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import dashboardService from "../services/dashboard.service";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

// Descripción de bienvenida según los permisos/alcance del rol del usuario,
// sin depender de nombres de rol fijos.
const getWelcomeDescription = (user, hasPermission) => {
  if (!user?.organization) {
    return "Tienes acceso de super-administrador de la plataforma: gestiona organizaciones (consultoras y empresas).";
  }
  if (hasPermission("roles.manage")) {
    return "Tienes acceso total al sistema: empresas, usuarios, roles y toda la gestión documental.";
  }
  if (!user?.role?.is_company_scoped) {
    return "Tienes visión transversal del cumplimiento documental de todas las empresas.";
  }
  return "Aquí verás únicamente las empresas que tienes asignadas y su documentación.";
};

export const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const isPlatformAdmin = !user?.organization;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Hola, {user?.full_name?.split(" ")[0] || "bienvenido"} 👋
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {getWelcomeDescription(user, hasPermission)}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            {user?.role?.name}
          </span>
          {user?.organization && (
            <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {user.organization.name}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : isPlatformAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Briefcase} label="Organizaciones" value={summary?.organizations} color="bg-blue-500" />
          <StatCard icon={Building2} label="Empresas (todas)" value={summary?.companies} color="bg-green-600" />
          <StatCard icon={Users} label="Usuarios (todos)" value={summary?.users} color="bg-teal-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Empresas" value={summary?.companies} color="bg-blue-500" />
            <StatCard icon={FileText} label="Documentos cargados" value={summary?.documents_total} color="bg-green-600" />
            <StatCard
              icon={ShieldCheck}
              label="Cumplimiento"
              value={summary ? `${summary.compliance_percent}%` : "—"}
              color="bg-emerald-500"
            />
            <StatCard icon={Users} label="Usuarios" value={summary?.users} color="bg-teal-600" />
          </div>

          {summary && summary.documents_pending_review > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              Tienes <strong>{summary.documents_pending_review}</strong> documento(s)
              cargado(s) pendientes de validación este año.
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
