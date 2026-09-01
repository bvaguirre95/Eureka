import React from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const Topbar = ({ onOpenMenu }) => {
  const { user, logout } = useAuth();

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Izquierda: hamburger + título */}
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

        {/* Derecha: info de usuario + logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {user?.role?.name}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
    </header>
  );
};

export default Topbar;