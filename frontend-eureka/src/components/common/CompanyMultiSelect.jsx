import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, Loader, Search, X } from "lucide-react";
import companyService from "../../services/company.service";
import { useDebounce } from "../../hooks/useDebounce";

/**
 * Selector múltiple de empresas pensado para bases grandes (20k+ registros):
 * nunca carga el catálogo completo, busca en el backend (paginado) a medida
 * que el usuario escribe.
 *
 * value: array de objetos { id, razon_social, ruc }
 * onChange: (nuevoArray) => void
 */
export const CompanyMultiSelect = ({ value = [], onChange, disabled = false }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await companyService.getCompanies({
          search: debouncedQuery || undefined,
          limit: 10,
        });
        setResults(data.items || []);
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchResults();
    }
  }, [debouncedQuery, open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSelected = (companyId) => value.some((c) => c.id === companyId);

  const toggleCompany = (company) => {
    if (isSelected(company.id)) {
      onChange(value.filter((c) => c.id !== company.id));
    } else {
      onChange([...value, company]);
    }
  };

  const removeCompany = (companyId) => {
    onChange(value.filter((c) => c.id !== companyId));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Empresas seleccionadas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((company) => (
            <span
              key={company.id}
              className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
            >
              <Building2 className="w-3 h-3" />
              {company.razon_social}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCompany(company.id)}
                  className="hover:bg-green-200 rounded-full p-0.5"
                  aria-label={`Quitar ${company.razon_social}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Buscar empresa por nombre o RUC..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
          />

          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-3">
                  {query
                    ? "Sin resultados"
                    : "Escribe para buscar empresas"}
                </p>
              ) : (
                results.map((company) => (
                  <button
                    type="button"
                    key={company.id}
                    onClick={() => toggleCompany(company)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left hover:bg-green-50 transition-colors"
                  >
                    <span className="truncate">
                      <span className="font-medium text-gray-800">
                        {company.razon_social}
                      </span>
                      <span className="text-gray-400 ml-2">{company.ruc}</span>
                    </span>
                    {isSelected(company.id) && (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyMultiSelect;
