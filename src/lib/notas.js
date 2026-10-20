// Notas por lección del alumno (supabase/aula-notas.sql) y su PDF.
import { supabase } from './supabase';

export const faltaTablaNotas = (error) => ['42P01', 'PGRST205', 'PGRST204', '42703'].includes(error?.code);

/** "3:07" o "1:02:15". */
export function formatoMinuto(segundo) {
  if (segundo == null || Number.isNaN(Number(segundo))) return '';
  const s = Math.max(0, Math.floor(Number(segundo)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export async function cargarNotas(userId, courseId) {
  const { data, error } = await supabase.from('leccion_notas')
    .select('id, leccion_id, texto, segundo, creada_en, actualizada_en')
    .eq('user_id', userId).eq('course_id', Number(courseId))
    .order('leccion_id').order('segundo', { ascending: true, nullsFirst: true }).order('creada_en');
  if (error) throw error;
  return data || [];
}

export async function agregarNota({ userId, courseId, leccionId, texto, segundo = null }) {
  const { data, error } = await supabase.from('leccion_notas')
    .insert([{ user_id: userId, course_id: Number(courseId), leccion_id: leccionId, texto: texto.trim(), segundo }])
    .select('id, leccion_id, texto, segundo, creada_en, actualizada_en').single();
  if (error) throw error;
  return data;
}

export async function editarNota(id, texto) {
  const { data, error } = await supabase.from('leccion_notas')
    .update({ texto: texto.trim(), actualizada_en: new Date().toISOString() })
    .eq('id', id).select('id, leccion_id, texto, segundo, creada_en, actualizada_en').single();
  if (error) throw error;
  return data;
}

export async function borrarNota(id) {
  const { error } = await supabase.from('leccion_notas').delete().eq('id', id);
  if (error) throw error;
}

/** PDF con todas las notas del curso, ordenadas como las lecciones. */
export async function descargarNotasPdf({ curso, alumno, lecciones, notas }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 56;
  let y = margen;

  const salto = (necesario) => {
    if (y + necesario > alto - margen) { doc.addPage(); y = margen; }
  };
  const texto = (contenido, { tamano = 11, negrita = false, color = [30, 41, 59], sangria = 0 } = {}) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(tamano);
    doc.setTextColor(...color);
    for (const linea of doc.splitTextToSize(String(contenido), ancho - margen * 2 - sangria)) {
      salto(tamano * 1.5);
      doc.text(linea, margen + sangria, y);
      y += tamano * 1.45;
    }
  };

  texto('Mis notas', { tamano: 22, negrita: true, color: [10, 25, 47] });
  texto(curso, { tamano: 13, color: [0, 95, 230] });
  texto(`${alumno ? `${alumno} · ` : ''}${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, { tamano: 10, color: [100, 116, 139] });
  y += 12;

  const orden = new Map(lecciones.map((l, i) => [l.id, i]));
  const porLeccion = new Map();
  for (const n of notas) {
    if (!porLeccion.has(n.leccion_id)) porLeccion.set(n.leccion_id, []);
    porLeccion.get(n.leccion_id).push(n);
  }
  const ids = [...porLeccion.keys()].sort((a, b) => (orden.get(a) ?? 999) - (orden.get(b) ?? 999));
  if (!ids.length) texto('Todavía no tienes notas en este curso.', { color: [100, 116, 139] });
  for (const id of ids) {
    y += 8;
    salto(40);
    texto(lecciones.find((l) => l.id === id)?.titulo || 'Lección', { tamano: 13, negrita: true, color: [10, 25, 47] });
    for (const n of porLeccion.get(id)) {
      if (n.segundo != null) texto(`Minuto ${formatoMinuto(n.segundo)}`, { tamano: 9, negrita: true, color: [0, 131, 143], sangria: 8 });
      texto(n.texto, { sangria: 8 });
      y += 6;
    }
  }

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`HCE Healthcare Training Experience · ${i} / ${paginas}`, margen, alto - 28);
  }
  const nombre = `Notas_${String(curso).replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 60)}.pdf`;
  doc.save(nombre);
}
