// Supabase entrega 1,000 filas por petición: se piden en tandas hasta agotar.
// Si la tabla todavía no existe (migración sin correr), devuelve []. Si falta
// una columna, lanza el error para que quien llama pueda reintentar sin ella.

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

export async function traerTodo(tabla, columnas, filtrar = (q) => q, { orden = 'id' } = {}) {
  const filas = [];
  const TANDA = 1000;
  for (let desde = 0; ; desde += TANDA) {
    let consulta = supabase.from(tabla).select(columnas);
    if (orden) consulta = consulta.order(orden);
    const { data, error } = await filtrar(consulta).range(desde, desde + TANDA - 1);
    if (error) {
      if (esTablaFaltante(error)) return filas;
      throw error;
    }
    filas.push(...(data || []));
    if (!data || data.length < TANDA) break;
  }
  return filas;
}
