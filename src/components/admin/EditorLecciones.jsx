import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Edit, Plus, Trash2, Upload, PlayCircle, ListChecks, Users, RefreshCw, Copy, CheckCircle2, AlertTriangle, Loader2, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, llamarClonar } from '../../lib/cursos';
import { TIPOS_LECCION, cargarContenidos, videoDeLeccion, falta } from '../../lib/lecciones';
import { detectarVideo, detectarPagina, extraerEnlace } from '../../lib/videos';
import EditorEvaluacion from './EditorEvaluacion';
import AsistenciaSesion from './AsistenciaSesion';
import PanelLateral from './PanelLateral';
import SelectorTipoLeccion from './SelectorTipoLeccion';
import VistaEnlace from './VistaEnlace';
import { ListaOrdenable, ElementoOrdenable, AsaArrastre } from './Ordenable';
import { ICONOS_LECCION } from './tiposLeccion';
import { moverEnLista, cambiosDeOrden, aplicarCambios, seccionDeLeccion } from './ordenLecciones';
import { cargarSesionesAdmin, guardarSesionAdmin, aInputLocal, llamarSesion, zonaHorariaLocal } from '../../lib/sesiones';
import './AdminLms.css';

// Editor de las lecciones de un curso: agregar, ordenar (arrastrando), editar y
// quitar. Escribe directo en la base con la sesión del administrador (las
// políticas solo lo permiten a administradores).

const FALTA_MIGRACION = 'Para usar videos de Vimeo u otras plataformas y páginas web, corre en Supabase la migración lms-enlaces.sql.';
const FALTA_EVALUACIONES = 'Para exámenes, encuestas y secciones corre en Supabase la migración lms-evaluaciones.sql.';
const TIPOS_NUEVOS = ['examen', 'encuesta', 'seccion', 'sesion'];
const esEvaluacion = (tipo) => tipo === 'examen' || tipo === 'encuesta';

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

// La lección en la forma del formulario de edición.
const formularioDe = (l) => ({
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
});

// Para saber si el formulario cambió: el archivo elegido cuenta por su nombre.
const firma = (l) => (l ? JSON.stringify({ ...l, archivoNuevo: l.archivoNuevo?.name || null, recienCreada: undefined }) : '');

/** Qué le falta a una lección para que el alumno la pueda tomar ('' si nada). */
function faltante(l) {
  if (l.tipo === 'seccion') return '';
  if (l.tipo === 'sesion' && !l.sesion?.inicia_en) return 'Sin fecha';
  if (esEvaluacion(l.tipo) && l.preguntas === 0) return 'Sin preguntas';
  if ((l.tipo === 'video' && !videoDeLeccion(l)) || (l.tipo === 'pdf' && !l.archivo_path) || (l.tipo === 'texto' && !l.texto) || (l.tipo === 'web' && !l.enlace)) return 'Sin contenido';
  return '';
}

// Secciones contraídas de cada curso (solo en este navegador).
const claveContraidas = (courseId) => `hce:lecciones-contraidas:${courseId}`;
function leerContraidas(courseId) {
  try { return new Set(JSON.parse(localStorage.getItem(claveContraidas(courseId)) || '[]')); } catch { return new Set(); }
}
function guardarContraidas(courseId, conjunto) {
  try { localStorage.setItem(claveContraidas(courseId), JSON.stringify([...conjunto])); } catch { /* sin almacenamiento */ }
}

const ETIQUETA_TEXTO = { texto: 'Contenido de la lectura', tarea: 'Instrucciones de la tarea', web: 'Texto arriba de la página (opcional)', examen: 'Instrucciones del examen (opcional)', encuesta: 'Texto de bienvenida (opcional)', sesion: 'Descripción de la sesión (opcional)' };

