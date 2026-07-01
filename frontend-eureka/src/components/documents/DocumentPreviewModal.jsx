import React, { useEffect, useState } from "react";
import { Download, FileWarning } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

/**
 * Muestra la previsualización de un archivo ya descargado como Blob.
 * - Imágenes: <img>
 * - PDF: <iframe>
 * - Otros formatos (Word/Excel): sin previsualización en navegador,
 *   se ofrece solo el botón de descarga.
 */
export const DocumentPreviewModal = ({ open, onClose, blob, filename }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => window.URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
  }, [blob]);

  if (!blob || !objectUrl) return null;

  const type = blob.type || "";
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "documento";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm truncate">{filename}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-2 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
          {isPdf ? (
            <iframe src={objectUrl} title={filename} className="w-full h-full" />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img src={objectUrl} alt={filename} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 p-6">
              <FileWarning className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No hay vista previa disponible para este tipo de archivo.
              </p>
              <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
