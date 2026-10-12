import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  ChevronDown, ChevronRight, Hash, Pencil, Plus,
  RefreshCw, RefreshCcw, Trash2,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import sequenceService from "../services/sequence.service";
import api from "../services/api";

// ── Constantes ────────────────────────────────────────────────────────────────

const RESET_LABELS = {
  NEVER:   "Nunca reinicia",
  YEARLY:  "Anual",
  MONTHLY: "Mensual",
};

const TEMPLATE_EXAMPLES = [
  { label: "Inspecciones por empresa y tipo", value: "{company}-{inspection_type}-{number:03}" },
  { label: "Factura anual",                   value: "FAC-{year}-{number:06}" },
  { label: "Empleados global",                value: "EMP-{number:05}" },
  { label: "Órdenes de trabajo por sucursal", value: "OT-{branch}-{year}-{number:04}" },
];

const EMPTY_FORM = {
  name: "", code: "", template: "", padding: 4,
  increment: 1, reset_policy: "NEVER", description: "", is_active: true,
};

// ── Modal de crear / editar SequenceDef ───────────────────────────────────────

function SequenceModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing
      ? { ...EMPTY_FORM, ...editing }
      : EMPTY_FORM
    );
  }, [editing, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.template.trim()) {
      Swal.fire({ icon: "warning", title: "Completa los campos requeridos",
        confirmButtonColor: "#16a34a" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await sequenceService.updateSequence(editing.id, {
          name: form.name, template: form.template, padding: Number(form.padding),
          increment: Number(form.increment), reset_policy: form.reset_policy,
          is_active: form.is_active, description: form.description,
        });
      } else {
        await sequenceService.createSequence({
          name: form.name,
          code: form.code,
          template: form.template,
          padding: Number(form.padding),
          increment: Number(form.increment),
          reset_policy: form.reset_policy,
          is_active: true,
          description: form.description || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo guardar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900 text-lg">
            {editing ? "Editar secuencia" : "Nueva secuencia"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Nombre *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none"
                placeholder="Inspecciones por empresa" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Código (único) *</label>
              <input value={form.code} onChange={e => set("code", e.target.value.toLowerCase().replace(/ /g,"_"))}
                disabled={!!editing}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="inspection" />
              {editing && <p className="text-xs text-gray-400 mt-1">El código no puede editarse.</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Política de reset</label>
              <select value={form.reset_policy} onChange={e => set("reset_policy", e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none">
                <option value="NEVER">Nunca reinicia</option>
                <option value="YEARLY">Anual</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-medium text-gray-700">Template *</label>
            <input value={form.template} onChange={e => set("template", e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:border-green-500 outline-none"
              placeholder="{company}-{inspection_type}-{number:03}" />
            <p className="text-xs text-gray-400 mt-1">
              Usa <code className="bg-gray-100 px-1 rounded">{"{number}"}</code> para el consecutivo.
              Agrega <code className="bg-gray-100 px-1 rounded">{"{year}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{month}"}</code> u otras variables del context.
            </p>
            {/* Ejemplos */}
            <div className="mt-2 flex flex-wrap gap-1">
              {TEMPLATE_EXAMPLES.map(ex => (
                <button key={ex.value} onClick={() => set("template", ex.value)}
                  className="text-[11px] bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-500 px-2 py-0.5 rounded-full transition">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Padding por defecto</label>
              <input type="number" min={1} max={10} value={form.padding}
                onChange={e => set("padding", e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Ancho de {"{number}"} si no se especifica en el template.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Incremento</label>
              <input type="number" min={1} value={form.increment}
                onChange={e => set("increment", e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea value={form.description || ""} onChange={e => set("description", e.target.value)}
              rows={2}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none resize-none"
              placeholder="Descripción opcional..." />
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={form.is_active ?? true}
                onChange={e => set("is_active", e.target.checked)}
                className="accent-green-600" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Activa</label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear secuencia"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Fila expandible con contadores ────────────────────────────────────────────

function SequenceRow({ seq, onEdit, onDelete, onResetCounter }) {
  const [expanded, setExpanded] = useState(false);
  const [counters, setCounters] = useState([]);
  const [loadingCounters, setLoadingCounters] = useState(false);

  const toggle = async () => {
    if (!expanded && counters.length === 0) {
      setLoadingCounters(true);
      try {
        const data = await sequenceService.getCounters(seq.id);
        setCounters(data);
      } catch { /* silencioso */ }
      finally { setLoadingCounters(false); }
    }
    setExpanded(e => !e);
  };

  const handleReset = async (counter) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "¿Reiniciar contador?",
      html: `El contador <b>${counter.scope_key}</b> volverá a <b>0</b>.`,
      showCancelButton: true,
      confirmButtonText: "Reiniciar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      const updated = await onResetCounter(seq.id, counter.id);
      setCounters(cs => cs.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo reiniciar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    }
  };

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition-colors">
        {/* Expand toggle */}
        <td className="px-4 py-3 w-8">
          <button onClick={toggle} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-2 py-3">
          <p className="font-medium text-gray-900 text-sm">{seq.name}</p>
          {seq.description && <p className="text-xs text-gray-400 mt-0.5">{seq.description}</p>}
        </td>
        <td className="px-2 py-3">
          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{seq.code}</code>
        </td>
        <td className="px-2 py-3">
          <code className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{seq.template}</code>
        </td>
        <td className="px-2 py-3 text-xs text-gray-500">{RESET_LABELS[seq.reset_policy]}</td>
        <td className="px-2 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            seq.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
          }`}>
            {seq.is_active ? "Activa" : "Inactiva"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button onClick={() => onEdit(seq)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(seq)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Contadores expandidos */}
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-8 py-3 border-b">
            {loadingCounters ? (
              <p className="text-xs text-gray-400">Cargando contadores…</p>
            ) : counters.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Sin contadores aún — se crean automáticamente al generar el primer código.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Contadores activos
                </p>
                {counters.map(c => (
                  <div key={c.id}
                    className="flex items-center justify-between bg-white border rounded-lg px-4 py-2">
                    <div className="flex items-center gap-4">
                      <code className="text-xs text-gray-600">{c.scope_key}</code>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-sm font-bold text-gray-800">{c.current_value}</span>
                      {c.reset_at && (
                        <span className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          período: {c.reset_at}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleReset(c)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition"
                      title="Reiniciar a 0">
                      <RefreshCw className="w-3 h-3" /> Reiniciar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export const SequencePage = () => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await sequenceService.getSequences();
      setSequences(data);
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudieron cargar las secuencias",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (seq) => { setEditing(seq); setModalOpen(true); };

  const handleDelete = async (seq) => {
    const r = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar "${seq.name}"?`,
      text: "Se eliminarán también todos sus contadores.",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      await sequenceService.deleteSequence(seq.id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo eliminar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    }
  };

  const handleResetCounter = async (seqId, counterId) => {
    return sequenceService.resetCounter(seqId, counterId);
  };

  const handleSync = async () => {
    const r = await Swal.fire({
      icon: "question",
      title: "Sincronizar secuencias",
      text: "Crea automáticamente las secuencias faltantes para todos los tipos de inspección que tengan código definido.",
      showCancelButton: true,
      confirmButtonText: "Sincronizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await api.post("/api/v1/inspection-types/sync-sequences");
      const { creados, ya_existian } = res.data;
      await Swal.fire({
        icon: "success",
        title: "Sincronización completada",
        html: `
          <p><strong>${creados.length}</strong> secuencia(s) creada(s)</p>
          ${creados.map(c => `<p style="font-size:13px;color:#666">${c.code} → ${c.type} (${c.type_code})</p>`).join("")}
          <p style="margin-top:8px;font-size:12px;color:#aaa">${ya_existian.length} ya existían</p>
        `,
        confirmButtonColor: "#16a34a",
      });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al sincronizar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Motor de Secuencias</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define plantillas de códigos reutilizables para inspecciones, facturas, empleados y más.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
            <RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar tipos
          </Button>
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva secuencia
          </Button>
        </div>
      </div>

      {/* Banner super-admin */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
        <span className="text-lg">🛡️</span>
        <p className="text-sm text-amber-700">
          Este módulo es exclusivo del <strong>super admin de plataforma</strong>.
          Los cambios afectan a todos los módulos que usen estas secuencias.
        </p>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Hash className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No hay secuencias configuradas</p>
          <p className="text-sm text-gray-300 mt-1">Crea la primera para empezar a generar códigos.</p>
          <Button onClick={openCreate} className="mt-5 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Crear secuencia
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 w-8" />
                <th className="px-2 py-3 text-left">Nombre</th>
                <th className="px-2 py-3 text-left">Código</th>
                <th className="px-2 py-3 text-left">Template</th>
                <th className="px-2 py-3 text-left">Reset</th>
                <th className="px-2 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map(seq => (
                <SequenceRow
                  key={seq.id}
                  seq={seq}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onResetCounter={handleResetCounter}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SequenceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default SequencePage;