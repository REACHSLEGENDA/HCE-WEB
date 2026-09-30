// Tarea programada: confirma la asistencia de las sesiones en vivo que ya
// terminaron, aunque el alumno no vuelva a abrir la lección.
//
// Cada hora revisa las sesiones de los últimos 3 días. Zoom tarda en publicar
// el reporte, así que una sesión se vuelve a revisar hasta 24 horas después de
// su final; después de eso el reporte ya no cambia.

import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { isConfigured as zoomListo } from './_zoom.js';
import { cargarSesion, sincronizar, ventana } from './_sesiones.js';

const DIA = 24 * 60 * 60 * 1000;

export default async () => {
  if (!supabaseListo() || !zoomListo()) {
    return new Response('Sin configurar', { status: 200 });
  }

  const db = admin();
  const ahora = Date.now();
  const { data: sesiones, error } = await db
    .from('sesiones_clase')
    .select('leccion_id, inicia_en, duracion_min, sincronizado_en')
    .gte('inicia_en', new Date(ahora - 3 * DIA).toISOString())
    .lte('inicia_en', new Date(ahora).toISOString());

  if (error) {
    // Antes de la migración la tabla no existe.
    console.log('Sesiones: no se pudo consultar:', error.message);
    return new Response('Sin tabla', { status: 200 });
  }

  const resumen = { revisadas: 0, asistencias: 0 };
  for (const s of sesiones || []) {
    const { fin } = ventana(s);
    if (ahora < fin) continue;
    // Ya revisada con el reporte final (más de un día después del cierre).
    if (s.sincronizado_en && new Date(s.sincronizado_en).getTime() > fin + DIA) continue;

    try {
      const datos = await cargarSesion(db, s.leccion_id);
      if (!datos?.sesion) continue;
      const r = await sincronizar(db, datos);
      if (r.corrio) {
        resumen.revisadas += 1;
        resumen.asistencias += r.asistieron || 0;
      }
    } catch (err) {
      console.error('Sesión', s.leccion_id, err.message);
    }
  }

  console.log('Asistencia de sesiones:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Cada hora, al minuto 20.
export const config = { schedule: '20 * * * *' };
