/**
 * ═══════════════════════════════════════════════════════════════════
 * GUÍA: Cómo agregar un módulo nuevo al sistema
 * ═══════════════════════════════════════════════════════════════════
 *
 * El frontend NO necesita saber de antemano qué permisos existen —
 * los checkboxes del modal de Roles se generan automáticamente desde
 * GET /permissions/grouped. Solo necesitas hacer 3 cosas aquí:
 *
 * ─── PASO 1: Backend (permissions_catalog.py) ───────────────────
 * Agrega los permisos del módulo:
 *
 *   ("inspections.view",   "Inspecciones", "Ver inspecciones",    "..."),
 *   ("inspections.create", "Inspecciones", "Crear inspecciones",  "..."),
 *   ("inspections.edit",   "Inspecciones", "Editar inspecciones", "..."),
 *   ("inspections.delete", "Inspecciones", "Eliminar inspecciones","..."),
 *
 * Reinicia el backend → se sincronizan solos → aparecen en el modal de Roles.
 *
 * ─── PASO 2: Menú (menu.js) ─────────────────────────────────────
 * Agrega una entrada en MENU_ITEMS:
 *
 *   {
 *     label: "Inspecciones",
 *     path: "/dashboard/inspecciones",
 *     icon: ClipboardCheck,
 *     permissions: ["inspections.view"],
 *     enabled: true,
 *   }
 *
 * ─── PASO 3: Rutas (App.js) ─────────────────────────────────────
 * Agrega la ruta protegida:
 *
 *   <Route
 *     path="/dashboard/inspecciones"
 *     element={
 *       <PrivateRoute>
 *         <PermissionRoute requiredPermissions={["inspections.view"]}>
 *           <InspeccionesPage />
 *         </PermissionRoute>
 *       </PrivateRoute>
 *     }
 *   />
 *
 * ─── Dentro de tus componentes ──────────────────────────────────
 * Usa hasPermission() del AuthContext para controlar botones/acciones:
 *
 *   const { hasPermission } = useAuth();
 *   const canCreate = hasPermission("inspections.create");
 *   const canEdit   = hasPermission("inspections.edit");
 *   const canDelete = hasPermission("inspections.delete");
 *
 *   {canCreate && <Button>Nueva inspección</Button>}
 *   {canEdit   && <button onClick={...}>Editar</button>}
 *
 * ═══════════════════════════════════════════════════════════════════
 * MÓDULOS ACTUALES DEL SISTEMA
 * ═══════════════════════════════════════════════════════════════════
 */

export const MODULE_REGISTRY = [
  {
    key: "usuarios",
    label: "Usuarios",
    permissions: ["users.view", "users.create", "users.edit", "users.delete"],
    route: "/dashboard/usuarios",
    status: "activo",
  },
  {
    key: "empresas",
    label: "Empresas",
    permissions: ["companies.view", "companies.create", "companies.edit", "companies.delete"],
    route: "/dashboard/empresas",
    status: "activo",
  },
  {
    key: "roles",
    label: "Roles y Permisos",
    permissions: ["roles.view", "roles.manage"],
    route: "/dashboard/roles",
    status: "activo",
  },
  {
    key: "documentos",
    label: "Gestión Documental",
    permissions: [
      "documents.view",
      "documents.upload",
      "documents.validate",
      "documents.replace_validated",
      "documents.manage_catalog",
    ],
    route: "/dashboard/empresas/:id/documentos",
    status: "activo",
  },
  {
    key: "configuracion",
    label: "Configuración",
    permissions: ["settings.manage"],
    route: "/dashboard/configuracion",
    status: "activo",
  },
  {
    key: "diagnosticos",
    label: "Diagnóstico Anexo 1",
    permissions: ["diagnostics.view", "diagnostics.create", "diagnostics.delete"],
    route: "/dashboard/empresas/:id/diagnosticos",
    status: "activo",
  },
  // ── Módulos futuros ──────────────────────────────────────────────
  {
    key: "inspecciones",
    label: "Gestión de Inspecciones",
    permissions: ["inspections.view", "inspections.create", "inspections.edit", "inspections.delete"],
    route: "/dashboard/inspecciones",
    status: "pendiente",
    notes: "Actas de inspección SST por empresa",
  },
  {
    key: "reportes",
    label: "Reportes",
    permissions: ["reportes.view", "reportes.export"],
    route: "/dashboard/reportes",
    status: "pendiente",
    notes: "Reportes de cumplimiento documental y diagnósticos",
  },
  {
    key: "capacitaciones",
    label: "Registro de Capacitaciones",
    permissions: ["training.view", "training.create", "training.edit"],
    route: "/dashboard/capacitaciones",
    status: "pendiente",
    notes: "Plan anual de capacitación y registros de asistencia",
  },
  {
    key: "accidentes",
    label: "Investigación de Accidentes",
    permissions: ["accidents.view", "accidents.create", "accidents.edit"],
    route: "/dashboard/accidentes",
    status: "pendiente",
    notes: "Registro e investigación de accidentes e incidentes",
  },
];

/**
 * Hook-less helper para verificar si un usuario tiene acceso a un módulo.
 * Uso: moduleIsVisible("documentos", hasPermission)
 */
export const moduleIsVisible = (moduleKey, hasPermission) => {
  const mod = MODULE_REGISTRY.find(m => m.key === moduleKey);
  if (!mod || mod.status !== "activo") return false;
  return mod.permissions.length === 0 || hasPermission(...mod.permissions);
};
