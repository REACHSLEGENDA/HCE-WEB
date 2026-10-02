// Emisión de certificados, del lado del servidor.
//
// Antes el navegador del alumno escribía su propio certificado en la tabla
// `certificates` (folio, calificación, vigencia): bastaba con editar una
// petición para tener el certificado de un curso sin terminarlo. Ahora solo
// esta función lo crea, después de revisar que el alumno cumplió el curso.
//
// La imagen la sigue dibujando el navegador (canvas con el nombre del alumno)
// y la sube a su carpeta del bucket 'certificates'; luego llama a `imagen`
// para ligarla al certificado.
//
// Acciones:
//   emitir  { courseId }                     el alumno pide su certificado
//   emitir  { courseId, userId, score? }     un administrador lo emite a mano
//   imagen  { certificadoId, ruta }          liga la imagen subida al certificado

import { admin, usuarioDesdeToken, adminDesdeToken, cuentaHabilitada, accesoVigente, esEsquemaFaltante, registrarAccionAdmin, json, isConfigured as supabaseListo } from './_supabase.js';
import { traerTodo } from './_consultas.js';

const BUCKET = 'certificates';
// Igual que UMBRAL_VIDEO de src/lib/lecciones.js.
const UMBRAL_VIDEO = 90;
const COLUMNAS = 'id, folio, score, vigente_hasta, pdf_url, course_id, user_id';
const COLUMNAS_SIN_VIGENCIA = 'id, folio, score, pdf_url, course_id, user_id';

// Antes de lms-estructura.sql no existe `vigente_hasta`: se trabaja sin ella.
const faltaVigencia = (error) => error && (error.code === '42703' || /vigente_hasta/.test(error.message || ''));

async function certificadoExistente(db, userId, courseId) {
  let res = await db.from('certificates').select(COLUMNAS)
    .eq('user_id', userId).eq('course_id', courseId)
    .order('created_at', { ascending: false }).limit(1);
  if (faltaVigencia(res.error)) {
    res = await db.from('certificates').select(COLUMNAS_SIN_VIGENCIA)
      .eq('user_id', userId).eq('course_id', courseId)
      .order('created_at', { ascending: false }).limit(1);
  }
  if (res.error) throw new Error(res.error.message);
  const fila = res.data?.[0];
  return fila ? { vigente_hasta: null, ...fila } : null;
}

async function cargarCurso(db, courseId) {
  let res = await db.from('courses').select('id, title, vigencia_meses').eq('id', courseId).maybeSingle();
  if (res.error && res.error.code === '42703') {
    res = await db.from('courses').select('id, title').eq('id', courseId).maybeSingle();
  }
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const folioAlAzar = () => `FOL-${Math.floor(100000 + Math.random() * 900000)}`;

// Folio que todavía nadie tiene.
async function folioLibre(db) {
  for (let i = 0; i < 10; i++) {
    const folio = folioAlAzar();
    const { data, error } = await db.from('certificates').select('id').eq('folio', folio).limit(1);
    if (error) throw new Error(error.message);
    if (!data?.length) return folio;
  }
  throw new Error('No se pudo generar un folio. Intenta de nuevo.');
}

// Mismo cálculo que hacía el aula: hoy más los meses de vigencia del curso.
function vigenciaDesdeHoy(meses) {
  if (!meses) return null;
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + Number(meses));
  return fecha.toISOString();
}

/**
 * Crea el certificado (folio único, vigencia del curso, imagen pendiente) y
 * deja el evento para las métricas. Si otro proceso alcanza a tomar el mismo
 * folio entre la revisión y la inserción, se intenta con otro.
 */
