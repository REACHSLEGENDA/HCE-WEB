// Logica compartida de asistencia a webinars.
//
// La usa tanto el alumno (cuando intenta desbloquear su constancia) como el
// panel de administracion (boton de sincronizar). Vive aparte para que las dos
// rutas apliquen exactamente el mismo criterio de "asistio".

import { obtenerParticipantes, minutosPorCorreo, isConfigured as zoomListo } from './_zoom.js';

// Cuanto tiempo se considera fresco el ultimo reporte de Zoom. Evita pegarle a
// la API en cada clic cuando varios alumnos abren el portal al mismo tiempo.
const FRESCURA_MS = 10 * 60 * 1000;

export async function sincronizarAsistencia(db, webinar, { forzar = false } = {}) {
  if (!webinar?.zoom_id || !zoomListo()) {
    return { corrio: false, motivo: 'sin-zoom' };
  }

  if (!forzar && webinar.sincronizado_en) {
    const edad = Date.now() - new Date(webinar.sincronizado_en).getTime();
    if (edad < FRESCURA_MS) return { corrio: false, motivo: 'reciente' };
  }

  let participantes;
  try {
    participantes = await obtenerParticipantes(webinar.zoom_id, webinar.zoom_tipo);
  } catch (err) {
    // El reporte no existe hasta que el seminario termina: mientras siga en
    // curso Zoom responde 404 y eso no es una falla que valga la pena propagar.
    console.error('Zoom reporte error:', err.message);
    return { corrio: false, motivo: 'zoom-error', error: err.message };
  }

  const minutosPorEmail = minutosPorCorreo(participantes);

  const { data: registros, error } = await db
    .from('webinar_registros')
    .select('id, webinar_id, email, asistio, minutos, metodo')
    .eq('webinar_id', webinar.id);

  if (error) throw new Error(error.message);

  const minimo = Math.max(webinar.minutos_minimos || 0, 0);
  const ahora = new Date().toISOString();
  const filas = [];

  for (const registro of registros || []) {
    const minutos = minutosPorEmail.get(registro.email);
    // Quien no aparece en el reporte se deja como estaba: pudo haber entrado
    // con otro correo y desbloquear despues con el codigo.
    if (minutos === undefined) continue;

    const asistio = minutos >= minimo;
    if (registro.asistio === asistio && registro.minutos === minutos) continue;

    const fila = {
      id: registro.id,
      webinar_id: registro.webinar_id,
      email: registro.email,
      minutos,
      asistio: registro.asistio || asistio,
    };

    // Solo se marca el metodo cuando es Zoom quien confirma por primera vez.
    // Si la persona ya se habia desbloqueado con el codigo, se respeta.
    if (asistio && !registro.asistio) {
      fila.metodo = 'zoom';
      fila.verificado_en = ahora;
    }

    filas.push(fila);
  }

  if (filas.length > 0) {
    const { error: errUpsert } = await db
      .from('webinar_registros')
      .upsert(filas, { onConflict: 'id' });
    if (errUpsert) throw new Error(errUpsert.message);
  }

  await db
    .from('webinars')
    .update({ sincronizado_en: ahora })
    .eq('id', webinar.id);

  return {
    corrio: true,
    participantes: minutosPorEmail.size,
    actualizados: filas.length,
  };
}

// Folio corto y legible para la constancia. Mismo formato que usan los cursos.
export function generarFolio() {
  return `WEB-${Math.floor(100000 + Math.random() * 900000)}`;
}
