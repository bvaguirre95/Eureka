import React from "react";

const STATUS_CONFIG = {
  activo:     { label: "Activo",     cls: "bg-green-100 text-green-700"   },
  inactivo:   { label: "Inactivo",   cls: "bg-yellow-100 text-yellow-700" },
  suspendido: { label: "Suspendido", cls: "bg-orange-100 text-orange-700" },
  retirado:   { label: "Retirado",   cls: "bg-gray-100 text-gray-500"     },
};

export const WorkerStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
      text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};