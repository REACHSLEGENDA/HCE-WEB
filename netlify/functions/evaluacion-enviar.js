// Envío de un examen o una encuesta de lección, calificado en el servidor.
//
// Las respuestas correctas nunca salen de aquí: el navegador manda lo que
// contestó el alumno y recibe la calificación (y, si el examen lo permite, qué
// contestó bien). El intento se guarda completo, con cada respuesta, porque es
// lo que alimenta el análisis por pregunta.
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

// Deja solo respuestas con la forma que corresponde a cada tipo de pregunta.
function limpiarRespuesta(pregunta, valor) {
  if (valor == null || valor === '') return null;
  const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones.length : 0;
  const indiceValido = (n) => Number.isInteger(n) && n >= 0 && n < opciones;

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

function esCorrecta(pregunta, respuesta, correctas) {
  if (respuesta == null) return false;
  if (pregunta.tipo === 'opcion') return correctas.includes(respuesta);
  if (pregunta.tipo === 'multiple') {
    const esperadas = [...correctas].sort((a, b) => a - b);
    return esperadas.length === respuesta.length && esperadas.every((c, i) => c === respuesta[i]);
  }
  return false;
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
      .select('id, course_id, tipo, titulo')
      .eq('id', Number(leccionId))
      .maybeSingle();
    if (!leccion || !['examen', 'encuesta'].includes(leccion.tipo)) {
      return json(404, { error: 'Esa evaluación ya no existe.' });
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
      if (!acceso.vigente) return json(403, { error: acceso.error, estado: 'acceso-vencido' });
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
    let puntosPosibles = 0;
    let puntosObtenidos = 0;
    let correctasCuenta = 0;
    let calificables = 0;
    const detalle = {};
    for (const p of preguntas) {
      const correctas = clavePorPregunta.get(p.id) || [];
      if (!['opcion', 'multiple'].includes(p.tipo) || !correctas.length) continue;
      const bien = esCorrecta(p, limpias[p.id], correctas);
      const puntos = Math.max(0, Number(p.puntos) || 1);
      calificables += 1;
      puntosPosibles += puntos;
      if (bien) { puntosObtenidos += puntos; correctasCuenta += 1; }
      detalle[p.id] = { correcta: bien, correctas };
    }

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

    // Con reintentos pendientes, revelar la opción correcta regalaría el
    // siguiente intento: solo se dice qué contestó bien o mal.
    const puedeReintentar = esExamen && !aprobado && (restantes == null || restantes > 0);
    const detalleVisible = config.mostrar_respuestas && esExamen
      ? Object.fromEntries(Object.entries(detalle).map(([id, d]) => [id, puedeReintentar ? { correcta: d.correcta } : d]))
      : null;

    return json(200, {
      ok: true,
      tipo: leccion.tipo,
      calificacion,
      aprobado,
      minimo,
      correctas: correctasCuenta,
      calificables,
      intento: numero,
      intentosRestantes: restantes,
      detalle: detalleVisible,
      simulado: esAdmin,
    });
  } catch (err) {
    console.error('Evaluacion enviar error:', err.message);
    return json(500, { error: err.message });
  }
};
