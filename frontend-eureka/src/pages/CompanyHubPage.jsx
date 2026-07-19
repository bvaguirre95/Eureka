import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity, ArrowLeft, Building2, ClipboardCheck,
  FileText, LayoutDashboard, Settings, Shield, Users,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import inspectionService from "../services/inspection.service";
import { CompanyFormModal } from "../components/companies/CompanyFormModal";

// ── ModuleCard ────────────────────────────────────────────────────────────────

const ModuleCard = ({ icon: Icon, title, description, badge, badgeColor = "bg-gray-100 text-gray-600",
  onClick, comingSoon }) => (
  <button onClick={!comingSoon ? onClick : undefined}
    className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 transition-all
      ${comingSoon
        ? "opacity-50 cursor-not-allowed border-gray-100"
        : "border-gray-100 hover:shadow-md hover:border-green-200 cursor-pointer"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className={`p-3 rounded-xl flex-shrink-0 ${comingSoon ? "bg-gray-100" : "bg-green-50"}`}>
        <Icon className={`w-6 h-6 ${comingSoon ? "text-gray-400" : "text-green-600"}`} />
      </div>
      {badge !== undefined && !comingSoon && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}
      {comingSoon && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wide">
          Próximamente
        </span>
      )}
    </div>
    <div className="mt-3">
      <p className="font-bold text-gray-900 text-base">{title}</p>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
    </div>
  </button>
);

// ── Página principal ──────────────────────────────────────────────────────────

export const CompanyHubPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [company, setCompany]     = useState(null);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editOpen, setEditOpen]   = useState(false);
  const [logoKey, setLogoKey]     = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, dash] = await Promise.all([
        companyService.getCompany(companyId),
        inspectionService.getDashboard(companyId).catch(() => null),
      ]);
      setCompany(co);
      setStats(dash);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const go = (path) => navigate(`/dashboard/empresas/${companyId}/${path}`);

  const logoUrl = `/api/v1/companies/${companyId}/logo?t=${logoKey}`;

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    </DashboardLayout>
  );

  const insp = stats;
  const inspBadgeColor = !insp || insp.total === 0 ? "bg-gray-100 text-gray-400"
    : insp.compliance_avg >= 80 ? "bg-green-100 text-green-700"
    : insp.compliance_avg >= 50 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/empresas")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Empresas
      </button>

      {/* Header empresa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            {company?.has_logo ? (
              <img src={logoUrl} alt="Logo"
                className="w-16 h-16 rounded-xl object-contain border border-gray-100"
                onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {company?.razon_social}
            </h2>
            {company?.nombre_comercial && company.nombre_comercial !== company.razon_social && (
              <p className="text-sm text-gray-400">{company.nombre_comercial}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span>RUC: {company?.ruc}</span>
              {company?.ciudad && <span>· {company.ciudad}</span>}
              {company?.num_trabajadores > 0 && (
                <span>· 👥 {company.num_trabajadores} trabajadores</span>
              )}
              {company?.company_code && (
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {company.company_code}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full
              ${company?.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {company?.is_active ? "Activa" : "Inactiva"}
            </span>
            {hasPermission("companies.view") && (
              <button onClick={() => setEditOpen(true)}
                className="p-2 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                title="Editar empresa">
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de módulos */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        Módulos SST
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          icon={ClipboardCheck}
          title="Inspecciones SST"
          description="Planifica, ejecuta y monitorea inspecciones. Registra hallazgos y acciones correctivas."
          badge={insp?.total > 0 ? `${insp.compliance_avg}% cumplimiento` : "Sin inspecciones"}
          badgeColor={inspBadgeColor}
          onClick={() => go("inspecciones/dashboard")}
        />

        <ModuleCard
          icon={Activity}
          title="Matriz GERITRA"
          description="Identificación y evaluación de riesgos laborales por puesto de trabajo. ISO 45001:2018."
          badge="NUEVO"
          badgeColor="bg-blue-100 text-blue-700"
          onClick={() => go("geritra")}
        />

        <ModuleCard
          icon={LayoutDashboard}
          title="Diagnósticos"
          description="Diagnóstico inicial de cumplimiento normativo SST según normativa ecuatoriana."
          onClick={() => go("diagnosticos")}
        />

        <ModuleCard
          icon={FileText}
          title="Gestión Documental"
          description="Matriz documental y control de documentos SST requeridos por la normativa."
          onClick={() => go("documentos")}
        />

        {hasPermission("users.view") && (
          <ModuleCard
            icon={Users}
            title="Usuarios"
            description="Gestiona los usuarios asignados a esta empresa y sus roles de acceso."
            onClick={() => navigate(`/dashboard/usuarios?empresa=${companyId}`)}
          />
        )}

        <ModuleCard
          icon={Shield}
          title="Accidentes e Incidentes"
          description="Registro y seguimiento de accidentes, incidentes y enfermedades laborales."
          comingSoon
        />
      </div>

      {/* Stats rápidas */}
      {insp && insp.total > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-gray-700">Resumen SST — Inspecciones</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Inspecciones",   value: insp.total,           color: "text-blue-600" },
              { label: "Cumplimiento",   value: `${insp.compliance_avg}%`,
                color: insp.compliance_avg >= 80 ? "text-green-600" : insp.compliance_avg >= 50 ? "text-amber-600" : "text-red-600" },
              { label: "Acc. abiertas", value: insp.open_actions,    color: insp.open_actions > 0 ? "text-amber-600" : "text-green-600" },
              { label: "Vencidas",      value: insp.overdue_actions, color: insp.overdue_actions > 0 ? "text-red-600" : "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal editar empresa */}
      <CompanyFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        company={company}
        onSaved={() => {
          setEditOpen(false);
          setLogoKey(k => k + 1);
          load();
        }}
      />
    </DashboardLayout>
  );
};

export default CompanyHubPage;