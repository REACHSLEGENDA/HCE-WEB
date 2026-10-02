// Cada fábrica debe devolver una consulta nueva con un orden estable.
// Supabase limita a 1000 filas por respuesta, aunque se pida un rango mayor.
export async function traerTodo(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

export async function comprobar(consulta) {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data;
}
