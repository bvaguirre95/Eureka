import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Activity, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import geritraService from "../../services/geritra.service";
import DashboardLayout from "../layout/DashboardLayout";
// ── Colores predefinidos para categorías ─────────────────────────────────────

const COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e",
  "#3b82f6","#8b5cf6","#ec4899","#14b8a6",
];

// ── Modal Categoría ───────────────────────────────────────────────────────────

const CategoryModal = ({ open, onClose, editing, orgId, onSaved }) => {
  const [form, setForm] = useState({ name: "", color: COLORS[0], order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing
      ? { name: editing.name, color: editing.color || COLORS[0], order: editing.order }
      : { name: "", color: COLORS[0], order: 0 });
  }, [editing, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await geritraService.updateCategory(orgId, editing.id, form);
      } else {
        await geritraService.createCategory(orgId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar categoría" : "Nueva categoría de riesgo"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Mecánico, Físico, Químico..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color identificador</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full border-2 transition-all
                    ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
            <input type="number" min={0} value={form.order}
              onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
              className="w-24 border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Guardando..." : editing ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Factor ──────────────────────────────────────────────────────────────

const FactorModal = ({ open, onClose, editing, orgId, categories, defaultCategoryId, onSaved }) => {
  const [form, setForm] = useState({ category_id: defaultCategoryId || "", name: "", effect: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing
      ? { category_id: editing.category_id, name: editing.name, effect: editing.effect || "" }
      : { category_id: defaultCategoryId || "", name: "", effect: "" });
  }, [editing, open, defaultCategoryId]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category_id) return;
    setSaving(true);
    try {
      if (editing) {
        await geritraService.updateFactor(orgId, editing.id, {
          name: form.name, effect: form.effect });
      } else {
        await geritraService.createFactor(orgId, {
          category_id: Number(form.category_id),
          name: form.name, effect: form.effect });
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar peligro" : "Nuevo peligro / factor de riesgo"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none">
                <option value="">Selecciona una categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peligro / Factor *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Atrapamiento en maquinaria, Ruido excesivo..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Efecto / Daño potencial</label>
            <input value={form.effect} onChange={e => setForm(f => ({ ...f, effect: e.target.value }))}
              placeholder="Ej: Amputación, pérdida auditiva, quemaduras..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Guardando..." : editing ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export const GeritraConfigSection = ({}) => {
  const {user, hasPermission } = useAuth();
  const canManage = hasPermission("risks.manage");
  const orgId = user?.organization?.id;

  const [categories, setCategories]   = useState([]);
  const [factors, setFactors]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState({});

  const [catModal, setCatModal]       = useState(false);
  const [editingCat, setEditingCat]   = useState(null);
  const [factorModal, setFactorModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState(null);
  const [defaultCatId, setDefaultCatId]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, facts] = await Promise.all([
        geritraService.getCategories(orgId),
        geritraService.getFactors(orgId),
      ]);
      setCategories(cats);
      setFactors(facts);
    } catch { /**/ } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteCat = async (cat) => {
    const r = await Swal.fire({
      icon: "warning", title: `¿Eliminar "${cat.name}"?`,
      text: "Se eliminarán también todos sus peligros.",
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try { await geritraService.deleteCategory(orgId, cat.id); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Error",
      text: err.response?.data?.detail, confirmButtonColor: "#16a34a" }); }
  };

  const handleDeleteFactor = async (factor) => {
    const r = await Swal.fire({
      icon: "warning", title: `¿Eliminar "${factor.name}"?`,
      showCancelButton: true, confirmButtonText: "Eliminar",
      confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try { await geritraService.deleteFactor(orgId, factor.id); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Error",
      text: err.response?.data?.detail, confirmButtonColor: "#16a34a" }); }
  };

  const toggleExpand = (catId) =>
    setExpanded(e => ({ ...e, [catId]: !e[catId] }));

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
    </div>
  );

  // Semillas predefinidas por si la organización no tiene categorías aún
  const SEED_CATEGORIES = [
    { name: "Mecánico",     color: "#ef4444" },
    { name: "Físico",       color: "#f97316" },
    { name: "Químico",      color: "#eab308" },
    { name: "Biológico",    color: "#22c55e" },
    { name: "Ergonómico",   color: "#3b82f6" },
    { name: "Psicosocial",  color: "#8b5cf6" },
    { name: "Eléctrico",    color: "#ec4899" },
    { name: "Acc. Mayor",   color: "#14b8a6" },
  ];

  const handleSeedCategories = async () => {
    const r = await Swal.fire({
      icon: "question", title: "Cargar categorías predefinidas",
      text: "Se crearán las 8 categorías estándar GERITRA. Podrás editarlas después.",
      showCancelButton: true, confirmButtonText: "Cargar",
      confirmButtonColor: "#16a34a", cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    try {
      for (let i = 0; i < SEED_CATEGORIES.length; i++) {
        await geritraService.createCategory(orgId, {
          ...SEED_CATEGORIES[i], order: i });
      }
      load();
      Swal.fire({ icon: "success", title: "Categorías creadas",
        timer: 1500, showConfirmButton: false });
    } catch { /**/ }
  };

  return (
  <DashboardLayout> 
    <div className="space-y-6">
      {/* Header sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-base font-bold text-gray-900">Catálogo GERITRA</h3>
            <p className="text-xs text-gray-400">
              Categorías y peligros disponibles para todas las empresas de tu organización.
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {categories.length === 0 && (
              <Button onClick={handleSeedCategories}
                variant="outline" className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                Cargar categorías estándar
              </Button>
            )}
            <Button onClick={() => { setEditingCat(null); setCatModal(true); }}
              className="bg-green-600 hover:bg-green-700 text-white text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Nueva categoría
            </Button>
          </div>
        )}
      </div>

      {/* Lista categorías */}
      {categories.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
          <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Sin categorías de riesgo configuradas.</p>
          <p className="text-xs text-gray-300 mt-1">
            Crea categorías como Mecánico, Físico, Químico... o carga las predefinidas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const catFactors = factors.filter(f => f.category_id === cat.id);
            const isOpen = expanded[cat.id];
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabecera categoría */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleExpand(cat.id)}
                    className="flex items-center gap-2 flex-1 min-w-0">
                    <div style={{ backgroundColor: cat.color }}
                      className="w-4 h-4 rounded-full flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({catFactors.length} peligros)
                    </span>
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />}
                  </button>
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => {
                        setDefaultCatId(cat.id);
                        setEditingFactor(null);
                        setFactorModal(true);
                      }} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Agregar peligro">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditingCat(cat); setCatModal(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCat(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Factores expandidos */}
                {isOpen && (
                  <div className="border-t border-gray-50 px-4 pb-3">
                    {catFactors.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">
                        Sin peligros registrados en esta categoría.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        {catFactors.map(factor => (
                          <div key={factor.id}
                            className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{factor.name}</p>
                              {factor.effect && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Efecto: {factor.effect}
                                </p>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditingFactor(factor); setFactorModal(true); }}
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteFactor(factor)}
                                  className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {canManage && (
                      <button onClick={() => {
                        setDefaultCatId(cat.id);
                        setEditingFactor(null);
                        setFactorModal(true);
                      }} className="mt-2 text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Agregar peligro
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <CategoryModal open={catModal} onClose={() => setCatModal(false)}
        editing={editingCat} orgId={orgId} onSaved={load} />
      <FactorModal open={factorModal} onClose={() => setFactorModal(false)}
        editing={editingFactor} orgId={orgId} categories={categories}
        defaultCategoryId={defaultCatId} onSaved={load} />
    </div>
  </DashboardLayout>
  );
};

export default GeritraConfigSection;