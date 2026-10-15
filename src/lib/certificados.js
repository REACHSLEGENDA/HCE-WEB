// Certificados de los cursos.
//
// El certificado (folio, calificación, vigencia) lo emite el servidor
// (netlify/functions/certificado-emitir.js): el navegador ya no puede escribir
// en `certificates`. La imagen sí se sigue dibujando aquí, con el nombre del
// alumno sobre la plantilla del curso, y se sube a su carpeta del bucket
// 'certificates'; después el servidor la liga al certificado.

import { supabase } from './supabase';

const PLANTILLA_POR_DEFECTO =
  'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png';

/** Llama a la función de certificados con la sesión del usuario. */
export async function llamarCertificado(accion, cuerpo = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/certificado-emitir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ accion, ...cuerpo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'No se pudo emitir el certificado. Intenta de nuevo.');
    error.status = res.status;
    error.estado = data.estado;
    throw error;
  }
  return data;
}

/** Pide al servidor el certificado del curso: `{ certificado, nuevo }`. */
export const emitirCertificado = (courseId) => llamarCertificado('emitir', { courseId });

/**
 * Dibuja el nombre del alumno sobre la plantilla del curso.
 * `curso` usa los campos de `courses` (certificado_template_url, _x, _y, _font_size).
 * Devuelve un Blob PNG.
 */
export async function dibujarCertificado({ curso, nombre }) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('No se pudo cargar la plantilla del certificado.'));
    img.src = curso?.certificado_template_url || PLANTILLA_POR_DEFECTO;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo dibujar el certificado.');
  ctx.drawImage(img, 0, 0);

  const x = curso?.certificado_x ?? (canvas.width / 2);
  const y = curso?.certificado_y ?? (canvas.height / 2);
  const fontSize = curso?.certificado_font_size || 40;

  ctx.font = `bold ${fontSize}px Georgia, serif`;
  ctx.fillStyle = '#1B2B3C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nombre || 'Alumno', x, y);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen del certificado.');
  return blob;
}

/**
 * Sube la imagen a `${userId}/${courseId}_${folio}.png` del bucket
 * 'certificates' y le pide al servidor que la ligue al certificado.
 * Devuelve el certificado actualizado (con `pdf_url`).
 */
export async function subirImagenCertificado({ certificado, blob }) {
  const ruta = `${certificado.user_id}/${certificado.course_id}_${certificado.folio}.png`;
  const { error } = await supabase.storage
    .from('certificates')
    .upload(ruta, blob, { upsert: true, contentType: 'image/png' });
  if (error) throw error;

  const { certificado: actualizado } = await llamarCertificado('imagen', {
    certificadoId: certificado.id,
    ruta,
  });
  return actualizado || certificado;
}

/** Dibuja, sube y liga la imagen de un certificado ya emitido. */
export async function generarImagenCertificado({ certificado, curso, nombre }) {
  const blob = await dibujarCertificado({ curso, nombre });
  return subirImagenCertificado({ certificado, blob });
}

// ---------------------------------------------------------------------------
// Certificado en PDF, verificable con QR.
//
// El PDF lleva la imagen del certificado (plantilla + nombre) al tamaño de la
// plantilla y, en la esquina inferior derecha, un recuadro con un QR a la
// página pública /verificar/<folio>: un hospital puede escanearlo y comprobar
// que el certificado existe en nuestro registro.
// ---------------------------------------------------------------------------

const SITIO = 'https://healthcareexp.com';

// Folios de cursos: `FOL-` + dígitos (los genera certificado-emitir.js). Mismo
// criterio que netlify/functions/certificado-verificar.js.
const FORMATO_FOLIO = /^FOL-\d{4,10}$/;

/** "fol 123456", "#FOL-123456" o "123456" → "FOL-123456". */
export function normalizarFolio(valor) {
  const limpio = String(valor ?? '').trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '');
  if (/^\d{4,10}$/.test(limpio)) return `FOL-${limpio}`;
  const conPrefijo = limpio.match(/^FOL-?(\d{4,10})$/);
  return conPrefijo ? `FOL-${conPrefijo[1]}` : limpio;
}

export const folioValido = (folio) => FORMATO_FOLIO.test(String(folio || ''));

/** Dirección pública donde cualquiera puede comprobar un folio. */
export function urlVerificacion(folio) {
  return `${SITIO}/verificar/${encodeURIComponent(String(folio || '').trim())}`;
}

