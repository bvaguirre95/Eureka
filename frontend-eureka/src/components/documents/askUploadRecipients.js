import Swal from "sweetalert2";
import documentService from "../../services/document.service";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Pregunta a quién avisar cuando se sube un documento.
 * Devuelve:
 *   undefined → usar destinatarios por defecto del servidor (o el aviso está desactivado / no se pudo consultar)
 *   []        → no avisar a nadie
 *   [ids]     → avisar a esos usuarios
 *   null      → el usuario canceló: no subir
 */
export const askUploadRecipients = async (companyId) => {
  let data;
  try {
    data = await documentService.getUploadRecipients(companyId);
  } catch {
    return undefined;                     // sin lista no se bloquea la carga
  }
  if (!data?.enabled || !data.recipients?.length) return undefined;

  const rows = data.recipients.map((u) => `
    <label style="display:flex;gap:10px;align-items:flex-start;padding:8px 4px;text-align:left;cursor:pointer">
      <input type="checkbox" class="notify-user" value="${u.id}" ${u.is_default ? "checked" : ""}
             style="margin-top:4px">
      <span><strong>${esc(u.full_name)}</strong><br>
        <small style="color:#6b7280">${esc(u.role_name)} · ${esc(u.email)}</small></span>
    </label>`).join("");

  const { isConfirmed, value } = await Swal.fire({
    title: "¿A quién avisar?",
    html: `<p style="font-size:13px;color:#4b5563;margin:0 0 8px">Recibirán un correo indicando que subiste un documento para revisión.</p>
           <div style="max-height:240px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px">${rows}</div>`,
    showCancelButton: true,
    confirmButtonText: "Subir y avisar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a",
    focusConfirm: false,
    preConfirm: () => Array.from(document.querySelectorAll(".notify-user:checked")).map((el) => Number(el.value)),
  });
  if (!isConfirmed) return null;
  return value || [];
};
