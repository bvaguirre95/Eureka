import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Pencil, Plus, Power } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { CatalogItemFormModal } from "../components/documents/CatalogItemFormModal";
import { PERIODICITY_LABELS } from "../components/documents/documentStatus";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import documentService from "../services/document.service";

export const DocumentCatalogPage = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("documents.manage_catalog");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await documentService.getCatalog(false);
      setItems(data);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo cargar el catálogo",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleToggleActive = async (item) => {
    if (!item.is_active) return;

    const result = await Swal.fire({
      icon: "warning",
      title: `¿Desactivar "${item.name}"?`,
      text: "Dejará de aparecer en la matriz de las empresas.",
      showCancelButton: true,
      confirmButtonText: "Desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await documentService.deactivateCatalogItem(item.id);
      await loadItems();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo desactivar el item",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    }
  };

  const formatRange = (min, max) => {
    if (min === 0 && max === null) return "Todas las empresas";
    if (max === null) return `${min}+ trabajadores`;
    return `${min}–${max} trabajadores`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Catálogo Normativo de Documentos
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Define qué documentos aplican según el número de trabajadores y su periodicidad.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Item
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Periodicidad</th>
                <th className="px-4 py-3">Aplica a</th>
                <th className="px-4 py-3">Estado</th>
                {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No hay items en el catálogo
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 max-w-md">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                        {PERIODICITY_LABELS[item.periodicity]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatRange(item.min_workers, item.max_workers)}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
                            aria-label={`Editar ${item.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {item.is_active && (
                            <button
                              onClick={() => handleToggleActive(item)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label={`Desactivar ${item.name}`}
                              title="Desactivar"
                            >
                              <Power className="w-4 h-4" />
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
      </div>

      <CatalogItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editingItem}
        onSaved={loadItems}
      />
    </DashboardLayout>
  );
};

export default DocumentCatalogPage;