/** Lee un Blob de imagen y devuelve `{ img, ancho, alto }` ya cargada. */
async function imagenDesdeBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('La imagen del certificado está dañada.'));
      img.src = url;
    });
    return { img, ancho: img.naturalWidth || img.width, alto: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Pasa la imagen a JPEG sobre fondo blanco: pesa mucho menos que el PNG
 * dentro del PDF y las plantillas con transparencia no salen en negro.
 */
function imagenAJpeg({ img, ancho, alto }) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo preparar el certificado.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Descarga un Blob ya generado; si el navegador no lo permite, lo abre. */
function guardarBlob(blob, nombreArchivo) {
  const blobUrl = window.URL.createObjectURL(blob);
  // Se libera después: en iPhone la descarga lee la URL un momento después
  // del clic y revocarla de inmediato deja el archivo vacío.
  const liberar = () => setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  try {
    const a = document.createElement('a');
    if (!('download' in a)) throw new Error('Sin descarga directa');
    a.href = blobUrl;
    a.download = nombreArchivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    liberar();
  } catch (err) {
    console.warn('No se pudo descargar directo; se abre en otra pestaña:', err);
    const ventana = window.open(blobUrl, '_blank');
    liberar();
    if (!ventana) throw new Error('Tu navegador bloqueó la descarga. Intenta de nuevo.');
  }
}

/**
 * Genera y descarga el certificado en PDF (`Certificado_<folio>.pdf`).
 *
 * - `certificado`: fila de `certificates` (id, folio, user_id, course_id, pdf_url).
 * - `curso`: campos de `courses` para dibujar la plantilla si aún no hay imagen.
 * - `nombre`: nombre del alumno, solo para dibujar la imagen si falta.
 *
 * Si el certificado todavía no tiene imagen, la dibuja, la sube y la liga
 * (igual que antes); si esa subida falla, el PDF se entrega de todos modos.
 * Devuelve el certificado (actualizado con `pdf_url` si se generó la imagen),
 * para que la pantalla pueda refrescar su lista.
 */
export async function descargarCertificadoPdf({ certificado, curso, nombre }) {
  if (!certificado?.folio) throw new Error('Este certificado no tiene folio.');
  const folio = String(certificado.folio).trim();

  // 1. La imagen del certificado.
  let actualizado = certificado;
  let blob = null;
  const tieneImagen = certificado.pdf_url && certificado.pdf_url !== 'local-simulated';
  if (tieneImagen) {
    try {
      const res = await fetch(certificado.pdf_url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (err) {
      // Imagen borrada o inaccesible: se vuelve a dibujar con la plantilla.
      console.warn('No se pudo leer la imagen guardada; se dibuja de nuevo:', err);
    }
  }
  if (!blob) {
    blob = await dibujarCertificado({ curso, nombre });
    try {
      actualizado = await subirImagenCertificado({ certificado, blob });
    } catch (err) {
      console.warn('No se pudo guardar la imagen del certificado; el PDF sale igual:', err);
    }
  }

  // 2. Librerías pesadas solo cuando hacen falta (no engordan el portal).
  const [{ jsPDF }, QR] = await Promise.all([import('jspdf'), import('qrcode')]);
  const QRCode = QR.default || QR;

  const imagen = await imagenDesdeBlob(blob);
  const jpeg = imagenAJpeg(imagen);
  const enlace = urlVerificacion(folio);
  const qr = await QRCode.toDataURL(enlace, {
    errorCorrectionLevel: 'M',
    margin: 1, // con el relleno del recuadro, la zona blanca que pide el QR
    width: 600,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  // 3. La página mide lo mismo que la plantilla (1 px = 0.75 pt, a 96 ppp).
  const W = imagen.ancho * 0.75;
  const H = imagen.alto * 0.75;
  const doc = new jsPDF({
    orientation: W >= H ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [W, H],
    compress: true,
  });
  doc.setProperties({
    title: `Certificado ${folio}`,
    subject: `Verificable en ${enlace}`,
    author: 'HCE Healthcare Training Experience',
    creator: 'Portal HCE',
  });
  doc.addImage(jpeg, 'JPEG', 0, 0, W, H, undefined, 'FAST');

  // 4. Recuadro de verificación en la esquina inferior derecha. Todo se mide
  // con `u` (1% del lado corto) para verse igual en cualquier plantilla.
  const u = Math.min(W, H) / 100;
  const pad = 1.3 * u;
  const lado = 12.5 * u;
  const titulo = 'Verifica este certificado';
  const textoFolio = `Folio: ${folio}`;
  const tamTitulo = 1.25 * u;
  const tamFolio = 1.25 * u;
  const tamSitio = 0.95 * u;

  doc.setFont('helvetica', 'bold').setFontSize(tamTitulo);
  const anchoTitulo = doc.getTextWidth(titulo);
  doc.setFont('courier', 'bold').setFontSize(tamFolio);
  const anchoFolio = doc.getTextWidth(textoFolio);

  const anchoCaja = Math.max(lado, anchoTitulo, anchoFolio) + pad * 2;
  const altoCaja = pad + lado + 0.9 * u + tamTitulo + 0.45 * u + tamSitio + 0.55 * u + tamFolio + pad;
  const margen = 2.5 * u;
  const x = W - anchoCaja - margen;
  const y = H - altoCaja - margen;
  const centro = x + anchoCaja / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(14, 116, 144);
  doc.setLineWidth(Math.max(0.6, 0.18 * u));
  doc.roundedRect(x, y, anchoCaja, altoCaja, 1.2 * u, 1.2 * u, 'FD');

  const qrX = centro - lado / 2;
  const qrY = y + pad;
  doc.addImage(qr, 'PNG', qrX, qrY, lado, lado);
  doc.link(qrX, qrY, lado, lado, { url: enlace });

  let renglon = qrY + lado + 0.9 * u + tamTitulo * 0.8;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold').setFontSize(tamTitulo);
  doc.text(titulo, centro, renglon, { align: 'center' });

  renglon += 0.45 * u + tamSitio;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal').setFontSize(tamSitio);
  doc.text('healthcareexp.com/verificar', centro, renglon, { align: 'center' });

  renglon += 0.55 * u + tamFolio;
  doc.setTextColor(14, 116, 144);
  doc.setFont('courier', 'bold').setFontSize(tamFolio);
  doc.text(textoFolio, centro, renglon, { align: 'center' });

  // 5. Descarga (o se abre si el navegador no deja descargar).
  guardarBlob(doc.output('blob'), `Certificado_${folio.replace(/[^\w-]+/g, '_')}.pdf`);
  return actualizado;
}

/** Descarga un archivo por URL; si el navegador no lo permite, lo abre. */
export async function descargarArchivo(url, nombreArchivo) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('No se pudo descargar directo; se abre en otra pestaña:', err);
    // Tras varios await el navegador puede bloquear la ventana: se avisa.
    const ventana = window.open(url, '_blank');
    if (!ventana) throw new Error('Tu navegador bloqueó la descarga. Intenta de nuevo.');
  }
}
