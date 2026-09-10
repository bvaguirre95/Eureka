import React, { useCallback, useEffect, useRef, useState} from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Download, Save
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import diagnosticService from "../services/diagnostic.service";
import companyService from "../services/company.service";
import { SECTIONS_DATA } from "../data/anexo1Sections";

// ---------- helpers ----------
const SECTIONS_META = [
  { id: "admin",    name: "Gestión Administrativa" },
  { id: "tecnica",  name: "Gestión Técnica" },
  { id: "talento",  name: "Gestión del Talento Humano" },
  { id: "operativo",name: "Procedimientos Operativos Básicos" },
  { id: "servicios",name: "Servicios Permanentes" },
];

const AnswerBtn = ({ value, current, onChange, disabled, label, color }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(value)}
    className={`flex-1 min-w-0 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all
      ${current === value
        ? `${color} border-transparent text-white shadow`
        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {label}
  </button>
);

const QuestionCard = ({ q, answer, observation, onChange, disabled }) => (
  <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
    <div className="flex items-start gap-3 mb-3">
      <span className="text-xs font-bold text-gray-400 mt-0.5 w-10 flex-shrink-0">{q.id}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 leading-snug">{q.text}</p>
        {q.legal_ref && (
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{q.legal_ref}</p>
        )}
      </div>
    </div>

    <div className="flex gap-2 ml-13 mb-2">
      <AnswerBtn value="cumple"     current={answer} onChange={v => onChange(q.id, v, observation)}
        disabled={disabled} label="✔ Cumple"     color="bg-green-500" />
      <AnswerBtn value="no_cumple"  current={answer} onChange={v => onChange(q.id, v, observation)}
        disabled={disabled} label="✘ No cumple" color="bg-red-500" />
      <AnswerBtn value="no_aplica"  current={answer} onChange={v => onChange(q.id, v, observation)}
        disabled={disabled} label="— No aplica" color="bg-gray-400" />
    </div>

    {(answer === "no_cumple" || observation) && (
      <textarea
        value={observation || ""}
        disabled={disabled}
        onChange={(e) => onChange(q.id, answer, e.target.value)}
        placeholder="Observaciones (opcional)..."
        rows={2}
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none resize-none disabled:bg-gray-50"
      />
    )}
  </div>
);

const SectionPanel = ({ section, answers, onAnswer, disabled, stats }) => {
  const [open, setOpen] = useState(true);
  const pct = stats?.percent ?? 0;
  const answered = (stats?.cumple ?? 0) + (stats?.no_cumple ?? 0) + (stats?.no_aplica ?? 0);

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-gray-900 text-sm sm:text-base">{section.name}</p>
            <p className="text-xs text-gray-400">
              {answered} de {section.questions.length} respondidas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className={`text-sm font-bold hidden sm:block ${pct >= 70 ? "text-green-600" : pct > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {pct}%
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {section.questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              answer={answers[q.id]?.answer}
              observation={answers[q.id]?.observation}
              onChange={onAnswer}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Página principal ----------
export const DiagnosticFormPage = () => {
  const { companyId, diagnosticId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("documents.upload");

  const [diag, setDiag] = useState(null);
  const [sections, setSections] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generalData, setGeneralData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const saveTimer = useRef(null);

  // Cargar preguntas del backend (estructura)
  const loadSections = async () => {
    try {
      const res = await fetch("/anexo1_sections.json").catch(() => null);
      if (res?.ok) {
        setSections(await res.json());
      }
    } catch { /**/ }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, company] = await Promise.all([
        diagnosticService.get(companyId, diagnosticId),
        companyService.getCompany(companyId),
      ]);
      setDiag(data);
      const ans = {};
      data.answers.forEach(a => { ans[a.question_id] = { answer: a.answer, observation: a.observation || "" }; });
      setAnswers(ans);
      const { answers: _a, sections: _s, ...general } = data;

      // Fecha hoy por defecto si está vacía
      if (!general.inspection_date) {
        general.inspection_date = new Date().toISOString().slice(0, 10);
      }

      // Pre-poblar con datos de la empresa si los campos están vacíos
      if (!general.razon_social   && company?.razon_social)     general.razon_social    = company.razon_social;
      if (!general.ruc            && company?.ruc)              general.ruc             = company.ruc;
      if (!general.employer_name  && company?.razon_social)     general.employer_name   = company.razon_social;
      if (!general.phone          && company?.telefono)         general.phone           = company.telefono;
      if (!general.email          && company?.email_contacto)   general.email           = company.email_contacto;
      if (!general.workplace_address && company?.direccion)     general.workplace_address = company.direccion;
      if (!general.economic_activity && company?.actividad_economica)
                                                                general.economic_activity = company.actividad_economica;
      // Trabajadores: desde el diagnóstico o desde la empresa
      if (!general.total_workers) {
        general.total_workers = data.company_num_trabajadores || company?.num_trabajadores || 0;
      }
      // Tipo de empresa: pública o privada desde la empresa si existe
      if (!general.company_type && company?.company_type) {
        general.company_type = company.company_type;
      }

      setGeneralData(general);
    } catch { /**/ } finally { setLoading(false); }
  }, [companyId, diagnosticId]);

  // Cargar secciones desde el backend al montar
  useEffect(() => {
    fetch("/api/v1/sections").catch(() => null);
    load();
  }, [load]);

  // Guardar automáticamente 1.5s después del último cambio
  const scheduleAutoSave = (newAnswers, newGeneral) => {
    if (!canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(newAnswers, newGeneral, false), 1500);
  };

  const doSave = async (ans, general, showFeedback = true) => {
    setSaving(true);
    try {
      const payload = {
        ...general,
        answers: Object.entries(ans).map(([question_id, v]) => ({
          question_id,
          answer: v.answer,
          observation: v.observation || null,
        })),
      };
      const updated = await diagnosticService.update(companyId, diagnosticId, payload);
      setDiag(updated);
      if (showFeedback) Swal.fire({ icon: "success", title: "Guardado", timer: 1200, showConfirmButton: false });
    } catch (err) {
      if (showFeedback) Swal.fire({ icon: "error", title: "Error al guardar",
        text: err.response?.data?.detail, confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  const handleAnswer = (question_id, answer, observation) => {
    const newAnswers = { ...answers, [question_id]: { answer, observation: observation || "" } };
    setAnswers(newAnswers);
    scheduleAutoSave(newAnswers, generalData);
  };

  const handleGeneralChange = (field, value) => {
    const newGeneral = { ...generalData, [field]: value };
    setGeneralData(newGeneral);
    scheduleAutoSave(answers, newGeneral);
  };

  const handleComplete = async () => {
    // Validar campos obligatorios de datos generales
    const requiredFields = [
      { key: "inspection_date",   label: "Fecha de inspección"        },
      { key: "razon_social",      label: "Razón social"               },
      { key: "ruc",               label: "RUC"                        },
      { key: "employer_name",     label: "Empleador"                  },
      { key: "company_type",      label: "Tipo de empresa"            },
      { key: "workplace_address", label: "Dirección del centro de trabajo" },
    ];
    const missing = requiredFields.filter(f =>
      !generalData[f.key] || String(generalData[f.key]).trim() === ""
    );
    if (missing.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Completa los datos generales",
        html: `<p class="text-sm text-gray-600 mb-2">Los siguientes campos son obligatorios:</p>
          <ul class="text-sm text-left space-y-1">
            ${missing.map(f => `<li class="text-red-600">• ${f.label}</li>`).join("")}
          </ul>`,
        confirmButtonColor: "#16a34a",
      });
      setActiveTab("general");
      return;
    }

    // Validar que hay al menos alguna respuesta
    const answeredCount = Object.values(answers).filter(a => a.answer).length;
    if (answeredCount === 0) {
      Swal.fire({
        icon: "warning",
        title: "Sin respuestas registradas",
        text: "Completa al menos algunas preguntas antes de marcar el diagnóstico como completado.",
        confirmButtonColor: "#16a34a",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "¿Marcar como completado?",
      html: `<p class="text-sm text-gray-600">El diagnóstico quedará cerrado.</p>
        <p class="text-sm text-gray-500 mt-1">Respondidas: <strong>${answeredCount}</strong> de <strong>${
          Object.keys(answers).length || "—"
        }</strong> preguntas</p>`,
      showCancelButton: true,
      confirmButtonText: "Completar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!result.isConfirmed) return;

    await doSave({ ...answers }, { ...generalData, status: "completado" }, false);
    await load();
    Swal.fire({ icon: "success", title: "Diagnóstico completado", timer: 1500, showConfirmButton: false });
  };

  const sectionStats = {};
  if (diag?.sections) {
    diag.sections.forEach(s => { sectionStats[s.section_id] = s; });
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    </DashboardLayout>
  );

  if (!diag) return null;

  const isCompleted = diag.status === "completado";
  const progress = Math.round((diag.answered / 96) * 100);
  const sectionsMeta = diag.sections || [];

  return (
    <DashboardLayout>
      {/* Header */}
      <button onClick={() => navigate(`/dashboard/empresas/${companyId}/diagnosticos`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a diagnósticos
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <ClipboardList className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Diagnóstico Anexo 1</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                  ${isCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {isCompleted ? "Completado" : "Borrador"}
                </span>
                {saving && <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {diag.diagnostic_type === "inspeccion" ? "Inspección" : "Reinspección"} ·{" "}
                Lista de verificación SST conforme al Anexo 1
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {canEdit && !isCompleted && (
              <>
                <Button onClick={() => doSave(answers, generalData)} disabled={saving} variant="outline" className="text-sm">
                  <Save className="w-4 h-4 mr-1.5" /> Guardar
                </Button>
                <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completar
                </Button>
              </>
            )}
            <Button
              onClick={() => diagnosticService.downloadPdf(companyId, diagnosticId,
                `diagnostico_${diag.inspection_number || diagnosticId}.pdf`)}
              variant="outline" className="text-sm"
            >
              <Download className="w-4 h-4 mr-1.5" /> PDF
            </Button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm text-gray-500 w-28 text-right">
            {diag.answered}/96 · {diag.compliance_percent}% cumpl.
          </span>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
          {sectionsMeta.map(s => (
            <div key={s.section_id} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-400 leading-tight truncate">{s.section_name.split(" ").slice(-1)[0]}</p>
              <p className={`text-sm font-bold mt-0.5 ${s.percent >= 70 ? "text-green-600" : s.percent > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {s.percent}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {[
          { id: "general", label: "Datos generales" },
          { id: "questions", label: "Preguntas (96)" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Datos generales */}
      {activeTab === "general" && (
        <div className="space-y-5">
          <GeneralDataForm data={generalData} onChange={handleGeneralChange} disabled={isCompleted || !canEdit} />
        </div>
      )}

      {/* Tab: Preguntas */}
      {activeTab === "questions" && (
        <QuestionsTab
          answers={answers}
          onAnswer={handleAnswer}
          sectionStats={sectionStats}
          disabled={isCompleted || !canEdit}
        />
      )}
    </DashboardLayout>
  );
};

// ─── GeneralDataForm ──────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, disabled, placeholder, type = "text" }) => (
  <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} disabled={disabled}
    placeholder={placeholder}
    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400" />
);

const RadioGroup = ({ options, value, onChange, disabled }) => (
  <div className="flex gap-3 flex-wrap">
    {options.map(opt => (
      <label key={opt.value}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm
          ${value === opt.value ? "border-green-500 bg-green-50 text-green-700 font-medium" : "border-gray-200 text-gray-500"}
          ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-gray-300"}`}>
        <input type="radio" className="hidden" checked={value === opt.value}
          onChange={() => !disabled && onChange(opt.value)} />
        <span>{opt.icon}</span> {opt.label}
      </label>
    ))}
  </div>
);

const NumberInput = ({ value, onChange, disabled }) => (
  <input type="number" min={0} value={value ?? 0} onChange={e => onChange(Number(e.target.value))} disabled={disabled}
    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none transition-all disabled:bg-gray-50" />
);

const GeneralDataForm = ({ data, onChange, disabled }) => {
  const f = (field) => ({ value: data[field], onChange: (v) => onChange(field, v), disabled });

  return (
    <div className="space-y-5">
      {/* Datos de inspección */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-green-600" /> Datos de inspección
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="N° Diagnóstico">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-green-50 border border-green-200
                rounded-lg text-sm font-mono font-semibold text-green-800 select-all">
                {data.inspection_number || (
                  <span className="text-gray-400 font-normal font-sans italic">
                    Se asignará automáticamente al crear
                  </span>
                )}
              </div>
              {data.inspection_number && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1
                  rounded-full font-medium whitespace-nowrap">
                  ⚡ Auto
                </span>
              )}
            </div>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={data.inspection_date?.slice(0,10) || ""}
              onChange={v => onChange("inspection_date", v)} disabled={disabled} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tipo de evaluación">
              <RadioGroup
                options={[
                  { value: "inspeccion", label: "Inspección", icon: "🔍" },
                  { value: "reinspeccion", label: "Reinspección", icon: "🔄" },
                ]}
                value={data.diagnostic_type} onChange={v => onChange("diagnostic_type", v)} disabled={disabled}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Datos generales de la empresa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          🏢 Datos generales de la empresa
        </h3>
        <div className="mb-4">
          <Field label="Identificación empresarial">
            <RadioGroup
              options={[
                { value: "publica", label: "Empresa pública", icon: "🏛️" },
                { value: "privada", label: "Empresa privada", icon: "🏢" },
              ]}
              value={data.company_type} onChange={v => onChange("company_type", v)} disabled={disabled}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Empleador"><Input {...f("employer_name")} placeholder="Nombre del empleador" /></Field>
          <Field label="Teléfono"><Input {...f("phone")} placeholder="Número de teléfono" /></Field>
          <Field label="Razón social"><Input {...f("razon_social")} placeholder="Razón social" /></Field>
          <Field label="RUC"><Input {...f("ruc")} placeholder="RUC" /></Field>
          <Field label="Correo electrónico"><Input {...f("email")} type="email" placeholder="Correo electrónico" /></Field>
          <Field label="Actividad económica"><Input {...f("economic_activity")} placeholder="Actividad económica" /></Field>
        </div>
      </div>

      {/* Centro de trabajo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          📍 Centro de trabajo
        </h3>
        <div className="mb-4">
          <Field label="Tipo de centro de trabajo">
            <RadioGroup
              options={[
                { value: "matriz", label: "Matriz", icon: "🏭" },
                { value: "sucursal", label: "Sucursal", icon: "🏬" },
              ]}
              value={data.workplace_type} onChange={v => onChange("workplace_type", v)} disabled={disabled}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Dirección del centro de trabajo">
              <Input {...f("workplace_address")} placeholder="Dirección completa" />
            </Field>
          </div>
          <Field label="Número de centros de trabajo">
            <NumberInput value={data.workplace_count} onChange={v => onChange("workplace_count", v)} disabled={disabled} />
          </Field>
          <Field label="Horario de trabajo"><Input {...f("work_schedule")} placeholder="Ej: 08:00 - 17:00" /></Field>
        </div>
      </div>

      {/* Trabajadores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          👷 Trabajadores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field label="Número total de trabajadores">
            <NumberInput value={data.total_workers} onChange={v => onChange("total_workers", v)} disabled={disabled} />
          </Field>
          <Field label="Planilla IESS">
            <RadioGroup
              options={[
                { value: "true", label: "Sí", icon: "" },
                { value: "false", label: "No", icon: "" },
              ]}
              value={data.iess_payroll === true ? "true" : data.iess_payroll === false ? "false" : undefined}
              onChange={v => onChange("iess_payroll", v === "true")} disabled={disabled}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            ["workers_male", "Hombres"], ["workers_female", "Mujeres"],
            ["workers_remote", "Teletrabajadores"], ["workers_foreign", "Extranjeros"],
            ["workers_teen", "Adolescentes"], ["workers_pregnant", "Mujeres embarazadas"],
            ["workers_senior", "Adultos mayores"], ["workers_child", "Niños"],
            ["workers_nursing", "Lactancia"],
          ].map(([field, label]) => (
            <div key={field} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1.5">{label}</p>
              <NumberInput value={data[field]} onChange={v => onChange(field, v)} disabled={disabled} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Entrevistados en la inspección">
            <Input {...f("interviewed")} placeholder="Nombres de los entrevistados" />
          </Field>
        </div>
      </div>
    </div>
  );
};

// ─── QuestionsTab ─────────────────────────────────────────────────────────────
// Carga las preguntas directamente desde la constante importada
const QuestionsTab = ({ answers, onAnswer, sectionStats, disabled }) => (
  <div className="space-y-4">
    {SECTIONS_DATA.map(section => (
      <SectionPanel
        key={section.id}
        section={section}
        answers={answers}
        onAnswer={onAnswer}
        disabled={disabled}
        stats={sectionStats[section.id]}
      />
    ))}
  </div>
);

export default DiagnosticFormPage;