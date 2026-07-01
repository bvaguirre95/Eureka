import React, { useState } from "react";
import { FileText } from "lucide-react";
import { PeriodDetailModal } from "./PeriodDetailModal";
import { STATUS_CONFIG, getShortPeriodLabel } from "./documentStatus";

/**
 * Tarjeta para documentos de periodicidad mensual/bimestral: muestra el
 * nombre del documento, cuántos períodos están cargados, y una cuadrícula
 * con un badge por período (clicable para ver detalle/cargar/validar).
 */
export const PeriodicDocumentCard = ({ item, rows, companyId, canUpload, canValidate, canReplaceValidated, onChanged }) => {
  const [selectedRow, setSelectedRow] = useState(null);

  const totalPeriods = rows.length;
  const loadedCount = rows.filter((r) => r.has_file).length;

  const handleChanged = (updatedRow) => {
    onChanged(updatedRow);
    setSelectedRow(updatedRow);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg mt-0.5">
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
              {item.name}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.code} ·{" "}
              {item.periodicity === "mensual"
                ? "12 informes mensuales por año"
                : "6 informes bimestrales por año"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3 ml-11">
        Cargados: {loadedCount} de {totalPeriods}
      </p>

      <div
        className={`grid gap-2 ml-0 sm:ml-11 ${
          item.periodicity === "mensual" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
        }`}
      >
        {rows.map((row) => {
          const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.pendiente;
          return (
            <button
              key={`${row.catalog_item_id}-${row.period_label}`}
              onClick={() => setSelectedRow(row)}
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                {getShortPeriodLabel(row.period_label, item.periodicity)}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${config.badgeClass}`}
              >
                {config.label.split(" · ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      <PeriodDetailModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        row={selectedRow}
        companyId={companyId}
        canUpload={canUpload}
        canValidate={canValidate}
        canReplaceValidated={canReplaceValidated}
        onChanged={handleChanged}
      />
    </div>
  );
};

export default PeriodicDocumentCard;