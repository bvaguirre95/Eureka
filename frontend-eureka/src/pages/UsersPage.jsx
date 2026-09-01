import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Building2, Pencil, Plus, UserX } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Pagination } from "../components/common/Pagination";
import { SearchInput } from "../components/common/SearchInput";
import { UserFormModal } from "../components/users/UserFormModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import { useDebounce } from "../hooks/useDebounce";
import userService from "../services/user.service";
import roleService from "../services/role.service";

const PAGE_SIZE = 20;

export const UsersPage = () => {
  const { user, hasPermission } = useAuth();
  const { selectedOrgId } = useOrganization();
  const isPlatformAdmin = !user?.organization;
  const canCreate = hasPermission("users.create");
  const canEdit = hasPermission("users.edit");
  const canDelete = hasPermission("users.delete");

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  const [roles, setRoles] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch || undefined,
        role_id: roleFilter || undefined,
        skip,
        limit: PAGE_SIZE,
      };
      if (isPlatformAdmin && selectedOrgId) params.org_id = selectedOrgId;
      const data = await userService.getUsers(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar los usuarios",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, skip, selectedOrgId]);

  useEffect(() => {
    roleService.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    setSkip(0);
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleDeactivate = async (user) => {
    const result = await Swal.fire({
      icon: "warning",
      title: `¿Desactivar a "${user.full_name}"?`,
      text: "El usuario no podrá iniciar sesión hasta que sea reactivado.",
      showCancelButton: true,
      confirmButtonText: "Desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await userService.deactivateUser(user.id);
      await loadUsers();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo desactivar el usuario",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Usuarios</h2>
          <p className="text-sm text-gray-600 mt-1">
            Administra cuentas, asigna roles y empresas.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o email..."
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all sm:w-56"
        >
          <option value="">Todos los roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Empresas</th>
                <th className="px-4 py-3">Estado</th>
                {(canEdit || canDelete) && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                        {user.role?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {user.role?.is_company_scoped ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {user.companies?.length || 0}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Todas</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                              aria-label={`Editar ${user.full_name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && user.is_active && (
                            <button
                              onClick={() => handleDeactivate(user)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label={`Desactivar ${user.full_name}`}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination total={total} skip={skip} limit={PAGE_SIZE} onPageChange={setSkip} />
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        roles={roles}
        onSaved={loadUsers}
      />
    </DashboardLayout>
  );
};

export default UsersPage;