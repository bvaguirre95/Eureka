import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  Activity, Building2, FileText, Loader, Settings, Trash2, Upload, User
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../../components/ui/button";
import companyService from "../../services/company.service";
import inspectionService from "../../services/inspection.service";
import { isValidRuc } from "../../utils/ecuadorValidators";
import { CompanyLogo } from "./CompanyLogo";

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "general",    label: "Datos generales", icon: Building2 },
  { id: "documentos", label: "Documentos SST",   icon: FileText  },
  { id: "geritra",    label: "GERITRA",           icon: Activity  },
  { id: "sistema",    label: "Sistema",           icon: Settings  },
  { id: "firmantes",  label: "Firmantes",         icon: User      },
];

// ── Fórmula GERITRA ───────────────────────────────────────────────────────────

const DEFAULT_GERITRA = {
  formula:               "estandar",
  trivial_max:             4,
  tolerable_max:           8,
  moderado_max:           16,
  importante_max:         24,
  generar_accion_desde: "MODERADO",
};

const NIVEL_COLORS = {
  TRIVIAL:     "bg-green-100 text-green-700",
  TOLERABLE:   "bg-blue-100 text-blue-700",
  MODERADO:    "bg-amber-100 text-amber-700",
  IMPORTANTE:  "bg-orange-100 text-orange-700",
  INTOLERABLE: "bg-red-100 text-red-700",
};

const emptyForm = {
  ruc: "", razon_social: "", nombre_comercial: "", company_code: "",
  industria: "", num_trabajadores: 0, direccion: "", ciudad: "",
  telefono: "", email_contacto: "", is_active: true,
  descripcion: "", intro_inspeccion: "",
  geritra_config: { ...DEFAULT_GERITRA },
};

const emptySigners = {
  elaborated_role: "",
  reviewed_by:     "",
  reviewed_role:   "",
  approved_by:     "",
  approved_role:   "",
};

