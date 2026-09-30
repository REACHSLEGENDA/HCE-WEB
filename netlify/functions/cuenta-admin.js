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

    const { accion, userId, grupoId = null, courseIds = [] } = JSON.parse(event.body || '{}');
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
      if (grupoId) {
        const { error: errGrupo } = await db
          .from('grupo_miembros')
          .upsert([{ grupo_id: Number(grupoId), user_id: userId }], { onConflict: 'grupo_id,user_id', ignoreDuplicates: true });
        if (errGrupo) throw new Error(errGrupo.message);

        const { data: delGrupo, error: errCursos } = await db
          .from('grupo_cursos')
          .select('course_id')
          .eq('grupo_id', Number(grupoId));
        if (errCursos) throw new Error(errCursos.message);
        (delGrupo || []).forEach((c) => deGrupo.add(c.course_id));
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
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'cuenta_activada', objetivoUserId: userId, detalle: { grupo } });
      await notificar(db, 'cuenta_activada', {
        userId,
        clave: 'cuenta-activada',
        variables: { grupo, cursos, acceso },
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
