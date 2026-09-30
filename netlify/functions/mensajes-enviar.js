// Envío de mensajes internos (ver supabase/mensajes.sql).
//
// El administrador puede escribir a una persona, a un grupo, a los inscritos de
// un curso, a todos los alumnos o a los administradores. Un alumno solo puede
// escribir a los administradores o responder un mensaje en el que participa.
// Aquí se resuelve la lista de destinatarios y se guarda todo con la llave de
// servidor, porque el navegador no puede escribir estas tablas.

import { admin, usuarioDesdeToken, cuentaHabilitada, json, isConfigured as supabaseListo } from './_supabase.js';
import { notificar } from './_notificaciones.js';

const MAX_ASUNTO = 200;
const MAX_CUERPO = 20000;
// Más de esto en un solo envío es un error de dedo, no un mensaje.
const MAX_DESTINATARIOS = 5000;

async function idsDe(db, tipo, id) {
  if (tipo === 'usuario') return [id];
  if (tipo === 'admins') {
    const { data } = await db.from('profiles').select('id').eq('rol', 'admin');
    return (data || []).map((p) => p.id);
  }
  if (tipo === 'todos') {
    const { data } = await db.from('profiles').select('id').neq('rol', 'admin').range(0, MAX_DESTINATARIOS);
    return (data || []).map((p) => p.id);
  }
  if (tipo === 'grupo') {
    const { data } = await db.from('grupo_miembros').select('user_id').eq('grupo_id', Number(id));
    return (data || []).map((m) => m.user_id);
  }
  if (tipo === 'curso') {
    const { data } = await db.from('inscripciones').select('user_id').eq('course_id', Number(id));
    return (data || []).map((m) => m.user_id);
  }
  return [];
}

