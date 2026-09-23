// Acceso a cursos del portal: inscripciones y contenido protegido.
//
// Mientras no se haya corrido la migración de Supabase, las tablas nuevas no
// existen. En ese caso todo se comporta como antes —cursos abiertos a quien
// tenga cuenta— en vez de dejar el aula rota. En cuanto la migración corre, el
// control de acceso entra solo, sin volver a desplegar.

import { supabase } from './supabase';

// PostgREST responde así cuando la tabla todavía no existe.
export function esTablaFaltante(error) {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /could not find the table|does not exist/i.test(error.message || '')
  );
}

/**
 * IDs de los cursos donde está inscrito el alumno.
 * Devuelve `null` si las inscripciones aún no existen (antes de la migración).
 */
export async function cargarMisInscripciones(userId) {
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from('inscripciones')
    .select('course_id')
    .eq('user_id', userId);

  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return new Set((data || []).map((fila) => Number(fila.course_id)));
}

/**
 * ¿Puede este alumno entrar al aula de este curso?
 * Antes de la migración siempre sí, como hasta ahora.
 */
export async function puedeEntrar(userId, courseId, esAdmin) {
  if (esAdmin) return true;

  const { data, error } = await supabase
    .from('inscripciones')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', Number(courseId))
    .maybeSingle();

  if (error) {
    if (esTablaFaltante(error)) return true;
    throw error;
  }
  return !!data;
}

/**
 * ID del video del curso. Sale de la tabla protegida; si todavía no existe,
 * del campo viejo del curso.
 */
export async function cargarVideoCurso(courseId, videoHeredado = '') {
  const { data, error } = await supabase
    .from('curso_contenido')
    .select('youtube_video_id')
    .eq('course_id', Number(courseId))
    .maybeSingle();

  if (error && !esTablaFaltante(error)) {
    console.warn('No se pudo leer el contenido del curso:', error.message);
  }
  return data?.youtube_video_id || videoHeredado || '';
}

export async function llamarInscripcion(accion, cuerpo = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch('/.netlify/functions/curso-inscripcion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ accion, ...cuerpo }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'No pudimos completar la inscripción. Intenta de nuevo.');
    error.estado = data.estado;
    throw error;
  }
  return data;
}

export const esCursoDePago = (curso) => curso?.tipo === 'pago' && Number(curso?.precio_mxn) > 0;

export const formatoPrecio = (mxn) =>
  `$${Number(mxn || 0).toLocaleString('es-MX')} MXN`;
