// Clonar un curso completo o copiar una lección a otro curso (como "Clonar de
// otro curso" de TalentLMS). Solo administradores.
//
//   clonar          { courseId }                    copia el curso con todo:
//                   lecciones, contenido, exámenes (con respuestas), reglas y
//                   biblioteca. Queda inactivo y "(copia)" para revisarlo.
//   copiar-leccion  { leccionId, destinoCourseId }  copia una lección al final
//                   de otro curso.
//
// Los archivos (PDF de lecciones y biblioteca) se copian también: su acceso
// depende del curso al que pertenece la ruta, así que el curso nuevo necesita
// sus propias copias. No se copian alumnos, avances ni horarios de sesiones.

import { admin, adminDesdeToken, registrarAccionAdmin, json, isConfigured as supabaseListo } from './_supabase.js';
import { comprobar, traerTodo } from './_consultas.js';

const sinCampos = (fila, campos) => Object.fromEntries(Object.entries(fila).filter(([k]) => !campos.includes(k)));

async function copiarArchivo(db, bucket, desde, hacia, archivosNuevos) {
  if (!desde) return null;
  const { error } = await db.storage.from(bucket).copy(desde, hacia);
  if (error) throw new Error(`No se pudo copiar ${bucket}/${desde}: ${error.message}`);
  archivosNuevos.push({ bucket, ruta: hacia });
  return hacia;
}

const nombreArchivo = (ruta) => String(ruta).split('/').pop();

