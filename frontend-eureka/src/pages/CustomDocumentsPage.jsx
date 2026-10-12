/**
 * Página de documentos propios de empresa.
 * Ruta: /dashboard/empresas/:companyId/documentos-propios
 *
 * Cada empresa tiene sus propios documentos, completamente aislados.
 * No aparecen en otras empresas.
 */
import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft, Download, Eye, FileText, FolderOpen,
  Loader, Paperclip, Pencil, Plus, Tag, Trash2, Upload,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import companyService from "../services/company.service";
import customDocumentService from "../services/custom_document.service";

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  vigente:   { label: "Vigente",   cls: "bg-green-100 text-green-700"  },
  borrador:  { label: "Borrador",  cls: "bg-gray-100 text-gray-600"    },
  archivado: { label: "Archivado", cls: "bg-amber-100 text-amber-700"  },
};

const FILE_TYPE_CONFIG = {
  principal: { label: "Principal", cls: "bg-blue-100 text-blue-700"    },
  version:   { label: "Versión",   cls: "bg-purple-100 text-purple-700" },
  adjunto:   { label: "Adjunto",   cls: "bg-gray-100 text-gray-600"    },
  evidencia: { label: "Evidencia", cls: "bg-amber-100 text-amber-700"  },
};

const FILE_TYPE_OPTIONS = [
  { value: "principal", label: "📄 Principal (reemplaza al actual)"  },
  { value: "version",   label: "🔁 Versión anterior / historial"     },
  { value: "adjunto",   label: "📎 Adjunto complementario"           },
  { value: "evidencia", label: "📷 Evidencia / fotografía"           },
];

const inp = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-white";

// ── Modal crear/editar documento ──────────────────────────────────────────────

