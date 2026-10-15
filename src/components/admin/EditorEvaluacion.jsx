import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Edit, Plus, Trash2, X, Loader2, Eye, PencilLine, CheckCircle2 } from 'lucide-react';
import {
  TIPOS_PREGUNTA,
  ESCALA_BASE,
  cargarEvaluacionAdmin,
  guardarConfigEvaluacion,
  guardarPregunta,
  borrarPregunta,
  reordenarPreguntas,
} from '../../lib/evaluaciones';
import PanelLateral from './PanelLateral';
import VistaAlumnoEvaluacion from './VistaAlumnoEvaluacion';
import { ListaOrdenable, ElementoOrdenable, AsaArrastre } from './Ordenable';
import './AdminLms.css';

// Preguntas y reglas de un examen o una encuesta de lección.

const TIPOS_POR_EVALUACION = {
  examen: ['opcion', 'multiple', 'abierta'],
  encuesta: ['opcion', 'multiple', 'escala', 'abierta'],
};

const preguntaVacia = (tipo) => ({
  id: null,
  tipo,
  texto: '',
  opciones: tipo === 'escala' ? [...ESCALA_BASE] : tipo === 'abierta' ? [] : ['', ''],
  correctas: [],
  puntos: 1,
  obligatoria: true,
});

const CLAVE_VISTA = 'hce:evaluacion-vista';
function leerVista() {
  try { return localStorage.getItem(CLAVE_VISTA) === 'previa' ? 'previa' : 'editar'; } catch { return 'editar'; }
}

