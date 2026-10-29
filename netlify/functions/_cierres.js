// Cierre de inscripciones del Paris International Diploma in ECMO 2026.
//
// 29 oct 2026: se cerraron todas las inscripciones de París (diploma completo,
// Step 1, Step 2 y Alumni Pass). Los cobros nuevos se rechazan aquí; quien ya
// pagó conserva su lugar y puede terminar su registro.
//
// Para reabrir sin tocar el código: variable de entorno
// INSCRIPCIONES_PARIS_ABIERTAS=1 en Netlify (y volver a publicar). La página
// tiene su propio interruptor en src/lib/cierreParis.js.

export const MENSAJE_CIERRE_PARIS = 'Las inscripciones del Paris International Diploma in ECMO 2026 están cerradas.';

export const parisCerrado = () => process.env.INSCRIPCIONES_PARIS_ABIERTAS !== '1';

/** Respuesta 409 para las funciones de cobro de París, o null si está abierto. */
export function respuestaCierreParis() {
  if (!parisCerrado()) return null;
  return {
    statusCode: 409,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: MENSAJE_CIERRE_PARIS, estado: 'cerrado' }),
  };
}
