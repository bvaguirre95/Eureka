import api from "./api";

const USERS_PREFIX = "/api/v1/users";

/**
 * params: { search, role_id, skip, limit }
 * Devuelve { items, total, skip, limit }
 */
const getUsers = async (params = {}) => {
  const response = await api.get(`${USERS_PREFIX}/`, { params });
  return response.data;
};

const getUser = async (userId) => {
  const response = await api.get(`${USERS_PREFIX}/${userId}`);
  return response.data;
};

/**
 * payload: { email, full_name, phone, password, role_id, company_ids, is_active }
 */
const createUser = async (payload) => {
  const response = await api.post(`${USERS_PREFIX}/`, payload);
  return response.data;
};

const updateUser = async (userId, payload) => {
  const response = await api.put(`${USERS_PREFIX}/${userId}`, payload);
  return response.data;
};

const deactivateUser = async (userId) => {
  const response = await api.delete(`${USERS_PREFIX}/${userId}`);
  return response.data;
};

const userService = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
};

export default userService;
