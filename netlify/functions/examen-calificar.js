// Calificación del examen final de un curso, del lado del servidor.
//
// Antes el navegador del alumno recibía las respuestas correctas y calificaba
// solo: bastaba con abrir las herramientas del navegador para aprobar sin
// estudiar. Aquí las respuestas no salen nunca del servidor; el navegador
// manda lo que eligió el alumno y recibe solo la calificación.
//
// También se verifica que el alumno pueda presentarlo: inscrito y con las
// lecciones obligatorias completas. El intento queda registrado aquí, no en el
// navegador, para que las métricas no dependan de lo que este reporte.

import { admin, usuarioDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'El examen no está configurado en el servidor.' });
  }

  try {
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    const { courseId, respuestas = {} } = JSON.parse(event.body || '{}');
    if (!courseId) return json(400, { error: 'Falta el curso.' });

    const db = admin();
    const idCurso = Number(courseId);

    const { data: perfil } = await db.from('profiles').select('rol').eq('id', user.id).single();
    const esAdmin = perfil?.rol === 'admin';

    const { data: curso, error: errCurso } = await db
      .from('courses')
      .select('id, title, min_aprobacion')
      .eq('id', idCurso)
      .single();
    if (errCurso || !curso) return json(404, { error: 'Ese curso ya no existe.' });

    if (!esAdmin) {
      const { data: inscripcion } = await db
        .from('inscripciones')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', idCurso)
        .maybeSingle();
      if (!inscripcion) return json(403, { error: 'No estás inscrito en este curso.' });

      // Lecciones obligatorias pendientes: el examen es el cierre del curso.
      const { data: obligatorias } = await db
        .from('curso_lecciones')
        .select('id')
        .eq('course_id', idCurso)
        .eq('obligatoria', true);

      if (obligatorias?.length) {
        const { data: completas } = await db
          .from('leccion_progreso')
          .select('leccion_id')
          .eq('user_id', user.id)
          .eq('course_id', idCurso)
          .eq('completada', true);
        const hechas = new Set((completas || []).map((f) => f.leccion_id));
        const faltan = obligatorias.filter((l) => !hechas.has(l.id)).length;
        if (faltan) {
          return json(409, {
            error: `Te ${faltan === 1 ? 'falta 1 lección' : `faltan ${faltan} lecciones`} por completar antes del examen.`,
            estado: 'lecciones-pendientes',
          });
        }
      }
    }

    // Mismo orden en que el aula muestra las preguntas.
    const { data: preguntas, error: errPreguntas } = await db
      .from('questions')
      .select('id, correct_option_index')
      .eq('course_id', idCurso)
      .order('id', { ascending: true });
    if (errPreguntas) throw new Error(errPreguntas.message);

    const total = preguntas?.length || 0;
    let correctas = 0;
    (preguntas || []).forEach((p, i) => {
      // Se aceptan respuestas por número de pregunta o por su id.
      const elegida = respuestas[p.id] ?? respuestas[i];
      if (elegida != null && Number(elegida) === Number(p.correct_option_index)) correctas += 1;
    });

    const calificacion = total ? Math.floor((correctas / total) * 100) : 100;
    const minimo = curso.min_aprobacion || 80;
    const aprobado = calificacion >= minimo;

    // Los administradores no cuentan en las métricas.
    if (!esAdmin) {
      const { error: errEvento } = await db.from('curso_eventos').insert([{
        user_id: user.id,
        course_id: idCurso,
        tipo: 'examen_enviado',
        datos: { calificacion, minimo, aprobado, preguntas: total, correctas, origen: 'servidor' },
      }]);
      if (errEvento) console.error('No se pudo registrar el intento:', errEvento.message);
    }

    return json(200, { calificacion, minimo, aprobado, correctas, total });
  } catch (err) {
    console.error('Examen calificar error:', err.message);
    return json(500, { error: err.message });
  }
};