async function crearCertificado(db, { userId, curso, score, registrarEvento, emitidoPor }) {
  const vigenteHasta = vigenciaDesdeHoy(curso.vigencia_meses);
  let ultimoError = null;

  for (let intento = 0; intento < 3; intento++) {
    const folio = await folioLibre(db);
    // `pdf_url` es obligatoria en la tabla: queda vacía hasta que el
    // navegador sube la imagen y llama a `imagen`.
    const registro = { user_id: userId, course_id: curso.id, pdf_url: '', folio, score };

    let res = await db.from('certificates')
      .insert([vigenteHasta ? { ...registro, vigente_hasta: vigenteHasta } : registro])
      .select(COLUMNAS).single();
    if (faltaVigencia(res.error)) {
      res = await db.from('certificates').insert([registro]).select(COLUMNAS_SIN_VIGENCIA).single();
    }
    if (res.error) {
      ultimoError = res.error;
      if (res.error.code === '23505') {
        const existente = await certificadoExistente(db, userId, curso.id);
        if (existente) return existente;
        continue; // folio repetido
      }
      throw new Error(res.error.message);
    }

    const certificado = { vigente_hasta: null, ...res.data };
    if (registrarEvento) {
      const { error: errEvento } = await db.from('curso_eventos').insert([{
        user_id: userId,
        course_id: curso.id,
        tipo: 'certificado_emitido',
        datos: { folio: certificado.folio, calificacion: score, origen: 'servidor', ...(emitidoPor ? { emitido_por: emitidoPor } : {}) },
      }]);
      if (errEvento) console.error('No se pudo registrar el certificado en las métricas:', errEvento.message);
    }
    return certificado;
  }
  throw new Error(ultimoError?.message || 'No se pudo emitir el certificado.');
}

/**
 * Revisa que el alumno haya cumplido el curso según su regla de finalización
 * (lms-reglas.sql). Devuelve `{ score }` si cumplió, o `{ respuesta }` con el
 * error que hay que dar.
 */
