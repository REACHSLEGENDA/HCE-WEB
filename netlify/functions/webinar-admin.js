// Acciones del panel de administracion sobre un webinar.
//
// El codigo de asistencia no se puede leer ni escribir desde el navegador
// (su tabla tiene RLS sin politicas a proposito), asi que pasa por aqui. La
// funcion valida el token del administrador antes de tocar nada.

import { admin, adminDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';
import { sincronizarAsistencia } from './_webinars.js';

const CAMPOS_WEBINAR =
  'id, title, zoom_id, zoom_tipo, minutos_minimos, constancia_estado, sincronizado_en';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseListo()) {
    return json(500, { error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Netlify.' });
  }

  try {
    const usuario = await adminDesdeToken(event.headers);
    if (!usuario) return json(403, { error: 'Solo un administrador puede hacer esto.' });

    const { accion, webinarId, codigo = '' } = JSON.parse(event.body || '{}');
    if (!webinarId) return json(400, { error: 'Falta el webinar.' });

    const db = admin();

    if (accion === 'leer-codigo') {
      const { data } = await db
        .from('webinar_secretos')
        .select('codigo')
        .eq('webinar_id', webinarId)
        .maybeSingle();

      return json(200, { codigo: data?.codigo || '' });
    }

    if (accion === 'guardar-codigo') {
      const limpio = String(codigo || '').trim();

      if (!limpio) {
        await db.from('webinar_secretos').delete().eq('webinar_id', webinarId);
        return json(200, { ok: true, codigo: '' });
      }

      const { error } = await db.from('webinar_secretos').upsert(
        { webinar_id: webinarId, codigo: limpio, actualizado_en: new Date().toISOString() },
        { onConflict: 'webinar_id' }
      );

      if (error) throw new Error(error.message);
      return json(200, { ok: true, codigo: limpio });
    }

    if (accion === 'sincronizar') {
      const { data: webinar, error } = await db
        .from('webinars')
        .select(CAMPOS_WEBINAR)
        .eq('id', webinarId)
        .single();

      if (error || !webinar) return json(404, { error: 'Ese webinar ya no existe.' });

      if (!webinar.zoom_id) {
        return json(400, {
          error: 'Este webinar no tiene ID de Zoom, asi que no hay reporte que consultar.',
        });
      }

      const resultado = await sincronizarAsistencia(db, webinar, { forzar: true });

      if (!resultado.corrio) {
        const motivos = {
          'sin-zoom': 'Falta configurar las credenciales de Zoom en Netlify.',
          'zoom-error':
            'Zoom todavia no entrega el reporte. Suele tardar unos minutos despues de que termina la sesion.',
        };
        return json(200, {
          ok: false,
          mensaje: motivos[resultado.motivo] || 'No se pudo consultar el reporte.',
        });
      }

      return json(200, {
        ok: true,
        participantes: resultado.participantes,
        actualizados: resultado.actualizados,
      });
    }

    return json(400, { error: 'Accion no reconocida.' });
  } catch (err) {
    console.error('Webinar admin error:', err.message);
    return json(500, { error: err.message });
  }
};
