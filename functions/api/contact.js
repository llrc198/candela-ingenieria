// Cloudflare Pages Function — POST /api/contact
// Envía el formulario de contacto por email vía Resend (https://resend.com).
// Requiere la variable de entorno RESEND_API_KEY configurada como secret en
// el proyecto de Cloudflare Pages (Settings → Environment variables).

const REQUIRED_FIELDS = ["nombre", "empresa", "email", "telefono", "servicio", "mensaje"];
const NOTIFY_RECIPIENTS = [
  "contacto@candelaing.cl",
  "gvieira@candelaing.cl",
  "leonardorangel1990@gmail.com",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

function sendEmail(env, payload) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
  if (!EMAIL_RE.test(data.email.trim())) {
    return jsonResponse({ error: "Email inválido." }, 400);
  }

  const nombre = data.nombre.trim().slice(0, 200);
  const empresa = data.empresa.trim().slice(0, 200);
  const email = data.email.trim().slice(0, 200);
  const telefono = data.telefono.trim().slice(0, 40);
  const rut = (data.rut || "").trim().slice(0, 20);
  const servicioLabel = SERVICIO_LABELS[data.servicio];
  const mensaje = data.mensaje.trim().slice(0, 4000);

  // 1. Notificación interna a Candela
  const notifyBody = [
    `Nombre: ${nombre}`,
    `Empresa: ${empresa}`,
    `Email: ${email}`,
    `Teléfono: ${telefono}`,
    `RUT: ${rut || "(no indicado)"}`,
    `Servicio requerido: ${servicioLabel}`,
    "",
    "Mensaje:",
    mensaje,
  ].join("\n");

  const notifyRes = await sendEmail(env, {
    from: "Candela Ingeniería <formulario@mail.candelaing.cl>",
    to: NOTIFY_RECIPIENTS,
    reply_to: email,
    subject: `Nueva solicitud de diagnóstico — ${empresa}`,
    text: notifyBody,
  });

  if (!notifyRes.ok) {
    return jsonResponse({ error: "No se pudo enviar el mensaje. Intenta nuevamente." }, 502);
  }

  // 2. Confirmación automática al cliente (best-effort: si falla, la solicitud
  // ya quedó capturada internamente, así que no se reporta como error al usuario).
  await sendEmail(env, {
    from: "Candela Ingeniería <formulario@mail.candelaing.cl>",
    to: [email],
    subject: "Recibimos tu solicitud — Candela Ingeniería",
    text: [
      `Hola ${nombre},`,
      "",
      `Recibimos tu solicitud sobre ${servicioLabel.toLowerCase()}. Un ingeniero de Candela` +
        " Ingeniería la va a revisar y te vamos a contactar a la brevedad.",
      "",
      "Si es urgente, puedes llamarnos directamente al +56 9 5526 7419.",
      "",
      "Saludos,",
      "Candela Ingeniería",
    ].join("\n"),
  }).catch(() => {});

  return jsonResponse({ ok: true }, 200);
}
