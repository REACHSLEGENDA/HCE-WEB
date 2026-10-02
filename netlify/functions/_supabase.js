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

// Solo la ausencia de una migración permite usar el comportamiento anterior;
// una falla de red o de permisos nunca debe abrir un candado de acceso.
export const esEsquemaFaltante = (error) => Boolean(error &&
  ['42P01', '42703', 'PGRST205', 'PGRST204', 'PGRST202', '42883'].includes(error.code));

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

  let { data, error } = await admin()
    .from('profiles')
    .select('rol, nombre_completo, activo')
    .eq('id', user.id)
    .single();
  if (error?.code === '42703') {
    ({ data, error } = await admin().from('profiles').select('rol, nombre_completo').eq('id', user.id).single());
  }
  if (error || data?.rol !== 'admin' || data.activo === false) return null;
  return { ...user, perfil: data };
}

// Si la cuenta puede hacer algo en el portal. Una cuenta bloqueada no puede
// nada. Una pendiente (recién registrada, sin aprobar) sí entra, se inscribe y
// compra, pero no toma los cursos: con `exigirAprobacion` también se le niega.
// Antes de correr cuentas-aprobacion.sql no existen las columnas y todas
// cuentan como habilitadas, igual que antes.
export async function cuentaHabilitada(userId, { exigirAprobacion = false } = {}) {
  const { data, error } = await admin()
    .from('profiles')
    .select('rol, activo, aprobado')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42703') return { habilitada: true };
    throw new Error(error.message);
  }
  if (!data) return { habilitada: false, error: 'No se encontró tu perfil. Vuelve a entrar al portal.' };
  if (data?.activo === false) {
    return { habilitada: false, error: 'Tu cuenta está suspendida. Escríbenos si crees que es un error.' };
  }
  if (data?.rol === 'admin') return { habilitada: true };
  if (exigirAprobacion && data?.aprobado === false) {
    return { habilitada: false, error: 'Tu acceso a los cursos todavía está en revisión. Te avisaremos cuando quede activo.' };
  }
  return { habilitada: true };
}

// Si el acceso del alumno a un curso sigue vigente. Es la misma regla que
// public.acceso_vigente() de lms-reglas.sql (días de acceso desde que se
// inscribió; si ya tiene certificado y el curso conserva el acceso, sigue
// vigente). Se calcula aquí para no depender de que la función SQL se pueda
// llamar. Sin la migración, sin reglas o sin inscripción, no hay vencimiento
// (la inscripción se revisa aparte).
export async function accesoVigente(userId, courseId) {
  const db = admin();
  const idCurso = Number(courseId);
  const { data: reglas, error } = await db
    .from('curso_reglas')
    .select('dias_acceso, conservar_acceso')
    .eq('course_id', idCurso)
    .maybeSingle();
  if (error) {
    if (esEsquemaFaltante(error)) return { vigente: true };
    throw new Error(error.message);
  }
  if (reglas?.dias_acceso == null) return { vigente: true };

  const { data: inscripcion, error: errInscripcion } = await db
    .from('inscripciones')
    .select('created_at')
    .eq('user_id', userId)
    .eq('course_id', idCurso)
    .maybeSingle();
  if (errInscripcion) throw new Error(errInscripcion.message);
  if (!inscripcion?.created_at) return { vigente: true };

  const vence = new Date(new Date(inscripcion.created_at).getTime() + Number(reglas.dias_acceso) * 24 * 60 * 60 * 1000);
  if (vence > new Date()) return { vigente: true, vence };

  if (reglas.conservar_acceso) {
    const { data: certificado, error: errCertificado } = await db
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', idCurso)
      .limit(1);
    if (errCertificado) throw new Error(errCertificado.message);
    if (certificado?.length) return { vigente: true, vence };
  }

  const fecha = vence.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
  return {
    vigente: false,
    vence,
    error: `Tu acceso a este curso terminó el ${fecha}. Si necesitas más tiempo, escríbenos.`,
  };
}

// Deja constancia de una acción de administrador en la bitácora del portal.
// Si la tabla no existe todavía, no pasa nada.
export async function registrarAccionAdmin({ adminId, accion, objetivoUserId = null, courseId = null, detalle = {} }) {
  try {
    await admin().from('actividad_portal').insert([{
      user_id: adminId,
      tipo: 'admin',
      objetivo_user_id: objetivoUserId,
      course_id: courseId,
      detalle: { accion, ...detalle },
    }]);
  } catch {
    // La bitácora es secundaria.
  }
}

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
