// Envío de un examen o una encuesta de lección, calificado en el servidor.
//
// Las respuestas correctas nunca salen de aquí salvo que el examen lo permita:
// el navegador manda lo que contestó el alumno y recibe lo que la regla "Al
// terminar el examen, el alumno ve" dice (calificación, si acertó cada una,
// las respuestas correctas). El intento se guarda completo, con cada
// respuesta, porque es lo que alimenta el análisis por pregunta.
//
// Las funciones de calificación se exportan para probarlas sin servidor. Este
// archivo solo importa _supabase.js y _notificaciones.js (scripts/verificar-lms
// lo carga con esas dos dependencias simuladas): no agregar otros imports.
//
// Si el examen se aprueba, o la encuesta se envía, la lección queda completada.
// Solo este servidor puede marcarla (ver lms-evaluaciones.sql, "candado").
//
// Un administrador puede presentarlo para revisarlo: recibe la calificación,
// pero no se guarda nada.

import { admin, usuarioDesdeToken, cuentaHabilitada, accesoVigente, json, isConfigured as supabaseListo } from './_supabase.js';
import { notificar } from './_notificaciones.js';

const CONFIG_BASE = { min_aprobacion: 80, intentos_max: null, mostrar_respuestas: false };
const MAX_TEXTO = 5000;
const TIPOS_CALIFICABLES = ['opcion', 'multiple', 'emparejar'];
const MOSTRAR_CORRECTAS = ['nunca', 'siempre', 'al_aprobar'];

// Emparejar guarda { izquierda: [...], derecha: [...] } en opciones.
const columnas = (opciones) => {
  const o = opciones && typeof opciones === 'object' && !Array.isArray(opciones) ? opciones : {};
  return { izquierda: Array.isArray(o.izquierda) ? o.izquierda : [], derecha: Array.isArray(o.derecha) ? o.derecha : [] };
};

// Deja solo respuestas con la forma que corresponde a cada tipo de pregunta.
export function limpiarRespuesta(pregunta, valor) {
  if (valor == null || valor === '') return null;
  const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones.length : 0;
  const indiceValido = (n) => Number.isInteger(n) && n >= 0 && n < opciones;

  if (pregunta.tipo === 'emparejar') {
    // Un índice de la derecha por cada elemento de la izquierda, todos elegidos.
    const { izquierda, derecha } = columnas(pregunta.opciones);
    if (!Array.isArray(valor) || !izquierda.length || valor.length !== izquierda.length) return null;
    const lista = valor.map((n) => (n == null || n === '' ? NaN : Number(n)));
    return lista.every((n) => Number.isInteger(n) && n >= 0 && n < derecha.length) ? lista : null;
  }
  if (pregunta.tipo === 'opcion') {
    const n = Number(valor);
    return indiceValido(n) ? n : null;
  }
  if (pregunta.tipo === 'multiple') {
    const lista = [...new Set((Array.isArray(valor) ? valor : [valor]).map(Number).filter(indiceValido))].sort((a, b) => a - b);
    return lista.length ? lista : null;
  }
  if (pregunta.tipo === 'escala') {
    const n = Number(valor);
    const maximo = opciones || 5;
    return Number.isInteger(n) && n >= 1 && n <= maximo ? n : null;
  }
  const texto = String(valor).trim().slice(0, MAX_TEXTO);
  return texto || null;
}

export function esCorrecta(pregunta, respuesta, correctas) {
  if (respuesta == null) return false;
  if (pregunta.tipo === 'opcion') return correctas.includes(respuesta);
  if (pregunta.tipo === 'multiple') {
    const esperadas = [...correctas].sort((a, b) => a - b);
    return esperadas.length === respuesta.length && esperadas.every((c, i) => c === respuesta[i]);
  }
  // Emparejar: todo o nada, igual que "varias correctas".
  if (pregunta.tipo === 'emparejar') {
    return Array.isArray(respuesta) && respuesta.length === correctas.length && correctas.every((c, i) => c === respuesta[i]);
  }
  return false;
}

