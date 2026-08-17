import api from "./api";

const CATALOG_PREFIX = "/api/v1/document-catalog";
const CATEGORIES_PREFIX = "/api/v1/document-categories";

const companyDocsPrefix = (companyId) => `/api/v1/companies/${companyId}/documents`;

// ---------------------------------------------------------------------------
// Matriz de documentos por empresa
// ---------------------------------------------------------------------------

const getMatrix = async (companyId, year) => {
  const response = await api.get(`${companyDocsPrefix(companyId)}/`, {
    params: year ? { year } : {},
  });
  return response.data;
};

const getSummary = async (companyId, year) => {
  const response = await api.get(`${companyDocsPrefix(companyId)}/summary`, {
    params: year ? { year } : {},
  });
  return response.data;
};

const uploadDocument = async (companyId, { catalogItemId, periodLabel, file }) => {
  const formData = new FormData();
  formData.append("file", file);

  const params = { catalog_item_id: catalogItemId };
  if (periodLabel) params.period_label = periodLabel;

  const response = await api.post(`${companyDocsPrefix(companyId)}/upload`, formData, {
    params,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * payload: { approve: boolean, reason?: string }
 */
const validateDocument = async (companyId, documentId, payload) => {
  const response = await api.post(
    `${companyDocsPrefix(companyId)}/${documentId}/validate`,
    payload
  );
  return response.data;
};

const getDownloadUrl = (companyId, documentId) =>
  `${companyDocsPrefix(companyId)}/${documentId}/download`;

const downloadDocument = async (companyId, documentId) => {
  const response = await api.get(`${companyDocsPrefix(companyId)}/${documentId}/download`, {
    responseType: "blob",
  });
  return response.data;
};

const deleteDocumentFile = async (companyId, documentId) => {
  const response = await api.delete(`${companyDocsPrefix(companyId)}/${documentId}`);
  return response.data;
};

/**
 * Reenvía el email de notificación del último estado de validación
 * al correo de contacto de la empresa.
 */
const resendValidationEmail = async (companyId, documentId) => {
  const response = await api.post(
    `${companyDocsPrefix(companyId)}/${documentId}/resend-email`
  );
  return response.data;
};

// ---------------------------------------------------------------------------
// Catálogo normativo (admin)
// ---------------------------------------------------------------------------

const getCatalog = async (onlyActive = false) => {
  const response = await api.get(`${CATALOG_PREFIX}/`, {
    params: { only_active: onlyActive },
  });
  return response.data;
};

const createCatalogItem = async (payload) => {
  const response = await api.post(`${CATALOG_PREFIX}/`, payload);
  return response.data;
};

const updateCatalogItem = async (itemId, payload) => {
  const response = await api.put(`${CATALOG_PREFIX}/${itemId}`, payload);
  return response.data;
};

const deactivateCatalogItem = async (itemId) => {
  const response = await api.delete(`${CATALOG_PREFIX}/${itemId}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Categorías de documentos (Configuración)
// ---------------------------------------------------------------------------

const getCategories = async (onlyActive = false) => {
  const response = await api.get(`${CATEGORIES_PREFIX}/`, {
    params: { only_active: onlyActive },
  });
  return response.data;
};

const createCategory = async (payload) => {
  const response = await api.post(`${CATEGORIES_PREFIX}/`, payload);
  return response.data;
};

const createGlobalCategory = async (payload) => {
  const response = await api.post(`${CATEGORIES_PREFIX}/global`, payload);
  return response.data;
};

const updateCategory = async (categoryId, payload) => {
  const response = await api.put(`${CATEGORIES_PREFIX}/${categoryId}`, payload);
  return response.data;
};

const deactivateCategory = async (categoryId) => {
  const response = await api.delete(`${CATEGORIES_PREFIX}/${categoryId}`);
  return response.data;
};
const getNextCatalogItemCode = async () => {
  const { data } = await api.get(`${CATALOG_PREFIX}/catalog-items/next-code`);
  return data.next_code;
};

const documentService = {
  getMatrix,
  getSummary,
  uploadDocument,
  validateDocument,
  resendValidationEmail,
  getDownloadUrl,
  downloadDocument,
  deleteDocumentFile,
  getCatalog,
  createCatalogItem,
  updateCatalogItem,
  deactivateCatalogItem,
  getCategories,
  createCategory,
  createGlobalCategory,
  updateCategory,
  deactivateCategory,
  getNextCatalogItemCode,
};

export default documentService;