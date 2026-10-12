/**
 * Página de configuración de firmantes predeterminados de la organización.
 * Ruta: /dashboard/configuracion/firmantes
 *
 * Los firmantes configurados aquí se heredan a todas las empresas e inspecciones.
 * Cada empresa puede sobreescribirlos desde su propia configuración.
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Users } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import inspectionService from "../services/inspection.service";
import { useOrganization } from "../contexts/OrganizationContext";
const inp = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400";

export const SignersSettingsPage = () => {
  const { hasPermission, user } = useAuth();
  const {
  selectedOrgId,
  selectedOrganization,
} = useOrganization();
  const isPlatformAdmin = !user?.organization;
  const canManage = hasPermission("settings.manage.signers");
  const orgId = isPlatformAdmin
  ? selectedOrgId
  : user?.organization?.id;

  const [signers, setSigners] = useState({
    elaborated_role: "",
    reviewed_by:     "",
    reviewed_role:   "",
    approved_by:     "",
    approved_role:   "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

    useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    inspectionService
      .getOrgSigners(orgId)
      .then((data) => {
        setSigners({
          elaborated_role: data.elaborated_role || "",
          reviewed_by: data.reviewed_by || "",
          reviewed_role: data.reviewed_role || "",
          approved_by: data.approved_by || "",
          approved_role: data.approved_role || "",
        });
      })
      .catch((err) => {
        console.error("Error cargando firmantes:", err);
      })
      .finally(() => {
        setLoading(false);
      });
}, [orgId]);

  const set = (k, v) => setSigners(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await inspectionService.updateOrgSigners(orgId, signers);
      Swal.fire({
        icon: "success",
        title: "Firmantes guardados",
        text: "Se aplicarán automáticamente a todas las inspecciones de la organización.",
        confirmButtonColor: "#16a34a",
      });
    } catch (err) {
      Swal.fire({
        icon: "error", title: "Error al guardar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-green-50 border border-green-100">
          <Users className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Firmantes de informes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configuración predeterminada para toda la organización
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            <strong>Configura los firmantes una sola vez aquí.</strong> Se heredarán
            automáticamente a todas las empresas e inspecciones de tu organización.
            Si una empresa necesita firmantes diferentes, puedes sobreescribirlos
            desde <strong>Empresas → Editar empresa → Firmantes</strong>.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

            {/* Elaborado por */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                Elaborado por
              </p>
              <p className="text-xs text-gray-400 mb-3">
                El nombre se toma automáticamente del usuario que crea la inspección.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Cargo / Rol
                </label>
                <input
                  value={signers.elaborated_role}
                  onChange={e => set("elaborated_role", e.target.value)}
                  placeholder="Ej: TÉCNICO SIG"
                  className={inp}
                  disabled={!canManage}
                />
              </div>
            </div>

            {/* Revisado por */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                Revisado por
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    value={signers.reviewed_by}
                    onChange={e => set("reviewed_by", e.target.value)}
                    placeholder="Ej: Ing. Gabriela Avecillas A."
                    className={inp}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Cargo / Rol
                  </label>
                  <input
                    value={signers.reviewed_role}
                    onChange={e => set("reviewed_role", e.target.value)}
                    placeholder="Ej: SUPERVISORA SIG"
                    className={inp}
                    disabled={!canManage}
                  />
                </div>
              </div>
            </div>

            {/* Aprobado por */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                Aprobado por
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    value={signers.approved_by}
                    onChange={e => set("approved_by", e.target.value)}
                    placeholder="Ej: Ing. Bryan Tinoco L., Mgtr."
                    className={inp}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Cargo / Rol
                  </label>
                  <input
                    value={signers.approved_role}
                    onChange={e => set("approved_role", e.target.value)}
                    placeholder="Ej: COORDINADOR SIG"
                    className={inp}
                    disabled={!canManage}
                  />
                </div>
              </div>
            </div>

            {/* Preview de firma */}
            {(signers.reviewed_by || signers.approved_by) && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Vista previa del bloque de firmas
                </p>
                <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
                  {[
                    { label: "Elaborado por", name: "Usuario actual", role: signers.elaborated_role },
                    { label: "Revisado por",  name: signers.reviewed_by, role: signers.reviewed_role },
                    { label: "Aprobado por",  name: signers.approved_by, role: signers.approved_role },
                  ].map((f, i) => (
                    <div key={i} className="text-center">
                      <div className="border-t border-gray-400 pt-2 mt-8">
                        <p className="text-xs font-bold text-gray-700 truncate">{f.name || "—"}</p>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5 truncate">{f.role || "—"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{f.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canManage && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 min-w-36"
                >
                  {saving ? "Guardando..." : "Guardar firmantes"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SignersSettingsPage;