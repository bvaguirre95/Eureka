import React, { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, Download, FileText, Plus, Save, Trash2
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

/** Renderiza el input correcto según el tipo de campo */
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
      <select value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={base}>
        <option value="">— Selecciona —</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.field_type === "observacion") {
    return (
      <textarea value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
        rows={2} placeholder="Observaciones..."
        className={`${base} resize-none`} />
    );
  }

  if (field.field_type === "fecha") {
    return <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled} className={base} />;
  }

  if (field.field_type === "numero") {
    return <input type="number" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="0" className={base} />;
  }

  return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
      placeholder={field.name} className={base} />
  );
};

// ── RecordCard: una fila del formulario de inspección ────────────────────────
const RecordCard = ({ record, fields, index, onUpdate, onDelete, onPhotoChange, companyId, inspectionId, disabled }) => {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState({});
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);
  const photoInputRef = useRef(null);

  useEffect(() => {
    const v = {};
    record.values.forEach(val => { v[val.field_id] = val.value || ""; });
    setValues(v);
  }, [record]);

  const handleChange = (fieldId, value) => {
    const next = { ...values, [fieldId]: value };
    setValues(next);
    const hasFindig = fields.some(f => {
      if (f.field_type === "check_sn") return next[f.id] === "N";
      if (f.field_type === "check_bm") return next[f.id] === "M";
      return false;
    });
    onUpdate(record.id, next, hasFindig);
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

  // Agrupar campos por group_name (excluir tipo foto)
  const groups = {};
  fields.filter(f => f.field_type !== "foto").forEach(f => {
    const g = f.group_name || "";
    groups[g] = groups[g] || [];
    groups[g].push(f);
  });

  const hasFindig = record.has_finding;
  const photoUrl = `/api/v1/companies/${companyId}/inspections/${inspectionId}/records/${record.id}/photo?t=${photoKey}`;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all
      ${hasFindig ? "border-red-200 bg-red-50/30" : "border-gray-100 bg-white"}`}>

      {/* Cabecera */}
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
            ${hasFindig ? "bg-red-500 text-white" : "bg-green-100 text-green-700"}`}>
            {index}
          </span>
          <span className="font-semibold text-gray-900 text-sm">
            Registro {index}
            {hasFindig && <span className="ml-2 text-xs text-red-500 font-normal">⚠ Con hallazgo</span>}
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

          {/* ── Sección de foto ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              📷 Foto del ítem
            </p>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {record.has_photo ? (
                  <div className="relative">
                    <img
                      key={photoKey}
                      src={photoUrl}
                      alt="Foto registro"
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    {!disabled && (
                      <button type="button" onClick={handlePhotoDelete}
                        disabled={uploading}
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

              {/* Botón subir */}
              {!disabled && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button type="button"
                    disabled={uploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border-2 border-green-200 bg-green-50 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {uploading ? (
                      <>⏳ Subiendo...</>
                    ) : record.has_photo ? (
                      <>📷 Cambiar foto</>
                    ) : (
                      <>📷 Tomar / subir foto</>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400">
                    Desde cámara o galería · máx. 10 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Campos del formulario ── */}
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
                      value={values[field.id] || ""}
                      onChange={(val) => handleChange(field.id, val)}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ActionsTab ────────────────────────────────────────────────────────────────
const ActionsTab = ({ actions, companyId, inspectionId, canEdit, onChanged }) => {
  const [form, setForm] = useState({ item_ref: "", description: "", action: "", priority: "C", due_date_start: "", due_date_end: "" });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await inspectionService.createAction(companyId, inspectionId, {
        ...form,
        due_date_start: form.due_date_start || null,
        due_date_end: form.due_date_end || null,
      });
      setForm({ item_ref: "", description: "", action: "", priority: "C", due_date_start: "", due_date_end: "" });
      setAdding(false);
      onChanged();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (action, newStatus) => {
    try {
      await inspectionService.updateAction(companyId, inspectionId, action.id, { status: newStatus });
      onChanged();
    } catch { /**/ }
  };

  const handleDelete = async (actionId) => {
    const r = await Swal.fire({ icon: "warning", title: "¿Eliminar acción?", showCancelButton: true,
      confirmButtonText: "Eliminar", confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar" });
    if (!r.isConfirmed) return;
    try { await inspectionService.deleteAction(companyId, inspectionId, actionId); onChanged(); }
    catch { /**/ }
  };

  return (
    <div className="space-y-4">
      {actions.length === 0 && !adding ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm mb-3">Sin acciones correctivas registradas.</p>
          {canEdit && (
            <Button variant="outline" onClick={() => setAdding(true)} className="text-sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar acción
            </Button>
          )}
        </div>
      ) : (
        <>
          {actions.map(action => {
            const st = ACTION_STATUS[action.status] || ACTION_STATUS.pendiente;
            return (
              <div key={action.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {action.item_ref && <p className="text-xs text-gray-400 mb-1">Ítem: {action.item_ref}</p>}
                    <p className="font-medium text-gray-900 text-sm">{action.description}</p>
                    {action.action && <p className="text-xs text-gray-500 mt-1">Acción: {action.action}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                      {action.priority && (
                        <span className={`px-2 py-0.5 rounded-full font-bold
                          ${action.priority === "A" ? "bg-red-100 text-red-600" : action.priority === "B" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                          Clase {action.priority}
                        </span>
                      )}
                      {action.responsible_name && <span>👤 {action.responsible_name}</span>}
                      {action.due_date_end && <span>📅 Hasta: {new Date(action.due_date_end).toLocaleDateString("es-EC")}</span>}
                    </div>
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

          {canEdit && !adding && (
            <button onClick={() => setAdding(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors">
              <Plus className="w-4 h-4 inline mr-1" /> Agregar acción correctiva
            </button>
          )}
        </>
      )}

      {adding && canEdit && (
        <form onSubmit={handleAdd} className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">Nueva acción correctiva</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ítem (ref.)</label>
              <input value={form.item_ref} onChange={e => setForm(p => ({...p, item_ref: e.target.value}))}
                placeholder="EXT-001" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Clase (prioridad)</label>
              <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
                <option value="A">A (Inmediata)</option>
                <option value="B">B (Pronto)</option>
                <option value="C">C (Programado)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Hallazgo / No conformidad *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              rows={2} placeholder="Describe el hallazgo..." required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Acción a seguir</label>
            <input value={form.action} onChange={e => setForm(p => ({...p, action: e.target.value}))}
              placeholder="Ej: Demarcar área 50x50 cm..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
              <input type="date" value={form.due_date_start} onChange={e => setForm(p => ({...p, due_date_start: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fecha terminación</label>
              <input type="date" value={form.due_date_end} onChange={e => setForm(p => ({...p, due_date_end: e.target.value}))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)} className="text-xs">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-60">
              {saving ? "Guardando..." : "Agregar"}
            </Button>
          </div>
        </form>
      )}
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

  const load = useCallback(async () => {
    setLoading(true);
    try { setInsp(await inspectionService.get(companyId, inspectionId)); }
    catch { /**/ } finally { setLoading(false); }
  }, [companyId, inspectionId]);

  useEffect(() => { load(); }, [load]);

  const scheduleSave = (recordId, values, hasFindig) => {
    pendingUpdates.current[recordId] = { values, hasFindig };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(), 1200);
  };

  const flushSave = async () => {
    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    try {
      for (const [recordId, { values, hasFindig }] of Object.entries(updates)) {
        const valuesList = Object.entries(values).map(([field_id, value]) => ({
          field_id: Number(field_id), value: value || null,
        }));
        await inspectionService.updateRecord(companyId, inspectionId, recordId, {
          order: 0, has_finding: hasFindig, values: valuesList,
        });
      }
      const updated = await inspectionService.get(companyId, inspectionId);
      setInsp(updated);
    } catch { /**/ } finally { setSaving(false); }
  };

  const handleAddRecord = async () => {
    const recordCount = (insp?.records || []).length;
    const emptyValues = (insp?.inspection_type_fields || []).map(f => ({ field_id: f.id, value: null }));
    try {
      const updated = await inspectionService.addRecord(companyId, inspectionId, {
        order: recordCount + 1, has_finding: false, values: emptyValues,
      });
      setInsp(updated);
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo agregar el registro", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
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
        // Eliminar foto
        await inspectionService.deleteRecordPhoto(companyId, inspectionId, recordId);
      } else {
        // Subir foto
        await inspectionService.uploadRecordPhoto(companyId, inspectionId, recordId, file);
      }
      const updated = await inspectionService.get(companyId, inspectionId);
      setInsp(updated);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error con la foto",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    }
  };

  const handleComplete = async () => {
    await flushSave();
    const r = await Swal.fire({
      icon: "question", title: "¿Marcar como completada?",
      text: "La inspección quedará cerrada. Podrás seguir viendo el informe y descargarlo.",
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
            <Button onClick={() => inspectionService.downloadPdf(companyId, inspectionId,
                `Matriz_${insp.inspection_type_name.replace(/ /g,"_")}_N${insp.inspection_number||inspectionId}.pdf`,
                "matriz")}
              variant="outline" className="text-sm">
              <Download className="w-4 h-4 mr-1.5" /> Matriz
            </Button>
            <Button onClick={() => inspectionService.downloadPdf(companyId, inspectionId,
                `Informe_${insp.inspection_type_name.replace(/ /g,"_")}_N${insp.inspection_number||inspectionId}.pdf`,
                "informe")}
              variant="outline" className="text-sm">
              <Download className="w-4 h-4 mr-1.5" /> Informe
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Registros", value: insp.total_records, color: "text-blue-600" },
            { label: "Con hallazgos", value: insp.records_with_findings, color: "text-red-600" },
            { label: "Acc. abiertas", value: insp.open_actions, color: "text-amber-600" },
            { label: "Cumplimiento", value: `${pct}%`, color: pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600" },
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
          <span className={`text-sm font-bold w-12 text-right ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {[
          { id: "registros", label: `Registros (${insp.total_records})` },
          { id: "acciones",  label: `Acciones correctivas (${insp.actions.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Registros */}
      {activeTab === "registros" && (
        <div className="space-y-4">
          {insp.records.length === 0 && !isEditable && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-gray-400">Sin registros en esta inspección.</p>
            </div>
          )}

          {insp.records.map((record, idx) => (
            <RecordCard
              key={record.id}
              record={record}
              fields={insp.inspection_type_fields}
              index={idx + 1}
              onUpdate={(id, vals, finding) => scheduleSave(id, vals, finding)}
              onDelete={handleDeleteRecord}
              onPhotoChange={handlePhotoChange}
              companyId={companyId}
              inspectionId={inspectionId}
              disabled={!isEditable}
            />
          ))}

          {isEditable && (
            <button onClick={handleAddRecord}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Agregar registro
            </button>
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
