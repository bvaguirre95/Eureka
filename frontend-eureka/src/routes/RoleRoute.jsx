import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Restringe el acceso a una ruta según los permisos del usuario (OR) y,
 * opcionalmente, exige que sea super-admin de plataforma (sin organización).
 *
 * Uso:
 *   <PermissionRoute requiredPermissions={["users.view"]}>
 *     <UsersPage />
 *   </PermissionRoute>
 *
 *   <PermissionRoute platformAdminOnly>
 *     <OrganizationsPage />
 *   </PermissionRoute>
 */
export const PermissionRoute = ({ requiredPermissions = [], platformAdminOnly = false, children }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (platformAdminOnly && user.organization) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions.length > 0 && !hasPermission(...requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PermissionRoute;