const DocFormModal = ({ open, onClose, companyId, doc, onSaved }) => {
  const isEditing = !!doc;
  const [form, setForm] = useState({ name: "", description: "", category: "", status: "vigente" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(doc
      ? { name: doc.name, description: doc.description || "", category: doc.category || "", status: doc.status }
      : { name: "", description: "", category: "", status: "vigente" }
    );
  }, [open, doc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isEditing) await customDocumentService.update(companyId, doc.id, form);
      else           await customDocumentService.create(companyId, form);
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar documento" : "Nuevo documento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Nombre del documento *
            </label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Rutas de evacuación, Reglamento interno..."
              className={inp} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Descripción
            </label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Descripción opcional del documento..."
              className={`${inp} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Categoría
              </label>
              <input value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ej: Emergencias, RRHH..."
                className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Estado
              </label>
              <select value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className={inp}>
                <option value="vigente">Vigente</option>
                <option value="borrador">Borrador</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Modal de archivos ─────────────────────────────────────────────────────────

const FilesModal = ({ open, onClose, companyId, doc, onUpdated, canUpload }) => {
  const [uploading, setUploading]       = useState(false);
  const [fileType, setFileType]         = useState("principal");
  const [versionLabel, setVersionLabel] = useState("");
  const [notes, setNotes]               = useState("");
  const [deleting, setDeleting]         = useState(null);
  const fileInputRef                    = React.useRef(null);

  useEffect(() => {
    if (open) { setFileType("principal"); setVersionLabel(""); setNotes(""); }
  }, [open]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await customDocumentService.uploadFile(companyId, doc.id, file, fileType, versionLabel, notes);
      onUpdated();
      setVersionLabel(""); setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al subir",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setUploading(false); }
  };

  const handleDelete = async (fileId, filename) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning", title: `¿Eliminar "${filename}"?`,
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar", confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    setDeleting(fileId);
    try {
      await customDocumentService.deleteFile(companyId, doc.id, fileId);
      onUpdated();
    } catch { /**/ } finally { setDeleting(null); }
  };

  if (!doc) return null;

  const files     = doc.files || [];
  const principal = files.find(f => f.file_type === "principal");
  const historial = files.filter(f => f.file_type === "version");
  const adjuntos  = files.filter(f => ["adjunto", "evidencia"].includes(f.file_type));

  const FileRow = ({ f }) => {
    const ft = FILE_TYPE_CONFIG[f.file_type] || FILE_TYPE_CONFIG.adjunto;
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate font-medium">{f.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ft.cls}`}>
              {ft.label}
            </span>
            {f.version_label && <span className="text-[10px] text-gray-400">{f.version_label}</span>}
            {f.file_size_kb  && <span className="text-[10px] text-gray-400">{f.file_size_kb} KB</span>}
            {f.notes         && <span className="text-[10px] text-gray-400 truncate">· {f.notes}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => customDocumentService.downloadFile(companyId, doc.id, f.id, f.original_filename)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Descargar">
            <Download className="w-4 h-4" />
          </button>
          {canUpload && (
            <button onClick={() => handleDelete(f.id, f.original_filename)}
              disabled={deleting === f.id}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Eliminar">
              {deleting === f.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Paperclip className="w-5 h-5 text-green-600" />
            <span className="truncate">{doc.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 mt-2">
          {/* Principal */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Archivo principal</p>
            {principal ? <FileRow f={principal} /> : <p className="text-xs text-gray-400 italic px-3">Sin archivo principal</p>}
          </div>

          {/* Historial */}
          {historial.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Historial de versiones ({historial.length})
              </p>
              <div className="space-y-1.5">{historial.map(f => <FileRow key={f.id} f={f} />)}</div>
            </div>
          )}

          {/* Adjuntos */}
          {adjuntos.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Adjuntos y evidencias ({adjuntos.length})
              </p>
              <div className="space-y-1.5">{adjuntos.map(f => <FileRow key={f.id} f={f} />)}</div>
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-6">
              <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Sin archivos aún</p>
            </div>
          )}

          {/* Subir archivo */}
          {canUpload && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subir archivo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de archivo</label>
                  <select value={fileType} onChange={e => setFileType(e.target.value)} className={inp}>
                    {FILE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Etiqueta de versión</label>
                  <input value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                    placeholder='Ej: "v2", "Enero 2026"' className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Notas (opcional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Descripción breve del archivo..." className={inp} />
              </div>
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                onChange={e => handleUpload(e.target.files?.[0])} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
                {uploading
                  ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                  : <><Upload className="w-4 h-4 mr-2" /> Seleccionar archivo</>}
              </Button>
              <p className="text-[10px] text-gray-400 text-center">
                PDF, Word, Excel, imágenes, ZIP · máx. 20 MB
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

export const CustomDocumentsPage = () => {
  const { companyId } = useParams();
  const navigate      = useNavigate();
  const { hasPermission } = useAuth();
  const canUpload = hasPermission("documents.upload");

  const [company, setCompany]           = useState(null);
  const [docs, setDocs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterCat, setFilterCat]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [formOpen, setFormOpen]         = useState(false);
  const [editingDoc, setEditingDoc]     = useState(null);
  const [filesDoc, setFilesDoc]         = useState(null);
  const [filesOpen, setFilesOpen]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [comp, docList] = await Promise.all([
        companyService.getCompany(companyId),
        customDocumentService.list(companyId, {
          category: filterCat   || undefined,
          status:   filterStatus || undefined,
        }),
      ]);
      setCompany(comp);
      setDocs(docList);
    } catch {
      Swal.fire({ icon: "error", title: "Error al cargar", confirmButtonColor: "#16a34a" });
    } finally { setLoading(false); }
  }, [companyId, filterCat, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (doc) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning", title: `¿Eliminar "${doc.name}"?`,
      text: "Se eliminarán también todos sus archivos.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar", confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await customDocumentService.remove(companyId, doc.id);
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1200, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  const openFiles = async (doc) => {
    try {
      const full = await customDocumentService.get(companyId, doc.id);
      setFilesDoc(full); setFilesOpen(true);
    } catch { /**/ }
  };

  const handleFilesUpdated = async () => {
    if (!filesDoc) return;
    try {
      const full = await customDocumentService.get(companyId, filesDoc.id);
      setFilesDoc(full); load();
    } catch { /**/ }
  };

  const categories = [...new Set(docs.map(d => d.category).filter(Boolean))].sort();

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Documentos propios</h1>
          {company && <p className="text-sm text-gray-500 mt-0.5">{company.razon_social}</p>}
        </div>
        {canUpload && (
          <Button onClick={() => { setEditingDoc(null); setFormOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo documento
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        {categories.length > 0 && (
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
          <option value="">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="borrador">Borrador</option>
          <option value="archivado">Archivado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            {filterCat || filterStatus
              ? "No hay documentos con esos filtros."
              : "Esta empresa aún no tiene documentos propios."}
          </p>
          {canUpload && !filterCat && !filterStatus && (
            <Button onClick={() => { setEditingDoc(null); setFormOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Crear primer documento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(doc => {
            const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.vigente;
            return (
              <div key={doc.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-green-50 border border-green-100 flex-shrink-0">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                      {doc.category && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" /> {doc.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className={`flex items-center gap-1 ${doc.has_principal ? "text-green-600" : "text-gray-400"}`}>
                    <FileText className="w-3.5 h-3.5" />
                    {doc.has_principal ? "Con archivo" : "Sin archivo"}
                  </span>
                  {doc.file_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      {doc.file_count} archivo{doc.file_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="ml-auto text-[10px]">{doc.created_by_name || "—"}</span>
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-50">
                  <Button onClick={() => openFiles(doc)}
                    className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white">
                    {canUpload
                      ? <><Upload className="w-3.5 h-3.5 mr-1.5" /> Archivos</>
                      : <><Eye className="w-3.5 h-3.5 mr-1.5" /> Ver archivos</>}
                  </Button>
                  {canUpload && (
                    <>
                      <button onClick={() => { setEditingDoc(doc); setFormOpen(true); }}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(doc)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingDoc(null); }}
        companyId={companyId} doc={editingDoc} onSaved={load} />

      <FilesModal
        open={filesOpen}
        onClose={() => { setFilesOpen(false); setFilesDoc(null); }}
        companyId={companyId} doc={filesDoc}
        onUpdated={handleFilesUpdated} canUpload={canUpload} />
    </DashboardLayout>
  );
};

export default CustomDocumentsPage;
