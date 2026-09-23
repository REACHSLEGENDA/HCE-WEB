// Lecciones de los cursos: carga, avance y archivos privados.
//
// Un curso sin lecciones registradas (o antes de correr la migración) se sigue
// tomando como antes: una sola clase con el video del curso. Así ningún curso
// deja de funcionar mientras se le arman sus lecciones.

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

export const TIPOS_LECCION = {
  video: 'Video',
  pdf: 'Documento PDF',
  texto: 'Lectura',
  tarea: 'Tarea',
};

// Se considera vista una lección de video a partir de aquí, igual que el curso
// completo antes de las lecciones.
export const UMBRAL_VIDEO = 90;

/** La clase única de un curso sin lecciones: su video de siempre. */
export function leccionImplicita(curso, video) {
  return {
    id: 'unica',
    implicita: true,
    course_id: curso.id,
    orden: 1,
    titulo: curso.title,
    tipo: 'video',
    obligatoria: true,
    contenido: { youtube_video_id: video || '' },
  };
}

/**
 * Lecciones del curso con su contenido. `null` si la tabla aún no existe.
 * El contenido solo llega si el alumno está inscrito (lo filtra la base).
 */
export async function cargarLecciones(courseId) {
  const { data, error } = await supabase
    .from('curso_lecciones')
    .select('id, course_id, orden, titulo, tipo, descripcion, duracion_min, obligatoria')
    .eq('course_id', Number(courseId))
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  if (!data?.length) return [];

  const { data: contenidos, error: errContenido } = await supabase
    .from('leccion_contenido')
    .select('leccion_id, youtube_video_id, archivo_path, texto')
    .in('leccion_id', data.map((l) => l.id));
  if (errContenido && !esTablaFaltante(errContenido)) throw errContenido;

  const porLeccion = new Map((contenidos || []).map((c) => [c.leccion_id, c]));
  return data.map((l) => ({ ...l, contenido: porLeccion.get(l.id) || {} }));
}

/** Avance del alumno en cada lección: { [leccion_id]: { porcentaje, completada } } */
export async function cargarProgresoLecciones(userId, courseId) {
  const { data, error } = await supabase
    .from('leccion_progreso')
    .select('leccion_id, porcentaje, completada')
    .eq('user_id', userId)
    .eq('course_id', Number(courseId));
  if (error) {
    if (esTablaFaltante(error)) return {};
    throw error;
  }
  return Object.fromEntries((data || []).map((f) => [f.leccion_id, { porcentaje: f.porcentaje, completada: f.completada }]));
}

export async function guardarProgresoLeccion({ userId, courseId, leccionId, porcentaje, completada }) {
  const { error } = await supabase.from('leccion_progreso').upsert(
    [{ user_id: userId, course_id: Number(courseId), leccion_id: leccionId, porcentaje, completada }],
    { onConflict: 'user_id,leccion_id' }
  );
  if (error && !esTablaFaltante(error)) throw error;
}

/**
 * Avance del curso completo, de 0 a 100: el promedio de sus lecciones
 * obligatorias. Un video cuenta por lo que se ha visto; el resto, entero o
 * nada. Con una sola clase de video equivale al avance del video, como antes.
 */
export function avanceDelCurso(lecciones, progreso, porcentajeImplicito = 0) {
  const obligatorias = lecciones.filter((l) => l.obligatoria !== false);
  if (!obligatorias.length) return 0;

  const suma = obligatorias.reduce((total, l) => {
    if (l.implicita) return total + Math.min(100, porcentajeImplicito);
    const p = progreso[l.id];
    if (p?.completada) return total + 100;
    return total + (l.tipo === 'video' ? Math.min(100, p?.porcentaje || 0) : 0);
  }, 0);
  return Math.round(suma / obligatorias.length);
}

export function leccionesCompletas(lecciones, progreso, porcentajeImplicito = 0) {
  return lecciones
    .filter((l) => l.obligatoria !== false)
    .every((l) => (l.implicita ? porcentajeImplicito >= UMBRAL_VIDEO : progreso[l.id]?.completada));
}

// Enlace temporal (una hora) a un archivo privado. Solo lo obtiene quien tiene
// permiso según las políticas del bucket.
export async function enlaceTemporal(bucket, ruta) {
  if (!ruta) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ruta, 60 * 60);
  if (error) throw error;
  return data?.signedUrl || null;
}

// ---- Tareas -------------------------------------------------------------------

export async function cargarEntregas(userId, leccionId) {
  const { data, error } = await supabase
    .from('tarea_entregas')
    .select('id, texto, archivo_path, estado, comentario, revisada_en, creada_en')
    .eq('user_id', userId)
    .eq('leccion_id', leccionId)
    .order('creada_en', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return data || [];
}

export async function entregarTarea({ userId, courseId, leccionId, texto, archivo }) {
  let archivoPath = null;
  if (archivo) {
    const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    archivoPath = `${courseId}/${userId}/${leccionId}_${Date.now()}_${limpio}`;
    const { error: errSubida } = await supabase.storage.from('tareas').upload(archivoPath, archivo);
    if (errSubida) throw errSubida;
  }

  const { error } = await supabase.from('tarea_entregas').insert([{
    user_id: userId,
    course_id: Number(courseId),
    leccion_id: leccionId,
    texto: texto?.trim() || null,
    archivo_path: archivoPath,
  }]);
  if (error) throw error;
}