// Copia una lección (con su contenido y su examen o encuesta) a `courseId`.
async function copiarLeccion(db, leccion, courseId, orden, archivosNuevos, leccionesNuevas) {
  const { data: nueva, error } = await db
    .from('curso_lecciones')
    .insert([{ ...sinCampos(leccion, ['id', 'creada_en', 'course_id', 'orden']), course_id: courseId, orden }])
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  leccionesNuevas.push(nueva.id);

  const contenido = await comprobar(db.from('leccion_contenido').select('*').eq('leccion_id', leccion.id).maybeSingle());
  if (contenido) {
    const archivo = contenido.archivo_path
      ? await copiarArchivo(db, 'curso-materiales', contenido.archivo_path, `${courseId}/${nueva.id}/${Date.now()}_${nombreArchivo(contenido.archivo_path)}`, archivosNuevos)
      : null;
    await comprobar(db.from('leccion_contenido').insert([{
      ...sinCampos(contenido, ['leccion_id', 'actualizado_en']),
      leccion_id: nueva.id,
      archivo_path: archivo,
    }]));
  }

  if (leccion.tipo === 'examen' || leccion.tipo === 'encuesta') {
    const config = await comprobar(db.from('evaluacion_config').select('*').eq('leccion_id', leccion.id).maybeSingle());
    if (config) await comprobar(db.from('evaluacion_config').insert([{ ...sinCampos(config, ['leccion_id', 'actualizado_en']), leccion_id: nueva.id }]));
    const preguntas = await traerTodo(() => db.from('evaluacion_preguntas').select('*').eq('leccion_id', leccion.id).order('orden').order('id'));
    for (const p of preguntas || []) {
      const pn = await comprobar(db.from('evaluacion_preguntas')
        .insert([{ ...sinCampos(p, ['id', 'creada_en', 'leccion_id']), leccion_id: nueva.id }])
        .select('id').single());
      const clave = await comprobar(db.from('evaluacion_claves').select('correctas').eq('pregunta_id', p.id).maybeSingle());
      if (clave) await comprobar(db.from('evaluacion_claves').insert([{ pregunta_id: pn.id, correctas: clave.correctas }]));
    }
  }
  if (leccion.tipo === 'sesion') {
    // Se conserva la reunión o enlace, pero no se crea un horario: el admin
    // debe fijar una fecha nueva antes de publicar la copia.
    const secretos = await comprobar(db.from('sesion_secretos').select('*').eq('leccion_id', leccion.id).maybeSingle());
    if (secretos) await comprobar(db.from('sesion_secretos').insert([{ ...secretos, leccion_id: nueva.id }]));
  }
  return nueva.id;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!supabaseListo()) return json(500, { error: 'El servidor no está configurado.' });

  let db;
  let cursoNuevoId = null;
  let destinoIdCopia = null;
  const archivosNuevos = [];
  const leccionesNuevas = [];
  try {
    const administrador = await adminDesdeToken(event.headers);
    if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });
    db = admin();
    const { accion, courseId, leccionId, destinoCourseId } = JSON.parse(event.body || '{}');
    destinoIdCopia = destinoCourseId;

    if (accion === 'copiar-leccion') {
      const leccion = await comprobar(db.from('curso_lecciones').select('*').eq('id', Number(leccionId)).maybeSingle());
      if (!leccion) return json(404, { error: 'Esa lección ya no existe.' });
      const destino = await comprobar(db.from('courses').select('id').eq('id', Number(destinoCourseId)).maybeSingle());
      if (!destino) return json(404, { error: 'El curso de destino ya no existe.' });
      const ultimas = await comprobar(db.from('curso_lecciones').select('orden').eq('course_id', destino.id).order('orden', { ascending: false }).limit(1));
      const id = await copiarLeccion(db, leccion, destino.id, (ultimas?.[0]?.orden ?? -1) + 1, archivosNuevos, leccionesNuevas);
      await comprobar(db.from('courses').update({ tiene_video: true }).eq('id', destino.id));
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'leccion_copiada', courseId: Number(destinoCourseId), detalle: { leccion: leccion.titulo } });
      return json(200, { ok: true, leccionId: id, ...(leccion.tipo === 'sesion' ? { aviso: 'Asigna una fecha nueva a la sesión copiada.' } : {}) });
    }

    if (accion !== 'clonar') return json(400, { error: 'Acción no reconocida.' });

    const curso = await comprobar(db.from('courses').select('*').eq('id', Number(courseId)).maybeSingle());
    if (!curso) return json(404, { error: 'Ese curso ya no existe.' });

    const { data: nuevo, error } = await db
      .from('courses')
      .insert([{ ...sinCampos(curso, ['id', 'created_at', 'updated_at']), title: `${curso.title} (copia)`, activo: false }])
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    const nuevoId = nuevo.id;
    cursoNuevoId = nuevoId;

    // Examen final y video del curso.
    const preguntas = await traerTodo(() => db.from('questions').select('*').eq('course_id', curso.id).order('id'));
    if (preguntas?.length) {
      await comprobar(db.from('questions').insert(preguntas.map((q) => ({ ...sinCampos(q, ['id', 'created_at', 'course_id']), course_id: nuevoId }))));
    }
    const video = await comprobar(db.from('curso_contenido').select('*').eq('course_id', curso.id).maybeSingle());
    if (video) await comprobar(db.from('curso_contenido').insert([{ ...sinCampos(video, ['course_id', 'actualizado_en', 'created_at']), course_id: nuevoId }]));

    // Lecciones (se conserva el orden).
    const lecciones = await traerTodo(() => db.from('curso_lecciones').select('*').eq('course_id', curso.id).order('orden').order('id'));
    const nuevasIds = new Map();
    for (const l of lecciones || []) nuevasIds.set(l.id, await copiarLeccion(db, l, nuevoId, l.orden, archivosNuevos, leccionesNuevas));

    // Reglas del curso.
    const reglas = await comprobar(db.from('curso_reglas').select('*').eq('course_id', curso.id).maybeSingle());
    if (reglas) await comprobar(db.from('curso_reglas').insert([{ ...sinCampos(reglas, ['course_id', 'actualizado_en']), course_id: nuevoId }]));

    // Biblioteca.
    const archivos = await traerTodo(() => db.from('curso_archivos').select('*').eq('course_id', curso.id).order('id'));
    for (const a of archivos || []) {
      const ruta = await copiarArchivo(db, 'curso-biblioteca', a.ruta, `${nuevoId}/${a.id}_${Date.now()}_${nombreArchivo(a.ruta)}`, archivosNuevos);
      await comprobar(db.from('curso_archivos').insert([{
        ...sinCampos(a, ['id', 'subido_en', 'course_id', 'ruta', 'leccion_id']),
        course_id: nuevoId,
        ruta,
        leccion_id: a.leccion_id ? nuevasIds.get(a.leccion_id) || null : null,
      }]));
    }

    await registrarAccionAdmin({ adminId: administrador.id, accion: 'curso_clonado', courseId: nuevoId, detalle: { original: curso.title } });
    return json(200, { ok: true, courseId: nuevoId, lecciones: nuevasIds.size, archivos: archivos?.length || 0,
      ...(lecciones.some((l) => l.tipo === 'sesion') ? { aviso: 'Asigna fechas nuevas a las sesiones en vivo antes de publicar.' } : {}) });
  } catch (err) {
    console.error('Curso clonar:', err.message);
    // Solo se deshacen los registros y archivos creados por esta petición.
    if (db) {
      try {
        if (cursoNuevoId) await comprobar(db.from('courses').delete().eq('id', cursoNuevoId));
        else if (leccionesNuevas.length) await comprobar(db.from('curso_lecciones').delete().in('id', leccionesNuevas));
        for (const bucket of new Set(archivosNuevos.map((a) => a.bucket))) {
          const { error } = await db.storage.from(bucket).remove(archivosNuevos.filter((a) => a.bucket === bucket).map((a) => a.ruta));
          if (error) throw new Error(error.message);
        }
      } catch (errLimpiar) {
        console.error('No se pudo deshacer la copia incompleta:', errLimpiar.message);
        return json(500, { error: `${err.message}. Quedó una copia incompleta (curso ${cursoNuevoId ?? destinoIdCopia ?? ''}); revísala antes de reintentar.` });
      }
    }
    return json(500, { error: err.message });
  }
};