async function revisarRequisitos(db, userId, courseId) {
  const { data: reglas, error: errReglas } = await db
    .from('curso_reglas')
    .select('regla_finalizacion, porcentaje_finalizacion')
    .eq('course_id', courseId)
    .maybeSingle();
  if (errReglas && !esEsquemaFaltante(errReglas)) throw new Error(errReglas.message);
  // Sin la migración o sin fila, la regla de siempre: examen final.
  const regla = (!errReglas && reglas?.regla_finalizacion) || 'examen_final';

  // Lecciones (sin contar las secciones, que solo agrupan).
  const { data: lecciones, error: errLecciones } = await db
    .from('curso_lecciones')
    .select('id, tipo, obligatoria')
    .eq('course_id', courseId);
  if (errLecciones && !esEsquemaFaltante(errLecciones)) throw new Error(errLecciones.message);
  const conContenido = errLecciones ? [] : (lecciones || []).filter((l) => l.tipo !== 'seccion');

  if (conContenido.length) {
    const { data: completas, error: errProgreso } = await db
      .from('leccion_progreso')
      .select('leccion_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('completada', true);
    if (errProgreso) throw new Error(errProgreso.message);
    const hechas = new Set((completas || []).map((f) => Number(f.leccion_id)));

    if (regla === 'porcentaje') {
      const porcentaje = (conContenido.filter((l) => hechas.has(Number(l.id))).length / conContenido.length) * 100;
      const meta = reglas?.porcentaje_finalizacion ?? 100;
      if (porcentaje < meta) {
        return {
          respuesta: json(409, {
            error: `Para el certificado necesitas completar al menos el ${meta}% de las lecciones (llevas ${Math.floor(porcentaje)}%).`,
            estado: 'lecciones-pendientes',
          }),
        };
      }
    } else {
      const faltan = conContenido
        .filter((l) => l.obligatoria !== false && !hechas.has(Number(l.id))).length;
      if (faltan) {
        return {
          respuesta: json(409, {
            error: `Te ${faltan === 1 ? 'falta 1 lección' : `faltan ${faltan} lecciones`} por completar antes del certificado.`,
            estado: 'lecciones-pendientes',
          }),
        };
      }
    }
  }

  // Examen final: solo cuenta el que calificó este servidor (examen-calificar).
  const { count: preguntas, error: errPreguntas } = await db
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (errPreguntas) throw new Error(errPreguntas.message);

  // Curso de un solo video (sin lecciones ni examen): el avance del video es
  // el único requisito, con el mismo umbral del aula (lib/lecciones.js).
  if (!conContenido.length && !preguntas) {
    const { data: avance, error: errAvance } = await db
      .from('student_progress')
      .select('watch_percent')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (errAvance && !esEsquemaFaltante(errAvance)) throw new Error(errAvance.message);
    if ((Number(avance?.watch_percent) || 0) < UMBRAL_VIDEO) {
      return {
        respuesta: json(409, {
          error: 'Termina de ver el video del curso para obtener tu certificado.',
          estado: 'lecciones-pendientes',
        }),
      };
    }
  }

  let mejorExamen = null;
  if (preguntas) {
    const { data: aprobados, error: errExamen } = await db
      .from('curso_eventos')
      .select('datos')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('tipo', 'examen_enviado')
      .eq('datos->>aprobado', 'true')
      .eq('datos->>origen', 'servidor');
    if (errExamen) throw new Error(errExamen.message);
    const calificaciones = (aprobados || [])
      .map((e) => Number(e.datos?.calificacion))
      .filter((n) => Number.isFinite(n));
    if (calificaciones.length) mejorExamen = Math.max(...calificaciones);

    if (mejorExamen == null) {
      return {
        respuesta: json(409, {
          error: 'Primero aprueba el examen final del curso.',
          estado: 'examen-pendiente',
        }),
      };
    }
  }

  if (mejorExamen != null) return { score: mejorExamen };

  // Sin examen final: el promedio de la mejor calificación de cada examen de
  // lección, o 100 si el curso no tiene exámenes.
  const intentos = await traerTodo(() => db.from('evaluacion_intentos')
    .select('leccion_id, calificacion').eq('user_id', userId).eq('course_id', courseId)
    .not('calificacion', 'is', null).order('id'));
  if (!intentos.length) return { score: 100 };

  const mejores = new Map();
  intentos.forEach((i) => {
    const c = Number(i.calificacion);
    if (Number.isFinite(c)) mejores.set(i.leccion_id, Math.max(mejores.get(i.leccion_id) ?? 0, c));
  });
  if (!mejores.size) return { score: 100 };
  const suma = [...mejores.values()].reduce((t, c) => t + c, 0);
  return { score: suma / mejores.size };
}

const calificacionEntera = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Los certificados no están configurados en el servidor.' });
  }

  try {
    const cuerpo = JSON.parse(event.body || '{}');
    const { accion } = cuerpo;
    const db = admin();

    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    // ---- Ligar la imagen al certificado -------------------------------------
    if (accion === 'imagen') {
      const { certificadoId, ruta } = cuerpo;
      if (!certificadoId || !ruta) return json(400, { error: 'Falta el certificado o la imagen.' });

      const { data: cert, error: errCert } = await db
        .from('certificates').select('id, user_id').eq('id', certificadoId).maybeSingle();
      if (errCert) throw new Error(errCert.message);
      if (!cert) return json(404, { error: 'Ese certificado ya no existe.' });

      if (cert.user_id !== user.id) {
        const administrador = await adminDesdeToken(event.headers);
        if (!administrador) return json(403, { error: 'Ese certificado no es tuyo.' });
      }

      // La imagen tiene que estar en la carpeta del dueño del certificado.
      const limpia = String(ruta);
      if (!limpia.startsWith(`${cert.user_id}/`) || limpia.includes('..') || limpia.includes('//')) {
        return json(400, { error: 'La imagen no corresponde a este certificado.' });
      }
      const carpeta = limpia.slice(0, limpia.lastIndexOf('/'));
      const archivo = limpia.slice(limpia.lastIndexOf('/') + 1);
      const { data: encontrados, error: errLista } = await db.storage.from(BUCKET).list(carpeta, { search: archivo, limit: 100 });
      if (errLista) throw new Error(errLista.message);
      if (!(encontrados || []).some((f) => f.name === archivo)) {
        return json(404, { error: 'No se encontró la imagen del certificado. Intenta generarla de nuevo.' });
      }

      const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(limpia);
      let res = await db.from('certificates').update({ pdf_url: publicUrl }).eq('id', cert.id).select(COLUMNAS).single();
      if (faltaVigencia(res.error)) {
        res = await db.from('certificates').update({ pdf_url: publicUrl }).eq('id', cert.id).select(COLUMNAS_SIN_VIGENCIA).single();
      }
      if (res.error) throw new Error(res.error.message);
      return json(200, { certificado: { vigente_hasta: null, ...res.data } });
    }

    if (accion !== 'emitir') return json(400, { error: 'Acción no reconocida.' });

    const idCurso = Number(cuerpo.courseId);
    if (!idCurso) return json(400, { error: 'Falta el curso.' });

    // ---- Emisión a mano (administrador) -------------------------------------
    if (cuerpo.userId) {
      const administrador = await adminDesdeToken(event.headers);
      if (!administrador) return json(403, { error: 'Solo un administrador puede emitir certificados a otros.' });

      const curso = await cargarCurso(db, idCurso);
      if (!curso) return json(404, { error: 'Ese curso ya no existe.' });
      const { data: alumno } = await db.from('profiles').select('id, rol').eq('id', cuerpo.userId).maybeSingle();
      if (!alumno) return json(404, { error: 'Esa cuenta ya no existe.' });

      const previo = await certificadoExistente(db, alumno.id, curso.id);
      if (previo) return json(200, { certificado: previo, nuevo: false });

      const score = calificacionEntera(cuerpo.score ?? 100);
      const certificado = await crearCertificado(db, {
        userId: alumno.id,
        curso,
        score,
        registrarEvento: alumno.rol !== 'admin',
        emitidoPor: 'admin',
      });
      await registrarAccionAdmin({
        adminId: administrador.id,
        accion: 'certificado_emitido',
        objetivoUserId: alumno.id,
        courseId: curso.id,
        detalle: { folio: certificado.folio, score },
      });
      return json(200, { certificado, nuevo: true });
    }

    // ---- El alumno pide su certificado --------------------------------------
    const cuenta = await cuentaHabilitada(user.id, { exigirAprobacion: true });
    if (!cuenta.habilitada) return json(403, { error: cuenta.error, estado: 'cuenta-no-habilitada' });

    const curso = await cargarCurso(db, idCurso);
    if (!curso) return json(404, { error: 'Ese curso ya no existe.' });

    // Si ya lo tiene, se le devuelve el mismo (pedirlo dos veces no duplica).
    const previo = await certificadoExistente(db, user.id, curso.id);
    if (previo) return json(200, { certificado: previo, nuevo: false });

    const { data: perfil } = await db.from('profiles').select('rol').eq('id', user.id).maybeSingle();
    const esAdmin = perfil?.rol === 'admin';

    let score = 100;
    // Un administrador revisando el curso no tiene que cumplir requisitos
    // (igual que en examen-calificar).
    if (!esAdmin) {
      const { data: inscripcion } = await db
        .from('inscripciones')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', curso.id)
        .maybeSingle();
      if (!inscripcion) return json(403, { error: 'No estás inscrito en este curso.' });

      const acceso = await accesoVigente(user.id, curso.id);
      if (!acceso.vigente) return json(403, { error: acceso.error, estado: 'acceso-vencido' });

      const revision = await revisarRequisitos(db, user.id, curso.id);
      if (revision.respuesta) return revision.respuesta;
      score = revision.score;
    }

    const certificado = await crearCertificado(db, {
      userId: user.id,
      curso,
      score: calificacionEntera(score),
      // Los administradores no cuentan en las métricas.
      registrarEvento: !esAdmin,
    });
    return json(200, { certificado, nuevo: true });
  } catch (err) {
    console.error('Certificado emitir error:', err.message);
    return json(500, { error: err.message });
  }
};
