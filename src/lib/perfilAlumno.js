// Datos y validación del perfil del alumno (pestaña "Mi perfil").
//
// Las columnas de cédula y facturación se agregan con supabase/portal-alumno.sql.
// Antes de esa migración se guardan los demás datos y se avisa con claridad que
// cédula y facturación quedan pendientes (nada de "guardado" falso).

export const CAMPOS_BASICOS = ['nombre_completo', 'telefono'];
export const CAMPOS_PROFESIONALES = ['pais', 'estado', 'grado', 'especialidad', 'institucion', 'cargo'];
export const CAMPOS_NUEVOS = ['cedula_profesional', 'rfc', 'razon_social', 'regimen_fiscal', 'codigo_postal_fiscal', 'uso_cfdi'];
export const CAMPOS_FISCALES = ['rfc', 'razon_social', 'regimen_fiscal', 'codigo_postal_fiscal', 'uso_cfdi'];
export const TODOS_LOS_CAMPOS = [...CAMPOS_BASICOS, ...CAMPOS_PROFESIONALES, ...CAMPOS_NUEVOS];

export const GRADOS = [
  'Médico Especialista', 'Médico Residente', 'Médico General', 'Perfusionista', 'Enfermero/a',
  'Terapeuta Respiratorio', 'Fisioterapeuta', 'Estudiante', 'Otro',
];

// Catálogo del SAT (c_RegimenFiscal), los que aplican a un alumno o a su institución.
export const REGIMENES = [
  ['605', '605 · Sueldos y salarios'],
  ['612', '612 · Personas físicas con actividades empresariales y profesionales'],
  ['626', '626 · Régimen Simplificado de Confianza (RESICO)'],
  ['616', '616 · Sin obligaciones fiscales'],
  ['606', '606 · Arrendamiento'],
  ['621', '621 · Incorporación fiscal'],
  ['601', '601 · General de ley personas morales'],
  ['603', '603 · Personas morales con fines no lucrativos'],
];

// c_UsoCFDI, los que se usan para pagar un curso.
export const USOS_CFDI = [
  ['G03', 'G03 · Gastos en general'],
  ['D10', 'D10 · Pagos por servicios educativos (colegiaturas)'],
  ['G01', 'G01 · Adquisición de mercancías'],
  ['S01', 'S01 · Sin efectos fiscales'],
];

/** Valores iniciales: lo de la tabla profiles y, si no hay, lo del registro. */
export function valoresIniciales(profile, user) {
  const meta = user?.user_metadata || {};
  return Object.fromEntries(TODOS_LOS_CAMPOS.map((c) => [c, String(profile?.[c] ?? meta[c] ?? '')]));
}

const RFC = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z\d]{2}[A\d])$/;

export const esMexico = (pais) => /^m[eé]xico$/i.test(String(pais || '').trim());

/** Normaliza lo que se escribe (RFC en mayúsculas, CP solo dígitos…). */
export function normalizar(campo, valor) {
  const v = String(valor ?? '');
  if (campo === 'rfc') return v.toUpperCase().replace(/[\s-]/g, '').slice(0, 13);
  if (campo === 'codigo_postal_fiscal') return v.replace(/\D/g, '').slice(0, 5);
  if (campo === 'razon_social') return v.toUpperCase();
  return v;
}

/** Errores por campo (objeto vacío = todo bien). */
export function validarPerfil(f) {
  const e = {};
  if (!f.nombre_completo.trim()) e.nombre_completo = 'Escribe tu nombre completo.';
  else if (f.nombre_completo.trim().length < 5) e.nombre_completo = 'Escribe nombre y apellidos.';

  const digitos = f.telefono.replace(/\D/g, '');
  if (!f.telefono.trim()) e.telefono = 'Escribe tu teléfono.';
  else if (!/^[+\d\s()-]+$/.test(f.telefono) || digitos.length < 8 || digitos.length > 15) e.telefono = 'Usa solo números (de 8 a 15 dígitos, con lada).';

  const cedula = f.cedula_profesional.trim();
  if (cedula) {
    if (esMexico(f.pais) && !/^\d{7,8}$/.test(cedula)) e.cedula_profesional = 'La cédula de la SEP tiene 7 u 8 dígitos, sin espacios.';
    else if (cedula.length > 30) e.cedula_profesional = 'Máximo 30 caracteres.';
  }

  const rfc = f.rfc.trim();
  if (rfc) {
    const m = RFC.exec(rfc);
    const mes = m ? Number(m[3]) : 0;
    const dia = m ? Number(m[4]) : 0;
    if (!m || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      e.rfc = 'RFC no válido. Persona física: 13 caracteres (p. ej. GOMC800101AB1); moral: 12.';
    }
  }
  const cp = f.codigo_postal_fiscal.trim();
  if (cp && !/^\d{5}$/.test(cp)) e.codigo_postal_fiscal = 'El código postal tiene 5 dígitos.';

  // Si empezó a llenar la facturación, se piden los datos que exige el CFDI 4.0.
  const algunoFiscal = CAMPOS_FISCALES.some((c) => String(f[c] || '').trim());
  if (algunoFiscal) {
    if (!rfc) e.rfc = e.rfc || 'Para facturar escribe tu RFC.';
    if (!f.razon_social.trim()) e.razon_social = 'Escribe el nombre o razón social tal como aparece en tu constancia fiscal.';
    if (!f.regimen_fiscal) e.regimen_fiscal = 'Elige tu régimen fiscal.';
    if (!cp) e.codigo_postal_fiscal = e.codigo_postal_fiscal || 'Escribe el código postal de tu constancia fiscal.';
    if (!f.uso_cfdi) e.uso_cfdi = 'Elige el uso del CFDI.';
  }
  return e;
}

export const faltaColumna = (error) => Boolean(error && (['42703', 'PGRST204'].includes(error.code)
  || /column .* (does not exist|of 'profiles')|could not find the .* column/i.test(error.message || '')));

/**
 * Guarda el perfil. Si faltan columnas (migración pendiente) guarda lo que se
 * pueda y devuelve qué campos no se guardaron.
 */
export async function guardarPerfil({ valores, updateProfile, updateUserMetadata }) {
  const limpio = Object.fromEntries(TODOS_LOS_CAMPOS.map((c) => [c, String(valores[c] ?? '').trim()]));
  const intentos = [
    TODOS_LOS_CAMPOS,
    [...CAMPOS_BASICOS, ...CAMPOS_PROFESIONALES],
    CAMPOS_BASICOS,
  ];
  let guardados = null;
  let ultimoError = null;
  for (const campos of intentos) {
    try {
      await updateProfile(Object.fromEntries(campos.map((c) => [c, limpio[c] || null])));
      guardados = campos;
      break;
    } catch (err) {
      ultimoError = err;
      if (!faltaColumna(err)) throw err;
    }
  }
  if (!guardados) throw ultimoError || new Error('No se pudo guardar tu perfil.');

  // El registro guardaba los datos profesionales en la sesión: se mantienen
  // iguales para las pantallas que aún los leen de ahí.
  await updateUserMetadata(Object.fromEntries(CAMPOS_PROFESIONALES.map((c) => [c, limpio[c]])));

  const pendientes = TODOS_LOS_CAMPOS.filter((c) => !guardados.includes(c) && !CAMPOS_PROFESIONALES.includes(c) && limpio[c]);
  return { pendientes };
}
