import { CheckCircle2, Clock, FileX, Upload, XCircle } from "lucide-react";

export const STATUS_CONFIG = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    badgeClass: "bg-gray-100 text-gray-600",
  },
  cargado: {
    label: "Cargado · Pendiente de validar",
    icon: Upload,
    badgeClass: "bg-amber-100 text-amber-700",
  },
  validado: {
    label: "Validado",
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-700",
  },
  rechazado: {
    label: "Rechazado",
    icon: XCircle,
    badgeClass: "bg-red-100 text-red-700",
  },
  vencido: {
    label: "Vencido",
    icon: FileX,
    badgeClass: "bg-red-100 text-red-700",
  },
};

export const PERIODICITY_LABELS = {
  unico: "Único",
  anual: "Anual",
  mensual: "Mensual",
  bimestral: "Bimestral",
};

const SHORT_MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Devuelve una etiqueta corta para un período, usada en las cuadrículas
 * de documentos mensuales/bimestrales (ej. "Ene", "Ene-Feb").
 */
export const getShortPeriodLabel = (periodLabel, periodicity) => {
  if (!periodLabel) return "";

  if (periodicity === "mensual") {
    const month = parseInt(periodLabel.split("-")[1], 10);
    return SHORT_MONTHS[month - 1] || periodLabel;
  }

  if (periodicity === "bimestral") {
    const bimester = parseInt(periodLabel.split("-B")[1], 10);
    if (!bimester) return periodLabel;
    const startMonth = bimester * 2 - 2;
    const endMonth = bimester * 2 - 1;
    return `${SHORT_MONTHS[startMonth]}-${SHORT_MONTHS[endMonth]}`;
  }

  return periodLabel;
};
