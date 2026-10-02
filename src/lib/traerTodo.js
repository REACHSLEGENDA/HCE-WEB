// Supabase entrega 1,000 filas por petición: se piden en tandas hasta agotar.
// Si la tabla todavía no existe (migración sin correr), devuelve []. Si falta
// una columna, lanza el error para que quien llama pueda reintentar sin ella.
//
// Las tandas SIEMPRE van con un orden estable: sin él, Postgres puede repetir
// o saltarse filas entre una página y la siguiente. Las tablas sin columna
// `id` se ordenan por las columnas de su llave.

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

// Llave de las tablas que no tienen `id`.
export const LLAVES_SIN_ID = {
  student_activity: ['user_id'],
  student_progress: ['user_id', 'course_id'],
  leccion_progreso: ['user_id', 'leccion_id'],
  grupo_miembros: ['grupo_id', 'user_id'],
  grupo_cursos: ['grupo_id', 'course_id'],
  division_cursos: ['division_id', 'course_id'],
  mensaje_destinatarios: ['mensaje_id', 'user_id'],
  curso_contenido: ['course_id'],
  leccion_contenido: ['leccion_id'],
  curso_reglas: ['course_id'],
  evaluacion_config: ['leccion_id'],
  evaluacion_claves: ['pregunta_id'],
  sesiones_clase: ['leccion_id'],
};

// `orden`: una columna o una lista de columnas. Si no se indica (o es null),
// se usa la llave conocida de la tabla, o `id`.
function columnasDeOrden(tabla, orden) {
  const llave = LLAVES_SIN_ID[tabla] || ['id'];
  const preferidas = Array.isArray(orden) ? orden : typeof orden === 'string' && orden ? [orden] : [];
  // Un orden por fecha también necesita la llave para desempatar.
  return [...new Set([...preferidas, ...llave])];
}

export async function traerTodo(tabla, columnas, filtrar = (q) => q, { orden } = {}) {
  const filas = [];
  const TANDA = 1000;
  const ordenar = columnasDeOrden(tabla, orden);
  for (let desde = 0; ; desde += TANDA) {
    let consulta = filtrar(supabase.from(tabla).select(columnas));
    for (const col of ordenar) consulta = consulta.order(col, { ascending: true });
    const { data, error } = await consulta.range(desde, desde + TANDA - 1);
    if (error) {
      // 42703 es una columna que falta ("column ... does not exist"): ese sí se
      // lanza, aunque esTablaFaltante lo confunda por el texto.
      if (error.code !== '42703' && esTablaFaltante(error)) return filas;
      throw error;
    }
    filas.push(...(data || []));
    if (!data || data.length < TANDA) break;
  }
  return filas;
}