export default function EditorEvaluacion({ leccion, notificar, confirmar, onCerrar, onCambios }) {
  const esExamen = leccion.tipo === 'examen';
  const [datos, setDatos] = useState(null);
  const [config, setConfig] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [preguntaOriginal, setPreguntaOriginal] = useState(null);
  const [moviendo, setMoviendo] = useState(false);
  const [marcando, setMarcando] = useState(null);
  const [vista, setVista] = useState(leerVista);
  const [errorCarga, setErrorCarga] = useState('');
  const [reintento, setReintento] = useState(0);
  const cambiosConfig = !!datos && JSON.stringify(config) !== JSON.stringify(datos.config);
  const cambiosPregunta = !!editando && JSON.stringify(editando) !== JSON.stringify(preguntaOriginal);
  const cambios = cambiosConfig || cambiosPregunta;

  useEffect(() => {
    onCambios?.(cambios);
    const salir = (e) => { if (cambios) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', salir);
    return () => { onCambios?.(false); window.removeEventListener('beforeunload', salir); };
  }, [cambios, onCambios]);

  const cambiarVista = (v) => {
    setVista(v);
    try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento */ }
  };

  const cerrar = async () => {
    if (guardando || guardandoConfig) return;
    if (cambios && !(await confirmar('Hay cambios sin guardar. ¿Salir de la evaluación y descartarlos?', 'Cambios sin guardar'))) return;
    onCerrar();
  };
  const cancelarPregunta = async () => {
    if (guardando) return;
    if (cambiosPregunta && !(await confirmar('¿Descartar los cambios de esta pregunta?', 'Cambios sin guardar'))) return;
    setEditando(null);
    setPreguntaOriginal(null);
  };
  const abrirPregunta = async (pregunta) => {
    if (guardando) return;
    if (cambiosPregunta && !(await confirmar('¿Descartar los cambios de la pregunta actual?', 'Cambios sin guardar'))) return;
    setPreguntaOriginal(pregunta);
    setEditando(pregunta);
  };

  const aplicar = useCallback((r, mantenerConfig = false) => {
    if (r === null) { setFaltaMigracion(true); return; }
    setErrorCarga('');
    setDatos(r);
    if (!mantenerConfig) setConfig(r.config);
  }, []);

  const cargar = useCallback(async (mantenerConfig = cambiosConfig) => {
    try { aplicar(await cargarEvaluacionAdmin(leccion.id), mantenerConfig); }
    catch (err) { setErrorCarga(err.message || 'Intenta de nuevo.'); notificar(`No se pudo cargar la evaluación: ${err.message}`, 'error'); }
  }, [leccion.id, notificar, aplicar, cambiosConfig]);

  useEffect(() => {
    let vigente = true;
    cargarEvaluacionAdmin(leccion.id)
      .then((r) => { if (vigente) aplicar(r); })
      .catch((err) => { if (vigente) { setErrorCarga(err.message || 'Intenta de nuevo.'); notificar(`No se pudo cargar la evaluación: ${err.message}`, 'error'); } });
    return () => { vigente = false; };
  }, [leccion.id, notificar, aplicar, reintento]);

  const guardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      await guardarConfigEvaluacion(leccion.id, config);
      setDatos((actual) => ({ ...actual, config: { ...config } }));
      notificar('Reglas guardadas.', 'success');
    } catch (err) {
      notificar(`No se pudieron guardar las reglas: ${err.message}`, 'error');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    const p = editando;
    if (!p.texto.trim()) { notificar('Escribe la pregunta.', 'error'); return; }
    if (['opcion', 'multiple'].includes(p.tipo)) {
      const llenas = p.opciones.filter((o) => o.trim());
      if (llenas.length < 2) { notificar('Pon al menos dos opciones.', 'error'); return; }
      if (llenas.length !== p.opciones.length) { notificar('Hay opciones vacías: llénalas o quítalas.', 'error'); return; }
      if (esExamen && !p.correctas.length) { notificar('Marca la respuesta correcta.', 'error'); return; }
    }
    setGuardando(true);
    try {
      const orden = p.id ? p.orden : (datos.preguntas.reduce((m, x) => Math.max(m, x.orden ?? 0), 0) + 1);
      // En encuestas no hay respuestas correctas.
      // Primera pregunta: se guardan también las reglas, para que existan.
      if (!datos.preguntas.length) await guardarConfigEvaluacion(leccion.id, config);
      const id = await guardarPregunta(leccion.id, { ...p, orden, correctas: esExamen ? p.correctas : [] });
      setEditando((actual) => actual ? { ...actual, id, orden } : actual);
      setEditando(null);
      await cargar(datos.preguntas.length > 0 && cambiosConfig);
    } catch (err) {
      if (err.preguntaId) setEditando((actual) => actual ? { ...actual, id: err.preguntaId, orden: err.preguntaOrden } : actual);
      notificar(`No se pudo guardar la pregunta: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p) => {
    const ok = await confirmar('¿Eliminar esta pregunta? Las respuestas que ya dieron los alumnos a ella dejan de verse en el análisis.', 'Eliminar pregunta');
    if (!ok) return;
    try { await borrarPregunta(p.id); await cargar(); }
    catch (err) { notificar(`No se pudo eliminar: ${err.message}`, 'error'); }
  };

  // Al soltar una pregunta: se ve el orden nuevo al instante; si no se puede
  // guardar, la lista vuelve a como estaba y se recarga lo que quedó guardado.
  const moverArrastrando = async (activoId, sobreId) => {
    if (moviendo) return;
    const anterior = datos.preguntas;
    const desde = anterior.findIndex((p) => p.id === activoId);
    const hasta = anterior.findIndex((p) => p.id === sobreId);
    if (desde === -1 || hasta === -1 || desde === hasta) return;
    const lista = [...anterior];
    const [movida] = lista.splice(desde, 1);
    lista.splice(hasta, 0, movida);
    setDatos((actual) => ({ ...actual, preguntas: lista }));
    setMoviendo(true);
    try {
      await reordenarPreguntas(lista.map((p) => p.id));
    } catch (err) {
      setDatos((actual) => ({ ...actual, preguntas: anterior }));
      notificar(`No se pudo cambiar el orden: ${err.message}. Las preguntas volvieron a como estaban.`, 'error');
    } finally {
      await cargar();
      setMoviendo(false);
    }
  };

  // Marca la respuesta correcta desde la tarjeta, con un clic en la opción.
  const marcarRapido = async (p, indice) => {
    if (marcando || editando) return;
    const correctas = p.tipo === 'opcion'
      ? [indice]
      : (p.correctas.includes(indice) ? p.correctas.filter((c) => c !== indice) : [...p.correctas, indice]);
    if (!correctas.length) {
      notificar('Debe quedar al menos una respuesta correcta.', 'error');
      return;
    }
    const cambiar = (lista) => setDatos((actual) => ({ ...actual, preguntas: actual.preguntas.map((x) => (x.id === p.id ? { ...x, correctas: lista } : x)) }));
    cambiar(correctas);
    setMarcando(p.id);
    try {
      await guardarPregunta(leccion.id, { ...p, correctas });
    } catch (err) {
      cambiar(p.correctas);
      notificar(`No se pudo marcar la respuesta: ${err.message}`, 'error');
    } finally {
      setMarcando(null);
    }
  };

  const alternarCorrecta = (indice) => {
    const { tipo, correctas } = editando;
    if (tipo === 'opcion') setEditando({ ...editando, correctas: [indice] });
    else setEditando({ ...editando, correctas: correctas.includes(indice) ? correctas.filter((c) => c !== indice) : [...correctas, indice] });
  };

  const quitarOpcion = (indice) => {
    setEditando({
      ...editando,
      opciones: editando.opciones.filter((_, i) => i !== indice),
      // Los índices correctos se recorren al quitar una opción.
      correctas: editando.correctas.filter((c) => c !== indice).map((c) => (c > indice ? c - 1 : c)),
    });
  };

  if (faltaMigracion) {
    return (
      <div className="lms-aviso">
        Para los exámenes y encuestas de lección corre en Supabase la migración <code>lms-evaluaciones.sql</code>.
        <button type="button" className="btn-crm-action outlined" style={{ marginLeft: 10 }} onClick={cerrar}>Volver</button>
      </div>
    );
  }
  if (errorCarga) return <div className="lms-aviso lms-aviso--error" role="alert">No se pudo actualizar la evaluación: {errorCarga} <button type="button" className="btn-crm-action outlined mini" onClick={() => { if (datos) void cargar(); else { setErrorCarga(''); setReintento((n) => n + 1); } }}>Reintentar</button> <button type="button" className="btn-crm-action outlined mini" onClick={cerrar}>Volver a lecciones</button></div>;
  if (!datos) return <p className="lms-cargando">Cargando preguntas…</p>;

  const sinClave = esExamen ? datos.preguntas.filter((p) => ['opcion', 'multiple'].includes(p.tipo) && !p.correctas.length).length : 0;
  const nombreDe = (id) => {
    const i = datos.preguntas.findIndex((p) => p.id === id);
    return i === -1 ? 'pregunta' : `pregunta ${i + 1}`;
  };

  return (
    <div className="eval-editor">
      <div className="eval-editor-cabecera">
        <button type="button" className="btn-crm-action outlined" disabled={guardando || guardandoConfig} onClick={cerrar}><ArrowLeft size={14} /> Lecciones</button>
        <div className="eval-editor-titulo">
          <span className="eval-etiqueta">{esExamen ? 'Examen' : 'Encuesta'}</span>
          <h4>{leccion.titulo}</h4>
        </div>
        {cambios && <span className="panel-lateral-cambios" role="status">Cambios sin guardar</span>}
      </div>

      <div className="eval-reglas">
        {esExamen && (
          <>
            <label className="crm-input-group eval-campo-corto">
              <span>Mínimo para aprobar (%)</span>
              <input type="number" min="0" max="100" value={config.min_aprobacion} onChange={(e) => setConfig({ ...config, min_aprobacion: e.target.value })} />
            </label>
            <label className="crm-input-group eval-campo-corto">
              <span>Intentos permitidos</span>
              <input type="number" min="1" placeholder="Sin límite" value={config.intentos_max ?? ''} onChange={(e) => setConfig({ ...config, intentos_max: e.target.value || null })} />
            </label>
            <label className="lms-check">
              <input type="checkbox" checked={config.mostrar_respuestas} onChange={(e) => setConfig({ ...config, mostrar_respuestas: e.target.checked })} />
              Al terminar, mostrar qué contestó bien
            </label>
          </>
        )}
        <label className="lms-check">
          <input type="checkbox" checked={config.aleatorio} onChange={(e) => setConfig({ ...config, aleatorio: e.target.checked })} />
          Preguntas en orden aleatorio
        </label>
        <span className="eval-reglas-guardar">
          {!cambiosConfig && !guardandoConfig && <span className="eval-reglas-ok"><CheckCircle2 size={13} /> Al día</span>}
          <button type="button" className="btn-crm-action solid" disabled={guardandoConfig || guardando} onClick={guardarConfig}>
            {guardandoConfig ? <><Loader2 size={14} className="lms-girando" /> Guardando…</> : 'Guardar reglas'}
          </button>
        </span>
      </div>

      <div className="eval-vistas" role="tablist" aria-label="Modo">
        <button type="button" role="tab" aria-selected={vista === 'editar'} className={vista === 'editar' ? 'activo' : ''} onClick={() => cambiarVista('editar')}>
          <PencilLine size={14} /> Preguntas ({datos.preguntas.length})
        </button>
        <button type="button" role="tab" aria-selected={vista === 'previa'} className={vista === 'previa' ? 'activo' : ''} onClick={() => cambiarVista('previa')}>
          <Eye size={14} /> Como la ve el alumno
        </button>
      </div>

      {vista === 'previa' ? (
        <div role="tabpanel">
          <VistaAlumnoEvaluacion esExamen={esExamen} config={config} preguntas={datos.preguntas} />
        </div>
      ) : (
        <div role="tabpanel" className="eval-panel-preguntas">
          {sinClave > 0 && (
            <p className="lms-aviso eval-aviso-clave" role="status">
              {sinClave} {sinClave === 1 ? 'pregunta no tiene' : 'preguntas no tienen'} respuesta correcta y no {sinClave === 1 ? 'cuenta' : 'cuentan'} para la calificación. Toca la opción correcta para marcarla.
            </p>
          )}

          {datos.preguntas.length === 0 && (
            <p className="lms-vacio">Todavía no hay preguntas. Agrega la primera con uno de los botones de abajo.</p>
          )}

          {datos.preguntas.length > 1 && (
            <p className="lms-ayuda lms-ayuda-orden">Arrastra el asa <span aria-hidden="true">⋮⋮</span> para cambiar el orden de las preguntas.</p>
          )}

          {datos.preguntas.length > 0 && (
            <ListaOrdenable ids={datos.preguntas.map((p) => p.id)} onMover={moverArrastrando} nombreDe={nombreDe}>
              <ol className="eval-lista">
                {datos.preguntas.map((p, i) => {
                  const conClave = esExamen && ['opcion', 'multiple'].includes(p.tipo);
                  return (
                    <ElementoOrdenable key={p.id} id={p.id} deshabilitado={moviendo} className={`eval-pregunta${conClave && !p.correctas.length ? ' eval-pregunta--sin-clave' : ''}`}>
                      {(asa) => (
                        <>
                          <div className="eval-pregunta-cabecera">
                            <AsaArrastre asa={asa} etiqueta={`Pregunta ${i + 1}`} deshabilitado={moviendo} />
                            <span className="lms-orden">{i + 1}</span>
                            <button type="button" className="eval-pregunta-texto lms-fila-abrir" onClick={() => abrirPregunta({ ...p, opciones: [...(p.opciones || [])], correctas: [...(p.correctas || [])] })}>
                              <strong>{p.texto}</strong>
                              <small>
                                <span className="lms-pastilla">{TIPOS_PREGUNTA[p.tipo]}</span>
                                {conClave && <span className="lms-pastilla">{p.puntos} {Number(p.puntos) === 1 ? 'punto' : 'puntos'}</span>}
                                {!p.obligatoria && <span className="lms-pastilla lms-pastilla--opcional">Opcional</span>}
                              </small>
                            </button>
                            <span className="lms-acciones">
                              <button type="button" className="icon-action-btn edit" title="Editar" aria-label={`Editar pregunta ${i + 1}`} onClick={() => abrirPregunta({ ...p, opciones: [...(p.opciones || [])], correctas: [...(p.correctas || [])] })}><Edit size={15} /></button>
                              <button type="button" className="icon-action-btn delete" title="Eliminar" aria-label={`Eliminar pregunta ${i + 1}`} onClick={() => eliminar(p)}><Trash2 size={15} /></button>
                            </span>
                          </div>
                          {p.tipo !== 'abierta' && (conClave ? (
                            <div className="eval-opciones-marcar" role={p.tipo === 'opcion' ? 'radiogroup' : 'group'} aria-label={`Respuesta correcta de la pregunta ${i + 1}`}>
                              {(p.opciones || []).map((o, j) => {
                                const correcta = p.correctas.includes(j);
                                return (
                                  <button
                                    key={j}
                                    type="button"
                                    role={p.tipo === 'opcion' ? 'radio' : 'checkbox'}
                                    aria-checked={correcta}
                                    className={`eval-opcion-marcar${correcta ? ' correcta' : ''}${p.tipo === 'opcion' ? ' redonda' : ''}`}
                                    disabled={marcando === p.id || !!editando}
                                    title={correcta ? 'Respuesta correcta' : 'Marcar como correcta'}
                                    onClick={() => marcarRapido(p, j)}
                                  >
                                    <span className="eval-marca" aria-hidden="true">{correcta && <Check size={12} strokeWidth={3} />}</span>
                                    <span className="eval-opcion-texto">{o}</span>
                                    {correcta && <span className="eval-correcta-etiqueta">Correcta</span>}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <ul className="eval-opciones-vista">
                              {(p.opciones || []).map((o, j) => (
                                <li key={j}><span className="eval-punto" /> {p.tipo === 'escala' ? `${j + 1}. ` : ''}{o}</li>
                              ))}
                            </ul>
                          ))}
                        </>
                      )}
                    </ElementoOrdenable>
                  );
                })}
              </ol>
            </ListaOrdenable>
          )}

          <div className="lms-agregar eval-agregar">
            <span>Agregar pregunta:</span>
            {TIPOS_POR_EVALUACION[leccion.tipo].map((tipo) => (
              <button key={tipo} type="button" className="btn-crm-action outlined" onClick={() => abrirPregunta(preguntaVacia(tipo))}>
                <Plus size={14} /> {TIPOS_PREGUNTA[tipo]}
              </button>
            ))}
          </div>
        </div>
      )}

      {editando && (
        <PanelLateral
          titulo={editando.id ? 'Editar pregunta' : 'Nueva pregunta'}
          subtitulo={TIPOS_PREGUNTA[editando.tipo]}
          cambios={cambiosPregunta}
          ocupado={guardando}
          onCerrar={cancelarPregunta}
          onSubmit={guardar}
          pie={(
            <>
              <small className="panel-lateral-atajos">Esc cierra · Ctrl+Enter guarda</small>
              <button type="button" className="btn-crm-action outlined" disabled={guardando} onClick={cancelarPregunta}>Cancelar</button>
              <button type="submit" className="btn-crm-action solid" disabled={guardando}>
                {guardando ? <><Loader2 size={14} className="lms-girando" /> Guardando…</> : 'Guardar pregunta'}
              </button>
            </>
          )}
        >
          <div className="lms-editor">
            <div className="crm-input-group">
              <label htmlFor="pregunta-texto">Pregunta *</label>
              {/* El foco empieza en la pregunta. */}
              <textarea id="pregunta-texto" autoFocus rows="3" className="lms-textarea" value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} placeholder="¿De qué depende la normalidad de una variable?" />
            </div>

            {editando.tipo !== 'abierta' && (
              <div className="crm-input-group">
                <span className="reglas-etiqueta">
                  {editando.tipo === 'escala' ? 'Etiquetas de la escala (1 a 5)'
                    : esExamen ? `Opciones · toca el círculo de ${editando.tipo === 'opcion' ? 'la correcta' : 'las correctas'}` : 'Opciones'}
                </span>
                <div className="eval-opciones-edicion" role={esExamen && editando.tipo === 'opcion' ? 'radiogroup' : undefined} aria-label={esExamen && editando.tipo !== 'escala' ? 'Respuesta correcta' : undefined}>
                  {editando.opciones.map((o, j) => {
                    const correcta = editando.correctas.includes(j);
                    const marcable = esExamen && editando.tipo !== 'escala';
                    return (
                      <div key={j} className={`eval-opcion-fila${marcable && correcta ? ' correcta' : ''}`}>
                        {marcable ? (
                          <button
                            type="button"
                            role={editando.tipo === 'opcion' ? 'radio' : 'checkbox'}
                            aria-checked={correcta}
                            aria-label={`Opción ${j + 1} es correcta`}
                            className={`eval-marca eval-marca--boton${correcta ? ' activa' : ''}${editando.tipo === 'opcion' ? ' redonda' : ''}`}
                            onClick={() => alternarCorrecta(j)}
                          >
                            {correcta && <Check size={13} strokeWidth={3} />}
                          </button>
                        ) : (
                          <span className="eval-numero">{j + 1}</span>
                        )}
                        <input
                          type="text"
                          value={o}
                          aria-label={`Opción ${j + 1}`}
                          onChange={(e) => setEditando({ ...editando, opciones: editando.opciones.map((x, k) => (k === j ? e.target.value : x)) })}
                          placeholder={`Opción ${j + 1}`}
                        />
                        {marcable && correcta && <span className="eval-correcta-etiqueta">Correcta</span>}
                        {editando.tipo !== 'escala' && editando.opciones.length > 2 && (
                          <button type="button" className="icon-action-btn delete" title="Quitar opción" aria-label={`Quitar opción ${j + 1}`} onClick={() => quitarOpcion(j)}><X size={14} /></button>
                        )}
                      </div>
                    );
                  })}
                  {editando.tipo !== 'escala' && editando.opciones.length < 10 && (
                    <button type="button" className="btn-crm-action outlined mini" onClick={() => setEditando({ ...editando, opciones: [...editando.opciones, ''] })}>
                      <Plus size={13} /> Agregar opción
                    </button>
                  )}
                </div>
                {esExamen && ['opcion', 'multiple'].includes(editando.tipo) && !editando.correctas.length && (
                  <small className="lms-alerta">Falta marcar la respuesta correcta.</small>
                )}
              </div>
            )}

            <div className="eval-fila-final">
              {esExamen && ['opcion', 'multiple'].includes(editando.tipo) && (
                <label className="crm-input-group eval-campo-corto">
                  <span>Puntos</span>
                  <input type="number" min="1" value={editando.puntos} onChange={(e) => setEditando({ ...editando, puntos: e.target.value })} />
                </label>
              )}
              <label className="lms-check">
                <input type="checkbox" checked={editando.obligatoria} onChange={(e) => setEditando({ ...editando, obligatoria: e.target.checked })} />
                Obligatoria
              </label>
            </div>
            {esExamen && editando.tipo === 'abierta' && (
              <small className="lms-ayuda">Las respuestas abiertas no se califican solas: quedan guardadas para que las leas en el análisis.</small>
            )}
          </div>
        </PanelLateral>
      )}
    </div>
  );
}
