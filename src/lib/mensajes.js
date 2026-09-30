// Mensajes internos (ver supabase/mensajes.sql). Leer va directo a Supabase
// (las políticas solo dejan ver lo propio); enviar pasa por mensajes-enviar.

import { supabase } from './supabase';
import { esTablaFaltante } from './cursos';

const CAMPOS = 'id, remitente_id, remitente_nombre, asunto, cuerpo, adjunto_path, adjunto_nombre, destino_tipo, destino_nombre, hilo_id, creado_en';

/** Recibidos del usuario, con si ya los leyó. `null` antes de la migración. */
export async function cargarRecibidos(userId) {
  const { data, error } = await supabase
    .from('mensaje_destinatarios')
    .select(`leido_en, archivado, mensaje:mensajes(${CAMPOS})`)
    .eq('user_id', userId)
    .eq('archivado', false)
    .limit(500);
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return (data || [])
    .filter((f) => f.mensaje)
    .map((f) => ({ ...f.mensaje, leido: !!f.leido_en }))
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
}

export async function cargarEnviados(userId) {
  const { data, error } = await supabase.from('mensajes').select(CAMPOS).eq('remitente_id', userId).order('creado_en', { ascending: false }).limit(500);
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return data || [];
}

/** La conversación completa de un mensaje (lo que el usuario puede ver). */
export async function cargarHilo(mensaje) {
  const raiz = mensaje.hilo_id || mensaje.id;
  const { data, error } = await supabase.from('mensajes').select(CAMPOS).or(`id.eq.${raiz},hilo_id.eq.${raiz}`).order('creado_en');
  if (error) throw error;
  return data || [];
}

export async function marcarLeido(userId, mensajeIds) {
  if (!mensajeIds.length) return;
  await supabase.from('mensaje_destinatarios').update({ leido_en: new Date().toISOString() })
    .eq('user_id', userId).in('mensaje_id', mensajeIds).is('leido_en', null);
}

export async function archivar(userId, mensajeId) {
  const { error } = await supabase.from('mensaje_destinatarios').update({ archivado: true }).eq('user_id', userId).eq('mensaje_id', mensajeId);
  if (error) throw error;
}

export async function contarNoLeidos(userId) {
  const { count, error } = await supabase.from('mensaje_destinatarios').select('mensaje_id', { count: 'exact', head: true })
    .eq('user_id', userId).is('leido_en', null).eq('archivado', false);
  return error ? 0 : count || 0;
}

export async function subirAdjunto(userId, archivo) {
  const limpio = archivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ruta = `${userId}/${Date.now()}_${limpio}`;
  const { error } = await supabase.storage.from('mensajes').upload(ruta, archivo, { contentType: archivo.type || undefined });
  if (error) throw error;
  return { path: ruta, nombre: archivo.name };
}

export async function abrirAdjunto(mensaje) {
  const pestana = window.open('', '_blank');
  try {
    const { data, error } = await supabase.storage.from('mensajes').createSignedUrl(mensaje.adjunto_path, 3600, { download: mensaje.adjunto_nombre || true });
    if (error) throw error;
    if (pestana) { pestana.opener = null; pestana.location.href = data.signedUrl; } else window.location.href = data.signedUrl;
  } catch (err) {
    pestana?.close();
    throw err;
  }
}

export async function enviarMensaje(cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/mensajes-enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');
  return data;
}
