// Cálculos puros para reordenar lecciones arrastrando (sin React ni Supabase).

const esSeccion = (l) => l?.tipo === 'seccion';

/** Cuántas filas forman el bloque que empieza en `indice`: una sección con sus lecciones. */
export function tamanoBloque(lista, indice) {
  const l = lista[indice];
  if (!esSeccion(l)) return 1;
  let n = 1;
  while (indice + n < lista.length && !esSeccion(lista[indice + n])) n += 1;
  return n;
}

// Índice de la sección a la que pertenece la fila `indice` (-1 si va antes de toda sección).
function seccionDe(lista, indice) {
  for (let i = indice; i >= 0; i -= 1) if (esSeccion(lista[i])) return i;
  return -1;
}

/** Id de la sección donde queda la lección `id` (null si va antes de toda sección). */
export function seccionDeLeccion(lista, id) {
  const i = seccionDe(lista, lista.findIndex((l) => l.id === id));
  return i === -1 ? null : lista[i].id;
}

/**
 * Nueva lista al soltar `activoId` sobre `sobreId`.
 * - Una sección se mueve siempre junto con sus lecciones, y cae entre secciones
 *   (nunca parte otra sección a la mitad).
 * - Una lección que baja se coloca justo después de la fila destino (si es el
 *   encabezado de una sección, queda como su primera lección).
 */
export function moverEnLista(lista, activoId, sobreId) {
  const desde = lista.findIndex((l) => l.id === activoId);
  const hasta = lista.findIndex((l) => l.id === sobreId);
  if (desde === -1 || hasta === -1 || desde === hasta) return lista;

  const esBloque = esSeccion(lista[desde]);
  const tam = tamanoBloque(lista, desde);
  const movidos = lista.slice(desde, desde + tam);
  const resto = [...lista.slice(0, desde), ...lista.slice(desde + tam)];
  let destino = resto.findIndex((l) => l.id === sobreId);
  if (destino === -1) return lista; // se soltó dentro de su propio bloque
  const baja = hasta > desde;

  if (esBloque) {
    const inicio = seccionDe(resto, destino);
    if (inicio === -1) destino = baja ? destino + 1 : destino;
    else destino = baja ? inicio + tamanoBloque(resto, inicio) : inicio;
  } else if (baja) {
    destino += 1;
  }
  const nueva = [...resto.slice(0, destino), ...movidos, ...resto.slice(destino)];
  return nueva.every((l, i) => l === lista[i]) ? lista : nueva;
}

/**
 * Escrituras mínimas para guardar `nueva` (misma lista que `anterior`, en otro orden).
 * Si el orden guardado ya era único y creciente, se reparten esos mismos números
 * y solo se escriben las filas que cambian de número. Si venía con huecos o
 * repetidos, se renumera 1..n (también solo las que cambian).
 */
export function cambiosDeOrden(anterior, nueva) {
  const ordenes = anterior.map((l) => l.orden);
  const unico = ordenes.every((o, i) => o != null && (i === 0 || o > ordenes[i - 1]));
  const valores = unico ? ordenes : nueva.map((_, i) => i + 1);
  return nueva
    .map((l, i) => ({ id: l.id, orden: valores[i], antes: l.orden }))
    .filter((c) => c.orden !== c.antes);
}

/** Igual que `nueva`, con el número de orden que tendrá cada fila al guardar. */
export function aplicarCambios(nueva, cambios) {
  const porId = new Map(cambios.map((c) => [c.id, c.orden]));
  return nueva.map((l) => (porId.has(l.id) ? { ...l, orden: porId.get(l.id) } : l));
}
