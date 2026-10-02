// Sesiones en vivo de los cursos (ver supabase/lms-sesiones.sql y la función
// sesion-clase). Las fechas se guardan con zona horaria y se muestran en la
// hora del dispositivo de cada quien.

import { supabase } from './supabase';
import { formatearFechaHora } from './zonaHoraria';

export async function llamarSesion(accion, cuerpo = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/sesion-clase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify({ accion, ...cuerpo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo completar. Intenta de nuevo.');
  return data;
}

/** Zona horaria del dispositivo, para mostrarla junto a la hora. */
export function zonaHorariaLocal() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** "jueves 25 de septiembre, 17:00 (hora de Ciudad de México)" en la hora local. */
export function fechaSesion(iso, { conZona = true } = {}) {
  if (!iso) return '';
  return formatearFechaHora(iso, { conZona });
}

/** Valor para <input type="datetime-local"> a partir de una fecha ISO, en hora local. */
export function aInputLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Archivo .ics para agregar la sesión al calendario (Google, Outlook, Apple). */
export function descargarIcs({ titulo, curso, iniciaEn, duracionMin, url }) {
  const inicio = new Date(iniciaEn);
  const fin = new Date(inicio.getTime() + (duracionMin || 60) * 60000);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapar = (t) => String(t || '').replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const contenido = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HCE//Portal//ES',
    'BEGIN:VEVENT',
    `UID:sesion-${f(inicio)}-${Math.random().toString(36).slice(2)}@healthcareexp.com`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(inicio)}`,
    `DTEND:${f(fin)}`,
    `SUMMARY:${escapar(titulo)}`,
    `DESCRIPTION:${escapar(`${curso ? `${curso}. ` : ''}Entra desde tu aula en el portal: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(titulo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const enlace = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = enlace;
  a.download = 'sesion-en-vivo.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(enlace);
}

// ---- Administrador -------------------------------------------------------------

/**
 * Descarga una tabla como CSV que Excel abre con acentos (lleva BOM). La usan
 * la asistencia de las sesiones y la lista de inscritos del curso.
 */
export function descargarCsv(nombreArchivo, encabezado, filas) {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [encabezado, ...filas].map((f) => f.map(escapar).join(',')).join('\r\n');
  const enlace = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = enlace;
  a.download = `${String(nombreArchivo || 'reporte').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(enlace);
}

/** Horario y datos de Zoom de las sesiones de estas lecciones: { [leccionId]: {...} }. */
export async function cargarSesionesAdmin(ids) {
  if (!ids.length) return {};
  const [horarios, secretos] = await Promise.all([
    supabase.from('sesiones_clase').select('*').in('leccion_id', ids),
    supabase.from('sesion_secretos').select('*').in('leccion_id', ids),
  ]);
  if (horarios.error || secretos.error) return {};
  const mapa = {};
  (horarios.data || []).forEach((h) => { mapa[h.leccion_id] = { ...h }; });
  (secretos.data || []).forEach((s) => { mapa[s.leccion_id] = { ...(mapa[s.leccion_id] || {}), ...s }; });
  return mapa;
}

export async function guardarSesionAdmin(leccionId, sesion) {
  const inicia = new Date(sesion.inicia_local);
  if (Number.isNaN(inicia.getTime())) throw new Error('Pon la fecha y hora de la sesión.');
  const { error: e1 } = await supabase.from('sesiones_clase').upsert([{
    leccion_id: leccionId,
    inicia_en: inicia.toISOString(),
    duracion_min: Math.max(5, Number(sesion.duracion_min) || 60),
    minutos_minimos: Math.max(0, Number(sesion.minutos_minimos) || 0),
    actualizado_en: new Date().toISOString(),
  }], { onConflict: 'leccion_id' });
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('sesion_secretos').upsert([{
    leccion_id: leccionId,
    zoom_id: String(sesion.zoom_id || '').replace(/\D/g, '') || null,
    zoom_tipo: sesion.zoom_tipo === 'webinar' ? 'webinar' : 'meeting',
    enlace_respaldo: String(sesion.enlace_respaldo || '').trim() || null,
  }], { onConflict: 'leccion_id' });
  if (e2) throw e2;
}
