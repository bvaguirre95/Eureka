import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import documentService from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";

export const CategoryFormModal = ({ open, onClose, category, onSaved }) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!category;

  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setIsActive(category?.is_active ?? true);
      setError("");
    }
  }, [open, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await documentService.updateCategory(category.id, { name: name.trim(), is_active: isActive });
      } else if (user?.organization == null) {
        await documentService.createGlobalCategory({ name: name.trim(), is_active: true });
      } else {
        await documentService.createCategory({ name: name.trim(), is_active: true });
      }
      onSaved();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      Swal.fire({
        icon: "error",
        title: isEditing ? "No se pudo actualizar la categoría" : "No se pudo crear la categoría",
        text: detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Gestión Ambiental"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              Categoría activa
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
            >
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryFormModal;
