// Recordatorios automáticos por correo, una vez al día.
//
// Netlify la ejecuta sola todas las mañanas (ver `config` al final). Busca a
// dos tipos de alumno y los mete a una lista de Brevo, que es la que manda el
// correo con el diseño de HCE:
//
//   Inactivos: inscritos en un curso que no han terminado y llevan una semana
//   sin entrar (o nunca entraron). Máximo tres recordatorios por curso, uno por
//   semana: después de eso se entiende que no le interesa.
//
//   Por recertificar: su certificado vence en los próximos 30 días. Un solo
//   aviso por certificado.
//
// Cada envío queda anotado en la tabla `recordatorios` para no repetirlo.
//
// Variables de entorno en Netlify (sin ellas la función no manda nada):
//   BREVO_LISTA_RECORDATORIO     ID de la lista "Recordatorio de curso"
//   BREVO_LISTA_RECERTIFICACION  ID de la lista "Recertificación"
//
// Atributos de contacto que llena para la plantilla del correo:
//   CURSO_NOMBRE, CURSO_LINK, CURSO_AVANCE, CERT_VENCE

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { isConfigured as brevoListo, upsertContact, addToList, removeFromList } from './_brevo.js';

const DIA = 24 * 60 * 60 * 1000;
const DIAS_INACTIVO = 7;
const MAX_RECORDATORIOS_POR_CURSO = 3;
const DIAS_ANTES_DE_VENCER = 30;
const SITIO = 'https://healthcareexp.com';

async function traerTodo(db, tabla, columnas, filtrar = (q) => q) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await filtrar(db.from(tabla).select(columnas)).range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}

// Brevo no vuelve a disparar la automatización si el contacto ya estaba en la
// lista: se le saca y se le vuelve a meter.
async function avisarPorBrevo(email, lista, atributos) {
  await upsertContact(email, atributos);
  await removeFromList(email, lista);
  await addToList(email, lista);
}

export default async () => {
  const listaInactivos = Number(process.env.BREVO_LISTA_RECORDATORIO) || null;
  const listaRecert = Number(process.env.BREVO_LISTA_RECERTIFICACION) || null;

  if (!supabaseListo() || !brevoListo() || (!listaInactivos && !listaRecert)) {
    console.log('Recordatorios: falta configuración (Supabase, Brevo o las listas). No se envía nada.');
    return new Response('Sin configurar', { status: 200 });
  }

  const db = admin();
  const ahora = Date.now();
  const resumen = { inactividad: 0, recertificacion: 0, errores: 0 };

  const [perfiles, cursos, enviados] = await Promise.all([
    traerTodo(db, 'profiles', 'id, email, nombre_completo, rol'),
    traerTodo(db, 'courses', 'id, title, activo'),
    traerTodo(db, 'recordatorios', 'user_id, course_id, certificado_id, tipo, enviado_en'),
  ]);

  const perfilDe = new Map(perfiles.map((p) => [p.id, p]));
  const cursoDe = new Map(cursos.map((c) => [Number(c.id), c]));
  const nombreDe = (p) => String(p?.nombre_completo || '').split(' ')[0] || '';

  // ---- Inactivos ------------------------------------------------------------
  if (listaInactivos) {
    const [inscripciones, sesiones, certificados, progreso] = await Promise.all([
      traerTodo(db, 'inscripciones', 'user_id, course_id, created_at'),
      traerTodo(db, 'curso_sesiones', 'user_id, course_id, ultima_senal_en', (q) =>
        q.gte('ultima_senal_en', new Date(ahora - 90 * DIA).toISOString())),
      traerTodo(db, 'certificates', 'user_id, course_id'),
      traerTodo(db, 'student_progress', 'user_id, course_id, watch_percent'),
    ]);

    const clave = (u, c) => `${u}:${c}`;
    const ultimaActividad = new Map();
    for (const s of sesiones) {
      const k = clave(s.user_id, s.course_id);
      const t = new Date(s.ultima_senal_en).getTime();
      if (!ultimaActividad.has(k) || t > ultimaActividad.get(k)) ultimaActividad.set(k, t);
    }
    const terminados = new Set(certificados.map((c) => clave(c.user_id, c.course_id)));
    const avance = new Map(progreso.map((p) => [clave(p.user_id, p.course_id), p.watch_percent || 0]));

    // Un solo correo por alumno al día aunque esté inactivo en varios cursos.
    const yaAvisadoHoy = new Set();

    for (const ins of inscripciones) {
      const k = clave(ins.user_id, ins.course_id);
      const curso = cursoDe.get(Number(ins.course_id));
      const perfil = perfilDe.get(ins.user_id);
      if (!curso || curso.activo === false || !perfil?.email || perfil.rol === 'admin') continue;
      if (terminados.has(k) || yaAvisadoHoy.has(ins.user_id)) continue;

      const referencia = ultimaActividad.get(k) || new Date(ins.created_at).getTime();
      if (ahora - referencia < DIAS_INACTIVO * DIA) continue;

      const previos = enviados.filter((e) =>
        e.tipo === 'inactividad' && e.user_id === ins.user_id && Number(e.course_id) === Number(ins.course_id));
      if (previos.length >= MAX_RECORDATORIOS_POR_CURSO) continue;
      if (previos.some((e) => ahora - new Date(e.enviado_en).getTime() < DIAS_INACTIVO * DIA)) continue;

      try {
        await avisarPorBrevo(perfil.email, listaInactivos, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
          CURSO_AVANCE: `${Math.min(100, Math.round(avance.get(k) || 0))}%`,
        });
        await db.from('recordatorios').insert([{ user_id: ins.user_id, course_id: curso.id, tipo: 'inactividad' }]);
        yaAvisadoHoy.add(ins.user_id);
        resumen.inactividad += 1;
      } catch (err) {
        resumen.errores += 1;
        console.error('Recordatorio de inactividad falló:', perfil.email, err.message);
      }
    }
  }

  // ---- Por recertificar -----------------------------------------------------
  if (listaRecert) {
    const limite = new Date(ahora + DIAS_ANTES_DE_VENCER * DIA).toISOString();
    const porVencer = await traerTodo(db, 'certificates', 'id, user_id, course_id, vigente_hasta', (q) =>
      q.not('vigente_hasta', 'is', null).lte('vigente_hasta', limite));

    for (const cert of porVencer) {
      const perfil = perfilDe.get(cert.user_id);
      const curso = cursoDe.get(Number(cert.course_id));
      if (!perfil?.email || !curso) continue;
      if (enviados.some((e) => e.tipo === 'recertificacion' && Number(e.certificado_id) === Number(cert.id))) continue;

      try {
        await avisarPorBrevo(perfil.email, listaRecert, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
          CERT_VENCE: new Date(cert.vigente_hasta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
        });
        await db.from('recordatorios').insert([{
          user_id: cert.user_id, course_id: curso.id, certificado_id: cert.id, tipo: 'recertificacion',
        }]);
        resumen.recertificacion += 1;
      } catch (err) {
        resumen.errores += 1;
        console.error('Aviso de recertificación falló:', perfil.email, err.message);
      }
    }
  }

  console.log('Recordatorios enviados:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Todos los días a las 15:00 UTC = 9:00 de la mañana en el centro de México.
export const config = { schedule: '0 15 * * *' };
