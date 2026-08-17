import React from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useEffect } from "react";
export const Topbar = ({ onOpenMenu }) => {
  const { user, logout } = useAuth();
  const { organizations, selectedOrgId, selectOrganization,loadOrganizations } = useOrganization();
  const isPlatformAdmin = !user?.organization;
   useEffect(() => {
  if (isPlatformAdmin) {
    loadOrganizations();
  }
}, [isPlatformAdmin]);  
  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const selectedOrgName = organizations.find(o => o.id === selectedOrgId)?.name || "";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-900">
            Gestión SST
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {user?.role?.name}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
            {initials}
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="px-4 sm:px-6 py-2 bg-gray-50 border-t border-gray-200">
        {/* Selector de organización — solo super admin */}
      {isPlatformAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-700 font-medium flex-shrink-0">
            🛡️ Modo super admin — Gestionar organización:
          </p>
          <select
            value={selectedOrgId || ""}
            onChange={e => selectOrganization(Number(e.target.value))}
            className="flex-1 px-4 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:border-amber-500 outline-none"
          >
            {organizations.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}
      </div>
    </header>
  );
};

export default Topbar;
