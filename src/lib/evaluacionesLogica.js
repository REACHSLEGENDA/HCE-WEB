// Lógica de exámenes y encuestas sin dependencias (se prueba fuera del
// navegador): preguntas de emparejar, orden aleatorio de las respuestas y qué
// ve el alumno al terminar.
//
// La calificación vive en netlify/functions/evaluacion-enviar.js. Lo que aquí
// se repite de ella (finalizacionDe) debe quedar igual en los dos lados.

export const TIPOS_CON_CLAVE = ['opcion', 'multiple', 'emparejar'];
export const MIN_PARES = 2;
export const MAX_PARES = 10;
export const MOSTRAR_CORRECTAS = ['nunca', 'siempre', 'al_aprobar'];

/** Mezcla una copia (Fisher-Yates). `azar` se puede fijar en las pruebas. */
export function barajar(lista, azar = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ---- Emparejar ----------------------------------------------------------------

/** Columnas guardadas en `opciones`: { izquierda: [...], derecha: [...] }. */
export function columnasEmparejar(opciones) {
  const o = opciones && typeof opciones === 'object' && !Array.isArray(opciones) ? opciones : {};
  return {
    izquierda: Array.isArray(o.izquierda) ? o.izquierda.map(String) : [],
    derecha: Array.isArray(o.derecha) ? o.derecha.map(String) : [],
  };
}

/** Pares que ve el administrador, a partir de lo guardado y su clave. */
export function paresDesdeGuardado(opciones, correctas = []) {
  const { izquierda, derecha } = columnasEmparejar(opciones);
  return izquierda.map((texto, i) => ({ izquierda: texto, derecha: derecha[Number(correctas[i])] ?? '' }));
}

const normal = (t) => String(t ?? '').trim().toLocaleLowerCase('es');

/** Texto del error si los pares no se pueden guardar; '' si están bien. */
export function validarPares(pares) {
  const lista = Array.isArray(pares) ? pares : [];
  if (lista.length < MIN_PARES) return `Pon al menos ${MIN_PARES} pares.`;
  if (lista.length > MAX_PARES) return `Son ${MAX_PARES} pares como máximo.`;
  if (lista.some((p) => !String(p.izquierda ?? '').trim() || !String(p.derecha ?? '').trim())) return 'Hay pares incompletos: llena las dos columnas o quita el par.';
  if (new Set(lista.map((p) => normal(p.izquierda))).size !== lista.length) return 'Hay elementos repetidos en la columna izquierda.';
  if (new Set(lista.map((p) => normal(p.derecha))).size !== lista.length) return 'Hay elementos repetidos en la columna derecha.';
  return '';
}

/**
 * Lo que se guarda de una pregunta de emparejar: la columna derecha revuelta
 * (para no revelar la respuesta) y la clave, donde correctas[i] es el índice
 * en `derecha` que corresponde a izquierda[i].
 *
 * Si la columna derecha tiene los mismos textos que antes, se conserva su
 * orden: así no cambia la pregunta (ni se pierden borradores) al editar solo
 * el texto o los puntos.
 */
export function prepararEmparejar(pares, derechaAnterior = null, azar = Math.random) {
  const izquierda = pares.map((p) => String(p.izquierda).trim());
  const textos = pares.map((p) => String(p.derecha).trim());
  const ordenados = (l) => [...l].sort().join('\u0000');
  let derecha = Array.isArray(derechaAnterior) && derechaAnterior.length === textos.length && ordenados(derechaAnterior) === ordenados(textos)
    ? [...derechaAnterior]
    : barajar(textos, azar);
  // En el mismo orden que la izquierda regalaría la respuesta.
  if (textos.length > 1 && derecha.every((t, i) => t === textos[i])) derecha = [...derecha.slice(1), derecha[0]];
  return { opciones: { izquierda, derecha }, correctas: textos.map((t) => derecha.indexOf(t)) };
}

// ---- Respuestas en orden aleatorio -----------------------------------------------

/** Cuántas opciones se pueden revolver en la pregunta (0 si ninguna). */
export function opcionesRevolvibles(pregunta) {
  if (['opcion', 'multiple'].includes(pregunta.tipo)) return Array.isArray(pregunta.opciones) ? pregunta.opciones.length : 0;
  if (pregunta.tipo === 'emparejar') return columnasEmparejar(pregunta.opciones).derecha.length;
  return 0;
}

/**
 * Orden en que se muestran las opciones de cada pregunta en un intento:
 * { [preguntaId]: [índice original en la posición 0, en la 1, ...] }.
 * Las respuestas se siguen guardando y enviando con el índice ORIGINAL.
 */
export function ordenarOpciones(preguntas, azar = Math.random) {
  const orden = {};
  for (const p of preguntas) {
    const n = opcionesRevolvibles(p);
    if (n > 1) orden[p.id] = barajar([...Array(n).keys()], azar);
  }
  return orden;
}

/** Índices originales en el orden en que se muestran. */
export function indicesVisibles(pregunta, ordenOpciones) {
  const n = opcionesRevolvibles(pregunta) || (Array.isArray(pregunta.opciones) ? pregunta.opciones.length : 0);
  const orden = ordenOpciones?.[pregunta.id];
  return esPermutacion(orden, n) ? orden : [...Array(n).keys()];
}

export function esPermutacion(lista, n) {
  return Array.isArray(lista) && lista.length === n && new Set(lista).size === n
    && lista.every((x) => Number.isInteger(x) && x >= 0 && x < n);
}

// ---- Qué ve el alumno al terminar -------------------------------------------------

/**
 * Opciones de finalización de una fila de evaluacion_config. Antes de
 * evaluaciones-mejoras.sql no existen las columnas nuevas: "mostrar qué
 * contestó bien" (mostrar_respuestas) equivale a marcas = sí y correctas =
 * siempre.
 */
export function finalizacionDe(fila = {}) {
  const f = fila || {};
  const legado = f.mostrar_respuestas === true;
  return {
    mostrar_calificacion: typeof f.mostrar_calificacion === 'boolean' ? f.mostrar_calificacion : true,
    mostrar_marcas: typeof f.mostrar_marcas === 'boolean' ? f.mostrar_marcas : legado,
    mostrar_correctas: MOSTRAR_CORRECTAS.includes(f.mostrar_correctas) ? f.mostrar_correctas : (legado ? 'siempre' : 'nunca'),
    aleatorio_opciones: f.aleatorio_opciones === true,
  };
}

/** Si la fila ya tiene las columnas de evaluaciones-mejoras.sql (null si no hay fila). */
export const tieneMejoras = (fila) => (fila ? 'mostrar_marcas' in fila : null);

export const esColumnaFaltante = (error) => ['42703', 'PGRST204'].includes(error?.code);
