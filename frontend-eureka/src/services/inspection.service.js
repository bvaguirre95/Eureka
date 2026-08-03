import api from "./api";

const orgPrefix = (orgId) => `/api/v1/organizations/${orgId}/inspection-types`;
const cmpPrefix = (cId)   => `/api/v1/companies/${cId}/inspections`;

// ── Tipos de inspección ───────────────────────────────────────────────────────
const getTypes       = (orgId, onlyActive = false) =>
  api.get(orgPrefix(orgId), { params: { only_active: onlyActive } }).then(r => r.data);
const createType     = (orgId, payload) => api.post(orgPrefix(orgId), payload).then(r => r.data);
const updateType     = (orgId, id, p)   => api.put(`${orgPrefix(orgId)}/${id}`, p).then(r => r.data);
const deactivateType = (orgId, id)      => api.delete(`${orgPrefix(orgId)}/${id}`).then(r => r.data);
const getTemplates   = ()               => api.get("/api/v1/pdf-templates").then(r => r.data);

// ── Inspecciones ──────────────────────────────────────────────────────────────
const list   = (cId)          => api.get(`${cmpPrefix(cId)}/`).then(r => r.data);
const get    = (cId, id)      => api.get(`${cmpPrefix(cId)}/${id}`).then(r => r.data);
const create = (cId, payload) => api.post(`${cmpPrefix(cId)}/`, payload).then(r => r.data);
const update = (cId, id, p)   => api.put(`${cmpPrefix(cId)}/${id}`, p).then(r => r.data);
const remove = (cId, id)      => api.delete(`${cmpPrefix(cId)}/${id}`);

// ── Registros ─────────────────────────────────────────────────────────────────
const addRecord    = (cId, id, p)      => api.post(`${cmpPrefix(cId)}/${id}/records`, p).then(r => r.data);
const updateRecord = (cId, id, rid, p) => api.put(`${cmpPrefix(cId)}/${id}/records/${rid}`, p).then(r => r.data);
const deleteRecord = (cId, id, rid)    => api.delete(`${cmpPrefix(cId)}/${id}/records/${rid}`).then(r => r.data);

// ── Fotos de registro ─────────────────────────────────────────────────────────
const uploadRecordPhoto = async (cId, id, rId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`${cmpPrefix(cId)}/${id}/records/${rId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};
const deleteRecordPhoto = (cId, id, rId) =>
  api.delete(`${cmpPrefix(cId)}/${id}/records/${rId}/photo`).then(r => r.data);

// ── Acciones correctivas ──────────────────────────────────────────────────────
const createAction = (cId, id, p)      => api.post(`${cmpPrefix(cId)}/${id}/actions`, p).then(r => r.data);
const updateAction = (cId, id, aid, p) => api.put(`${cmpPrefix(cId)}/${id}/actions/${aid}`, p).then(r => r.data);
const deleteAction = (cId, id, aid)    => api.delete(`${cmpPrefix(cId)}/${id}/actions/${aid}`);

// ── Firmantes de empresa ──────────────────────────────────────────────────────
const getSigners    = (cId)         => api.get(`/api/v1/companies/${cId}/signers`).then(r => r.data);
const updateSigners = (cId, payload) => api.put(`/api/v1/companies/${cId}/signers`, payload).then(r => r.data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const getDashboard = (cId) =>
  api.get(`/api/v1/companies/${cId}/inspections-dashboard`).then(r => r.data);

// ── PDF ───────────────────────────────────────────────────────────────────────
const downloadPdf = async (cId, id, filename, doc = "ambos") => {
  const r = await api.get(`${cmpPrefix(cId)}/${id}/pdf`,
    { responseType: "blob", params: { doc } });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `inspeccion_${id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};
const closeInspection = (cId, id) => api.post(`${cmpPrefix(cId)}/${id}/close`);

// ── Plantillas de inspección ─────────────────────────────────────────────────
const getInspectionTemplates = (params = {}) =>
  api.get("/api/v1/inspection-templates", { params }).then(r => r.data);
const getInspectionTemplate = (id) =>
  api.get(`/api/v1/inspection-templates/${id}`).then(r => r.data);
const createInspectionTemplate = (payload) =>
  api.post("/api/v1/inspection-templates", payload).then(r => r.data);
const updateInspectionTemplate = (id, payload) =>
  api.put(`/api/v1/inspection-templates/${id}`, payload).then(r => r.data);
const deleteInspectionTemplate = (id) =>
  api.delete(`/api/v1/inspection-templates/${id}`);
const copyInspectionTemplate = (id, payload = {}) =>
  api.post(`/api/v1/inspection-templates/${id}/copy`, payload).then(r => r.data);
const useInspectionTemplate = (id, payload = {}) =>
  api.post(`/api/v1/inspection-templates/${id}/use`, payload).then(r => r.data);
const createGlobalTemplate = (payload) =>
  api.post("/api/v1/inspection-templates/global", payload).then(r => r.data);

const analyzeExcel = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/api/v1/inspection-templates/import-excel/analyze", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};
const confirmExcelImport = (payload) =>
  api.post("/api/v1/inspection-templates/import-excel/confirm", payload).then(r => r.data);

const inspectionService = {
  getTypes, createType, updateType, deactivateType, getTemplates,
  getInspectionTemplates, getInspectionTemplate,
  createInspectionTemplate, updateInspectionTemplate, deleteInspectionTemplate,
  copyInspectionTemplate, useInspectionTemplate, createGlobalTemplate,
  analyzeExcel, confirmExcelImport,
  list, get, create, update, remove,
  addRecord, updateRecord, deleteRecord,
  uploadRecordPhoto, deleteRecordPhoto,
  createAction, updateAction, deleteAction,
  getSigners, updateSigners,
  getDashboard, downloadPdf,closeInspection
};
export default inspectionService;