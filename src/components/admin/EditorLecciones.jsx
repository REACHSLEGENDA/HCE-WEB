import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Plus, Trash2, Upload, X, PlayCircle, FileText, BookOpen, ClipboardList, Globe, FileCheck, MessageSquareText, Heading, ListChecks, Video, Users, RefreshCw, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, llamarClonar } from '../../lib/cursos';
import { TIPOS_LECCION, cargarContenidos, videoDeLeccion, falta } from '../../lib/lecciones';
import { detectarVideo, detectarPagina, extraerEnlace, midePorcentaje, NOMBRE_PROVEEDOR } from '../../lib/videos';
import EditorEvaluacion from './EditorEvaluacion';
import AsistenciaSesion from './AsistenciaSesion';
import { cargarSesionesAdmin, guardarSesionAdmin, aInputLocal, llamarSesion, zonaHorariaLocal } from '../../lib/sesiones';
import './AdminLms.css';

// Editor de las lecciones de un curso: agregar, ordenar, editar y quitar.
// Escribe directo en la base con la sesión del administrador (las políticas
// solo lo permiten a administradores).

const ICONOS = {
  video: PlayCircle,
  pdf: FileText,
  texto: BookOpen,
  tarea: ClipboardList,
  web: Globe,
  examen: FileCheck,
  encuesta: MessageSquareText,
  seccion: Heading,
  sesion: Video,
};

const FALTA_MIGRACION = 'Para usar videos de Vimeo u otras plataformas y páginas web, corre en Supabase la migración lms-enlaces.sql.';
const FALTA_EVALUACIONES = 'Para exámenes, encuestas y secciones corre en Supabase la migración lms-evaluaciones.sql.';
const TIPOS_NUEVOS = ['examen', 'encuesta', 'seccion', 'sesion'];
const esEvaluacion = (tipo) => tipo === 'examen' || tipo === 'encuesta';

// Aviso bajo el campo del video: qué se detectó y si se medirá el avance.
function avisoVideo(valor) {
  if (!valor.trim()) return null;
  const video = detectarVideo(valor);
  if (!video) return { error: true, texto: 'No reconozco ese enlace. Debe empezar con https://' };
  return {
    texto: midePorcentaje(video)
      ? `Video de ${NOMBRE_PROVEEDOR[video.proveedor]}: se mide cuánto ve el alumno y cuenta como visto al 90%.`
      : 'Video de otra plataforma: no se puede medir cuánto ve el alumno, así que él la marca como completada.',
  };
}

const leccionVacia = (tipo = 'video') => ({
  id: null,
  titulo: '',
  tipo,
  descripcion: '',
  duracion_min: '',
  obligatoria: true,
  video: '',
  enlace: '',
  archivo_path: '',
  texto: '',
  // Sesión en vivo
  inicia_local: '',
  duracion_sesion: 60,
  minutos_minimos: 0,
  zoom_id: '',
  zoom_tipo: 'meeting',
  enlace_respaldo: '',
});

