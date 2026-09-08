// Desbloqueo de la constancia de un webinar.
//
// Primero se le pregunta a Zoom quien asistio: si el reporte confirma a la
// persona, la constancia se libera sola y no tiene que escribir nada. El codigo
// que dijo el ponente al cierre queda como respaldo para quien entro con otro
// correo o desde el celular de un companero.

import { admin, usuarioDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';
import { sincronizarAsistencia, generarFolio } from './_webinars.js';

const CAMPOS_WEBINAR =
  'id, title, link, zoom_id, zoom_tipo, minutos_minimos, constancia_estado, sincronizado_en, ' +
  'certificado_template_url, certificado_x, certificado_y, certificado_font_size';

const plantillaDe = (webinar) => ({
  url: webinar.certificado_template_url || null,
  x: webinar.certificado_x || null,
  y: webinar.certificado_y || null,
  fontSize: webinar.certificado_font_size || null,
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseListo()) {
    return json(500, { error: 'El portal de webinars no esta configurado en el servidor.' });
  }

  try {
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Sesion no valida. Vuelve a entrar al portal.' });

    const { webinarId, codigo = '', accion = 'desbloquear', certificadoUrl = '', folio = '' } =
      JSON.parse(event.body || '{}');

    if (!webinarId) return json(400, { error: 'Falta el webinar.' });

    const db = admin();
    const email = (user.email || '').trim().toLowerCase();

    const { data: webinar, error: errWebinar } = await db
      .from('webinars')
      .select(CAMPOS_WEBINAR)
      .eq('id', webinarId)
      .single();

    if (errWebinar || !webinar) return json(404, { error: 'Ese webinar ya no existe.' });

    const { data: registro } = await db
      .from('webinar_registros')
      .select('id, asistio, minutos, metodo, certificado_url, folio')
      .eq('webinar_id', webinar.id)
      .eq('email', email)
      .maybeSingle();

    if (!registro) {
      return json(403, {
        error: 'No apareces registrado en este webinar, asi que no podemos emitir tu constancia.',
      });
    }

    // --- Guardar la constancia ya generada en el navegador -------------------
    if (accion === 'certificado') {
      if (!registro.asistio) {
        return json(403, { error: 'Tu asistencia todavia no esta confirmada.' });
      }
      if (!certificadoUrl) return json(400, { error: 'Falta el archivo de la constancia.' });

      const { error: errGuardar } = await db
        .from('webinar_registros')
        .update({
          certificado_url: certificadoUrl,
          folio: folio || registro.folio || generarFolio(),
          certificado_en: new Date().toISOString(),
        })
        .eq('id', registro.id);

      if (errGuardar) throw new Error(errGuardar.message);
      return json(200, { ok: true });
    }

    // --- Ya tenia la constancia ---------------------------------------------
    if (registro.asistio) {
      return json(200, {
        ok: true,
        yaDesbloqueado: true,
        folio: registro.folio || generarFolio(),
        certificadoUrl: registro.certificado_url || null,
        plantilla: plantillaDe(webinar),
      });
    }

    // --- Constancia todavia cerrada -----------------------------------------
    if (webinar.constancia_estado === 'bloqueada') {
      return json(403, {
        error: 'La constancia de este webinar todavia no esta disponible. Te avisamos en cuanto se libere.',
        estado: 'bloqueada',
      });
    }

    // --- Abierta para todos los registrados ----------------------------------
    if (webinar.constancia_estado === 'libre') {
      await db
        .from('webinar_registros')
        .update({ asistio: true, metodo: 'libre', verificado_en: new Date().toISOString() })
        .eq('id', registro.id);

      return json(200, { ok: true, folio: generarFolio(), plantilla: plantillaDe(webinar) });
    }

    // --- Estado 'codigo': primero Zoom, luego la clave ----------------------
    // El reporte de Zoom se consulta antes que nada, para que quien si estuvo
    // conectado no tenga que escribir nada.
    await sincronizarAsistencia(db, webinar).catch((err) =>
      console.error('Sync asistencia error:', err.message)
    );

    const { data: refrescado } = await db
      .from('webinar_registros')
      .select('id, asistio, minutos, folio, certificado_url')
      .eq('id', registro.id)
      .single();

    if (refrescado?.asistio) {
      return json(200, {
        ok: true,
        via: 'zoom',
        minutos: refrescado.minutos,
        folio: refrescado.folio || generarFolio(),
        certificadoUrl: refrescado.certificado_url || null,
        plantilla: plantillaDe(webinar),
      });
    }

    // Zoom no lo reconocio. Se acepta el codigo del cierre.
    const clave = String(codigo || '').trim();
    if (!clave) {
      return json(403, {
        error: 'Zoom no registra tu asistencia con este correo. Escribe el codigo que dio el ponente al terminar la clase.',
        estado: 'requiere-codigo',
      });
    }

    const { data: secreto } = await db
      .from('webinar_secretos')
      .select('codigo')
      .eq('webinar_id', webinar.id)
      .maybeSingle();

    if (!secreto?.codigo) {
      return json(403, {
        error: 'Este webinar todavia no tiene codigo de asistencia configurado. Escribenos y lo revisamos.',
      });
    }

    const coincide =
      clave.toLowerCase() === String(secreto.codigo).trim().toLowerCase();

    if (!coincide) {
      return json(403, {
        error: 'Ese codigo no es el de esta clase. Revisa que este bien escrito.',
        estado: 'codigo-invalido',
      });
    }

    const { error: errMarcar } = await db
      .from('webinar_registros')
      .update({ asistio: true, metodo: 'codigo', verificado_en: new Date().toISOString() })
      .eq('id', registro.id);

    if (errMarcar) throw new Error(errMarcar.message);

    return json(200, {
      ok: true,
      via: 'codigo',
      folio: registro.folio || generarFolio(),
      plantilla: plantillaDe(webinar),
    });
  } catch (err) {
    console.error('Webinar unlock error:', err.message);
    return json(500, { error: err.message });
  }
};
