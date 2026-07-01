import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ArrowLeft, Building2, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DocumentRow } from "../components/documents/DocumentRow";
import { PeriodicDocumentCard } from "../components/documents/PeriodicDocumentCard";
import { STATUS_CONFIG } from "../components/documents/documentStatus";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import documentService from "../services/document.service";

const SUMMARY_ORDER = ["pendiente", "cargado", "validado", "rechazado", "vencido"];
const PERIODIC_TYPES = ["mensual", "bimestral"];

export const DocumentMatrixPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canUpload = hasPermission("documents.upload");
  const canValidate = hasPermission("documents.validate");
  const canReplaceValidated = hasPermission("documents.replace_validated");

  const [company, setCompany] = useState(null);
  const [matrix, setMatrix] = useState([]);
  const [summary, setSummary] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [companyData, matrixData, summaryData] = await Promise.all([
        companyService.getCompany(companyId),
        documentService.getMatrix(companyId, year),
        documentService.getSummary(companyId, year),
      ]);
      setCompany(companyData);
      setMatrix(matrixData);
      setSummary(summaryData);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo cargar la gestión documental",
        text: error.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRowChanged = (updatedRow) => {
    setMatrix((prev) =>
      prev.map((row) =>
        row.catalog_item_id === updatedRow.catalog_item_id &&
        row.period_label === updatedRow.period_label
          ? updatedRow
          : row
      )
    );
    documentService
      .getSummary(companyId, year)
      .then(setSummary)
      .catch(() => {});
  };

  // Agrupar por categoría
  const categoryGroups = matrix.reduce((acc, row) => {
    acc[row.category] = acc[row.category] || [];
    acc[row.category].push(row);
    return acc;
  }, {});

  // Dentro de cada categoría: separar documentos periódicos (mensual/bimestral,
  // agrupados por catalog_item_id en una tarjeta con cuadrícula) de los
  // documentos simples (único/anual, en tabla).
  const buildSections = (rows) => {
    const periodicMap = new Map();
    const simpleRows = [];

    rows.forEach((row) => {
      if (PERIODIC_TYPES.includes(row.periodicity)) {
        if (!periodicMap.has(row.catalog_item_id)) {
          periodicMap.set(row.catalog_item_id, {
            item: {
              catalog_item_id: row.catalog_item_id,
              code: row.code,
              name: row.name,
              periodicity: row.periodicity,
            },
            rows: [],
          });
        }
        periodicMap.get(row.catalog_item_id).rows.push(row);
      } else {
        simpleRows.push(row);
      }
    });

    return { periodicGroups: Array.from(periodicMap.values()), simpleRows };
  };

  // Años disponibles: desde que se registró la empresa hasta el próximo año.
  // Es persistente: a medida que pasa el tiempo, simplemente se suma un año más.
  const currentYear = new Date().getFullYear();
  const startYear = company?.created_at
    ? new Date(company.created_at).getFullYear()
    : currentYear;
  const yearOptions = [];
  for (let y = startYear; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate("/dashboard/empresas")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Empresas
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {company?.razon_social || "Gestión Documental"}
              </h2>
              {company && (
                <p className="text-sm text-gray-500">
                  RUC {company.ruc} · {company.num_trabajadores} trabajadores
                </p>
              )}
            </div>
          </div>
        </div>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              Año {y}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {SUMMARY_ORDER.map((key) => {
            const config = STATUS_CONFIG[key];
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"
              >
                <span className={`p-2 rounded-lg ${config.badgeClass}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xl font-bold text-gray-900">{summary[key]}</p>
                  <p className="text-xs text-gray-500">{config.label.split(" · ")[0]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : matrix.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No hay documentos del catálogo normativo aplicables a esta empresa.
          </p>
        </div>
      ) : (
        Object.entries(categoryGroups).map(([category, rows]) => {
          const { periodicGroups, simpleRows } = buildSections(rows);

          return (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">{category}</h3>

              {periodicGroups.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {periodicGroups.map(({ item, rows: itemRows }) => (
                    <PeriodicDocumentCard
                      key={item.catalog_item_id}
                      item={item}
                      rows={itemRows}
                      companyId={companyId}
                      canUpload={canUpload}
                      canValidate={canValidate}
                      canReplaceValidated={canReplaceValidated}
                      onChanged={handleRowChanged}
                    />
                  ))}
                </div>
              )}

              {simpleRows.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs font-semibold uppercase text-gray-400">
                        <tr>
                          <th className="px-4 py-2">Documento</th>
                          <th className="px-4 py-2">Período</th>
                          <th className="px-4 py-2">Estado</th>
                          <th className="px-4 py-2">Vence</th>
                          <th className="px-4 py-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {simpleRows.map((row) => (
                          <DocumentRow
                            key={`${row.catalog_item_id}-${row.period_label || "unico"}`}
                            row={row}
                            companyId={companyId}
                            canUpload={canUpload}
                            canValidate={canValidate}
                            canReplaceValidated={canReplaceValidated}
                            onChanged={handleRowChanged}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </DashboardLayout>
  );
};

export default DocumentMatrixPage;