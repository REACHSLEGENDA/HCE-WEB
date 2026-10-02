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
