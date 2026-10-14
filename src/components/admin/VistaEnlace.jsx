import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, PlayCircle, Info } from 'lucide-react';
import { detectarVideo, detectarPagina, extraerEnlace, midePorcentaje } from '../../lib/videos';

// Revisa al escribir el enlace de un video o de una página web y muestra qué se
// detectó, si el aula lo podrá mostrar y una vista previa cuando se puede.

function analizarVideo(valor) {
  const video = detectarVideo(valor);
  if (!video) {
    const texto = extraerEnlace(valor);
    return {
      estado: 'error',
      titulo: 'Este enlace no se puede reproducir',
      detalle: /^http:\/\//i.test(texto)
        ? 'Usa la dirección con https:// (la que da el botón Compartir de Vimeo o YouTube).'
        : 'Usa el enlace de Compartir de Vimeo o YouTube, o la dirección completa del video (https://…).',
    };
  }
  const mide = midePorcentaje(video);
  const avance = mide
    ? 'Se mide cuánto ve el alumno y cuenta como visto al 90%.'
    : 'No se puede medir cuánto ve el alumno: él marca la lección como completada.';
  if (video.proveedor === 'youtube') {
    return { estado: 'ok', titulo: 'YouTube detectado', detalle: avance, video, miniatura: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`, previa: `https://www.youtube-nocookie.com/embed/${video.id}` };
  }
  if (video.proveedor === 'vimeo') {
    return { estado: 'ok', titulo: 'Vimeo detectado', detalle: avance, video, previa: `https://player.vimeo.com/video/${video.id}${video.hash ? `?h=${video.hash}` : ''}` };
  }
  if (video.proveedor === 'archivo') {
    return { estado: 'ok', titulo: 'Archivo de video', detalle: avance, video, archivo: video.url };
  }
  let host = '';
  try { host = new URL(video.url).hostname.replace(/^www\./, ''); } catch { /* sin host */ }
  return { estado: 'aviso', titulo: `Video de otra plataforma${host ? ` (${host})` : ''}`, detalle: `Se insertará tal cual. ${avance}`, video, previa: video.url };
}

function analizarPagina(valor) {
  const pagina = detectarPagina(valor);
  if (!pagina) {
    const texto = extraerEnlace(valor);
    return {
      estado: 'error',
      titulo: /^http:\/\//i.test(texto) ? 'La página no es segura (http://)' : 'No reconozco ese enlace',
      detalle: /^http:\/\//i.test(texto)
        ? 'El aula solo puede mostrar páginas con https://. Revisa si el sitio tiene versión https.'
        : 'Pega la dirección completa (https://…) o el código <iframe> que da el sitio.',
    };
  }
  let host = '';
  try { host = new URL(pagina).hostname.replace(/^www\./, ''); } catch { /* sin host */ }
  return {
    estado: 'ok',
    titulo: `Página lista${host ? `: ${host}` : ''}`,
    detalle: 'Algunos sitios no se dejan mostrar dentro de otra página; si la vista previa sale en blanco, el alumno tendrá un botón para abrirla en otra pestaña.',
    previa: pagina,
  };
}

export default function VistaEnlace({ tipo, valor }) {
  const [verPrevia, setVerPrevia] = useState(false);
  if (!String(valor || '').trim()) return null;
  const r = tipo === 'web' ? analizarPagina(valor) : analizarVideo(valor);
  const Icono = r.estado === 'ok' ? CheckCircle2 : r.estado === 'aviso' ? Info : AlertTriangle;
  const puedePrevia = !!(r.previa || r.archivo);

  return (
    <div className={`vista-enlace vista-enlace--${r.estado}`} aria-live="polite">
      <div className="vista-enlace-estado">
        <Icono size={16} aria-hidden="true" />
        <div>
          <strong>{r.titulo}{r.estado === 'ok' ? ' ✓' : ''}</strong>
          <span>{r.detalle}</span>
        </div>
      </div>

      {r.miniatura && !verPrevia && (
        <button type="button" className="vista-enlace-miniatura" onClick={() => setVerPrevia(true)} aria-label="Ver el video aquí">
          <img src={r.miniatura} alt="" loading="lazy" />
          <PlayCircle size={34} aria-hidden="true" />
        </button>
      )}

      {puedePrevia && (!r.miniatura || verPrevia) && (
        <button type="button" className="btn-crm-action outlined mini vista-enlace-boton" onClick={() => setVerPrevia((v) => !v)}>
          {verPrevia ? <EyeOff size={13} /> : <Eye size={13} />} {verPrevia ? 'Ocultar vista previa' : 'Ver vista previa'}
        </button>
      )}

      {verPrevia && r.archivo && (
        <video className="vista-enlace-marco" src={r.archivo} controls preload="metadata" />
      )}
      {verPrevia && r.previa && (
        <iframe
          className={`vista-enlace-marco${tipo === 'web' ? ' vista-enlace-marco--web' : ''}`}
          src={r.previa}
          title="Vista previa"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={tipo === 'web' ? 'allow-scripts allow-same-origin allow-forms allow-popups' : undefined}
        />
      )}
    </div>
  );
}
