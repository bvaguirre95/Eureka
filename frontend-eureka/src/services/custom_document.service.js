import api from "./api";

const base = (cId) => `/api/v1/companies/${cId}/custom-documents`;

const list   = (cId, params = {}) =>
  api.get(base(cId), { params }).then(r => r.data);

const get    = (cId, docId) =>
  api.get(`${base(cId)}/${docId}`).then(r => r.data);

const create = (cId, payload) =>
  api.post(base(cId), payload).then(r => r.data);

const update = (cId, docId, payload) =>
  api.put(`${base(cId)}/${docId}`, payload).then(r => r.data);

const remove = (cId, docId) =>
  api.delete(`${base(cId)}/${docId}`);

const uploadFile = (cId, docId, file, fileType = "principal", versionLabel = "", notes = "") => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("file_type", fileType);
  if (versionLabel) fd.append("version_label", versionLabel);
  if (notes)        fd.append("notes", notes);
  return api.post(`${base(cId)}/${docId}/files`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

const downloadFile = (cId, docId, fileId, filename) =>
  api.get(`${base(cId)}/${docId}/files/${fileId}/download`,
    { responseType: "blob" })
  .then(r => {
    const url = URL.createObjectURL(r.data);
    const a   = document.createElement("a");
    a.href = url; a.download = filename || "documento";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  });

const deleteFile = (cId, docId, fileId) =>
  api.delete(`${base(cId)}/${docId}/files/${fileId}`);

const customDocumentService = {
  list, get, create, update, remove,
  uploadFile, downloadFile, deleteFile,
};

export default customDocumentService;
