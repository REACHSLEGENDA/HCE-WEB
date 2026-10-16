// Aprobación y bloqueo de cuentas del portal (solo administradores).
//
// Quien se registra entra al portal, pero sus cursos quedan cerrados hasta que
// se le da acceso (ver supabase/cuentas-aprobacion.sql). Aquí el administrador
// lo activa y, en el mismo paso, lo mete a un grupo y lo inscribe a cursos. Si
// está configurada BREVO_LISTA_ACCESO, entra a esa lista, que puede disparar
// en Brevo un correo de "ya tienes acceso".
//
// Acciones:
//   aprobar   { userId, grupoId?, courseIds? }
//   rechazar  { userId }   la solicitud queda cerrada; no puede entrar
//   bloquear  { userId }   suspende una cuenta activa
//   activar   { userId }   quita la suspensión
//   division  { userIds, divisionId }  mete (o saca, con divisionId null) a
//             alumnos de una división. Va por aquí porque desde el navegador
//             Supabase no deja editar el perfil de otra persona (no daba error:
//             simplemente no se guardaba).

import { admin, adminDesdeToken, registrarAccionAdmin, json, isConfigured as supabaseListo } from './_supabase.js';
import { inscribir } from './_inscripciones.js';
import { notificar } from './_notificaciones.js';
import { isConfigured as brevoListo, upsertContact, addToList } from './_brevo.js';

const FALTA_MIGRACION = 'Falta correr en Supabase la migración cuentas-aprobacion.sql.';

async function actualizarPerfil(db, userId, cambios) {
  const { data, error } = await db
    .from('profiles')
    .update(cambios)
    .eq('id', userId)
    .select('id, email, nombre_completo, rol')
    .maybeSingle();
  if (error) throw new Error(error.code === '42703' ? FALTA_MIGRACION : error.message);
  if (!data) throw new Error('Esa cuenta ya no existe.');
  return data;
}

