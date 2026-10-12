import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

export const CompanySignersModal = ({ open, onClose, company }) => {
  const [form, setForm] = useState({
    elaborated_role: "", reviewed_by: "", reviewed_role: "",
    approved_by: "", approved_role: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !company) return;
    setLoading(true);
    inspectionService.getSigners(company.id)
      .then(data => setForm({
        elaborated_role: data.elaborated_role || "",
        reviewed_by:     data.reviewed_by     || "",
        reviewed_role:   data.reviewed_role   || "",
        approved_by:     data.approved_by     || "",
        approved_role:   data.approved_role   || "",
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, company]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inspectionService.updateSigners(company.id, form);
      Swal.fire({ icon: "success", title: "Firmantes guardados",
        timer: 1500, showConfirmButton: false });
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al guardar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const inp = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Firmantes del informe — {company?.razon_social}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 mt-2">
            {/* Elaborado por */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                Elaborado por
              </p>
              <p className="text-xs text-blue-600 mb-3">
                El nombre se toma automáticamente del usuario que crea la inspección.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Cargo / Rol</label>
                <input value={form.elaborated_role}
                  onChange={e => setForm({...form, elaborated_role: e.target.value})}
                  placeholder="Ej: TÉCNICO SIG" className={inp} />
              </div>
            </div>

            {/* Revisado por */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Revisado por</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo</label>
                  <input value={form.reviewed_by}
                    onChange={e => setForm({...form, reviewed_by: e.target.value})}
                    placeholder="Ej: Ing. Gabriela Avecillas A." className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Cargo / Rol</label>
                  <input value={form.reviewed_role}
                    onChange={e => setForm({...form, reviewed_role: e.target.value})}
                    placeholder="Ej: SUPERVISORA SIG" className={inp} />
                </div>
              </div>
            </div>

            {/* Aprobado por */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Aprobado por</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo</label>
                  <input value={form.approved_by}
                    onChange={e => setForm({...form, approved_by: e.target.value})}
                    placeholder="Ej: Ing. Bryan Tinoco L., Mgtr." className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Cargo / Rol</label>
                  <input value={form.approved_role}
                    onChange={e => setForm({...form, approved_role: e.target.value})}
                    placeholder="Ej: COORDINADOR SIG" className={inp} />
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Estos valores se usarán por defecto al crear cualquier inspección para esta empresa.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar firmantes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default CompanySignersModal;
