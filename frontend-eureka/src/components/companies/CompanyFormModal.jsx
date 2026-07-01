import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Building2, Loader, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import companyService from "../../services/company.service";
import { isValidRuc } from "../../utils/ecuadorValidators";
import { CompanyLogo } from "./CompanyLogo";

const emptyForm = {
  ruc: "",
  razon_social: "",
  nombre_comercial: "",
  industria: "",
  num_trabajadores: 0,
  direccion: "",
  ciudad: "",
  telefono: "",
  email_contacto: "",
  descripcion: "",
  intro_inspeccion: "",
  is_active: true,
};

export const CompanyFormModal = ({ open, onClose, company, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoKey, setLogoKey] = useState(0); // fuerza re-render del logo
  const logoInputRef = useRef(null);

  const isEditing = !!company;

  useEffect(() => {
    if (open) {
      if (company) {
        setForm({
          ruc: company.ruc,
          razon_social: company.razon_social,
          nombre_comercial: company.nombre_comercial || "",
          industria: company.industria || "",
          num_trabajadores: company.num_trabajadores,
          direccion: company.direccion || "",
          ciudad: company.ciudad || "",
          telefono: company.telefono || "",
          email_contacto: company.email_contacto || "",
          descripcion: company.descripcion || "",
          intro_inspeccion: company.intro_inspeccion || "",
          is_active: company.is_active,
        });
        setHasLogo(company.has_logo || false);
      } else {
        setForm(emptyForm);
        setHasLogo(false);
      }
      setErrors({});
    }
  }, [open, company]);

  const validate = () => {
    const newErrors = {};
    if (!isEditing) {
      if (!/^\d{13}$/.test(form.ruc.trim())) {
        newErrors.ruc = "El RUC debe tener exactamente 13 dígitos";
      } else if (!isValidRuc(form.ruc.trim())) {
        newErrors.ruc = "El RUC no es válido (dígito verificador incorrecto)";
      }
    }
    if (!form.razon_social.trim()) {
      newErrors.razon_social = "La razón social es obligatoria";
    }
    if (Number(form.num_trabajadores) < 0) {
      newErrors.num_trabajadores = "No puede ser negativo";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setLogoUploading(true);
    try {
      const updated = await companyService.uploadLogo(company.id, file);
      setHasLogo(updated.has_logo);
      setLogoKey((k) => k + 1);
      onSaved();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo subir el logo",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    if (!company) return;
    setLogoDeleting(true);
    try {
      await companyService.deleteLogo(company.id);
      setHasLogo(false);
      setLogoKey((k) => k + 1);
      onSaved();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo eliminar el logo",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setLogoDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const basePayload = {
        razon_social: form.razon_social.trim(),
        nombre_comercial: form.nombre_comercial.trim() || null,
        industria: form.industria.trim() || null,
        num_trabajadores: Number(form.num_trabajadores),
        direccion: form.direccion.trim() || null,
        ciudad: form.ciudad.trim() || null,
        telefono: form.telefono.trim() || null,
        email_contacto: form.email_contacto.trim() || null,
        descripcion: form.descripcion.trim() || null,
        intro_inspeccion: form.intro_inspeccion.trim() || null,
        is_active: form.is_active,
      };

      if (isEditing) {
        await companyService.updateCompany(company.id, basePayload);
      } else {
        await companyService.createCompany({ ...basePayload, ruc: form.ruc.trim() });
      }

      onSaved();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      Swal.fire({
        icon: "error",
        title: isEditing
          ? "No se pudo actualizar la empresa"
          : "No se pudo crear la empresa",
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
            <Building2 className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar empresa" : "Nueva empresa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Logo</label>
              <div className="flex items-center gap-4">
                <CompanyLogo key={logoKey} companyId={company.id} hasLogo={hasLogo} size={56} />
                <div className="flex gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs"
                  >
                    {logoUploading ? (
                      <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {hasLogo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {hasLogo && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={logoDeleting}
                      onClick={handleDeleteLogo}
                      className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      {logoDeleting ? (
                        <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG o WEBP — máx. 2 MB.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">RUC</label>
              <input
                type="text"
                value={form.ruc}
                disabled={isEditing}
                maxLength={13}
                onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, "") })}
                placeholder="13 dígitos"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              />
              {errors.ruc && <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                N.º de trabajadores
              </label>
              <input
                type="number"
                min={0}
                value={form.num_trabajadores}
                onChange={(e) => setForm({ ...form, num_trabajadores: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.num_trabajadores && (
                <p className="text-xs text-red-600 mt-1">{errors.num_trabajadores}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Determina qué documentos del catálogo normativo aplican.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Razón social
            </label>
            <input
              type="text"
              value={form.razon_social}
              onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
            {errors.razon_social && (
              <p className="text-xs text-red-600 mt-1">{errors.razon_social}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Nombre comercial
              </label>
              <input
                type="text"
                value={form.nombre_comercial}
                onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Industria
              </label>
              <input
                type="text"
                value={form.industria}
                onChange={(e) => setForm({ ...form, industria: e.target.value })}
                placeholder="Ej. Camaronera, Alimentos..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Ciudad
              </label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Teléfono
              </label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Email de contacto
            </label>
            <input
              type="email"
              value={form.email_contacto}
              onChange={(e) => setForm({ ...form, email_contacto: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Descripción de la empresa
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              placeholder="Ej: empresa dedicada a actividades de desinfección, control de plagas..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se usa en el cuerpo de los informes de inspección PDF.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Introducción personalizada para informes
              <span className="ml-2 text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={form.intro_inspeccion}
              onChange={(e) => setForm({ ...form, intro_inspeccion: e.target.value })}
              rows={4}
              placeholder="Si se deja vacío, se usa la descripción de la empresa. Puedes personalizar el texto de introducción que aparecerá en cada informe PDF de inspección..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-green-600"
            />
            Empresa activa
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
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormModal;
