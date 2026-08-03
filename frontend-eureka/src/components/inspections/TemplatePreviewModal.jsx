/**
 * Modal de previsualización de una plantilla de inspección.
 * Muestra los campos, permite usarla directamente o copiarla.
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckSquare, ClipboardList, Copy, Globe, LayoutGrid,
  Loader, Tag, X, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import inspectionService from "../../services/inspection.service";

const STRUCTURE_LABELS = {
  formulario:        { label: "Formulario / Checklist", icon: CheckSquare, color: "text-blue-600 bg-blue-50" },
  matriz:            { label: "Matriz",                  icon: LayoutGrid,  color: "text-green-600 bg-green-50" },
  formulario_matriz: { label: "Formulario + Matriz",     icon: ClipboardList, color: "text-purple-600 bg-purple-50" },
};

const FIELD_TYPE_LABELS = {
  texto: "Texto", numero: "Número", fecha: "Fecha",
  seleccion: "Selección", check_sn: "Sí/No", check_sna: "Sí/No/N.A.",
  check_bm: "Bueno/Malo", observacion: "Observación",
  foto: "Foto", firma: "Firma", ubicacion: "Ubicación",
};

const SCOPE_COLORS = {
  general: "bg-blue-50 text-blue-700 border-blue-200",
  matriz:  "bg-green-50 text-green-700 border-green-200",
};

export const TemplatePreviewModal = ({
  open, onClose, templateId, orgId, onUsed,
}) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [acting, setActing]     = useState(false);

  useEffect(() => {
    if (!open || !templateId) return;
    console.log("templateId recibido:", templateId);
    setLoading(true);
    inspectionService.getInspectionTemplate(templateId)
      .then(setTemplate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, templateId]);

  const handleUse = async () => {
    setActing(true);
    try {
      await inspectionService.useInspectionTemplate(templateId, {});
      Swal.fire({
        icon: "success", title: "¡Tipo creado!",
        text: `"${template.name}" ya está disponible en tu lista de tipos de inspección.`,
        confirmButtonColor: "#16a34a",
      });
      onUsed?.();
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error", title: "Error",
        text: err.response?.data?.detail || "No se pudo crear el tipo",
        confirmButtonColor: "#16a34a",
      });
    } finally { setActing(false); }
  };

  const handleCopy = async () => {
    setActing(true);
    try {
      await inspectionService.copyInspectionTemplate(templateId, {});
      Swal.fire({
        icon: "success", title: "Plantilla copiada",
        text: "Ahora puedes editarla desde tus plantillas.",
        confirmButtonColor: "#16a34a",
      });
      onUsed?.();
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error", title: "Error",
        text: err.response?.data?.detail || "No se pudo copiar",
        confirmButtonColor: "#16a34a",
      });
    } finally { setActing(false); }
  };

  const isGlobal   = template?.source === "global";
  const structure  = STRUCTURE_LABELS[template?.structure_type] || STRUCTURE_LABELS.matriz;
  const StructIcon = structure.icon;

  // Separar campos por scope
  const generalFields = (template?.fields_schema || []).filter(f => f.scope === "general");
  const matrizFields  = (template?.fields_schema || []).filter(f => f.scope !== "general");

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <ClipboardList className="w-5 h-5 text-green-600 flex-shrink-0" />
            {loading ? "Cargando..." : template?.name || "Plantilla"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : template ? (
          <>
            {/* Meta */}
            <div className="px-6 pt-3 space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {isGlobal && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Globe className="w-3 h-3" /> Plantilla oficial Eureka
                  </span>
                )}
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${structure.color}`}>
                  <StructIcon className="w-3 h-3" />
                  {structure.label}
                </span>
                {template.category && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    <Tag className="w-3 h-3" /> {template.category}
                  </span>
                )}
                {template.suggested_periodicity && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 capitalize">
                    {template.suggested_periodicity}
                  </span>
                )}
              </div>

              {template.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{template.description}</p>
              )}

              <div className="flex gap-3 text-xs text-gray-400">
                <span>{template.field_count} campo{template.field_count !== 1 ? "s" : ""}</span>
                {template.times_used > 0 && (
                  <span>· Usado {template.times_used} {template.times_used === 1 ? "vez" : "veces"}</span>
                )}
              </div>
            </div>

            {/* Campos — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Datos generales */}
              {generalFields.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                    Datos generales
                  </p>
                  <div className="space-y-1.5">
                    {generalFields.map((f, i) => (
                      <FieldPreviewRow key={i} field={f} scope="general" />
                    ))}
                  </div>
                </div>
              )}

              {/* Columnas de la matriz */}
              {matrizFields.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">
                    {template.structure_type === "formulario"
                      ? "Campos del formulario"
                      : template.structure_type === "formulario_matriz"
                      ? "Columnas de la matriz"
                      : "Campos por ítem"}
                  </p>
                  <div className="space-y-1.5">
                    {matrizFields.map((f, i) => (
                      <FieldPreviewRow key={i} field={f} scope="matriz" />
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose} className="sm:mr-auto">
                <X className="w-4 h-4 mr-1.5" /> Cerrar
              </Button>

              {isGlobal && (
                <Button variant="outline" onClick={handleCopy} disabled={acting}
                  className="text-amber-700 border-amber-200 hover:bg-amber-50">
                  {acting ? <Loader className="w-4 h-4 mr-1.5 animate-spin" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  Copiar y editar
                </Button>
              )}

              <Button onClick={handleUse} disabled={acting}
                className="bg-green-600 hover:bg-green-700 text-white">
                {acting ? <Loader className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
                Usar esta plantilla
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-12">No se pudo cargar la plantilla.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

const FieldPreviewRow = ({ field, scope }) => {
  const scopeStyle = SCOPE_COLORS[scope] || SCOPE_COLORS.matriz;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${scopeStyle}`}>
        {scope === "general" ? "GEN" : "MAT"}
      </span>
      <span className="text-sm text-gray-800 flex-1">{field.name}</span>
      {field.is_required && (
        <span className="text-red-400 text-xs flex-shrink-0">*</span>
      )}
      <span className="text-xs text-gray-400 flex-shrink-0">
        {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
      </span>
    </div>
  );
};

export default TemplatePreviewModal;