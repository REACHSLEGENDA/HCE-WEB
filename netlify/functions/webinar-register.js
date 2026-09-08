// Registro de un alumno del portal a un webinar gratuito.
//
// Es un solo registro: la persona ya entro al portal, asi que aqui no se le
// piden datos otra vez. Lo que hace la funcion es darla de alta en Zoom para
// que reciba su enlace personal, guardar la fila y meterla a la lista de Brevo
// que dispara el correo de confirmacion.

import { admin, usuarioDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';
import { agregarRegistrante, isConfigured as zoomListo } from './_zoom.js';
import { isConfigured as brevoListo, upsertContact, addToList, removeFromList } from './_brevo.js';

function partirNombre(nombreCompleto, email) {
  const limpio = (nombreCompleto || '').trim();
  if (!limpio) return { nombre: email.split('@')[0], apellido: '.' };

  const partes = limpio.split(/\s+/);
  if (partes.length === 1) return { nombre: partes[0], apellido: '.' };
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseListo()) {
    return json(500, { error: 'El registro de webinars no esta configurado en el servidor.' });
  }

  try {
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Sesion no valida. Vuelve a entrar al portal.' });

    const { webinarId } = JSON.parse(event.body || '{}');
    if (!webinarId) return json(400, { error: 'Falta el webinar.' });

    const db = admin();

    const { data: webinar, error: errWebinar } = await db
      .from('webinars')
      .select('id, title, link, zoom_id, zoom_tipo, registro_portal, brevo_lista_id, activo')
      .eq('id', webinarId)
      .single();

    if (errWebinar || !webinar) return json(404, { error: 'Ese webinar ya no existe.' });
    if (!webinar.registro_portal) {
      return json(400, { error: 'Este webinar no tiene registro por el portal.' });
    }

    const email = (user.email || '').trim().toLowerCase();

    // Si ya estaba registrado se le devuelve su mismo enlace en lugar de
    // volver a darlo de alta en Zoom, que responderia con un enlace nuevo.
    const { data: previo } = await db
      .from('webinar_registros')
      .select('id, join_url')
      .eq('webinar_id', webinar.id)
      .eq('email', email)
      .maybeSingle();

    if (previo) {
      return json(200, { yaRegistrado: true, joinUrl: previo.join_url || webinar.link });
    }

    const { data: perfil } = await db
      .from('profiles')
      .select('nombre_completo')
      .eq('id', user.id)
      .single();

    const nombreCompleto =
      perfil?.nombre_completo || user.user_metadata?.nombre_completo || '';

    // Alta en Zoom. Si falla (webinar sin registro activado, ID equivocado,
    // credenciales caidas) no se tumba el registro: se guarda con el enlace
    // generico y el alumno igual puede entrar.
    let joinUrl = webinar.link || null;
    let registrantId = null;
    const { nombre, apellido } = partirNombre(nombreCompleto, email);

    if (webinar.zoom_id && zoomListo()) {
      try {
        const alta = await agregarRegistrante(webinar.zoom_id, webinar.zoom_tipo, {
          email,
          nombre,
          apellido,
        });
        if (alta.joinUrl) joinUrl = alta.joinUrl;
        registrantId = alta.registrantId;
      } catch (err) {
        console.error('Zoom registrante error:', err.message);
      }
    }

    const { error: errInsert } = await db.from('webinar_registros').insert([
      {
        webinar_id: webinar.id,
        user_id: user.id,
        email,
        nombre_completo: nombreCompleto || null,
        join_url: joinUrl,
        zoom_registrant_id: registrantId,
      },
    ]);

    if (errInsert) throw new Error(errInsert.message);

    // Brevo: no bloquea la respuesta. Si la lista no esta configurada se salta.
    //
    // El enlace personal viaja como atributo del contacto para que la plantilla
    // de Brevo lo inserte con {{ contact.WEBINAR_LINK }}. Asi el alumno recibe
    // un solo correo, con la marca de HCE, en vez del de Zoom por separado.
    if (brevoListo() && webinar.brevo_lista_id) {
      const atributos = {
        WEBINAR_NOMBRE: webinar.title || '',
        WEBINAR_LINK: joinUrl || '',
      };
      if (nombreCompleto) {
        atributos.FIRSTNAME = nombre;
        atributos.LASTNAME = apellido;
      }

      // Brevo NO vuelve a disparar la automatizacion si el contacto ya estaba
      // en la lista, y con una sola lista para todos los webinars eso dejaria
      // sin correo a quien ya asistio a uno antes. Se le saca y se le vuelve a
      // meter: la salida no dispara nada y la entrada si.
      upsertContact(email, atributos)
        .then(() => removeFromList(email, webinar.brevo_lista_id))
        .then(() => addToList(email, webinar.brevo_lista_id))
        .catch((err) => console.error('Brevo webinar error:', err.message));
    }

    return json(200, { yaRegistrado: false, joinUrl });
  } catch (err) {
    console.error('Webinar register error:', err.message);
    return json(500, { error: err.message });
  }
};
