/**
 * Configuración de tipos de inspección — solo Supervisor/Admin
 * Acceso: /dashboard/configuracion-inspecciones
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ClipboardList, Pencil, Plus, Power, Settings, Trash2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import inspectionService from "../services/inspection.service";
import InspectionTypeFormModal from "../components/inspections/InspectionTypeFormModal";

const PERIODICITY_LABELS = {
  diario: "Diario", semanal: "Semanal", mensual: "Mensual",
  bimestral: "Bimestral", trimestral: "Trimestral",
  semestral: "Semestral", anual: "Anual",
};

export const InspectionTypesPage = () => {
  const { user, hasPermission } = useAuth();
  const { selectedOrgId } = useOrganization();
  const canManage = hasPermission("inspections.manage");
  // Super-admin no tiene org propia; usa la org seleccionada en el selector global
  const orgId = user?.organization?.id ?? selectedOrgId;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try { setTypes(await inspectionService.getTypes(orgId)); }
    catch { /**/ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orgId]);

  const handleDeactivate = async (t) => {
    const r = await Swal.fire({
      icon: "warning", title: `¿Desactivar "${t.name}"?`,
      text: "Ya no estará disponible para nuevas inspecciones.",
      showCancelButton: true, confirmButtonText: "Desactivar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try { await inspectionService.deactivateType(orgId, t.id); load(); }
    catch (err) {
      const msg = err.response?.data?.detail || "Error al guardar";
      Swal.fire({
        icon: "error",
        title: err.response?.status === 409 ? "No se puede modificar" : "Error",
        text: msg,
        confirmButtonColor: "#16a34a",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Tipos de Inspección
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Define los formularios de inspección para tu organización. Cada tipo tiene sus propios campos configurables.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo tipo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Settings className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No hay tipos de inspección configurados.</p>
          {canManage && (
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Crear primer tipo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-3
              ${t.is_active ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.field_count} campo{t.field_count !== 1 ? "s" : ""} ·{" "}
                      {PERIODICITY_LABELS[t.periodicity] || t.periodicity || "Sin periodicidad"}
                    </p>
                  </div>
                </div>
                {!t.is_active && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Inactivo
                  </span>
                )}
              </div>

              {t.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
              )}

              {/* Campos preview */}
              <div className="flex flex-wrap gap-1">
                {t.fields.slice(0, 6).map(f => (
                  <span key={f.id}
                    className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {f.name}
                  </span>
                ))}
                {t.fields.length > 6 && (
                  <span className="text-[10px] text-gray-400">+{t.fields.length - 6} más</span>
                )}
              </div>

              {canManage && (
                <div className="flex gap-2 pt-1 border-t border-gray-50">
                  <Button variant="outline" onClick={() => { setEditing(t); setModalOpen(true); }}
                    className="flex-1 text-xs">
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  {t.is_active && (
                    <button onClick={() => handleDeactivate(t)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Desactivar">
                      <Power className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <InspectionTypeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        typeData={editing}
        orgId={orgId}
        onSaved={load}
      />
    </DashboardLayout>
  );
};
export default InspectionTypesPage;