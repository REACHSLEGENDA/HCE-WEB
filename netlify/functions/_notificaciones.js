// Envío de las notificaciones automáticas (ver supabase/notificaciones.sql).
//
// Cada función del servidor que provoca un evento llama a `notificar`. Nunca
// lanza error: si Brevo falla, el evento (inscribir, aprobar, calificar) sigue
// adelante y el fallo queda en el historial.

import { enviarCorreo, isConfigured as brevoListo } from './_brevo.js';

export const EVENTOS = {
  registro_nuevo: 'Registro nuevo en el portal',
  cuenta_activada: 'Cuenta activada (acceso y grupo asignados)',
  inscrito_curso: 'Inscrito a un curso',
  sesion_registro: 'Se registró a una sesión en vivo',
  sesion_recordatorio: '1 hora antes de una sesión en vivo',
  examen_aprobado: 'Aprobó un examen',
  tarea_revisada: 'Su tarea fue revisada',
  curso_completado: 'Terminó un curso (certificado emitido)',
  mensaje_nuevo: 'Recibió un mensaje en el portal',
};

const PORTAL = 'https://healthcareexp.com';

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Reemplaza {variable} por su valor. Las que no existen se dejan vacías. */
export function llenarPlantilla(texto, variables) {
  return String(texto || '').replace(/\{(\w+)\}/g, (_, clave) => (variables[clave] ?? ''));
}

/**
 * Envuelve el contenido en el diseño de los correos de HCE (el mismo de los
 * flujos de Brevo): encabezado oscuro con el logo, cuerpo blanco, botón
 * redondo y pie con el contacto.
 */
export function plantillaHce(contenido, { boton, enlace } = {}) {
  const botonHtml = boton && enlace ? `
      <table style="margin:8px auto 4px;" cellspacing="0" cellpadding="0" align="center"><tr>
        <td style="background:#0f172a;border-radius:100px;text-align:center;">
          <a href="${escapar(enlace)}" style="display:inline-block;padding:14px 44px;font-size:15px;font-weight:700;color:#ffffff;border-radius:100px;text-decoration:none;">${escapar(boton)}</a>
        </td>
      </tr></table>` : '';
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { font-family: 'Inter', Arial, sans-serif; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding: 12px 8px !important; }
    .email-card { border-radius: 12px !important; }
    .header-cell { padding: 28px 20px 24px !important; }
    .body-cell { padding: 24px 16px 24px !important; }
    .footer-cell { padding: 22px 16px !important; }
  }
</style></head>
<body style="margin:0;padding:0;">
<table style="background:#f1f5f9;padding:32px 16px;" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper"><tr><td align="center">
  <table style="max-width:600px;border-radius:16px;overflow:hidden;margin:0 auto;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" width="100%" cellspacing="0" cellpadding="0" class="email-card">
    <tr><td style="background:#0f172a;padding:40px 40px 36px;text-align:center;" class="header-cell">
      <img src="${PORTAL}/assets/componentes/firma-hce.png" alt="Healthcare Training Experience" style="height:65px;width:auto;display:inline-block;border:0;">
    </td></tr>
    <tr><td style="background:#ffffff;padding:40px 40px 36px;text-align:left;color:#334155;font-size:15px;" class="body-cell">
      ${contenido}${botonHtml}
    </td></tr>
    <tr><td style="background:#0f172a;padding:28px 40px;text-align:center;" class="footer-cell">
      <p style="margin:0 0 6px;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Healthcare Training Experience · </span><a href="mailto:academia@healthcareexp.com" style="color:rgba(255,255,255,0.5);font-size:13px;text-decoration:none;">academia@healthcareexp.com</a></p>
      <p style="margin:0;"><a href="${PORTAL}" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">www.healthcareexp.com</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/**
 * El texto del admin (con saltos de línea) en el diseño de HCE. Si lleva
 * botón, se quita el renglón que solo repetía su enlace.
 */
export function aHtml(texto, { boton, enlace } = {}) {
  const lineas = String(texto || '').split('\n');
  const limpio = (boton && enlace ? lineas.filter((l) => l.trim() !== enlace) : lineas).join('\n');
  const parrafos = escapar(limpio)
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p, i) => `<p style="margin:0 0 16px;line-height:1.7;color:${i === 0 ? '#1e293b;font-size:16px' : '#475569;font-size:15px'};">${p.replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0ea5e9;text-decoration:underline;font-weight:600;">$1</a>')}</p>`)
    .join('');
  return plantillaHce(parrafos, { boton, enlace });
}

