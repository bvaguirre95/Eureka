import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import workerService from "../../services/worker.service";
import geritraService from "../../services/geritra.service";

const EMPTY = {
  // Identificación
  employee_code: "",
  doc_type: "cedula",
  doc_number: "",
  // Personales
  first_name: "", last_name: "",
  birth_date: "", gender: "",
  phone: "", email: "",
  // Laboral
  hire_date: "", contract_type: "",
  job_position_id: "",
  // Discapacidad
  disability_type: "", disability_pct: "",
  notes: "",
};

const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
  focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all`;

const selectCls = `${inputCls} bg-white`;

const TABS = [
  { id: "identificacion", label: "Identificación" },
  { id: "laboral",        label: "Datos laborales" },
  { id: "adicional",      label: "Adicional"       },
];

export const WorkerFormModal = ({ open, onClose, editing, companyId, onSaved }) => {
  const [form, setForm]         = useState(EMPTY);
  const [tab, setTab]           = useState("identificacion");
  const [saving, setSaving]     = useState(false);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!open) return;
    setTab("identificacion");
    if (editing) {
      setForm({
        employee_code:   editing.employee_code   || "",
        doc_type:        editing.doc_type        || "cedula",
        doc_number:      editing.doc_number      || "",
        first_name:      editing.first_name      || "",
        last_name:       editing.last_name       || "",
        birth_date:      editing.birth_date      || "",
        gender:          editing.gender          || "",
        phone:           editing.phone           || "",
        email:           editing.email           || "",
        hire_date:       editing.hire_date       || "",
        contract_type:   editing.contract_type   || "",
        job_position_id: editing.job_position_id || "",
        disability_type: editing.disability_type || "",
        disability_pct:  editing.disability_pct  || "",
        notes:           editing.notes           || "",
      });
    } else {
      setForm(EMPTY);
    }
    // Cargar puestos disponibles
    geritraService.getJobPositions(companyId)
      .then(data => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]));
  }, [open, editing, companyId]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.doc_number.trim()) return "El número de documento es obligatorio";
    if (!form.first_name.trim()) return "El nombre es obligatorio";
    if (!form.last_name.trim())  return "El apellido es obligatorio";
    if (!form.hire_date)         return "La fecha de ingreso es obligatoria";
    if (form.doc_type === "cedula") {
      const n = form.doc_number.trim();
      if (!/^\d{10}$/.test(n)) return "La cédula ecuatoriana debe tener exactamente 10 dígitos";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Swal.fire({ icon: "warning", title: err, confirmButtonColor: "#16a34a" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        job_position_id: form.job_position_id ? Number(form.job_position_id) : null,
        disability_pct:  form.disability_pct  ? Number(form.disability_pct)  : null,
        birth_date:      form.birth_date  || null,
        gender:          form.gender      || null,
        contract_type:   form.contract_type || null,
        disability_type: form.disability_type || null,
        notes:           form.notes || null,
        employee_code:   form.employee_code || null,
        phone:           form.phone || null,
        email:           form.email || null,
      };
      if (editing) {
        // En edición no enviamos doc_type/doc_number (no son modificables)
        const { doc_type, doc_number, ...editPayload } = payload;
        await workerService.updateWorker(companyId, editing.id, editPayload);
      } else {
        await workerService.createWorker(companyId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al guardar. Verifica los datos.";
      Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">
            {editing ? "Editar trabajador" : "Registrar trabajador"}
          </h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-6 pt-3 border-b flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
                tab === t.id
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── IDENTIFICACIÓN ── */}
          {tab === "identificacion" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tipo de documento <span className="text-red-500">*</span>
                  </label>
                  <select value={form.doc_type}
                    onChange={e => set("doc_type", e.target.value)}
                    disabled={!!editing}
                    className={selectCls}>
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input value={form.doc_number}
                    onChange={e => set("doc_number", e.target.value)}
                    disabled={!!editing}
                    placeholder={form.doc_type === "cedula" ? "0000000000" : "Número"}
                    className={`${inputCls} ${editing ? "bg-gray-50 text-gray-400" : ""}`} />
                </div>
              </div>

              {editing && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200
                  rounded-lg px-3 py-2">
                  ⚠️ El tipo y número de documento no pueden modificarse para preservar la integridad del historial SST.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input value={form.first_name}
                    onChange={e => set("first_name", e.target.value)}
                    placeholder="Nombres" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input value={form.last_name}
                    onChange={e => set("last_name", e.target.value)}
                    placeholder="Apellidos" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha de nacimiento
                  </label>
                  <input type="date" value={form.birth_date}
                    onChange={e => set("birth_date", e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Género</label>
                  <select value={form.gender}
                    onChange={e => set("gender", e.target.value)}
                    className={selectCls}>
                    <option value="">— Seleccionar —</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                  <input value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                    placeholder="0999999999" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="correo@empresa.com" className={inputCls} />
                </div>
              </div>
            </>
          )}

          {/* ── DATOS LABORALES ── */}
          {tab === "laboral" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Código interno (opcional)
                </label>
                <input value={form.employee_code}
                  onChange={e => set("employee_code", e.target.value)}
                  placeholder="Ej: EMP-001" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha de ingreso <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={form.hire_date}
                    onChange={e => set("hire_date", e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tipo de contrato
                  </label>
                  <select value={form.contract_type}
                    onChange={e => set("contract_type", e.target.value)}
                    className={selectCls}>
                    <option value="">— Seleccionar —</option>
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo fijo</option>
                    <option value="obra">Obra</option>
                    <option value="servicios">Servicios</option>
                    <option value="pasantia">Pasantía</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Puesto de trabajo inicial
                </label>
                <select value={form.job_position_id}
                  onChange={e => set("job_position_id", e.target.value)}
                  className={selectCls}>
                  <option value="">— Sin asignar —</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.department ? ` · ${p.department}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Puedes asignar o cambiar el puesto después desde la ficha del trabajador.
                </p>
              </div>
            </>
          )}

          {/* ── ADICIONAL ── */}
          {tab === "adicional" && (
            <>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  Discapacidad (Ley Orgánica de Discapacidades)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tipo de discapacidad
                    </label>
                    <select value={form.disability_type}
                      onChange={e => set("disability_type", e.target.value)}
                      className={selectCls}>
                      <option value="">— No aplica —</option>
                      <option value="Física">Física</option>
                      <option value="Visual">Visual</option>
                      <option value="Auditiva">Auditiva</option>
                      <option value="Intelectual">Intelectual</option>
                      <option value="Psicosocial">Psicosocial</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      % (carné CONADIS)
                    </label>
                    <input type="number" min="0" max="100"
                      value={form.disability_pct}
                      onChange={e => set("disability_pct", e.target.value)}
                      placeholder="Ej: 40" className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Observaciones SST
                </label>
                <textarea value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  rows={4}
                  placeholder="Observaciones relevantes para SST (no clínicas). Ej: restricciones de trabajo en alturas según evaluación médica..."
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">
                  No incluir información clínica aquí. La información médica se gestiona en el módulo de Salud Ocupacional.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            {saving
              ? <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </span>
              : editing ? "Guardar cambios" : "Registrar trabajador"
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkerFormModal;