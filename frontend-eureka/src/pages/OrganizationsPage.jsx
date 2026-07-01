import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Briefcase, Pencil, Plus } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Pagination } from "../components/common/Pagination";
import { SearchInput } from "../components/common/SearchInput";
import { OrganizationFormModal } from "../components/organizations/OrganizationFormModal";
import { Button } from "../components/ui/button";
import { useDebounce } from "../hooks/useDebounce";
import organizationService from "../services/organization.service";

const PAGE_SIZE = 20;

const ORG_TYPE_LABELS = {
  consultora: "Consultora",
  empresa_directa: "Empresa directa",
};

export const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizationService.getOrganizations({
        search: debouncedSearch || undefined,
        skip,
        limit: PAGE_SIZE,
      });
      setOrganizations(data.items);
      setTotal(data.total);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar las organizaciones",
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
    loadOrganizations();
  }, [loadOrganizations]);

  const openCreateModal = () => {
    setEditingOrg(null);
    setModalOpen(true);
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Organizaciones</h2>
          <p className="text-sm text-gray-600 mt-1">
            Consultoras y empresas directas que usan la plataforma.
          </p>
        </div>

        <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Organización
        </Button>
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o RUC..."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Organización</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No se encontraron organizaciones
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <Briefcase className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        {ORG_TYPE_LABELS[org.org_type] || org.org_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{org.ruc || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {org.email || "—"}
                      {org.phone && <p>{org.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {org.is_active ? (
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
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                        aria-label={`Editar ${org.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination total={total} skip={skip} limit={PAGE_SIZE} onPageChange={setSkip} />
      </div>

      <OrganizationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        organization={editingOrg}
        onSaved={loadOrganizations}
      />
    </DashboardLayout>
  );
};

export default OrganizationsPage;
