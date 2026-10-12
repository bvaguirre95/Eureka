import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckSquare, ChevronLeft, ClipboardList, Globe, LayoutGrid, Plus,
  Settings2, Trash2, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

// ── Constantes ────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: "texto",       label: "Texto libre" },
  { value: "numero",      label: "Número" },
  { value: "fecha",       label: "Fecha" },
  { value: "seleccion",   label: "Selección (dropdown)" },
  { value: "check_sn",    label: "Sí / No" },
  { value: "check_sna",   label: "Sí / No / N/A" },
  { value: "check_bm",    label: "Bueno / Malo" },
  { value: "ubicacion",   label: "Ubicación" },
  { value: "observacion", label: "Observación" },
  { value: "foto",        label: "Foto" },
  { value: "firma",       label: "Firma" },
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

const STRUCTURES = [
  {
    value: "formulario",
    label: "Formulario / Checklist",
    icon: CheckSquare,
    color: "border-blue-400 bg-blue-50 text-blue-700",
    colorActive: "border-blue-500 bg-blue-50",
    desc: "Preguntas simples con una única respuesta por campo. Ideal para checklists de botiquín, EPP, condiciones generales.",
    example: "Ejemplo: ¿Está el botiquín señalizado? ✓ / ✗",
  },
  {
    value: "matriz",
    label: "Matriz",
    icon: LayoutGrid,
    color: "border-green-400 bg-green-50 text-green-700",
    colorActive: "border-green-500 bg-green-50",
    desc: "Múltiples ítems o filas, cada uno con los mismos campos. Ideal cuando se inspeccionan N elementos del mismo tipo.",
    example: "Ejemplo: Extintor 001, Extintor 002, Extintor 003...",
  },
  {
    value: "formulario_matriz",
    label: "Formulario + Matriz",
    icon: ClipboardList,
    color: "border-purple-400 bg-purple-50 text-purple-700",
    colorActive: "border-purple-500 bg-purple-50",
    desc: "Datos generales (fecha, área, inspector) más una tabla de ítems inspeccionados. La estructura más completa.",
    example: "Ejemplo: Datos de la visita + tabla de extintores inspeccionados",
  },
];

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const emptyField = (order, scope = "matriz") => ({
  name: "", field_key: "", field_type: "texto",
  options: "", is_required: false, order, group_name: "", scope,
  auto_sequence: false, seq_prefix: "",
});

// Helpers de auto-secuencia
// El prefijo se guarda en options como "__seq__:EXT-{n:03d}"
const SEQ_MARKER = "__seq__:";
const encodeSeqOptions = (prefix) => `${SEQ_MARKER}${prefix || "{n:03d}"}`;
const isSeqField = (options) => typeof options === "string" && options.startsWith(SEQ_MARKER);
const getSeqPrefix = (options) => isSeqField(options) ? options.slice(SEQ_MARKER.length) : "";
const formatSeqValue = (prefix, n) => {
  // Reemplaza {n:03d} → número con ceros, {n} → número simple
  return prefix
    .replace(/\{n:0(\d)d\}/g, (_, digits) => String(n).padStart(Number(digits), "0"))
    .replace(/\{n\}/g, String(n));
};

// ── Componente fila de campo ──────────────────────────────────────────────────

