import React, { useEffect } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useOrganization } from "../../contexts/OrganizationContext";

/**
 * Barra contextual de selección de organización.
 * Visible SOLO para super-admin de plataforma.
 * Se renderiza entre el Topbar y el contenido principal.
 */
export const OrgSwitcher = () => {
  const { user } = useAuth();
  const { organizations, selectedOrgId, selectOrganization, loadOrganizations } = useOrganization();

  const isPlatformAdmin = !user?.organization;

  useEffect(() => {
    if (isPlatformAdmin && organizations.length === 0) {
      loadOrganizations();
    }
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) return null;

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-2">
      <div className="flex items-center gap-2.5 max-w-sm">
        {/* Ícono + etiqueta */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 flex-shrink-0">
          <Building2 className="w-3.5 h-3.5" />
          <span>Org:</span>
        </div>

        {/* Selector compacto */}
        <div className="relative flex-1">
          <select
            value={selectedOrgId || ""}
            onChange={(e) => selectOrganization(Number(e.target.value))}
            className="
              w-full appearance-none pl-2.5 pr-7 py-1.5
              text-sm font-medium text-gray-800
              bg-gray-50 border border-gray-200 rounded-lg
              hover:border-green-400 hover:bg-green-50
              focus:border-green-500 focus:ring-2 focus:ring-green-100
              outline-none transition-colors cursor-pointer
            "
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Badge super-admin */}
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          Super Admin
        </span>
      </div>
    </div>
  );
};

export default OrgSwitcher;