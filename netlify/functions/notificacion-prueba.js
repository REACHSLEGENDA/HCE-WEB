// Manda una notificación de prueba al correo del administrador que la pide,
// con datos de ejemplo, para ver cómo queda antes de activarla.

import { adminDesdeToken, json, admin, isConfigured as supabaseListo } from './_supabase.js';
import { enviarCorreo, isConfigured as brevoListo } from './_brevo.js';
import { llenarPlantilla, aHtml, botonPara } from './_notificaciones.js';

const EJEMPLO = {
  nombre: 'María',
  nombre_completo: 'María Fernanda Acevedo',
  alumno: 'María Fernanda Acevedo',
  correo_alumno: 'maria@ejemplo.com',
  curso: 'ECMO Nursing Care Course',
  grupo: 'II GEN ECMO Nursing',
  cursos: 'ECMO Nursing Care Course, Simulador ECMO Sim',
  sesion: 'Primera Sesión de Q&A',
  fecha: 'jueves 25 de septiembre, 17:00 (hora del centro de México)',
  examen: 'Primera Evaluación de Conocimientos',
  calificacion: '94%',
  tarea: 'Tarea Diagnóstica Inicial',
  estado: 'aprobada',
  comentario: '¡Muy buen trabajo!',
  folio: 'FOL-123456',
  enlace: 'https://healthcareexp.com/dashboard',
  portal: 'https://healthcareexp.com/dashboard',
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!supabaseListo()) return json(500, { error: 'El servidor no está configurado.' });

  const administrador = await adminDesdeToken(event.headers);
  if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

  if (!brevoListo()) return json(400, { error: 'Falta la llave de Brevo en Netlify.' });

  try {
    const { notificacionId } = JSON.parse(event.body || '{}');
    const { data: n } = await admin().from('notificaciones').select('*').eq('id', Number(notificacionId)).maybeSingle();
    if (!n) return json(404, { error: 'Esa notificación ya no existe.' });

    await enviarCorreo({
      para: [administrador.email],
      asunto: `[Prueba] ${llenarPlantilla(n.asunto, EJEMPLO)}`,
      html: aHtml(llenarPlantilla(n.cuerpo, EJEMPLO), botonPara(n.destinatario, EJEMPLO.enlace)),
    });
    return json(200, { ok: true, email: administrador.email });
  } catch (err) {
    console.error('Notificación de prueba:', err.message);
    return json(500, { error: err.message });
  }
};