/** El botón de cada correo: al aula, al portal o al panel de admin. */
export function botonPara(destinatario, enlace) {
  if (destinatario === 'admins') return { boton: 'Abrir el panel', enlace: `${PORTAL}/admin` };
  return { boton: /\/classroom\//.test(enlace) ? 'Ir a mi curso' : 'Entrar al portal', enlace };
}

async function destinatarios(db, notificacion, userId) {
  if (notificacion.destinatario === 'admins') {
    const { data } = await db.from('profiles').select('id, email, nombre_completo').eq('rol', 'admin');
    return (data || []).filter((p) => p.email);
  }
  if (!userId) return [];
  const { data } = await db.from('profiles').select('id, email, nombre_completo').eq('id', userId).maybeSingle();
  return data?.email ? [data] : [];
}

/**
 * Manda las notificaciones activas de un evento.
 *   userId     el alumno que provocó el evento
 *   courseId   el curso, si aplica (filtra las notificaciones por curso)
 *   clave      identifica el hecho, para no avisarlo dos veces
 *   variables  valores para la plantilla (curso, grupo, fecha, calificacion…)
 */
export async function notificar(db, evento, { userId = null, courseId = null, clave, variables = {} } = {}) {
  try {
    if (!brevoListo()) return { enviadas: 0, motivo: 'sin-configurar' };

    let consulta = db.from('notificaciones').select('*').eq('evento', evento).eq('activo', true);
    consulta = courseId ? consulta.or(`course_id.is.null,course_id.eq.${Number(courseId)}`) : consulta.is('course_id', null);
    const { data: todas, error } = await consulta;
    if (error || !todas?.length) return { enviadas: 0 };
    // Si el curso tiene su propio aviso, ese reemplaza al general (para el
    // mismo destinatario): así no le llegan dos correos del mismo hecho.
    const conPropio = new Set(todas.filter((n) => n.course_id).map((n) => n.destinatario));
    const lista = todas.filter((n) => n.course_id || !conPropio.has(n.destinatario));

    let curso = variables.curso;
    if (!curso && courseId) {
      const { data } = await db.from('courses').select('title').eq('id', Number(courseId)).maybeSingle();
      curso = data?.title || '';
    }

    let enviadas = 0;
    for (const n of lista) {
      for (const persona of await destinatarios(db, n, userId)) {
        // Primero se aparta el envío: si ya existía, otra ejecución lo mandó.
        const claveEnvio = `${clave || evento}:${persona.id}`;
        const { data: apartado, error: errApartado } = await db
          .from('notificaciones_enviadas')
          .insert([{ notificacion_id: n.id, clave: claveEnvio, user_id: persona.id, email: persona.email }])
          .select('id')
          .maybeSingle();
        if (errApartado || !apartado) continue;

        const alumno = userId && persona.id !== userId
          ? (await db.from('profiles').select('nombre_completo, email').eq('id', userId).maybeSingle()).data
          : persona;
        const valores = {
          nombre: String(persona.nombre_completo || '').split(/\s+/)[0] || '',
          nombre_completo: persona.nombre_completo || '',
          alumno: alumno?.nombre_completo || alumno?.email || '',
          correo_alumno: alumno?.email || '',
          curso: curso || '',
          enlace: courseId ? `${PORTAL}/classroom/${courseId}` : `${PORTAL}/dashboard`,
          portal: `${PORTAL}/dashboard`,
          ...variables,
        };

        try {
          await enviarCorreo({
            para: [persona.email],
            asunto: llenarPlantilla(n.asunto, valores),
            html: aHtml(llenarPlantilla(n.cuerpo, valores), botonPara(n.destinatario, valores.enlace)),
          });
          enviadas += 1;
        } catch (err) {
          await db.from('notificaciones_enviadas').update({ error: err.message.slice(0, 500) }).eq('id', apartado.id);
        }
      }
    }
    return { enviadas };
  } catch (err) {
    console.error(`Notificación ${evento}:`, err.message);
    return { enviadas: 0, error: err.message };
  }
}
