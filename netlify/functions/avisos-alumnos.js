// Avisos del aula que dependen del avance del alumno (se revisa cada hora y
// cada aviso sale una sola vez gracias a notificaciones_enviadas):
//
//   avance_semanal  los lunes (8:00 a 20:00, hora del centro de México): cómo
//                   va en cada curso sin terminar y botón "Continuar"
//   curso_casi      va en 80% o más, sin certificado y lleva de 5 a 60 días sin entrar
//   encuesta_curso  un día después de emitir su certificado: encuesta
//
// Se manda por tandas (TANDA por tipo y por ejecución) para no pasar el
// límite de tiempo de Netlify; lo que falte sale en la siguiente hora.
// Los textos se editan en Admin -> Notificaciones (supabase/correos-mejoras.sql).

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { notificar } from './_notificaciones.js';

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const TANDA = 40;
const PORTAL = 'https://healthcareexp.com';

async function hayNotificacion(db, evento) {
  const { data, error } = await db.from('notificaciones').select('id').eq('evento', evento).eq('activo', true).limit(1);
  return !error && data?.length > 0;
}

// Fecha (AAAA-MM-DD), día de la semana (0 = domingo) y hora en la Ciudad de México.
function ahoraMexico(ms) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, dia: dias[partes.weekday], hora: Number(partes.hour) };
}

// Trae todas las filas de una consulta en páginas de 1000.
async function traerTodo(construir) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await construir().range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

// Avisos ya mandados con este prefijo. La clave guardada es
// "<clave>:<alumno>:<destinatario>"; se devuelve [resto de la clave, alumno].
async function yaAvisados(db, prefijo) {
  const filas = await traerTodo(() => db.from('notificaciones_enviadas').select('clave').like('clave', `${prefijo}%`));
  return filas.map((f) => {
    const partes = String(f.clave).slice(prefijo.length).split(':');
    return { resto: partes.slice(0, -2).join(':'), alumno: partes[partes.length - 2] };
  });
}

/**
 * Avance de cada alumno en cada curso al que está inscrito, con el mismo
 * criterio del portal: promedio de las lecciones obligatorias (un video cuenta
 * lo visto; lo demás, completo o nada). Sin lecciones, el avance del video.
 */
async function avances(db) {
  const [inscripciones, lecciones, progreso, videos, certificados, cursos] = await Promise.all([
    traerTodo(() => db.from('inscripciones').select('user_id, course_id, created_at')),
    traerTodo(() => db.from('curso_lecciones').select('id, course_id, tipo, obligatoria')),
    traerTodo(() => db.from('leccion_progreso').select('user_id, course_id, leccion_id, porcentaje, completada, actualizado_en')),
    traerTodo(() => db.from('student_progress').select('user_id, course_id, watch_percent, updated_at')),
    traerTodo(() => db.from('certificates').select('user_id, course_id')),
    traerTodo(() => db.from('courses').select('id, title, activo')),
  ]);
  const cursoDe = new Map(cursos.map((c) => [Number(c.id), c]));
  const leccionesDe = new Map();
  for (const l of lecciones) {
    if (l.tipo === 'seccion') continue;
    const id = Number(l.course_id);
    if (!leccionesDe.has(id)) leccionesDe.set(id, []);
    leccionesDe.get(id).push(l);
  }
  const progresoDe = new Map(progreso.map((p) => [`${p.user_id}:${p.leccion_id}`, p]));
  const ultimaActividad = new Map();
  const marcar = (clave, fecha) => {
    const t = fecha ? new Date(fecha).getTime() : 0;
    if (t > (ultimaActividad.get(clave) || 0)) ultimaActividad.set(clave, t);
  };
  for (const p of progreso) marcar(`${p.user_id}:${Number(p.course_id)}`, p.actualizado_en);
  for (const v of videos) marcar(`${v.user_id}:${Number(v.course_id)}`, v.updated_at);
  const videoDe = new Map(videos.map((v) => [`${v.user_id}:${Number(v.course_id)}`, Number(v.watch_percent) || 0]));
  const certificado = new Set(certificados.map((c) => `${c.user_id}:${Number(c.course_id)}`));

  return inscripciones.map((ins) => {
    const courseId = Number(ins.course_id);
    const par = `${ins.user_id}:${courseId}`;
    const curso = cursoDe.get(courseId);
    const todas = leccionesDe.get(courseId) || [];
    const obligatorias = todas.filter((l) => l.obligatoria !== false);
    const base = obligatorias.length ? obligatorias : todas;
    let porcentaje;
    let faltan = 0;
    if (base.length) {
      const suma = base.reduce((total, l) => {
        const p = progresoDe.get(`${ins.user_id}:${l.id}`);
        if (p?.completada) return total + 100;
        faltan += 1;
        return total + (l.tipo === 'video' ? Math.min(100, p?.porcentaje || 0) : 0);
      }, 0);
      porcentaje = Math.round(suma / base.length);
    } else {
      porcentaje = Math.min(100, videoDe.get(par) || 0);
    }
    return {
      userId: ins.user_id,
      courseId,
      titulo: curso?.title || 'tu curso',
      activo: curso?.activo !== false,
      inscritoEn: new Date(ins.created_at).getTime(),
      porcentaje,
      faltan,
      ultima: ultimaActividad.get(par) || 0,
      terminado: certificado.has(par) || porcentaje >= 100,
    };
  });
}

