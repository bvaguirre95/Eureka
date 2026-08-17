import React, { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, Download, Plus, Trash2
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import inspectionService from "../services/inspection.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  borrador:   { label: "Borrador",   cls: "bg-gray-100 text-gray-600" },
  en_proceso: { label: "En proceso", cls: "bg-blue-100 text-blue-700" },
  completada: { label: "Completada", cls: "bg-green-100 text-green-700" },
  cerrada:    { label: "Cerrada",    cls: "bg-emerald-100 text-emerald-700" },
};

const ACTION_STATUS = {
  pendiente:   { label: "Pendiente",   cls: "bg-amber-100 text-amber-700" },
  en_progreso: { label: "En progreso", cls: "bg-blue-100  text-blue-700" },
  completada:  { label: "Completada",  cls: "bg-green-100 text-green-700" },
  vencida:     { label: "Vencida",     cls: "bg-red-100   text-red-700" },
};

// ── FieldInput ────────────────────────────────────────────────────────────────

const FieldInput = ({ field, value, onChange, disabled }) => {
  const base = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 bg-white";

  if (field.field_type === "check_sn") {
    return (
      <div className="flex gap-2">
        {["S", "N"].map(opt => (
          <button key={opt} type="button" disabled={disabled}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all
              ${value === opt
                ? opt === "S" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                : "border-gray-200 text-gray-500 hover:border-gray-300"}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            {opt === "S" ? "✔ Sí" : "✘ No"}
          </button>
        ))}
      </div>
    );
  }

  if (field.field_type === "check_bm") {
    return (
      <div className="flex gap-2">
        {["B", "M"].map(opt => (
          <button key={opt} type="button" disabled={disabled}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all
              ${value === opt
                ? opt === "B" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                : "border-gray-200 text-gray-500 hover:border-gray-300"}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            {opt === "B" ? "✔ Bueno" : "✗ Malo"}
          </button>
        ))}
      </div>
    );
  }

  if (field.field_type === "seleccion") {
    const opts = (field.options || "").split("|").filter(Boolean);
    return (
      <select value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled} className={base}>
        <option value="">— Selecciona —</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.field_type === "observacion") {
    return (
      <textarea value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
        rows={2} placeholder="Observaciones..." className={`${base} resize-none`} />
    );
  }

  if (field.field_type === "fecha") {
    return <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled} className={base} />;
  }

  if (field.field_type === "numero") {
    return <input type="number" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="0" className={base} />;
  }

  // Campo de auto-secuencia — solo lectura, se generó automáticamente
  if ((field.options || "").startsWith("__seq__:")) {
    return (
      <div className="flex items-center gap-2">
        <input type="text" value={value || ""} readOnly
          className={`${base} bg-violet-50 border-violet-200 text-violet-800 font-mono font-semibold cursor-default`} />
        <span className="text-[10px] text-violet-500 whitespace-nowrap flex-shrink-0 flex items-center gap-0.5">
          ⚡ Auto
        </span>
      </div>
    );
  }

  return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
      placeholder={field.name} className={base} />
  );
};

// ── MiniActionForm — formulario de acción dentro del RecordCard ───────────────