export default function EditorLecciones({ courseId, cursos = [], onCambio, notificar, confirmar, onCambios }) {
  const [lecciones, setLecciones] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [editando, setEditando] = useState(null);
  // Cómo estaba la lección al abrir el formulario: para avisar de cambios sin guardar.
  const [original, setOriginal] = useState(null);
  const [eligiendoTipo, setEligiendoTipo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Lección de examen o encuesta cuyas preguntas se están editando.
  const [evaluando, setEvaluando] = useState(null);
  // Sesión en vivo cuya asistencia se está viendo.
  const [asistencia, setAsistencia] = useState(null);
  const [trayendoZoom, setTrayendoZoom] = useState(false);
  // "Copiar lección" (de otro curso o de este mismo): curso elegido y sus lecciones.
  const [copiando, setCopiando] = useState(null);
  // Mientras se guarda un cambio de orden no se permite otro.
  const [moviendo, setMoviendo] = useState(false);
  const [estadoOrden, setEstadoOrden] = useState('');
  const temporizadorOrden = useRef(null);
  const [copiandoId, setCopiandoId] = useState(null);
  const [contraidas, setContraidas] = useState(() => leerContraidas(courseId));
  const [arrastrandoPdf, setArrastrandoPdf] = useState(false);
  const preguntando = useRef(false);
  // Mientras se arrastra una sección, sus lecciones se esconden: se mueven con ella.
  const [seccionArrastrada, setSeccionArrastrada] = useState(null);

  const cambiosLeccion = !!editando && firma(editando) !== firma(original);
  const confirmarFn = useCallback(
    (mensaje, titulo) => (confirmar ? confirmar(mensaje, titulo) : Promise.resolve(window.confirm(mensaje))),
    [confirmar]
  );

  // Con cambios sin guardar en la lección se avisa al panel (al cerrar el curso)
  // y al navegador (al cerrar la pestaña).
  useEffect(() => {
    if (!cambiosLeccion) return undefined;
    onCambios?.(true);
    const salir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', salir);
    return () => { onCambios?.(false); window.removeEventListener('beforeunload', salir); };
  }, [cambiosLeccion, onCambios]);

  useEffect(() => () => clearTimeout(temporizadorOrden.current), []);

  const elegirCursoOrigen = async (id) => {
    setCopiando({ cursoId: id, lecciones: null });
    if (!id) return;
    const { data, error } = await supabase.from('curso_lecciones').select('id, orden, titulo, tipo').eq('course_id', Number(id)).order('orden').order('id');
    if (error) {
      notificar(`No se pudieron cargar las lecciones de ese curso: ${error.message}`, 'error');
      setCopiando({ cursoId: id, lecciones: [], error: error.message });
      return;
    }
    setCopiando({ cursoId: id, lecciones: data || [] });
  };

  const cargar = useCallback(async () => {
    setErrorCarga('');
    try {
    const { data, error } = await supabase
      .from('curso_lecciones')
      .select('id, orden, titulo, tipo, descripcion, duracion_min, obligatoria')
      .eq('course_id', courseId)
      .order('orden')
      .order('id');
    if (error) {
      if (esTablaFaltante(error)) setFaltaMigracion(true);
      else throw error;
      return;
    }
    const ids = (data || []).map((l) => l.id);
    const { data: contenidos, error: errorContenidos } = await cargarContenidos(ids);
    if (errorContenidos) throw errorContenidos;
    const porId = new Map((contenidos || []).map((c) => [c.leccion_id, c]));
    const sesiones = await cargarSesionesAdmin((data || []).filter((l) => l.tipo === 'sesion').map((l) => l.id));
    // Cuántas preguntas tiene cada examen o encuesta: sin preguntas no hay nada que contestar.
    const idsEvaluacion = (data || []).filter((l) => esEvaluacion(l.tipo)).map((l) => l.id);
    // Si no se pudieron contar (p. ej. sin la migración), se deja en null y no se marca nada.
    let preguntasPorLeccion = null;
    if (idsEvaluacion.length) {
      const { data: preguntas, error: errPreguntas } = await supabase.from('evaluacion_preguntas').select('leccion_id').in('leccion_id', idsEvaluacion);
      if (!errPreguntas) {
        preguntasPorLeccion = new Map();
        (preguntas || []).forEach((p) => preguntasPorLeccion.set(p.leccion_id, (preguntasPorLeccion.get(p.leccion_id) || 0) + 1));
      }
    }
    setLecciones((data || []).map((l) => ({
      ...l,
      ...(porId.get(l.id) || {}),
      sesion: sesiones[l.id] || null,
      preguntas: esEvaluacion(l.tipo) && preguntasPorLeccion ? (preguntasPorLeccion.get(l.id) || 0) : null,
    })));
    } catch (err) {
      setErrorCarga(err.message || 'Intenta de nuevo.');
      notificar(`No se pudieron cargar las lecciones: ${err.message}`, 'error');
    }
  }, [courseId, notificar]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Copia una lección (de otro curso o de este) al final del temario.
  const copiarLeccion = async (leccion) => {
    setCopiandoId(leccion.id);
    try {
      await llamarClonar('copiar-leccion', { leccionId: leccion.id, destinoCourseId: courseId });
      if (leccion.tipo === 'sesion') {
        notificar(`"${leccion.titulo}" se copió al final del temario SIN fecha ni reunión de Zoom: edítala y ponle la fecha nueva de la sesión.`, 'warning');
      } else {
        notificar(`"${leccion.titulo}" se copió al final del temario.`, 'success');
      }
      await cargar();
      // Si se copió dentro del mismo curso, la lista del panel de copiar también cambia.
      if (copiando && Number(copiando.cursoId) === Number(courseId)) void elegirCursoOrigen(copiando.cursoId);
      onCambio?.();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setCopiandoId(null);
    }
  };

  // El catálogo decide si el curso "se toma en el aula" con este indicador.
  const actualizarIndicador = async (cantidad) => {
    await supabase.from('courses').update({ tiene_video: cantidad > 0 }).eq('id', courseId);
    onCambio?.();
  };

  // ---- Abrir y cerrar el formulario -------------------------------------------

  const abrirEditor = (leccion) => {
    const datos = formularioDe(leccion);
    setEligiendoTipo(false);
    setCopiando(null);
    setOriginal(datos);
    setEditando(datos);
  };

  // Nueva lección del tipo elegido. Si ya había escrito un título (al cambiar de
  // tipo), se conserva.
  const nuevaLeccion = (tipo) => {
    const base = leccionVacia(tipo);
    setOriginal(base);
    setEditando(editando && !editando.id
      ? { ...base, titulo: editando.titulo, descripcion: editando.descripcion, duracion_min: editando.duracion_min }
      : base);
    setEligiendoTipo(false);
  };

  const cerrarEditor = async () => {
    // Esc dos veces no abre dos preguntas.
    if (guardando || preguntando.current) return;
    if (cambiosLeccion) {
      preguntando.current = true;
      try {
        if (!(await confirmarFn('Hay cambios sin guardar en esta lección. ¿Cerrar y descartarlos?', 'Cambios sin guardar'))) return;
      } finally {
        preguntando.current = false;
      }
    }
    setEditando(null);
    setOriginal(null);
  };

  const abrirAgregar = () => { setCopiando(null); setEligiendoTipo(true); };
  const abrirCopiar = () => { setEligiendoTipo(false); setEditando(null); setOriginal(null); setCopiando({ cursoId: '', lecciones: null }); };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
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
    // Es nueva si no tiene id, o si la fila se creó en un intento anterior que
    // falló después (p. ej. al subir el PDF): ese reintento ya solo actualiza.
    const nueva = !editando.id || !!editando.recienCreada;
    let insertadaAhora = false;
    try {
      // El curso no va aquí: al actualizar, una lección nunca cambia de curso.
      const datos = {
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
        const { data, error } = await supabase.from('curso_lecciones').insert([{ ...datos, course_id: courseId, orden }]).select('id').single();
        if (error) throw error;
        leccionId = data.id;
        insertadaAhora = true;
        // Se guarda el id de inmediato: si algo de abajo falla y se reintenta,
        // se actualiza esta misma fila en vez de crear otra lección.
        setEditando((ed) => (ed ? { ...ed, id: leccionId, recienCreada: true } : ed));
      }

      // El PDF se sube hasta tener el número de la lección, porque va en la ruta.
      let archivoPath = editando.archivo_path || null;
      if (editando.tipo === 'pdf' && editando.archivoNuevo) {
        const limpio = editando.archivoNuevo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        archivoPath = `${courseId}/${leccionId}/${Date.now()}_${limpio}`;
        const { error: errSubida } = await supabase.storage.from('curso-materiales').upload(archivoPath, editando.archivoNuevo);
        if (errSubida) throw errSubida;
        // Ya subido: si lo de abajo falla, el reintento no lo vuelve a subir.
        setEditando((ed) => (ed ? { ...ed, archivo_path: archivoPath, archivoNuevo: null } : ed));
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

      notificar(nueva ? 'Lección agregada.' : 'Lección actualizada.', 'success');
      const tipoGuardado = editando.tipo;
      setEditando(null);
      setOriginal(null);
      await cargar();
      // Un examen o encuesta recién creado pasa directo a sus preguntas.
      if (nueva && esEvaluacion(tipoGuardado)) setEvaluando({ id: leccionId, tipo: tipoGuardado, titulo: datos.titulo });
      await actualizarIndicador((lecciones?.length || 0) + (nueva ? 1 : 0));
    } catch (err) {
      const faltaTipo = err.code === '23514' ? (TIPOS_NUEVOS.includes(editando.tipo) ? FALTA_EVALUACIONES : FALTA_MIGRACION) : null;
      notificar(
        faltaTipo ||
          `No se pudo guardar la lección: ${err.message}${insertadaAhora ? ' La lección ya quedó creada; corrige y vuelve a guardar para terminar.' : ''}`,
        'error'
      );
      // La fila nueva ya existe: se muestra en la lista aunque falte terminarla.
      if (insertadaAhora) void cargar();
    } finally {
      setGuardando(false);
    }
  };

  // ---- Orden ----------------------------------------------------------------

  const avisoOrden = (estado) => {
    clearTimeout(temporizadorOrden.current);
    setEstadoOrden(estado);
    if (estado === 'guardado') temporizadorOrden.current = setTimeout(() => setEstadoOrden(''), 2500);
  };

  // Al soltar una lección: se ve el nuevo orden al instante, se guardan solo las
  // filas que cambian de número y, si algo falla, se deshace lo ya escrito y la
  // lista vuelve a como estaba.
  const moverArrastrando = async (activoId, sobreId) => {
    if (moviendo || !lecciones) return;
    const anterior = lecciones;
    const nueva = moverEnLista(anterior, activoId, sobreId);
    if (nueva === anterior) return;
    const cambios = cambiosDeOrden(anterior, nueva);
    setLecciones(aplicarCambios(nueva, cambios));
    // Si la lección cayó dentro de una sección contraída, se abre para que se vea.
    const destino = nueva.find((l) => l.id === activoId)?.tipo === 'seccion' ? null : seccionDeLeccion(nueva, activoId);
    if (destino && contraidas.has(destino)) alternarSeccion(destino);
    if (!cambios.length) return;

    setMoviendo(true);
    avisoOrden('guardando');
    // `.select('id')` no es adorno: cuando RLS bloquea un update, Supabase no
    // devuelve error, solo cero filas. Sin pedir las filas de vuelta, un admin
    // suspendido vería "Guardado" sin que se hubiera escrito nada.
    const resultados = await Promise.all(cambios.map((c) =>
      supabase.from('curso_lecciones').update({ orden: c.orden }).eq('id', c.id).select('id')
        .then(
          (r) => ({
            ...c,
            error: r.error || (r.data?.length ? null : { message: 'no tienes permiso para modificar esta lección' }),
          }),
          (error) => ({ ...c, error })
        )
    ));
    const fallido = resultados.find((r) => r.error);
    if (fallido) {
      const hechos = resultados.filter((r) => !r.error);
      await Promise.all(hechos.map((c) => supabase.from('curso_lecciones').update({ orden: c.antes }).eq('id', c.id).then(() => null, () => null)));
      setLecciones(anterior);
      avisoOrden('error');
      notificar(`No se pudo guardar el nuevo orden: ${fallido.error.message || 'error de conexión'}. La lista volvió a como estaba.`, 'error');
      // Se recarga para mostrar exactamente lo que quedó guardado.
      await cargar();
    } else {
      avisoOrden('guardado');
    }
    setMoviendo(false);
  };

  const alternarSeccion = (id) => {
    setContraidas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
      guardarContraidas(courseId, nuevo);
      return nuevo;
    });
  };

  // ---- Eliminar ---------------------------------------------------------------

  // Cuántos registros de alumnos se perderían al borrar la lección.
  const contarImpacto = async (leccionId) => {
    const contar = async (tabla) => {
      const { count, error } = await supabase.from(tabla).select('*', { count: 'exact', head: true }).eq('leccion_id', leccionId);
      if (error) return esTablaFaltante(error) ? 0 : null;
      return count || 0;
    };
    const [avances, intentos, entregas, registros] = await Promise.all([
      contar('leccion_progreso'),
      contar('evaluacion_intentos'),
      contar('tarea_entregas'),
      contar('sesion_registros'),
    ]);
    return { avances, intentos, entregas, registros };
  };

  const eliminar = async (leccion) => {
    const impacto = await contarImpacto(leccion.id);
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    const partes = [
      impacto.avances ? plural(impacto.avances, 'avance de alumno', 'avances de alumnos') : '',
      impacto.intentos ? plural(impacto.intentos, 'intento de examen o encuesta', 'intentos de examen o encuesta') : '',
      impacto.entregas ? plural(impacto.entregas, 'entrega de tarea', 'entregas de tarea') : '',
      impacto.registros ? plural(impacto.registros, 'registro a la sesión en vivo', 'registros a la sesión en vivo') : '',
    ].filter(Boolean);
    const desconocido = Object.values(impacto).some((v) => v === null);
    const detalle = partes.length
      ? `Se borrarían para siempre: ${partes.join(', ')}.`
      : desconocido
        ? 'No se pudo revisar si hay avance de alumnos; si lo hay, también se borra.'
        : 'Ningún alumno tiene avance, intentos, entregas ni registros en ella.';
    const mensaje = `¿Eliminar la lección "${leccion.titulo}"? ${detalle} Esto no se puede deshacer.`;
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

  // ---- Pantallas completas ------------------------------------------------------

  if (faltaMigracion) {
    return (
      <div className="lms-aviso">
        Para armar el curso por lecciones hay que correr en Supabase la migración <code>lms-estructura.sql</code>.
      </div>
    );
  }

  if (errorCarga) return <div className="lms-aviso lms-aviso--error" role="alert">No se pudieron actualizar las lecciones: {errorCarga} <button type="button" className="btn-crm-action outlined mini" onClick={() => void cargar()}><RefreshCw size={14} /> Reintentar</button></div>;
  if (lecciones === null) return <p className="lms-cargando">Cargando lecciones…</p>;

  if (asistencia) {
    return <AsistenciaSesion leccion={asistencia} courseId={courseId} notificar={notificar} confirmar={confirmar} onCerrar={() => setAsistencia(null)} />;
  }

  // Al volver de las preguntas se recarga: cambia si el examen ya tiene preguntas.
  if (evaluando) {
    return (
      <EditorEvaluacion
        onCambios={onCambios}
        leccion={evaluando}
        notificar={notificar}
        confirmar={confirmar || (async (m) => window.confirm(m))}
        onCerrar={() => { setEvaluando(null); void cargar(); }}
      />
    );
  }

  // ---- Lista agrupada por secciones -----------------------------------------------

  const filas = [];
  const resumenSeccion = new Map();
  let seccionActual = null;
  let numero = 0;
  for (const l of lecciones) {
    if (l.tipo === 'seccion') {
      seccionActual = l.id;
      resumenSeccion.set(l.id, { total: 0, pendientes: 0 });
      filas.push({ leccion: l, numero: null, seccion: null, oculta: false });
      continue;
    }
    numero += 1;
    const pendiente = faltante(l);
    if (seccionActual) {
      const r = resumenSeccion.get(seccionActual);
      r.total += 1;
      if (pendiente) r.pendientes += 1;
    }
    filas.push({ leccion: l, numero, seccion: seccionActual, oculta: !!seccionActual && (contraidas.has(seccionActual) || seccionActual === seccionArrastrada), falta: pendiente });
  }
  const visibles = filas.filter((f) => !f.oculta);
  const totalLecciones = numero;
  const totalPendientes = filas.filter((f) => f.falta).length;
  const secciones = [...resumenSeccion.keys()];
  const todasContraidas = secciones.length > 0 && secciones.every((id) => contraidas.has(id));
  const nombreDe = (id) => lecciones.find((l) => l.id === id)?.titulo || 'lección';

  const alternarTodas = () => {
    const nuevo = todasContraidas ? new Set() : new Set(secciones);
    guardarContraidas(courseId, nuevo);
    setContraidas(nuevo);
  };

  const panelAbierto = !!editando || eligiendoTipo || !!copiando;

  return (
    <div className="lms-lecciones">
      {lecciones.length === 0 ? (
        <div className="lms-vacio-agregar">
          <p><strong>Este curso todavía no tiene lecciones.</strong> Elige qué agregar primero. Con "Sección" agrupas las lecciones por módulo.</p>
          <SelectorTipoLeccion onElegir={nuevaLeccion} onCopiar={abrirCopiar} />
        </div>
      ) : (
        <>
          <div className="lms-barra">
            <span className="lms-resumen">
              {totalLecciones} {totalLecciones === 1 ? 'lección' : 'lecciones'}
              {secciones.length > 0 && ` en ${secciones.length} ${secciones.length === 1 ? 'sección' : 'secciones'}`}
              {totalPendientes > 0 && <span className="lms-pastilla lms-pastilla--ambar">{totalPendientes} sin terminar</span>}
            </span>
            <span className="lms-estado-orden" role="status" aria-live="polite">
              {estadoOrden === 'guardando' && <><Loader2 size={13} className="lms-girando" /> Guardando orden…</>}
              {estadoOrden === 'guardado' && <><CheckCircle2 size={13} /> Orden guardado</>}
              {estadoOrden === 'error' && <><AlertTriangle size={13} /> No se guardó el orden</>}
            </span>
            {secciones.length > 0 && (
              <button type="button" className="btn-crm-action outlined mini" onClick={alternarTodas}>
                {todasContraidas ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
                {todasContraidas ? 'Expandir todo' : 'Contraer todo'}
              </button>
            )}
            <button type="button" className="btn-crm-action solid" onClick={abrirAgregar}>
              <Plus size={15} /> Agregar lección
            </button>
          </div>

          <p className="lms-ayuda lms-ayuda-orden">
            Arrastra el asa <span aria-hidden="true">⋮⋮</span> para cambiar el orden{secciones.length > 0 ? '; una sección se mueve con todas sus lecciones' : ''}. Con teclado: enfoca el asa, Espacio, flechas y Espacio para soltar.
          </p>

          <ListaOrdenable
            ids={visibles.map((f) => f.leccion.id)}
            onMover={moverArrastrando}
            onEmpezar={(id) => { if (lecciones.find((l) => l.id === id)?.tipo === 'seccion') setSeccionArrastrada(id); }}
            onTerminar={() => setSeccionArrastrada(null)}
            nombreDe={nombreDe}
          >
            <ol className="lms-lista">
              {visibles.map(({ leccion: l, numero: n, seccion, falta: pendiente }) => {
                const Icono = ICONOS_LECCION[l.tipo] || PlayCircle;
                if (l.tipo === 'seccion') {
                  const abierta = !contraidas.has(l.id);
                  const r = resumenSeccion.get(l.id);
                  return (
                    <ElementoOrdenable key={l.id} id={l.id} deshabilitado={moviendo} className="lms-fila lms-fila--seccion">
                      {(asa) => (
                        <>
                          <AsaArrastre asa={asa} etiqueta={l.titulo} deshabilitado={moviendo} />
                          <button type="button" className="lms-seccion-alternar" aria-expanded={abierta} onClick={() => alternarSeccion(l.id)}>
                            {abierta ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span className="lms-fila-texto">
                              <strong>{l.titulo}</strong>
                              <small>
                                Sección · {r.total} {r.total === 1 ? 'lección' : 'lecciones'}
                                {!abierta && r.pendientes > 0 && <span className="lms-pastilla lms-pastilla--ambar">{r.pendientes} sin terminar</span>}
                              </small>
                            </span>
                          </button>
                          <span className="lms-acciones">
                            <button type="button" className="icon-action-btn edit" title="Editar sección" aria-label={`Editar sección ${l.titulo}`} onClick={() => abrirEditor(l)}><Edit size={15} /></button>
                            <button type="button" className="icon-action-btn delete" title="Eliminar sección" aria-label={`Eliminar sección ${l.titulo}`} onClick={() => eliminar(l)}><Trash2 size={15} /></button>
                          </span>
                        </>
                      )}
                    </ElementoOrdenable>
                  );
                }
                return (
                  <ElementoOrdenable key={l.id} id={l.id} deshabilitado={moviendo} className={`lms-fila${seccion ? ' lms-fila--dentro' : ''}${pendiente ? ' lms-fila--pendiente' : ''}`}>
                    {(asa) => (
                      <>
                        <AsaArrastre asa={asa} etiqueta={l.titulo} deshabilitado={moviendo} />
                        <span className="lms-orden">{n}</span>
                        <span className="lms-tipo-icono" title={TIPOS_LECCION[l.tipo]}><Icono size={16} aria-hidden="true" /></span>
                        <button type="button" className="lms-fila-texto lms-fila-abrir" onClick={() => abrirEditor(l)}>
                          <strong>{l.titulo}</strong>
                          <small>
                            <span>{TIPOS_LECCION[l.tipo]}{l.duracion_min ? ` · ${l.duracion_min} min` : ''}</span>
                            {pendiente && <span className="lms-pastilla lms-pastilla--ambar"><AlertTriangle size={11} aria-hidden="true" /> {pendiente}</span>}
                            {l.obligatoria === false
                              ? <span className="lms-pastilla lms-pastilla--opcional">Opcional</span>
                              : <span className="lms-pastilla">Obligatoria</span>}
                          </small>
                        </button>
                        <span className="lms-acciones">
                          {l.tipo === 'sesion' && (
                            <button type="button" className="icon-action-btn edit" title="Registros y asistencia" aria-label={`Registros y asistencia de ${l.titulo}`} onClick={() => setAsistencia(l)}><Users size={15} /></button>
                          )}
                          {esEvaluacion(l.tipo) && (
                            <button type="button" className="icon-action-btn edit" title="Preguntas" aria-label={`Preguntas de ${l.titulo}`} onClick={() => setEvaluando(l)}><ListChecks size={15} /></button>
                          )}
                          <button type="button" className="icon-action-btn edit" title="Editar" aria-label={`Editar ${l.titulo}`} onClick={() => abrirEditor(l)}><Edit size={15} /></button>
                          <button type="button" className="icon-action-btn" title="Duplicar en este curso" aria-label={`Duplicar ${l.titulo}`} disabled={copiandoId !== null} onClick={() => copiarLeccion(l)}>
                            {copiandoId === l.id ? <Loader2 size={15} className="lms-girando" /> : <Copy size={15} />}
                          </button>
                          <button type="button" className="icon-action-btn delete" title="Eliminar" aria-label={`Eliminar ${l.titulo}`} onClick={() => eliminar(l)}><Trash2 size={15} /></button>
                        </span>
                      </>
                    )}
                  </ElementoOrdenable>
                );
              })}
            </ol>
          </ListaOrdenable>

          <button type="button" className="lms-agregar-final" onClick={abrirAgregar}>
            <Plus size={15} /> Agregar lección al final
          </button>
        </>
      )}

      {panelAbierto && (
        eligiendoTipo ? (
          <PanelLateral titulo={editando ? 'Cambiar tipo de lección' : 'Agregar lección'} subtitulo="¿Qué quieres agregar?" onCerrar={() => setEligiendoTipo(false)} ancho={640}>
            <SelectorTipoLeccion onElegir={nuevaLeccion} onCopiar={editando ? null : abrirCopiar} />
          </PanelLateral>
        ) : editando ? (
          <PanelLateral
            titulo={editando.id ? (editando.tipo === 'seccion' ? 'Editar sección' : 'Editar lección') : `Nueva ${editando.tipo === 'seccion' ? 'sección' : 'lección'}`}
            subtitulo={TIPOS_LECCION[editando.tipo]}
            cambios={cambiosLeccion}
            ocupado={guardando}
            onCerrar={cerrarEditor}
            onSubmit={guardar}
            pie={(
              <>
                <small className="panel-lateral-atajos">Esc cierra · Ctrl+Enter guarda</small>
                <button type="button" className="btn-crm-action outlined" disabled={guardando} onClick={cerrarEditor}>Cancelar</button>
                <button type="submit" className="btn-crm-action solid" disabled={guardando}>
                  {guardando ? <><Loader2 size={14} className="lms-girando" /> Guardando…</> : 'Guardar'}
                </button>
              </>
            )}
          >
            {renderFormulario()}
          </PanelLateral>
        ) : (
          <PanelLateral
            titulo="Copiar una lección"
            subtitulo="Se agrega al final del temario"
            onCerrar={() => setCopiando(null)}
            pie={<button type="button" className="btn-crm-action outlined" onClick={() => setCopiando(null)}>Listo</button>}
          >
            {renderCopiar()}
          </PanelLateral>
        )
      )}
    </div>
  );

  // ---- Piezas del panel (funciones declaradas: se pueden usar arriba) --------------

  function renderCopiar() {
    return (
      <div className="lms-copiar">
        <label className="crm-input-group">
          <span className="reglas-etiqueta">Curso de origen</span>
          <select value={copiando.cursoId || ''} onChange={(e) => elegirCursoOrigen(e.target.value)}>
            <option value="">Elige el curso de donde copiar</option>
            <option value={String(courseId)}>Este mismo curso</option>
            {cursos.filter((c) => !isNaN(Number(c.id)) && Number(c.id) !== Number(courseId)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        {copiando.cursoId && copiando.lecciones === null && <p className="lms-cargando">Cargando…</p>}
        {copiando.error && (
          <p className="lms-aviso lms-aviso--error" role="alert">
            No se pudieron cargar las lecciones: {copiando.error}{' '}
            <button type="button" className="btn-crm-action outlined mini" onClick={() => elegirCursoOrigen(copiando.cursoId)}><RefreshCw size={12} /> Reintentar</button>
          </p>
        )}
        {copiando.lecciones?.length === 0 && !copiando.error && <p className="lms-vacio">Ese curso no tiene lecciones.</p>}
        {copiando.lecciones?.length > 0 && (
          <ul className="lms-copiar-lista">
            {copiando.lecciones.map((l) => {
              const Icono = ICONOS_LECCION[l.tipo] || PlayCircle;
              return (
                <li key={l.id}>
                  <Icono size={15} className="lms-icono" aria-hidden="true" />
                  <span>{l.titulo} <small>{TIPOS_LECCION[l.tipo]}</small></span>
                  <button type="button" className="btn-crm-action outlined mini" disabled={copiandoId !== null} onClick={() => copiarLeccion(l)}>
                    <Copy size={13} /> {copiandoId === l.id ? 'Copiando…' : 'Copiar'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <small className="lms-ayuda">Se hace una copia independiente al final del temario (con su contenido, examen y archivo): si luego cambias una, la otra no cambia. Una sesión en vivo se copia sin fecha ni reunión de Zoom: hay que editarla y ponerle la fecha nueva.</small>
      </div>
    );
  }

  function renderFormulario() {
    const cambiar = (campo) => (e) => setEditando({ ...editando, [campo]: e.target.value });
    const elegirPdf = (archivo) => {
      if (!archivo) return;
      if (archivo.type && archivo.type !== 'application/pdf') { notificar('Ese archivo no es un PDF.', 'error'); return; }
      setEditando({ ...editando, archivoNuevo: archivo });
    };
    return (
      <div className="lms-editor">
        {!editando.id && (
          <button type="button" className="lms-cambiar-tipo" onClick={() => setEligiendoTipo(true)}>
            <ArrowLeft size={13} /> Cambiar tipo
          </button>
        )}

        <div className="lms-fila-campos">
          <div className="crm-input-group">
            <label htmlFor="leccion-titulo">Título *</label>
            <input id="leccion-titulo" type="text" autoFocus value={editando.titulo} onChange={cambiar('titulo')} placeholder={editando.tipo === 'seccion' ? 'Ej. Módulo I: Fundamentos' : 'Ej. Canulación veno-venosa'} aria-invalid={!editando.titulo.trim() && cambiosLeccion ? true : undefined} />
            {!editando.titulo.trim() && cambiosLeccion && <small className="lms-alerta">Falta el título.</small>}
          </div>
          {editando.tipo !== 'seccion' && <div className="crm-input-group lms-campo-corto">
            <label htmlFor="leccion-duracion">Duración (min)</label>
            <input id="leccion-duracion" type="number" min="0" inputMode="numeric" value={editando.duracion_min} onChange={cambiar('duracion_min')} />
          </div>}
        </div>

        {editando.tipo === 'seccion' && (
          <small className="lms-ayuda">Una sección es un título que agrupa las lecciones que van debajo de ella en el temario, por ejemplo "Módulo I: Fundamentos". No tiene contenido ni cuenta en el avance.</small>
        )}

        {editando.tipo !== 'seccion' && <div className="crm-input-group">
          <label htmlFor="leccion-descripcion">Descripción breve</label>
          <input id="leccion-descripcion" type="text" value={editando.descripcion || ''} onChange={cambiar('descripcion')} placeholder="Qué va a aprender en esta lección" />
        </div>}

        {editando.tipo === 'video' && (
          <div className="crm-input-group">
            <label htmlFor="leccion-video">Enlace del video</label>
            <input id="leccion-video" type="url" inputMode="url" value={editando.video} onChange={cambiar('video')} placeholder="https://vimeo.com/…  ·  https://youtu.be/…" />
            <VistaEnlace tipo="video" valor={editando.video} />
            <small>YouTube (como "no listado"), Vimeo, un archivo .mp4, o el enlace o código para insertar de otra plataforma (Google Drive, Loom, Wistia…). Solo lo ven los alumnos inscritos.</small>
          </div>
        )}

        {editando.tipo === 'web' && (
          <div className="crm-input-group">
            <label htmlFor="leccion-web">Enlace de la página o código para insertar</label>
            <textarea id="leccion-web" rows="3" value={editando.enlace} onChange={cambiar('enlace')} className="lms-textarea" placeholder={'https://…  o  <iframe src="https://…"></iframe>'} />
            <VistaEnlace tipo="web" valor={editando.enlace} />
            <small>Se muestra dentro del aula: presentaciones de Google, Genially, formularios, simuladores, un sitio… El alumno la marca como completada.</small>
          </div>
        )}

        {editando.tipo === 'sesion' && (
          <div className="lms-sesion-campos">
            <div className="lms-fila-campos">
              <div className="crm-input-group">
                <label htmlFor="sesion-zoom">ID de la reunión de Zoom</label>
                <input id="sesion-zoom" type="text" inputMode="numeric" value={editando.zoom_id} onChange={cambiar('zoom_id')} placeholder="870 7903 5398" />
              </div>
              <div className="crm-input-group lms-campo-corto">
                <label htmlFor="sesion-tipo">Tipo</label>
                <select id="sesion-tipo" value={editando.zoom_tipo} onChange={cambiar('zoom_tipo')}>
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
            <div className="lms-fila-campos lms-fila-campos--tres">
              <div className="crm-input-group">
                <label htmlFor="sesion-fecha">Fecha y hora *</label>
                <input id="sesion-fecha" type="datetime-local" value={editando.inicia_local} onChange={cambiar('inicia_local')} />
                <small>En tu hora ({zonaHorariaLocal()}). Cada alumno la ve convertida a la suya.</small>
              </div>
              <div className="crm-input-group lms-campo-corto">
                <label htmlFor="sesion-duracion">Duración (min)</label>
                <input id="sesion-duracion" type="number" min="5" value={editando.duracion_sesion} onChange={cambiar('duracion_sesion')} />
              </div>
              <div className="crm-input-group lms-campo-corto">
                <label htmlFor="sesion-minimo">Mín. para asistencia</label>
                <input id="sesion-minimo" type="number" min="0" value={editando.minutos_minimos} onChange={cambiar('minutos_minimos')} />
              </div>
            </div>
            <div className="crm-input-group">
              <label htmlFor="sesion-respaldo">Enlace de respaldo (opcional)</label>
              <input id="sesion-respaldo" type="text" value={editando.enlace_respaldo} onChange={cambiar('enlace_respaldo')} placeholder="https://zoom.us/j/…  (solo si Zoom no está conectado)" />
              <small>El alumno se registra desde la lección y Zoom le genera un enlace personal que nunca ve: entra con el botón "Unirse", que se activa 15 minutos antes. La asistencia se confirma sola con el reporte de Zoom.</small>
            </div>
          </div>
        )}

        {editando.tipo === 'pdf' && (
          <div className="crm-input-group">
            <span className="reglas-etiqueta">Documento PDF</span>
            <div
              className={`lms-archivo${arrastrandoPdf ? ' arrastrando' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setArrastrandoPdf(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastrandoPdf(false); }}
              onDrop={(e) => { e.preventDefault(); setArrastrandoPdf(false); elegirPdf(e.dataTransfer.files?.[0]); }}
            >
              <label className="btn-crm-action outlined">
                <Upload size={14} /> {editando.archivoNuevo ? 'Cambiar archivo' : editando.archivo_path ? 'Reemplazar PDF' : 'Elegir PDF'}
                <input type="file" accept="application/pdf" onChange={(e) => elegirPdf(e.target.files?.[0] || null)} />
              </label>
              <span>{editando.archivoNuevo?.name || (editando.archivo_path ? editando.archivo_path.split('/').pop() : 'o arrástralo aquí')}</span>
              {(editando.archivoNuevo || editando.archivo_path) && <CheckCircle2 size={15} className="lms-ok" aria-label="Archivo listo" />}
            </div>
            <small>Se guarda privado: solo lo pueden abrir los alumnos inscritos, con un enlace que caduca en una hora.</small>
          </div>
        )}

        {['texto', 'tarea', 'web', 'examen', 'encuesta', 'sesion'].includes(editando.tipo) && (
          <div className="crm-input-group">
            <label htmlFor="leccion-texto">{ETIQUETA_TEXTO[editando.tipo]}</label>
            <textarea id="leccion-texto" rows={['web', 'examen', 'encuesta', 'sesion'].includes(editando.tipo) ? 4 : 10} value={editando.texto} onChange={cambiar('texto')} className="lms-textarea"
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
        {esEvaluacion(editando.tipo) && editando.id && (
          <button type="button" className="btn-crm-action outlined mini lms-ir-preguntas" disabled={cambiosLeccion} title={cambiosLeccion ? 'Guarda primero los cambios' : undefined} onClick={() => { const l = editando; setEditando(null); setOriginal(null); setEvaluando(l); }}>
            <ListChecks size={13} /> Editar preguntas{editando.preguntas != null ? ` (${editando.preguntas})` : ''}
          </button>
        )}

        {editando.tipo !== 'seccion' && (
          <label className="lms-check lms-check--tarjeta">
            <input type="checkbox" checked={!!editando.obligatoria} onChange={(e) => setEditando({ ...editando, obligatoria: e.target.checked })} />
            <span>
              <strong>{editando.tipo === 'examen' ? 'Obligatorio' : 'Obligatoria'}</strong>
              <small>{editando.tipo === 'examen' ? 'Hay que aprobarlo para presentar el examen final.' : 'Hay que completarla para presentar el examen final.'}</small>
            </span>
          </label>
        )}
      </div>
    );
  }
}
