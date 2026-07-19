import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
const MenuItem = ({ item, onNavigate }) => {
  const [open, setOpen] = useState(false);

  const Icon = item.icon;

  return (
    <div>
      {/* Elemento principal */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-50/80 hover:bg-white/10 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          {item.label}
        </span>

        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Submenú */}
      {open && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children.map((child) => {
            const ChildIcon = child.icon;

            return (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-green-100/70 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <ChildIcon className="w-4 h-4" />
                {child.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MenuItem;