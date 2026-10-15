// Constantes y utilidades puras del panel de administración (sin estado de
// React). Se separaron de AdminDashboard.jsx para que cada vista las importe.
import { supabase } from '../../lib/supabase';

// Días sin actividad en la plataforma a partir de los cuales un curso iniciado
// y no terminado (con avance < 80%) se considera abandonado.
export const ABANDONMENT_INACTIVE_DAYS = 15;

// Los webinars comparten una sola lista de Brevo: el nombre del webinar y el
// enlace personal viajan como atributos del contacto, así que una sola
// automatización sirve para todos. Queda editable por si algún día quieren
// separar alguno en su propia lista.
export const LISTA_WEBINARS_BREVO = 16;

// Las miniaturas de YouTube se sirven desde estos dominios y su ruta incluye
// el ID del video.
export const esMiniaturaYoutube = (url) => /img\.youtube\.com|ytimg\.com/i.test(String(url || ''));

// Vigencia real del certificado: la fecha guardada o "Permanente" si no vence.
export const textoVigencia = (cert) =>
  cert?.vigente_hasta ? new Date(cert.vigente_hasta).toLocaleDateString('es-MX') : 'Permanente';

// Para los reportes que se arman como HTML: los nombres los escriben los alumnos.
export const escaparHtml = (valor) => String(valor ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escribe un CSV con BOM para que Excel abra bien los acentos.
export const descargarCsv = (filas, nombreArchivo) => {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + filas.map((fila) => fila.map(escapar).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Zoom escribe el ID de mil formas: en la URL de la invitación, con guiones o
// con espacios. Se acepta cualquiera y se guarda solo el número.
export const extraerZoomId = (valor) => {
  const texto = String(valor || '').trim();
  if (!texto) return '';

  const enUrl = texto.match(/\/(?:j|w|s)\/(\d{9,12})/);
  if (enUrl) return enUrl[1];

  const soloDigitos = texto.replace(/\D/g, '');
  return soloDigitos.length >= 9 ? soloDigitos : texto;
};

// Nombre real de cada formulario. Lo que se guarda en Supabase son rótulos
// heredados ("Inscripciones Curso Standard") que no identifican el curso.
export const FORM_LABELS = {
  mnjlvbpw: 'Paris International Diploma in ECMO',
  xpqenabk: 'ECMO Nursing Care Course',
  xredqyol: 'ECMO SIM: Realidad Clínica',
  mreroozv: 'Solicitud de Facturación',
  xnjlvzdq: 'Retroalimentación y Dudas',
  xdeapenv: 'Alumni Pass · Solicitud Step 1 Refresher',
};

// Fecha corta para tablas y actividad ("15 oct 2026").
export const formatDate = (isoString) => {
  if (!isoString) return 'Desconocido';
  return new Date(isoString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Descarga un archivo remoto; si el navegador no puede, lo abre en otra pestaña.
export const downloadCertificateFile = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Fetch download failed, opening in new tab:', err);
    window.open(url, '_blank');
  }
};

// Alta de cuentas desde el servidor: signUp desde el navegador dejaba la
// cuenta pendiente y podía cambiar la sesión del administrador.
export const llamarUsuarioCrear = async (cuerpo) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/usuario-crear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`
    },
    body: JSON.stringify(cuerpo)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) throw new Error('La función para crear cuentas todavía no está publicada.');
    throw new Error(data.error || 'No se pudo crear la cuenta.');
  }
  return data;
};
