import api from "./api";

const prefix = (companyId) => `/api/v1/companies/${companyId}/diagnostics`;

const list = (companyId) => api.get(`${prefix(companyId)}/`).then(r => r.data);
const get = (companyId, id) => api.get(`${prefix(companyId)}/${id}`).then(r => r.data);
const create = (companyId, payload) => api.post(`${prefix(companyId)}/`, payload).then(r => r.data);
const update = (companyId, id, payload) => api.put(`${prefix(companyId)}/${id}`, payload).then(r => r.data);
const remove = (companyId, id) => api.delete(`${prefix(companyId)}/${id}`);

const downloadPdf = async (companyId, id, filename) => {
  const response = await api.get(`${prefix(companyId)}/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `diagnostico_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const diagnosticService = { list, get, create, update, remove, downloadPdf };
export default diagnosticService;
