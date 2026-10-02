// Exámenes y encuestas de lección (ver supabase/lms-evaluaciones.sql).
//
// El alumno carga las preguntas sin la respuesta correcta y envía lo que
// contestó a la función evaluacion-enviar, que califica. El administrador lee
// y escribe también las respuestas correctas (tabla evaluacion_claves).

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

export { TIPOS_PREGUNTA, ESCALA_BASE } from './evaluacionesBase';

export const CONFIG_BASE = {
  min_aprobacion: 80,
  intentos_max: null,
  mostrar_respuestas: false,
  aleatorio: false,
  cuenta_calificacion: true,
};

async function token() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function llamar(funcion, cuerpo) {
  const res = await fetch(`/.netlify/functions/${funcion}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'No se pudo completar. Intenta de nuevo.');
    error.estado = data.estado;
    error.faltan = data.faltan;
    throw error;
  }
  return data;
}

/** Configuración y preguntas (sin respuestas) de una evaluación. `null` antes de la migración. */
export async function cargarEvaluacion(leccionId) {
  const [config, preguntas] = await Promise.all([
    supabase.from('evaluacion_config').select('*').eq('leccion_id', leccionId).maybeSingle(),
    supabase.from('evaluacion_preguntas').select('id, orden, tipo, texto, opciones, puntos, obligatoria').eq('leccion_id', leccionId).order('orden').order('id'),
  ]);
  const error = config.error || preguntas.error;
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return { config: { ...CONFIG_BASE, ...(config.data || {}) }, preguntas: preguntas.data || [] };
}

export async function cargarMisIntentos(userId, leccionId) {
  const { data, error } = await supabase
    .from('evaluacion_intentos')
    .select('id, numero, calificacion, aprobado, enviado_en, duracion_seg')
    .eq('user_id', userId)
    .eq('leccion_id', leccionId)
    .order('numero', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return data || [];
}

export const enviarEvaluacion = (leccionId, respuestas, iniciadoEn) =>
  llamar('evaluacion-enviar', { leccionId, respuestas, iniciadoEn });

export const reiniciarIntentos = (userId, leccionId) =>
  llamar('evaluacion-admin', { accion: 'reiniciar', userId, leccionId });

/** Mezcla una copia (para preguntas en orden aleatorio). */
export function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ---- Administrador -------------------------------------------------------------

/** Evaluación completa, con las respuestas correctas de cada pregunta. */
export async function cargarEvaluacionAdmin(leccionId) {
  const base = await cargarEvaluacion(leccionId);
  if (!base) return null;
  const ids = base.preguntas.map((p) => p.id);
  const { data: claves, error } = ids.length
    ? await supabase.from('evaluacion_claves').select('pregunta_id, correctas').in('pregunta_id', ids)
    : { data: [], error: null };
  if (error && !esTablaFaltante(error)) throw error;
  const porPregunta = new Map((claves || []).map((c) => [c.pregunta_id, c.correctas || []]));
  return {
    config: base.config,
    preguntas: base.preguntas.map((p) => ({ ...p, correctas: porPregunta.get(p.id) || [] })),
  };
}

export async function guardarConfigEvaluacion(leccionId, config) {
  const minimo = Number(config.min_aprobacion ?? 80);
  if (!Number.isFinite(minimo) || minimo < 0 || minimo > 100 || config.min_aprobacion === '') throw new Error('El mínimo para aprobar debe estar entre 0 y 100.');
  const intentos = config.intentos_max === '' || config.intentos_max == null ? null : Number(config.intentos_max);
  if (intentos != null && (!Number.isInteger(intentos) || intentos < 1)) throw new Error('Los intentos permitidos deben ser un entero mayor a cero.');
  const { error } = await supabase.from('evaluacion_config').upsert([{
    leccion_id: leccionId,
    min_aprobacion: minimo,
    intentos_max: intentos,
    mostrar_respuestas: !!config.mostrar_respuestas,
    aleatorio: !!config.aleatorio,
    cuenta_calificacion: config.cuenta_calificacion !== false,
    actualizado_en: new Date().toISOString(),
  }], { onConflict: 'leccion_id' });
  if (error) throw error;
}

/** Crea o actualiza una pregunta y su respuesta correcta. Devuelve su id. */
export async function guardarPregunta(leccionId, pregunta) {
  const datos = {
    leccion_id: leccionId,
    orden: pregunta.orden ?? 0,
    tipo: pregunta.tipo,
    texto: pregunta.texto.trim(),
    opciones: pregunta.tipo === 'abierta' ? [] : pregunta.opciones.map((o) => String(o).trim()),
    puntos: Math.max(1, Number(pregunta.puntos) || 1),
    obligatoria: pregunta.obligatoria !== false,
  };

  let id = pregunta.id;
  if (id) {
    const { error } = await supabase.from('evaluacion_preguntas').update(datos).eq('id', id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('evaluacion_preguntas').insert([datos]).select('id').single();
    if (error) throw error;
    id = data.id;
  }

  const correctas = ['opcion', 'multiple'].includes(pregunta.tipo) ? (pregunta.correctas || []).map(Number) : [];
  const { error: errClave } = await supabase.from('evaluacion_claves').upsert([{ pregunta_id: id, correctas }], { onConflict: 'pregunta_id' });
  if (errClave) { errClave.preguntaId = id; errClave.preguntaOrden = datos.orden; throw errClave; }
  return id;
}

export async function borrarPregunta(id) {
  const { error } = await supabase.from('evaluacion_preguntas').delete().eq('id', id);
  if (error) throw error;
}

export async function reordenarPreguntas(ids) {
  const resultados = await Promise.all(ids.map((id, i) => supabase.from('evaluacion_preguntas').update({ orden: i + 1 }).eq('id', id)));
  const fallo = resultados.find((r) => r.error);
  if (fallo) throw fallo.error;
}
