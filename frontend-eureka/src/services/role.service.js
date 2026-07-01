import api from "./api";

/**
 * orgId: requerido para super admin, ignorado para admin de organización
 * El backend resuelve automáticamente si es super admin o no.
 */
const getRoles = (orgId) => {
  const params = orgId ? { org_id: orgId } : {};
  return api.get("/api/v1/roles/", { params }).then(r => r.data);
};

const getPermissionsGrouped = () =>
  api.get("/api/v1/permissions/grouped").then(r => r.data);

const createRole = (payload, orgId) => {
  const params = orgId ? { org_id: orgId } : {};
  return api.post("/api/v1/roles/", payload, { params }).then(r => r.data);
};

const updateRole = (id, payload) =>
  api.put(`/api/v1/roles/${id}`, payload).then(r => r.data);

const deleteRole = (id) => api.delete(`/api/v1/roles/${id}`);

const roleService = { getRoles, getPermissionsGrouped, createRole, updateRole, deleteRole };
export default roleService;
