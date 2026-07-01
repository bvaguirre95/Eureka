import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute, PublicRoute } from "./routes/PrivateRoute";
import { PermissionRoute } from "./routes/RoleRoute";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import CompaniesPage from "./pages/CompaniesPage";
import DocumentMatrixPage from "./pages/DocumentMatrixPage";
import DocumentCatalogPage from "./pages/DocumentCatalogPage";
import SettingsPage from "./pages/SettingsPage";
import { DiagnosticListPage } from "./pages/DiagnosticListPage";
import { DiagnosticFormPage } from "./pages/DiagnosticFormPage";
import InspectionTypesPage from "./pages/InspectionTypesPage";
import InspectionListPage from "./pages/InspectionListPage";
import { InspectionFormPage } from "./pages/InspectionFormPage";
import { InspectionDashboardPage } from "./pages/InspectionDashboardPage";
import OrganizationsPage from "./pages/OrganizationsPage";

import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Ruta pública - Landing Page (incluye login) */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* Panel privado - el contenido se adapta según el rol */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          {/* Organizaciones (solo super-admin de plataforma) */}
          <Route
            path="/dashboard/organizaciones"
            element={
              <PrivateRoute>
                <PermissionRoute platformAdminOnly>
                  <OrganizationsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Empresas */}
          <Route
            path="/dashboard/empresas"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["companies.view"]}>
                  <CompaniesPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Tipos de inspección (configuración) */}
          <Route
            path="/dashboard/tipos-inspeccion"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["inspections.view", "inspections.manage"]}>
                  <InspectionTypesPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Dashboard de inspecciones por empresa */}
          <Route
            path="/dashboard/empresas/:companyId/inspecciones/dashboard"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["inspections.view"]}>
                  <InspectionDashboardPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Listado de inspecciones por empresa */}
          <Route
            path="/dashboard/empresas/:companyId/inspecciones"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["inspections.view"]}>
                  <InspectionListPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Formulario de inspección */}
          <Route
            path="/dashboard/empresas/:companyId/inspecciones/:inspectionId"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["inspections.view"]}>
                  <InspectionFormPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Diagnóstico Anexo 1 - lista por empresa */}
          <Route
            path="/dashboard/empresas/:companyId/diagnosticos"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["diagnostics.view"]}>
                  <DiagnosticListPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Diagnóstico Anexo 1 - formulario */}
          <Route
            path="/dashboard/empresas/:companyId/diagnosticos/:diagnosticId"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["documents.view"]}>
                  <DiagnosticFormPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Gestión Documental de una empresa */}
          <Route
            path="/dashboard/empresas/:companyId/documentos"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["documents.view"]}>
                  <DocumentMatrixPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Catálogo normativo de documentos */}
          <Route
            path="/dashboard/catalogo-documentos"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["documents.view"]}>
                  <DocumentCatalogPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Configuración (categorías) */}
          <Route
            path="/dashboard/configuracion"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["settings.view"]}>
                  <SettingsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Usuarios */}
          <Route
            path="/dashboard/usuarios"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["users.view"]}>
                  <UsersPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Roles y Permisos */}
          <Route
            path="/dashboard/roles"
            element={
              <PrivateRoute>
                <PermissionRoute requiredPermissions={["roles.view", "roles.manage"]}>
                  <RolesPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