const FieldRow = ({ field, index, onUpdate, onRemove, canRemove }) => {
  const isSeq    = isSeqField(field.options);
  const seqPfx   = isSeq ? getSeqPrefix(field.options) : (field.seq_prefix || "");

  const toggleSeq = (checked) => {
    onUpdate(index, "auto_sequence", checked);
    onUpdate(index, "options", checked ? encodeSeqOptions(seqPfx || "{n:03d}") : "");
  };

  const updatePrefix = (prefix) => {
    onUpdate(index, "seq_prefix", prefix);
    onUpdate(index, "options", encodeSeqOptions(prefix || "{n:03d}"));
  };

  return (
  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
      <div className="sm:col-span-4">
        <input
          value={field.name}
          onChange={(e) => onUpdate(index, "name", e.target.value)}
          placeholder="Nombre del campo *"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white"
        />
      </div>
      <div className="sm:col-span-3">
        <select
          value={field.field_type}
          onChange={(e) => onUpdate(index, "field_type", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white"
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-3">
        <input
          value={field.group_name}
          onChange={(e) => onUpdate(index, "group_name", e.target.value)}
          placeholder="Grupo (opcional)"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={field.is_required}
            onChange={(e) => onUpdate(index, "is_required", e.target.checked)}
            className="w-3.5 h-3.5 accent-green-600"
          />
          Req.
        </label>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>

    {/* Auto-secuencia */}
    <div className="mt-2 flex items-start gap-3 flex-wrap">
      <label className={`flex items-center gap-1.5 text-xs cursor-pointer font-medium
        ${isSeq ? "text-violet-700" : "text-gray-400"}`}>
        <input
          type="checkbox"
          checked={isSeq}
          onChange={(e) => toggleSeq(e.target.checked)}
          className="w-3.5 h-3.5 accent-violet-600"
        />
        <Zap className="w-3 h-3" />
        Auto-secuencia
      </label>
      {isSeq && (
        <div className="flex-1 min-w-0 space-y-1">
          <input
            value={seqPfx}
            onChange={(e) => updatePrefix(e.target.value)}
            placeholder="EXT-{n:03d}"
            className="w-full px-2 py-1 rounded-lg border border-violet-200 text-xs bg-violet-50 focus:border-violet-400 outline-none font-mono"
          />
          <p className="text-[10px] text-violet-500">
            Vista previa: <strong className="font-mono">
              {formatSeqValue(seqPfx || "{n:03d}", 1)}
            </strong>, <strong className="font-mono">
              {formatSeqValue(seqPfx || "{n:03d}", 2)}
            </strong>...
            &nbsp;·&nbsp; Usa <code className="bg-violet-100 px-1 rounded">{"{n:03d}"}</code> para 3 dígitos
            o <code className="bg-violet-100 px-1 rounded">{"{n}"}</code> para número simple.
          </p>
        </div>
      )}
    </div>

    {/* Opciones de selección */}
    {field.field_type === "seleccion" && !isSeq && (
      <div className="mt-2">
        <input
          value={field.options}
          onChange={(e) => onUpdate(index, "options", e.target.value)}
          placeholder="Opciones separadas por | (ej: CO2|PQS|AGUA)"
          className="w-full px-3 py-2 rounded-lg border border-green-200 text-xs bg-green-50 focus:border-green-400 outline-none"
        />
        <p className="text-[10px] text-gray-400 mt-1">Separa con |</p>
      </div>
    )}
  </div>
  );
};


// ── Modal principal ───────────────────────────────────────────────────────────

export const InspectionTypeFormModal = ({ open, onClose, typeData, orgId, onSaved, mode = 'type' }) => {
  // Paso 1: selección de estructura | Paso 2: configuración completa
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: "", description: "", periodicity: "mensual",
    pdf_template: "generico", type_code: "",
    structure_type: "matriz",
  });
  // Campos de datos generales (scope=general) — solo para formulario y formulario_matriz
  const [generalFields, setGeneralFields] = useState([emptyField(0, "general")]);
  // Campos de la matriz (scope=matriz)
  const [matrizFields, setMatrizFields] = useState([emptyField(0, "matriz")]);

  const [templates, setTemplates] = useState([{ key: "generico", label: "Genérico" }]);
  const [submitting, setSubmitting] = useState(false);
  const [steptemplates, setStepTemplates, ] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const isEditing = !!typeData;

  const structure = STRUCTURES.find((s) => s.value === form.structure_type) || STRUCTURES[1];

  // Indica si la estructura actual usa campos generales
  const hasGeneral = ["formulario", "formulario_matriz"].includes(form.structure_type);
  // Indica si la estructura actual usa filas de matriz
  const hasMatriz = ["matriz", "formulario_matriz"].includes(form.structure_type);
  // Indica si la estructura usa SOLO campos generales (formulario puro)
  const onlyGeneral = form.structure_type === "formulario";

  useEffect(() => {
    inspectionService.getTemplates?.()
      .then((data) => { if (data?.length) setTemplates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(isEditing ? 2 : 1);

    if (typeData) {
      setForm({
        name:           typeData.name,
        description:    typeData.description  || "",
        periodicity:    typeData.periodicity  || "mensual",
        pdf_template:   typeData.pdf_template || "generico",
        type_code:      typeData.type_code    || "",
        structure_type: typeData.structure_type || "matriz",
      });
      // Separar campos por scope
      const allFields = typeData.fields || [];
      const gen = allFields.filter((f) => f.scope === "general");
      const mat = allFields.filter((f) => f.scope !== "general");
      setGeneralFields(gen.length > 0 ? gen.map(fieldToState) : [emptyField(0, "general")]);
      setMatrizFields(mat.length > 0  ? mat.map(fieldToState) : [emptyField(0, "matriz")]);
    } else {
      setForm({ name: "", description: "", periodicity: "mensual",
                pdf_template: "generico", type_code: "", structure_type: "matriz" });
      setGeneralFields([emptyField(0, "general")]);
      setMatrizFields([emptyField(0, "matriz")]);
    }
  }, [open, typeData]);

  const fieldToState = (f) => {
    const opts  = f.options || "";
    const isSeq = opts.startsWith("__seq__:");
    return {
      name:          f.name,
      field_key:     f.field_key,
      field_type:    (f.field_type || "texto").toLowerCase(),   // ← minúsculas siempre
      options:       opts,
      is_required:   f.is_required,
      order:         f.order,
      group_name:    f.group_name || "",
      scope:         (f.scope || "matriz").toLowerCase(),        // ← minúsculas siempre
      auto_sequence: isSeq,
      seq_prefix:    isSeq ? opts.slice("__seq__:".length) : "",
    };
  };

  // ── Helpers de campos ────────────────────────────────────────────────────

  const addGeneralField = () =>
    setGeneralFields((f) => [...f, emptyField(f.length, "general")]);
  const removeGeneralField = (i) =>
    setGeneralFields((f) => f.filter((_, idx) => idx !== i));
  const updateGeneralField = (i, key, value) => {
    setGeneralFields((f) => {
      const next = [...f];
      next[i] = { ...next[i], [key]: value };
      if (key === "name" && !isEditing) next[i].field_key = slugify(value);
      return next;
    });
  };

  const addMatrizField = () =>
    setMatrizFields((f) => [...f, emptyField(f.length, "matriz")]);
  const removeMatrizField = (i) =>
    setMatrizFields((f) => f.filter((_, idx) => idx !== i));
  const updateMatrizField = (i, key, value) => {
    setMatrizFields((f) => {
      const next = [...f];
      next[i] = { ...next[i], [key]: value };
      if (key === "name" && !isEditing) next[i].field_key = slugify(value);
      return next;
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);

    // Combinar campos con scope correcto y orden global
    const normalizeFields = (arr, scope) =>
      arr
        .filter((f) => f.name.trim())
        .map((f, idx) => ({
          ...f,
          scope:      scope.toLowerCase(),
          field_type: (f.field_type || "texto").toLowerCase(),  // ← minúsculas siempre
          field_key:  f.field_key || slugify(f.name),
          order:      idx,
          // Preservar options de auto-secuencia; si es selección usar las opciones del campo
          options: f.options?.startsWith("__seq__:")
            ? f.options
            : (f.field_type || "").toLowerCase() === "seleccion"
            ? f.options
            : null,
        }));

    let allFields = [];
    if (hasGeneral) allFields = [...allFields, ...normalizeFields(generalFields, "general")];
    if (hasMatriz)  allFields = [...allFields, ...normalizeFields(matrizFields, "matriz")];
    // formulario puro: solo campos generales, pero se envían como general
    if (onlyGeneral && !hasMatriz) {
      allFields = normalizeFields(generalFields, "general");
    }

    try {
      const payload = {
        ...form,
        type_code: form.type_code.trim().toUpperCase() || null,
        fields: allFields,
      };
      if (isEditing) await inspectionService.updateType(orgId, typeData.id, payload);
      else           await inspectionService.createType(orgId, payload);
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error", title: "Error",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none";

  // ── Paso 1: Cómo crear la inspección ────────────────────────────────────────

  if (step === 1) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-green-600" />
              {mode === "template" ? "Nueva plantilla" : "Nuevo tipo de inspección"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 -mt-1">
            {mode === "template"
              ? "¿Qué estructura tendrá esta plantilla?"
              : "¿Cómo quieres crear este tipo de inspección?"}
          </p>

          {/* Opción: Usar plantilla (solo en modo type) */}
          {mode === "type" && (
            <div
              onClick={async () => {
                // Redirigir a la página de plantillas
                window.location.href = "/dashboard/plantillas-inspeccion";
              }}
              className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 cursor-pointer transition-all"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">Usar una plantilla</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Elige entre las plantillas oficiales de Eureka o las de tu organización.
                  El tipo se crea en segundos.
                </p>
              </div>
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            </div>
          )}

          {/* Separador */}
          {mode === "type" && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o crear desde cero</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Selección de estructura */}
          <div className="space-y-2.5 overflow-y-auto flex-1">
            {STRUCTURES.map((s) => {
              const Icon = s.icon;
              const isSelected = form.structure_type === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, structure_type: s.value }))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all
                    ${isSelected ? s.colorActive + " border-opacity-100" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? s.color : "bg-gray-100 text-gray-500"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{s.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      <p className="text-xs text-gray-400 mt-1 italic">{s.example}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5
                      ${isSelected ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                      {isSelected && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Continuar →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Paso 2: Configuración completa ────────────────────────────────────────

  const StructureIcon = structure.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StructureIcon className="w-5 h-5 text-green-600" />
            {isEditing ? `Editar — ${typeData?.name || 'Plantilla'}` : mode === 'template' ? `Nueva plantilla · ${structure.label}` : `Nueva inspección · ${structure.label}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden flex-1 min-h-0">

          {/* Indicador de estructura (solo creación) */}
          {!isEditing && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${structure.color}`}>
              <StructureIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{structure.label}</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto flex items-center gap-1 opacity-70 hover:opacity-100"
              >
                <ChevronLeft className="w-3 h-3" /> Cambiar
              </button>
            </div>
          )}

          {/* Datos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Nombre *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Extintores, Botiquín, EPP..."
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Descripción
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descripción..."
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Periodicidad
              </label>
              <select
                value={form.periodicity}
                onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
                className={inputCls}
              >
                {PERIODICITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Código del tipo
              </label>
              <input
                value={form.type_code}
                onChange={(e) =>
                  setForm({ ...form, type_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                }
                placeholder="EXT, EPP, BOT..."
                maxLength={20}
                className={`${inputCls} font-mono uppercase`}
              />
              {form.type_code && (
                <p className="text-xs text-gray-400 mt-1">
                  Ej: <strong className="text-green-600 font-mono">ABC-{form.type_code}-001</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Formato PDF
              </label>
              <select
                value={form.pdf_template}
                onChange={(e) => setForm({ ...form, pdf_template: e.target.value })}
                className={inputCls}
              >
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Selector de estructura en edición */}
            {isEditing && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Tipo de estructura
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STRUCTURES.map((s) => {
                    const Icon = s.icon;
                    const isSelected = form.structure_type === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, structure_type: s.value }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all
                          ${isSelected ? s.colorActive : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Campos — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">

            {/* ── Campos Generales (Formulario / Formulario+Matriz) ── */}
            {hasGeneral && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                      {onlyGeneral ? "Campos del formulario" : "Datos generales"}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {onlyGeneral
                        ? "Campos que se responden una vez por inspección."
                        : "Campos de cabecera que se responden una vez (fecha, área, inspector...)."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addGeneralField}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {generalFields.map((field, i) => (
                    <FieldRow
                      key={i}
                      field={field}
                      index={i}
                      onUpdate={updateGeneralField}
                      onRemove={removeGeneralField}
                      canRemove={generalFields.length > 1}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addGeneralField}
                    className="w-full py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-xs text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Agregar campo general
                  </button>
                </div>
              </div>
            )}

            {/* ── Campos de Matriz ── */}
            {hasMatriz && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                      {onlyGeneral ? null : hasGeneral ? "Columnas de la matriz" : "Campos por ítem"}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {hasGeneral
                        ? "Columnas que se repiten en cada fila (ítem, extintor, vehículo...)."
                        : "Campos que se llenan para cada ítem o fila inspeccionada."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMatrizField}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {matrizFields.map((field, i) => (
                    <FieldRow
                      key={i}
                      field={field}
                      index={i}
                      onUpdate={updateMatrizField}
                      onRemove={removeMatrizField}
                      canRemove={matrizFields.length > 1}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addMatrizField}
                    className="w-full py-2.5 border-2 border-dashed border-green-200 rounded-xl text-xs text-green-400 hover:border-green-400 hover:text-green-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Agregar columna
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 pt-2 border-t border-gray-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
            >
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InspectionTypeFormModal;