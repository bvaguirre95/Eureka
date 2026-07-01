import {
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

/**
 * Definición centralizada del menú. Cada nuevo módulo se agrega aquí como
 * una entrada más, indicando con qué permiso(s) se habilita (OR) y, opcionalmente,
 * una condición extra `show(user)` para casos especiales (ej. super-admin).
 *
 * - `permissions: []` -> visible para cualquier usuario autenticado.
 * - `enabled: false` -> se muestra como "Próximamente".
 * - `show(user)` -> si se define, además de los permisos, debe cumplirse esta condición.
 */
export const MENU_ITEMS = [
  {
    label: "Inicio",
    path: "/dashboard",
    icon: Home,
    permissions: [],
    enabled: true,
  },
  {
    label: "Organizaciones",
    path: "/dashboard/organizaciones",
    icon: Briefcase,
    permissions: [],
    enabled: true,
    // Solo el super-admin de plataforma (sin organización) ve este módulo.
    show: (user) => !user?.organization,
  },
  {
    label: "Empresas",
    path: "/dashboard/empresas",
    icon: Building2,
    permissions: ["companies.view"],
    enabled: true,
  },
  {
    label: "Catálogo Normativo",
    path: "/dashboard/catalogo-documentos",
    icon: FileText,
    permissions: ["documents.view"],
    enabled: true,
  },
  {
    label: "Configuración",
    path: "/dashboard/configuracion",
    icon: Settings,
    permissions: ["documents.view"],
    enabled: true,
  },
  {
    label: "Tipos de Inspección",
    path: "/dashboard/tipos-inspeccion",
    icon: ClipboardCheck,
    permissions: ["inspections.manage"],
    enabled: true,
  },
  {
    label: "Usuarios",
    path: "/dashboard/usuarios",
    icon: Users,
    permissions: ["users.view"],
    enabled: true,
  },
  {
    label: "Roles y Permisos",
    path: "/dashboard/roles",
    icon: ShieldCheck,
    permissions: ["roles.view", "roles.manage"],
    enabled: true,
  },
  {
    label: "Reportes",
    path: "/dashboard/reportes",
    icon: ClipboardList,
    permissions: ["companies.view"],
    enabled: false,
  },
];

/**
 * Filtra el menú según los permisos y el usuario.
 * @param {(...codes: string[]) => boolean} hasPermission
 * @param {object} user
 */
export const getMenuForUser = (hasPermission, user) =>
  MENU_ITEMS.filter((item) => {
    const permissionOk =
      item.permissions.length === 0 || hasPermission(...item.permissions);
    const showOk = item.show ? item.show(user) : true;
    return permissionOk && showOk;
  });
