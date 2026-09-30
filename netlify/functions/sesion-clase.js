// Sesiones en vivo como clase del curso (ver supabase/lms-sesiones.sql).
//
// Acciones del alumno:
//   estado     { leccionId }  horario, si está registrado y si asistió
//   registrar  { leccionId }  lo da de alta en Zoom (enlace personal)
//   unirse     { leccionId }  entrega su enlace personal, solo en el horario
//   verificar  { leccionId }  revisa el reporte de Zoom y, si asistió,
//                             completa la lección
//
// Acciones del administrador:
//   zoom-info    { zoomId, zoomTipo }   trae tema, horario y duración de Zoom
//   configurar   { leccionId }          deja la reunión con un solo dispositivo
//                                       por registro y sin correo de Zoom
//   sincronizar  { leccionId }          revisa la asistencia de todos
//   registros    { leccionId }          lista de registrados y su asistencia

import { admin, usuarioDesdeToken, adminDesdeToken, cuentaHabilitada, json, isConfigured as supabaseListo } from './_supabase.js';
import { agregarRegistrante, obtenerReunion, configurarRegistroPortal, isConfigured as zoomListo } from './_zoom.js';
import { ventana, partirNombre, cargarSesion, sincronizar, fechaMexico } from './_sesiones.js';
import { notificar } from './_notificaciones.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Las sesiones no están configuradas en el servidor.' });
  }

  try {
    const cuerpo = JSON.parse(event.body || '{}');
    const { accion, leccionId } = cuerpo;
    const db = admin();

    // ---- Administrador ------------------------------------------------------
    if (['zoom-info', 'configurar', 'sincronizar', 'registros'].includes(accion)) {
      const administrador = await adminDesdeToken(event.headers);
      if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

      if (accion === 'zoom-info') {
        if (!zoomListo()) return json(400, { error: 'Zoom no está configurado en el servidor.' });
        const id = String(cuerpo.zoomId || '').replace(/\D/g, '');
        if (!id) return json(400, { error: 'Falta el ID de la reunión.' });
        try {
          return json(200, await obtenerReunion(id, cuerpo.zoomTipo));
        } catch (err) {
          return json(400, { error: `Zoom no encontró esa reunión: ${err.message}` });
        }
      }

      const datos = await cargarSesion(db, leccionId);
      if (!datos) return json(404, { error: 'Esa sesión ya no existe.' });

      if (accion === 'configurar') {
        if (!datos.secretos.zoom_id || !zoomListo()) return json(400, { error: 'La sesión no tiene reunión de Zoom.' });
        try {
          await configurarRegistroPortal(datos.secretos.zoom_id, datos.secretos.zoom_tipo);
          return json(200, { ok: true });
        } catch (err) {
          // La app de Zoom puede no tener permiso para editar reuniones.
          return json(200, {
            ok: false,
            aviso: 'No se pudo ajustar la reunión desde aquí (la app de Zoom no tiene ese permiso). Actívalo en Zoom a mano: Registro obligatorio, "Permitir unirse desde un solo dispositivo" y sin correo de confirmación.',
            detalle: err.message,
          });
        }
      }

      if (accion === 'sincronizar') {
        return json(200, await sincronizar(db, datos, { forzar: true }));
      }

      const { data: registros } = await db
        .from('sesion_registros')
        .select('id, user_id, email, asistio, minutos, verificado_en, creado_en')
        .eq('leccion_id', datos.leccion.id)
        .order('creado_en');
      return json(200, { registros: registros || [] });
    }

    // ---- Alumno -------------------------------------------------------------
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    const datos = await cargarSesion(db, leccionId);
    if (!datos || !datos.sesion) return json(404, { error: 'Esta sesión todavía no tiene horario.' });
    const { leccion, sesion, secretos } = datos;

    const { data: perfil } = await db.from('profiles').select('rol, nombre_completo').eq('id', user.id).single();
    const esAdmin = perfil?.rol === 'admin';

    if (!esAdmin) {
      const cuenta = await cuentaHabilitada(user.id, { exigirAprobacion: true });
      if (!cuenta.habilitada) return json(403, { error: cuenta.error, estado: 'cuenta-no-habilitada' });
      const { data: inscripcion } = await db.from('inscripciones').select('id')
        .eq('user_id', user.id).eq('course_id', leccion.course_id).maybeSingle();
      if (!inscripcion) return json(403, { error: 'No estás inscrito en este curso.' });
    }

    const v = ventana(sesion);
    const ahora = Date.now();
    const { data: registro } = await db.from('sesion_registros').select('*')
      .eq('leccion_id', leccion.id).eq('user_id', user.id).maybeSingle();

    const estadoActual = (r = registro) => ({
      iniciaEn: sesion.inicia_en,
      duracionMin: sesion.duracion_min,
      abreEn: new Date(v.abre).toISOString(),
      cierraEn: new Date(v.cierra).toISOString(),
      registrado: !!r,
      asistio: !!r?.asistio,
      minutos: r?.minutos || 0,
      terminada: ahora > v.fin,
      puedeUnirse: !!r && ahora >= v.abre && ahora <= v.cierra,
    });

    if (accion === 'estado') return json(200, estadoActual());

    if (accion === 'registrar') {
      if (registro) return json(200, estadoActual());
      if (ahora > v.cierra) return json(409, { error: 'Esta sesión ya terminó.' });
      // Un administrador revisando la clase no se registra de verdad en Zoom.
      if (esAdmin) return json(200, { ...estadoActual({ asistio: false }), registrado: true, simulado: true });

      const email = String(user.email || '').trim().toLowerCase();
      const { nombre, apellido } = partirNombre(perfil?.nombre_completo, email);
      let joinUrl = secretos.enlace_respaldo || null;
      let registrantId = null;
      if (secretos.zoom_id && zoomListo()) {
        try {
          const alta = await agregarRegistrante(secretos.zoom_id, secretos.zoom_tipo, { email, nombre, apellido });
          joinUrl = alta.joinUrl || joinUrl;
          registrantId = alta.registrantId;
        } catch (err) {
          console.error('Zoom registro sesion:', err.message);
          if (!joinUrl) return json(502, { error: 'Zoom no pudo registrarte en este momento. Intenta de nuevo en unos minutos.' });
        }
      }
      if (!joinUrl) return json(409, { error: 'Esta sesión todavía no tiene reunión de Zoom.' });


      const { data: nuevo, error } = await db.from('sesion_registros').insert([{
        leccion_id: leccion.id,
        user_id: user.id,
        email,
        join_url: joinUrl,
        zoom_registrant_id: registrantId,
      }]).select('*').single();
      if (error) throw new Error(error.message);
      await notificar(db, 'sesion_registro', {
        userId: user.id,
        courseId: leccion.course_id,
        clave: `sesion-registro:${leccion.id}`,
        variables: { sesion: leccion.titulo, fecha: fechaMexico(sesion.inicia_en) },
      });
      return json(200, estadoActual(nuevo));
    }

    if (accion === 'unirse') {
      if (esAdmin) {
        return json(200, { url: secretos.enlace_respaldo || (secretos.zoom_id ? `https://zoom.us/j/${secretos.zoom_id}` : null) });
      }
      if (!registro) return json(409, { error: 'Primero regístrate a la sesión.' });
      if (ahora < v.abre) return json(409, { error: 'El acceso se abre 15 minutos antes de la sesión.' });
      if (ahora > v.cierra) return json(409, { error: 'Esta sesión ya terminó.' });
      return json(200, { url: registro.join_url });
    }

    if (accion === 'verificar') {
      if (registro && !registro.asistio && ahora > v.fin) await sincronizar(db, datos);
      const { data: actualizado } = await db.from('sesion_registros').select('*')
        .eq('leccion_id', leccion.id).eq('user_id', user.id).maybeSingle();
      return json(200, estadoActual(actualizado));
    }

    return json(400, { error: 'Acción no reconocida.' });
  } catch (err) {
    console.error('Sesion clase error:', err.message);
    return json(500, { error: err.message });
  }
};
