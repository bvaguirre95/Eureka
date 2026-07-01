import React, { useRef, useState } from "react";
import Swal from "sweetalert2";
import { Download, Eye, Loader, RefreshCw, ThumbsDown, ThumbsUp, Upload } from "lucide-react";
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

export const DocumentRow = ({ row, companyId, canUpload, canValidate, canReplaceValidated, onChanged }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);

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
  const isOverdue =
    row.due_date && new Date(row.due_date) < new Date() && row.status !== "validado";

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{row.name}</p>
        <p className="text-xs text-gray-400">{row.code}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.period_display}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </span>
        {row.status === "rechazado" && row.rejection_reason && (
          <p className="text-xs text-red-500 mt-1 max-w-xs">{row.rejection_reason}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {dueDateLabel ? (
          <span className={isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}>
            {dueDateLabel}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end items-center gap-1.5">
          {row.has_file && (
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors disabled:opacity-50"
              title="Vista previa"
              aria-label="Vista previa del archivo"
            >
              {previewing ? <Loader className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {row.has_file && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors disabled:opacity-50"
              title={row.original_filename || "Descargar"}
              aria-label="Descargar archivo"
            >
              {downloading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          )}

          {canShowUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors disabled:opacity-50"
                title={row.has_file ? "Reemplazar archivo" : "Subir archivo"}
                aria-label={row.has_file ? "Reemplazar archivo" : "Subir archivo"}
              >
                {uploading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : row.has_file ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            </>
          )}

          {canValidate && row.status === "cargado" && (
            <>
              <button
                onClick={handleApprove}
                disabled={validating}
                className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
                title="Validar"
                aria-label="Validar documento"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleReject}
                disabled={validating}
                className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Rechazar"
                aria-label="Rechazar documento"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <DocumentPreviewModal
          open={!!previewBlob}
          onClose={() => setPreviewBlob(null)}
          blob={previewBlob}
          filename={row.original_filename}
        />
      </td>
    </tr>
  );
};

export default DocumentRow;
