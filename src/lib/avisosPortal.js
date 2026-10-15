// Avisos de la campanita del portal del alumno (tabla notificaciones_portal,
// ver supabase/portal-alumno.sql). Los escribe el servidor en cada evento; el
// alumno solo los lee y los marca como leídos.
//
// Antes de correr la migración la tabla no existe: `cargarAvisos` responde
// `{ disponible: false }` y la campanita sigue con los avisos calculados del
// avance, sin mostrar error.

import { supabase } from './supabase';

const FALTANTE = ['42P01', '42703', 'PGRST204', 'PGRST205', 'PGRST202', '42883'];
export const esTablaFaltante = (error) => Boolean(error && (FALTANTE.includes(error.code)
  || (/notificaciones_portal/.test(error.message || '') && /does not exist|schema cache/i.test(error.message || ''))));

const LIMITE = 40;

/** Los últimos avisos del alumno: `{ disponible, avisos }`. Lanza si falla la red. */
export async function cargarAvisos(userId) {
  if (!userId) return { disponible: false, avisos: [] };
  const { data, error } = await supabase
    .from('notificaciones_portal')
    .select('id, tipo, titulo, cuerpo, enlace, leida, creada_en')
    .eq('user_id', userId)
    .order('creada_en', { ascending: false })
    .limit(LIMITE);
  if (error) {
    if (esTablaFaltante(error)) return { disponible: false, avisos: [] };
    throw new Error(error.message || 'No se pudieron cargar tus avisos.');
  }
  return { disponible: true, avisos: data || [] };
}

/** Marca como leídos los avisos indicados (o todos los del alumno si `ids` es null). */
export async function marcarAvisosLeidos(userId, ids = null) {
  if (!userId) return;
  let consulta = supabase
    .from('notificaciones_portal')
    .update({ leida: true, leida_en: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('leida', false);
  if (ids) {
    if (!ids.length) return;
    consulta = consulta.in('id', ids);
  }
  const { error } = await consulta;
  if (error && !esTablaFaltante(error)) throw new Error(error.message || 'No se pudieron marcar como leídos.');
}

// Avisos calculados del avance (certificado listo, curso a medias, curso sin
// empezar): no viven en la base, así que lo "ya visto" se recuerda en este
// navegador para que no cuenten como nuevos cada vez.
const claveVistos = (userId) => `hceAvisosVistos_${userId}`;

export function leerVistos(userId) {
  try {
    const lista = JSON.parse(localStorage.getItem(claveVistos(userId)) || '[]');
    return new Set(Array.isArray(lista) ? lista : []);
  } catch {
    return new Set();
  }
}

export function guardarVistos(userId, ids) {
  try {
    localStorage.setItem(claveVistos(userId), JSON.stringify([...ids].slice(-200)));
  } catch { /* sin almacenamiento: se vuelven a contar */ }
}

/** "hace 5 min", "hace 3 h", "ayer", "12 oct". */
export function haceCuanto(iso, ahora = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((ahora - t) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Interpreta el enlace de un aviso: `{ tab }`, `{ courseId, leccionId }` o `{ url }`. */
export function destinoDeEnlace(enlace) {
  const texto = String(enlace || '').trim();
  if (!texto) return null;
  let url;
  try {
    url = new URL(texto, 'https://portal.local');
  } catch {
    return null;
  }
  const aula = /^\/classroom\/([^/?#]+)/.exec(url.pathname);
  if (aula) return { courseId: decodeURIComponent(aula[1]), leccionId: url.searchParams.get('leccion') };
  if (url.pathname === '/dashboard') return { tab: url.searchParams.get('tab') || 'dashboard', curso: url.searchParams.get('curso') };
  if (url.origin === 'https://portal.local') return { url: url.pathname + url.search };
  return null;
}
