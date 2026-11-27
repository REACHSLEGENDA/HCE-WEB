import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { ArrowLeft, Check, Copy, Edit, Plus, Trash2, X, Loader2, Eye, PencilLine, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import {
  TIPOS_PREGUNTA,
  ESCALA_BASE,
  FALTA_MEJORAS,
  cargarEvaluacionAdmin,
  guardarConfigEvaluacion,
  guardarPregunta,
  borrarPregunta,
  reordenarPreguntas,
} from '../../lib/evaluaciones';
import { MIN_PARES, MAX_PARES, TIPOS_CON_CLAVE, validarPares } from '../../lib/evaluacionesLogica';
import PanelLateral from './PanelLateral';
import VistaAlumnoEvaluacion from './VistaAlumnoEvaluacion';
import ImportarPreguntas from './ImportarPreguntas';
import { ListaOrdenable, ElementoOrdenable, AsaArrastre } from './Ordenable';
import './AdminLms.css';
import './EditorEvaluacion.css';

// Preguntas y reglas de un examen o una encuesta de lección.

const TIPOS_POR_EVALUACION = {
  examen: ['opcion', 'multiple', 'abierta', 'emparejar'],
  encuesta: ['opcion', 'multiple', 'escala', 'abierta'],
};

const MAX_OPCIONES = 10;

const MOSTRAR_CORRECTAS = [
  ['nunca', 'Nunca'],
  ['siempre', 'Al terminar sus intentos'],
  ['al_aprobar', 'Solo si aprueba'],
];

const parVacio = () => ({ izquierda: '', derecha: '' });

const preguntaVacia = (tipo) => ({
  id: null,
  tipo,
  texto: '',
  opciones: tipo === 'escala' ? [...ESCALA_BASE] : ['abierta', 'emparejar'].includes(tipo) ? [] : ['', ''],
  correctas: [],
  ...(tipo === 'emparejar' ? { pares: [parVacio(), parVacio()] } : {}),
  puntos: 1,
  obligatoria: true,
});

// Copia para editar sin tocar la lista cargada.
const copiaPregunta = (p) => ({
  ...p,
  opciones: Array.isArray(p.opciones) ? [...p.opciones] : [],
  correctas: [...(p.correctas || [])],
  ...(p.tipo === 'emparejar' ? { pares: (p.pares || []).map((x) => ({ ...x })) } : {}),
});

/** Texto del problema de una pregunta antes de guardarla; '' si está bien. */
// Con `sinClave`, una pregunta de examen puede quedar sin respuesta correcta
// (al importar): la lista la marca y se elige con un toque en la opción.
function errorDePregunta(p, esExamen, { sinClave = false } = {}) {
  if (!String(p.texto || '').trim()) return 'Escribe la pregunta.';
  if (['opcion', 'multiple'].includes(p.tipo)) {
    const opciones = Array.isArray(p.opciones) ? p.opciones : [];
    const llenas = opciones.filter((o) => String(o ?? '').trim());
    if (llenas.length < 2) return 'Pon al menos dos opciones.';
    if (llenas.length !== opciones.length) return 'Hay opciones vacías: llénalas o quítalas.';
    if (opciones.length > MAX_OPCIONES) return `Son ${MAX_OPCIONES} opciones como máximo.`;
    const correctas = p.correctas || [];
    if (esExamen && !correctas.length && !sinClave) return 'Marca la respuesta correcta.';
    if (correctas.some((c) => !Number.isInteger(c) || c < 0 || c >= opciones.length)) return 'La respuesta correcta no corresponde a ninguna opción.';
    if (p.tipo === 'opcion' && correctas.length > 1) return 'En opción única solo puede haber una respuesta correcta.';
  }
  if (p.tipo === 'emparejar') {
    if (!esExamen) return 'Las preguntas de emparejar solo se usan en exámenes.';
    return validarPares(p.pares);
  }
  return '';
}

const CLAVE_VISTA = 'hce:evaluacion-vista';
function leerVista() {
  try { return localStorage.getItem(CLAVE_VISTA) === 'previa' ? 'previa' : 'editar'; } catch { return 'editar'; }
}

export default function EditorEvaluacion({ leccion, notificar, confirmar, onCerrar, onCambios, ref }) {
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
  const [importando, setImportando] = useState(false);
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
  const abrirPregunta = async (pregunta, original = pregunta) => {
    if (guardando) return;
    if (cambiosPregunta && !(await confirmar('¿Descartar los cambios de la pregunta actual?', 'Cambios sin guardar'))) return;
    setPreguntaOriginal(original);
    setEditando(pregunta);
  };
  // Duplicar: la copia se abre como pregunta nueva (sin id), lista para
  // cambiar lo necesario y guardarla. Se compara contra una vacía para que
  // "Guardar" quede activo aunque no se cambie nada.
  const duplicarPregunta = (p) => {
    const copia = { ...copiaPregunta(p), id: null };
    return abrirPregunta(copia, preguntaVacia(p.tipo));
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
      const r = await guardarConfigEvaluacion(leccion.id, config);
      if (r?.sinMejoras) {
        // Se guardó solo lo de antes: se recarga para mostrar lo que quedó.
        notificar(`Se guardaron el mínimo, los intentos y el orden de las preguntas. Para "Respuestas en orden aleatorio" y lo que ve el alumno al terminar: ${FALTA_MEJORAS}`, 'error');
        await cargar(false);
      } else {
        setDatos((actual) => ({ ...actual, config: { ...config }, mejoras: true }));
        notificar('Reglas guardadas.', 'success');
      }
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
    const problema = errorDePregunta(p, esExamen);
    if (problema) { notificar(problema, 'error'); return; }
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

  // IMPORTAR: ImportarPreguntas.jsx (Excel/CSV) se conecta con esta función
  // como onImportar. Recibe una lista de { tipo: 'opcion'|'multiple'|'abierta'
  // |'emparejar' (y 'escala' en encuestas), texto, opciones: string[],
  // correctas: number[], pares?: [{ izquierda, derecha }], puntos?,
  // obligatoria? } y las guarda igual que "Guardar pregunta", al final de la
  // lista y en el orden recibido. Lo único distinto: una pregunta de examen
  // puede llegar sin respuesta correcta (se guarda y la lista avisa).
  // Primero revisa todas: si alguna tiene un problema no guarda ninguna y lanza
  // un error con `errores: [{ fila, error }]` (fila empieza en 1). Si falla a
  // la mitad, las anteriores ya quedaron guardadas (`agregadas` en el error).
  // Si todo sale bien devuelve { agregadas }.
  const agregarPreguntas = async (lista) => {
    const fallar = (mensaje, extra = {}) => Object.assign(new Error(mensaje), { agregadas: 0, errores: [], ...extra });
    if (!datos || guardando) throw fallar('Espera a que termine de cargar o de guardar e intenta de nuevo.');
    const permitidos = TIPOS_POR_EVALUACION[leccion.tipo];
    const preparadas = (Array.isArray(lista) ? lista : []).map((item) => {
      const tipo = item?.tipo;
      return {
        id: null,
        tipo,
        texto: String(item?.texto ?? '').trim(),
        opciones: ['opcion', 'multiple'].includes(tipo) ? (item.opciones || []).map((o) => String(o ?? '').trim())
          : tipo === 'escala' ? (item.opciones?.length ? item.opciones.map(String) : [...ESCALA_BASE]) : [],
        correctas: esExamen && ['opcion', 'multiple'].includes(tipo) ? (item.correctas || []).map(Number) : [],
        ...(tipo === 'emparejar' ? { pares: (item.pares || []).map((par) => ({ izquierda: String(par?.izquierda ?? ''), derecha: String(par?.derecha ?? '') })) } : {}),
        puntos: Math.max(1, Number(item?.puntos) || 1),
        obligatoria: item?.obligatoria !== false,
      };
    });
    if (!preparadas.length) throw fallar('No hay preguntas para agregar.');
    const errores = preparadas
      .map((p, i) => ({
        fila: i + 1,
        error: permitidos.includes(p.tipo) ? errorDePregunta(p, esExamen, { sinClave: true }) : `El tipo "${p.tipo}" no se puede usar aquí.`,
      }))
      .filter((x) => x.error);
    if (errores.length) {
      const detalle = errores.slice(0, 3).map((x) => `pregunta ${x.fila}: ${x.error}`).join(' ');
      throw fallar(`No se agregó ninguna. Revisa ${errores.length === 1 ? 'la pregunta' : `${errores.length} preguntas`} (${detalle}${errores.length > 3 ? ' …' : ''}).`, { errores });
    }

    setGuardando(true);
    let agregadas = 0;
    try {
      if (!datos.preguntas.length) await guardarConfigEvaluacion(leccion.id, config);
      let orden = datos.preguntas.reduce((m, x) => Math.max(m, x.orden ?? 0), 0);
      for (const p of preparadas) {
        orden += 1;
        await guardarPregunta(leccion.id, { ...p, orden });
        agregadas += 1;
      }
      notificar(`Se ${agregadas === 1 ? 'agregó 1 pregunta' : `agregaron ${agregadas} preguntas`}.`, 'success');
      return { agregadas };
    } catch (err) {
      const hechas = agregadas ? `Se ${agregadas === 1 ? 'agregó 1 pregunta' : `agregaron ${agregadas} preguntas`}, pero la` : 'No se pudo guardar la';
      throw fallar(`${hechas} pregunta ${agregadas + 1}: ${err.message}`, { agregadas, errores: [{ fila: agregadas + 1, error: err.message }] });
    } finally {
      await cargar(datos.preguntas.length > 0 && cambiosConfig);
      setGuardando(false);
    }
  };

  // También queda disponible por ref: refEditor.current.agregarPreguntas(lista).
  useImperativeHandle(ref, () => ({ agregarPreguntas }));

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

  const cambiarPar = (indice, lado, texto) => setEditando({
    ...editando,
    pares: editando.pares.map((par, i) => (i === indice ? { ...par, [lado]: texto } : par)),
  });
  const quitarPar = (indice) => setEditando({ ...editando, pares: editando.pares.filter((_, i) => i !== indice) });
  const agregarPar = () => setEditando({ ...editando, pares: [...editando.pares, parVacio()] });

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

      {/* Reglas en grupos: para aprobar, orden y qué ve el alumno al terminar.
          Se guardan juntas con "Guardar reglas". */}
      <section className="eval-reglas-panel" aria-labelledby="eval-reglas-titulo">
        <h5 id="eval-reglas-titulo" className="eval-reglas-titulo">{esExamen ? 'Reglas del examen' : 'Reglas de la encuesta'}</h5>

        <div className="eval-reglas-grupos">
          {esExamen && (
            <fieldset className="eval-reglas-grupo">
              <legend>Para aprobar</legend>
              <label className="eval-reglas-campo">
                <span>Mínimo para aprobar</span>
                <span className="eval-reglas-sufijo">
                  <input type="number" min="0" max="100" inputMode="numeric" value={config.min_aprobacion} onChange={(e) => setConfig({ ...config, min_aprobacion: e.target.value })} />
                  <span aria-hidden="true">%</span>
                </span>
              </label>
              <label className="eval-reglas-campo">
                <span>Intentos permitidos</span>
                <input type="number" min="1" inputMode="numeric" placeholder="Sin límite" value={config.intentos_max ?? ''} onChange={(e) => setConfig({ ...config, intentos_max: e.target.value || null })} />
                <small>Déjalo vacío para no poner límite.</small>
              </label>
            </fieldset>
          )}

          <fieldset className="eval-reglas-grupo">
            <legend>Orden</legend>
            <label className="lms-check lms-check--tarjeta">
              <input type="checkbox" checked={!!config.aleatorio} onChange={(e) => setConfig({ ...config, aleatorio: e.target.checked })} />
              <span>Preguntas en orden aleatorio<small>Cada alumno ve las preguntas en otro orden.</small></span>
            </label>
            <label className="lms-check lms-check--tarjeta">
              <input type="checkbox" checked={!!config.aleatorio_opciones} onChange={(e) => setConfig({ ...config, aleatorio_opciones: e.target.checked })} />
              <span>Respuestas en orden aleatorio<small>Las opciones de cada pregunta cambian de lugar en cada intento.</small></span>
            </label>
          </fieldset>

          {esExamen && (
            <fieldset className="eval-reglas-grupo eval-reglas-grupo--ancho">
              <legend>Al terminar el examen, el alumno ve:</legend>
              <label className="lms-check lms-check--tarjeta">
                <input type="checkbox" checked={config.mostrar_calificacion !== false} onChange={(e) => setConfig({ ...config, mostrar_calificacion: e.target.checked })} />
                <span>Su calificación<small>El porcentaje y cuántas contestó bien.</small></span>
              </label>
              <label className="lms-check lms-check--tarjeta">
                <input type="checkbox" checked={!!config.mostrar_marcas} onChange={(e) => setConfig({ ...config, mostrar_marcas: e.target.checked })} />
                <span>Si cada respuesta fue correcta o incorrecta<small>Una marca en cada pregunta.</small></span>
              </label>
              <div className="eval-reglas-correctas" role="radiogroup" aria-labelledby="eval-correctas-etiqueta">
                <span id="eval-correctas-etiqueta" className="eval-reglas-subtitulo">Las respuestas correctas</span>
                <div className="eval-segmentos">
                  {MOSTRAR_CORRECTAS.map(([valor, etiqueta]) => (
                    <label key={valor} className={config.mostrar_correctas === valor ? 'activo' : ''}>
                      <input type="radio" name={`mostrar-correctas-${leccion.id}`} value={valor} checked={config.mostrar_correctas === valor} onChange={() => setConfig({ ...config, mostrar_correctas: valor })} />
                      {etiqueta}
                    </label>
                  ))}
                </div>
                <small className="lms-ayuda">Mientras le queden intentos nunca se le muestran: así no se le regala el siguiente intento.</small>
              </div>
            </fieldset>
          )}
        </div>

        {datos.mejoras === false && (
          <p className="eval-reglas-aviso" role="note">
            &quot;Respuestas en orden aleatorio&quot;{esExamen ? ', lo que ve el alumno al terminar y las preguntas de emparejar' : ''} necesitan
            la migración <code>evaluaciones-mejoras.sql</code> en Supabase. Mientras tanto se guardan solo las demás reglas.
          </p>
        )}

        <div className="eval-reglas-pie">
          {cambiosConfig
            ? <span className="eval-reglas-pendiente" role="status">Hay cambios sin guardar en las reglas.</span>
            : !guardandoConfig && <span className="eval-reglas-ok" role="status"><CheckCircle2 size={13} /> Reglas guardadas</span>}
          <button type="button" className="btn-crm-action solid" disabled={guardandoConfig || guardando || !cambiosConfig} onClick={guardarConfig}>
            {guardandoConfig ? <><Loader2 size={14} className="lms-girando" /> Guardando…</> : 'Guardar reglas'}
          </button>
        </div>
      </section>

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
                  const conPuntos = esExamen && TIPOS_CON_CLAVE.includes(p.tipo);
                  return (
                    <ElementoOrdenable key={p.id} id={p.id} deshabilitado={moviendo} className={`eval-pregunta${conClave && !p.correctas.length ? ' eval-pregunta--sin-clave' : ''}`}>
                      {(asa) => (
                        <>
                          <div className="eval-pregunta-cabecera">
                            <AsaArrastre asa={asa} etiqueta={`Pregunta ${i + 1}`} deshabilitado={moviendo} />
                            <span className="lms-orden">{i + 1}</span>
                            <button type="button" className="eval-pregunta-texto lms-fila-abrir" onClick={() => abrirPregunta(copiaPregunta(p))}>
                              <strong>{p.texto}</strong>
                              <small>
                                <span className="lms-pastilla">{TIPOS_PREGUNTA[p.tipo] || p.tipo}</span>
                                {conPuntos && <span className="lms-pastilla">{p.puntos} {Number(p.puntos) === 1 ? 'punto' : 'puntos'}</span>}
                                {!p.obligatoria && <span className="lms-pastilla lms-pastilla--opcional">Opcional</span>}
                              </small>
                            </button>
                            <span className="lms-acciones">
                              <button type="button" className="icon-action-btn edit" title="Editar" aria-label={`Editar pregunta ${i + 1}`} onClick={() => abrirPregunta(copiaPregunta(p))}><Edit size={15} /></button>
                              <button type="button" className="icon-action-btn" title="Duplicar: abre una copia para editarla y guardarla como pregunta nueva" aria-label={`Duplicar pregunta ${i + 1}`} disabled={guardando} onClick={() => duplicarPregunta(p)}><Copy size={15} /></button>
                              <button type="button" className="icon-action-btn delete" title="Eliminar" aria-label={`Eliminar pregunta ${i + 1}`} onClick={() => eliminar(p)}><Trash2 size={15} /></button>
                            </span>
                          </div>
                          {p.tipo === 'emparejar' ? (
                            <ul className="eval-opciones-vista eval-pares-vista" aria-label={`Pares correctos de la pregunta ${i + 1}`}>
                              {(p.pares || []).map((par, j) => (
                                <li key={j}>
                                  <span className="eval-par-izquierda">{par.izquierda}</span>
                                  <span className="eval-par-flecha" aria-hidden="true">→</span>
                                  <span>{par.derecha}</span>
                                </li>
                              ))}
                            </ul>
                          ) : p.tipo !== 'abierta' && (conClave ? (
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
              <button key={tipo} type="button" className="btn-crm-action outlined" disabled={guardando} onClick={() => abrirPregunta(preguntaVacia(tipo))}>
                <Plus size={14} /> {TIPOS_PREGUNTA[tipo]}
              </button>
            ))}
            {/* Importar desde Excel o CSV (plantilla HCE o exportación de otra
                plataforma): agregarPreguntas lanza un error si algo falla y el
                panel lo muestra. */}
            <button type="button" className="btn-crm-action outlined" disabled={guardando} onClick={() => setImportando(true)}>
              <FileSpreadsheet size={14} /> Importar desde Excel
            </button>
          </div>
        </div>
      )}

      {importando && (
        <ImportarPreguntas esExamen={esExamen} onImportar={agregarPreguntas} onCerrar={() => setImportando(false)} />
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
              <textarea
                id="pregunta-texto"
                autoFocus
                rows="3"
                className="lms-textarea"
                value={editando.texto}
                onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                placeholder={editando.tipo === 'emparejar' ? 'Ordena correctamente los hitos históricos de ECMO' : '¿De qué depende la normalidad de una variable?'}
              />
            </div>

            {/* Una o varias respuestas: se cambia sin borrar la pregunta. Al pasar
                a una sola, se queda la primera respuesta correcta marcada. */}
            {['opcion', 'multiple'].includes(editando.tipo) && (
              <div className="crm-input-group">
                <span className="reglas-etiqueta">Tipo de respuesta</span>
                <div className="lms-segmentos" role="radiogroup" aria-label="Tipo de respuesta">
                  {[['opcion', esExamen ? 'Una correcta' : 'Una respuesta'], ['multiple', esExamen ? 'Varias correctas' : 'Varias respuestas']].map(([tipo, etiqueta]) => (
                    <button
                      key={tipo}
                      type="button"
                      role="radio"
                      aria-checked={editando.tipo === tipo}
                      className={editando.tipo === tipo ? 'activo' : ''}
                      onClick={() => setEditando({ ...editando, tipo, correctas: tipo === 'opcion' ? editando.correctas.slice(0, 1) : editando.correctas })}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editando.tipo === 'emparejar' && (
              <div className="crm-input-group">
                <span className="reglas-etiqueta" id="pares-etiqueta">Pares · escribe cada elemento junto a su pareja correcta</span>
                <small className="eval-pares-ayuda">Al alumno se le muestra la columna derecha revuelta y elige la pareja de cada elemento de la izquierda.</small>
                <div className="eval-pares" role="group" aria-labelledby="pares-etiqueta">
                  <div className="eval-pares-encabezado" aria-hidden="true">
                    <span />
                    <span>Izquierda</span>
                    <span>Derecha (su pareja)</span>
                    <span />
                  </div>
                  {editando.pares.map((par, j) => (
                    <div key={j} className="eval-par-fila">
                      <span className="eval-numero">{j + 1}</span>
                      <input
                        type="text"
                        value={par.izquierda}
                        aria-label={`Par ${j + 1}, izquierda`}
                        placeholder={j === 0 ? 'Ej. 1971' : `Elemento ${j + 1}`}
                        onChange={(e) => cambiarPar(j, 'izquierda', e.target.value)}
                      />
                      <textarea
                        rows="2"
                        value={par.derecha}
                        aria-label={`Par ${j + 1}, derecha`}
                        placeholder={j === 0 ? 'Ej. Lo que pasó en 1971' : `Pareja del elemento ${j + 1}`}
                        onChange={(e) => cambiarPar(j, 'derecha', e.target.value)}
                      />
                      {editando.pares.length > MIN_PARES ? (
                        <button type="button" className="icon-action-btn delete" title="Quitar par" aria-label={`Quitar par ${j + 1}`} onClick={() => quitarPar(j)}><X size={14} /></button>
                      ) : <span />}
                    </div>
                  ))}
                  {editando.pares.length < MAX_PARES && (
                    <button type="button" className="btn-crm-action outlined mini" onClick={agregarPar}>
                      <Plus size={13} /> Agregar par
                    </button>
                  )}
                </div>
                <small className="eval-pares-ayuda">De {MIN_PARES} a {MAX_PARES} pares. Vale sus puntos solo si todos los pares quedan bien.</small>
              </div>
            )}

            {!['abierta', 'emparejar'].includes(editando.tipo) && (
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
                  {editando.tipo !== 'escala' && editando.opciones.length < MAX_OPCIONES && (
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
              {esExamen && TIPOS_CON_CLAVE.includes(editando.tipo) && (
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
