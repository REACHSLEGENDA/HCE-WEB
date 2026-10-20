// Tarea programada de las notificaciones que no nacen de una acción en el
// servidor: se revisa cada hora qué pasó y se avisa (una sola vez por hecho,
// gracias a notificaciones_enviadas).
//
//   sesion_recordatorio  sesiones en vivo que empiezan en 30 a 90 minutos
//   sesion_recordatorio_dia  sesiones que empiezan en unas 24 horas
//   comentario_respondido    respuestas a preguntas del aula (últimas 2 horas)
//   tarea_revisada       tareas aprobadas o devueltas en las últimas 2 horas
//   curso_completado     certificados emitidos en las últimas 2 horas
//   inscrito_curso       inscripciones masivas del admin (lista de correos o
//                        grupo), que no avisan al momento para no pasar el
//                        límite de tiempo de Netlify
//   curso_abierto        cursos por generación que se abrieron: llegó la fecha
//                        de inicio del grupo, o se agregó al alumno a un grupo
//                        que ya había abierto

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { textoAcceso } from './_inscripciones.js';
import { notificar } from './_notificaciones.js';
import { fechaMexico, enlaceCalendario } from './_sesiones.js';

const MIN = 60 * 1000;

async function hayNotificacion(db, evento) {
  const { data, error } = await db.from('notificaciones').select('id').eq('evento', evento).eq('activo', true).limit(1);
  return !error && data?.length > 0;
}

