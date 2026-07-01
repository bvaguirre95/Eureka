import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

const FIELD_TYPES = [
  { value: "texto",       label: "Texto libre" },
  { value: "numero",      label: "Número" },
  { value: "fecha",       label: "Fecha" },
  { value: "seleccion",   label: "Selección (dropdown)" },
  { value: "check_sn",    label: "Sí / No" },
  { value: "check_bm",    label: "Bueno / Malo" },
  { value: "ubicacion",   label: "Ubicación" },
  { value: "observacion", label: "Observación" },
  { value: "foto",        label: "Foto" },
];

const PERIODICITIES = [
  { value: "diario",     label: "Diario" },
  { value: "semanal",    label: "Semanal" },
  { value: "mensual",    label: "Mensual" },
  { value: "bimestral",  label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral",  label: "Semestral" },
  { value: "anual",      label: "Anual" },
];

const slugify = (str) => str.toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const emptyField = (order) => ({
  name: "", field_key: "", field_type: "texto",
  options: "", is_required: false, order, group_name: "",
});

export const InspectionTypeFormModal = ({ open, onClose, typeData, orgId, onSaved }) => {
  const [form, setForm] = useState({
    name: "", description: "", periodicity: "mensual",
    pdf_template: "generico", nomenclatura: "",
  });
  const [fields, setFields]       = useState([emptyField(0)]);
  const [templates, setTemplates] = useState([{ key: "generico", label: "Genérico" }]);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!typeData;

  useEffect(() => {
    inspectionService.getTemplates?.()
      .then(data => { if (data?.length) setTemplates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeData) {
      setForm({
        name:         typeData.name,
        description:  typeData.description  || "",
        periodicity:  typeData.periodicity  || "mensual",
        pdf_template: typeData.pdf_template || "generico",
        nomenclatura: typeData.nomenclatura || "",
      });
      setFields(typeData.fields.length > 0
        ? typeData.fields.map(f => ({
            name: f.name, field_key: f.field_key, field_type: f.field_type,
            options: f.options || "", is_required: f.is_required,
            order: f.order, group_name: f.group_name || "",
          }))
        : [emptyField(0)]);
    } else {
      setForm({ name: "", description: "", periodicity: "mensual",
                pdf_template: "generico", nomenclatura: "" });
      setFields([emptyField(0)]);
    }
  }, [open, typeData]);

  const addField    = () => setFields(f => [...f, emptyField(f.length)]);
  const removeField = (i) => setFields(f => f.filter((_, idx) => idx !== i));
  const updateField = (i, key, value) => {
    setFields(f => {
      const next = [...f];
      next[i] = { ...next[i], [key]: value };
      if (key === "name" && !typeData) next[i].field_key = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        nomenclatura: form.nomenclatura.trim().toUpperCase() || null,
        fields: fields.filter(f => f.name.trim()).map((f, idx) => ({
          ...f,
          field_key: f.field_key || slugify(f.name),
          order: idx,
          options: f.field_type === "seleccion" ? f.options : null,
        })),
      };
      if (isEditing) await inspectionService.updateType(orgId, typeData.id, payload);
      else           await inspectionService.createType(orgId, payload);
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar tipo de inspección" : "Nuevo tipo de inspección"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
          {/* Datos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Nombre *
              </label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ej: Extintores, Baños, EPP..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Descripción
              </label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Breve descripción..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Periodicidad
              </label>
              <select value={form.periodicity} onChange={e => setForm({...form, periodicity: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none">
                {PERIODICITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Prefijo de numeración
              </label>
              <input
                value={form.nomenclatura}
                onChange={e => setForm({...form, nomenclatura: e.target.value.toUpperCase()})}
                placeholder="Ej: TIN-IEXT"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.nomenclatura
                  ? <>Genera: <strong className="text-green-600 font-mono">{form.nomenclatura}-001</strong>, {form.nomenclatura}-002...</>
                  : "Sin prefijo: 1, 2, 3..."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Formato PDF del informe
              </label>
              <select value={form.pdf_template} onChange={e => setForm({...form, pdf_template: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none">
                {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Campos */}
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Campos del formulario ({fields.length})
            </span>
            <button type="button" onClick={addField}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium">
              <Plus className="w-3.5 h-3.5" /> Agregar campo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {fields.map((field, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <input value={field.name} onChange={e => updateField(i, "name", e.target.value)}
                      placeholder="Nombre del campo *"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white" />
                  </div>
                  <div className="sm:col-span-3">
                    <select value={field.field_type} onChange={e => updateField(i, "field_type", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white">
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input value={field.group_name} onChange={e => updateField(i, "group_name", e.target.value)}
                      placeholder="Grupo (opcional)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white" />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={field.is_required}
                        onChange={e => updateField(i, "is_required", e.target.checked)}
                        className="w-3.5 h-3.5 accent-green-600" /> Req.
                    </label>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => removeField(i)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {field.field_type === "seleccion" && (
                  <div className="mt-2">
                    <input value={field.options} onChange={e => updateField(i, "options", e.target.value)}
                      placeholder="Opciones separadas por | (ej: CO2|PQS|AGUA)"
                      className="w-full px-3 py-2 rounded-lg border border-green-200 text-xs bg-green-50 focus:border-green-400 outline-none" />
                    <p className="text-[10px] text-gray-400 mt-1">Separa con |</p>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addField}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors">
              <Plus className="w-4 h-4 inline mr-1" /> Agregar campo
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting || !form.name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default InspectionTypeFormModal;
