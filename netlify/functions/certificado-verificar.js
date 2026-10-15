// Verificación pública de certificados (GET ?folio=FOL-123456).
//
// La usa la página /verificar/:folio, a la que lleva el QR del PDF: cualquier
// persona (un hospital, un empleador) puede comprobar que un certificado
// existe en nuestro registro, sin iniciar sesión.
//
// Lee con la llave de servicio, pero responde SOLO lo mínimo para verificar:
// titular, curso, fecha de emisión, vigencia y folio. Nunca el correo, la
// calificación ni otros datos del alumno.

import { admin, json, isConfigured as supabaseListo } from './_supabase.js';

// Los folios de cursos los genera certificado-emitir.js como `FOL-` + 6
// dígitos (antes los generaba el aula con el mismo formato). Se acepta un
// poco de holgura en la cantidad de dígitos por si el formato crece.
// Mismo criterio que src/pages/VerificarCertificado.jsx.
const FORMATO_FOLIO = /^FOL-\d{4,10}$/;

/** "fol 123456", "#FOL-123456" o "123456" → "FOL-123456". */
export function normalizarFolio(valor) {
  const limpio = String(valor ?? '').trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '');
  if (/^\d{4,10}$/.test(limpio)) return `FOL-${limpio}`;
  const conPrefijo = limpio.match(/^FOL-?(\d{4,10})$/);
  return conPrefijo ? `FOL-${conPrefijo[1]}` : limpio;
}

export const folioValido = (folio) => FORMATO_FOLIO.test(folio);

const CON_VIGENCIA = 'folio, created_at, vigente_hasta, profiles:user_id (nombre_completo), courses:course_id (title)';
const SIN_VIGENCIA = 'folio, created_at, profiles:user_id (nombre_completo), courses:course_id (title)';

const cabeceras = (cache) => ({
  'Content-Type': 'application/json',
  'Cache-Control': cache,
  'X-Robots-Tag': 'noindex',
});

const responder = (statusCode, body, cache = 'no-store') => ({
  ...json(statusCode, body),
  headers: cabeceras(cache),
});

/** Vigencia del certificado: permanente, vigente (hasta) o vencido (el). */
export function estadoVigencia(vigenteHasta, ahora = new Date()) {
  if (!vigenteHasta) return { estado: 'permanente', hasta: null };
  const fecha = new Date(vigenteHasta);
  if (Number.isNaN(fecha.getTime())) return { estado: 'permanente', hasta: null };
  return { estado: fecha > ahora ? 'vigente' : 'vencido', hasta: fecha.toISOString() };
}

/** Busca el folio y arma la respuesta pública, o `null` si no existe. */
export async function consultarFolio(db, folio) {
  const buscar = (columnas) => db.from('certificates').select(columnas)
    .eq('folio', folio).order('created_at', { ascending: false }).limit(1);

  let res = await buscar(CON_VIGENCIA);
  // Antes de lms-estructura.sql no existe `vigente_hasta`: todo es permanente.
  if (res.error && (res.error.code === '42703' || /vigente_hasta/.test(res.error.message || ''))) {
    res = await buscar(SIN_VIGENCIA);
  }
  if (res.error) throw new Error(res.error.message);

  const fila = res.data?.[0];
  if (!fila) return null;
  const perfil = Array.isArray(fila.profiles) ? fila.profiles[0] : fila.profiles;
  const curso = Array.isArray(fila.courses) ? fila.courses[0] : fila.courses;

  return {
    folio: fila.folio,
    titular: perfil?.nombre_completo?.trim() || null,
    curso: curso?.title || null,
    emitido_en: fila.created_at || null,
    vigencia: estadoVigencia(fila.vigente_hasta),
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return { statusCode: 405, headers: { Allow: 'GET' }, body: 'Method Not Allowed' };
  }

  const folio = normalizarFolio(event.queryStringParameters?.folio);
  if (!folioValido(folio)) {
    return responder(400, {
      error: 'El folio no tiene un formato válido. Escríbelo como aparece en el certificado, por ejemplo FOL-123456.',
      estado: 'formato-invalido',
    }, 'public, max-age=3600');
  }

  if (!supabaseListo()) {
    return responder(500, { error: 'La verificación no está disponible en este momento.' });
  }

  try {
    const certificado = await consultarFolio(admin(), folio);
    if (!certificado) {
      // Caché corta: un certificado recién emitido debe verse pronto.
      return responder(404, {
        error: 'No encontramos un certificado con ese folio.',
        estado: 'no-encontrado',
        folio,
      }, 'public, max-age=60');
    }
    return responder(200, { verificado: true, certificado }, 'public, max-age=300');
  } catch (err) {
    console.error('Certificado verificar error:', err.message);
    return responder(500, { error: 'No pudimos consultar el folio. Intenta de nuevo en un momento.' });
  }
};
