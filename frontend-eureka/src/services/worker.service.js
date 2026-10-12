import api from "./api";

const BASE = (companyId) => `/api/v1/companies/${companyId}/workers`;

const listWorkers = (companyId, params = {}) =>
  api.get(BASE(companyId), { params }).then(r => r.data);

const getWorker = (companyId, workerId) =>
  api.get(`${BASE(companyId)}/${workerId}`).then(r => r.data);

const createWorker = (companyId, data) =>
  api.post(BASE(companyId), data).then(r => r.data);

const updateWorker = (companyId, workerId, data) =>
  api.patch(`${BASE(companyId)}/${workerId}`, data).then(r => r.data);

const changeStatus = (companyId, workerId, data) =>
  api.patch(`${BASE(companyId)}/${workerId}/status`, data).then(r => r.data);

const getKpis = (companyId) =>
  api.get(`/api/v1/companies/${companyId}/workers-kpis`).then(r => r.data);

// Historial de puestos
const listPositions = (companyId, workerId) =>
  api.get(`${BASE(companyId)}/${workerId}/positions`).then(r => r.data);

const assignPosition = (companyId, workerId, data) =>
  api.post(`${BASE(companyId)}/${workerId}/positions`, data).then(r => r.data);

// Riesgos del puesto (futura integración con GERITRA)
const getWorkerRisks = (companyId, workerId) =>
  api.get(`${BASE(companyId)}/${workerId}/risks`).then(r => r.data);

const workerService = {
  listWorkers, getWorker, createWorker, updateWorker,
  changeStatus, getKpis,
  listPositions, assignPosition,
  getWorkerRisks,
};

export default workerService;