export default async () => {
  if (!supabaseListo()) return new Response('Sin configurar', { status: 200 });
  const db = admin();
  const ahora = Date.now();
  const resumen = { recordatorios: 0, recordatoriosDia: 0, respuestas: 0, tareas: 0, cursos: 0, inscritos: 0, abiertos: 0 };

  // Recordatorio 1 hora antes de cada sesión en vivo.
  if (await hayNotificacion(db, 'sesion_recordatorio')) {
    const { data: sesiones } = await db
      .from('sesiones_clase')
      .select('leccion_id, inicia_en, duracion_min')
      .gte('inicia_en', new Date(ahora + 30 * MIN).toISOString())
      .lte('inicia_en', new Date(ahora + 90 * MIN).toISOString());
    for (const s of sesiones || []) {
      const { data: leccion } = await db.from('curso_lecciones').select('titulo, course_id').eq('id', s.leccion_id).maybeSingle();
      const { data: registros } = await db.from('sesion_registros').select('user_id').eq('leccion_id', s.leccion_id);
      for (const r of registros || []) {
        const res = await notificar(db, 'sesion_recordatorio', {
          userId: r.user_id,
          courseId: leccion?.course_id,
          // Con el horario en la clave, si la sesión se reprograma se vuelve
          // a recordar.
          clave: `sesion-recordatorio:${s.leccion_id}:${s.inicia_en}`,
          variables: { sesion: leccion?.titulo || '', fecha: fechaMexico(s.inicia_en) },
        });
        resumen.recordatorios += res.enviadas || 0;
      }
    }
  }

  // Recordatorio un día antes, con "Agregar a mi calendario". La ventana es
  // amplia (22 a 26 horas) y la clave lleva el horario: se manda una vez.
  if (await hayNotificacion(db, 'sesion_recordatorio_dia')) {
    const { data: sesiones } = await db
      .from('sesiones_clase')
      .select('leccion_id, inicia_en, duracion_min')
      .gte('inicia_en', new Date(ahora + 22 * 60 * MIN).toISOString())
      .lte('inicia_en', new Date(ahora + 26 * 60 * MIN).toISOString());
    for (const s of sesiones || []) {
      const { data: leccion } = await db.from('curso_lecciones').select('titulo, course_id').eq('id', s.leccion_id).maybeSingle();
      const { data: registros } = await db.from('sesion_registros').select('user_id').eq('leccion_id', s.leccion_id);
      const calendario = enlaceCalendario({
        titulo: leccion?.titulo, inicia_en: s.inicia_en, duracion_min: s.duracion_min,
        aula: `https://healthcareexp.com/classroom/${leccion?.course_id}?leccion=${s.leccion_id}`,
      });
      for (const r of registros || []) {
        const res = await notificar(db, 'sesion_recordatorio_dia', {
          userId: r.user_id,
          courseId: leccion?.course_id,
          clave: `sesion-dia:${s.leccion_id}:${s.inicia_en}`,
          variables: { sesion: leccion?.titulo || '', fecha: fechaMexico(s.inicia_en), calendario },
        });
        resumen.recordatoriosDia += res.enviadas || 0;
      }
    }
  }

  // Respuestas a preguntas del aula: avisa al autor de la pregunta (no a quien
  // se responde a sí mismo). Una vez por respuesta.
  if (await hayNotificacion(db, 'comentario_respondido')) {
    const { data: respuestas, error: errRespuestas } = await db
      .from('classroom_comments')
      .select('id, course_id, user_id, content, parent_id, created_at')
      .not('parent_id', 'is', null)
      .gte('created_at', new Date(ahora - 120 * MIN).toISOString())
      .order('created_at')
      .limit(100);
    if (!errRespuestas && respuestas?.length) {
      const padresIds = [...new Set(respuestas.map((r) => r.parent_id))];
      const { data: padres } = await db.from('classroom_comments').select('id, user_id').in('id', padresIds);
      const autorDe = new Map((padres || []).map((p) => [p.id, p.user_id]));
      const quienes = [...new Set(respuestas.map((r) => r.user_id))];
      const { data: perfiles } = await db.from('profiles').select('id, nombre_completo, rol').in('id', quienes);
      const perfilDe = new Map((perfiles || []).map((p) => [p.id, p]));
      for (const r of respuestas) {
        const destinatario = autorDe.get(r.parent_id);
        if (!destinatario || destinatario === r.user_id) continue;
        const autor = perfilDe.get(r.user_id);
        const res = await notificar(db, 'comentario_respondido', {
          userId: destinatario,
          courseId: r.course_id,
          clave: `respuesta:${r.id}`,
          variables: {
            autor: autor?.rol === 'admin' ? 'El equipo de HCE' : (String(autor?.nombre_completo || '').split(/\s+/)[0] || 'Un compañero'),
            respuesta: String(r.content || '').slice(0, 400),
          },
        });
        resumen.respuestas += res.enviadas || 0;
      }
    }
  }

  // Tareas revisadas.
  if (await hayNotificacion(db, 'tarea_revisada')) {
    const { data: entregas } = await db
      .from('tarea_entregas')
      .select('id, user_id, course_id, leccion_id, estado, comentario, revisada_en')
      .in('estado', ['aprobada', 'rechazada'])
      .gte('revisada_en', new Date(ahora - 120 * MIN).toISOString());
    for (const e of entregas || []) {
      const { data: leccion } = await db.from('curso_lecciones').select('titulo').eq('id', e.leccion_id).maybeSingle();
      const res = await notificar(db, 'tarea_revisada', {
        userId: e.user_id,
        courseId: e.course_id,
        // Con la fecha de revisión: si la tarea se vuelve a revisar (p. ej.
        // devuelta y luego aprobada), se avisa otra vez.
        clave: `tarea:${e.id}:${e.revisada_en}`,
        variables: {
          tarea: leccion?.titulo || '',
          estado: e.estado === 'aprobada' ? 'aprobada' : 'devuelta para corregir',
          comentario: e.comentario || '',
        },
      });
      resumen.tareas += res.enviadas || 0;
    }
  }

  // Cursos terminados (certificado emitido).
  if (await hayNotificacion(db, 'curso_completado')) {
    const { data: certificados } = await db
      .from('certificates')
      .select('id, user_id, course_id, folio, score, created_at')
      .gte('created_at', new Date(ahora - 120 * MIN).toISOString());
    for (const c of certificados || []) {
      const res = await notificar(db, 'curso_completado', {
        userId: c.user_id,
        courseId: c.course_id,
        clave: `certificado:${c.id}`,
        variables: { folio: c.folio || '', calificacion: c.score != null ? `${c.score}%` : '' },
      });
      resumen.cursos += res.enviadas || 0;
    }
  }

  // Inscripciones masivas de las últimas 2 horas. Las que vienen de activar
  // una cuenta se omiten: el correo de cuenta activada ya lista sus cursos.
  // La clave es la misma que usa inscribir(), así nada se avisa dos veces.
  if (await hayNotificacion(db, 'inscrito_curso')) {
    const { data: inscripciones } = await db
      .from('inscripciones')
      .select('user_id, course_id, created_at')
      .in('origen', ['admin', 'grupo', 'division'])
      .gte('created_at', new Date(ahora - 120 * MIN).toISOString())
      .order('created_at')
      .limit(60);
    const ids = [...new Set((inscripciones || []).map((i) => i.user_id))];
    const { data: perfiles } = ids.length
      ? await db.from('profiles').select('id, aprobado_en').in('id', ids)
      : { data: [] };
    const aprobadoEn = new Map((perfiles || []).map((p) => [p.id, p.aprobado_en ? new Date(p.aprobado_en).getTime() : null]));
    for (const ins of inscripciones || []) {
      const aprobada = aprobadoEn.get(ins.user_id);
      if (aprobada && Math.abs(new Date(ins.created_at).getTime() - aprobada) < 15 * MIN) continue;
      const acceso = await textoAcceso(ins.user_id, ins.course_id);
      const res = await notificar(db, 'inscrito_curso', {
        userId: ins.user_id,
        courseId: ins.course_id,
        clave: `inscripcion:${ins.course_id}`,
        variables: { acceso },
      });
      resumen.inscritos += res.enviadas || 0;
    }
  }

  // Cursos por generación que se abrieron en las últimas 2 horas. Una sola
  // vez por alumno y curso (la clave no lleva el grupo).
  if (await hayNotificacion(db, 'curso_abierto')) {
    const desde = new Date(ahora - 120 * MIN).toISOString();
    const { data: reglasGrupo, error: errReglas } = await db
      .from('curso_reglas').select('course_id').eq('modo_acceso', 'grupo');
    const cursosGrupo = new Set((errReglas ? [] : reglasGrupo || []).map((r) => Number(r.course_id)));
    if (cursosGrupo.size) {
      const { data: grupoCursos } = await db.from('grupo_cursos').select('grupo_id, course_id, abre_en');
      const abiertos = (grupoCursos || []).filter((gc) => cursosGrupo.has(Number(gc.course_id))
        && (!gc.abre_en || new Date(gc.abre_en).getTime() <= ahora));
      const candidatos = [];
      for (const gc of abiertos) {
        const abrioAhora = gc.abre_en && new Date(gc.abre_en).getTime() >= ahora - 120 * MIN;
        let consulta = db.from('grupo_miembros').select('user_id, agregado_en').eq('grupo_id', gc.grupo_id);
        // Si el grupo abrió antes, solo los que se agregaron hace poco.
        if (!abrioAhora) consulta = consulta.gte('agregado_en', desde);
        const { data: miembros } = await consulta;
        for (const m of miembros || []) candidatos.push({ userId: m.user_id, courseId: Number(gc.course_id) });
      }
      // Quien acaba de ser aprobado ya recibió "cuenta activada" con sus cursos.
      const ids = [...new Set(candidatos.map((c) => c.userId))];
      const { data: perfilesAbiertos } = ids.length
        ? await db.from('profiles').select('id, aprobado_en').in('id', ids)
        : { data: [] };
      const recienAprobado = new Set((perfilesAbiertos || [])
        .filter((p) => p.aprobado_en && ahora - new Date(p.aprobado_en).getTime() < 120 * MIN)
        .map((p) => p.id));
      for (const c of candidatos.filter((x) => !recienAprobado.has(x.userId)).slice(0, 80)) {
        // Solo a quien está inscrito (pagó o se le asignó el curso).
        const { data: inscripcion } = await db.from('inscripciones').select('id')
          .eq('user_id', c.userId).eq('course_id', c.courseId).maybeSingle();
        if (!inscripcion) continue;
        const res = await notificar(db, 'curso_abierto', {
          userId: c.userId,
          courseId: c.courseId,
          clave: `curso-abierto:${c.courseId}`,
        });
        resumen.abiertos += res.enviadas || 0;
      }
    }
  }

  console.log('Notificaciones programadas:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Cada hora, al minuto 5.
export const config = { schedule: '5 * * * *' };