export default function EditorLecciones({ courseId, cursos = [], onCambio, notificar, confirmar }) {
  const [lecciones, setLecciones] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // Lección de examen o encuesta cuyas preguntas se están editando.
  const [evaluando, setEvaluando] = useState(null);
  // Sesión en vivo cuya asistencia se está viendo.
  const [asistencia, setAsistencia] = useState(null);
  const [trayendoZoom, setTrayendoZoom] = useState(false);
  // "Copiar de otro curso": curso elegido y sus lecciones.
  const [copiando, setCopiando] = useState(null);

  const elegirCursoOrigen = async (id) => {
    setCopiando({ cursoId: id, lecciones: null });
    if (!id) return;
    const { data } = await supabase.from('curso_lecciones').select('id, orden, titulo, tipo').eq('course_id', Number(id)).order('orden').order('id');
    setCopiando({ cursoId: id, lecciones: data || [] });
  };

  const copiarDeOtro = async (leccion) => {
    try {
      await llamarClonar('copiar-leccion', { leccionId: leccion.id, destinoCourseId: courseId });
      notificar(`"${leccion.titulo}" se copió al final del temario.`, 'success');
      await cargar();
      onCambio?.();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

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
    const { data: contenidos } = await cargarContenidos(ids);
    const porId = new Map((contenidos || []).map((c) => [c.leccion_id, c]));
    const sesiones = await cargarSesionesAdmin((data || []).filter((l) => l.tipo === 'sesion').map((l) => l.id));
    setLecciones((data || []).map((l) => ({ ...l, ...(porId.get(l.id) || {}), sesion: sesiones[l.id] || null })));
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
    if (editando.tipo === 'video' && editando.video.trim() && !detectarVideo(editando.video)) {
      notificar('Ese enlace de video no es válido. Debe empezar con https://', 'error');
      return;
    }
    if (editando.tipo === 'sesion' && !editando.inicia_local) {
      notificar('Pon la fecha y hora de la sesión.', 'error');
      return;
    }
    if (editando.tipo === 'web' && editando.enlace.trim() && !detectarPagina(editando.enlace)) {
      notificar('Ese enlace no es válido. Debe empezar con https://', 'error');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        course_id: courseId,
        titulo: editando.titulo.trim(),
        tipo: editando.tipo,
        descripcion: editando.descripcion?.trim() || null,
        duracion_min: editando.duracion_min === '' || editando.tipo === 'seccion' ? null : Number(editando.duracion_min),
        // Una sección no tiene contenido: nunca es obligatoria.
        obligatoria: editando.tipo === 'seccion' ? false : !!editando.obligatoria,
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

      // YouTube se queda en su columna de siempre; cualquier otro video o
      // página va en `enlace`.
      const video = editando.tipo === 'video' ? detectarVideo(editando.video) : null;
      const enlace = video && video.proveedor !== 'youtube'
        ? extraerEnlace(editando.video)
        : editando.tipo === 'web' ? detectarPagina(editando.enlace) : null;
      const contenido = {
        leccion_id: leccionId,
        youtube_video_id: video?.proveedor === 'youtube' ? editando.video.trim() : null,
        archivo_path: editando.tipo === 'pdf' ? archivoPath : null,
        texto: ['texto', 'tarea', 'web', 'examen', 'encuesta', 'sesion'].includes(editando.tipo) ? (editando.texto || null) : null,
        enlace,
        actualizado_en: new Date().toISOString(),
      };
      let { error: errContenido } = await supabase.from('leccion_contenido').upsert([contenido], { onConflict: 'leccion_id' });
      // Antes de lms-enlaces.sql no existe la columna: si no se necesita, se guarda sin ella.
      if (errContenido && (falta(errContenido, 'PGRST204') || falta(errContenido, '42703'))) {
        if (enlace) throw new Error(FALTA_MIGRACION);
        delete contenido.enlace;
        ({ error: errContenido } = await supabase.from('leccion_contenido').upsert([contenido], { onConflict: 'leccion_id' }));
      }
      if (errContenido) throw errContenido;

      if (editando.tipo === 'sesion') {
        await guardarSesionAdmin(leccionId, { ...editando, duracion_min: editando.duracion_sesion });
        // Deja la reunión de Zoom con un solo dispositivo y sin su correo.
        if (editando.zoom_id) {
          const r = await llamarSesion('configurar', { leccionId }).catch(() => null);
          if (r && r.ok === false && r.aviso) notificar(r.aviso, 'warning');
        }
      }

      notificar(editando.id ? 'Lección actualizada.' : 'Lección agregada.', 'success');
      const nueva = !editando.id;
      const tipoGuardado = editando.tipo;
      setEditando(null);
      await cargar();
      // Un examen o encuesta recién creado pasa directo a sus preguntas.
      if (nueva && esEvaluacion(tipoGuardado)) setEvaluando({ id: leccionId, tipo: tipoGuardado, titulo: datos.titulo });
      await actualizarIndicador((lecciones?.length || 0) + (editando.id ? 0 : 1));
    } catch (err) {
      const faltaTipo = err.code === '23514' ? (TIPOS_NUEVOS.includes(editando.tipo) ? FALTA_EVALUACIONES : FALTA_MIGRACION) : null;
      notificar(faltaTipo || `No se pudo guardar la lección: ${err.message}`, 'error');
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

  if (asistencia) {
    return <AsistenciaSesion leccion={asistencia} notificar={notificar} onCerrar={() => setAsistencia(null)} />;
  }

  if (evaluando) {
    return (
      <EditorEvaluacion
        leccion={evaluando}
        notificar={notificar}
        confirmar={confirmar || (async (m) => window.confirm(m))}
        onCerrar={() => setEvaluando(null)}
      />
    );
  }

  return (
    <div className="lms-lecciones">
      {lecciones.length === 0 && !editando && (
        <p className="lms-vacio">Este curso todavía no tiene lecciones. Agrega la primera: un video, un PDF, una lectura, una tarea, una página web, un examen o una encuesta. Con "Sección" agrupas las lecciones por módulo.</p>
      )}

      {lecciones.length > 0 && (
        <ol className="lms-lista">
          {lecciones.map((l, i) => {
            const Icono = ICONOS[l.tipo] || PlayCircle;
            const numero = lecciones.slice(0, i + 1).filter((x) => x.tipo !== 'seccion').length;
            const sinContenido =
              (l.tipo === 'video' && !videoDeLeccion(l)) ||
              (l.tipo === 'pdf' && !l.archivo_path) ||
              (l.tipo === 'texto' && !l.texto) ||
              (l.tipo === 'web' && !l.enlace) ||
              (l.tipo === 'sesion' && !l.sesion?.inicia_en);
            return (
              <li key={l.id} className={`lms-fila${l.tipo === 'seccion' ? ' lms-fila--seccion' : ''}`}>
                <span className="lms-orden">{l.tipo === 'seccion' ? '' : numero}</span>
                <Icono size={16} className="lms-icono" />
                <span className="lms-fila-texto">
                  <strong>{l.titulo}</strong>
                  <small>
                    {TIPOS_LECCION[l.tipo]}
                    {l.duracion_min ? ` · ${l.duracion_min} min` : ''}
                    {l.obligatoria === false && l.tipo !== 'seccion' ? ' · opcional' : ''}
                    {sinContenido && <span className="lms-alerta"> · sin contenido</span>}
                  </small>
                </span>
                <span className="lms-acciones">
                  <button type="button" className="icon-action-btn" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp size={15} /></button>
                  <button type="button" className="icon-action-btn" title="Bajar" disabled={i === lecciones.length - 1} onClick={() => mover(i, 1)}><ArrowDown size={15} /></button>
                  {l.tipo === 'sesion' && (
                    <button type="button" className="icon-action-btn edit" title="Registros y asistencia" onClick={() => setAsistencia(l)}><Users size={15} /></button>
                  )}
                  {esEvaluacion(l.tipo) && (
                    <button type="button" className="icon-action-btn edit" title="Preguntas" onClick={() => setEvaluando(l)}><ListChecks size={15} /></button>
                  )}
                  <button type="button" className="icon-action-btn edit" title="Editar" onClick={() => setEditando({
                    ...leccionVacia(),
                    ...l,
                    duracion_min: l.duracion_min ?? '',
                    texto: l.texto || '',
                    video: videoDeLeccion(l),
                    enlace: l.enlace || '',
                    inicia_local: aInputLocal(l.sesion?.inicia_en),
                    duracion_sesion: l.sesion?.duracion_min ?? 60,
                    minutos_minimos: l.sesion?.minutos_minimos ?? 0,
                    zoom_id: l.sesion?.zoom_id || '',
                    zoom_tipo: l.sesion?.zoom_tipo || 'meeting',
                    enlace_respaldo: l.sesion?.enlace_respaldo || '',
                  })}><Edit size={15} /></button>
                  <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(l)}><Trash2 size={15} /></button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!editando && copiando && (
        <div className="lms-copiar">
          <div className="lms-editor-cabecera">
            <h4>Copiar una lección de otro curso</h4>
            <button type="button" className="icon-action-btn" title="Cerrar" onClick={() => setCopiando(null)}><X size={16} /></button>
          </div>
          <select value={copiando.cursoId || ''} onChange={(e) => elegirCursoOrigen(e.target.value)} aria-label="Curso de origen">
            <option value="">Elige el curso</option>
            {cursos.filter((c) => !isNaN(Number(c.id)) && Number(c.id) !== Number(courseId)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {copiando.cursoId && copiando.lecciones === null && <p className="lms-cargando">Cargando…</p>}
          {copiando.lecciones?.length === 0 && <p className="lms-vacio">Ese curso no tiene lecciones.</p>}
          {copiando.lecciones?.length > 0 && (
            <ul className="lms-copiar-lista">
              {copiando.lecciones.map((l) => {
                const Icono = ICONOS[l.tipo] || PlayCircle;
                return (
                  <li key={l.id}>
                    <Icono size={15} className="lms-icono" />
                    <span>{l.titulo} <small>{TIPOS_LECCION[l.tipo]}</small></span>
                    <button type="button" className="btn-crm-action outlined mini" onClick={() => copiarDeOtro(l)}><Copy size={13} /> Copiar</button>
                  </li>
                );
              })}
            </ul>
          )}
          <small className="lms-ayuda">Se hace una copia independiente (con su contenido, examen y archivo): si luego cambias una, la otra no cambia.</small>
        </div>
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
          {cursos.length > 1 && !copiando && (
            <button type="button" className="btn-crm-action outlined" onClick={() => setCopiando({ cursoId: '', lecciones: null })}>
              <Copy size={14} /> Copiar de otro curso
            </button>
          )}
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
            {editando.tipo !== 'seccion' && <div className="crm-input-group lms-campo-corto">
              <label>Duración (min)</label>
              <input type="number" min="0" value={editando.duracion_min} onChange={(e) => setEditando({ ...editando, duracion_min: e.target.value })} />
            </div>}
          </div>

          {editando.tipo === 'seccion' && (
            <small className="lms-ayuda">Una sección es un título que agrupa las lecciones que van debajo de ella en el temario, por ejemplo "Módulo I: Fundamentos". No tiene contenido ni cuenta en el avance.</small>
          )}

          {editando.tipo !== 'seccion' && <div className="crm-input-group">
            <label>Descripción breve</label>
            <input type="text" value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} placeholder="Qué va a aprender en esta lección" />
          </div>}

          {editando.tipo === 'video' && (
            <div className="crm-input-group">
              <label>Enlace del video</label>
              <input type="text" value={editando.video} onChange={(e) => setEditando({ ...editando, video: e.target.value })} placeholder="https://www.youtube.com/watch?v=…  ·  https://vimeo.com/…  ·  o el código <iframe> de otra plataforma" />
              {avisoVideo(editando.video) && (
                <small className={avisoVideo(editando.video).error ? 'lms-alerta' : 'lms-detectado'}>{avisoVideo(editando.video).texto}</small>
              )}
              <small>YouTube (como "no listado"), Vimeo, un archivo .mp4, o el enlace o código para insertar de otra plataforma (Google Drive, Loom, Wistia…). Solo lo ven los alumnos inscritos.</small>
            </div>
          )}

          {editando.tipo === 'web' && (
            <div className="crm-input-group">
              <label>Enlace de la página o código para insertar</label>
              <textarea rows="3" value={editando.enlace} onChange={(e) => setEditando({ ...editando, enlace: e.target.value })} className="lms-textarea" placeholder={'https://…  o  <iframe src="https://…"></iframe>'} />
              <small>Se muestra dentro del aula: presentaciones de Google, Genially, formularios, simuladores, un sitio… Algunos sitios no permiten mostrarse dentro de otra página; para esos, el alumno tiene un botón para abrirla en otra pestaña. El alumno la marca como completada.</small>
            </div>
          )}

          {editando.tipo === 'sesion' && (
            <div className="lms-sesion-campos">
              <div className="lms-fila-campos">
                <div className="crm-input-group">
                  <label>ID de la reunión de Zoom</label>
                  <input type="text" inputMode="numeric" value={editando.zoom_id} onChange={(e) => setEditando({ ...editando, zoom_id: e.target.value })} placeholder="870 7903 5398" />
                </div>
                <div className="crm-input-group lms-campo-corto">
                  <label>Tipo</label>
                  <select value={editando.zoom_tipo} onChange={(e) => setEditando({ ...editando, zoom_tipo: e.target.value })}>
                    <option value="meeting">Reunión</option>
                    <option value="webinar">Seminario web</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="btn-crm-action outlined mini"
                disabled={!editando.zoom_id || trayendoZoom}
                onClick={async () => {
                  setTrayendoZoom(true);
                  try {
                    const r = await llamarSesion('zoom-info', { zoomId: editando.zoom_id, zoomTipo: editando.zoom_tipo });
                    setEditando((ed) => ({
                      ...ed,
                      titulo: ed.titulo || r.tema,
                      inicia_local: r.iniciaEn ? aInputLocal(r.iniciaEn) : ed.inicia_local,
                      duracion_sesion: r.duracionMin || ed.duracion_sesion,
                    }));
                    notificar(r.requiereRegistro ? 'Datos traídos de Zoom.' : 'Datos traídos de Zoom. Ojo: la reunión no pide registro; al guardar intentaremos activarlo.', r.requiereRegistro ? 'success' : 'warning');
                  } catch (err) {
                    notificar(err.message, 'error');
                  } finally {
                    setTrayendoZoom(false);
                  }
                }}
              >
                <RefreshCw size={13} /> {trayendoZoom ? 'Consultando…' : 'Traer fecha y duración de Zoom'}
              </button>
              <div className="lms-fila-campos">
                <div className="crm-input-group">
                  <label>Fecha y hora *</label>
                  <input type="datetime-local" value={editando.inicia_local} onChange={(e) => setEditando({ ...editando, inicia_local: e.target.value })} />
                  <small>En tu hora ({zonaHorariaLocal()}). Cada alumno la ve convertida a la suya.</small>
                </div>
                <div className="crm-input-group lms-campo-corto">
                  <label>Duración (min)</label>
                  <input type="number" min="5" value={editando.duracion_sesion} onChange={(e) => setEditando({ ...editando, duracion_sesion: e.target.value })} />
                </div>
                <div className="crm-input-group lms-campo-corto">
                  <label>Mín. para asistencia</label>
                  <input type="number" min="0" value={editando.minutos_minimos} onChange={(e) => setEditando({ ...editando, minutos_minimos: e.target.value })} />
                </div>
              </div>
              <div className="crm-input-group">
                <label>Enlace de respaldo (opcional)</label>
                <input type="text" value={editando.enlace_respaldo} onChange={(e) => setEditando({ ...editando, enlace_respaldo: e.target.value })} placeholder="https://zoom.us/j/…  (solo si Zoom no está conectado)" />
                <small>El alumno se registra desde la lección y Zoom le genera un enlace personal que nunca ve: entra con el botón "Unirse", que se activa 15 minutos antes. La asistencia se confirma sola con el reporte de Zoom.</small>
              </div>
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

          {['texto', 'tarea', 'web', 'examen', 'encuesta', 'sesion'].includes(editando.tipo) && (
            <div className="crm-input-group">
              <label>{{ texto: 'Contenido de la lectura', tarea: 'Instrucciones de la tarea', web: 'Texto arriba de la página (opcional)', examen: 'Instrucciones del examen (opcional)', encuesta: 'Texto de bienvenida (opcional)', sesion: 'Descripción de la sesión (opcional)' }[editando.tipo]}</label>
              <textarea rows={['web', 'examen', 'encuesta', 'sesion'].includes(editando.tipo) ? 4 : 10} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} className="lms-textarea"
                placeholder={editando.tipo === 'texto'
                  ? '# Título\n\nUn párrafo de texto.\n\n- Una viñeta\n- Otra viñeta\n\n**Negritas** y [un enlace](https://…)'
                  : editando.tipo === 'web'
                    ? 'Qué debe hacer el alumno con esta página.'
                    : editando.tipo === 'tarea'
                      ? 'Describe qué tiene que entregar el alumno y cómo se evalúa.'
                      : 'Lo que el alumno lee antes de empezar.'} />
              <small>Formato: <code># Título</code>, <code>## Subtítulo</code>, <code>- viñeta</code>, <code>**negritas**</code>, <code>*cursiva*</code>, <code>[texto](https://enlace)</code>. Línea en blanco para separar párrafos.</small>
            </div>
          )}

          {esEvaluacion(editando.tipo) && !editando.id && (
            <small className="lms-ayuda">Al guardar pasas a escribir las preguntas.</small>
          )}

          {editando.tipo !== 'seccion' && (
            <label className="lms-check">
              <input type="checkbox" checked={!!editando.obligatoria} onChange={(e) => setEditando({ ...editando, obligatoria: e.target.checked })} />
              {editando.tipo === 'examen' ? 'Obligatorio: hay que aprobarlo para presentar el examen final' : 'Obligatoria para presentar el examen final'}
            </label>
          )}

          <div className="lms-editor-acciones">
            <button type="button" className="btn-crm-action outlined" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-crm-action solid" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar lección'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
