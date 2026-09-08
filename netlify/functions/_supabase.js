// Cliente de Supabase para las funciones de Netlify.
//
// Usa la llave de servicio, que se salta las politicas RLS. Por eso vive solo
// aqui, del lado del servidor: es la unica manera de que una funcion pueda
// escribir la asistencia de otro usuario o leer el codigo del webinar, que el
// navegador nunca debe poder consultar.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isConfigured = () => Boolean(url && serviceKey);

let cliente = null;

export function admin() {
  if (!isConfigured()) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!cliente) {
    cliente = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cliente;
}

// Valida el token que manda el navegador y devuelve el usuario ya verificado.
// Nunca se confia en el user_id que venga en el cuerpo de la peticion.
export async function usuarioDesdeToken(headers = {}) {
  const bruto = headers.authorization || headers.Authorization || '';
  const token = bruto.startsWith('Bearer ') ? bruto.slice(7) : '';
  if (!token) return null;

  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Igual que la anterior, pero ademas exige que el perfil tenga rol de admin.
export async function adminDesdeToken(headers = {}) {
  const user = await usuarioDesdeToken(headers);
  if (!user) return null;

  const { data } = await admin()
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single();

  if (data?.rol !== 'admin') return null;
  return { ...user, perfil: data };
}

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