async function nombreDestino(db, tipo, id) {
  if (tipo === 'todos') return 'Todos los alumnos';
  if (tipo === 'admins') return 'Administradores';
  if (tipo === 'grupo') return `Grupo: ${(await db.from('grupos').select('nombre').eq('id', Number(id)).maybeSingle()).data?.nombre || id}`;
  if (tipo === 'curso') return `Curso: ${(await db.from('courses').select('title').eq('id', Number(id)).maybeSingle()).data?.title || id}`;
  const { data } = await db.from('profiles').select('nombre_completo, email').eq('id', id).maybeSingle();
  return data?.nombre_completo || data?.email || 'Usuario';
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!supabaseListo()) return json(500, { error: 'Los mensajes no están configurados en el servidor.' });

  try {
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });
    const cuenta = await cuentaHabilitada(user.id);
    if (!cuenta.habilitada) return json(403, { error: cuenta.error });

    const db = admin();
    const { data: perfil } = await db.from('profiles').select('rol, nombre_completo, email').eq('id', user.id).single();
    const esAdmin = perfil?.rol === 'admin';

    const cuerpo = JSON.parse(event.body || '{}');
    const asunto = String(cuerpo.asunto || '').trim().slice(0, MAX_ASUNTO);
    const texto = String(cuerpo.cuerpo || '').trim().slice(0, MAX_CUERPO);
    const adjuntoPath = cuerpo.adjuntoPath ? String(cuerpo.adjuntoPath) : null;
    const adjuntoNombre = cuerpo.adjuntoNombre ? String(cuerpo.adjuntoNombre).slice(0, 200) : null;
    if (!texto) return json(400, { error: 'Escribe el mensaje.' });
    // El adjunto tiene que estar en la carpeta de quien envía.
    if (adjuntoPath && !adjuntoPath.startsWith(`${user.id}/`)) return json(400, { error: 'Adjunto no válido.' });

    let destinoTipo = cuerpo.destinoTipo;
    let destinoId = cuerpo.destinoId ? String(cuerpo.destinoId) : null;
    let hiloId = null;
    let asuntoFinal = asunto;

    // Respuesta: va a quien mandó el mensaje que se responde.
    if (cuerpo.respondeA) {
      const { data: original } = await db.from('mensajes').select('id, remitente_id, asunto, hilo_id').eq('id', Number(cuerpo.respondeA)).maybeSingle();
      if (!original) return json(404, { error: 'Ese mensaje ya no existe.' });
      const { data: participa } = await db.from('mensaje_destinatarios').select('user_id').eq('mensaje_id', original.id).eq('user_id', user.id).maybeSingle();
      if (!participa && original.remitente_id !== user.id && !esAdmin) return json(403, { error: 'No puedes responder ese mensaje.' });
      hiloId = original.hilo_id || original.id;
      destinoTipo = 'usuario';
      destinoId = original.remitente_id === user.id ? null : original.remitente_id;
      if (!destinoId) {
        // Responder a un mensaje propio: al último que le escribió en el hilo.
        const { data: ultimo } = await db.from('mensajes').select('remitente_id')
          .eq('hilo_id', hiloId).neq('remitente_id', user.id).order('creado_en', { ascending: false }).limit(1).maybeSingle();
        destinoId = ultimo?.remitente_id || null;
      }
      if (!destinoId) return json(400, { error: 'Nadie ha respondido todavía en esta conversación.' });
      asuntoFinal = /^re:/i.test(original.asunto) ? original.asunto : `RE: ${original.asunto}`;
    } else {
      if (!asunto) return json(400, { error: 'Pon el asunto.' });
      if (!esAdmin) {
        // Un alumno solo escribe a los administradores.
        destinoTipo = 'admins';
        destinoId = null;
      }
      if (!['usuario', 'grupo', 'curso', 'todos', 'admins'].includes(destinoTipo)) return json(400, { error: 'Elige a quién va el mensaje.' });
      if (['usuario', 'grupo', 'curso'].includes(destinoTipo) && !destinoId) return json(400, { error: 'Elige a quién va el mensaje.' });
    }

    const destinatarios = [...new Set(await idsDe(db, destinoTipo, destinoId))].filter((id) => id && id !== user.id);
    if (!destinatarios.length) return json(400, { error: 'Ese envío no tiene destinatarios.' });
    if (destinatarios.length > MAX_DESTINATARIOS) return json(400, { error: 'Demasiados destinatarios para un solo envío.' });

    const { data: mensaje, error } = await db.from('mensajes').insert([{
      remitente_id: user.id,
      remitente_nombre: esAdmin ? `${perfil?.nombre_completo || 'Administrador'} (HCE)` : (perfil?.nombre_completo || perfil?.email || 'Alumno'),
      asunto: asuntoFinal,
      cuerpo: texto,
      adjunto_path: adjuntoPath,
      adjunto_nombre: adjuntoNombre,
      destino_tipo: destinoTipo,
      destino_id: destinoId,
      destino_nombre: await nombreDestino(db, destinoTipo, destinoId),
      hilo_id: hiloId,
    }]).select('id').single();
    if (error) throw new Error(error.message);

    for (let i = 0; i < destinatarios.length; i += 500) {
      const { error: errDest } = await db.from('mensaje_destinatarios')
        .insert(destinatarios.slice(i, i + 500).map((id) => ({ mensaje_id: mensaje.id, user_id: id })));
      if (errDest) throw new Error(errDest.message);
    }

    // Aviso por correo (si está configurada la notificación "mensaje nuevo").
    // Solo en envíos chicos: uno por uno, a cientos de personas, pasaría el
    // tiempo máximo de la función. Los avisos masivos van por Brevo.
    const AVISO_MAXIMO = 25;
    for (const id of destinatarios.length <= AVISO_MAXIMO ? destinatarios : []) {
      await notificar(db, 'mensaje_nuevo', {
        userId: id,
        clave: `mensaje:${mensaje.id}`,
        variables: { remitente: perfil?.nombre_completo || perfil?.email || 'Alguien', asunto: asuntoFinal },
      });
    }

    return json(200, { ok: true, id: mensaje.id, destinatarios: destinatarios.length });
  } catch (err) {
    console.error('Mensajes enviar:', err.message);
    return json(500, { error: err.message });
  }
};
