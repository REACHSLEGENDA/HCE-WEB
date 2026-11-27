// Países del registro: lada del teléfono, dígitos del número local y nombre
// con el que se guarda. Sirve para preseleccionar la lada con el país de la
// visita y para que "bolivia", "BOLIVIA" y "Bolivia " cuenten como un solo país.

export const PAISES = [
  { iso: 'MX', nombre: 'México', lada: '+52', digitos: '10' },
  { iso: 'US', nombre: 'Estados Unidos', lada: '+1', digitos: '10' },
  { iso: 'CO', nombre: 'Colombia', lada: '+57', digitos: '10' },
  { iso: 'AR', nombre: 'Argentina', lada: '+54', digitos: '10' },
  { iso: 'CL', nombre: 'Chile', lada: '+56', digitos: '9' },
  { iso: 'PE', nombre: 'Perú', lada: '+51', digitos: '9' },
  { iso: 'EC', nombre: 'Ecuador', lada: '+593', digitos: '9' },
  { iso: 'GT', nombre: 'Guatemala', lada: '+502', digitos: '8' },
  { iso: 'HN', nombre: 'Honduras', lada: '+504', digitos: '8' },
  { iso: 'NI', nombre: 'Nicaragua', lada: '+505', digitos: '8' },
  { iso: 'CR', nombre: 'Costa Rica', lada: '+506', digitos: '8' },
  { iso: 'SV', nombre: 'El Salvador', lada: '+503', digitos: '8' },
  { iso: 'VE', nombre: 'Venezuela', lada: '+58', digitos: '10' },
  { iso: 'BO', nombre: 'Bolivia', lada: '+591', digitos: '8' },
  { iso: 'PY', nombre: 'Paraguay', lada: '+595', digitos: '9' },
  { iso: 'UY', nombre: 'Uruguay', lada: '+598', digitos: '8' },
  { iso: 'PA', nombre: 'Panamá', lada: '+507', digitos: '8' },
  { iso: 'PR', nombre: 'Puerto Rico', lada: '+1787', digitos: '7' },
  { iso: 'DO', nombre: 'República Dominicana', lada: '+1809', digitos: '7' },
  { iso: 'CU', nombre: 'Cuba', lada: '+53', digitos: '8' },
  { iso: 'HT', nombre: 'Haití', lada: '+509', digitos: '8' },
  { iso: 'BR', nombre: 'Brasil', lada: '+55', digitos: '10 a 11' },
  { iso: 'ES', nombre: 'España', lada: '+34', digitos: '9' },
  { iso: 'FR', nombre: 'Francia', lada: '+33', digitos: '9' },
];

// Otras formas comunes de escribir el mismo país.
const ALIAS = {
  mexico: 'México', mex: 'México', 'estados unidos mexicanos': 'México',
  usa: 'Estados Unidos', eua: 'Estados Unidos', eeuu: 'Estados Unidos', 'ee.uu.': 'Estados Unidos', 'united states': 'Estados Unidos',
  peru: 'Perú', panama: 'Panamá', haiti: 'Haití', espana: 'España', brazil: 'Brasil', france: 'Francia',
  'bolivia (estado plurinacional de)': 'Bolivia', 'estado plurinacional de bolivia': 'Bolivia',
  'rep. dominicana': 'República Dominicana', 'republica dominicana': 'República Dominicana',
};

const clave = (texto) => String(texto || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const POR_CLAVE = new Map(PAISES.map((p) => [clave(p.nombre), p.nombre]));

/**
 * Nombre con el que se guarda y se agrupa un país. Si es uno conocido, su
 * nombre oficial ("bolivia" -> "Bolivia"); si no, el texto con mayúscula
 * inicial en cada palabra. Vacío -> ''.
 */
export function normalizarPais(texto) {
  const k = clave(texto);
  if (!k) return '';
  const conocido = POR_CLAVE.get(k) || ALIAS[k];
  if (conocido) return conocido;
  return k.split(' ').map((p) => (p ? p[0].toLocaleUpperCase('es') + p.slice(1) : p)).join(' ');
}

export const paisPorIso = (iso) => PAISES.find((p) => p.iso === String(iso || '').toUpperCase()) || null;
export const paisPorLada = (lada) => PAISES.find((p) => p.lada === lada) || null;
