import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

export const InspectionCreateModal = ({ open, onClose, companyId, orgId, onCreated }) => {
  const [types, setTypes]       = useState([]);
  const [signers, setSigners]   = useState(null);
  const [form, setForm]         = useState({
    inspection_type_id: "",
    scheduled_date: "",
    location: "",
    start_time: "10H00",
    end_time: "11H00",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !orgId) return;
    // Cargar tipos activos y firmantes en paralelo
    Promise.all([
      inspectionService.getTypes(orgId, true),
      inspectionService.getSigners(companyId).catch(() => null),
    ]).then(([typeList, sgnrs]) => {
      setTypes(typeList);
      setSigners(sgnrs);
      if (typeList.length > 0)
        setForm(f => ({ ...f, inspection_type_id: String(typeList[0].id) }));
    });
  }, [open, orgId, companyId]);

  const selectedType = types.find(t => String(t.id) === form.inspection_type_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.inspection_type_id) return;
    setSubmitting(true);
    try {
      const ins = await inspectionService.create(companyId, {
        inspection_type_id: Number(form.inspection_type_id),
        scheduled_date:  form.scheduled_date  || null,
        location:        form.location        || null,
        start_time:      form.start_time      || null,
        end_time:        form.end_time        || null,
        // inspection_number vacío → backend genera automáticamente
        // firmantes vacíos → backend usa predeterminados de empresa
      });
      onCreated(ins);
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo crear la inspección",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSubmitting(false); }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm(p => ({ ...p, [field]: e.target.value })),
    className: "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Inspección</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Tipo de inspección *
            </label>
            <select value={form.inspection_type_id}
              onChange={e => setForm(p => ({ ...p, inspection_type_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none">
              {types.length === 0
                ? <option value="">— Sin tipos configurados —</option>
                : types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {types.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                El Supervisor debe configurar tipos de inspección primero.
              </p>
            )}
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Fecha</label>
              <input type="date" {...f("scheduled_date")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Lugar</label>
              <input {...f("location")} placeholder="Ej: Área de producción" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Inicio</label>
              <input {...f("start_time")} placeholder="10H00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Fin</label>
              <input {...f("end_time")} placeholder="11H00" />
            </div>
          </div>

          {/* Preview firmantes */}
          {signers && (signers.reviewed_by || signers.approved_by) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 mb-2">Firmantes del informe (predeterminados)</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>✏️ <strong>Elaborado:</strong> Usuario actual · {signers.elaborated_role || "—"}</p>
                {signers.reviewed_by && (
                  <p>👁️ <strong>Revisado:</strong> {signers.reviewed_by} · {signers.reviewed_role || "—"}</p>
                )}
                {signers.approved_by && (
                  <p>✅ <strong>Aprobado:</strong> {signers.approved_by} · {signers.approved_role || "—"}</p>
                )}
              </div>
            </div>
          )}

          {!signers?.reviewed_by && (
            <p className="text-xs text-amber-600">
              ⚠️ No hay firmantes configurados para esta empresa.
              Ve a Empresas → ⚙️ Firmantes para configurarlos.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit"
              disabled={submitting || !form.inspection_type_id || types.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
              {submitting ? "Creando..." : "Crear inspección"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default InspectionCreateModal;
