import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Eye, EyeOff, UserCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { CompanyMultiSelect } from "../common/CompanyMultiSelect";
import userService from "../../services/user.service";

const emptyForm = {
  email: "",
  full_name: "",
  phone: "",
  password: "",
  role_id: "",
  is_active: true,
  companies: [], // [{ id, razon_social, ruc }]
};

export const UserFormModal = ({ open, onClose, user, roles, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        setForm({
          email: user.email,
          full_name: user.full_name,
          phone: user.phone || "",
          password: "",
          role_id: String(user.role.id),
          is_active: user.is_active,
          companies: user.companies || [],
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setShowPassword(false);
    }
  }, [open, user]);

  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(form.role_id)),
    [roles, form.role_id]
  );

  const isCompanyScoped = selectedRole?.is_company_scoped ?? false;

  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) newErrors.email = "El email es obligatorio";
    if (!form.full_name.trim()) newErrors.full_name = "El nombre es obligatorio";
    if (!form.role_id) newErrors.role_id = "Selecciona un rol";

    if (!isEditing && form.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }
    if (isEditing && form.password && form.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (isCompanyScoped && form.companies.length === 0) {
      newErrors.companies =
        "Este rol está acotado a empresas: asigna al menos una";
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
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role_id: Number(form.role_id),
        is_active: form.is_active,
        company_ids: form.companies.map((c) => c.id),
      };

      if (!isEditing) {
        payload.password = form.password;
        await userService.createUser(payload);
      } else {
        if (form.password) {
          payload.password = form.password;
        }
        await userService.updateUser(user.id, payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      Swal.fire({
        icon: "error",
        title: isEditing ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario",
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
            <UserCog className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Nombre completo
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              {errors.full_name && (
                <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Teléfono
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              disabled={isEditing}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              {isEditing ? "Nueva contraseña (opcional)" : "Contraseña"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEditing ? "Dejar en blanco para no cambiarla" : "••••••••"}
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Rol</label>
            <select
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            >
              <option value="">Selecciona un rol...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs text-red-600 mt-1">{errors.role_id}</p>}
            {selectedRole && (
              <p className="text-xs text-gray-400 mt-1">
                {isCompanyScoped
                  ? "Este rol solo verá las empresas que le asignes abajo."
                  : "Este rol tiene acceso a todas las empresas del sistema."}
              </p>
            )}
          </div>

          {isCompanyScoped && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Empresas asignadas
              </label>
              <CompanyMultiSelect
                value={form.companies}
                onChange={(companies) => setForm({ ...form, companies })}
              />
              {errors.companies && (
                <p className="text-xs text-red-600 mt-1">{errors.companies}</p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-green-600"
            />
            Usuario activo
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
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
