import React, { useRef, useState } from "react";
import Swal from "sweetalert2";
import { Calendar, Download, Eye, Loader, Pencil, RefreshCw, ThumbsDown, ThumbsUp, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import documentService from "../../services/document.service";
import { STATUS_CONFIG } from "./documentStatus";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
};

export const PeriodDetailModal = ({ open, onClose, row, companyId, canUpload, canValidate, canReplaceValidated, onChanged }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);

  // Edición de fecha
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue]     = useState("");
  const [savingDate, setSavingDate]   = useState(false);

  const canEditDate = canUpload && !!row?.company_document_id;

  const openDateEdit = () => {
    setDateValue(toInputDate(row.due_date));
    setEditingDate(true);
  };

  const saveDueDate = async () => {
    setSavingDate(true);
    try {
      const newDate = dateValue ? new Date(dateValue + "T23:59:59") : null;
      const updated = await documentService.updateDueDate(companyId, row.company_document_id, newDate);
      onChanged(updated);
      setEditingDate(false);
    } catch (err) {
      Swal.fire({
        icon: "error", title: "No se pudo actualizar la fecha",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally { setSavingDate(false); }
  };

  if (!row) return null;

  const statusConfig = STATUS_CONFIG[row.status] || STATUS_CONFIG.pendiente;
  const StatusIcon = statusConfig.icon;

  // Un documento ya validado no debería poder reemplazarse salvo que el
  // usuario tenga el permiso "documents.replace_validated" (supervisor/admin).
  const canShowUpload = canUpload && (row.status !== "validado" || canReplaceValidated);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const updated = await documentService.uploadDocument(companyId, {
        catalogItemId: row.catalog_item_id,
        periodLabel: row.period_label,
        file,
      });
      onChanged(updated);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo subir el archivo",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await documentService.downloadDocument(companyId, row.company_document_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.original_filename || `${row.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo descargar el archivo",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const blob = await documentService.downloadDocument(companyId, row.company_document_id);
      setPreviewBlob(blob);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo abrir la vista previa",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleApprove = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "¿Validar este documento?",
      text: "Quedará marcado como conforme.",
      showCancelButton: true,
      confirmButtonText: "Validar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!result.isConfirmed) return;

    setValidating(true);
    try {
      const updated = await documentService.validateDocument(companyId, row.company_document_id, {
        approve: true,
      });
      onChanged(updated);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo validar el documento",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Rechazar documento",
      input: "textarea",
      inputLabel: "Motivo del rechazo",
      inputPlaceholder: "Explica qué debe corregirse...",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) => (!value ? "Indica un motivo" : undefined),
    });
    if (!isConfirmed) return;

    setValidating(true);
    try {
      const updated = await documentService.validateDocument(companyId, row.company_document_id, {
        approve: false,
        reason,
      });
      onChanged(updated);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo rechazar el documento",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setValidating(false);
    }
  };

  const dueDateLabel = formatDate(row.due_date);
  const isOverdue = row.due_date && new Date(row.due_date) < new Date() && row.status !== "validado";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {row.name}
            <span className="block text-sm font-normal text-gray-500 mt-0.5">
              {row.period_display}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${statusConfig.badgeClass}`}
            >
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
            {editingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateValue}
                  onChange={e => setDateValue(e.target.value)}
                  className="text-sm px-2 py-1.5 border border-green-400 rounded-lg focus:ring-2 focus:ring-green-100 outline-none"
                  autoFocus
                />
                <button
                  onClick={saveDueDate}
                  disabled={savingDate}
                  className="px-2 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {savingDate ? <Loader className="w-3 h-3 animate-spin" /> : "✓"}
                </button>
                <button
                  onClick={() => setEditingDate(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                {dueDateLabel ? (
                  <span className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                    Vence: {dueDateLabel}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Sin fecha de vencimiento</span>
                )}
                {canEditDate && (
                  <button
                    onClick={openDateEdit}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600"
                    title="Editar fecha de vencimiento"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {row.status === "rechazado" && row.rejection_reason && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <strong>Motivo del rechazo:</strong> {row.rejection_reason}
            </div>
          )}

          {row.has_file && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-sm text-gray-600 truncate">{row.original_filename}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-green-600 transition-colors disabled:opacity-50"
                  aria-label="Vista previa"
                  title="Vista previa"
                >
                  {previewing ? <Loader className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-green-600 transition-colors disabled:opacity-50"
                  aria-label="Descargar archivo"
                  title="Descargar"
                >
                  {downloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {row.uploaded_by_name && (
            <p className="text-xs text-gray-400">
              Cargado por {row.uploaded_by_name}
              {row.uploaded_at && ` · ${formatDate(row.uploaded_at)}`}
            </p>
          )}
          {row.validated_by_name && (
            <p className="text-xs text-gray-400">
              Validado por {row.validated_by_name}
              {row.validated_at && ` · ${formatDate(row.validated_at)}`}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {canShowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : row.has_file ? (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {row.has_file ? "Reemplazar archivo" : "Subir archivo"}
                </Button>
              </>
            )}

            {canValidate && row.status === "cargado" && (
              <>
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={validating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Validar
                </Button>
                <Button
                  type="button"
                  onClick={handleReject}
                  disabled={validating}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <DocumentPreviewModal
        open={!!previewBlob}
        onClose={() => setPreviewBlob(null)}
        blob={previewBlob}
        filename={row.original_filename}
      />
    </Dialog>
  );
};

export default PeriodDetailModal;