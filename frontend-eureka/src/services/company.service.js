import api from "./api";

const COMPANIES_PREFIX = "/api/v1/companies";

/**
 * params: { search, skip, limit }
 * Devuelve { items, total, skip, limit }
 */
const getCompanies = async (params = {}) => {
  const response = await api.get(`${COMPANIES_PREFIX}/`, { params });
  return response.data;
};

const getCompany = async (companyId) => {
  const response = await api.get(`${COMPANIES_PREFIX}/${companyId}`);
  return response.data;
};

const createCompany = async (payload) => {
  const response = await api.post(`${COMPANIES_PREFIX}/`, payload);
  return response.data;
};

const updateCompany = async (companyId, payload) => {
  const response = await api.put(`${COMPANIES_PREFIX}/${companyId}`, payload);
  return response.data;
};

const deactivateCompany = async (companyId) => {
  const response = await api.delete(`${COMPANIES_PREFIX}/${companyId}`);
  return response.data;
};

const uploadLogo = async (companyId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`${COMPANIES_PREFIX}/${companyId}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

const getLogo = async (companyId) => {
  const response = await api.get(`${COMPANIES_PREFIX}/${companyId}/logo`, {
    responseType: "blob",
  });
  return response.data;
};

const deleteLogo = async (companyId) => {
  const response = await api.delete(`${COMPANIES_PREFIX}/${companyId}/logo`);
  return response.data;
};

const companyService = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deactivateCompany,
  uploadLogo,
  getLogo,
  deleteLogo,
};

export default companyService;
