import { useAuth } from "../contexts/AuthContext";

/**
 * Hook centralizado de permisos.
 *
 * En lugar de llamar hasPermission("inspections.create") disperso por
 * todo el código, cada módulo expone un objeto con booleanos semánticos.
 *
 * Ventajas:
 * - Si renombras un permiso, cambias solo aquí.
 * - Los componentes hablan de "canCreate", no de códigos internos.
 * - Fácil de leer y testear.
 *
 * Uso:
 *   const { docs, diagnostics, inspections } = usePermissions();
 *   {docs.canUpload && <Button>Subir archivo</Button>}
 *   {inspections.canCreate && <Button>Nueva inspección</Button>}
 */
export const usePermissions = () => {
  const { hasPermission, user } = useAuth();

  return {
    // ── Meta ──────────────────────────────────────────────────────
    isPlatformAdmin: !user?.organization,

    // ── Usuarios ──────────────────────────────────────────────────
    users: {
      canView:   hasPermission("users.view"),
      canCreate: hasPermission("users.create"),
      canEdit:   hasPermission("users.edit"),
      canDelete: hasPermission("users.delete"),
    },

    // ── Empresas ──────────────────────────────────────────────────
    companies: {
      canView:   hasPermission("companies.view"),
      canCreate: hasPermission("companies.create"),
      canEdit:   hasPermission("companies.edit"),
      canDelete: hasPermission("companies.delete"),
    },

    // ── Roles ─────────────────────────────────────────────────────
    roles: {
      canView:   hasPermission("roles.view", "roles.manage"),
      canManage: hasPermission("roles.manage"),
    },

    // ── Gestión Documental ────────────────────────────────────────
    docs: {
      canView:             hasPermission("documents.view"),
      canUpload:           hasPermission("documents.upload"),
      canValidate:         hasPermission("documents.validate"),
      canReplaceValidated: hasPermission("documents.replace_validated"),
      canManageCatalog:    hasPermission("documents.manage_catalog"),
      // El rol "Empresa" solo ve documentos validados (no tiene upload)
      onlyValidated: !hasPermission("documents.upload") && !user?.organization === false,
    },

    // ── Configuración ─────────────────────────────────────────────
    settings: {
      canManage: hasPermission("settings.manage"),
    },

    // ── Diagnóstico Anexo 1 ───────────────────────────────────────
    diagnostics: {
      canView:   hasPermission("diagnostics.view"),
      canCreate: hasPermission("diagnostics.create"),
      canDelete: hasPermission("diagnostics.delete"),
    },

    // ── Inspecciones (próximo módulo) ─────────────────────────────
    // Al agregar los permisos en el backend y asignarlos a roles,
    // estos booleans empezarán a funcionar sin más cambios:
    inspections: {
      canView:   hasPermission("inspections.view"),
      canCreate: hasPermission("inspections.create"),
      canEdit:   hasPermission("inspections.edit"),
      canDelete: hasPermission("inspections.delete"),
    },

    // ── Capacitaciones ────────────────────────────────────────────
    training: {
      canView:   hasPermission("training.view"),
      canCreate: hasPermission("training.create"),
      canEdit:   hasPermission("training.edit"),
    },

    // ── Accidentes ────────────────────────────────────────────────
    accidents: {
      canView:   hasPermission("accidents.view"),
      canCreate: hasPermission("accidents.create"),
      canEdit:   hasPermission("accidents.edit"),
    },

    // ── Reportes ──────────────────────────────────────────────────
    reports: {
      canView:   hasPermission("reportes.view"),
      canExport: hasPermission("reportes.export"),
    },
  };
};

export default usePermissions;
