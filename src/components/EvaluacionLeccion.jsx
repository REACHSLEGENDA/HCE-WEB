import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ClipboardCheck, Clock, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import TextoLeccion from './TextoLeccion';
import { cargarEvaluacion, cargarMisIntentos, enviarEvaluacion, barajar, ESCALA_BASE } from '../lib/evaluaciones';
import './EvaluacionLeccion.css';
import { claveBorradorEvaluacion, firmaEvaluacion, leerBorradorEvaluacion, guardarBorradorEvaluacion, borrarBorradorEvaluacion, validarBorradorEvaluacion } from '../lib/borradorEvaluacion';

// Examen o encuesta dentro de una lección del aula. Califica el servidor; aquí
// solo se muestran las preguntas y se envía lo que el alumno contestó.

const fecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const duracion = (seg) => (seg == null ? '' : seg < 60 ? `${seg} s` : `${Math.floor(seg / 60)} min ${seg % 60 ? `${seg % 60} s` : ''}`);
const contestada = (p, valor) => (p.tipo === 'multiple' ? Array.isArray(valor) && valor.length > 0 : valor != null && String(valor).trim() !== '');

export default function EvaluacionLeccion({ leccion, userId, esAdmin, notificar, onCompletada, ref }) {
  const claveBorrador = claveBorradorEvaluacion(userId, leccion.id, esAdmin);
  const [borradorInicial, setBorradorInicial] = useState(() => leerBorradorEvaluacion(claveBorrador));
  const [borradorGuardado, setBorradorGuardado] = useState(false);
  const [errorBorrador, setErrorBorrador] = useState(false);
  const enviandoRef = useRef(false);
  const esExamen = leccion.tipo === 'examen';
  const [datos, setDatos] = useState(null);
  const [intentos, setIntentos] = useState([]);
  const [fase, setFase] = useState('inicio');
  const [orden, setOrden] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [iniciadoEn, setIniciadoEn] = useState(null);
  const [faltan, setFaltan] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [reintentoCarga, setReintentoCarga] = useState(0);
  // Una pregunta a la vez: cuál se ve, si está en la revisión final y si
  // pidió salir sin enviar (se confirma antes de perder respuestas).
  const [actual, setActual] = useState(0);
  const [revisando, setRevisando] = useState(false);
  const [confirmarSalir, setConfirmarSalir] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarEvaluacion(leccion.id), esAdmin ? Promise.resolve([]) : cargarMisIntentos(userId, leccion.id)])
      .then(([evaluacion, lista]) => {
        if (!vigente) return;
        if (!evaluacion) { setError('Esta evaluación todavía no está disponible.'); return; }
        setDatos(evaluacion);
        setIntentos(lista);
      })
      .catch((err) => { if (vigente) setError(`No se pudo cargar: ${err.message}`); });
    return () => { vigente = false; };
  }, [leccion.id, userId, esAdmin, reintentoCarga]);

  const config = datos?.config;
  const aprobado = intentos.some((i) => i.aprobado);
  const enviada = !esExamen && intentos.length > 0;
  const sinIntentos = esExamen && config?.intentos_max && intentos.length >= config.intentos_max && !aprobado;
  const puedeEmpezar = esAdmin || (!aprobado && !enviada && !sinIntentos);
  const mejor = intentos.reduce((m, i) => (i.calificacion != null && Number(i.calificacion) > m ? Number(i.calificacion) : m), -1);

  const preguntas = useMemo(() => {
    if (!datos) return [];
    const porId = new Map(datos.preguntas.map((p) => [p.id, p]));
    return orden.length ? orden.map((id) => porId.get(id)).filter(Boolean) : datos.preguntas;
  }, [datos, orden]);

  const respondidas = preguntas.filter((p) => contestada(p, respuestas[p.id])).length;
  const borrador = validarBorradorEvaluacion(borradorInicial, datos, intentos.length, leccion.tipo);

  useEffect(() => {
    if (datos && borradorInicial && !validarBorradorEvaluacion(borradorInicial, datos, intentos.length, leccion.tipo)) borrarBorradorEvaluacion(claveBorrador);
  }, [datos, borradorInicial, intentos.length, claveBorrador, leccion.tipo]);

  useImperativeHandle(ref, () => ({
    estadoSalida: () => ({ enviando: enviandoRef.current, sinGuardar: fase === 'respondiendo' && respondidas > 0 && !borradorGuardado }),
  }), [fase, respondidas, borradorGuardado]);

  useEffect(() => {
    const salir = (e) => {
      if (enviandoRef.current || (fase === 'respondiendo' && respondidas > 0 && !borradorGuardado)) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', salir);
    return () => window.removeEventListener('beforeunload', salir);
  }, [fase, respondidas, borradorGuardado]);

  const guardarBorrador = (cambios = {}) => {
    const ok = guardarBorradorEvaluacion(claveBorrador, {
      version: 1, firma: firmaEvaluacion(datos, leccion.tipo), intentosPrevios: intentos.length,
      respuestas, orden, iniciadoEn, actual, revisando, ...cambios,
    });
    setBorradorGuardado(ok);
    setErrorBorrador(!ok);
  };
  const descartarBorrador = () => {
    borrarBorradorEvaluacion(claveBorrador);
    setBorradorInicial(null);
    setRespuestas({});
    setFase('inicio');
    setConfirmarSalir(false);
  };
  const moverPregunta = (indice, revision = false) => {
    if (enviandoRef.current) return;
    guardarBorrador({ actual: indice, revisando: revision });
    setActual(indice);
    setRevisando(revision);
    setConfirmarSalir(false);
  };

  // Al cambiar de pregunta, si el alumno bajó, se regresa al inicio del examen.
  const formRef = useRef(null);
  useEffect(() => {
    const caja = formRef.current;
    if (caja && caja.getBoundingClientRect().top < 0) caja.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [actual, revisando]);

  const empezar = (usarBorrador = true) => {
    const previo = usarBorrador ? borrador : null;
    const nuevasRespuestas = previo?.respuestas || {};
    const nuevoOrden = previo?.orden || (config.aleatorio ? barajar(datos.preguntas).map((p) => p.id) : []);
    const inicio = previo?.iniciadoEn || new Date().toISOString();
    setRespuestas(nuevasRespuestas);
    setFaltan([]);
    setResultado(null);
    setOrden(nuevoOrden);
    setIniciadoEn(inicio);
    setActual(previo?.actual || 0);
    setRevisando(previo?.revisando || false);
    setConfirmarSalir(false);
    setFase('respondiendo');
    guardarBorrador({ respuestas: nuevasRespuestas, orden: nuevoOrden, iniciadoEn: inicio, actual: previo?.actual || 0, revisando: previo?.revisando || false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const responder = (p, valor) => {
    if (enviandoRef.current) return;
    const siguientes = { ...respuestas, [p.id]: valor };
    guardarBorrador({ respuestas: siguientes });
    setRespuestas(siguientes);
    if (faltan.includes(p.id)) setFaltan((f) => f.filter((x) => x !== p.id));
  };

  const alternarMultiple = (p, indice) => {
    const actual = Array.isArray(respuestas[p.id]) ? respuestas[p.id] : [];
    responder(p, actual.includes(indice) ? actual.filter((x) => x !== indice) : [...actual, indice]);
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    const pendientes = preguntas.filter((p) => p.obligatoria && !contestada(p, respuestas[p.id])).map((p) => p.id);
    if (pendientes.length) {
      setFaltan(pendientes);
      notificar(`Te falta contestar ${pendientes.length} ${pendientes.length === 1 ? 'pregunta' : 'preguntas'}.`, 'error');
      // Se queda en la revisión, donde se ve cuáles faltan y se puede ir a ellas.
      setRevisando(true);
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const r = await enviarEvaluacion(leccion.id, respuestas, iniciadoEn);
      borrarBorradorEvaluacion(claveBorrador);
      setBorradorInicial(null);
      setResultado(r);
      setFase('resultado');
      if (!esAdmin) {
        if (!esExamen || r.aprobado) onCompletada?.();
        try { setIntentos(await cargarMisIntentos(userId, leccion.id)); }
        catch (errHistorial) { notificar(`Tu resultado quedó guardado, pero no se pudo actualizar el historial: ${errHistorial.message}`, 'error'); }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.estado === 'ya-aprobado' || err.estado === 'ya-enviada') {
        borrarBorradorEvaluacion(claveBorrador);
        setBorradorInicial(null);
        // El servidor reparó el avance de un resultado que ya había guardado
        // (p. ej. falló la segunda escritura en el intento anterior).
        onCompletada?.();
        try {
          setIntentos(await cargarMisIntentos(userId, leccion.id));
          setFase('inicio');
          notificar(err.message, 'success');
        } catch (errorRecarga) {
          notificar(`El avance se recuperó, pero no se pudo cargar el resultado: ${errorRecarga.message}`, 'error');
        }
      } else {
        notificar(err.message, 'error');
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  if (error) return <div className="eval-alumno-aviso" role="alert">{error} <button type="button" className="back-btn" onClick={() => { setError(null); setReintentoCarga((n) => n + 1); }}>Reintentar</button></div>;
  if (!datos) return <p className="eval-alumno-aviso">Cargando…</p>;

  // ---- Resultado ------------------------------------------------------------
  if (fase === 'resultado' && resultado) {
    const reintentar = esExamen && !resultado.aprobado && (resultado.intentosRestantes == null || resultado.intentosRestantes > 0);
    return (
      <div className="eval-alumno">
        <div className={`eval-resultado ${!esExamen || resultado.aprobado ? 'ok' : 'mal'}`}>
          {!esExamen ? <CheckCircle size={40} /> : resultado.aprobado ? <CheckCircle size={40} /> : <XCircle size={40} />}
          {esExamen ? (
            <>
              <strong className="eval-resultado-cifra">{Math.round(resultado.calificacion)}%</strong>
              <span>{resultado.aprobado ? '¡Aprobaste!' : `No alcanzaste el mínimo de ${resultado.minimo}%.`}</span>
              <small>{resultado.correctas} de {resultado.calificables} respuestas correctas{resultado.simulado ? ' · vista de administrador, no se guardó' : ''}</small>
              {!resultado.aprobado && resultado.intentosRestantes != null && (
                <small>{resultado.intentosRestantes === 0 ? 'Ya no te quedan intentos.' : `Te ${resultado.intentosRestantes === 1 ? 'queda 1 intento' : `quedan ${resultado.intentosRestantes} intentos`}.`}</small>
              )}
            </>
          ) : (
            <>
              <strong>¡Gracias por tus respuestas!</strong>
              <span>Tu encuesta quedó enviada.{resultado.simulado ? ' (Vista de administrador: no se guardó.)' : ''}</span>
            </>
          )}
        </div>

        {resultado.detalle && (
          <ol className="eval-revision">
            {preguntas.filter((p) => resultado.detalle[p.id]).map((p) => {
              const d = resultado.detalle[p.id];
              return (
                <li key={p.id} className={d.correcta ? 'bien' : 'mal'}>
                  <span className="eval-revision-icono">{d.correcta ? <CheckCircle size={16} /> : <XCircle size={16} />}</span>
                  <div>
                    <p>{p.texto}</p>
                    {!d.correcta && d.correctas && (
                      <small>Correcta: {d.correctas.map((c) => p.opciones[c]).join(' · ')}</small>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {(reintentar || esAdmin) && (
          <button type="button" className="back-btn leccion-btn-principal eval-boton" disabled={enviando} onClick={() => empezar(false)}>
            <RotateCcw size={15} /> Volver a intentar
          </button>
        )}
      </div>
    );
  }

  // ---- Respondiendo ---------------------------------------------------------
  if (fase === 'respondiendo') {
    const total = preguntas.length;
    const indice = Math.min(actual, Math.max(0, total - 1));
    const p = preguntas[indice];
    const esUltima = indice === total - 1;
    const sinContestar = preguntas.filter((x) => !contestada(x, respuestas[x.id]));
    const faltanObligatorias = sinContestar.filter((x) => x.obligatoria).length;
    const irA = (i) => moverPregunta(i);

    const renderPregunta = (pregunta, i) => {
      const valor = respuestas[pregunta.id];
      const etiquetas = pregunta.tipo === 'escala' ? (pregunta.opciones?.length ? pregunta.opciones : ESCALA_BASE) : pregunta.opciones;
      return (
        <div key={pregunta.id} id={`pregunta-${pregunta.id}`} className={`eval-pregunta-alumno${faltan.includes(pregunta.id) ? ' falta' : ''}`}>
          <fieldset>
            <legend>
              <span className="eval-numero-pregunta">{i + 1}</span>
              <span>{pregunta.texto}{pregunta.obligatoria ? '' : <em> (opcional)</em>}</span>
            </legend>
            {pregunta.tipo === 'multiple' && <small className="eval-indicacion">Puedes elegir varias.</small>}

            {pregunta.tipo === 'abierta' ? (
              <textarea rows="5" value={valor || ''} onChange={(e) => responder(pregunta, e.target.value)} placeholder="Escribe tu respuesta" maxLength={5000} aria-label={`Respuesta a la pregunta ${i + 1}`} />
            ) : pregunta.tipo === 'escala' ? (
              <div className="eval-escala">
                {etiquetas.map((etiqueta, j) => (
                  <label key={j} className={valor === j + 1 ? 'elegida' : ''}>
                    <input type="radio" name={`p-${pregunta.id}`} checked={valor === j + 1} onChange={() => responder(pregunta, j + 1)} />
                    <span className="eval-escala-num">{j + 1}</span>
                    <span className="eval-escala-texto">{etiqueta}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="eval-opciones-alumno">
                {etiquetas.map((opcion, j) => {
                  const elegida = pregunta.tipo === 'multiple' ? Array.isArray(valor) && valor.includes(j) : valor === j;
                  return (
                    <label key={j} className={elegida ? 'elegida' : ''}>
                      <input
                        type={pregunta.tipo === 'multiple' ? 'checkbox' : 'radio'}
                        name={`p-${pregunta.id}`}
                        checked={elegida}
                        onChange={() => (pregunta.tipo === 'multiple' ? alternarMultiple(pregunta, j) : responder(pregunta, j))}
                      />
                      <span className="eval-opcion-letra" aria-hidden="true">{String.fromCharCode(65 + j)}</span>
                      <span>{opcion}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {faltan.includes(pregunta.id) && <small className="eval-falta-texto">Contesta esta pregunta.</small>}
          </fieldset>
        </div>
      );
    };

    // Enter avanza a la siguiente pregunta; solo se envía desde la revisión.
    const alEnviar = (e) => {
      if (enviandoRef.current) { e.preventDefault(); return; }
      if (!revisando) {
        e.preventDefault();
        if (esUltima) moverPregunta(indice, true);
        else moverPregunta(indice + 1);
        return;
      }
      enviar(e);
    };

    return (
      <form ref={formRef} className="eval-alumno eval-paso" aria-busy={enviando} onSubmit={alEnviar} noValidate>
        <p className="eval-borrador" role="status">{enviando ? 'Enviando respuestas… Espera a que termine.' : errorBorrador ? 'No se pudo guardar el borrador. Mantén esta página abierta hasta enviar.' : borradorGuardado ? 'Borrador guardado en este navegador.' : ''}</p>
        <fieldset className="eval-controles" disabled={enviando}>
        <div className="eval-progreso" aria-live="polite">
          <span>{revisando ? 'Revisión' : `Pregunta ${indice + 1} de ${total}`}</span>
          <div className="eval-progreso-barra" aria-hidden="true"><span style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }} /></div>
          <span className="eval-progreso-cuenta">{respondidas}/{total}</span>
        </div>

        <ol className="eval-mapa" aria-label="Ir a una pregunta">
          {preguntas.map((x, i) => {
            const hecha = contestada(x, respuestas[x.id]);
            return (
              <li key={x.id}>
                <button
                  type="button"
                  className={`eval-mapa-punto${hecha ? ' hecha' : ''}${!revisando && i === indice ? ' actual' : ''}${faltan.includes(x.id) ? ' falta' : ''}`}
                  onClick={() => irA(i)}
                  aria-label={`Pregunta ${i + 1}${hecha ? ', contestada' : ', sin contestar'}`}
                  aria-current={!revisando && i === indice ? 'step' : undefined}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={`eval-mapa-punto eval-mapa-revision${revisando ? ' actual' : ''}`}
              onClick={() => moverPregunta(indice, true)}
            >
              Revisar
            </button>
          </li>
        </ol>

        {!revisando ? (
          <>
            {p && renderPregunta(p, indice)}
            <div className="eval-nav">
              <button type="button" className="back-btn eval-nav-btn" onClick={() => moverPregunta(indice - 1)} disabled={indice === 0}>
                <ChevronLeft size={16} /> Anterior
              </button>
              {esUltima ? (
                <button type="button" className="back-btn leccion-btn-principal eval-nav-btn" onClick={() => moverPregunta(indice, true)}>
                  Revisar respuestas <ListChecks size={16} />
                </button>
              ) : (
                <button type="button" className="back-btn leccion-btn-principal eval-nav-btn" onClick={() => moverPregunta(indice + 1)}>
                  Siguiente <ChevronRight size={16} />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="eval-revision-envio">
            <h3>Revisa antes de enviar</h3>
            {faltanObligatorias > 0 ? (
              <p className="eval-estado mal" role="status">
                <XCircle size={18} /> Te {faltanObligatorias === 1 ? 'falta 1 pregunta' : `faltan ${faltanObligatorias} preguntas`} por contestar.
              </p>
            ) : (
              <p className="eval-estado ok" role="status">
                <CheckCircle size={18} /> {sinContestar.length ? 'Contestaste todas las obligatorias.' : '¡Todo listo! Contestaste todas las preguntas.'}
              </p>
            )}
            <ol className="eval-revision-lista">
              {preguntas.map((x, i) => {
                const hecha = contestada(x, respuestas[x.id]);
                return (
                  <li key={x.id}>
                    <button type="button" className={`eval-revision-fila${hecha ? ' hecha' : ''}`} onClick={() => irA(i)}>
                      <span className="eval-numero-pregunta">{i + 1}</span>
                      <span className="eval-revision-texto">{x.texto}</span>
                      <span className="eval-revision-estado">{hecha ? 'Contestada' : x.obligatoria ? 'Sin contestar' : 'Opcional'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="eval-nav">
              <button type="button" className="back-btn eval-nav-btn" onClick={() => irA(faltanObligatorias ? preguntas.findIndex((x) => x.obligatoria && !contestada(x, respuestas[x.id])) : total - 1)} disabled={enviando}>
                <ChevronLeft size={16} /> {faltanObligatorias ? 'Contestar las que faltan' : 'Volver a las preguntas'}
              </button>
              <button type="submit" className="back-btn leccion-btn-principal eval-nav-btn" disabled={enviando}>
                {enviando ? 'Enviando…' : esExamen ? 'Enviar examen' : 'Enviar encuesta'}
              </button>
            </div>
          </div>
        )}

        <div className="eval-salir">
          {confirmarSalir ? (
            <p role="alert">
              ¿Salir sin enviar? Se perderán tus respuestas.{' '}
              <button type="button" className="eval-enlace peligro" onClick={descartarBorrador}>Sí, salir</button>
              {' · '}
              <button type="button" className="eval-enlace" onClick={() => setConfirmarSalir(false)}>Seguir contestando</button>
            </p>
          ) : (
            <button
              type="button"
              className="eval-enlace"
              disabled={enviando}
              onClick={() => (respondidas ? setConfirmarSalir(true) : descartarBorrador())}
            >
              Salir sin enviar
            </button>
          )}
        </div>
        </fieldset>
      </form>
    );
  }

  // ---- Inicio ---------------------------------------------------------------
  return (
    <div className="eval-alumno">
      {leccion.contenido?.texto && <TextoLeccion texto={leccion.contenido.texto} />}

      <ul className="eval-datos">
        <li><ClipboardCheck size={16} /> {datos.preguntas.length} {datos.preguntas.length === 1 ? 'pregunta' : 'preguntas'}</li>
        {esExamen && <li><CheckCircle size={16} /> Se aprueba con {config.min_aprobacion}%</li>}
        {esExamen && <li><RotateCcw size={16} /> {config.intentos_max ? `${config.intentos_max} ${config.intentos_max === 1 ? 'intento' : 'intentos'}` : 'Intentos ilimitados'}</li>}
        {leccion.duracion_min ? <li><Clock size={16} /> Unos {leccion.duracion_min} min</li> : null}
      </ul>

      {aprobado && (
        <p className="eval-estado ok"><CheckCircle size={18} /> Aprobaste este examen con {Math.round(mejor)}%.</p>
      )}
      {enviada && (
        <p className="eval-estado ok"><CheckCircle size={18} /> Ya enviaste esta encuesta. ¡Gracias!</p>
      )}
      {sinIntentos && (
        <p className="eval-estado mal"><XCircle size={18} /> Ya usaste todos tus intentos. Si necesitas otro, escríbenos.</p>
      )}

      {esExamen && intentos.length > 0 && (
        <table className="eval-intentos">
          <thead><tr><th>Intento</th><th>Fecha</th><th>Calificación</th><th>Tiempo</th></tr></thead>
          <tbody>
            {intentos.map((it) => (
              <tr key={it.id}>
                <td>{it.numero}</td>
                <td>{fecha(it.enviado_en)}</td>
                <td className={it.aprobado ? 'ok' : 'mal'}>{it.calificacion != null ? `${Math.round(it.calificacion)}%` : '—'}</td>
                <td>{duracion(it.duracion_seg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {datos.preguntas.length === 0 ? (
        <p className="eval-alumno-aviso">Esta evaluación todavía no tiene preguntas.</p>
      ) : puedeEmpezar ? (
        <>
          {borrador && <p className="eval-alumno-aviso">Tienes una evaluación sin enviar guardada en este navegador.</p>}
          <button type="button" className="back-btn leccion-btn-principal eval-boton" onClick={() => empezar()}>
            {borrador ? 'Reanudar evaluación' : intentos.length && esExamen ? 'Volver a intentar' : esExamen ? 'Comenzar examen' : 'Responder encuesta'}
          </button>
          {borrador && <button type="button" className="eval-enlace" onClick={() => { if (window.confirm('¿Descartar el borrador y comenzar de nuevo?')) empezar(false); }}>Comenzar de nuevo</button>}
        </>
      ) : null}
      {esAdmin && <p className="eval-alumno-aviso">Como administrador puedes presentarlo para revisarlo; no se guarda.</p>}
    </div>
  );
}