/** Si la pregunta cuenta para la calificación (tiene clave completa). */
export function esCalificable(pregunta, correctas) {
  if (!TIPOS_CALIFICABLES.includes(pregunta.tipo) || !correctas?.length) return false;
  if (pregunta.tipo === 'emparejar') {
    const { izquierda, derecha } = columnas(pregunta.opciones);
    return correctas.length === izquierda.length && correctas.every((c) => Number.isInteger(c) && c >= 0 && c < derecha.length);
  }
  return true;
}

/**
 * Califica las respuestas limpias. Solo cuentan las preguntas con respuesta
 * correcta definida. `clavePorPregunta`: Map de id -> índices correctos.
 */
export function calificar(preguntas, limpias, clavePorPregunta) {
  let puntosPosibles = 0;
  let puntosObtenidos = 0;
  let correctasCuenta = 0;
  let calificables = 0;
  const detalle = {};
  for (const p of preguntas) {
    const correctas = clavePorPregunta.get(p.id) || [];
    if (!esCalificable(p, correctas)) continue;
    const bien = esCorrecta(p, limpias[p.id], correctas);
    const puntos = Math.max(0, Number(p.puntos) || 1);
    calificables += 1;
    puntosPosibles += puntos;
    if (bien) { puntosObtenidos += puntos; correctasCuenta += 1; }
    detalle[p.id] = { correcta: bien, correctas };
  }
  return { puntosPosibles, puntosObtenidos, correctasCuenta, calificables, detalle };
}

/**
 * Qué ve el alumno al terminar (igual que src/lib/evaluacionesLogica.js).
 * Antes de evaluaciones-mejoras.sql: mostrar_respuestas = true equivale a
 * marcas = sí y correctas = siempre.
 */
export function finalizacionDe(fila = {}) {
  const f = fila || {};
  const legado = f.mostrar_respuestas === true;
  return {
    mostrar_calificacion: typeof f.mostrar_calificacion === 'boolean' ? f.mostrar_calificacion : true,
    // Cuántas contestó bien ("17 de 20"). Antes de evaluaciones-aciertos.sql iba
    // junto con la calificación.
    mostrar_aciertos: typeof f.mostrar_aciertos === 'boolean' ? f.mostrar_aciertos
      : (typeof f.mostrar_calificacion === 'boolean' ? f.mostrar_calificacion : true),
    mostrar_marcas: typeof f.mostrar_marcas === 'boolean' ? f.mostrar_marcas : legado,
    mostrar_correctas: MOSTRAR_CORRECTAS.includes(f.mostrar_correctas) ? f.mostrar_correctas : (legado ? 'siempre' : 'nunca'),
  };
}

/**
 * Lo que se devuelve al alumno según la configuración. Las claves solo salen
 * si "Las respuestas correctas" es Siempre, o Solo si aprueba y aprobó.
 * Nunca mientras le queden intentos: le regalaría el siguiente (como antes).
 */
