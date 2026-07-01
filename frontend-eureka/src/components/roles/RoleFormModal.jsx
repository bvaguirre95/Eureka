import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import roleService from "../../services/role.service";

/**
 * Modal de creación/edición de rol.
 * Carga los permisos agrupados por módulo y muestra checkboxes.
 * Cuando se agrega un módulo nuevo al backend, aparece automáticamente.
 */
export const RoleFormModal = ({ open, onClose, role, orgId, isPlatformAdmin, onSaved }) => {
  const [form, setForm] = useState({ name: "", description: "", is_company_scoped: true });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [permGroups, setPermGroups] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [openModules, setOpenModules] = useState({});

  const isEditing = !!role;
  // Super admin puede editar TODO, incluyendo roles de sistema
  const isSystem = role?.is_system && !isPlatformAdmin;

  // Carga permisos agrupados
  useEffect(() => {
    if (!open) return;
    setLoadingPerms(true);
    roleService.getPermissionsGrouped()
      .then(groups => {
        setPermGroups(groups);
        // Abrir todos los módulos por defecto
        const o = {};
        groups.forEach(g => { o[g.module] = true; });
        setOpenModules(o);
      })
      .catch(() => setPermGroups([]))
      .finally(() => setLoadingPerms(false));
  }, [open]);

  // Rellenar con datos del rol al editar
  useEffect(() => {
    if (!open) return;
    if (role) {
      setForm({ name: role.name, description: role.description || "", is_company_scoped: role.is_company_scoped });
      // role.permissions puede ser array de objetos {id,code,...} o strings
      const ids = new Set(
        role.permissions.map(p => typeof p === "object" ? p.id : p)
      );
      setSelectedIds(ids);
    } else {
      setForm({ name: "", description: "", is_company_scoped: true });
      setSelectedIds(new Set());
    }
    setErrors({});
  }, [open, role]);

  const togglePerm = (id) => {
    if (isSystem) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (group) => {
    if (isSystem) return;
    const allIds = group.permissions.map(p => p.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { allIds.forEach(id => next.delete(id)); }
      else { allIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const toggleOpenModule = (module) =>
    setOpenModules(prev => ({ ...prev, [module]: !prev[module] }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "El nombre es obligatorio";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_company_scoped: form.is_company_scoped,
        permission_ids: Array.from(selectedIds),
      };
      if (isEditing) {
        await roleService.updateRole(role.id, payload);
      } else {
        await roleService.createRole(payload, orgId);
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: isEditing ? "No se pudo actualizar el rol" : "No se pudo crear el rol",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelected = selectedIds.size;
  const totalPerms = permGroups.reduce((acc, g) => acc + g.permissions.length, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            {isEditing ? "Editar rol" : "Nuevo rol"}
            {isSystem && (
              <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Rol del sistema — permisos protegidos
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
          {/* Nombre y descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Nombre del rol</label>
              <input
                type="text"
                value={form.name}
                disabled={isSystem}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Auditor SST"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Para qué se usa este rol"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Alcance */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium mb-2 text-gray-700">Alcance de empresas</label>
            <div className="flex gap-3">
              {[
                { value: false, label: "Todas las empresas", desc: "Ve todas las empresas de la organización" },
                { value: true,  label: "Empresas asignadas", desc: "Solo ve las empresas que le asignen" },
              ].map(opt => (
                <label key={String(opt.value)}
                  className={`flex-1 flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                    ${form.is_company_scoped === opt.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"}
                    ${isSystem ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    className="hidden"
                    checked={form.is_company_scoped === opt.value}
                    onChange={() => !isSystem && setForm({ ...form, is_company_scoped: opt.value })}
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5
                    ${form.is_company_scoped === opt.value ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Permisos agrupados — área scrollable */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Permisos
              </label>
              <span className="text-xs text-gray-400">
                {totalSelected} de {totalPerms} seleccionados
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {loadingPerms ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
              </div>
            ) : (
              permGroups.map(group => {
                const allSelected = group.permissions.every(p => selectedIds.has(p.id));
                const someSelected = group.permissions.some(p => selectedIds.has(p.id));
                const isOpen = openModules[group.module];

                return (
                  <div key={group.module} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Cabecera del módulo */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {/* Checkbox de módulo completo */}
                      {!isSystem && (
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={() => toggleModule(group)}
                          className="w-4 h-4 accent-green-600 flex-shrink-0"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleOpenModule(group.module)}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-800">{group.module}</span>
                          <span className="text-xs text-gray-400">
                            ({group.permissions.filter(p => selectedIds.has(p.id)).length}/{group.permissions.length})
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-gray-400" />
                          : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>

                    {/* Permisos del módulo */}
                    {isOpen && (
                      <div className="divide-y divide-gray-50">
                        {group.permissions.map(perm => (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors
                              ${isSystem ? "cursor-not-allowed" : "cursor-pointer hover:bg-green-50/50"}
                              ${selectedIds.has(perm.id) ? "bg-green-50/30" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(perm.id)}
                              disabled={isSystem}
                              onChange={() => togglePerm(perm.id)}
                              className="w-4 h-4 accent-green-600 mt-0.5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>
                              <code className="text-[10px] text-gray-300">{perm.code}</code>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 flex-shrink-0 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
            >
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear rol"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormModal;
