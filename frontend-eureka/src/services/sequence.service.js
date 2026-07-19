import api from "./api";

const PREFIX = "/api/v1/sequences";

/** Lista todas las definiciones de secuencia. */
const getSequences = async (onlyActive = false) => {
  const response = await api.get(`${PREFIX}/`, {
    params: onlyActive ? { only_active: true } : undefined,
  });
  return response.data;
};

/** Obtiene una definición con sus contadores. */
const getSequence = async (id) => {
  const response = await api.get(`${PREFIX}/${id}`);
  return response.data;
};

/**
 * Crea una definición de secuencia.
 * payload: { name, code, template, padding?, increment?, reset_policy?, description? }
 */
const createSequence = async (payload) => {
  const response = await api.post(`${PREFIX}/`, payload);
  return response.data;
};

/**
 * Edita parcialmente una definición.
 * payload: cualquier subconjunto de los campos editables
 */
const updateSequence = async (id, payload) => {
  const response = await api.patch(`${PREFIX}/${id}`, payload);
  return response.data;
};

/** Elimina una definición y todos sus contadores. */
const deleteSequence = async (id) => {
  await api.delete(`${PREFIX}/${id}`);
};

/** Lista los contadores de una secuencia. */
const getCounters = async (id) => {
  const response = await api.get(`${PREFIX}/${id}/counters`);
  return response.data;
};

/** Reinicia un contador a 0 (solo super-admin). */
const resetCounter = async (sequenceId, counterId) => {
  const response = await api.post(
    `${PREFIX}/${sequenceId}/counters/${counterId}/reset`
  );
  return response.data;
};

/**
 * Genera el siguiente código consumiendo el número.
 * payload: { code, context: {}, scope: {} }
 */
const nextCode = async (payload) => {
  const response = await api.post(`${PREFIX}/next`, payload);
  return response.data;
};

/**
 * Previsualiza el próximo código sin consumirlo.
 * payload: { code, context: {}, scope: {} }
 */
const previewCode = async (payload) => {
  const response = await api.post(`${PREFIX}/preview`, payload);
  return response.data;
};

const sequenceService = {
  getSequences,
  getSequence,
  createSequence,
  updateSequence,
  deleteSequence,
  getCounters,
  resetCounter,
  nextCode,
  previewCode,
};

export default sequenceService;