export default async () => {
  if (!supabaseListo()) return new Response('Sin configurar', { status: 200 });
  const db = admin();
  const ahora = Date.now();
  const mx = ahoraMexico(ahora);
  const resumen = { semanal: 0, casi: 0, encuestas: 0 };

  const [quiereSemanal, quiereCasi, quiereEncuesta] = await Promise.all([
    hayNotificacion(db, 'avance_semanal'),
    hayNotificacion(db, 'curso_casi'),
    hayNotificacion(db, 'encuesta_curso'),
  ]);

  try {
    // Encuesta: certificados de hace 1 a 3 días.
    if (quiereEncuesta) {
      const { data: certs } = await db.from('certificates').select('id, user_id, course_id, created_at')
        .lte('created_at', new Date(ahora - DIA).toISOString())
        .gte('created_at', new Date(ahora - 3 * DIA).toISOString())
        .order('created_at').limit(TANDA * 3);
      const listos = new Set((await yaAvisados(db, 'encuesta:')).map((x) => x.resto));
      for (const c of (certs || []).filter((x) => !listos.has(String(x.id))).slice(0, TANDA)) {
        const { data: curso } = await db.from('courses').select('title').eq('id', c.course_id).maybeSingle();
        const res = await notificar(db, 'encuesta_curso', {
          userId: c.user_id,
          courseId: c.course_id,
          clave: `encuesta:${c.id}`,
          variables: { encuesta: `${PORTAL}/retroalimentacion?taller=${encodeURIComponent(curso?.title || '')}` },
        });
        resumen.encuestas += res.enviadas || 0;
      }
    }

    if (quiereCasi || (quiereSemanal && mx.dia === 1 && mx.hora >= 8 && mx.hora < 20)) {
      const lista = (await avances(db)).filter((a) => a.activo && !a.terminado);

      // Te falta poco: 80% o más y 5 días sin actividad. Una vez por curso.
      if (quiereCasi) {
        const listos = new Set((await yaAvisados(db, 'casi:')).map((x) => `${x.alumno}:${x.resto}`));
        const candidatos = lista.filter((a) => a.porcentaje >= 80 && a.ultima && ahora - a.ultima >= 5 * DIA && ahora - a.ultima <= 60 * DIA
          && !listos.has(`${a.userId}:${a.courseId}`));
        let enviados = 0;
        for (const a of candidatos) {
          if (enviados >= TANDA) break;
          const res = await notificar(db, 'curso_casi', {
            userId: a.userId,
            courseId: a.courseId,
            clave: `casi:${a.courseId}`,
            variables: { porcentaje: `${a.porcentaje}%`, faltan: String(a.faltan) },
          });
          enviados += res.enviadas || 0;
        }
        resumen.casi = enviados;
      }

      // Avance semanal: los lunes, a quien tiene cursos sin terminar en los
      // que entró (o se inscribió) en los últimos 60 días.
      if (quiereSemanal && mx.dia === 1 && mx.hora >= 8 && mx.hora < 20) {
        const prefijo = `avance:${mx.fecha}`;
        const listos = new Set((await yaAvisados(db, `${prefijo}:`)).map((x) => x.alumno));
        const porAlumno = new Map();
        for (const a of lista) {
          if (Math.max(a.ultima, a.inscritoEn) < ahora - 60 * DIA) continue;
          if (!porAlumno.has(a.userId)) porAlumno.set(a.userId, []);
          porAlumno.get(a.userId).push(a);
        }
        let enviados = 0;
        for (const [userId, cursos] of porAlumno) {
          if (enviados >= TANDA) break;
          if (listos.has(userId)) continue;
          const lineas = cursos
            .sort((x, y) => y.porcentaje - x.porcentaje)
            .map((c) => `• ${c.titulo}: ${c.porcentaje}%${c.faltan ? ` (te faltan ${c.faltan} ${c.faltan === 1 ? 'lección' : 'lecciones'})` : ''}`);
          const res = await notificar(db, 'avance_semanal', {
            userId,
            clave: prefijo,
            variables: { resumen: lineas.join('\n'), enlace: `${PORTAL}/dashboard?tab=courses` },
          });
          enviados += res.enviadas || 0;
        }
        resumen.semanal = enviados;
      }
    }
  } catch (err) {
    console.error('Avisos de alumnos:', err.message);
  }

  console.log('Avisos de alumnos:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Cada hora, al minuto 35.
export const config = { schedule: '35 * * * *' };
