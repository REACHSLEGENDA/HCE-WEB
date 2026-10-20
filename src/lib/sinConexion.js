// Materiales guardados en el dispositivo para verlos sin internet (IndexedDB).
// Solo viven en ese navegador; se ven en /classroom/sin-conexion.

const BASE = 'hce-sin-conexion';
const TABLA = 'materiales';

function abrir() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Este navegador no permite guardar materiales.')); return; }
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(TABLA)) db.createObjectStore(TABLA, { keyPath: 'id' });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error || new Error('No se pudo abrir el almacenamiento.'));
  });
}

async function operar(modo, accion) {
  const db = await abrir();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(TABLA, modo);
      const pedido = accion(tx.objectStore(TABLA));
      tx.oncomplete = () => resolve(pedido?.result);
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar.'));
      tx.onabort = () => reject(tx.error || new Error('Sin espacio suficiente en el dispositivo.'));
    });
  } finally {
    db.close();
  }
}

export const idMaterial = (cursoId, leccionId, extra = '') => `${cursoId}:${leccionId}:${extra}`;

/** Guarda un PDF/archivo (desde un enlace) o una lectura (texto HTML). */
export async function guardarMaterial({ id, cursoId, curso, leccionId, titulo, tipo, url = '', texto = '', nombre = '' }) {
  let blob = null;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo descargar el material.');
    blob = await res.blob();
  }
  const registro = {
    id, cursoId, curso, leccionId, titulo, tipo, nombre: nombre || titulo,
    texto: texto || '', blob, tamano: blob?.size || new Blob([texto || '']).size,
    guardadoEn: new Date().toISOString(),
  };
  await operar('readwrite', (t) => t.put(registro));
  // Pide al navegador que no borre lo guardado cuando falte espacio.
  try { await navigator.storage?.persist?.(); } catch { /* opcional */ }
  return registro;
}

export const listarMateriales = async () => (await operar('readonly', (t) => t.getAll())) || [];
export const borrarMaterial = (id) => operar('readwrite', (t) => t.delete(id));
export const tieneMaterial = async (id) => Boolean(await operar('readonly', (t) => t.get(id)));

export function formatoTamano(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
