import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Lock, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { RoleFormModal } from "../components/roles/RoleFormModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import roleService from "../services/role.service";
import organizationService from "../services/organization.service";

export const RolesPage = () => {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("roles.manage");
  const isPlatformAdmin = !user?.organization;

  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Super admin: cargar organizaciones para el selector
  useEffect(() => {
    if (!isPlatformAdmin) return;
    organizationService.getOrganizations({ limit: 100 })
      .then(data => {
        const list = data.items || [];
        setOrgs(list);
        if (list.length > 0) setSelectedOrgId(list[0].id);
      })
      .catch(() => {});
  }, [isPlatformAdmin]);

  // Cargar roles cuando cambia la org seleccionada
  const load = async () => {
    // Admin normal: carga sus propios roles (orgId no necesario)
    // Super admin: necesita org seleccionada
    if (isPlatformAdmin && !selectedOrgId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await roleService.getRoles(isPlatformAdmin ? selectedOrgId : undefined);
      setRoles(data);
    } catch { /**/ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedOrgId]);

  const openCreate = () => { setEditingRole(null); setModalOpen(true); };
  const openEdit   = (role) => { setEditingRole(role); setModalOpen(true); };

  const handleDelete = async (role) => {
    if (role.is_system) return;
    const r = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar rol "${role.name}"?`,
      text: "No se puede eliminar si hay usuarios asignados.",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      await roleService.deleteRole(role.id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo eliminar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    }
  };

  const selectedOrgName = orgs.find(o => o.id === selectedOrgId)?.name || "";

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Roles y Permisos</h2>
          <p className="text-sm text-gray-600 mt-1">
            {isPlatformAdmin
              ? "Como super admin puedes gestionar los roles de cualquier organización."
              : "Define qué puede hacer cada tipo de usuario en tu organización."}
          </p>
        </div>
        {canManage && (!isPlatformAdmin || selectedOrgId) && (
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Rol
          </Button>
        )}
      </div>

      {/* Selector de organización — solo super admin */}
      {isPlatformAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-700 font-medium flex-shrink-0">
            🛡️ Modo super admin — Gestionar organización:
          </p>
          <select
            value={selectedOrgId || ""}
            onChange={e => setSelectedOrgId(Number(e.target.value))}
            className="flex-1 px-4 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:border-amber-500 outline-none"
          >
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {isPlatformAdmin && !selectedOrgId
              ? "Selecciona una organización para ver sus roles."
              : "No hay roles en esta organización."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => {
            const moduleMap = {};
            role.permissions.forEach(p => {
              const mod = typeof p === "object" ? p.module : p.split(".")[0];
              const name = typeof p === "object" ? p.name : p;
              moduleMap[mod] = moduleMap[mod] || [];
              moduleMap[mod].push(name);
            });

            return (
              <div key={role.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${role.is_system ? "bg-amber-100" : "bg-green-100"}`}>
                      {role.is_system
                        ? <Lock className="w-5 h-5 text-amber-600" />
                        : <Shield className="w-5 h-5 text-green-600" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {role.is_company_scoped ? "Solo empresas asignadas" : "Todas las empresas"}
                      </p>
                    </div>
                  </div>
                  {role.is_system && (
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex-shrink-0">
                      SISTEMA
                    </span>
                  )}
                </div>

                {role.description && (
                  <p className="text-xs text-gray-500 -mt-1">{role.description}</p>
                )}

                {/* Permisos agrupados por módulo */}
                <div className="space-y-2 flex-1 min-h-0">
                  {Object.keys(moduleMap).length === 0 ? (
                    <p className="text-xs text-gray-300 italic">Sin permisos asignados</p>
                  ) : (
                    Object.entries(moduleMap).map(([mod, names]) => (
                      <div key={mod}>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          {mod}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {names.map(name => (
                            <span key={name}
                              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    {/* Super admin puede editar hasta roles del sistema */}
                    {(isPlatformAdmin || !role.is_system) && (
                      <Button variant="outline" onClick={() => openEdit(role)}
                        className="flex-1 text-xs">
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        {role.is_system && !isPlatformAdmin ? "Ver permisos" : "Editar"}
                      </Button>
                    )}
                    {!role.is_system && (
                      <button onClick={() => handleDelete(role)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RoleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        role={editingRole}
        orgId={isPlatformAdmin ? selectedOrgId : user?.organization?.id}
        isPlatformAdmin={isPlatformAdmin}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default RolesPage;
