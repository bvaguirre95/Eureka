/**
 * Página de gestión de plantillas de inspección.
 * Acceso: /dashboard/plantillas-inspeccion
 * Muestra globales (solo lectura) y propias (editables).
 */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckSquare, ClipboardList, Copy, Eye, FileSpreadsheet, Globe, LayoutGrid,
  Pencil, Plus, Search, Tag, Trash2, Zap,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import inspectionService from "../services/inspection.service";
import { TemplatePreviewModal } from "../components/inspections/TemplatePreviewModal";
import { InspectionTypeFormModal } from "../components/inspections/InspectionTypeFormModal";
import { ExcelImportModal } from "../components/inspections/ExcelImportModal";

// ── Constantes ────────────────────────────────────────────────────────────────

const STRUCTURE_META = {
  formulario:        { label: "Formulario",         icon: CheckSquare,  color: "text-blue-600   bg-blue-50   border-blue-100"   },
  matriz:            { label: "Matriz",              icon: LayoutGrid,   color: "text-green-600  bg-green-50  border-green-100"  },
  formulario_matriz: { label: "Form + Matriz",       icon: ClipboardList, color: "text-purple-600 bg-purple-50 border-purple-100" },
};

const PERIODICITY_LABELS = {
  diario: "Diario", semanal: "Semanal", mensual: "Mensual",
  bimestral: "Bimestral", trimestral: "Trimestral",
  semestral: "Semestral", anual: "Anual",
};

// ── TemplateCard ──────────────────────────────────────────────────────────────

