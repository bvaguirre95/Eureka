/**
 * Modal para crear una nueva inspección.
 * Fase 3: permite elegir entre tipos existentes o partir desde una plantilla.
 *
 * Flujo A — Tipo existente:
 *   Selecciona tipo → configura fecha/lugar → crea inspección
 *
 * Flujo B — Desde plantilla:
 *   Elige plantilla → backend crea el InspectionType si no existe → crea inspección
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckSquare, ChevronLeft, ClipboardList, Globe,
  LayoutGrid, Loader, Search, Tag, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

// ── Constantes ────────────────────────────────────────────────────────────────

const STRUCTURE_META = {
  formulario:        { label: "Formulario",    icon: CheckSquare,   color: "text-blue-600 bg-blue-50 border-blue-100" },
  matriz:            { label: "Matriz",         icon: LayoutGrid,    color: "text-green-600 bg-green-50 border-green-100" },
  formulario_matriz: { label: "Form + Matriz",  icon: ClipboardList, color: "text-purple-600 bg-purple-50 border-purple-100" },
};

const PERIODICITY_LABELS = {
  diario: "Diario", semanal: "Semanal", mensual: "Mensual",
  bimestral: "Bimestral", trimestral: "Trimestral",
  semestral: "Semestral", anual: "Anual",
};

const inp = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all";

// ── Subcomponente: pantalla de selección de plantilla ─────────────────────────

const TemplatePicker = ({ templates, loading, onSelect, onBack }) => {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();

  const filtered = templates.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const globals = filtered.filter(t => t.source === "global");
  const own     = filtered.filter(t => t.source !== "global");

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader className="w-7 h-7 animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plantilla..." className={`${inp} pl-8 py-2 text-xs`} />
        </div>
        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none bg-white focus:border-green-500">
            <option value="">Todas</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Lista scrollable */}
      <div className="overflow-y-auto flex-1 space-y-4 pr-1">
        {globals.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Plantillas oficiales Eureka
            </p>
            <div className="space-y-2">
              {globals.map(t => <TemplateRow key={t.id} tpl={t} onSelect={onSelect} />)}
            </div>
          </div>
        )}
        {own.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Plantillas de tu organización
            </p>
            <div className="space-y-2">
              {own.map(t => <TemplateRow key={t.id} tpl={t} onSelect={onSelect} />)}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            {search ? "Sin resultados para tu búsqueda." : "No hay plantillas disponibles."}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onBack} className="text-xs">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Volver
        </Button>
      </div>
    </div>
  );
};

