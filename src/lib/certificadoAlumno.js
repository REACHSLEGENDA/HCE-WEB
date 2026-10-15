// Descarga y verificación de certificados desde el portal del alumno.
//
// El PDF con QR (descargarCertificadoPdf) y la URL pública de verificación
// (urlVerificacion) viven en ./certificados.js. Se leen del módulo completo
// para que, si alguna de las dos aún no existe, el portal siga funcionando con
// la imagen PNG de siempre en lugar de romper la compilación.

import * as libCertificados from './certificados';

const SITIO = 'https://healthcareexp.com';

/** ¿Ya está disponible el PDF con QR? */
export const hayPdf = () => typeof libCertificados.descargarCertificadoPdf === 'function';

/** URL pública donde cualquiera puede verificar el certificado. */
export function urlVerificacionDe(folio) {
  if (!folio) return '';
  if (typeof libCertificados.urlVerificacion === 'function') return libCertificados.urlVerificacion(folio);
  return `${SITIO}/verificar/${encodeURIComponent(folio)}`;
}

/** Ruta dentro de este mismo sitio (sirve también en pruebas locales). */
export const rutaVerificacion = (folio) => (folio ? `/verificar/${encodeURIComponent(folio)}` : '');

/**
 * Descarga el certificado. Con formato 'pdf' (el principal) usa el PDF con QR;
 * si todavía no existe, o con formato 'png', descarga la imagen. Devuelve el
 * certificado actualizado (puede traer la imagen recién generada).
 */
export async function descargarCertificadoAlumno({ certificado, curso, nombre, formato = 'pdf' }) {
  if (formato === 'pdf' && hayPdf()) {
    const resultado = await libCertificados.descargarCertificadoPdf({ certificado, curso, nombre });
    return resultado && typeof resultado === 'object' && resultado.id ? resultado : certificado;
  }
  let actualizado = certificado;
  if (!certificado.pdf_url || certificado.pdf_url === 'local-simulated') {
    actualizado = await libCertificados.generarImagenCertificado({ certificado, curso, nombre });
  }
  if (!actualizado?.pdf_url) throw new Error('La imagen del certificado todavía no está disponible.');
  await libCertificados.descargarArchivo(actualizado.pdf_url, `Certificado_${actualizado.folio || 'HCE'}.png`);
  return actualizado;
}

/** Copia el enlace de verificación; devuelve true si se pudo. */
export async function copiarEnlaceVerificacion(folio) {
  const url = urlVerificacionDe(folio);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Navegadores sin portapapeles: se usa un campo temporal.
    try {
      const campo = document.createElement('textarea');
      campo.value = url;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(campo);
      return ok;
    } catch {
      return false;
    }
  }
}
