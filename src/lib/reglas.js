// Reglas de los cursos (ver supabase/lms-reglas.sql).

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';
import { traerTodo } from './traerTodo';

export const REGLAS_BASE = {
  oculto_catalogo: false,
  cupo: null,
  requiere_solicitud: false,
  dias_acceso: null,
  conservar_acceso: true,
  prerrequisitos: [],
  regla_finalizacion: 'examen_final',
  porcentaje_finalizacion: 100,
  // 'grupo': el curso se abre cuando el alumno está en un grupo y llega la
  // fecha de inicio de ese grupo (supabase/acceso-por-grupo.sql).
  modo_acceso: 'inmediato',
};

export const MODOS_ACCESO = {
  inmediato: 'Inmediato: al inscribirse o pagar entra al curso',
  grupo: 'Por grupo (generación): paga y aparta su lugar; el curso se abre en la fecha de inicio de su grupo',
};

export const REGLAS_FINALIZACION = {
  examen_final: 'Al aprobar el examen final (y completar las lecciones obligatorias)',
  lecciones: 'Al completar todas las lecciones obligatorias (sin examen final)',
  porcentaje: 'Al completar cierto porcentaje de las lecciones',
};

/** Reglas de todos los cursos: { [courseId]: reglas }. Vacío antes de la migración. */
export async function cargarReglasCursos() {
  try {
    const data = await traerTodo('curso_reglas', '*');
    return Object.fromEntries((data || []).map((r) => [Number(r.course_id), { ...REGLAS_BASE, ...r }]));
  } catch (error) {
    console.warn('No se pudieron cargar las reglas:', error.message);
    return {};
  }
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
  const numero = (v) => {
    if (v === '' || v == null) return null;
    if (!Number.isInteger(Number(v)) || Number(v) < 1) throw new Error('El cupo y los días de acceso deben ser enteros mayores a cero.');
    return Number(v);
  };
  const porcentaje = Number(reglas.porcentaje_finalizacion ?? 100);
  if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 100) throw new Error('El porcentaje de finalización debe estar entre 1 y 100.');
  const prerrequisitos = [...new Set((reglas.prerrequisitos || []).map(Number))];
  const todas = await traerTodo('curso_reglas', 'course_id, prerrequisitos');
  const mapa = Object.fromEntries(todas.map((r) => [Number(r.course_id), r]));
  const llegaAlCurso = (id, visitados = new Set()) => {
    if (id === Number(courseId)) return true;
    if (visitados.has(id)) return false;
    visitados.add(id);
    return (mapa[id]?.prerrequisitos || []).some((otro) => llegaAlCurso(Number(otro), visitados));
  };
  if (prerrequisitos.some((id) => !Number.isFinite(id) || llegaAlCurso(id))) throw new Error('Los prerrequisitos crearían un ciclo entre cursos.');
  const fila = {
    course_id: Number(courseId),
    oculto_catalogo: !!reglas.oculto_catalogo,
    cupo: numero(reglas.cupo),
    requiere_solicitud: !!reglas.requiere_solicitud,
    dias_acceso: numero(reglas.dias_acceso),
    conservar_acceso: reglas.conservar_acceso !== false,
    prerrequisitos,
    regla_finalizacion: reglas.regla_finalizacion || 'examen_final',
    porcentaje_finalizacion: porcentaje,
    modo_acceso: reglas.modo_acceso === 'grupo' ? 'grupo' : 'inmediato',
    actualizado_en: new Date().toISOString(),
  };
  let { error } = await supabase.from('curso_reglas').upsert([fila], { onConflict: 'course_id' });
  // Antes de acceso-por-grupo.sql la columna no existe: el modo inmediato se
  // guarda sin ella; el modo por grupo necesita la migración.
  if (error && /modo_acceso/.test(error.message || '')) {
    if (fila.modo_acceso === 'grupo') throw new Error('Para el acceso por grupo falta correr en Supabase la migración acceso-por-grupo.sql.');
    const { modo_acceso: _omitido, ...sinModo } = fila;
    ({ error } = await supabase.from('curso_reglas').upsert([sinModo], { onConflict: 'course_id' }));
  }
  if (error) throw error;
}

/**
 * Apertura del curso para el alumno (cursos por generación): { modo,
 * conGrupo, abreEn, abierto }. Sin la migración, como si fuera inmediato.
 */
export async function cargarMiApertura(courseId) {
  const { data, error } = await supabase.rpc('mi_apertura', { p_course: Number(courseId) });
  if (error || !data?.length) return { modo: 'inmediato', conGrupo: false, abreEn: null, abierto: true, abiertoDesde: null };
  const f = data[0];
  return {
    modo: f.modo,
    conGrupo: !!f.con_grupo,
    abreEn: f.abre_en ? new Date(f.abre_en) : null,
    abierto: f.abierto !== false,
    abiertoDesde: f.abierto_desde ? new Date(f.abierto_desde) : null,
  };
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
  if (reglas.regla_finalizacion === 'porcentaje') return porcentajeLecciones >= (reglas.porcentaje_finalizacion ?? 100);
  return false;
}
