import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Building2, ClipboardCheck, ClipboardList, FileText, Pencil, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompanyLogo } from "../components/companies/CompanyLogo";
import { Pagination } from "../components/common/Pagination";
import { SearchInput } from "../components/common/SearchInput";
import { CompanyFormModal } from "../components/companies/CompanyFormModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import companyService from "../services/company.service";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { CompanySignersModal } from "../components/companies/CompanySignersModal";
const PAGE_SIZE = 20;

export const CompaniesPage = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("companies.create");
  const canEdit = hasPermission("companies.edit");
  const canViewDocs = hasPermission("documents.view");

  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signersCompany, setSignersCompany] = useState(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyService.getCompanies({
        search: debouncedSearch || undefined,
        skip,
        limit: PAGE_SIZE,
      });
      setCompanies(data.items);
      setTotal(data.total);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar las empresas",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, skip]);

  useEffect(() => {
    setSkip(0);
  }, [debouncedSearch]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const openCreateModal = () => {
    setEditingCompany(null);
    setModalOpen(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Empresas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Empresas registradas y su acceso a la gestión documental.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Empresa
          </Button>
        )}
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por RUC o razón social..."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Trabajadores</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No se encontraron empresas
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CompanyLogo companyId={company.id} hasLogo={company.has_logo} size={36} />
                        <div>
                          <p className="font-medium text-gray-900">{company.razon_social}</p>
                          {company.nombre_comercial && (
                            <p className="text-xs text-gray-500">{company.nombre_comercial}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{company.ruc}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {company.num_trabajadores}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {company.is_active ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          Activa
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canViewDocs && (
                          <button
                            onClick={() => navigate(`/dashboard/empresas/${company.id}/inspecciones/dashboard`)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                            aria-label={`Inspecciones de ${company.razon_social}`}
                            title="Inspecciones SST"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        )}
                        {canViewDocs && (
                          <button
                            onClick={() => navigate(`/dashboard/empresas/${company.id}/diagnosticos`)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                            aria-label={`Diagnóstico Anexo 1 de ${company.razon_social}`}
                            title="Diagnóstico Anexo 1"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>
                        )}
                        {canViewDocs && (
                          <button
                            onClick={() => navigate(`/dashboard/empresas/${company.id}/documentos`)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                            aria-label={`Gestión documental de ${company.razon_social}`}
                            title="Gestión documental"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(company)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                            aria-label={`Editar ${company.razon_social}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setSignersCompany(company)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                            title="Configurar firmantes del informe"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination total={total} skip={skip} limit={PAGE_SIZE} onPageChange={setSkip} />
      </div>

      <CompanyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        company={editingCompany}
        onSaved={loadCompanies}
      />
      <CompanySignersModal
       open={!!signersCompany}
       onClose={() => setSignersCompany(null)}
       company={signersCompany}
     />
    </DashboardLayout>
  );
};

export default CompaniesPage;
