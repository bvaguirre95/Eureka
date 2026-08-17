import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import organizationService from "../services/organization.service";

const OrganizationContext = createContext(null);

export const OrganizationProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOrganizations = async () => {
    setLoading(true);

    try {
      const data = await organizationService.getOrganizations({
        limit: 100,
      });

      const list = data.items || [];

      setOrganizations(list);

      // Si todavía no hay organización seleccionada,
      // seleccionar la primera.
      if (list.length > 0) {
        setSelectedOrgId((current) => current || list[0].id);
      }
    } catch (error) {
      console.error("Error cargando organizaciones:", error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = (orgId) => {
    setSelectedOrgId(orgId);
  };

  const selectedOrganization =
    organizations.find((org) => org.id === selectedOrgId) || null;

  const value = {
    organizations,
    selectedOrgId,
    selectedOrganization,
    selectOrganization,
    loadOrganizations,
    loading,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      "useOrganization debe usarse dentro de <OrganizationProvider>"
    );
  }

  return context;
};

export default OrganizationContext;