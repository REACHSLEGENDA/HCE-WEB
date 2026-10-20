// Divisiones como TalentLMS (supabase/divisiones-marca.sql): inscripción
// automática a los cursos de la división y catálogo exclusivo.
//
// Sin la migración (columnas faltantes) todo se comporta como antes: no se
// inscribe a nadie y ningún curso queda restringido.

const faltaMigracion = (error) => ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code);

/** Datos de la división que importan al servidor (o null). */
export async function divisionDe(db, divisionId) {
  if (!divisionId) return null;
  const { data, error } = await db.from('divisiones')
    .select('id, nombre, slug, catalogo, inscripcion_auto, registro_abierto, aprobacion_auto')
    .eq('id', Number(divisionId)).maybeSingle();
  if (error) {
    if (faltaMigracion(error)) return null;
    throw new Error(error.message);
  }
  return data;
}

/**
 * Inscribe a los alumnos de la división en todos sus cursos (si la división
 * tiene la inscripción automática). Sin `userIds`, a todos sus miembros.
 * Es idempotente: quien ya estaba inscrito se queda como estaba. El correo de
 * "inscrito" lo manda notificaciones-programadas (origen 'division').
 */
export async function inscribirEnDivision(db, divisionId, { userIds = null } = {}) {
  const division = await divisionDe(db, divisionId);
  if (!division?.inscripcion_auto) return { inscritos: 0 };

  const { data: cursos, error: errCursos } = await db.from('division_cursos').select('course_id').eq('division_id', division.id);
  if (errCursos) throw new Error(errCursos.message);
  if (!cursos?.length) return { inscritos: 0 };

  let ids = userIds;
  if (!ids) {
    const { data: miembros, error: errMiembros } = await db.from('profiles').select('id').eq('division_id', division.id).neq('rol', 'admin');
    if (errMiembros) throw new Error(errMiembros.message);
    ids = (miembros || []).map((m) => m.id);
  }
  if (!ids.length) return { inscritos: 0 };

  const filas = [];
  for (const userId of ids) for (const c of cursos) filas.push({ user_id: userId, course_id: c.course_id, origen: 'division' });
  let inscritos = 0;
  for (let i = 0; i < filas.length; i += 500) {
    const { data, error } = await db.from('inscripciones')
      .upsert(filas.slice(i, i + 500), { onConflict: 'user_id,course_id', ignoreDuplicates: true })
      .select('user_id');
    if (error) throw new Error(error.message);
    inscritos += (data || []).length;
  }
  return { inscritos };
}

/**
 * ¿Puede este alumno ver e inscribirse a este curso?
 *   - un curso asignado a divisiones es exclusivo de sus alumnos;
 *   - un alumno de una división con catálogo "propio" solo ve los de su división.
 */
export async function cursoDisponiblePara(db, userId, courseId) {
  const [{ data: perfil, error: errPerfil }, { data: asignado, error: errAsignado }] = await Promise.all([
    db.from('profiles').select('division_id').eq('id', userId).maybeSingle(),
    db.from('division_cursos').select('division_id').eq('course_id', Number(courseId)),
  ]);
  if (errPerfil || errAsignado) {
    if (faltaMigracion(errPerfil) || faltaMigracion(errAsignado)) return { disponible: true };
    throw new Error((errPerfil || errAsignado).message);
  }
  const miDivision = perfil?.division_id ? Number(perfil.division_id) : null;
  const divisionesDelCurso = (asignado || []).map((d) => Number(d.division_id));
  if (divisionesDelCurso.length && !divisionesDelCurso.includes(miDivision)) {
    return { disponible: false, motivo: 'Este curso es exclusivo de otra institución.' };
  }
  if (miDivision && !divisionesDelCurso.includes(miDivision)) {
    const division = await divisionDe(db, miDivision);
    if (division?.catalogo === 'propio') return { disponible: false, motivo: 'Este curso no está en el catálogo de tu institución.' };
  }
  return { disponible: true };
}
