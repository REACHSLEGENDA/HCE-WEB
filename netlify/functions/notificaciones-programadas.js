// Tarea programada de las notificaciones que no nacen de una acción en el
// servidor: se revisa cada hora qué pasó y se avisa (una sola vez por hecho,
// gracias a notificaciones_enviadas).
//
//   sesion_recordatorio  sesiones en vivo que empiezan en 30 a 90 minutos
//   tarea_revisada       tareas aprobadas o devueltas en las últimas 2 horas
//   curso_completado     certificados emitidos en las últimas 2 horas

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { notificar } from './_notificaciones.js';
import { fechaMexico } from './_sesiones.js';

const MIN = 60 * 1000;

async function hayNotificacion(db, evento) {
  const { data, error } = await db.from('notificaciones').select('id').eq('evento', evento).eq('activo', true).limit(1);
  return !error && data?.length > 0;
}

export default async () => {
  if (!supabaseListo()) return new Response('Sin configurar', { status: 200 });
  const db = admin();
  const ahora = Date.now();
  const resumen = { recordatorios: 0, tareas: 0, cursos: 0 };

  // Recordatorio 1 hora antes de cada sesión en vivo.
  if (await hayNotificacion(db, 'sesion_recordatorio')) {
    const { data: sesiones } = await db
      .from('sesiones_clase')
      .select('leccion_id, inicia_en')
      .gte('inicia_en', new Date(ahora + 30 * MIN).toISOString())
      .lte('inicia_en', new Date(ahora + 90 * MIN).toISOString());
    for (const s of sesiones || []) {
      const { data: leccion } = await db.from('curso_lecciones').select('titulo, course_id').eq('id', s.leccion_id).maybeSingle();
      const { data: registros } = await db.from('sesion_registros').select('user_id').eq('leccion_id', s.leccion_id);
      for (const r of registros || []) {
        const res = await notificar(db, 'sesion_recordatorio', {
          userId: r.user_id,
          courseId: leccion?.course_id,
          clave: `sesion-recordatorio:${s.leccion_id}`,
          variables: { sesion: leccion?.titulo || '', fecha: fechaMexico(s.inicia_en) },
        });
        resumen.recordatorios += res.enviadas || 0;
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
        clave: `tarea:${e.id}`,
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

  console.log('Notificaciones programadas:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Cada hora, al minuto 5.
export const config = { schedule: '5 * * * *' };