const TemplateCard = ({ tpl, canManage, onPreview, onCopy, onEdit, onDelete, onUse }) => {
  const meta    = STRUCTURE_META[tpl.structure_type] || STRUCTURE_META.matriz;
  const Icon    = meta.icon;
  const isGlobal = tpl.source === "global";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col gap-3 p-5 hover:shadow-md transition-shadow
      ${isGlobal ? "border-amber-100" : "border-gray-100"}`}>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${meta.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm">{tpl.name}</p>
            {isGlobal && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Globe className="w-2.5 h-2.5" /> Oficial
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {tpl.category && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" /> {tpl.category}
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {tpl.field_count} campo{tpl.field_count !== 1 ? "s" : ""}
            </span>
            {tpl.suggested_periodicity && (
              <span className="text-[10px] text-gray-400 capitalize">
                · {PERIODICITY_LABELS[tpl.suggested_periodicity] || tpl.suggested_periodicity}
              </span>
            )}
          </div>
        </div>
      </div>

      {tpl.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{tpl.description}</p>
      )}

      {/* Estructura badge */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
          {meta.label}
        </span>
        {tpl.times_used > 0 && (
          <span className="text-[10px] text-gray-400">
            Usado {tpl.times_used} {tpl.times_used === 1 ? "vez" : "veces"}
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-1.5 pt-1 border-t border-gray-50 flex-wrap">
        <Button variant="outline" onClick={() => onPreview(tpl.id)}
          className="flex-1 text-xs min-w-0">
          <Eye className="w-3.5 h-3.5 mr-1" /> Ver
        </Button>

        {canManage && (
          <Button onClick={() => onUse(tpl.id)}
            className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white min-w-0">
            <Zap className="w-3.5 h-3.5 mr-1" /> Usar
          </Button>
        )}

        {canManage && isGlobal && (
          <button onClick={() => onCopy(tpl)}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 transition-colors"
            title="Copiar y editar">
            <Copy className="w-4 h-4" />
          </button>
        )}

        {canManage && !isGlobal && (
          <>
            <button onClick={() => onEdit(tpl)}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
              title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(tpl)}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

export const InspectionTemplatesPage = () => {
  const { user, hasPermission } = useAuth();
  const { selectedOrgId } = useOrganization();
  const canManage = hasPermission("inspections.manage");
  // Super-admin no tiene org propia; usa la org seleccionada en el selector global
  const orgId = user?.organization?.id ?? selectedOrgId;

  const [templates, setTemplates]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("all"); // all | global | propia

  // Modales
  const [previewId, setPreviewId]       = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await inspectionService.getInspectionTemplates({ only_active: false });
      setTemplates(data);
    } catch { /**/ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orgId]);

  // Categorías únicas para el filtro
  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();

  // Filtrado
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterSource === "global" && t.source !== "global") return false;
    if (filterSource === "propia" && t.source !== "organizacion") return false;
    return true;
  });

  const globalTemplates = filtered.filter(t => t.source === "global");
  const ownTemplates    = filtered.filter(t => t.source !== "global");

  const handleCopy = async (tpl) => {
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: `Copiar "${tpl.name}"`,
      text: "Se creará una copia editable en tus plantillas.",
      showCancelButton: true,
      confirmButtonText: "Copiar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!isConfirmed) return;
    try {
      await inspectionService.copyInspectionTemplate(tpl.id, {});
      Swal.fire({ icon: "success", title: "Copiada", timer: 1500, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  const handleDelete = async (tpl) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar "${tpl.name}"?`,
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await inspectionService.deleteInspectionTemplate(tpl.id);
      Swal.fire({ icon: "success", title: "Eliminada", timer: 1200, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  const handleUse = (templateId) => {
    setPreviewId(templateId);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Plantillas de Inspección
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Usa las plantillas oficiales de Eureka o crea las tuyas propias.
            Una plantilla es la base para crear tipos de inspección rápidamente.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline"
              onClick={() => setExcelModalOpen(true)}
              className="border-green-200 text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Importar Excel
            </Button>
            <Button onClick={() => { setEditingTemplate(null); setTypeModalOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Nueva plantilla
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plantillas..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
          />
        </div>
        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          {[
            { value: "all",    label: "Todas" },
            { value: "global", label: "Oficiales" },
            { value: "propia", label: "Propias" },
          ].map(opt => (
            <button key={opt.value} onClick={() => setFilterSource(opt.value)}
              className={`px-3 py-2 transition-colors ${
                filterSource === opt.value
                  ? "bg-green-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            {search || filterCategory ? "No hay resultados para tu búsqueda." : "No hay plantillas disponibles."}
          </p>
          {canManage && !search && (
            <Button onClick={() => setTypeModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Crear primera plantilla
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Plantillas globales */}
          {globalTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Plantillas oficiales Eureka
                </h3>
                <span className="text-xs text-gray-400">({globalTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalTemplates.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} canManage={canManage}
                    onPreview={setPreviewId} onCopy={handleCopy}
                    onEdit={() => {}} onDelete={handleDelete} onUse={handleUse} />
                ))}
              </div>
            </div>
          )}

          {/* Plantillas propias */}
          {ownTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Plantillas de tu organización
                </h3>
                <span className="text-xs text-gray-400">({ownTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownTemplates.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} canManage={canManage}
                    onPreview={setPreviewId} onCopy={handleCopy}
                    onEdit={tpl => { setEditingTemplate(tpl); setTypeModalOpen(true); }}
                    onDelete={handleDelete} onUse={handleUse} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal previsualización */}
      <TemplatePreviewModal
        open={!!previewId}
        onClose={() => setPreviewId(null)}
        templateId={previewId}
        orgId={orgId}
        onUsed={load}
      />

      {/* Modal importar Excel */}
      <ExcelImportModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        onImported={load}
      />

      {/* Modal crear/editar plantilla propia */}
      <InspectionTypeFormModal
        open={typeModalOpen}
        onClose={() => { setTypeModalOpen(false); setEditingTemplate(null); }}
        typeData={editingTemplate}
        orgId={orgId}
        onSaved={load}
        mode="template"
      />
    </DashboardLayout>
  );
};

export default InspectionTemplatesPage;