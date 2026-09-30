// Recordatorios automáticos por correo, una vez al día.
//
// Netlify la ejecuta sola todas las mañanas (ver `config` al final). Busca a
// dos tipos de alumno y los mete a la lista "portal general" de Brevo, cuyo
// flujo manda la plantilla universal (hce-portal-general) con el diseño de HCE:
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
// Atributos de contacto que llena para la plantilla (el texto va armado, así
// la misma plantilla sirve para los dos avisos):
//   AVISO_TITULO, AVISO_TEXTO, AVISO_ETIQUETA, AVISO_DATO, AVISO_BOTON,
//   CURSO_NOMBRE, CURSO_LINK

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { LISTS, isConfigured as brevoListo, upsertContact, addToList, removeFromList } from './_brevo.js';

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
  const lista = LISTS.PORTAL_GENERAL;

  if (!supabaseListo() || !brevoListo()) {
    console.log('Recordatorios: falta configuración (Supabase o Brevo). No se envía nada.');
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

  // Un solo aviso por alumno al día: los dos usan la misma lista y los mismos
  // atributos, y un segundo aviso pisaría el texto del primero.
  const yaAvisadoHoy = new Set();

  // ---- Por recertificar -----------------------------------------------------
  // Va primero: es el aviso con fecha límite.
  {
    const limite = new Date(ahora + DIAS_ANTES_DE_VENCER * DIA).toISOString();
    const porVencer = await traerTodo(db, 'certificates', 'id, user_id, course_id, vigente_hasta', (q) =>
      q.not('vigente_hasta', 'is', null).lte('vigente_hasta', limite));

    for (const cert of porVencer) {
      const perfil = perfilDe.get(cert.user_id);
      const curso = cursoDe.get(Number(cert.course_id));
      if (!perfil?.email || !curso) continue;
      if (yaAvisadoHoy.has(cert.user_id)) continue;
      if (enviados.some((e) => e.tipo === 'recertificacion' && Number(e.certificado_id) === Number(cert.id))) continue;

      try {
        await avisarPorBrevo(perfil.email, lista, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          AVISO_TITULO: 'Tu certificación está por vencer',
          AVISO_TEXTO: 'Te avisamos con tiempo para que tu certificación siga vigente. Entra a tu curso para revisar cómo renovarla.',
          AVISO_ETIQUETA: 'Vence el',
          AVISO_DATO: new Date(cert.vigente_hasta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }),
          AVISO_BOTON: 'Ir a mi curso',
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
        });
        await db.from('recordatorios').insert([{
          user_id: cert.user_id, course_id: curso.id, certificado_id: cert.id, tipo: 'recertificacion',
        }]);
        yaAvisadoHoy.add(cert.user_id);
        resumen.recertificacion += 1;
      } catch (err) {
        resumen.errores += 1;
        console.error('Aviso de recertificación falló:', perfil.email, err.message);
      }
    }
  }

  // ---- Inactivos ------------------------------------------------------------
  {
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
        await avisarPorBrevo(perfil.email, lista, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          AVISO_TITULO: 'Tu curso te está esperando',
          AVISO_TEXTO: 'Hace unos días que no entras a tu curso. Tu avance está guardado y puedes seguir justo donde te quedaste.',
          AVISO_ETIQUETA: 'Llevas',
          AVISO_DATO: `${Math.min(100, Math.round(avance.get(k) || 0))}%`,
          AVISO_BOTON: 'Seguir con mi curso',
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
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

  console.log('Recordatorios enviados:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Todos los días a las 15:00 UTC = 9:00 de la mañana en el centro de México.
export const config = { schedule: '0 15 * * *' };
