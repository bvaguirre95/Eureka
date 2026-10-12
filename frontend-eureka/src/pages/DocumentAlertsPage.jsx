/**
 * DocumentAlertsPage — Alertas de Vencimiento Documental
 * Ruta: /dashboard/alertas-documentos
 *
 * Fixes aplicados:
 * - orgId robusto: usa organization.id, organizationId, o selectedOrgId
 * - Error visible cuando la carga falla
 * - include_overdue=true siempre muestra vencidos independiente del filtro de días
 * - Ventana ampliada a 90 días por defecto
 * - Muestra estado de carga y mensajes claros
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Bell, CheckCircle2, Clock,
  Loader2, Mail, Play, RefreshCw, Settings, X,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import documentAlertService from "../services/document_alert.service";
import Swal from "sweetalert2";

// ── Helpers ────────────────────────────────────────────────────────────────────

const urgencyStyle = (days) => {
  if (days < 0)   return { bg: "bg-red-50",    badge: "bg-red-100 text-red-700",       icon: "text-red-500",    label: "VENCIDO"     };
  if (days === 0) return { bg: "bg-red-50",    badge: "bg-red-100 text-red-700",       icon: "text-red-500",    label: "HOY"         };
  if (days <= 7)  return { bg: "bg-red-50",    badge: "bg-red-100 text-red-700",       icon: "text-red-500",    label: `${days} días` };
  if (days <= 15) return { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", icon: "text-orange-500", label: `${days} días` };
  if (days <= 30) return { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", icon: "text-yellow-600", label: `${days} días` };
  return           { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",   icon: "text-blue-500",   label: `${days} días` };
};

const STATUS_LABELS = {
  pendiente: "Pendiente", cargado: "Cargado",
  rechazado: "Rechazado", vencido: "Vencido",
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// ── Modal configuración ────────────────────────────────────────────────────────

const AlertConfigModal = ({ open, onClose, orgId, onSaved }) => {
  const [days, setDays]       = useState([30, 7]);
  const [enabled, setEnabled] = useState(true);
  const [newDay, setNewDay]   = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!open || !orgId) return;
    setLoading(true);
    documentAlertService.getConfig(orgId)
      .then(c => { setDays(c.days_list || [30, 7]); setEnabled(c.is_enabled); })
      .catch(() => { setDays([30, 7]); setEnabled(true); })
      .finally(() => setLoading(false));
  }, [open, orgId]);

  if (!open) return null;

  const addDay = () => {
    const d = parseInt(newDay);
    if (!d || d < 1 || d > 365 || days.includes(d)) { setNewDay(""); return; }
    setDays(p => [...p, d].sort((a, b) => b - a));
    setNewDay("");
  };

  const save = async () => {
    if (!days.length) {
      Swal.fire({ icon: "warning", title: "Agrega al menos un período", confirmButtonColor: "#16a34a" });
      return;
    }
    setSaving(true);
    try {
      await documentAlertService.updateConfig(orgId, { days_before: days, is_enabled: enabled });
      onSaved();
      onClose();
      Swal.fire({ icon: "success", title: "Configuración guardada", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error al guardar", confirmButtonColor: "#16a34a" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Configurar alertas</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">Alertas por correo</p>
                  <p className="text-xs text-gray-500">Notificar al técnico asignado a cada empresa</p>
                </div>
                <button onClick={() => setEnabled(p => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? "bg-green-600" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Días antes del vencimiento para enviar alerta
                </p>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                  {days.map(d => (
                    <span key={d}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                      {d === 1 ? "1 día" : `${d} días`}
                      <button onClick={() => setDays(p => p.filter(x => x !== d))}
                        className="hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {!days.length && <span className="text-sm text-gray-400 italic">Sin períodos</span>}
                </div>
                <div className="flex gap-2">
                  <input type="number" min="1" max="365" placeholder="Ej: 15"
                    value={newDay} onChange={e => setNewDay(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addDay()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none" />
                  <Button onClick={addDay} variant="outline" className="text-sm">Agregar</Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Ejemplos comunes: 30, 15, 7 días antes del vencimiento.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading}
            className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────────

export const DocumentAlertsPage = () => {
  const { user, hasPermission } = useAuth();
  const { selectedOrgId }       = useOrganization();

  // orgId robusto — varios campos según el modelo de usuario
  const orgId = (
    user?.organization?.id ||
    user?.organization_id  ||
    selectedOrgId          ||
    null
  );

  const canManage = hasPermission("settings.manage");

  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [running, setRunning]       = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [filterDays, setFilterDays] = useState(90);
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    if (!orgId) {
      setError("No se pudo determinar la organización. Verifica que tu usuario tenga una organización asignada.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await documentAlertService.getExpiring(orgId, {
        days: filterDays,
        includeOverdue: true,   // siempre incluir vencidos
      });
      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Error al cargar alertas";
      setError(msg);
      setDocs([]);
    } finally { setLoading(false); }
  }, [orgId, filterDays]);

  useEffect(() => { load(); }, [load]);

  const handleRunNow = async () => {
    if (!orgId) return;
    setRunning(true);
    try {
      const res = await documentAlertService.runNow(orgId);
      await load(); // recargar la lista después de ejecutar
      Swal.fire({
        icon: "success",
        title: "Proceso completado",
        html: `
          <div class="text-sm text-gray-600 space-y-1 text-left">
            <p>✉️ Correos enviados: <strong>${res.sent}</strong></p>
            ${res.expired_marked > 0
              ? `<p>🔴 Documentos marcados como vencidos: <strong>${res.expired_marked}</strong></p>`
              : ""}
            ${res.errors > 0
              ? `<p class="text-red-500">⚠️ Errores: <strong>${res.errors}</strong></p>`
              : ""}
          </div>`,
        confirmButtonColor: "#16a34a",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al ejecutar alertas",
        text: err.response?.data?.detail || "Intenta nuevamente",
        confirmButtonColor: "#16a34a",
      });
    } finally { setRunning(false); }
  };

  // Filtros locales
  const vencidoCount = docs.filter(d => d.status === "vencido").length;
  const proximoCount = docs.filter(d => d.status === "validado").length;

  const filtered = docs.filter(d => {
    if (filterStatus === "vencido" && d.status !== "vencido") return false;
    if (filterStatus === "proximo" && d.status !== "validado") return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-600" />
              Alertas de Vencimiento
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Documentos SST vencidos o próximos a vencer en tus empresas.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={load} title="Recargar"
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {canManage && (
              <>
                <Button variant="outline" className="text-sm gap-2"
                  onClick={() => setConfigOpen(true)}>
                  <Settings className="w-4 h-4" /> Configurar
                </Button>
                <Button onClick={handleRunNow} disabled={running}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm gap-2">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Enviar alertas ahora
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error de org o carga */}
        {!orgId && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ No se pudo determinar tu organización.
            </p>
            <p className="text-xs text-red-500 mt-1">
              Verifica que tu usuario tenga una organización asignada o selecciona una en el selector de la parte superior.
            </p>
          </div>
        )}

        {error && orgId && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
            <button onClick={load}
              className="text-xs text-red-600 underline mt-1">
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{vencidoCount}</p>
            <p className="text-xs text-red-500 font-medium mt-0.5">Vencidos</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{proximoCount}</p>
            <p className="text-xs text-orange-500 font-medium mt-0.5">Por vencer</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{docs.length}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Total</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl p-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" /> Ventana:
          </span>
          {[30, 60, 90, 180].map(d => (
            <button key={d} onClick={() => setFilterDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterDays === d ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {d} días
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200 mx-1" />
          {[
            { k: "all",     l: "Todos"      },
            { k: "vencido", l: "Vencidos"   },
            { k: "proximo", l: "Por vencer" },
          ].map(f => (
            <button key={f.k} onClick={() => setFilterStatus(f.k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === f.k ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <p className="text-sm text-gray-400">Cargando documentos...</p>
          </div>
        ) : !orgId ? null : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-gray-600">
              {docs.length === 0
                ? `No hay documentos que venzan en los próximos ${filterDays} días`
                : "No hay documentos en esta categoría"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {docs.length === 0
                ? "Todos los documentos están al día o no tienen fecha de vencimiento definida."
                : `Hay ${docs.length} documento(s) en otras categorías.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => {
              const urg = urgencyStyle(doc.days_remaining);
              return (
                <div key={doc.company_document_id}
                  className={`${urg.bg} border border-gray-200 rounded-xl p-4 flex items-start gap-3`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${urg.icon}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{doc.document_code}</span>
                      <p className="text-sm font-semibold text-gray-800">{doc.document_name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urg.badge}`}>
                        {doc.days_remaining < 0 ? `VENCIDO hace ${Math.abs(doc.days_remaining)} días` : urg.label}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-gray-700">{doc.company_name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">Período: {doc.period_display}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        Vence: {fmtDate(doc.due_date)}
                      </span>
                      {doc.technician_name && (
                        <>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {doc.technician_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        orgId={orgId}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default DocumentAlertsPage;