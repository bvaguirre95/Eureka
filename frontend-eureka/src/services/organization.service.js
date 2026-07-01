import api from "./api";

const ORGS_PREFIX = "/api/v1/organizations";

const getOrganizations = async (params = {}) => {
  const response = await api.get(`${ORGS_PREFIX}/`, { params });
  return response.data;
};

const getOrganization = async (orgId) => {
  const response = await api.get(`${ORGS_PREFIX}/${orgId}`);
  return response.data;
};

/**
 * payload: { name, org_type: "consultora" | "empresa_directa", ruc?, email?, phone?, city? }
 */
const createOrganization = async (payload) => {
  const response = await api.post(`${ORGS_PREFIX}/`, payload);
  return response.data;
};

const updateOrganization = async (orgId, payload) => {
  const response = await api.put(`${ORGS_PREFIX}/${orgId}`, payload);
  return response.data;
};

const organizationService = {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
};

export default organizationService;
