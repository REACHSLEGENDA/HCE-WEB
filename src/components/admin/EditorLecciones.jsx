import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Plus, Trash2, Upload, X, PlayCircle, FileText, BookOpen, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';
import { TIPOS_LECCION } from '../../lib/lecciones';
import { getYouTubeVideoId } from '../../lib/youtube';
import './AdminLms.css';

// Editor de las lecciones de un curso: agregar, ordenar, editar y quitar.
// Escribe directo en la base con la sesión del administrador (las políticas
// solo lo permiten a administradores).

const ICONOS = { video: PlayCircle, pdf: FileText, texto: BookOpen, tarea: ClipboardList };

const leccionVacia = (tipo = 'video') => ({
  id: null,
  titulo: '',
  tipo,
  descripcion: '',
  duracion_min: '',
  obligatoria: true,
  youtube_video_id: '',
  archivo_path: '',
  texto: '',
});

export default function EditorLecciones({ courseId, onCambio, notificar, confirmar }) {
  const [lecciones, setLecciones] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('curso_lecciones')
      .select('id, orden, titulo, tipo, descripcion, duracion_min, obligatoria')
      .eq('course_id', courseId)
      .order('orden')
      .order('id');
    if (error) {
      if (esTablaFaltante(error)) setFaltaMigracion(true);
      else notificar(`No se pudieron cargar las lecciones: ${error.message}`, 'error');
      setLecciones([]);
      return;
    }
    const ids = (data || []).map((l) => l.id);
    const { data: contenidos } = ids.length
      ? await supabase.from('leccion_contenido').select('leccion_id, youtube_video_id, archivo_path, texto').in('leccion_id', ids)
      : { data: [] };
    const porId = new Map((contenidos || []).map((c) => [c.leccion_id, c]));
    setLecciones((data || []).map((l) => ({ ...l, ...(porId.get(l.id) || {}) })));
  }, [courseId, notificar]);

  useEffect(() => { void cargar(); }, [cargar]);

  // El catálogo decide si el curso "se toma en el aula" con este indicador.
  const actualizarIndicador = async (cantidad) => {
    await supabase.from('courses').update({ tiene_video: cantidad > 0 }).eq('id', courseId);
    onCambio?.();
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!editando.titulo.trim()) {
      notificar('La lección necesita un título.', 'error');
      return;
    }
    if (editando.tipo === 'video' && editando.youtube_video_id && !getYouTubeVideoId(editando.youtube_video_id)) {
      notificar('Ese enlace de YouTube no es válido.', 'error');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        course_id: courseId,
        titulo: editando.titulo.trim(),
        tipo: editando.tipo,
        descripcion: editando.descripcion?.trim() || null,
        duracion_min: editando.duracion_min === '' ? null : Number(editando.duracion_min),
        obligatoria: !!editando.obligatoria,
      };

      let leccionId = editando.id;
      if (leccionId) {
        const { error } = await supabase.from('curso_lecciones').update(datos).eq('id', leccionId);
        if (error) throw error;
      } else {
        const orden = (lecciones?.reduce((m, l) => Math.max(m, l.orden || 0), 0) || 0) + 1;
        const { data, error } = await supabase.from('curso_lecciones').insert([{ ...datos, orden }]).select('id').single();
        if (error) throw error;
        leccionId = data.id;
      }

      // El PDF se sube hasta tener el número de la lección, porque va en la ruta.
      let archivoPath = editando.archivo_path || null;
      if (editando.tipo === 'pdf' && editando.archivoNuevo) {
        const limpio = editando.archivoNuevo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        archivoPath = `${courseId}/${leccionId}/${Date.now()}_${limpio}`;
        const { error: errSubida } = await supabase.storage.from('curso-materiales').upload(archivoPath, editando.archivoNuevo);
        if (errSubida) throw errSubida;
      }

      const { error: errContenido } = await supabase.from('leccion_contenido').upsert([{
        leccion_id: leccionId,
        youtube_video_id: editando.tipo === 'video' ? (editando.youtube_video_id?.trim() || null) : null,
        archivo_path: editando.tipo === 'pdf' ? archivoPath : null,
        texto: editando.tipo === 'texto' || editando.tipo === 'tarea' ? (editando.texto || null) : null,
        actualizado_en: new Date().toISOString(),
      }], { onConflict: 'leccion_id' });
      if (errContenido) throw errContenido;

      notificar(editando.id ? 'Lección actualizada.' : 'Lección agregada.', 'success');
      setEditando(null);
      await cargar();
      await actualizarIndicador((lecciones?.length || 0) + (editando.id ? 0 : 1));
    } catch (err) {
      notificar(`No se pudo guardar la lección: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const mover = async (indice, direccion) => {
    const otro = indice + direccion;
    if (!lecciones || otro < 0 || otro >= lecciones.length) return;
    const a = lecciones[indice];
    const b = lecciones[otro];
    // Se reasigna el orden de toda la lista para que quede consecutivo aunque
    // viniera con huecos o repetidos.
    const nuevaLista = [...lecciones];
    nuevaLista[indice] = b;
    nuevaLista[otro] = a;
    setLecciones(nuevaLista);
    await Promise.all(nuevaLista.map((l, i) => supabase.from('curso_lecciones').update({ orden: i + 1 }).eq('id', l.id)));
    await cargar();
  };

  const eliminar = async (leccion) => {
    const mensaje = `¿Eliminar la lección "${leccion.titulo}"? También se borra el avance de los alumnos en ella.`;
    const ok = confirmar ? await confirmar(mensaje, 'Eliminar lección') : window.confirm(mensaje);
    if (!ok) return;
    const { error } = await supabase.from('curso_lecciones').delete().eq('id', leccion.id);
    if (error) {
      notificar(`No se pudo eliminar: ${error.message}`, 'error');
      return;
    }
    if (leccion.archivo_path) await supabase.storage.from('curso-materiales').remove([leccion.archivo_path]);
    notificar('Lección eliminada.', 'success');
    await cargar();
    await actualizarIndicador((lecciones?.length || 1) - 1);
  };

  if (faltaMigracion) {
    return (
      <div className="lms-aviso">
        Para armar el curso por lecciones hay que correr en Supabase la migración <code>lms-estructura.sql</code>.
      </div>
    );
  }

  if (lecciones === null) return <p className="lms-cargando">Cargando lecciones…</p>;

  return (
    <div className="lms-lecciones">
      {lecciones.length === 0 && !editando && (
        <p className="lms-vacio">Este curso todavía no tiene lecciones. Agrega la primera: un video, un PDF, una lectura o una tarea.</p>
      )}

      {lecciones.length > 0 && (
        <ol className="lms-lista">
          {lecciones.map((l, i) => {
            const Icono = ICONOS[l.tipo] || PlayCircle;
            const sinContenido =
              (l.tipo === 'video' && !l.youtube_video_id) ||
              (l.tipo === 'pdf' && !l.archivo_path) ||
              (l.tipo === 'texto' && !l.texto);
            return (
              <li key={l.id} className="lms-fila">
                <span className="lms-orden">{i + 1}</span>
                <Icono size={16} className="lms-icono" />
                <span className="lms-fila-texto">
                  <strong>{l.titulo}</strong>
                  <small>
                    {TIPOS_LECCION[l.tipo]}
                    {l.duracion_min ? ` · ${l.duracion_min} min` : ''}
                    {l.obligatoria === false ? ' · opcional' : ''}
                    {sinContenido && <span className="lms-alerta"> · sin contenido</span>}
                  </small>
                </span>
                <span className="lms-acciones">
                  <button type="button" className="icon-action-btn" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp size={15} /></button>
                  <button type="button" className="icon-action-btn" title="Bajar" disabled={i === lecciones.length - 1} onClick={() => mover(i, 1)}><ArrowDown size={15} /></button>
                  <button type="button" className="icon-action-btn edit" title="Editar" onClick={() => setEditando({ ...leccionVacia(), ...l, duracion_min: l.duracion_min ?? '', texto: l.texto || '', youtube_video_id: l.youtube_video_id || '' })}><Edit size={15} /></button>
                  <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(l)}><Trash2 size={15} /></button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!editando && (
        <div className="lms-agregar">
          <span>Agregar lección:</span>
          {Object.entries(TIPOS_LECCION).map(([tipo, nombre]) => {
            const Icono = ICONOS[tipo];
            return (
              <button key={tipo} type="button" className="btn-crm-action outlined" onClick={() => setEditando(leccionVacia(tipo))}>
                <Plus size={14} /> <Icono size={14} /> {nombre}
              </button>
            );
          })}
        </div>
      )}

      {editando && (
        <form className="lms-editor" onSubmit={guardar}>
          <div className="lms-editor-cabecera">
            <h4>{editando.id ? 'Editar lección' : `Nueva lección · ${TIPOS_LECCION[editando.tipo]}`}</h4>
            <button type="button" className="icon-action-btn" title="Cancelar" onClick={() => setEditando(null)}><X size={16} /></button>
          </div>

          <div className="lms-fila-campos">
            <div className="crm-input-group">
              <label>Título *</label>
              <input type="text" value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} placeholder="Ej. Canulación veno-venosa" />
            </div>
            <div className="crm-input-group lms-campo-corto">
              <label>Duración (min)</label>
              <input type="number" min="0" value={editando.duracion_min} onChange={(e) => setEditando({ ...editando, duracion_min: e.target.value })} />
            </div>
          </div>

          <div className="crm-input-group">
            <label>Descripción breve</label>
            <input type="text" value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} placeholder="Qué va a aprender en esta lección" />
          </div>

          {editando.tipo === 'video' && (
            <div className="crm-input-group">
              <label>Enlace o ID del video de YouTube</label>
              <input type="text" value={editando.youtube_video_id} onChange={(e) => setEditando({ ...editando, youtube_video_id: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
              <small>Súbelo a YouTube como "no listado". El enlace solo lo ven los alumnos inscritos.</small>
            </div>
          )}

          {editando.tipo === 'pdf' && (
            <div className="crm-input-group">
              <label>Documento PDF</label>
              <div className="lms-archivo">
                <label className="btn-crm-action outlined">
                  <Upload size={14} /> {editando.archivoNuevo ? 'Cambiar archivo' : editando.archivo_path ? 'Reemplazar PDF' : 'Elegir PDF'}
                  <input type="file" accept="application/pdf" onChange={(e) => setEditando({ ...editando, archivoNuevo: e.target.files?.[0] || null })} />
                </label>
                <span>{editando.archivoNuevo?.name || (editando.archivo_path ? editando.archivo_path.split('/').pop() : 'Ningún archivo')}</span>
              </div>
              <small>Se guarda privado: solo lo pueden abrir los alumnos inscritos, con un enlace que caduca en una hora.</small>
            </div>
          )}

          {(editando.tipo === 'texto' || editando.tipo === 'tarea') && (
            <div className="crm-input-group">
              <label>{editando.tipo === 'texto' ? 'Contenido de la lectura' : 'Instrucciones de la tarea'}</label>
              <textarea rows="10" value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} className="lms-textarea"
                placeholder={editando.tipo === 'texto'
                  ? '# Título\n\nUn párrafo de texto.\n\n- Una viñeta\n- Otra viñeta\n\n**Negritas** y [un enlace](https://…)'
                  : 'Describe qué tiene que entregar el alumno y cómo se evalúa.'} />
              <small>Formato: <code># Título</code>, <code>## Subtítulo</code>, <code>- viñeta</code>, <code>**negritas**</code>, <code>*cursiva*</code>, <code>[texto](https://enlace)</code>. Línea en blanco para separar párrafos.</small>
            </div>
          )}

          <label className="lms-check">
            <input type="checkbox" checked={!!editando.obligatoria} onChange={(e) => setEditando({ ...editando, obligatoria: e.target.checked })} />
            Obligatoria para presentar el examen final
          </label>

          <div className="lms-editor-acciones">
            <button type="button" className="btn-crm-action outlined" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-crm-action solid" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar lección'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
