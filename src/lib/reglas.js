// Reglas de los cursos (ver supabase/lms-reglas.sql).

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

export const REGLAS_BASE = {
  oculto_catalogo: false,
  cupo: null,
  requiere_solicitud: false,
  dias_acceso: null,
  conservar_acceso: true,
  prerrequisitos: [],
  regla_finalizacion: 'examen_final',
  porcentaje_finalizacion: 100,
};

export const REGLAS_FINALIZACION = {
  examen_final: 'Al aprobar el examen final (y completar las lecciones obligatorias)',
  lecciones: 'Al completar todas las lecciones obligatorias (sin examen final)',
  porcentaje: 'Al completar cierto porcentaje de las lecciones',
};

/** Reglas de todos los cursos: { [courseId]: reglas }. Vacío antes de la migración. */
export async function cargarReglasCursos() {
  const { data, error } = await supabase.from('curso_reglas').select('*');
  if (error) {
    if (!esTablaFaltante(error)) console.warn('No se pudieron cargar las reglas:', error.message);
    return {};
  }
  return Object.fromEntries((data || []).map((r) => [Number(r.course_id), { ...REGLAS_BASE, ...r }]));
}

export const reglasDe = (mapa, courseId) => mapa?.[Number(courseId)] || REGLAS_BASE;

export async function cargarReglasCurso(courseId) {
  const { data, error } = await supabase.from('curso_reglas').select('*').eq('course_id', Number(courseId)).maybeSingle();
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return { ...REGLAS_BASE, ...(data || {}) };
}

export async function guardarReglasCurso(courseId, reglas) {
  const numero = (v) => (v === '' || v == null ? null : Math.max(1, Math.round(Number(v))));
  const { error } = await supabase.from('curso_reglas').upsert([{
    course_id: Number(courseId),
    oculto_catalogo: !!reglas.oculto_catalogo,
    cupo: numero(reglas.cupo),
    requiere_solicitud: !!reglas.requiere_solicitud,
    dias_acceso: numero(reglas.dias_acceso),
    conservar_acceso: reglas.conservar_acceso !== false,
    prerrequisitos: (reglas.prerrequisitos || []).map(Number).filter(Boolean),
    regla_finalizacion: reglas.regla_finalizacion || 'examen_final',
    porcentaje_finalizacion: Math.min(100, Math.max(1, Number(reglas.porcentaje_finalizacion) || 100)),
    actualizado_en: new Date().toISOString(),
  }], { onConflict: 'course_id' });
  if (error) throw error;
}

/** Lugares ocupados de los cursos con cupo: { [courseId]: inscritos }. */
export async function cargarLugaresOcupados() {
  const { data, error } = await supabase.rpc('lugares_ocupados');
  if (error) return {};
  return Object.fromEntries((data || []).map((f) => [Number(f.course_id), f.inscritos]));
}

/** Solicitudes de inscripción del alumno: { [courseId]: estado }. */
export async function cargarMisSolicitudes(userId) {
  const { data, error } = await supabase.from('solicitudes_inscripcion').select('course_id, estado').eq('user_id', userId);
  if (error) return {};
  return Object.fromEntries((data || []).map((s) => [Number(s.course_id), s.estado]));
}

export async function cargarSolicitudesPendientes() {
  const { data, error } = await supabase
    .from('solicitudes_inscripcion')
    .select('id, user_id, course_id, creada_en')
    .eq('estado', 'pendiente')
    .order('creada_en', { ascending: true });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return data || [];
}

/** Fecha en que vence el acceso de una inscripción, o null si no vence. */
export function venceAcceso(reglas, inscritoEn) {
  if (!reglas?.dias_acceso || !inscritoEn) return null;
  const fecha = new Date(inscritoEn);
  fecha.setDate(fecha.getDate() + Number(reglas.dias_acceso));
  return fecha;
}

/**
 * Si el curso ya está terminado según su regla. `avance` es el % de lecciones
 * completadas; `leccionesCompletas` si están todas las obligatorias.
 */
export function cursoTerminado(reglas, { leccionesCompletas, porcentajeLecciones }) {
  if (reglas.regla_finalizacion === 'lecciones') return leccionesCompletas;
  if (reglas.regla_finalizacion === 'porcentaje') return porcentajeLecciones >= (reglas.porcentaje_finalizacion || 100);
  return false;
}
