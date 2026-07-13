// Cloudflare Pages Function — POST /api/contact
// Envía el formulario de contacto por email vía Resend (https://resend.com).
// Requiere la variable de entorno RESEND_API_KEY configurada como secret en
// el proyecto de Cloudflare Pages (Settings → Environment variables).

const REQUIRED_FIELDS = ["nombre", "empresa", "servicio", "mensaje"];
const ALLOWED_SERVICIOS = new Set([
  "incendios",
  "acceso",
  "intrusion",
  "cctv",
  "varios",
  "otro",
]);

const SERVICIO_LABELS = {
  incendios: "Detección de incendios",
  acceso: "Control de acceso",
  intrusion: "Alarma de intrusión",
  cctv: "CCTV",
  varios: "Más de un servicio",
  otro: "Otro / no está seguro",
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: "Solicitud inválida." }, 400);
  }

  for (const field of REQUIRED_FIELDS) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      return jsonResponse({ error: `Falta el campo "${field}".` }, 400);
    }
  }
  if (!ALLOWED_SERVICIOS.has(data.servicio)) {
    return jsonResponse({ error: "Servicio inválido." }, 400);
  }

  const nombre = data.nombre.trim().slice(0, 200);
  const empresa = data.empresa.trim().slice(0, 200);
  const rut = (data.rut || "").trim().slice(0, 20);
  const servicioLabel = SERVICIO_LABELS[data.servicio];
  const mensaje = data.mensaje.trim().slice(0, 4000);

  const emailBody = [
    `Nombre: ${nombre}`,
    `Empresa: ${empresa}`,
    `RUT: ${rut || "(no indicado)"}`,
    `Servicio requerido: ${servicioLabel}`,
    "",
    "Mensaje:",
    mensaje,
  ].join("\n");

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Candela Ingeniería <formulario@candelaing.cl>",
      to: ["contacto@candelaing.cl"],
      subject: `Nueva solicitud de diagnóstico — ${empresa}`,
      text: emailBody,
    }),
  });

  if (!resendRes.ok) {
    return jsonResponse({ error: "No se pudo enviar el mensaje. Intenta nuevamente." }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}
