// Quién recibe los avisos para el equipo (solicitudes, pagos, errores, etc.).
// Siempre incluye el correo de la academia, además de los admins activos y los
// correos extra de AVISO_REGISTROS_PARA (separados por coma).

export const CORREO_ACADEMIA = 'academia@healthcareexp.com';

export const correosExtra = (variable = 'AVISO_REGISTROS_PARA') => String(process.env[variable] || '')
  .split(',').map((c) => c.trim()).filter(Boolean);

const unicos = (correos) => {
  const vistos = new Set();
  return correos.filter((c) => {
    const clave = String(c || '').trim().toLowerCase();
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
};

// Lista de correos. Si falla la lectura de admins, igual avisa a la academia y
// a los extra (y registra el error).
export async function correosAvisoAdmin(db, { variable = 'AVISO_REGISTROS_PARA' } = {}) {
  let admins = [];
  if (db) {
    try {
      const { data, error } = await db.from('profiles').select('email').eq('rol', 'admin').eq('activo', true);
      if (error) console.error('Avisos al equipo: no se pudo leer la lista de admins:', error.message);
      admins = (data || []).map((x) => x.email);
    } catch (error) {
      console.error('Avisos al equipo: no se pudo leer la lista de admins:', error.message);
    }
  }
  return unicos([...admins, ...correosExtra(variable), CORREO_ACADEMIA]);
}
