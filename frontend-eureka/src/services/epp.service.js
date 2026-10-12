import api from "./api";

const ORG  = (orgId)     => `/api/v1/organizations/${orgId}`;
const COMP = (companyId) => `/api/v1/companies/${companyId}`;

// ── Tipos de EPP ──────────────────────────────────────────────────────────────
const listTypes   = (orgId, params = {}) =>
  api.get(`${ORG(orgId)}/epp-types`, { params }).then(r => r.data);
const createType  = (orgId, data)    =>
  api.post(`${ORG(orgId)}/epp-types`, data).then(r => r.data);
const updateType  = (orgId, id, data) =>
  api.patch(`${ORG(orgId)}/epp-types/${id}`, data).then(r => r.data);
const deleteType  = (orgId, id)      =>
  api.delete(`${ORG(orgId)}/epp-types/${id}`);

// ── Catálogo ──────────────────────────────────────────────────────────────────
const listCatalog   = (orgId, params = {}) =>
  api.get(`${ORG(orgId)}/epp-catalog`, { params }).then(r => r.data);
const createCatalog = (orgId, data)        =>
  api.post(`${ORG(orgId)}/epp-catalog`, data).then(r => r.data);
const updateCatalog = (orgId, id, data)    =>
  api.patch(`${ORG(orgId)}/epp-catalog/${id}`, data).then(r => r.data);

// ── Entregas ──────────────────────────────────────────────────────────────────
const listCompanyDeliveries = (companyId, params = {}) =>
  api.get(`${COMP(companyId)}/epp`, { params }).then(r => r.data);
const getKpis               = (companyId) =>
  api.get(`${COMP(companyId)}/epp-kpis`).then(r => r.data);
const listWorkerDeliveries  = (companyId, workerId) =>
  api.get(`${COMP(companyId)}/workers/${workerId}/epp`).then(r => r.data);
const createDelivery        = (companyId, workerId, data) =>
  api.post(`${COMP(companyId)}/workers/${workerId}/epp`, data).then(r => r.data);
const updateDelivery        = (companyId, workerId, deliveryId, data) =>
  api.patch(`${COMP(companyId)}/workers/${workerId}/epp/${deliveryId}`, data).then(r => r.data);

const eppService = {
  listTypes, createType, updateType, deleteType,
  listCatalog, createCatalog, updateCatalog,
  listCompanyDeliveries, getKpis,
  listWorkerDeliveries, createDelivery, updateDelivery,
};

export default eppService;
