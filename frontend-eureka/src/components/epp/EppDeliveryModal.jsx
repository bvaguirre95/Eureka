/**
 * EppDeliveryModal
 * Modal para registrar una entrega de EPP a un trabajador.
 * Carga catálogo de EPP y trabajadores activos de la empresa.
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import eppService from "../../services/epp.service";
import workerService from "../../services/worker.service";

const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
  focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none`;

const EMPTY = {
  worker_id:      "",
  epp_catalog_id: "",
  delivery_date:  new Date().toISOString().slice(0, 10),
  expiry_date:    "",
  quantity:       1,
  size:           "",
  serial_number:  "",
  notes:          "",
};

export const EppDeliveryModal = ({ open, onClose, companyId, orgId, onSaved }) => {
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [workers, setWorkers] = useState([]);
  const [types, setTypes]     = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, delivery_date: new Date().toISOString().slice(0, 10) });
    setSelectedType("");

    Promise.all([
      workerService.listWorkers(companyId, { status: "activo", limit: 200 }),
      eppService.listTypes(orgId),
      eppService.listCatalog(orgId),
    ]).then(([wData, tData, cData]) => {
      setWorkers(wData.items || []);
      setTypes(tData || []);
      setCatalog(cData || []);
    }).catch(() => {});
  }, [open, companyId, orgId]);

  // Filtrar catálogo por tipo seleccionado
  useEffect(() => {
    if (!selectedType) {
      setFilteredCatalog(catalog);
    } else {
      setFilteredCatalog(catalog.filter(c => String(c.epp_type_id) === String(selectedType)));
    }
    setForm(f => ({ ...f, epp_catalog_id: "" }));
  }, [selectedType, catalog]);

  // Auto-calcular vencimiento al seleccionar un ítem del catálogo
  useEffect(() => {
    if (!form.epp_catalog_id || !form.delivery_date) return;
    const item = catalog.find(c => String(c.id) === String(form.epp_catalog_id));
    if (!item?.effective_life_months) return;
    const d = new Date(form.delivery_date + "T00:00:00");
    d.setMonth(d.getMonth() + item.effective_life_months);
    setForm(f => ({ ...f, expiry_date: d.toISOString().slice(0, 10) }));
  }, [form.epp_catalog_id, form.delivery_date]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.worker_id)      return Swal.fire({ icon: "warning", title: "Selecciona el trabajador", confirmButtonColor: "#16a34a" });
    if (!form.epp_catalog_id) return Swal.fire({ icon: "warning", title: "Selecciona el EPP", confirmButtonColor: "#16a34a" });
    if (!form.delivery_date)  return Swal.fire({ icon: "warning", title: "Ingresa la fecha de entrega", confirmButtonColor: "#16a34a" });

    setSaving(true);
    try {
      await eppService.createDelivery(companyId, form.worker_id, {
        epp_catalog_id: Number(form.epp_catalog_id),
        delivery_date:  form.delivery_date,
        expiry_date:    form.expiry_date   || null,
        quantity:       Number(form.quantity) || 1,
        size:           form.size          || null,
        serial_number:  form.serial_number || null,
        notes:          form.notes         || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al registrar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally { setSaving(false); }
  };

  const selectedItem = catalog.find(c => String(c.id) === String(form.epp_catalog_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">Registrar entrega de EPP</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Trabajador */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Trabajador <span className="text-red-500">*</span>
            </label>
            <select value={form.worker_id} onChange={e => set("worker_id", e.target.value)}
              className={inputCls}>
              <option value="">— Seleccionar trabajador —</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.full_name} · {w.doc_number}
                  {w.job_position_name ? ` · ${w.job_position_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de EPP → Ítem */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tipo de EPP
              </label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className={inputCls}>
                <option value="">— Todos —</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ""}{t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                EPP / Ítem <span className="text-red-500">*</span>
              </label>
              <select value={form.epp_catalog_id}
                onChange={e => set("epp_catalog_id", e.target.value)}
                className={inputCls}>
                <option value="">— Seleccionar —</option>
                {filteredCatalog.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.brand ? ` · ${c.brand}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info del ítem seleccionado */}
          {selectedItem && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-700">
              {selectedItem.technical_spec && <p>📋 {selectedItem.technical_spec}</p>}
              {selectedItem.effective_life_months && (
                <p>⏱ Vida útil: {selectedItem.effective_life_months} meses</p>
              )}
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha de entrega <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.delivery_date}
                onChange={e => set("delivery_date", e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha de reposición
                <span className="text-gray-400 font-normal"> (auto si hay vida útil)</span>
              </label>
              <input type="date" value={form.expiry_date}
                onChange={e => set("expiry_date", e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Cantidad, Talla, Serie */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
              <input type="number" min={1} value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Talla</label>
              <input value={form.size} onChange={e => set("size", e.target.value)}
                placeholder="M, L, 42..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">N° Serie</label>
              <input value={form.serial_number}
                onChange={e => set("serial_number", e.target.value)}
                placeholder="Opcional" className={inputCls} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={2} placeholder="Condiciones, aclaraciones..."
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving
              ? <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </span>
              : "Registrar entrega"
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EppDeliveryModal;
