import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ArrowLeft, ClipboardList, Download, FilePlus, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import diagnosticService from "../services/diagnostic.service";

export const DiagnosticListPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("documents.upload");
  const canDelete = hasPermission("documents.manage_catalog");

  const [company, setCompany] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, diags] = await Promise.all([
        companyService.getCompany(companyId),
        diagnosticService.list(companyId),
      ]);
      setCompany(co);
      setDiagnostics(diags);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Nuevo Diagnóstico Anexo 1",
      text: "Se creará un diagnóstico en borrador para esta empresa. ¿Continuar?",
      showCancelButton: true, confirmButtonText: "Crear", cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!result.isConfirmed) return;
    try {
      const diag = await diagnosticService.create(companyId, {
        razon_social: company.razon_social,
        ruc: company.ruc,
        total_workers: company.num_trabajadores,
      });
      navigate(`/dashboard/empresas/${companyId}/diagnosticos/${diag.id}`);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al crear diagnóstico",
        text: err.response?.data?.detail || "Intenta nuevamente", confirmButtonColor: "#16a34a" });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      icon: "warning", title: "¿Eliminar diagnóstico?",
      text: "Se eliminarán todas las respuestas guardadas.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar", confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try { await diagnosticService.remove(companyId, id); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "No se pudo eliminar",
      text: err.response?.data?.detail, confirmButtonColor: "#16a34a" }); }
  };

  const statusBadge = (status) =>
    status === "completado"
      ? <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Completado</span>
      : <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Borrador</span>;

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/empresas")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Empresas
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Diagnóstico Anexo 1</h2>
          {company && <p className="text-sm text-gray-500 mt-1">{company.razon_social} · RUC {company.ruc}</p>}
        </div>
        {canCreate && (
          <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <FilePlus className="w-4 h-4 mr-2" /> Nuevo Diagnóstico
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : diagnostics.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No hay diagnósticos para esta empresa.</p>
          {canCreate && (
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <FilePlus className="w-4 h-4 mr-2" /> Crear primer diagnóstico
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {diagnostics.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {d.inspection_number || `Diagnóstico #${d.id}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {d.diagnostic_type === "inspeccion" ? "Inspección" : "Reinspección"}
                      {d.inspection_date && ` · ${new Date(d.inspection_date).toLocaleDateString("es-EC")}`}
                    </p>
                  </div>
                </div>
                {statusBadge(d.status)}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((d.answered / 96) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">
                  {d.answered}/96 resp.
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Cumplimiento</span>
                <span className="font-bold text-green-600">{d.compliance_percent}%</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => navigate(`/dashboard/empresas/${companyId}/diagnosticos/${d.id}`)}
                  variant="outline" className="flex-1 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  {d.status === "completado" ? "Ver" : "Continuar"}
                </Button>
                <button
                  onClick={() => diagnosticService.downloadPdf(companyId, d.id,
                    `diagnostico_${d.inspection_number || d.id}.pdf`)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors"
                  title="Descargar PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};
export default DiagnosticListPage;