async function avisoBrevo(perfil) {
  const lista = Number(process.env.BREVO_LISTA_ACCESO);
  if (!lista || !brevoListo() || !perfil.email) return;
  const [nombre, ...resto] = String(perfil.nombre_completo || '').trim().split(/\s+/);
  try {
    await upsertContact(perfil.email, {
      ...(nombre ? { FIRSTNAME: nombre } : {}),
      ...(resto.length ? { LASTNAME: resto.join(' ') } : {}),
    });
    await addToList(perfil.email, lista);
  } catch (err) {
    // La cuenta ya quedó activa; que falle el correo no deshace la aprobación.
    console.error('Brevo al aprobar cuenta:', err.message);
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Las cuentas no están configuradas en el servidor.' });
  }

  try {
    const administrador = await adminDesdeToken(event.headers);
    if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

    const { accion, userId, grupoId = null, courseIds = [], userIds = [], divisionId = null } = JSON.parse(event.body || '{}');

    if (accion === 'division') {
      const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map(String))].filter(Boolean).slice(0, 2000);
      if (!ids.length) return json(400, { error: 'No elegiste alumnos.' });
      const db = admin();
      if (divisionId !== null) {
        const { data: division, error: errDivision } = await db.from('divisiones').select('id').eq('id', Number(divisionId)).maybeSingle();
        if (errDivision) throw new Error(errDivision.message);
        if (!division) return json(404, { error: 'Esa división ya no existe.' });
      }
      const { data, error } = await db.from('profiles')
        .update({ division_id: divisionId === null ? null : Number(divisionId) })
        .in('id', ids)
        .select('id');
      if (error) throw new Error(error.message);
      await registrarAccionAdmin({ adminId: administrador.id, accion: divisionId === null ? 'division_quitar' : 'division_asignar', detalle: { divisionId, alumnos: (data || []).length } });
      return json(200, { ok: true, actualizados: (data || []).length });
    }

    if (!userId) return json(400, { error: 'Falta la cuenta.' });
    if (userId === administrador.id && accion !== 'aprobar') {
      return json(400, { error: 'No puedes suspender tu propia cuenta.' });
    }

    const db = admin();

    if (accion === 'aprobar') {
      const perfil = await actualizarPerfil(db, userId, {
        aprobado: true,
        activo: true,
        aprobado_en: new Date().toISOString(),
      });

      // Los cursos del grupo quedan con origen "grupo"; los elegidos a mano, "admin".
      const deGrupo = new Set();
      let abreEn = null;
      if (grupoId) {
        const { error: errGrupo } = await db
          .from('grupo_miembros')
          .upsert([{ grupo_id: Number(grupoId), user_id: userId }], { onConflict: 'grupo_id,user_id', ignoreDuplicates: true });
        if (errGrupo) throw new Error(errGrupo.message);

        const { data: delGrupo, error: errCursos } = await db
          .from('grupo_cursos')
          .select('*') // abre_en llega con acceso-por-grupo.sql
          .eq('grupo_id', Number(grupoId));
        if (errCursos) throw new Error(errCursos.message);
        (delGrupo || []).forEach((c) => deGrupo.add(c.course_id));
        // Próxima fecha de inicio del grupo, para decírsela en el correo.
        const futuras = (delGrupo || []).map((c) => c.abre_en && new Date(c.abre_en)).filter((f) => f && f > new Date());
        if (futuras.length) abreEn = new Date(Math.min(...futuras));
      }

      const aMano = (courseIds || []).map(Number).filter((id) => id && !deGrupo.has(id));
      for (const courseId of deGrupo) await inscribir(db, { userId, courseId, origen: 'grupo', avisar: false });
      for (const courseId of new Set(aMano)) await inscribir(db, { userId, courseId, origen: 'admin', avisar: false });

      await avisoBrevo(perfil);

      let grupo = '';
      if (grupoId) {
        const { data: g } = await db.from('grupos').select('nombre').eq('id', Number(grupoId)).maybeSingle();
        grupo = g?.nombre || '';
      }
      const idsCursos = [...deGrupo, ...new Set(aMano)];
      const { data: nombresCursos } = idsCursos.length
        ? await db.from('courses').select('title').in('id', idsCursos)
        : { data: [] };
      const cursos = (nombresCursos || []).map((c) => c.title).join(', ');
      // La frase ya armada, para que el correo no quede con huecos si no hay
      // grupo o cursos.
      const acceso = grupo && cursos ? `Te asignamos al grupo ${grupo} con estos cursos: ${cursos}.`
        : cursos ? `Ya tienes acceso a: ${cursos}.`
          : grupo ? `Te asignamos al grupo ${grupo}.` : '';
      const inicio = abreEn
        ? ` Tu grupo inicia el ${abreEn.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })}: ese día se abren tus cursos y te avisaremos por correo.`
        : '';
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'cuenta_activada', objetivoUserId: userId, detalle: { grupo } });
      await notificar(db, 'cuenta_activada', {
        userId,
        clave: 'cuenta-activada',
        variables: { grupo, cursos, acceso: `${acceso}${inicio}`.trim() },
      });
      return json(200, { ok: true, cursos: deGrupo.size + new Set(aMano).size });
    }

    if (accion === 'rechazar' || accion === 'bloquear') {
      await actualizarPerfil(db, userId, { activo: false });
      await registrarAccionAdmin({ adminId: administrador.id, accion: accion === 'rechazar' ? 'cuenta_rechazada' : 'cuenta_bloqueada', objetivoUserId: userId });
      return json(200, { ok: true });
    }

    if (accion === 'activar') {
      await actualizarPerfil(db, userId, { activo: true });
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'cuenta_reactivada', objetivoUserId: userId });
      return json(200, { ok: true });
    }

    return json(400, { error: 'Acción no reconocida.' });
  } catch (err) {
    console.error('Cuenta admin error:', err.message);
    return json(500, { error: err.message });
  }
};
