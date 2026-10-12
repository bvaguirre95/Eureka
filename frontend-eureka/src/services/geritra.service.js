import api from "./api";

const BASE = "/api/v1";

// ── Categorías de riesgo ──────────────────────────────────────────────────────
const getCategories = (orgId) =>
  api.get(`${BASE}/organizations/${orgId}/risk-categories`).then(r => r.data);

const createCategory = (orgId, data) =>
  api.post(`${BASE}/organizations/${orgId}/risk-categories`, data).then(r => r.data);

const updateCategory = (orgId, catId, data) =>
  api.patch(`${BASE}/organizations/${orgId}/risk-categories/${catId}`, data).then(r => r.data);

const deleteCategory = (orgId, catId) =>
  api.delete(`${BASE}/organizations/${orgId}/risk-categories/${catId}`);

// ── Factores de riesgo ────────────────────────────────────────────────────────
const getFactors = (orgId, categoryId = null) =>
  api.get(`${BASE}/organizations/${orgId}/risk-factors`,
    { params: categoryId ? { category_id: categoryId } : {} }).then(r => r.data);

const createFactor = (orgId, data) =>
  api.post(`${BASE}/organizations/${orgId}/risk-factors`, data).then(r => r.data);

const updateFactor = (orgId, factorId, data) =>
  api.patch(`${BASE}/organizations/${orgId}/risk-factors/${factorId}`, data).then(r => r.data);

const deleteFactor = (orgId, factorId) =>
  api.delete(`${BASE}/organizations/${orgId}/risk-factors/${factorId}`);

// ── Puestos de trabajo ────────────────────────────────────────────────────────
const getJobPositions = (companyId) =>
  api.get(`${BASE}/companies/${companyId}/job-positions`).then(r => r.data);

const createJobPosition = (companyId, data) =>
  api.post(`${BASE}/companies/${companyId}/job-positions`, data).then(r => r.data);

const updateJobPosition = (companyId, posId, data) =>
  api.patch(`${BASE}/companies/${companyId}/job-positions/${posId}`, data).then(r => r.data);

const deleteJobPosition = (companyId, posId) =>
  api.delete(`${BASE}/companies/${companyId}/job-positions/${posId}`);

// ── Matrices GERITRA ──────────────────────────────────────────────────────────
const getMatrices = (companyId) =>
  api.get(`${BASE}/companies/${companyId}/risk-matrices`).then(r => r.data);

const getMatrix = (companyId, matrixId) =>
  api.get(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}`).then(r => r.data);

const createMatrix = (companyId, positionId, data) =>
  api.post(`${BASE}/companies/${companyId}/job-positions/${positionId}/risk-matrices`, data)
    .then(r => r.data);

const updateMatrix = (companyId, matrixId, data) =>
  api.patch(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}`, data).then(r => r.data);

const deleteMatrix = (companyId, matrixId) =>
  api.delete(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}`);

// ── Filas de riesgo ───────────────────────────────────────────────────────────
const addRow = (companyId, matrixId, data) =>
  api.post(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/rows`, data)
    .then(r => r.data);

const updateRow = (companyId, matrixId, rowId, data) =>
  api.patch(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/rows/${rowId}`, data)
    .then(r => r.data);

const deleteRow = (companyId, matrixId, rowId) =>
  api.delete(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/rows/${rowId}`);

// ── Controles ─────────────────────────────────────────────────────────────────
const addControl = (companyId, matrixId, rowId, data) =>
  api.post(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/rows/${rowId}/controls`, data)
    .then(r => r.data);

const deleteControl = (companyId, matrixId, rowId, ctrlId) =>
  api.delete(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/rows/${rowId}/controls/${ctrlId}`);

// ── Acciones correctivas ──────────────────────────────────────────────────────
const getActions = (companyId, matrixId) =>
  api.get(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/actions`).then(r => r.data);

const updateAction = (companyId, matrixId, actionId, data) =>
  api.patch(`${BASE}/companies/${companyId}/risk-matrices/${matrixId}/actions/${actionId}`, data)
    .then(r => r.data);

const geritraService = {
  getCategories, createCategory, updateCategory, deleteCategory,
  getFactors, createFactor, updateFactor, deleteFactor,
  getJobPositions, createJobPosition, updateJobPosition, deleteJobPosition,
  getMatrices, getMatrix, createMatrix, updateMatrix, deleteMatrix,
  addRow, updateRow, deleteRow,
  addControl, deleteControl,
  getActions, updateAction,
};

export default geritraService;