export const CompanyFormModal = ({ open, onClose, company, onSaved }) => {
  const [form, setForm]           = useState(emptyForm);
  const [signers, setSigners]     = useState(emptySigners);
  const [signersLoading, setSignersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting]   = useState(false);
  const [hasLogo, setHasLogo]     = useState(false);
  const [logoKey, setLogoKey]     = useState(0);
  const logoInputRef              = useRef(null);
  const isEditing                 = !!company;

  // ── Cargar form ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setActiveTab("general");
    setErrors({});
    setSigners(emptySigners);
    if (company) {
      setForm({
        ruc:               company.ruc              || "",
        razon_social:      company.razon_social     || "",
        nombre_comercial:  company.nombre_comercial || "",
        company_code:      company.company_code     || "",
        industria:         company.industria        || "",
        num_trabajadores:  company.num_trabajadores || 0,
        direccion:         company.direccion        || "",
        ciudad:            company.ciudad           || "",
        telefono:          company.telefono         || "",
        email_contacto:    company.email_contacto   || "",
        is_active:         company.is_active        ?? true,
        show_on_website:   company.show_on_website  ?? true,
        descripcion:       company.descripcion      || "",
        intro_inspeccion:  company.intro_inspeccion || "",
        geritra_config:    company.geritra_config
          ? { ...DEFAULT_GERITRA, ...company.geritra_config }
          : { ...DEFAULT_GERITRA },
      });
      setHasLogo(company.has_logo || false);
    } else {
      setForm(emptyForm);
      setHasLogo(false);
    }
  }, [open, company]);

  // ── Cargar firmantes cuando se abre el tab ────────────────────────────────
  useEffect(() => {
    if (activeTab !== "firmantes" || !company) return;
    setSignersLoading(true);
    inspectionService.getSigners(company.id)
      .then(data => setSigners({
        elaborated_role: data.elaborated_role || "",
        reviewed_by:     data.reviewed_by     || "",
        reviewed_role:   data.reviewed_role   || "",
        approved_by:     data.approved_by     || "",
        approved_role:   data.approved_role   || "",
      }))
      .catch(() => {})
      .finally(() => setSignersLoading(false));
  }, [activeTab, company]);

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setG = (k, v) => setForm(f => ({
    ...f, geritra_config: { ...f.geritra_config, [k]: v }
  }));
  const setSigner = (k, v) => setSigners(s => ({ ...s, [k]: v }));

  // ── Logo ──────────────────────────────────────────────────────────────────
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setLogoUploading(true);
    try {
      const updated = await companyService.uploadLogo(company.id, file);
      setHasLogo(updated.has_logo);
      setLogoKey(k => k + 1);
      onSaved();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo subir el logo",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
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
      setLogoKey(k => k + 1);
      onSaved();
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo eliminar el logo",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setLogoDeleting(false); }
  };

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!isEditing) {
      if (!/^\d{13}$/.test(form.ruc.trim()))
        errs.ruc = "El RUC debe tener 13 dígitos";
      else if (!isValidRuc(form.ruc.trim()))
        errs.ruc = "El RUC no es válido";
    }
    if (!form.razon_social.trim()) errs.razon_social = "Obligatorio";
    if (Number(form.num_trabajadores) < 0) errs.num_trabajadores = "No puede ser negativo";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) { setActiveTab("general"); return; }
    setSubmitting(true);
    try {
      const payload = {
        razon_social:     form.razon_social.trim(),
        nombre_comercial: form.nombre_comercial.trim() || null,
        company_code:     form.company_code.trim().toUpperCase() || null,
        industria:        form.industria.trim() || null,
        num_trabajadores: Number(form.num_trabajadores),
        direccion:        form.direccion.trim() || null,
        ciudad:           form.ciudad.trim() || null,
        telefono:         form.telefono.trim() || null,
        email_contacto:   form.email_contacto.trim() || null,
        descripcion:      form.descripcion.trim() || null,
        intro_inspeccion: form.intro_inspeccion.trim() || null,
        is_active:        form.is_active,
        show_on_website:  form.show_on_website,
        geritra_config:   form.geritra_config,
      };

      if (isEditing) {
        // Guardar empresa y firmantes en paralelo
        const tasks = [companyService.updateCompany(company.id, payload)];
        if (activeTab === "firmantes" || signers.elaborated_role || signers.reviewed_by || signers.approved_by) {
          tasks.push(inspectionService.updateSigners(company.id, signers));
        }
        await Promise.all(tasks);
      } else {
        await companyService.createCompany({ ...payload, ruc: form.ruc.trim() });
      }

      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error",
        title: isEditing ? "No se pudo actualizar" : "No se pudo crear",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a" });
    } finally { setSubmitting(false); }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
  const inp      = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            {isEditing ? `Editar — ${company?.razon_social}` : "Nueva empresa"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0.5 px-6 pt-4 border-b border-gray-100">
          {(isEditing ? TABS : [TABS[0]]).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2
                  ${activeTab === tab.id
                    ? "border-green-500 text-green-700 bg-green-50"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Tab: Datos generales ── */}
          {activeTab === "general" && (
            <>
              {isEditing && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className={labelCls}>Logo de la empresa</label>
                  <div className="flex items-center gap-4">
                    <CompanyLogo key={logoKey} companyId={company.id} hasLogo={hasLogo} size={56} />
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input ref={logoInputRef} type="file"
                          accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden"
                          onChange={handleLogoChange} />
                        <Button type="button" variant="outline" disabled={logoUploading}
                          onClick={() => logoInputRef.current?.click()} className="text-xs">
                          {logoUploading
                            ? <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                          {hasLogo ? "Cambiar logo" : "Subir logo"}
                        </Button>
                        {hasLogo && (
                          <Button type="button" variant="outline" disabled={logoDeleting}
                            onClick={handleDeleteLogo}
                            className="text-xs text-red-600 hover:text-red-700 border-red-200">
                            {logoDeleting
                              ? <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                            Eliminar
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">PNG, JPG, SVG o WEBP — máx. 2 MB.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>RUC</label>
                  <input value={form.ruc} disabled={isEditing} maxLength={13}
                    onChange={e => set("ruc", e.target.value.replace(/\D/g, ""))}
                    placeholder="13 dígitos" className={inputCls} />
                  {errors.ruc && <p className="text-xs text-red-500 mt-1">{errors.ruc}</p>}
                </div>
                <div>
                  <label className={labelCls}>N.º de trabajadores</label>
                  <input type="number" min={0} value={form.num_trabajadores}
                    onChange={e => set("num_trabajadores", e.target.value)} className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Determina documentos del catálogo normativo.</p>
                </div>
              </div>

              <div>
                <label className={labelCls}>Razón social *</label>
                <input value={form.razon_social} onChange={e => set("razon_social", e.target.value)} className={inputCls} />
                {errors.razon_social && <p className="text-xs text-red-500 mt-1">{errors.razon_social}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre comercial</label>
                  <input value={form.nombre_comercial} onChange={e => set("nombre_comercial", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Código de empresa</label>
                  <input value={form.company_code} maxLength={20}
                    onChange={e => set("company_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="MET, ABC..." className={`${inputCls} font-mono`} />
                  {form.company_code && (
                    <p className="text-xs text-green-600 mt-1 font-mono">
                      {form.company_code}-IEXT-001
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Industria</label>
                  <input value={form.industria} onChange={e => set("industria", e.target.value)}
                    placeholder="Ej: Manufactura, Alimentos..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input value={form.ciudad} onChange={e => set("ciudad", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input value={form.telefono} onChange={e => set("telefono", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email de contacto</label>
                  <input type="email" value={form.email_contacto} onChange={e => set("email_contacto", e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input
      type="checkbox"
      checked={form.is_active}
      onChange={e => set("is_active", e.target.checked)}
      className="w-4 h-4 accent-green-600"
    />
    Empresa activa
  </label>

  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input
      type="checkbox"
      checked={form.show_on_website}
      onChange={e => set("show_on_website", e.target.checked)}
      className="w-4 h-4 accent-green-600"
    />
    Mostrar en el sitio web
  </label>
</div>
            </>
          )}

          {/* ── Tab: Documentos SST ── */}
          {activeTab === "documentos" && (
            <>
              <div>
                <label className={labelCls}>Descripción de la empresa</label>
                <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
                  rows={4} placeholder="Describe la actividad principal de la empresa..."
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">
                  Aparece en la sección "Introducción" de los informes PDF.
                </p>
              </div>
              <div>
                <label className={labelCls}>
                  Introducción personalizada para informes
                  <span className="ml-2 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea value={form.intro_inspeccion} onChange={e => set("intro_inspeccion", e.target.value)}
                  rows={5}
                  placeholder="Si se deja vacío se usa la descripción. Puedes personalizar el texto de introducción que aparecerá en cada informe PDF de inspección..."
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">
                  Si se completa, reemplaza la descripción en los informes.
                </p>
              </div>
            </>
          )}

          {/* ── Tab: GERITRA ── */}
          {activeTab === "geritra" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-800 mb-1">Configuración de la Matriz GERITRA</p>
                <p className="text-xs text-blue-600">
                  Define la fórmula de evaluación y los rangos de clasificación de riesgos
                  para esta empresa. La fórmula estándar sigue la normativa ecuatoriana.
                </p>
              </div>

              <div>
                <label className={labelCls}>Fórmula de evaluación</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "estandar",      label: "Estándar Ecuador",
                      desc: "P = IP + IC + ICE + IE  ·  ER = P × C" },
                    { value: "personalizada", label: "Personalizada",
                      desc: "Modifica los rangos de clasificación" },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setG("formula", opt.value)}
                      className={`text-left p-3 rounded-xl border-2 transition-all
                        ${form.geritra_config.formula === opt.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"}`}>
                      <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.geritra_config.formula === "estandar" && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Índices de evaluación (estándar)
                  </p>
                  {[
                    { label: "IP — Personas expuestas", vals: "1=1-3 pers. · 2=4-12 pers. · 3=+12 pers." },
                    { label: "IC — Capacitación",       vals: "1=Entrenado · 2=Parcial · 3=No entrenado" },
                    { label: "ICE — Controles",         vals: "1=Adecuados · 2=Parciales · 3=Sin controles" },
                    { label: "IE — Exposición",         vals: "1=Esporádica · 2=Ocasional · 3=Frecuente · 4=Continua" },
                    { label: "C — Consecuencia",        vals: "1=Sin incap. · 2=Incap. temporal · 3=Permanente · 4=Muerte" },
                  ].map(i => (
                    <div key={i.label} className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-gray-700 w-40 flex-shrink-0">{i.label}</span>
                      <span className="text-xs text-gray-400">{i.vals}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-bold text-gray-600">Clasificación estándar:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { label: "TRIVIAL 1-4",       cls: "bg-green-100 text-green-700"   },
                        { label: "TOLERABLE 5-8",     cls: "bg-blue-100 text-blue-700"     },
                        { label: "MODERADO 9-16",     cls: "bg-amber-100 text-amber-700"   },
                        { label: "IMPORTANTE 17-24",  cls: "bg-orange-100 text-orange-700" },
                        { label: "INTOLERABLE 25+",   cls: "bg-red-100 text-red-700"       },
                      ].map(n => (
                        <span key={n.label} className={`text-xs font-bold px-2 py-0.5 rounded-full ${n.cls}`}>
                          {n.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {form.geritra_config.formula === "personalizada" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Rangos de clasificación (ER máximo por nivel)
                  </p>
                  {[
                    { key: "trivial_max",    label: "TRIVIAL — ER máximo",    color: "text-green-700"  },
                    { key: "tolerable_max",  label: "TOLERABLE — ER máximo",  color: "text-blue-700"   },
                    { key: "moderado_max",   label: "MODERADO — ER máximo",   color: "text-amber-700"  },
                    { key: "importante_max", label: "IMPORTANTE — ER máximo", color: "text-orange-700" },
                  ].map(r => (
                    <div key={r.key} className="flex items-center gap-4">
                      <label className={`text-sm font-semibold w-52 flex-shrink-0 ${r.color}`}>
                        {r.label}
                      </label>
                      <input type="number" min={1} max={99}
                        value={form.geritra_config[r.key]}
                        onChange={e => setG(r.key, Number(e.target.value))}
                        className="w-24 border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-green-500" />
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">
                    INTOLERABLE = todo ER mayor a {form.geritra_config.importante_max}
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Generar acción correctiva automática desde</label>
                <div className="flex flex-wrap gap-2">
                  {["MODERADO", "IMPORTANTE", "INTOLERABLE"].map(nivel => (
                    <button key={nivel} type="button"
                      onClick={() => setG("generar_accion_desde", nivel)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all
                        ${form.geritra_config.generar_accion_desde === nivel
                          ? `${NIVEL_COLORS[nivel]} border-current`
                          : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                      {nivel}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cuando un riesgo alcance este nivel, se creará automáticamente una acción correctiva.
                </p>
              </div>
            </>
          )}

          {/* ── Tab: Sistema ── */}
          {activeTab === "sistema" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-800 mb-1">Configuración del sistema</p>
                <p className="text-xs text-amber-600">
                  Estas opciones afectan el comportamiento del sistema para esta empresa.
                </p>
              </div>

              <div>
                <label className={labelCls}>Código de empresa para secuencias</label>
                <input value={form.company_code} maxLength={20}
                  onChange={e => set("company_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="MET, ABC, EMP..." className={`${inputCls} font-mono`} />
                <p className="text-xs text-gray-400 mt-1">
                  Se usa en la numeración automática de inspecciones.
                  Ej: <strong className="font-mono text-green-600">
                    {form.company_code || "ABC"}-IEXT-001
                  </strong>
                </p>
              </div>

              <div>
                <label className={labelCls}>Estado de la empresa</label>
                <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => set("is_active", e.target.checked)}
                    className="w-4 h-4 accent-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Empresa activa</p>
                    <p className="text-xs text-gray-400">
                      Las empresas inactivas no aparecen en los módulos de gestión.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* ── Tab: Firmantes ── */}
          {activeTab === "firmantes" && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-800 mb-1">Firmantes del informe</p>
                <p className="text-xs text-blue-600">
                  Estos valores se usarán por defecto al crear cualquier inspección para esta empresa.
                </p>
              </div>

              {signersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Elaborado por */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Elaborado por
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      El nombre se toma automáticamente del usuario que crea la inspección.
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Cargo / Rol</label>
                      <input value={signers.elaborated_role}
                        onChange={e => setSigner("elaborated_role", e.target.value)}
                        placeholder="Ej: TÉCNICO SIG" className={inp} />
                    </div>
                  </div>

                  {/* Revisado por */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Revisado por</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo</label>
                        <input value={signers.reviewed_by}
                          onChange={e => setSigner("reviewed_by", e.target.value)}
                          placeholder="Ej: Ing. Gabriela Avecillas A." className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cargo / Rol</label>
                        <input value={signers.reviewed_role}
                          onChange={e => setSigner("reviewed_role", e.target.value)}
                          placeholder="Ej: SUPERVISORA SIG" className={inp} />
                      </div>
                    </div>
                  </div>

                  {/* Aprobado por */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Aprobado por</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo</label>
                        <input value={signers.approved_by}
                          onChange={e => setSigner("approved_by", e.target.value)}
                          placeholder="Ej: Ing. Bryan Tinoco L., Mgtr." className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cargo / Rol</label>
                        <input value={signers.approved_role}
                          onChange={e => setSigner("approved_role", e.target.value)}
                          placeholder="Ej: COORDINADOR SIG" className={inp} />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400">
                    Los firmantes se guardan al presionar <strong>"Guardar cambios"</strong> junto con el resto de la configuración.
                  </p>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white min-w-32 disabled:opacity-60">
            {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear empresa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormModal;
