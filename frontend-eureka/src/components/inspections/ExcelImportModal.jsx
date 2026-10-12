/**
 * Modal de importación de plantilla desde Excel (.xlsx / .xls).
 * Flujo:
 *   1. UPLOAD → el usuario sube el archivo
 *   2. REVIEW → revisa y edita la estructura detectada
 *   3. confirm → crea la plantilla
 */
import React, { useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckSquare, ChevronDown, ChevronUp, ClipboardList,
  FileSpreadsheet, LayoutGrid, Loader, Plus, Trash2, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

// ── Constantes ────────────────────────────────────────────────────────────────

const STRUCTURES = [
  { value: "formulario",        label: "Formulario / Checklist", icon: CheckSquare   },
  { value: "matriz",            label: "Matriz",                  icon: LayoutGrid    },
  { value: "formulario_matriz", label: "Formulario + Matriz",     icon: ClipboardList },
];

const FIELD_TYPES = [
  { value: "texto",       label: "Texto"         },
  { value: "numero",      label: "Número"        },
  { value: "fecha",       label: "Fecha"         },
  { value: "seleccion",   label: "Selección"     },
  { value: "check_sn",    label: "Sí / No"       },
  { value: "check_sna",   label: "Sí / No / N/A" },
  { value: "check_bm",    label: "Bueno / Malo"  },
  { value: "observacion", label: "Observación"   },
  { value: "foto",        label: "Foto"          },
];

const CONFIDENCE_STYLE = {
  alta:  "bg-green-100 text-green-700 border-green-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baja:  "bg-red-100   text-red-700   border-red-200",
};

const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-green-500 outline-none bg-white";

const STEPS = { UPLOAD: "upload", REVIEW: "review" };

// ── FieldEditor ───────────────────────────────────────────────────────────────

const FieldEditor = ({ field, index, onUpdate, onRemove, canRemove }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0
      ${field.scope === "general"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-green-50 text-green-700 border-green-200"}`}>
      {field.scope === "general" ? "GEN" : "MAT"}
    </span>
    <input
      value={field.name}
      onChange={e => onUpdate(index, "name", e.target.value)}
      className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 outline-none"
      placeholder="Nombre del campo"
    />
    <select
      value={field.field_type}
      onChange={e => onUpdate(index, "field_type", e.target.value)}
      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white outline-none focus:border-green-400 flex-shrink-0"
    >
      {FIELD_TYPES.map(ft => (
        <option key={ft.value} value={ft.value}>{ft.label}</option>
      ))}
    </select>
    <label className="flex items-center gap-0.5 text-[10px] text-gray-400 flex-shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={field.is_required}
        onChange={e => onUpdate(index, "is_required", e.target.checked)}
        className="w-3 h-3 accent-green-600"
      />
      Req
    </label>
    {canRemove && (
      <button type="button" onClick={() => onRemove(index)}
        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// ── Modal principal ───────────────────────────────────────────────────────────

export const ExcelImportModal = ({ open, onClose, onImported }) => {
  const [step, setStep]             = useState(STEPS.UPLOAD);
  const [analyzing, setAnalyzing]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [analysis, setAnalysis]     = useState(null);
  const [fileName, setFileName]     = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Estado editable de la estructura
  const [structure, setStructure]         = useState("matriz");
  const [templateName, setTemplateName]   = useState("");
  const [category, setCategory]           = useState("");
  const [generalFields, setGeneralFields] = useState([]);
  const [matrizFields, setMatrizFields]   = useState([]);

  const fileInputRef = useRef(null);

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setAnalysis(null);
    setFileName("");
    setAnalyzing(false);
    setSaving(false);
    setShowPreview(false);
    setGeneralFields([]);
    setMatrizFields([]);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      Swal.fire({ icon: "warning", title: "Formato no válido",
        text: "Solo se aceptan archivos .xlsx o .xls",
        confirmButtonColor: "#16a34a" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "warning", title: "Archivo muy grande",
        text: "El archivo no debe superar los 5 MB",
        confirmButtonColor: "#16a34a" });
      return;
    }
    setFileName(file.name);
    setAnalyzing(true);
    try {
      const result = await inspectionService.analyzeExcel(file);
      setAnalysis(result);
      setStructure(result.detected_structure || "matriz");
      setTemplateName(file.name.replace(/\.(xlsx|xls)$/i, ""));
      setGeneralFields((result.general_fields || []).map(f => ({ ...f })));
      setMatrizFields((result.matrix_fields  || []).map(f => ({ ...f })));
      setStep(STEPS.REVIEW);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al analizar el archivo",
        text: err.response?.data?.detail || "No se pudo leer el archivo Excel",
        confirmButtonColor: "#16a34a" });
    } finally { setAnalyzing(false); }
  };

  const updateField = (setArr) => (index, key, value) => {
    setArr(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const removeField = (setArr) => (index) => {
    setArr(prev => prev.filter((_, i) => i !== index));
  };

  const addField = (setArr, scope) => {
    setArr(prev => [...prev, {
      name: "", field_key: `campo_${Date.now()}`, field_type: "texto",
      options: null, is_required: false, order: prev.length,
      group_name: null, scope,
    }]);
  };

  const handleConfirm = async () => {
    if (!templateName.trim()) {
      Swal.fire({ icon: "warning", title: "Ingresa un nombre para la plantilla",
        confirmButtonColor: "#16a34a" });
      return;
    }
    const allFields = [
      ...generalFields.filter(f => f.name.trim())
        .map((f, i) => ({ ...f, scope: "general", order: i })),
      ...matrizFields.filter(f => f.name.trim())
        .map((f, i) => ({ ...f, scope: "matriz",  order: i })),
    ];
    if (allFields.length === 0) {
      Swal.fire({ icon: "warning", title: "Sin campos",
        text: "Agrega al menos un campo", confirmButtonColor: "#16a34a" });
      return;
    }
    setSaving(true);
    try {
      await inspectionService.confirmExcelImport({
        name:           templateName.trim(),
        description:    `Importada desde ${fileName}`,
        category:       category.trim() || null,
        structure_type: structure,
        fields_schema:  allFields,
        is_active:      true,
      });
      Swal.fire({ icon: "success", title: "¡Plantilla creada!",
        text: `"${templateName}" ya está disponible en tus plantillas.`,
        confirmButtonColor: "#16a34a" });
      onImported?.();
      onClose();
      reset();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al guardar",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const hasGeneral = ["formulario", "formulario_matriz"].includes(structure);
  const hasMatriz  = ["matriz", "formulario_matriz"].includes(structure);

  // ── Paso 1: Subir archivo ─────────────────────────────────────────────────

  const renderUpload = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Sube un archivo Excel con la estructura de tu inspección.
        El sistema detectará automáticamente los campos y el tipo de estructura.
      </p>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        className="border-2 border-dashed border-green-200 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
      >
        {analyzing ? (
          <>
            <Loader className="w-10 h-10 text-green-500 animate-spin" />
            <p className="text-sm text-green-700 font-medium">Analizando {fileName}...</p>
            <p className="text-xs text-gray-400">Detectando estructura y campos</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
              <FileSpreadsheet className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                Arrastra tu archivo Excel aquí
              </p>
              <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar</p>
              <p className="text-xs text-gray-300 mt-1">.xlsx o .xls · máx. 5 MB</p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {/* Consejos */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
        <p className="text-xs font-bold text-blue-700 mb-1.5">
          💡 Consejos para mejores resultados
        </p>
        {[
          "La primera fila debe tener los encabezados de columna",
          "Para checklists: columnas Ítem | Cumple | No cumple | Observaciones",
          "Para matrices: Código | Ubicación | Estado | Observaciones",
          "Encabezados como 'Empresa', 'Fecha', 'Área' se detectan como datos generales",
        ].map((tip, i) => (
          <p key={i} className="text-xs text-blue-600">· {tip}</p>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );

  // ── Paso 2: Revisar estructura ────────────────────────────────────────────

  const renderReview = () => (
    <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">

      {/* Resultado del análisis */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50 border border-green-200 flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{fileName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                ${CONFIDENCE_STYLE[analysis?.confidence || "media"]}`}>
                Confianza {analysis?.confidence}
              </span>
              {analysis?.total_data_rows > 0 && (
                <span className="text-xs text-gray-400">
                  {analysis.total_data_rows} filas · {analysis.raw_headers?.length || 0} columnas detectadas
                </span>
              )}
            </div>
          </div>
        </div>
        {(analysis?.warnings || []).map((w, i) => (
          <p key={i} className="text-xs text-amber-600 mt-1.5">⚠️ {w}</p>
        ))}
      </div>

      {/* Nombre y categoría */}
      <div className="grid grid-cols-2 gap-3 flex-shrink-0">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Nombre de la plantilla *
          </label>
          <input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Ej: Inspección de extintores"
            className={inp}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Categoría
          </label>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Ej: Equipos de emergencia"
            className={inp}
          />
        </div>
      </div>

      {/* Selector de estructura */}
      <div className="flex-shrink-0">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Estructura detectada — puedes cambiarla
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STRUCTURES.map(s => {
            const Icon = s.icon;
            const isActive = structure === s.value;
            return (
              <button key={s.value} type="button"
                onClick={() => setStructure(s.value)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-medium transition-all
                  ${isActive
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campos — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">

        {/* Datos generales */}
        {hasGeneral && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  {structure === "formulario" ? "Campos del formulario" : "Datos generales"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Se responden una sola vez por inspección
                </p>
              </div>
              <button onClick={() => addField(setGeneralFields, "general")}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-1.5">
              {generalFields.map((f, i) => (
                <FieldEditor key={i} field={f} index={i}
                  onUpdate={updateField(setGeneralFields)}
                  onRemove={removeField(setGeneralFields)}
                  canRemove={generalFields.length > 1} />
              ))}
              {generalFields.length === 0 && (
                <button onClick={() => addField(setGeneralFields, "general")}
                  className="w-full py-2.5 border-2 border-dashed border-blue-200 rounded-lg text-xs text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <Plus className="w-3 h-3 inline mr-1" /> Agregar campo general
                </button>
              )}
            </div>
          </div>
        )}

        {/* Columnas de la matriz */}
        {hasMatriz && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide">
                  {hasGeneral ? "Columnas de la matriz" : "Campos por ítem"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Se repiten en cada fila / ítem inspeccionado
                </p>
              </div>
              <button onClick={() => addField(setMatrizFields, "matriz")}
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium">
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-1.5">
              {matrizFields.map((f, i) => (
                <FieldEditor key={i} field={f} index={i}
                  onUpdate={updateField(setMatrizFields)}
                  onRemove={removeField(setMatrizFields)}
                  canRemove={matrizFields.length > 1} />
              ))}
              {matrizFields.length === 0 && (
                <button onClick={() => addField(setMatrizFields, "matriz")}
                  className="w-full py-2.5 border-2 border-dashed border-green-200 rounded-lg text-xs text-green-400 hover:border-green-400 hover:text-green-600 transition-colors">
                  <Plus className="w-3 h-3 inline mr-1" /> Agregar columna
                </button>
              )}
            </div>
          </div>
        )}

        {/* Previsualización de datos del Excel */}
        {analysis?.preview_rows?.length > 0 && (
          <div>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPreview
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
              {showPreview ? "Ocultar" : "Ver"} datos del Excel
              ({analysis.preview_rows.length} filas de muestra)
            </button>
            {showPreview && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="text-[10px] w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {analysis.raw_headers.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left text-gray-500 font-semibold border-b border-gray-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.preview_rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        {analysis.raw_headers.map((h, j) => (
                          <td key={j} className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-32 truncate">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-2 border-t border-gray-100 flex-shrink-0">
        <Button variant="outline" onClick={reset}>← Volver</Button>
        <Button
          onClick={handleConfirm}
          disabled={saving || !templateName.trim()}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
        >
          {saving
            ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            : <><Zap className="w-4 h-4 mr-2" /> Crear plantilla</>}
        </Button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => !v && (reset(), onClose())}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar plantilla desde Excel
          </DialogTitle>
        </DialogHeader>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          {[
            { key: STEPS.UPLOAD, label: "Subir archivo" },
            { key: STEPS.REVIEW, label: "Revisar estructura" },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-1.5 text-xs font-medium
                ${step === s.key
                  ? "text-green-700"
                  : i === 0 && step === STEPS.REVIEW
                  ? "text-gray-400"
                  : "text-gray-300"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${step === s.key
                    ? "bg-green-600 text-white"
                    : i === 0 && step === STEPS.REVIEW
                    ? "bg-gray-200 text-gray-500"
                    : "bg-gray-100 text-gray-400"}`}>
                  {i === 0 && step === STEPS.REVIEW ? "✓" : i + 1}
                </div>
                {s.label}
              </div>
              {i < 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 mt-3">
          {step === STEPS.UPLOAD && renderUpload()}
          {step === STEPS.REVIEW && renderReview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelImportModal;