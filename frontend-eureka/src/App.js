import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute, PublicRoute } from "./routes/PrivateRoute";
import { PermissionRoute } from "./routes/RoleRoute";

import LandingPage             from "./pages/LandingPage";
import DashboardPage           from "./pages/DashboardPage";
import UsersPage               from "./pages/UsersPage";
import RolesPage               from "./pages/RolesPage";
import CompaniesPage           from "./pages/CompaniesPage";
import CompanyHubPage          from "./pages/CompanyHubPage";
import DocumentMatrixPage      from "./pages/DocumentMatrixPage";
import DocumentCatalogPage     from "./pages/DocumentCatalogPage";
import SettingsPage            from "./pages/SettingsPage";
import SignersSettingsPage      from "./pages/SignersSettingsPage";
import { DiagnosticListPage }  from "./pages/DiagnosticListPage";
import { DiagnosticFormPage }  from "./pages/DiagnosticFormPage";
import InspectionTypesPage     from "./pages/InspectionTypesPage";
import InspectionTemplatesPage  from "./pages/InspectionTemplatesPage";
import InspectionListPage      from "./pages/InspectionListPage";
import { InspectionFormPage }  from "./pages/InspectionFormPage";
import { InspectionDashboardPage } from "./pages/InspectionDashboardPage";
import OrganizationsPage       from "./pages/OrganizationsPage";
import SequencePage            from "./pages/SequencePage";
import { GeritraPage }         from "./pages/GeritraPage";
import { GeritraMatrixPage }   from "./pages/GeritraMatrixPage";
import { GeritraConfigSection }  from "./components/geritra/GeritraConfigSection";
import CustomDocumentsPage       from "./pages/CustomDocumentsPage";
import DocumentAlertsPage        from "./pages/DocumentAlertsPage";
import JobPositionsPage           from "./pages/JobPositionsPage";
import WorkersPage                from "./pages/WorkersPage";
import WorkerDetailPage           from "./pages/WorkerDetailPage";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import EppPage       from "./pages/EppPage";
import EppConfigPage from "./pages/EppConfigPage";
import "./App.css";

// Wrapper reutilizable para rutas privadas con permisos
const PR = ({ perms, children }) => (
  <PrivateRoute>
    <PermissionRoute requiredPermissions={perms}>
      {children}
    </PermissionRoute>
  </PrivateRoute>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrganizationProvider>
                  <Routes>
          {/* ── Pública ─────────────────────────────────────────────────── */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />

          {/* ── Dashboard ───────────────────────────────────────────────── */}
          <Route path="/dashboard"
            element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

          {/* ── Solo super-admin ─────────────────────────────────────────── */}
          <Route path="/dashboard/secuencias"
            element={<PrivateRoute><PermissionRoute platformAdminOnly><SequencePage /></PermissionRoute></PrivateRoute>} />
          <Route path="/dashboard/organizaciones"
            element={<PrivateRoute><PermissionRoute platformAdminOnly><OrganizationsPage /></PermissionRoute></PrivateRoute>} />

          {/* ── Empresas ─────────────────────────────────────────────────── */}
          <Route path="/dashboard/empresas"
            element={<PR perms={["companies.view"]}><CompaniesPage /></PR>} />

          {/* HUB — punto de entrada a todos los módulos de una empresa */}
          <Route path="/dashboard/empresas/:companyId"
            element={<PR perms={["companies.view"]}><CompanyHubPage /></PR>} />

          {/* ── Inspecciones ─────────────────────────────────────────────── */}
          <Route path="/dashboard/tipos-inspeccion"
            element={<PR perms={["inspections.view","inspections.manage"]}><InspectionTypesPage /></PR>} />
          <Route path="/dashboard/plantillas-inspeccion"
            element={<PR perms={["inspections.view"]}><InspectionTemplatesPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/inspecciones/dashboard"
            element={<PR perms={["inspections.view"]}><InspectionDashboardPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/inspecciones"
            element={<PR perms={["inspections.view"]}><InspectionListPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/inspecciones/:inspectionId"
            element={<PR perms={["inspections.view"]}><InspectionFormPage /></PR>} />

          {/* ── GERITRA ──────────────────────────────────────────────────── */}
          <Route path="/dashboard/empresas/:companyId/geritra"
            element={<PR perms={["risks.view"]}><GeritraPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/puestos-trabajo"
            element={<PR perms={["risks.view"]}><JobPositionsPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/trabajadores"
            element={<PR perms={["workers.view"]}><WorkersPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/trabajadores/:workerId"
            element={<PR perms={["workers.view"]}><WorkerDetailPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/epp" 
            element={<PR perms={["epp.view"]}><EppPage /></PR>} />
          <Route path="/dashboard/configuracion/epp"
            element={<PR perms={["epp.manage"]}><EppConfigPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/geritra/:matrixId"
            element={<PR perms={["risks.view"]}><GeritraMatrixPage /></PR>} />

          {/* ── Diagnósticos ─────────────────────────────────────────────── */}
          <Route path="/dashboard/empresas/:companyId/diagnosticos"
            element={<PR perms={["diagnostics.view"]}><DiagnosticListPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/diagnosticos/:diagnosticId"
            element={<PR perms={["documents.view"]}><DiagnosticFormPage /></PR>} />

          {/* ── Documentos ───────────────────────────────────────────────── */}
          <Route path="/dashboard/empresas/:companyId/documentos"
            element={<PR perms={["documents.view"]}><DocumentMatrixPage /></PR>} />
          <Route path="/dashboard/empresas/:companyId/documentos-propios"
            element={<PR perms={["documents.view"]}><CustomDocumentsPage /></PR>} />
          <Route path="/dashboard/catalogo-documentos"
            element={<PR perms={["documents.view"]}><DocumentCatalogPage /></PR>} />
          <Route path="/dashboard/alertas-documentos"
            element={<PR perms={["documents.view"]}><DocumentAlertsPage /></PR>} />

          {/* ── Configuración ────────────────────────────────────────────── */}
          <Route path="/dashboard/configuracion/categorias-documentos"
            element={<PR perms={["settings.manage.category"]}><SettingsPage /></PR>} />
          <Route path="/dashboard/configuracion/firmantes"
            element={<PR perms={["settings.manage.signers"]}><SignersSettingsPage /></PR>} />
          <Route path="/dashboard/configuracion/geritra"
            element={<PR perms={["settings.manage.geritra"]}><GeritraConfigSection /></PR>} />

          {/* ── Usuarios y Roles ─────────────────────────────────────────── */}
          <Route path="/dashboard/usuarios"
            element={<PR perms={["users.view"]}><UsersPage /></PR>} />
          <Route path="/dashboard/roles"
            element={<PR perms={["roles.view","roles.manage"]}><RolesPage /></PR>} />

          {/* ── Fallback ─────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </OrganizationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;