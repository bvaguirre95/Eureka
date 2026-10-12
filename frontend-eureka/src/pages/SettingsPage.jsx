import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Lock, Pencil, Plus, Power, Tag, Users } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { CategoryFormModal } from "../components/documents/CategoryFormModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import documentService from "../services/document.service";

// ── Página principal ──────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission("settings.manage") || user?.organization == null;
  const isSuperAdmin = user?.organization == null;

  const [activeTab, setActiveTab]       = useState("categorias");
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await documentService.getCategories(false);
      setCategories(data);
    } catch (error) {
      Swal.fire({
        icon: "error", title: "No se pudieron cargar las categorías",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleToggleActive = async (category) => {
    if (!category.is_active) return;
    const result = await Swal.fire({
      icon: "warning", title: `¿Desactivar "${category.name}"?`,
      text: "Ya no podrá usarse para nuevos items del catálogo.",
      showCancelButton: true, confirmButtonText: "Desactivar",
      cancelButtonText: "Cancelar", confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await documentService.deactivateCategory(category.id);
      await loadCategories();
    } catch (error) {
      Swal.fire({
        icon: "error", title: "No se pudo desactivar la categoría",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    }
  };

  const TABS = [
    { id: "categorias", label: "Categorías documentales", icon: Tag },
    // Solo mostrar firmantes si tiene organización (no super-admin global)
    ...(!isSuperAdmin
      ? [{ id: "firmantes", label: "Firmantes de informes", icon: Users }]
      : []),
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ajustes generales de tu organización
          </p>
        </div>
        {canManage && activeTab === "categorias" && (
          <Button
            onClick={() => { setEditingCategory(null); setModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                border-b-2 transition-all
                ${activeTab === tab.id
                  ? "border-green-500 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Categorías */}
      {activeTab === "categorias" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Estado</th>
                  {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No hay categorías registradas
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Tag className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="font-medium text-gray-900">{cat.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cat.is_global ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <Lock className="w-3.5 h-3.5" /> Plataforma
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Mi organización</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cat.is_active ? (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                            Activa
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            Inactiva
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          {(!cat.is_global || isSuperAdmin) && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingCategory(cat); setModalOpen(true); }}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {cat.is_active && (
                                <button
                                  onClick={() => handleToggleActive(cat)}
                                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Desactivar"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editingCategory}
        onSaved={loadCategories}
      />
    </DashboardLayout>
  );
};

export default SettingsPage;