const TemplateRow = ({ tpl, onSelect }) => {
  const meta = STRUCTURE_META[tpl.structure_type] || STRUCTURE_META.matriz;
  const Icon = meta.icon;
  return (
    <button type="button" onClick={() => onSelect(tpl)}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50/30 transition-all group">
      <div className={`p-2 rounded-lg border flex-shrink-0 ${meta.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
          {tpl.source === "global" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              OFICIAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {tpl.category && <span className="text-[10px] text-gray-400">{tpl.category}</span>}
          <span className="text-[10px] text-gray-400">{tpl.field_count} campos</span>
          {tpl.suggested_periodicity && (
            <span className="text-[10px] text-gray-400 capitalize">
              · {PERIODICITY_LABELS[tpl.suggested_periodicity] || tpl.suggested_periodicity}
            </span>
          )}
        </div>
        {tpl.description && (
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{tpl.description}</p>
        )}
      </div>
      <Zap className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors flex-shrink-0 mt-0.5" />
    </button>
  );
};

// ── Modal principal ───────────────────────────────────────────────────────────

const STEPS = {
  ORIGIN:   "origin",    // ¿desde tipo o desde plantilla?
  TEMPLATE: "template",  // selector de plantilla
  FORM:     "form",      // formulario de datos (fecha, lugar...)
};

export const InspectionCreateModal = ({ open, onClose, companyId, orgId, onCreated }) => {
  const [step, setStep]             = useState(STEPS.ORIGIN);
  const [types, setTypes]           = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [signers, setSigners]       = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Plantilla seleccionada (si viene de ese flujo)
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState({
    inspection_type_id: "",
    scheduled_date: "",
    location: "",
    start_time: "10H00",
    end_time: "11H00",
  });

  // ── Carga inicial ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !orgId) return;
    setStep(STEPS.ORIGIN);
    setSelectedTemplate(null);
    setLoadingData(true);
    Promise.all([
      inspectionService.getTypes(orgId, true),
      inspectionService.getSigners(companyId).catch(() => null),
    ]).then(([typeList, sgnrs]) => {
      setTypes(typeList);
      setSigners(sgnrs);
      if (typeList.length > 0)
        setForm(f => ({ ...f, inspection_type_id: String(typeList[0].id) }));
    }).finally(() => setLoadingData(false));
  }, [open, orgId, companyId]);

  // Cargar plantillas cuando el usuario elige ese flujo
  useEffect(() => {
    if (step !== STEPS.TEMPLATE || templates.length > 0) return;
    setLoadingTpl(true);
    inspectionService.getInspectionTemplates({ only_active: true })
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoadingTpl(false));
  }, [step]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setStep(STEPS.FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let typeId = form.inspection_type_id ? Number(form.inspection_type_id) : null;

      // Si viene desde plantilla: crear el tipo on-the-fly y obtener su id
      if (selectedTemplate) {
        const newType = await inspectionService.useInspectionTemplate(
          selectedTemplate.id, {}
        );
        typeId = newType.id;
      }

      if (!typeId) {
        Swal.fire({ icon: "warning", title: "Selecciona un tipo de inspección",
          confirmButtonColor: "#16a34a" });
        return;
      }

      const ins = await inspectionService.create(companyId, {
        inspection_type_id: typeId,
        scheduled_date: form.scheduled_date  || null,
        location:       form.location        || null,
        start_time:     form.start_time      || null,
        end_time:       form.end_time        || null,
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
    className: inp,
  });

  const selectedType = types.find(t => String(t.id) === form.inspection_type_id);

  // ── Render: paso ORIGIN ─────────────────────────────────────────────────

  const renderOrigin = () => (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">¿Cómo quieres configurar esta inspección?</p>

      {/* Opción A: tipo existente */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          Desde un tipo configurado
        </p>
        {loadingData ? (
          <div className="flex justify-center py-4">
            <Loader className="w-5 h-5 animate-spin text-green-500" />
          </div>
        ) : types.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              No hay tipos de inspección configurados. Usa una plantilla o pide a tu Supervisor que cree un tipo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {types.map(t => {
              const meta = STRUCTURE_META[t.structure_type] || STRUCTURE_META.matriz;
              const Icon = meta.icon;
              const isSelected = String(t.id) === form.inspection_type_id;
              return (
                <button key={t.id} type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setForm(f => ({ ...f, inspection_type_id: String(t.id) }));
                    setStep(STEPS.FORM);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all
                    ${isSelected ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-300 hover:bg-gray-50"}`}>
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 ${meta.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">
                      {meta.label} · {PERIODICITY_LABELS[t.periodicity] || t.periodicity || "Sin periodicidad"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[10px] text-gray-400 font-medium">o</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Opción B: desde plantilla */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
          Desde una plantilla
        </p>
        <button type="button" onClick={() => setStep(STEPS.TEMPLATE)}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 transition-all group text-left">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Usar una plantilla</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Elige entre las plantillas oficiales de Eureka o las de tu organización.
              El tipo se crea automáticamente.
            </p>
          </div>
          <Globe className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
        </button>
      </div>

      <div className="flex justify-end pt-1 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );

  // ── Render: paso FORM ───────────────────────────────────────────────────

  const renderForm = () => {
    const tplMeta = selectedTemplate
      ? STRUCTURE_META[selectedTemplate.structure_type] || STRUCTURE_META.matriz
      : selectedType
      ? STRUCTURE_META[selectedType.structure_type] || STRUCTURE_META.matriz
      : null;

    return (
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Resumen del tipo/plantilla elegida */}
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${
          selectedTemplate ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
        }`}>
          {tplMeta && (() => {
            const Icon = tplMeta.icon;
            return (
              <div className={`p-2 rounded-lg border flex-shrink-0 ${tplMeta.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {selectedTemplate ? selectedTemplate.name : selectedType?.name}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {selectedTemplate
                ? `Plantilla ${selectedTemplate.source === "global" ? "oficial Eureka" : "de la organización"} · ${tplMeta?.label || ""}`
                : `Tipo configurado · ${tplMeta?.label || ""}`}
            </p>
          </div>
          <button type="button" onClick={() => {
            setSelectedTemplate(null);
            setStep(STEPS.ORIGIN);
          }} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Datos de la inspección */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Fecha programada
            </label>
            <input type="date" {...f("scheduled_date")} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Lugar / Área
            </label>
            <input {...f("location")} placeholder="Ej: Área de producción" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Hora inicio
            </label>
            <input {...f("start_time")} placeholder="10H00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Hora fin
            </label>
            <input {...f("end_time")} placeholder="11H00" />
          </div>
        </div>

        {/* Preview firmantes */}
        {signers && (signers.reviewed_by || signers.approved_by) && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Firmantes (predeterminados)</p>
            <div className="text-xs text-gray-500 space-y-0.5">
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

        {selectedTemplate && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              <strong>ℹ️ Nota:</strong> Al confirmar se creará automáticamente el tipo
              <strong> "{selectedTemplate.name}"</strong> en tu organización y se iniciará la inspección.
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline"
            onClick={() => { setSelectedTemplate(null); setStep(STEPS.ORIGIN); }}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
          </Button>
          <Button type="submit" disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 min-w-32">
            {submitting
              ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
              : "Crear inspección"}
          </Button>
        </div>
      </form>
    );
  };

  // ── Render principal ────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600" />
            {step === STEPS.TEMPLATE ? "Elegir plantilla" : "Nueva inspección"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 mt-2">
          {step === STEPS.ORIGIN   && renderOrigin()}
          {step === STEPS.TEMPLATE && (
            <TemplatePicker
              templates={templates}
              loading={loadingTpl}
              onSelect={handleSelectTemplate}
              onBack={() => setStep(STEPS.ORIGIN)}
            />
          )}
          {step === STEPS.FORM     && renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InspectionCreateModal;