import api from "./api";

const BASE = "/api/v1";

const getConfig = (orgId) =>
  api.get(`${BASE}/organizations/${orgId}/document-alerts/config`).then(r => r.data);

const updateConfig = (orgId, data) =>
  api.put(`${BASE}/organizations/${orgId}/document-alerts/config`, data).then(r => r.data);

const getExpiring = (orgId, { days = 60, includeOverdue = true } = {}) =>
  api.get(`${BASE}/organizations/${orgId}/document-alerts/expiring`, {
    params: { days, include_overdue: includeOverdue },
  }).then(r => r.data);

const runNow = (orgId) =>
  api.post(`${BASE}/organizations/${orgId}/document-alerts/run`).then(r => r.data);

const documentAlertService = { getConfig, updateConfig, getExpiring, runNow };
export default documentAlertService;