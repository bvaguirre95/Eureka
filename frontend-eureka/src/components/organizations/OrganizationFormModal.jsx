import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import organizationService from "../../services/organization.service";
import { isValidCedula, isValidRuc } from "../../utils/ecuadorValidators";

const emptyForm = {
  name: "",
  org_type: "consultora",
  ruc: "",
  email: "",
  phone: "",
  city: "",
  is_active: true,
  // Solo en creación
  admin_full_name: "",
  admin_email: "",
  admin_password: "",
};

export const OrganizationFormModal = ({ open, onClose, organization, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = !!organization;

  useEffect(() => {
    if (open) {
      if (organization) {
        setForm({
          ...emptyForm,
          name: organization.name,
          org_type: organization.org_type,
          ruc: organization.ruc || "",
          email: organization.email || "",
          phone: organization.phone || "",
          city: organization.city || "",
          is_active: organization.is_active,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, organization]);

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";

    const ruc = form.ruc.trim();
    if (ruc) {
      if (ruc.length === 10 && !isValidCedula(ruc)) newErrors.ruc = "La cédula no es válida";
      else if (ruc.length === 13 && !isValidRuc(ruc)) newErrors.ruc = "El RUC no es válido";
      else if (ruc.length !== 10 && ruc.length !== 13)
        newErrors.ruc = "Debe tener 10 dígitos (cédula) o 13 (RUC)";
    }

    if (!isEditing) {
      if (!form.admin_full_name.trim()) newErrors.admin_full_name = "El nombre es obligatorio";
      if (!form.admin_email.trim()) newErrors.admin_email = "El email es obligatorio";
      if (!form.admin_password.trim()) newErrors.admin_password = "La contraseña es obligatoria";
      else if (form.admin_password.length < 8)
        newErrors.admin_password = "Mínimo 8 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await organizationService.updateOrganization(organization.id, {
          name: form.name.trim(),
          ruc: form.ruc.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          is_active: form.is_active,
        });
        onSaved();
        onClose();
      } else {
        const result = await organizationService.createOrganization({
          name: form.name.trim(),
          org_type: form.org_type,
          ruc: form.ruc.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          is_active: form.is_active,
          admin_full_name: form.admin_full_name.trim(),
          admin_email: form.admin_email.trim(),
          admin_password: form.admin_password,
        });

        onSaved();
        onClose();

        // Mostrar credenciales (solo una vez)
        await Swal.fire({
          icon: "success",
          title: "Organización creada",
          html: `
            <p class="text-sm text-gray-600 mb-4">
              Guarda estas credenciales — <strong>no se mostrarán nuevamente</strong>.
            </p>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left font-mono text-sm space-y-2">
              <p><span class="text-gray-500">Organización:</span> <strong>${result.organization.name}</strong></p>
              <p><span class="text-gray-500">Email:</span> <strong>${result.admin_email}</strong></p>
              <p><span class="text-gray-500">Contraseña:</span> <strong>${result.admin_password}</strong></p>
            </div>`,
          confirmButtonText: "Entendido, guardé las credenciales",
          confirmButtonColor: "#16a34a",
          allowOutsideClick: false,
        });
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      Swal.fire({
        icon: "error",
        title: isEditing ? "No se pudo actualizar la organización" : "No se pudo crear la organización",
        text: detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm({ ...form, [field]: e.target.value }),
    className:
      "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar organización" : "Nueva organización"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Datos de la organización */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Nombre</label>
            <input type="text" {...f("name")} placeholder="Ej. Consultora Aura" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Tipo</label>
            <select
              value={form.org_type}
              disabled={isEditing}
              onChange={(e) => setForm({ ...form, org_type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="consultora">Consultora (gestiona varias empresas)</option>
              <option value="empresa_directa">Empresa directa (gestiona la suya)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Cédula / RUC</label>
              <input
                type="text"
                value={form.ruc}
                maxLength={13}
                onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, "") })}
                placeholder="Opcional"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.ruc && <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Ciudad</label>
              <input type="text" {...f("city")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Email</label>
              <input type="email" {...f("email")} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Teléfono</label>
              <input type="text" {...f("phone")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-green-600"
            />
            Organización activa
          </label>

          {/* Datos del administrador inicial — solo al crear */}
          {!isEditing && (
            <>
              <hr className="border-gray-200" />
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Administrador inicial
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Se creará automáticamente el usuario administrador y los 4 roles base
                  (Administrador, Supervisor, Técnico SST, Empresa) para esta organización.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                      Nombre completo
                    </label>
                    <input type="text" {...f("admin_full_name")} placeholder="Ej. Juan Pérez" />
                    {errors.admin_full_name && (
                      <p className="text-xs text-red-600 mt-1">{errors.admin_full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                      Email de acceso
                    </label>
                    <input type="email" {...f("admin_email")} placeholder="admin@organizacion.ec" />
                    {errors.admin_email && (
                      <p className="text-xs text-red-600 mt-1">{errors.admin_email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                      Contraseña inicial
                    </label>
                    <input
                      type="text"
                      {...f("admin_password")}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="off"
                    />
                    {errors.admin_password && (
                      <p className="text-xs text-red-600 mt-1">{errors.admin_password}</p>
                    )}
                    <p className="text-xs text-amber-600 mt-1">
                      Las credenciales se mostrarán una sola vez al crear.
                    </p>
                  </div>
                </div>
              </div>
            </>
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
              {submitting
                ? "Creando..."
                : isEditing
                ? "Guardar cambios"
                : "Crear organización"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationFormModal;
