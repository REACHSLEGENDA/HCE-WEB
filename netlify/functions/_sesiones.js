// Lógica compartida de las sesiones en vivo: la usan la función del aula
// (sesion-clase) y la tarea diaria (recordatorios-diarios), para que las dos
// confirmen la asistencia con el mismo criterio.

import { obtenerParticipantes, minutosPorCorreo, isConfigured as zoomListo } from './_zoom.js';

// "Unirse" se activa 15 minutos antes y sigue activo hasta una hora después
// del final programado (las clases a veces se alargan).
const ANTES_MIN = 15;
const DESPUES_MIN = 60;
// El reporte de Zoom tarda un poco en publicarse; no se consulta más de una
// vez cada 10 minutos por sesión.
const FRESCURA_MS = 10 * 60 * 1000;

/** Fecha legible en hora del centro de México, para los correos. */
export function fechaMexico(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }) + ' (hora del centro de México)';
}

export function ventana(sesion) {
  const inicio = new Date(sesion.inicia_en).getTime();
  const fin = inicio + (sesion.duracion_min || 60) * 60000;
  return { abre: inicio - ANTES_MIN * 60000, cierra: fin + DESPUES_MIN * 60000, inicio, fin };
}

export function partirNombre(nombreCompleto, email) {
  const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return { nombre: email.split('@')[0], apellido: '.' };
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') || '.' };
}

export async function cargarSesion(db, leccionId) {
  const [{ data: leccion }, { data: sesion }, { data: secretos }] = await Promise.all([
    db.from('curso_lecciones').select('id, course_id, tipo, titulo').eq('id', Number(leccionId)).maybeSingle(),
    db.from('sesiones_clase').select('*').eq('leccion_id', Number(leccionId)).maybeSingle(),
    db.from('sesion_secretos').select('*').eq('leccion_id', Number(leccionId)).maybeSingle(),
  ]);
  if (!leccion || leccion.tipo !== 'sesion') return null;
  return { leccion, sesion, secretos: secretos || {} };
}

// Revisa el reporte de Zoom de la sesión y completa la lección de quien asistió.
export async function sincronizar(db, { leccion, sesion, secretos }, { forzar = false } = {}) {
  if (!secretos.zoom_id || !zoomListo()) return { corrio: false, motivo: 'sin-zoom' };
  if (Date.now() < ventana(sesion).fin) return { corrio: false, motivo: 'no-ha-terminado' };
  if (!forzar && sesion.sincronizado_en && Date.now() - new Date(sesion.sincronizado_en).getTime() < FRESCURA_MS) {
    return { corrio: false, motivo: 'reciente' };
  }

  let participantes;
  try {
    participantes = await obtenerParticipantes(secretos.zoom_id, secretos.zoom_tipo);
  } catch (err) {
    // Mientras Zoom no publica el reporte responde 404.
    console.error('Zoom reporte sesion:', err.message);
    return { corrio: false, motivo: 'reporte-pendiente' };
  }

  const minutos = minutosPorCorreo(participantes);
  const { data: registros } = await db.from('sesion_registros').select('*').eq('leccion_id', leccion.id);
  const minimo = Math.max(sesion.minutos_minimos || 0, 0);
  const ahora = new Date().toISOString();
  let asistieron = 0;

  for (const r of registros || []) {
    const m = minutos.get(String(r.email).toLowerCase());
    if (m === undefined) continue;
    const asistio = r.asistio || m >= minimo;
    if (asistio) asistieron += 1;
    await db.from('sesion_registros').update({ minutos: m, asistio, verificado_en: ahora }).eq('id', r.id);
    if (asistio) {
      await db.from('leccion_progreso').upsert([{
        user_id: r.user_id,
        leccion_id: leccion.id,
        course_id: leccion.course_id,
        porcentaje: 100,
        completada: true,
      }], { onConflict: 'user_id,leccion_id' });
    }
  }

  await db.from('sesiones_clase').update({ sincronizado_en: ahora }).eq('leccion_id', leccion.id);
  return { corrio: true, participantes: minutos.size, asistieron };
}

