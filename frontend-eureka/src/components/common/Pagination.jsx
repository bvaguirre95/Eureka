import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginación simple basada en skip/limit + total (server-side).
 */
export const Pagination = ({ total, skip, limit, onPageChange }) => {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (total === 0) return null;

  const from = skip + 1;
  const to = Math.min(skip + limit, total);

  const goTo = (page) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    onPageChange((safePage - 1) * limit);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{from}</span>–
        <span className="font-medium text-gray-700">{to}</span> de{" "}
        <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-gray-600 px-2">
          Página {currentPage} de {totalPages}
        </span>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
