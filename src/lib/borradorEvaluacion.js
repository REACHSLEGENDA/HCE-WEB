// El borrador vive en este navegador y pertenece a un usuario y una lección.
// Nunca guarda claves de respuesta ni modifica intentos del servidor.
export const claveBorradorEvaluacion = (userId, leccionId, esAdmin) =>
  `hce:evaluacion:borrador:${esAdmin ? 'admin' : 'alumno'}:${userId}:${leccionId}`;

export const firmaEvaluacion = (datos, tipo) => JSON.stringify({
  tipo,
  config: datos.config,
  preguntas: datos.preguntas.map(({ id, tipo, texto, opciones, puntos, obligatoria }) => ({ id, tipo, texto, opciones, puntos, obligatoria })),
});

export function leerBorradorEvaluacion(clave) {
  try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch { return null; }
}

export function guardarBorradorEvaluacion(clave, borrador) {
  try { localStorage.setItem(clave, JSON.stringify(borrador)); return true; } catch { return false; }
}

export function borrarBorradorEvaluacion(clave) {
  try { localStorage.removeItem(clave); return true; } catch { return false; }
}

// Si cambió una pregunta/opción/configuración o ya se envió otro intento,
// no se reutilizan respuestas que podrían pertenecer a un examen diferente.
export function validarBorradorEvaluacion(borrador, datos, intentosPrevios, tipo) {
  if (!datos || !borrador || borrador.version !== 1
    || borrador.firma !== firmaEvaluacion(datos, tipo) || borrador.intentosPrevios !== intentosPrevios
    || !borrador.iniciadoEn || !Number.isFinite(Date.parse(borrador.iniciadoEn))
    || !borrador.respuestas || Array.isArray(borrador.respuestas) || typeof borrador.respuestas !== 'object'
    || !Array.isArray(borrador.orden)) return null;
  const ids = datos.preguntas.map(p => p.id);
  if (borrador.orden.length && (borrador.orden.length !== ids.length
    || new Set(borrador.orden).size !== ids.length || borrador.orden.some(id => !ids.includes(id)))) return null;
  const respuestas = {};
  for (const p of datos.preguntas) {
    const v = borrador.respuestas[p.id];
    if (v == null) continue;
    const opcionValida = n => Number.isInteger(n) && n >= 0 && n < (p.opciones || []).length;
    const valida = p.tipo === 'opcion' ? opcionValida(v)
      : p.tipo === 'multiple' ? Array.isArray(v) && v.every(opcionValida) && new Set(v).size === v.length
        : p.tipo === 'escala' ? Number.isInteger(v) && v >= 1 && v <= (p.opciones?.length || 5)
          : p.tipo === 'abierta' && typeof v === 'string';
    if (!valida) return null;
    respuestas[p.id] = v;
  }
  return { ...borrador, respuestas, actual: Math.max(0, Math.min(Number.isInteger(borrador.actual) ? borrador.actual : 0, ids.length - 1)), revisando: borrador.revisando === true };
}
