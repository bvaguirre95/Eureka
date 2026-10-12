import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ArrowLeft, ClipboardCheck, Download, FileText, FilePlus, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import inspectionService from "../services/inspection.service";
import InspectionCreateModal from "../components/inspections/InspectionCreateModal";

const STATUS_CONFIG = {
  borrador:   { label: "Borrador",   cls: "bg-gray-100 text-gray-600" },
  en_proceso: { label: "En proceso", cls: "bg-blue-100 text-blue-700" },
  completada: { label: "Completada", cls: "bg-green-100 text-green-700" },
  cerrada:    { label: "Cerrada",    cls: "bg-emerald-100 text-emerald-700" },
};

export const InspectionListPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("inspections.create");
  const canDelete = hasPermission("inspections.delete");

  const [company, setCompany] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, ins] = await Promise.all([
        companyService.getCompany(companyId),
        inspectionService.list(companyId),
      ]);
      setCompany(co);
      setInspections(ins);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      icon: "warning", title: "¿Eliminar inspección?",
      text: "Se eliminarán todos los registros y acciones correctivas.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try { await inspectionService.remove(companyId, id); load(); }
    catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/empresas")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Empresas
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Inspecciones</h2>
          {company && <p className="text-sm text-gray-500 mt-1">{company.razon_social} · RUC {company.ruc}</p>}
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <FilePlus className="w-4 h-4 mr-2" /> Nueva Inspección
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : inspections.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No hay inspecciones para esta empresa.</p>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <FilePlus className="w-4 h-4 mr-2" /> Crear primera inspección
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inspections.map(ins => {
            const st = STATUS_CONFIG[ins.status] || STATUS_CONFIG.borrador;
            const pct = ins.compliance_percent;
            const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={ins.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <ClipboardCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{ins.inspection_type_name}</p>
                      <p className="text-xs text-gray-400">
                        {ins.inspection_number ? `N° ${ins.inspection_number} · ` : ""}
                        {ins.scheduled_date ? new Date(ins.scheduled_date).toLocaleDateString("es-EC") : "Sin fecha"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {ins.location && <p className="text-xs text-gray-500">📍 {ins.location}</p>}

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{ins.total_records} registros · {ins.records_with_findings} hallazgos</span>
                  {ins.open_actions > 0 && (
                    <span className="text-amber-600 font-medium">{ins.open_actions} acc. abiertas</span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => navigate(`/dashboard/empresas/${companyId}/inspecciones/${ins.id}`)}
                    variant="outline" className="flex-1 text-xs">
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {ins.status === "borrador" || ins.status === "en_proceso" ? "Continuar" : "Ver"}
                  </Button>
                  <button
                    onClick={() => inspectionService.downloadPdf(companyId, ins.id,
                      `Matriz_${ins.inspection_type_name.replace(/ /g,"_")}_N${ins.inspection_number||ins.id}.pdf`,
                      "matriz")}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors"
                    title="Descargar Matriz">
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => inspectionService.downloadPdf(companyId, ins.id,
                      `Informe_${ins.inspection_type_name.replace(/ /g,"_")}_N${ins.inspection_number||ins.id}.pdf`,
                      "informe")}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    title="Descargar Informe">
                    <FileText className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete(ins.id)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InspectionCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        companyId={companyId}
        orgId={user?.organization?.id}
        onCreated={(ins) => navigate(`/dashboard/empresas/${companyId}/inspecciones/${ins.id}`)}
      />
    </DashboardLayout>
  );
};
export default InspectionListPage;
