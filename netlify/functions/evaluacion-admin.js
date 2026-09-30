// Acciones del administrador sobre las evaluaciones de un alumno.
//
//   reiniciar  { userId, leccionId }  borra sus intentos de ese examen o
//              encuesta y reabre la lección, para que la vuelva a presentar
//              (el botón ↻ del reporte del alumno en TalentLMS).

import { admin, adminDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Las evaluaciones no están configuradas en el servidor.' });
  }

  try {
    const administrador = await adminDesdeToken(event.headers);
    if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

    const { accion, userId, leccionId } = JSON.parse(event.body || '{}');
    if (accion !== 'reiniciar') return json(400, { error: 'Acción no reconocida.' });
    if (!userId || !leccionId) return json(400, { error: 'Falta el alumno o la evaluación.' });

    const db = admin();
    const { error: errBorrar } = await db
      .from('evaluacion_intentos')
      .delete()
      .eq('user_id', userId)
      .eq('leccion_id', Number(leccionId));
    if (errBorrar) throw new Error(errBorrar.message);

    const { error: errAvance } = await db
      .from('leccion_progreso')
      .update({ completada: false })
      .eq('user_id', userId)
      .eq('leccion_id', Number(leccionId));
    if (errAvance) throw new Error(errAvance.message);

    return json(200, { ok: true });
  } catch (err) {
    console.error('Evaluacion admin error:', err.message);
    return json(500, { error: err.message });
  }
};
