import api from "./api";
const getTypes= (orgId) => api.get(orgPrefix(orgId)).then(r => r.data);
const createType = (orgId, payload) => api.post(orgPrefix(orgId), payload).then(r => r.data);
const updateType = (orgId, id, p) => api.put(`${orgPrefix(orgId)}/${id}`, p).then(r => r.data);
const deactivateType = (orgId, id) => api.delete(`${orgPrefix(orgId)}/${id}`).then(r => r.data);
const getTemplates = () => api.get("/api/v1/sequence-templates").then(r => r.data);
const list = (cId) => api.get(`${cmpPrefix(cId)}/`).then(r => r.data);
const get = (cId, id) => api.get(`${cmpPrefix(cId)}/${id}`).then(r => r.data);
const create = (cId, payload) => api.post(`${cmpPrefix(cId)}/`, payload).then(r => r.data);
const update = (cId, id, p) => api.put(`${cmpPrefix(cId)}/${id}`, p).then(r => r.data);
const remove = (cId, id) => api.delete(`${cmpPrefix(cId)}/${id}`);
const sequenceService = {
  getTypes,
  createType,
    updateType,
    deactivateType,
    getTemplates,
    list,
    get,
    create,
    update,
    remove,
};
export default sequenceService;