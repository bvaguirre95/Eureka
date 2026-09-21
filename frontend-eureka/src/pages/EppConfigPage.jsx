/**
 * EppConfigPage
 * Ruta: /dashboard/configuracion/epp
 *
 * Gestiona tipos de EPP y catálogo por organización.
 * Solo accesible con permiso epp.manage.
 */
import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  ChevronDown, ChevronRight, Loader2,
  Pencil, Plus, Shield, Trash2, X,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import eppService from "../services/epp.service";

const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
  focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none`;

// ── Modal Tipo EPP ────────────────────────────────────────────────────────────
const TypeModal = ({ open, onClose, editing, orgId, onSaved }) => {
  const [form, setForm] = useState({
    name: "", description: "", icon: "",
    group_name: "", default_useful_life_months: "", order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      name:        editing.name        || "",
      description: editing.description || "",
      icon:        editing.icon        || "",
      group_name:  editing.group_name  || "",
      default_useful_life_months: editing.default_useful_life_months || "",
      order:       editing.order       || 0,
    } : { name: "", description: "", icon: "", group_name: "", default_useful_life_months: "", order: 0 });
  }, [open, editing]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return Swal.fire({ icon: "warning", title: "El nombre es obligatorio", confirmButtonColor: "#16a34a" });
    setSaving(true);
    try {
      const payload = {
        ...form,
        default_useful_life_months: form.default_useful_life_months ? Number(form.default_useful_life_months) : null,
      };
      if (editing) await eppService.updateType(orgId, editing.id, payload);
      else         await eppService.createType(orgId, payload);
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar tipo de EPP" : "Nuevo tipo de EPP"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ícono</label>
              <input value={form.icon} onChange={e => set("icon", e.target.value)}
                placeholder="🦺" className={inputCls} maxLength={4} />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Ej: Casco de seguridad" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Grupo</label>
            <input value={form.group_name} onChange={e => set("group_name", e.target.value)}
              placeholder="Ej: Protección de cabeza, Ropa de trabajo..."
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} placeholder="Descripción del tipo de EPP..."
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Vida útil por defecto (meses)
            </label>
            <input type="number" min={1} value={form.default_useful_life_months}
              onChange={e => set("default_useful_life_months", e.target.value)}
              placeholder="Ej: 12 para ropa, 36 para cascos"
              className={`${inputCls} w-40`} />
            <p className="text-xs text-gray-400 mt-1">
              Se puede sobreescribir en cada ítem del catálogo.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Ítem Catálogo ────────────────────────────────────────────────────────
const CatalogModal = ({ open, onClose, editing, orgId, types, onSaved }) => {
  const [form, setForm] = useState({
    epp_type_id: "", name: "", code: "",
    brand: "", model: "", technical_spec: "", useful_life_months: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      epp_type_id:    editing.epp_type_id    || "",
      name:           editing.name           || "",
      code:           editing.code           || "",
      brand:          editing.brand          || "",
      model:          editing.model          || "",
      technical_spec: editing.technical_spec || "",
      useful_life_months: editing.useful_life_months || "",
    } : { epp_type_id: "", name: "", code: "", brand: "", model: "", technical_spec: "", useful_life_months: "" });
  }, [open, editing]);

  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim())    return Swal.fire({ icon: "warning", title: "El nombre es obligatorio", confirmButtonColor: "#16a34a" });
    if (!form.epp_type_id)    return Swal.fire({ icon: "warning", title: "Selecciona el tipo de EPP", confirmButtonColor: "#16a34a" });
    setSaving(true);
    try {
      const payload = {
        ...form,
        epp_type_id: Number(form.epp_type_id),
        useful_life_months: form.useful_life_months ? Number(form.useful_life_months) : null,
      };
      if (editing) await eppService.updateCatalog(orgId, editing.id, payload);
      else         await eppService.createCatalog(orgId, payload);
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar ítem" : "Nuevo ítem de catálogo"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Tipo de EPP <span className="text-red-500">*</span>
            </label>
            <select value={form.epp_type_id} onChange={e => set("epp_type_id", e.target.value)}
              className={inputCls}>
              <option value="">— Seleccionar tipo —</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ""}{t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Ej: Casco 3M H-700 Clase E" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Código</label>
              <input value={form.code} onChange={e => set("code", e.target.value)}
                placeholder="EPP-001" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Marca</label>
              <input value={form.brand} onChange={e => set("brand", e.target.value)}
                placeholder="3M, Honeywell..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Modelo</label>
              <input value={form.model} onChange={e => set("model", e.target.value)}
                placeholder="H-700, VP3..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Especificación técnica / Norma
            </label>
            <textarea value={form.technical_spec}
              onChange={e => set("technical_spec", e.target.value)}
              rows={2} placeholder="Ej: ANSI Z89.1 Tipo I Clase E, INEN 1612..."
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Vida útil (meses)
              <span className="text-gray-400 font-normal"> — sobreescribe la del tipo</span>
            </label>
            <input type="number" min={1} value={form.useful_life_months}
              onChange={e => set("useful_life_months", e.target.value)}
              placeholder="Ej: 36" className={`${inputCls} w-32`} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────────
export const EppConfigPage = () => {
  const { user } = useAuth();
  const { selectedOrgId } = useOrganization();
  const orgId = user?.organization?.id ?? selectedOrgId;

  const [types, setTypes]     = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const [typeModal, setTypeModal]       = useState(false);
  const [editingType, setEditingType]   = useState(null);
  const [catalogModal, setCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        eppService.listTypes(orgId, { include_inactive: true }),
        eppService.listCatalog(orgId, { include_inactive: true }),
      ]);
      setTypes(t || []);
      setCatalog(c || []);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteType = async (t) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `¿Eliminar "${t.name}"?`,
      text: t.catalog_count > 0
        ? `Tiene ${t.catalog_count} ítem(s) en catálogo. Desactívalo en lugar de eliminarlo.`
        : "Se eliminará permanentemente.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Eliminar",
    });
    if (!isConfirmed) return;
    try {
      await eppService.deleteType(orgId, t.id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se puede eliminar",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    }
  };

  // Catálogo agrupado por tipo
  const catalogByType = catalog.reduce((acc, c) => {
    const k = c.epp_type_id;
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {});

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuración EPP</h2>
              <p className="text-sm text-gray-500">Tipos y catálogo de equipos de protección</p>
            </div>
          </div>
          <Button onClick={() => { setEditingType(null); setTypeModal(true); }}
            className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo tipo
          </Button>
        </div>

        {/* Lista de tipos con su catálogo */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : types.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">Sin tipos de EPP configurados</p>
            <p className="text-sm text-gray-300 mt-1">
              Crea los tipos de EPP que usa tu organización.
            </p>
            <Button onClick={() => { setEditingType(null); setTypeModal(true); }}
              className="mt-5 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Crear primer tipo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {types.map(t => {
              const items = catalogByType[t.id] || [];
              const isOpen = !!expanded[t.id];
              return (
                <div key={t.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

                  {/* Cabecera del tipo */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => toggleExpand(t.id)}
                      className="text-gray-400 hover:text-green-600 transition-colors">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="text-xl w-7 flex-shrink-0">{t.icon || "🛡️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">
                        {t.group_name && `${t.group_name} · `}
                        {items.length} ítem{items.length !== 1 ? "s" : ""}
                        {t.default_useful_life_months && ` · Vida útil: ${t.default_useful_life_months}m`}
                      </p>
                    </div>
                    {!t.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingType(t); setTypeModal(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteType(t)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCatalog({ epp_type_id: t.id });
                          setCatalogModal(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Agregar ítem al catálogo">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ítems del catálogo */}
                  {isOpen && (
                    <div className="border-t border-gray-50">
                      {items.length === 0 ? (
                        <div className="px-6 py-4 text-center">
                          <p className="text-xs text-gray-400">Sin ítems en este tipo.</p>
                          <button
                            onClick={() => { setEditingCatalog(null); setCatalogModal(true); }}
                            className="text-xs text-green-600 hover:underline mt-1">
                            + Agregar ítem
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-6 py-2 text-xs font-semibold text-gray-400">Nombre</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Marca</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Vida útil</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-400"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {items.map(c => (
                              <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-6 py-2.5">
                                  <p className="font-medium text-gray-800">{c.name}</p>
                                  {c.code && <p className="text-xs text-gray-400">{c.code}</p>}
                                </td>
                                <td className="px-3 py-2.5 text-gray-500 text-xs">
                                  {c.brand || "—"}
                                  {c.model ? ` · ${c.model}` : ""}
                                </td>
                                <td className="px-3 py-2.5 text-gray-500 text-xs">
                                  {c.effective_life_months ? `${c.effective_life_months} meses` : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <button
                                    onClick={() => { setEditingCatalog(c); setCatalogModal(true); }}
                                    className="p-1 rounded text-gray-400 hover:text-green-600">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botón agregar ítem suelto */}
        <div className="flex justify-end">
          <Button variant="outline" className="gap-2 text-sm"
            onClick={() => { setEditingCatalog(null); setCatalogModal(true); }}>
            <Plus className="w-4 h-4" /> Agregar ítem al catálogo
          </Button>
        </div>
      </div>

      <TypeModal    open={typeModal}    onClose={() => setTypeModal(false)}
        editing={editingType} orgId={orgId} onSaved={load} />
      <CatalogModal open={catalogModal} onClose={() => setCatalogModal(false)}
        editing={editingCatalog} orgId={orgId} types={types} onSaved={load} />
    </DashboardLayout>
  );
};

export default EppConfigPage;
