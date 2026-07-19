import {
  Activity,
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Hash,
  Home,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Children } from "react";

export const MENU_ITEMS = [
  {
    label: "Inicio",
    path: "/dashboard",
    icon: Home,
    permissions: [],
    enabled: true,
  },
  // ── Solo super-admin (sin organización) ───────────────────────────────────
  {
    label: "Organizaciones",
    path: "/dashboard/organizaciones",
    icon: Briefcase,
    permissions: [],
    enabled: true,
    show: (user) => !user?.organization,
  },
  {
    label: "Secuencias",
    path: "/dashboard/secuencias",
    icon: Hash,
    permissions: [],
    enabled: true,
    show: (user) => !user?.organization,
  },
  // ── Todos los usuarios con organización ───────────────────────────────────
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
    icon: Settings,
    permissions: ["settings.view", "documents.view"],
    enabled: true,
    children: [
      {
        label: "Categorías de Documentos",
        path: "/dashboard/configuracion/categorias-documentos",
        icon: FileText,
        permissions: ["settings.manage.category"],
        enabled: true,
      },
      {
        label: "GERITRA",
        path: "/dashboard/configuracion/geritra",
        icon: ShieldCheck,
        permissions: ["settings.manage.geritra"],
        enabled: true,
      },
    ],
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
  MENU_ITEMS
    .filter((item) => {
      const permissionOk =
        item.permissions.length === 0 ||
        hasPermission(...item.permissions);

      const showOk = item.show ? item.show(user) : true;

      return permissionOk && showOk;
    })
    .map((item) => {
      // Si no tiene submenús, se devuelve normalmente
      if (!item.children) {
        return item;
      }

      // Filtrar los submenús según permisos
      const children = item.children.filter((child) => {
        const permissionOk =
          child.permissions.length === 0 ||
          hasPermission(...child.permissions);

        return permissionOk;
      });

      // Si no tiene ningún submenú visible,
      // no mostramos el menú padre
      if (children.length === 0) {
        return null;
      }

      return {
        ...item,
        children,
      };
    })
    .filter(Boolean);