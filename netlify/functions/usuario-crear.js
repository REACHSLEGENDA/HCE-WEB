// Alta de cuentas por un administrador (alumnos o administradores).
//
// La cuenta se crea con la llave de servicio, así que la sesión del
// administrador no cambia (crearla desde el navegador con signUp lo sacaba de
// su propia sesión). El correo queda confirmado y la cuenta ya aprobada.
//
// POST { tipo: 'admin'|'alumno', email, password, nombre_completo,
//        telefono?, pais?, especialidad?, institucion?, cargo? }
// Responde { userId }.

import { admin, adminDesdeToken, registrarAccionAdmin, json, isConfigured as supabaseListo } from './_supabase.js';

const CAMPOS_OPCIONALES = ['telefono', 'pais', 'especialidad', 'institucion', 'cargo'];
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Los errores de Supabase llegan en inglés: se traducen los que puede ver el admin.
function errorDeAlta(error) {
  const texto = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (/email_exists|already been registered|already registered|user_already_exists|duplicate/.test(texto)) {
    return json(409, { error: 'Ya existe una cuenta con ese correo.' });
  }
  if (/weak_password|password/.test(texto)) {
    return json(400, { error: 'La contraseña no es válida: usa al menos 8 caracteres, con letras y números.' });
  }
  if (/email_address_invalid|invalid email|unable to validate email/.test(texto)) {
    return json(400, { error: 'El correo no es válido.' });
  }
  return json(500, { error: `No se pudo crear la cuenta: ${error?.message || 'error desconocido'}` });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!supabaseListo()) {
    return json(500, { error: 'Las cuentas no están configuradas en el servidor.' });
  }

  try {
    const administrador = await adminDesdeToken(event.headers);
    if (!administrador) return json(403, { error: 'Solo un administrador puede crear cuentas.' });

    const cuerpo = JSON.parse(event.body || '{}');
    const tipo = cuerpo.tipo === 'admin' ? 'admin' : cuerpo.tipo === 'alumno' ? 'alumno' : null;
    const email = String(cuerpo.email || '').trim().toLowerCase();
    const password = String(cuerpo.password || '');
    const nombre = String(cuerpo.nombre_completo || '').trim();

    if (!tipo) return json(400, { error: 'Elige si la cuenta es de alumno o de administrador.' });
    if (!CORREO_VALIDO.test(email)) return json(400, { error: 'El correo no es válido.' });
    if (password.length < 8) return json(400, { error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (!nombre) return json(400, { error: 'Falta el nombre completo.' });

    const db = admin();
    const { data: creado, error: errAlta } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombre },
    });
    if (errAlta || !creado?.user) return errorDeAlta(errAlta);
    const userId = creado.user.id;

    const datos = { email, nombre_completo: nombre, rol: tipo === 'admin' ? 'admin' : 'estudiante' };
    CAMPOS_OPCIONALES.forEach((campo) => {
      const valor = cuerpo[campo];
      if (valor != null && String(valor).trim()) datos[campo] = String(valor).trim();
    });
    const aprobacion = { aprobado: true, aprobado_en: new Date().toISOString(), activo: true };

    // El perfil lo crea el disparador de Supabase al dar de alta al usuario;
    // aquí se completa. Antes de cuentas-aprobacion.sql no existen las
    // columnas de aprobación y se guarda sin ellas.
    const guardar = async (cambios) => {
      const res = await db.from('profiles').update(cambios).eq('id', userId).select('id').maybeSingle();
      if (!res.error && !res.data) {
        return db.from('profiles').insert([{ id: userId, ...cambios }]).select('id').maybeSingle();
      }
      return res;
    };
    let res = await guardar({ ...datos, ...aprobacion });
    if (res.error?.code === '42703') res = await guardar(datos);

    if (res.error) {
      // Sin perfil la cuenta quedaría a medias: se deshace el alta.
      await db.auth.admin.deleteUser(userId).catch(() => {});
      return json(500, { error: `No se pudo guardar el perfil: ${res.error.message}` });
    }

    await registrarAccionAdmin({
      adminId: administrador.id,
      accion: tipo === 'admin' ? 'admin_creado' : 'alumno_creado',
      objetivoUserId: userId,
      detalle: { email },
    });

    return json(200, { userId });
  } catch (err) {
    console.error('Usuario crear error:', err.message);
    return json(500, { error: err.message });
  }
};
