import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ClipboardCheck, Clock } from 'lucide-react';
import TextoLeccion from './TextoLeccion';
import { cargarEvaluacion, cargarMisIntentos, enviarEvaluacion, barajar, ESCALA_BASE } from '../lib/evaluaciones';
import './EvaluacionLeccion.css';

// Examen o encuesta dentro de una lección del aula. Califica el servidor; aquí
// solo se muestran las preguntas y se envía lo que el alumno contestó.

const fecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const duracion = (seg) => (seg == null ? '' : seg < 60 ? `${seg} s` : `${Math.floor(seg / 60)} min ${seg % 60 ? `${seg % 60} s` : ''}`);
const contestada = (p, valor) => (p.tipo === 'multiple' ? Array.isArray(valor) && valor.length > 0 : valor != null && String(valor).trim() !== '');

export default function EvaluacionLeccion({ leccion, userId, esAdmin, notificar, onCompletada }) {
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
  }, [leccion.id, userId, esAdmin]);

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

  const empezar = () => {
    setRespuestas({});
    setFaltan([]);
    setResultado(null);
    setOrden(config.aleatorio ? barajar(datos.preguntas).map((p) => p.id) : []);
    setIniciadoEn(new Date().toISOString());
    setFase('respondiendo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const responder = (p, valor) => {
    setRespuestas((r) => ({ ...r, [p.id]: valor }));
    if (faltan.includes(p.id)) setFaltan((f) => f.filter((x) => x !== p.id));
  };

  const alternarMultiple = (p, indice) => {
    const actual = Array.isArray(respuestas[p.id]) ? respuestas[p.id] : [];
    responder(p, actual.includes(indice) ? actual.filter((x) => x !== indice) : [...actual, indice]);
  };

  const enviar = async (e) => {
    e.preventDefault();
    const pendientes = preguntas.filter((p) => p.obligatoria && !contestada(p, respuestas[p.id])).map((p) => p.id);
    if (pendientes.length) {
      setFaltan(pendientes);
      notificar(`Te falta contestar ${pendientes.length} ${pendientes.length === 1 ? 'pregunta' : 'preguntas'}.`, 'error');
      document.getElementById(`pregunta-${pendientes[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    try {
      const r = await enviarEvaluacion(leccion.id, respuestas, iniciadoEn);
      setResultado(r);
      setFase('resultado');
      if (!esAdmin) {
        setIntentos(await cargarMisIntentos(userId, leccion.id));
        if (!esExamen || r.aprobado) onCompletada?.();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  if (error) return <p className="eval-alumno-aviso">{error}</p>;
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
          <button type="button" className="back-btn leccion-btn-principal eval-boton" onClick={empezar}>
            <RotateCcw size={15} /> Volver a intentar
          </button>
        )}
      </div>
    );
  }

  // ---- Respondiendo ---------------------------------------------------------
  if (fase === 'respondiendo') {
    return (
      <form className="eval-alumno" onSubmit={enviar} noValidate>
        <div className="eval-progreso" aria-live="polite">
          <span>{respondidas} de {preguntas.length} contestadas</span>
          <div className="eval-progreso-barra"><span style={{ width: `${preguntas.length ? (respondidas / preguntas.length) * 100 : 0}%` }} /></div>
        </div>

        <ol className="eval-preguntas">
          {preguntas.map((p, i) => {
            const valor = respuestas[p.id];
            const etiquetas = p.tipo === 'escala' ? (p.opciones?.length ? p.opciones : ESCALA_BASE) : p.opciones;
            return (
              <li key={p.id} id={`pregunta-${p.id}`} className={`eval-pregunta-alumno${faltan.includes(p.id) ? ' falta' : ''}`}>
                <fieldset>
                  <legend>
                    <span className="eval-numero-pregunta">{i + 1}</span>
                    <span>{p.texto}{p.obligatoria ? '' : <em> (opcional)</em>}</span>
                  </legend>
                  {p.tipo === 'multiple' && <small className="eval-indicacion">Puedes elegir varias.</small>}

                  {p.tipo === 'abierta' ? (
                    <textarea rows="4" value={valor || ''} onChange={(e) => responder(p, e.target.value)} placeholder="Escribe tu respuesta" maxLength={5000} />
                  ) : p.tipo === 'escala' ? (
                    <div className="eval-escala">
                      {etiquetas.map((etiqueta, j) => (
                        <label key={j} className={valor === j + 1 ? 'elegida' : ''}>
                          <input type="radio" name={`p-${p.id}`} checked={valor === j + 1} onChange={() => responder(p, j + 1)} />
                          <span className="eval-escala-num">{j + 1}</span>
                          <span className="eval-escala-texto">{etiqueta}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="eval-opciones-alumno">
                      {etiquetas.map((opcion, j) => {
                        const elegida = p.tipo === 'multiple' ? Array.isArray(valor) && valor.includes(j) : valor === j;
                        return (
                          <label key={j} className={elegida ? 'elegida' : ''}>
                            <input
                              type={p.tipo === 'multiple' ? 'checkbox' : 'radio'}
                              name={`p-${p.id}`}
                              checked={elegida}
                              onChange={() => (p.tipo === 'multiple' ? alternarMultiple(p, j) : responder(p, j))}
                            />
                            <span>{opcion}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {faltan.includes(p.id) && <small className="eval-falta-texto">Contesta esta pregunta.</small>}
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="eval-enviar">
          <button type="button" className="back-btn" onClick={() => setFase('inicio')} disabled={enviando}>Cancelar</button>
          <button type="submit" className="back-btn leccion-btn-principal" disabled={enviando}>
            {enviando ? 'Enviando…' : esExamen ? 'Enviar examen' : 'Enviar encuesta'}
          </button>
        </div>
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
        <button type="button" className="back-btn leccion-btn-principal eval-boton" onClick={empezar}>
          {intentos.length && esExamen ? 'Volver a intentar' : esExamen ? 'Comenzar examen' : 'Responder encuesta'}
        </button>
      ) : null}
      {esAdmin && <p className="eval-alumno-aviso">Como administrador puedes presentarlo para revisarlo; no se guarda.</p>}
    </div>
  );
}
