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
const MAX_AVISOS_POR_CORRIDA = 40;

async function traerTodo(db, tabla, columnas, filtrar = (q) => q) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    let consulta = db.from(tabla).select(columnas);
    const llaves = { student_progress: ['user_id', 'course_id'], leccion_progreso: ['user_id', 'leccion_id'], curso_reglas: ['course_id'] };
    for (const col of llaves[tabla] || ['id']) consulta = consulta.order(col);
    const { data, error } = await filtrar(consulta).range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}

// Brevo no vuelve a disparar la automatización si el contacto ya estaba en la
// lista: se le saca y se le vuelve a meter.
async function avisarPorBrevo(email, lista, atributos, signal) {
  await upsertContact(email, atributos, { signal });
  await removeFromList(email, lista, { signal });
  await addToList(email, lista, { signal });
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
  // El plazo se comparte con las peticiones HTTP: una respuesta lenta no
  // alarga la función programada más allá de su ventana de ejecución.
  const signal = AbortSignal.timeout(22000);
  let intentados = 0;
  const agotado = () => signal.aborted || intentados >= MAX_AVISOS_POR_CORRIDA;

  const [perfiles, cursos, enviados, reglas, inscripciones] = await Promise.all([
    traerTodo(db, 'profiles', 'id, email, nombre_completo, rol, activo, aprobado', (q) => q.eq('activo', true).eq('aprobado', true).neq('rol', 'admin')),
    traerTodo(db, 'courses', 'id, title, activo'),
    traerTodo(db, 'recordatorios', 'user_id, course_id, certificado_id, tipo, enviado_en'),
    traerTodo(db, 'curso_reglas', 'course_id, dias_acceso, conservar_acceso'),
    traerTodo(db, 'inscripciones', 'user_id, course_id, created_at'),
  ]);

  const perfilDe = new Map(perfiles.map((p) => [p.id, p]));
  const cursoDe = new Map(cursos.map((c) => [Number(c.id), c]));
  const reglaDe = new Map(reglas.map((r) => [Number(r.course_id), r]));
  const inscripcionDe = new Map(inscripciones.map((i) => [`${i.user_id}:${i.course_id}`, i]));
  const nombreDe = (p) => String(p?.nombre_completo || '').split(' ')[0] || '';

  // Un solo aviso por alumno al día: los dos usan la misma lista y los mismos
  // atributos, y un segundo aviso pisaría el texto del primero.
  const yaAvisadoHoy = new Set();

  // ---- Por recertificar -----------------------------------------------------
  // Va primero: es el aviso con fecha límite.
  {
    const limite = new Date(ahora + DIAS_ANTES_DE_VENCER * DIA).toISOString();
    const porVencer = await traerTodo(db, 'certificates', 'id, user_id, course_id, vigente_hasta', (q) =>
      q.not('vigente_hasta', 'is', null).gte('vigente_hasta', new Date(ahora).toISOString()).lte('vigente_hasta', limite));

    for (const cert of porVencer) {
      if (agotado()) break;
      const perfil = perfilDe.get(cert.user_id);
      const curso = cursoDe.get(Number(cert.course_id));
      if (!perfil?.email || !curso || curso.activo === false) continue;
      const inscripcion = inscripcionDe.get(`${cert.user_id}:${cert.course_id}`);
      const regla = reglaDe.get(Number(cert.course_id));
      if (!inscripcion) continue;
      if (regla?.dias_acceso != null && !regla.conservar_acceso &&
        new Date(inscripcion.created_at).getTime() + Number(regla.dias_acceso) * DIA <= ahora) continue;
      if (yaAvisadoHoy.has(cert.user_id)) continue;
      if (enviados.some((e) => e.tipo === 'recertificacion' && String(e.certificado_id) === String(cert.id))) continue;

      try {
        intentados += 1;
        await avisarPorBrevo(perfil.email, lista, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          AVISO_TITULO: 'Tu certificación está por vencer',
          AVISO_TEXTO: 'Te avisamos con tiempo para que tu certificación siga vigente. Entra a tu curso para revisar cómo renovarla.',
          AVISO_ETIQUETA: 'Vence el',
          AVISO_DATO: new Date(cert.vigente_hasta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }),
          AVISO_BOTON: 'Ir a mi curso',
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
        }, signal);
        const { error: errGuardar } = await db.from('recordatorios').insert([{
          user_id: cert.user_id, course_id: curso.id, certificado_id: cert.id, tipo: 'recertificacion',
        }]);
        if (errGuardar) throw new Error(errGuardar.message);
        yaAvisadoHoy.add(cert.user_id);
        resumen.recertificacion += 1;
      } catch (err) {
        resumen.errores += 1;
        console.error('Aviso de recertificación falló:', perfil.email, err.message);
      }
    }
  }

  // ---- Inactivos ------------------------------------------------------------
  if (!agotado()) {
    const [sesiones, certificados, progreso, lecciones, progresoLecciones] = await Promise.all([
      traerTodo(db, 'curso_sesiones', 'user_id, course_id, ultima_senal_en', (q) =>
        q.gte('ultima_senal_en', new Date(ahora - 90 * DIA).toISOString())),
      traerTodo(db, 'certificates', 'user_id, course_id'),
      traerTodo(db, 'student_progress', 'user_id, course_id, watch_percent'),
      traerTodo(db, 'curso_lecciones', 'id, course_id, tipo, obligatoria'),
      traerTodo(db, 'leccion_progreso', 'user_id, leccion_id, course_id, completada'),
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
    const cursosConLecciones = new Set(lecciones.filter((l) => l.tipo !== 'seccion').map((l) => Number(l.course_id)));
    const obligatorias = new Map();
    for (const l of lecciones.filter((l) => l.tipo !== 'seccion' && l.obligatoria !== false)) {
      const lista = obligatorias.get(Number(l.course_id)) || [];
      lista.push(Number(l.id)); obligatorias.set(Number(l.course_id), lista);
    }
    const completas = new Set(progresoLecciones.filter((p) => p.completada).map((p) => `${p.user_id}:${Number(p.leccion_id)}`));

    for (const ins of inscripciones) {
      if (agotado()) break;
      const k = clave(ins.user_id, ins.course_id);
      const curso = cursoDe.get(Number(ins.course_id));
      const perfil = perfilDe.get(ins.user_id);
      if (!curso || curso.activo === false || !perfil?.email || perfil.rol === 'admin') continue;
      if (terminados.has(k) || yaAvisadoHoy.has(ins.user_id)) continue;
      const regla = reglaDe.get(Number(ins.course_id));
      if (regla?.dias_acceso != null && new Date(ins.created_at).getTime() + Number(regla.dias_acceso) * DIA <= ahora) continue;

      const referencia = ultimaActividad.get(k) || new Date(ins.created_at).getTime();
      if (ahora - referencia < DIAS_INACTIVO * DIA) continue;

      const previos = enviados.filter((e) =>
        e.tipo === 'inactividad' && e.user_id === ins.user_id && Number(e.course_id) === Number(ins.course_id));
      if (previos.length >= MAX_RECORDATORIOS_POR_CURSO) continue;
      if (previos.some((e) => ahora - new Date(e.enviado_en).getTime() < DIAS_INACTIVO * DIA)) continue;

      try {
        intentados += 1;
        const necesarias = obligatorias.get(Number(ins.course_id)) || [];
        const porcentaje = cursosConLecciones.has(Number(ins.course_id))
          ? (necesarias.length ? necesarias.filter((id) => completas.has(`${ins.user_id}:${id}`)).length / necesarias.length * 100 : 100)
          : (avance.get(k) || 0);
        await avisarPorBrevo(perfil.email, lista, {
          FIRSTNAME: nombreDe(perfil) || undefined,
          AVISO_TITULO: 'Tu curso te está esperando',
          AVISO_TEXTO: 'Hace unos días que no entras a tu curso. Tu avance está guardado y puedes seguir justo donde te quedaste.',
          AVISO_ETIQUETA: 'Llevas',
          AVISO_DATO: `${Math.min(100, Math.round(porcentaje))}%`,
          AVISO_BOTON: 'Seguir con mi curso',
          CURSO_NOMBRE: curso.title,
          CURSO_LINK: `${SITIO}/classroom/${curso.id}`,
        }, signal);
        const { error: errGuardar } = await db.from('recordatorios').insert([{ user_id: ins.user_id, course_id: curso.id, tipo: 'inactividad' }]);
        if (errGuardar) throw new Error(errGuardar.message);
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