const MiniActionForm = ({ recordId, recordIndex, onSave, onCancel }) => {
  const [form, setForm] = useState({
    description: "", action: "", priority: "C",
    responsible_name: "", due_date_start: "", due_date_end: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await onSave({
        record_id: recordId,
        item_ref: `Registro ${recordIndex}`,
        description: form.description,
        action: form.action || null,
        priority: form.priority,
        responsible_name: form.responsible_name || null,
        due_date_start: form.due_date_start || null,
        due_date_end: form.due_date_end || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" /> Registrar hallazgo — Registro {recordIndex}
      </p>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Descripción del hallazgo *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          rows={2} placeholder="Describe el problema encontrado..." required
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white resize-none" />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Acción a seguir</label>
        <input value={form.action} onChange={e => set("action", e.target.value)}
          placeholder="Ej: Recargar extintor, colocar señalética..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Clase</label>
          <select value={form.priority} onChange={e => set("priority", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white">
            <option value="A">A — Inmediata</option>
            <option value="B">B — Pronta</option>
            <option value="C">C — Programada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Responsable</label>
          <input value={form.responsible_name} onChange={e => set("responsible_name", e.target.value)}
            placeholder="Nombre del responsable"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
          <input type="date" value={form.due_date_start} onChange={e => set("due_date_start", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Fecha límite</label>
          <input type="date" value={form.due_date_end} onChange={e => set("due_date_end", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs">Cancelar</Button>
        <Button type="submit" disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-white text-xs disabled:opacity-60">
          {saving ? "Guardando..." : "Registrar hallazgo"}
        </Button>
      </div>
    </form>
  );
};


// ── GeneralDataSection ────────────────────────────────────────────────────────
// Sección de datos generales para structure_type = formulario | formulario_matriz

const GeneralDataSection = ({ fields, values, onChange, disabled }) => {
  if (!fields || fields.length === 0) return null;

  const groups = {};
  fields.forEach(f => {
    const g = f.group_name || "";
    groups[g] = groups[g] || [];
    groups[g].push(f);
  });

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden mb-5">
      <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100">
        <p className="text-sm font-bold text-blue-800">Datos generales</p>
        <p className="text-xs text-blue-500 mt-0.5">Información de cabecera de la inspección</p>
      </div>
      <div className="px-5 py-4 space-y-4">
        {Object.entries(groups).map(([groupName, groupFields]) => (
          <div key={groupName}>
            {groupName && (
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-1">
                {groupName}
              </p>
            )}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {groupFields.map(field => (
                <div key={field.id} className={field.field_type === "observacion" ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {field.name}
                    {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <FieldInput
                    field={field}
                    value={values[field.field_key] || ""}
                    onChange={(val) => onChange(field.field_key, val)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── RecordCard ────────────────────────────────────────────────────────────────

const RecordCard = ({ record, fields, index, onUpdate, onDelete, onPhotoChange,
                      onAddAction, companyId, inspectionId, disabled, existingActions }) => {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState({});
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);
  const [showActionForm, setShowActionForm] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    const v = {};
    record.values.forEach(val => { v[val.field_id] = val.value || ""; });
    setValues(v);
  }, [record]);

  const handleChange = (fieldId, value) => {
    const next = { ...values, [fieldId]: value };
    setValues(next);
    const hasFinding = fields.some(f => {
      if (f.field_type === "check_sn") return next[f.id] === "N";
      if (f.field_type === "check_bm") return next[f.id] === "M";
      return false;
    });
    onUpdate(record.id, next, hasFinding);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onPhotoChange(record.id, file);
      setPhotoKey(k => k + 1);
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    setUploading(true);
    try {
      await onPhotoChange(record.id, null);
      setPhotoKey(k => k + 1);
    } finally { setUploading(false); }
  };

  const groups = {};
  fields.filter(f => f.field_type !== "foto").forEach(f => {
    const g = f.group_name || "";
    groups[g] = groups[g] || [];
    groups[g].push(f);
  });

  const hasFinding = record.has_finding;
  const photoUrl = `/api/v1/companies/${companyId}/inspections/${inspectionId}/records/${record.id}/photo?t=${photoKey}`;

  // Acciones ya registradas para este registro
  const myActions = existingActions.filter(a =>
    a.record_id === record.id || a.item_ref === `Registro ${index}`
  );

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all
      ${hasFinding ? "border-amber-200 bg-amber-50/20" : "border-gray-100 bg-white"}`}>

      {/* Cabecera */}
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
            ${hasFinding ? "bg-amber-500 text-white" : "bg-green-100 text-green-700"}`}>
            {index}
          </span>
          <span className="font-semibold text-gray-900 text-sm">
            Registro {index}
            {hasFinding && <span className="ml-2 text-xs text-amber-600 font-normal">⚠ Con hallazgo</span>}
            {myActions.length > 0 && (
              <span className="ml-2 text-xs text-blue-500 font-normal">
                {myActions.length} acción{myActions.length > 1 ? "es" : ""} registrada{myActions.length > 1 ? "s" : ""}
              </span>
            )}
            {record.has_photo && <span className="ml-2 text-xs text-blue-500 font-normal">📷 Con foto</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!disabled && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Foto */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">📷 Foto del ítem</p>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {record.has_photo ? (
                  <div className="relative">
                    <img key={photoKey} src={photoUrl} alt="Foto registro"
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                      onError={(e) => { e.target.style.display = "none"; }} />
                    {!disabled && (
                      <button type="button" onClick={handlePhotoDelete} disabled={uploading}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow">
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-white rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-300 gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-[10px]">Sin foto</span>
                  </div>
                )}
              </div>
              {!disabled && (
                <div className="flex flex-col gap-2">
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
                    className="hidden" onChange={handlePhotoSelect} />
                  <button type="button" disabled={uploading} onClick={() => photoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border-2 border-green-200 bg-green-50 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {uploading ? <>⏳ Subiendo...</> : record.has_photo ? <>📷 Cambiar foto</> : <>📷 Tomar / subir foto</>}
                  </button>
                  <p className="text-[10px] text-gray-400">Desde cámara o galería · máx. 10 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Campos */}
          {Object.entries(groups).map(([groupName, groupFields]) => (
            <div key={groupName}>
              {groupName && (
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-1">
                  {groupName}
                </p>
              )}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {groupFields.map(field => (
                  <div key={field.id} className={field.field_type === "observacion" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {field.name}
                      {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <FieldInput field={field} value={values[field.id] || ""}
                      onChange={(val) => handleChange(field.id, val)} disabled={disabled} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Sección hallazgo — siempre visible cuando la inspección es editable */}
          {!disabled && (
            <div className="border-t border-gray-100 pt-4">
              {/* Acciones ya registradas para este registro */}
              {myActions.length > 0 && (
                <div className="mb-3 space-y-2">
                  {myActions.map(a => (
                    <div key={a.id} className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs flex items-start gap-2">
                      <span className={`mt-0.5 px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                        a.priority === "A" ? "bg-red-100 text-red-600" :
                        a.priority === "B" ? "bg-amber-100 text-amber-600" :
                        "bg-gray-100 text-gray-500"}`}>
                        {a.priority}
                      </span>
                      <div>
                        <p className="text-gray-700 font-medium">{a.description}</p>
                        {a.responsible_name && <p className="text-gray-400 mt-0.5">👤 {a.responsible_name}</p>}
                      </div>
                      <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_STATUS[a.status]?.cls || ""}`}>
                        {ACTION_STATUS[a.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!showActionForm ? (
                <button type="button" onClick={() => setShowActionForm(true)}
                  className={`w-full py-2.5 border-2 border-dashed rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5
                    ${hasFinding || myActions.length > 0
                      ? "border-amber-300 text-amber-600 hover:bg-amber-50"
                      : "border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600"}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {myActions.length > 0 ? "Agregar otra acción correctiva" : "Registrar hallazgo / acción correctiva"}
                </button>
              ) : (
                <MiniActionForm
                  recordId={record.id}
                  recordIndex={index}
                  onSave={async (data) => {
                    await onAddAction(data);
                    setShowActionForm(false);
                  }}
                  onCancel={() => setShowActionForm(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ActionsTab — solo listado y seguimiento ───────────────────────────────────

const ActionsTab = ({ actions, companyId, inspectionId, canEdit, onChanged }) => {
  const handleStatusChange = async (action, newStatus) => {
    try {
      await inspectionService.updateAction(companyId, inspectionId, action.id, { status: newStatus });
      onChanged();
    } catch { /**/ }
  };

  const handleDelete = async (actionId) => {
    const r = await Swal.fire({ icon: "warning", title: "¿Eliminar acción?",
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar" });
    if (!r.isConfirmed) return;
    try { await inspectionService.deleteAction(companyId, inspectionId, actionId); onChanged(); }
    catch { /**/ }
  };

  if (actions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Sin acciones correctivas.</p>
        <p className="text-xs text-gray-300 mt-1">
          Las acciones se crean desde cada registro cuando hay un hallazgo.
        </p>
      </div>
    );
  }

  // Agrupar por registro
  const byRecord = {};
  actions.forEach(a => {
    const key = a.item_ref || "General";
    byRecord[key] = byRecord[key] || [];
    byRecord[key].push(a);
  });

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",       value: actions.length,                                         cls: "text-gray-700" },
          { label: "Pendientes",  value: actions.filter(a => a.status === "pendiente").length,   cls: "text-amber-600" },
          { label: "En progreso", value: actions.filter(a => a.status === "en_progreso").length, cls: "text-blue-600" },
          { label: "Vencidas",    value: actions.filter(a => a.status === "vencida").length,     cls: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista agrupada por registro */}
      {Object.entries(byRecord).map(([itemRef, acts]) => (
        <div key={itemRef} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{itemRef}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {acts.map(action => {
              const st = ACTION_STATUS[action.status] || ACTION_STATUS.pendiente;
              const isVencida = action.status === "vencida";
              return (
                <div key={action.id} className={`px-4 py-3 ${isVencida ? "bg-red-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {action.priority && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            action.priority === "A" ? "bg-red-100 text-red-600" :
                            action.priority === "B" ? "bg-amber-100 text-amber-600" :
                            "bg-gray-100 text-gray-500"}`}>
                            Clase {action.priority}
                          </span>
                        )}
                        {isVencida && <span className="text-[10px] text-red-500 font-semibold">⚠ VENCIDA</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{action.description}</p>
                      {action.action && <p className="text-xs text-gray-500 mt-0.5">↳ {action.action}</p>}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                        {action.responsible_name && (
                          <span>👤 <strong className="text-gray-600">{action.responsible_name}</strong></span>
                        )}
                        {action.due_date_end && (
                          <span className={isVencida ? "text-red-500 font-semibold" : ""}>
                            📅 Hasta: {new Date(action.due_date_end).toLocaleDateString("es-EC")}
                          </span>
                        )}
                      </div>
                      {action.completion_notes && (
                        <p className="text-xs text-green-600 mt-1 italic">✓ {action.completion_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <select value={action.status}
                          onChange={e => handleStatusChange(action, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${st.cls}`}>
                          {Object.entries(ACTION_STATUS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(action.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

export const InspectionFormPage = () => {
  const { companyId, inspectionId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("inspections.create");

  const [insp, setInsp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("registros");
  const pendingUpdates = useRef({});
  const saveTimer = useRef(null);
  const generalSaveTimer = useRef(null);
  const [generalData, setGeneralData] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inspectionService.get(companyId, inspectionId);
      setInsp(data);
      setGeneralData(data.general_data || {});
    }
    catch { /**/ } finally { setLoading(false); }
  }, [companyId, inspectionId]);

  useEffect(() => { load(); }, [load]);

  const handleGeneralDataChange = (fieldKey, value) => {
    const next = { ...generalData, [fieldKey]: value };
    setGeneralData(next);
    // Guardar con debounce
    if (generalSaveTimer.current) clearTimeout(generalSaveTimer.current);
    generalSaveTimer.current = setTimeout(async () => {
      try {
        await inspectionService.update(companyId, inspectionId, { general_data: next });
      } catch { /**/ }
    }, 1000);
  };

  const scheduleSave = (recordId, values, hasFinding) => {
    pendingUpdates.current[recordId] = { values, hasFinding };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(), 1200);
  };

  const flushSave = async () => {
    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    try {
      for (const [recordId, { values, hasFinding }] of Object.entries(updates)) {
        const valuesList = Object.entries(values).map(([field_id, value]) => ({
          field_id: Number(field_id), value: value || null,
        }));
        await inspectionService.updateRecord(companyId, inspectionId, recordId, {
          order: 0, has_finding: hasFinding, values: valuesList,
        });
      }
      const updated = await inspectionService.get(companyId, inspectionId);
      setInsp(updated);
    } catch { /**/ } finally { setSaving(false); }
  };

  const handleAddRecord = async () => {
    const recordCount = (insp?.records || []).length;
    const nextN       = recordCount + 1;
    const SEQ_MARKER  = "__seq__:";

    // Para campos con auto-secuencia, calcular el valor automático
    const autoValues = (insp?.inspection_type_fields || []).map(f => {
      const opts = f.options || "";
      if (opts.startsWith(SEQ_MARKER)) {
        const prefix = opts.slice(SEQ_MARKER.length);
        const value  = prefix
          .replace(/\{n:0(\d)d\}/g, (_, digits) => String(nextN).padStart(Number(digits), "0"))
          .replace(/\{n\}/g, String(nextN));
        return { field_id: f.id, value };
      }
      return { field_id: f.id, value: null };
    });

    try {
      const updated = await inspectionService.addRecord(companyId, inspectionId, {
        order: nextN, has_finding: false, values: autoValues,
      });
      setInsp(updated);
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo agregar el registro",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  const handleDeleteRecord = async (recordId) => {
    const r = await Swal.fire({ icon: "warning", title: "¿Eliminar registro?", showCancelButton: true,
      confirmButtonText: "Eliminar", confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar" });
    if (!r.isConfirmed) return;
    try { setInsp(await inspectionService.deleteRecord(companyId, inspectionId, recordId)); }
    catch (err) { Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" }); }
  };

  const handlePhotoChange = async (recordId, file) => {
    try {
      if (file === null) {
        await inspectionService.deleteRecordPhoto(companyId, inspectionId, recordId);
      } else {
        await inspectionService.uploadRecordPhoto(companyId, inspectionId, recordId, file);
      }
      setInsp(await inspectionService.get(companyId, inspectionId));
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error con la foto",
        text: err.response?.data?.detail || "Intenta nuevamente", confirmButtonColor: "#16a34a" });
    }
  };

  const handleAddAction = async (data) => {
    await flushSave();
    try {
      await inspectionService.createAction(companyId, inspectionId, data);
      setInsp(await inspectionService.get(companyId, inspectionId));
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo registrar la acción",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
      throw err;
    }
  };

  const handleComplete = async () => {
    await flushSave();
    const r = await Swal.fire({
      icon: "question", title: "¿Marcar como completada?",
      text: "Los registros quedarán bloqueados. Podrás cambiar el estado de las acciones correctivas y cerrar la inspección cuando estén resueltas.",
      showCancelButton: true, confirmButtonText: "Completar",
      confirmButtonColor: "#16a34a", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try {
      await inspectionService.update(companyId, inspectionId, { status: "completada" });
      await load();
      Swal.fire({ icon: "success", title: "Inspección completada", timer: 1500, showConfirmButton: false });
    } catch { /**/ }
  };

  const handleClose = async () => {
    const r = await Swal.fire({
      icon: "question", title: "¿Cerrar inspección definitivamente?",
      text: "Solo puedes cerrarla si todas las acciones correctivas están completadas. Esta acción no se puede deshacer.",
      showCancelButton: true, confirmButtonText: "Cerrar inspección",
      confirmButtonColor: "#1f3864", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try {
      await inspectionService.closeInspection(companyId, inspectionId);
      await load();
      Swal.fire({ icon: "success", title: "Inspección cerrada", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "warning", title: "No se puede cerrar",
        text: err.response?.data?.detail || "Completa todas las acciones correctivas primero.",
        confirmButtonColor: "#16a34a" });
    }
  };

  if (loading || !insp) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    </DashboardLayout>
  );

  const st = STATUS_CONFIG[insp.status] || STATUS_CONFIG.borrador;
  const isEditable = canEdit && ["borrador", "en_proceso"].includes(insp.status);
  const pct = insp.compliance_percent;
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <DashboardLayout>
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}/inspecciones`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Inspecciones
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl flex-shrink-0">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Inspección de {insp.inspection_type_name}
                </h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                {saving && <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {insp.inspection_number ? `N° ${insp.inspection_number} · ` : ""}
                {insp.location || "Sin ubicación"}{" "}
                {insp.scheduled_date && `· ${new Date(insp.scheduled_date).toLocaleDateString("es-EC")}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isEditable && (
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completar
              </Button>
            )}
            {canEdit && insp.status === "completada" && (
              <Button onClick={handleClose} className="bg-blue-900 hover:bg-blue-950 text-white text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Cerrar inspección
              </Button>
            )}
            {/* Botones PDF — adaptados al structure_type, con fallback a "matriz" */}
            {(() => {
              const st = insp.structure_type || "matriz";
              const nombre = insp.inspection_type_name.replace(/ /g,"_");
              const num    = insp.inspection_number || inspectionId;
              const dl = (doc, label) => inspectionService.downloadPdf(
                companyId, inspectionId,
                `${doc === "matriz" ? "Matriz" : "Informe"}_${nombre}_N${num}.pdf`,
                doc
              );
              if (st === "formulario") return (
                <Button onClick={() => dl("ambos","PDF")} variant="outline" className="text-sm">
                  <Download className="w-4 h-4 mr-1.5" /> Descargar PDF
                </Button>
              );
              if (st === "formulario_matriz") return (
                <>
                  <Button onClick={() => dl("informe","Informe")} variant="outline" className="text-sm">
                    <Download className="w-4 h-4 mr-1.5" /> Informe
                  </Button>
                  <Button onClick={() => dl("matriz","Matriz")} variant="outline" className="text-sm">
                    <Download className="w-4 h-4 mr-1.5" /> Matriz
                  </Button>
                </>
              );
              // matriz (o NULL legacy)
              return (
                <Button onClick={() => dl("ambos","PDF")} variant="outline" className="text-sm">
                  <Download className="w-4 h-4 mr-1.5" /> Descargar PDF
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Registros",      value: insp.total_records,           color: "text-blue-600" },
            { label: "Con hallazgos",  value: insp.records_with_findings,   color: "text-amber-600" },
            { label: "Acc. abiertas",  value: insp.open_actions,            color: "text-red-600" },
            { label: "Cumplimiento",   value: `${pct}%`,
              color: pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600" },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-sm font-bold w-12 text-right
            ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Alerta si hay acciones vencidas */}
      {insp.actions.some(a => a.status === "vencida") && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Hay <strong>{insp.actions.filter(a => a.status === "vencida").length}</strong> acción(es) correctiva(s) vencida(s).
          </p>
          <button onClick={() => setActiveTab("acciones")}
            className="ml-auto text-xs text-red-600 underline">Ver</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {[
          { id: "registros", label: `Registros (${insp.total_records})` },
          { id: "acciones",  label: `Acciones correctivas (${insp.actions.length})`,
            alert: insp.actions.some(a => ["pendiente","en_progreso","vencida"].includes(a.status)) },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
              ${activeTab === tab.id ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
            {tab.alert && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* Tab: Registros */}
      {activeTab === "registros" && (
        <div className="space-y-4">

          {/* ── Datos generales (formulario | formulario_matriz) ── */}
          {(insp.structure_type === "formulario" || insp.structure_type === "formulario_matriz") && (
            <GeneralDataSection
              fields={(insp.inspection_type_fields || []).filter(f => f.scope === "general")}
              values={generalData}
              onChange={handleGeneralDataChange}
              disabled={!isEditable}
            />
          )}

          {/* ── Modo FORMULARIO: un único registro implícito ── */}
          {insp.structure_type === "formulario" && (
            <>
              {insp.records.length === 0 && isEditable && (
                <div className="text-center py-4">
                  <button onClick={handleAddRecord}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    Iniciar formulario
                  </button>
                </div>
              )}
              {insp.records.map((record) => (
                <div key={record.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                    Respuestas del formulario
                  </p>
                  {(() => {
                    const matrizFields = (insp.inspection_type_fields || []).filter(f => f.scope !== "general");
                    const vals = {};
                    record.values.forEach(v => { vals[v.field_id] = v.value || ""; });
                    const groups = {};
                    matrizFields.forEach(f => {
                      const g = f.group_name || "";
                      groups[g] = groups[g] || [];
                      groups[g].push(f);
                    });
                    return Object.entries(groups).map(([groupName, groupFields]) => (
                      <div key={groupName} className="mb-4">
                        {groupName && (
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-1">
                            {groupName}
                          </p>
                        )}
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {groupFields.map(field => (
                            <div key={field.id} className={field.field_type === "observacion" ? "sm:col-span-2" : ""}>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                {field.name}
                                {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                              </label>
                              <FieldInput
                                field={field}
                                value={vals[field.id] || ""}
                                onChange={(val) => {
                                  const next = { ...vals, [field.id]: val };
                                  const hasFinding = matrizFields.some(f => {
                                    if (f.field_type === "check_sn") return next[f.id] === "N";
                                    if (f.field_type === "check_bm") return next[f.id] === "M";
                                    if (f.field_type === "check_sna") return next[f.id] === "N";
                                    return false;
                                  });
                                  scheduleSave(record.id, next, hasFinding);
                                }}
                                disabled={!isEditable}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ))}
            </>
          )}

          {/* ── Modo MATRIZ y FORMULARIO+MATRIZ: múltiples registros ── */}
          {(insp.structure_type === "matriz" || insp.structure_type === "formulario_matriz") && (
            <>
              {insp.records.length === 0 && !isEditable && (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <p className="text-gray-400">Sin registros en esta inspección.</p>
                </div>
              )}

              {insp.records.map((record, idx) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  fields={(insp.inspection_type_fields || []).filter(f => f.scope !== "general")}
                  index={idx + 1}
                  onUpdate={(id, vals, finding) => scheduleSave(id, vals, finding)}
                  onDelete={handleDeleteRecord}
                  onPhotoChange={handlePhotoChange}
                  onAddAction={handleAddAction}
                  companyId={companyId}
                  inspectionId={inspectionId}
                  disabled={!isEditable}
                  existingActions={insp.actions}
                />
              ))}

              {isEditable && (
                <button onClick={handleAddRecord}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  {insp.structure_type === "formulario_matriz" ? "Agregar ítem" : "Agregar registro"}
                </button>
              )}
            </>
          )}

        </div>
      )}

      {/* Tab: Acciones correctivas */}
      {activeTab === "acciones" && (
        <ActionsTab
          actions={insp.actions}
          companyId={companyId}
          inspectionId={inspectionId}
          canEdit={canEdit}
          onChanged={load}
        />
      )}
    </DashboardLayout>
  );
};

export default InspectionFormPage;