export function resultadoVisible({ config, esExamen, aprobado, calificacion, correctas, calificables, detalle, puedeReintentar = false }) {
  if (!esExamen) return { mostrarCalificacion: false, calificacion: null, correctas: null, calificables: null, detalle: null };
  const f = finalizacionDe(config);
  const verCorrectas = !puedeReintentar
    && (f.mostrar_correctas === 'siempre' || (f.mostrar_correctas === 'al_aprobar' && aprobado === true));
  const verMarcas = f.mostrar_marcas;
  const visible = verMarcas || verCorrectas
    ? Object.fromEntries(Object.entries(detalle || {}).map(([id, d]) => [id, {
      ...(verMarcas ? { correcta: d.correcta } : {}),
      ...(verCorrectas ? { correctas: d.correctas } : {}),
    }]))
    : null;
  return {
    mostrarCalificacion: f.mostrar_calificacion,
    calificacion: f.mostrar_calificacion ? calificacion : null,
    correctas: f.mostrar_aciertos ? correctas : null,
    calificables: f.mostrar_aciertos ? calificables : null,
    detalle: visible && Object.keys(visible).length ? visible : null,
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Las evaluaciones no están configuradas en el servidor.' });
  }

  try {
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    const cuenta = await cuentaHabilitada(user.id, { exigirAprobacion: true });
    if (!cuenta.habilitada) return json(403, { error: cuenta.error, estado: 'cuenta-no-habilitada' });

    const { leccionId, respuestas = {}, iniciadoEn = null } = JSON.parse(event.body || '{}');
    if (!leccionId) return json(400, { error: 'Falta la evaluación.' });

    const db = admin();
    const { data: perfil } = await db.from('profiles').select('rol').eq('id', user.id).single();
    const esAdmin = perfil?.rol === 'admin';

    const { data: leccion } = await db
      .from('curso_lecciones')
      .select('*')
      .eq('id', Number(leccionId))
      .maybeSingle();
    if (!leccion || !['examen', 'encuesta'].includes(leccion.tipo)) {
      return json(404, { error: 'Esa evaluación ya no existe.' });
    }
    // Despublicada: todavía no se abre a los alumnos.
    if (leccion.publicada === false && !esAdmin) {
      return json(403, { error: 'Esta evaluación todavía no está disponible.' });
    }
    const esExamen = leccion.tipo === 'examen';

    if (!esAdmin) {
      const { data: inscripcion } = await db
        .from('inscripciones')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', leccion.course_id)
        .maybeSingle();
      if (!inscripcion) return json(403, { error: 'No estás inscrito en este curso.' });

      // Con días de acceso vencidos (lms-reglas.sql) ya no se presenta.
      const acceso = await accesoVigente(user.id, leccion.course_id);
      if (!acceso.vigente) return json(403, { error: acceso.error, estado: acceso.porGrupo ? 'esperando-grupo' : 'acceso-vencido' });
    }

    const [{ data: configFila, error: errConfig }, { data: preguntas, error: errPreguntas }, { data: previos, error: errPrevios }] = await Promise.all([
      db.from('evaluacion_config').select('*').eq('leccion_id', leccion.id).maybeSingle(),
      db.from('evaluacion_preguntas').select('id, tipo, texto, opciones, puntos, obligatoria').eq('leccion_id', leccion.id).order('orden').order('id'),
      esAdmin
        ? Promise.resolve({ data: [] })
        : db.from('evaluacion_intentos').select('id, aprobado, numero').eq('leccion_id', leccion.id).eq('user_id', user.id),
    ]);
    if (errPreguntas) throw new Error(errPreguntas.message);
    if (errConfig) throw new Error(errConfig.message);
    if (errPrevios) throw new Error(errPrevios.message);
    if (!preguntas?.length) return json(409, { error: 'Esta evaluación todavía no tiene preguntas.' });

    const config = { ...CONFIG_BASE, ...(configFila || {}) };
    const intentosPrevios = previos?.length || 0;

    if (!esAdmin) {
      if (!esExamen && intentosPrevios) {
        const { error: errReparar } = await db.from('leccion_progreso').upsert([{
          user_id: user.id, leccion_id: leccion.id, course_id: leccion.course_id, porcentaje: 100, completada: true,
        }], { onConflict: 'user_id,leccion_id' });
        if (errReparar) throw new Error(`No se pudo recuperar el avance de tu encuesta: ${errReparar.message}`);
        return json(409, { error: 'Ya enviaste esta encuesta. ¡Gracias!', estado: 'ya-enviada' });
      }
      if (esExamen && previos.some((p) => p.aprobado)) {
        const { error: errReparar } = await db.from('leccion_progreso').upsert([{
          user_id: user.id, leccion_id: leccion.id, course_id: leccion.course_id, porcentaje: 100, completada: true,
        }], { onConflict: 'user_id,leccion_id' });
        if (errReparar) throw new Error(`No se pudo recuperar el avance de tu examen: ${errReparar.message}`);
        return json(409, { error: 'Ya aprobaste este examen.', estado: 'ya-aprobado' });
      }
      if (esExamen && config.intentos_max && intentosPrevios >= config.intentos_max) {
        return json(409, { error: 'Ya usaste todos los intentos de este examen.', estado: 'sin-intentos' });
      }
    }

    const { data: claves, error: errClaves } = await db
      .from('evaluacion_claves')
      .select('pregunta_id, correctas')
      .in('pregunta_id', preguntas.map((p) => p.id));
    if (errClaves) throw new Error(errClaves.message);
    const clavePorPregunta = new Map((claves || []).map((c) => [c.pregunta_id, (c.correctas || []).map(Number)]));

    // Respuestas limpias y preguntas obligatorias sin contestar.
    const limpias = {};
    const faltan = [];
    preguntas.forEach((p, i) => {
      const valor = limpiarRespuesta(p, respuestas[p.id]);
      if (valor != null) limpias[p.id] = valor;
      else if (p.obligatoria) faltan.push(i + 1);
    });
    if (faltan.length) {
      return json(400, {
        error: `Falta contestar ${faltan.length === 1 ? 'la pregunta' : 'las preguntas'} ${faltan.join(', ')}.`,
        estado: 'faltan-respuestas',
        faltan,
      });
    }

    // Calificación: solo cuentan las preguntas con respuesta correcta definida.
    const { puntosPosibles, puntosObtenidos, correctasCuenta, calificables, detalle } = calificar(preguntas, limpias, clavePorPregunta);

    const calificacion = esExamen
      ? (puntosPosibles ? Math.round((puntosObtenidos / puntosPosibles) * 10000) / 100 : 100)
      : null;
    const minimo = config.min_aprobacion ?? 80;
    const aprobado = esExamen ? calificacion >= minimo : null;
    // Con el mayor número y no con el conteo: si se borró un intento, no choca.
    const numero = Math.max(intentosPrevios, ...(previos || []).map((p) => Number(p.numero) || 0)) + 1;

    if (!esAdmin) {
      const inicio = iniciadoEn ? new Date(iniciadoEn) : null;
      const duracion = inicio && !Number.isNaN(inicio.getTime())
        ? Math.max(0, Math.min(Math.round((Date.now() - inicio.getTime()) / 1000), 24 * 3600))
        : null;

      const { error: errIntento } = await db.from('evaluacion_intentos').insert([{
        leccion_id: leccion.id,
        course_id: leccion.course_id,
        user_id: user.id,
        numero,
        respuestas: limpias,
        calificacion,
        aprobado,
        iniciado_en: duracion != null ? inicio.toISOString() : null,
        duracion_seg: duracion,
      }]);
      if (errIntento?.code === '23505') return json(409, { error: 'Este intento ya se recibió. Actualiza la evaluación antes de volver a enviarla.', estado: 'intento-recibido' });
      if (errIntento) throw new Error(errIntento.message);

      if (!esExamen || aprobado) {
        const { error: errAvance } = await db.from('leccion_progreso').upsert([{
          user_id: user.id,
          leccion_id: leccion.id,
          course_id: leccion.course_id,
          porcentaje: 100,
          completada: true,
        }], { onConflict: 'user_id,leccion_id' });
        if (errAvance) throw new Error(`Tu resultado se guardó, pero no el avance de la lección. Reintenta para recuperarlo: ${errAvance.message}`);
      }

      if (esExamen && aprobado) {
        await notificar(db, 'examen_aprobado', {
          userId: user.id,
          courseId: leccion.course_id,
          clave: `examen:${leccion.id}`,
          variables: { examen: leccion.titulo, calificacion: `${Math.round(calificacion)}%` },
        });
      }
    }

    const restantes = esExamen && config.intentos_max && !aprobado
      ? Math.max(0, config.intentos_max - numero)
      : null;

    // Lo que ve el alumno lo decide la regla "Al terminar el examen" (el
    // administrador que lo prueba ve lo mismo que vería el alumno).
    const puedeReintentar = esExamen && !aprobado && (restantes == null || restantes > 0);
    const visible = resultadoVisible({ config, esExamen, aprobado, calificacion, correctas: correctasCuenta, calificables, detalle, puedeReintentar });

    return json(200, {
      ok: true,
      tipo: leccion.tipo,
      calificacion: visible.calificacion,
      mostrarCalificacion: visible.mostrarCalificacion,
      aprobado,
      minimo,
      correctas: visible.correctas,
      calificables: visible.calificables,
      intento: numero,
      intentosRestantes: restantes,
      detalle: visible.detalle,
      simulado: esAdmin,
    });
  } catch (err) {
    console.error('Evaluacion enviar error:', err.message);
    return json(500, { error: err.message });
  }
};
