/**
 * Formatos de informe de inspección — secciones y diseño por tipo de documento.
 * Acceso: /dashboard/formatos-informe
 */
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Copy, Eye, FileText, Pencil, Plus } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import inspectionService from "../services/inspection.service";
import ReportFormatEditor from "../components/inspections/ReportFormatEditor";

const KIND_BADGE = {
  informe_configurable: "Informe configurable",
  formulario_pdf: "Formulario PDF",
  informe_personalizado: "Informe personalizado",
};

export const ReportFormatsPage = () => {
  const { user, hasPermission } = useAuth();
  const { selectedOrgId } = useOrganization();
  const canManage = hasPermission("inspections.manage");
  const orgId = user?.organization?.id ?? selectedOrgId;

  const [formats, setFormats] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOld, setShowOld] = useState(false);
  const [editor, setEditor] = useState(null);      // { format|null, readOnly }

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [f, t] = await Promise.all([
        inspectionService.getReportFormats(orgId, showOld),
        inspectionService.getTypes(orgId),
      ]);
      setFormats(f); setTypes(t);
    } catch { /**/ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [orgId, showOld]);

  // versión más reciente por (org, code): las anteriores son solo de consulta
  const latest = useMemo(() => {
    const m = {};
    formats.forEach((f) => { const k = `${f.organization_id}:${f.code}`; m[k] = Math.max(m[k] || 0, f.version); });
    return m;
  }, [formats]);

  const usedBy = (f) => types.filter((t) => t.report_format_id === f.id);

  const copy = async (f) => {
    const { isConfirmed, value } = await Swal.fire({
      title: "Copiar y personalizar", input: "text", inputValue: `${f.name} (copia)`,
      inputLabel: "Nombre del nuevo formato", showCancelButton: true, confirmButtonText: "Crear copia",
      cancelButtonText: "Cancelar", confirmButtonColor: "#16a34a",
      inputValidator: (v) => (!v?.trim() ? "Escribe un nombre" : undefined),
    });
    if (!isConfirmed) return;
    try {
      const created = await inspectionService.createReportFormat(orgId, { name: value.trim(), copy_from_id: f.id });
      await load();
      setEditor({ format: created, readOnly: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo copiar", text: err.response?.data?.detail || "Intenta nuevamente", confirmButtonColor: "#16a34a" });
    }
  };

  const Card = ({ f }) => {
    const isLatest = f.version === latest[`${f.organization_id}:${f.code}`];
    const editable = canManage && !f.is_global && isLatest;
    const active = (f.sections || []).filter((s) => s.enabled).length;
    const used = usedBy(f);
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 ${isLatest ? "" : "opacity-70"}`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl"><FileText className="w-5 h-5 text-green-600" /></div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 leading-tight">{f.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{KIND_BADGE[f.document_kind]} · v{f.version}</p>
          </div>
        </div>
        {f.description && <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>}
        <div className="flex flex-wrap gap-1">
          {f.is_global && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Genérico</span>}
          {f.in_use && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Con inspecciones emitidas</span>}
          {!isLatest && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Versión anterior</span>}
          {f.pdf_template && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Plantilla: {f.pdf_template}</span>}
          {!f.pdf_template && f.document_kind !== "informe_personalizado" && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{active} secciones activas</span>)}
        </div>
        {used.length > 0 && (
          <p className="text-xs text-gray-500">Usado por: <span className="text-gray-700">{used.map((t) => t.name).join(", ")}</span></p>)}
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          {editable ? (
            <Button variant="outline" onClick={() => setEditor({ format: f, readOnly: false })} className="flex-1">
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>) : (
            <Button variant="outline" onClick={() => setEditor({ format: f, readOnly: true })} className="flex-1">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver
            </Button>)}
          {canManage && (
            <Button variant="outline" onClick={() => copy(f)} title="Copiar y personalizar">
              <Copy className="w-3.5 h-3.5" />
            </Button>)}
        </div>
      </div>
    );
  };

  const globals = formats.filter((f) => f.is_global);
  const mine = formats.filter((f) => !f.is_global);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Formatos de informe</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define las secciones y el diseño del PDF de cada inspección. Luego asigna el formato en
            <span className="font-medium"> Tipos de inspección</span>.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditor({ format: null, readOnly: false })} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo formato
          </Button>)}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">De mi organización</h3>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showOld} onChange={(e) => setShowOld(e.target.checked)} />
                Mostrar versiones anteriores
              </label>
            </div>
            {mine.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-6 text-center">
                Aún no tienes formatos propios. Copia un formato genérico o crea uno nuevo.
              </p>) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mine.map((f) => <Card key={f.id} f={f} />)}
              </div>)}
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Genéricos reutilizables</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {globals.map((f) => <Card key={f.id} f={f} />)}
            </div>
          </section>
        </div>
      )}

      {editor && (
        <ReportFormatEditor
          orgId={orgId} types={types} format={editor.format} readOnly={editor.readOnly}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); load(); }}
        />)}
    </DashboardLayout>
  );
};

export default ReportFormatsPage;
