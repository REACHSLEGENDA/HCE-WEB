// Zona horaria: las horas que captura el administrador sin zona (como la de
// los webinars) se entienden en la hora del centro de México, y cada alumno las
// ve en la suya: la que elija en su perfil o, si no eligió, la de su equipo.

export const ZONA_PORTAL = 'America/Mexico_City';
const CLAVE = 'hce_zona_horaria';

export const ZONAS = [
  ['America/Mexico_City', 'Centro de México (CDMX, Guadalajara, Monterrey)'],
  ['America/Cancun', 'Quintana Roo (Cancún)'],
  ['America/Chihuahua', 'Chihuahua'],
  ['America/Mazatlan', 'Pacífico mexicano (Sinaloa, Nayarit, BCS)'],
  ['America/Hermosillo', 'Sonora'],
  ['America/Tijuana', 'Baja California (Tijuana)'],
  ['America/Guatemala', 'Guatemala, El Salvador, Honduras, Nicaragua, Costa Rica'],
  ['America/Panama', 'Panamá'],
  ['America/Bogota', 'Colombia, Ecuador, Perú'],
  ['America/Caracas', 'Venezuela'],
  ['America/Santo_Domingo', 'República Dominicana, Puerto Rico'],
  ['America/La_Paz', 'Bolivia'],
  ['America/Santiago', 'Chile'],
  ['America/Asuncion', 'Paraguay'],
  ['America/Argentina/Buenos_Aires', 'Argentina'],
  ['America/Montevideo', 'Uruguay'],
  ['America/Sao_Paulo', 'Brasil (São Paulo)'],
  ['America/New_York', 'Estados Unidos (Este)'],
  ['America/Chicago', 'Estados Unidos (Centro)'],
  ['America/Denver', 'Estados Unidos (Montaña)'],
  ['America/Los_Angeles', 'Estados Unidos (Pacífico)'],
  ['Europe/Madrid', 'España (península)'],
  ['Atlantic/Canary', 'España (Canarias)'],
  ['Europe/Paris', 'Francia, Europa central'],
];

export function zonaDelEquipo() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_PORTAL;
  } catch {
    return ZONA_PORTAL;
  }
}

/** Guarda la zona elegida en el perfil para usarla en todo el portal. */
export function recordarZona(zona) {
  try {
    if (zona) localStorage.setItem(CLAVE, zona);
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento se usa la del equipo.
  }
}

/** La zona con la que se muestran las horas: la elegida o la del equipo. */
export function zonaPreferida() {
  try {
    return localStorage.getItem(CLAVE) || zonaDelEquipo();
  } catch {
    return zonaDelEquipo();
  }
}

export function nombreZona(zona = zonaPreferida()) {
  const conocida = ZONAS.find(([id]) => id === zona);
  // Sin la lista de ciudades entre paréntesis, pero conservando la región
  // cuando es una sola ("Estados Unidos (Pacífico)").
  if (conocida) return conocida[1].replace(/ \([^)]*,[^)]*\)/, '');
  return zona.split('/').pop().replace(/_/g, ' ');
}

/** Minutos de diferencia con UTC que tiene una zona en un instante. */
function desfaseMinutos(instante, zona) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(instante).map((p) => [p.type, p.value])
  );
  const comoUtc = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
  return Math.round((comoUtc - instante.getTime()) / 60000);
}

/**
 * Convierte una fecha "sin zona" ("2026-09-25T17:00" o "2026-09-25 17:00:00")
 * capturada en `zona` a un instante real (Date). Si ya trae zona, la respeta.
 */
export function fechaEnZona(texto, zona = ZONA_PORTAL) {
  if (!texto) return null;
  const limpio = String(texto).trim().replace(' ', 'T');
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(limpio)) {
    const d = new Date(limpio);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = limpio.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, a, mes, dia, h = '0', min = '0', s = '0'] = m;
  const comoUtc = Date.UTC(+a, +mes - 1, +dia, +h, +min, +s);
  // Dos pasadas por si el desfase cambia justo en esa fecha (horario de verano).
  let instante = new Date(comoUtc - desfaseMinutos(new Date(comoUtc), zona) * 60000);
  instante = new Date(comoUtc - desfaseMinutos(instante, zona) * 60000);
  return instante;
}

/** Fecha y hora en la zona del alumno, con la zona al final si se pide. */
export function formatearFechaHora(fecha, { zona = zonaPreferida(), conZona = true, opciones } = {}) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  const texto = d.toLocaleString('es-MX', {
    timeZone: zona,
    ...(opciones || { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
  });
  return conZona ? `${texto} (hora de ${nombreZona(zona)})` : texto;
}

/** "AAAA-MM-DD" del día en la zona del alumno (para agrupar en el calendario). */
export function diaEnZona(fecha, zona = zonaPreferida()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
