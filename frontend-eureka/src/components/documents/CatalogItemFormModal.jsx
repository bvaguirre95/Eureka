import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import documentService from "../../services/document.service";
import { PERIODICITY_LABELS } from "./documentStatus";

const emptyForm = {
  code: "",
  name: "",
  description: "",
  category: "",
  periodicity: "anual",
  min_workers: 0,
  max_workers: "",
  is_active: true,
};

export const CatalogItemFormModal = ({ open, onClose, item, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      documentService
        .getCategories(true)
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          code: item.code,
          name: item.name,
          description: item.description || "",
          category: item.category,
          periodicity: item.periodicity,
          min_workers: item.min_workers,
          max_workers: item.max_workers ?? "",
          is_active: item.is_active,
        });
      } else {
        documentService.getNextCatalogItemCode().then((nextCode) => {
          setForm({ ...emptyForm, code: nextCode });
        });
      }
      setErrors({});
    }
  }, [open, item]);

  const validate = () => {
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "El código es obligatorio";
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";
    if (Number(form.min_workers) < 0) newErrors.min_workers = "No puede ser negativo";
    if (form.max_workers !== "" && Number(form.max_workers) < Number(form.min_workers)) {
      newErrors.max_workers = "Debe ser mayor o igual al mínimo";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim(),
        periodicity: form.periodicity,
        min_workers: Number(form.min_workers),
        max_workers: form.max_workers === "" ? null : Number(form.max_workers),
        is_active: form.is_active,
      };

      if (isEditing) {
        await documentService.updateCatalogItem(item.id, payload);
      } else {
        await documentService.createCatalogItem(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      onClose();
      const detail = err.response?.data?.detail;
      Swal.fire({
        icon: "error",
        title: isEditing ? "No se pudo actualizar el item" : "No se pudo crear el item",
        text: detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar item del catálogo" : "Nuevo item del catálogo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Código</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="PSST-013"
                readOnly
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              >
                <option value="">Selecciona una categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                {form.category && !categories.some((c) => c.name === form.category) && (
                  <option value={form.category}>{form.category} (nueva)</option>
                )}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-1">{errors.category}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                ¿Falta una categoría?{" "}
                <a href="/dashboard/configuracion" className="text-green-600 hover:underline">
                  Adminístralas en Configuración
                </a>
                .
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Periodicidad
            </label>
            <select
              value={form.periodicity}
              onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            >
              {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Mensual genera 12 instancias al año, bimestral 6, anual 1 y único solo 1 (sin
              renovación).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Mínimo de trabajadores
              </label>
              <input
                type="number"
                min={0}
                value={form.min_workers}
                onChange={(e) => setForm({ ...form, min_workers: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.min_workers && (
                <p className="text-xs text-red-600 mt-1">{errors.min_workers}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Máximo de trabajadores
              </label>
              <input
                type="number"
                min={0}
                value={form.max_workers}
                onChange={(e) => setForm({ ...form, max_workers: e.target.value })}
                placeholder="Sin límite"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.max_workers && (
                <p className="text-xs text-red-600 mt-1">{errors.max_workers}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Vacío = sin límite superior</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-green-600"
            />
            Item activo (visible en la matriz de empresas)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
            >
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogItemFormModal;
