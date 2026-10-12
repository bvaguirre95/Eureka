import React,{useState} from "react";
import { NavLink } from "react-router-dom";
import { X,ChevronDown } from "lucide-react";
import { getMenuForUser } from "../../config/menu";
import { useAuth } from "../../contexts/AuthContext";
import MenuItem from "../layout/MenuItem";
const SidebarContent = ({ onNavigate }) => {
  const { hasPermission, user } = useAuth();
  const menu = getMenuForUser(hasPermission, user);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <img
          src="/logo.png"
          alt="EUREKA"
          className="h-9 w-9 rounded-full bg-white/10"
        />
        <div>
          <p className="text-white font-bold leading-tight">EUREKA</p>
          <p className="text-green-300 text-xs leading-tight">Gestión SST</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.path}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 cursor-not-allowed select-none"
                title="Próximamente"
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded-full">
                  Pronto
                </span>
              </div>
            );
          }
          if (item.children?.length > 0) {
            return (
            <MenuItem
            key={item.label}
            item={item}
            onNavigate={onNavigate}
            />
          );
        }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-green-50/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-xs text-green-100/70">
        Consultora Eureka &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
};

export const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Sidebar fijo en desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-b from-green-700 via-emerald-700 to-teal-800">
        <SidebarContent />
      </aside>

      {/* Drawer en móvil/tablet */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-green-700 via-emerald-700 to-teal-800 shadow-2xl transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
