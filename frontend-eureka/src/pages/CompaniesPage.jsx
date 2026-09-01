import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Plus, Search, Users } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import companyService from "../services/company.service";
import { CompanyFormModal } from "../components/companies/CompanyFormModal";
import { CompanyLogo } from "../components/companies/CompanyLogo";

export const CompaniesPage = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { selectedOrgId } = useOrganization();
  const isPlatformAdmin = !user?.organization;
  const canCreate = hasPermission("companies.create");

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async (q = search, p = page) => {
    setLoading(true);
    try {
      const params = { search: q, page: p, page_size: 20 };
      if (isPlatformAdmin && selectedOrgId) params.org_id = selectedOrgId;
      const data = await companyService.getCompanies(params);
      setCompanies(data.items || data);
      setTotalPages(data.total_pages || 1);
    } catch { /**/ } finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); load(search, 1); }, [selectedOrgId]);

  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
    load(v, 1);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Empresas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona una empresa para acceder a sus módulos SST.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva Empresa
          </Button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por RUC o razón social..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {search ? "Sin resultados para esa búsqueda" : "No hay empresas registradas"}
          </p>
          {canCreate && !search && (
            <Button onClick={() => setModalOpen(true)}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Crear primera empresa
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Cabecera tabla */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100
            text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-5">Empresa</div>
            <div className="col-span-3">RUC</div>
            <div className="col-span-2">Trabajadores</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-1" />
          </div>

          {/* Filas */}
          {companies.map(company => (
            <div key={company.id}
              onClick={() => navigate(`/dashboard/empresas/${company.id}`)}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-50
                hover:bg-green-50/30 cursor-pointer transition-colors items-center group">

              {/* Empresa */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <CompanyLogo
                companyId={company.id}
                hasLogo={company.has_logo}
                size={36}
                className="border border-gray-100 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {company.razon_social}
                  </p>
                  {company.nombre_comercial && company.nombre_comercial !== company.razon_social && (
                    <p className="text-xs text-gray-400 truncate">{company.nombre_comercial}</p>
                  )}
                </div>
              </div>

              {/* RUC */}
              <div className="col-span-3">
                <span className="text-sm text-gray-600 font-mono">{company.ruc}</span>
              </div>

              {/* Trabajadores */}
              <div className="col-span-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-sm text-gray-600">{company.num_trabajadores}</span>
              </div>

              {/* Estado */}
              <div className="col-span-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  ${company.is_active === true || company.is_active === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {company.is_active === true || company.is_active === 1 ? "Activa" : "Inactiva"}
                </span>
              </div>

              {/* Flecha */}
              <div className="col-span-1 flex justify-end">
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1}
              onClick={() => { setPage(p => p - 1); load(search, page - 1); }}
              className="text-xs">← Anterior</Button>
            <Button variant="outline" disabled={page >= totalPages}
              onClick={() => { setPage(p => p + 1); load(search, page + 1); }}
              className="text-xs">Siguiente →</Button>
          </div>
        </div>
      )}

      <CompanyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load(); }}
      />
    </DashboardLayout>
  );
};

export default CompaniesPage;