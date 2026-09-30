// Bitácora del portal (ver supabase/actividad-portal.sql). Nunca interrumpe
// lo que el alumno está haciendo: si falla, se ignora.

import { supabase } from './supabase';

const CLAVE_LOGIN = 'hce_login_registrado';

/** Registra el inicio de sesión una vez por sesión del navegador. */
export async function registrarLogin(userId) {
  if (!userId) return;
  try {
    if (sessionStorage.getItem(CLAVE_LOGIN) === userId) return;
    sessionStorage.setItem(CLAVE_LOGIN, userId);
  } catch {
    // Sin almacenamiento de sesión se registra igual; como mucho se duplica.
  }
  await supabase.from('actividad_portal').insert([{ user_id: userId, tipo: 'login' }]).then(() => {}, () => {});
}

export async function registrarDescarga(archivo) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase.from('actividad_portal').insert([{
      user_id: userId,
      tipo: 'descarga',
      course_id: archivo.course_id ?? null,
      detalle: { archivo_id: archivo.id, nombre: archivo.nombre },
    }]);
  } catch {
    // La bitácora es secundaria.
  }
}
