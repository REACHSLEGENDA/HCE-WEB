import React, { useState } from 'react';
import { ESCALA_BASE } from '../../lib/evaluaciones';

// Vista previa de un examen o encuesta tal como lo contesta el alumno.
// Se puede contestar para probarlo; nada se guarda.

export default function VistaAlumnoEvaluacion({ esExamen, config, preguntas }) {
  const [respuestas, setRespuestas] = useState({});
  const [actual, setActual] = useState(0);
  const [revisando, setRevisando] = useState(false);
  const responder = (id, valor) => setRespuestas((r) => ({ ...r, [id]: valor }));
  const alternarMultiple = (id, j) => setRespuestas((r) => {
    const actual = Array.isArray(r[id]) ? r[id] : [];
    return { ...r, [id]: actual.includes(j) ? actual.filter((x) => x !== j) : [...actual, j] };
  });
  const respondidas = preguntas.filter((p) => {
    const v = respuestas[p.id];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '';
  }).length;

  if (!preguntas.length) {
    return <p className="lms-vacio">Todavía no hay preguntas para mostrar.</p>;
  }
  const indice = Math.min(actual, preguntas.length - 1);

  return (
    <div className="eval-previa">
      <p className="eval-previa-aviso">
        Así lo ve el alumno. Puedes contestarlo para probarlo: aquí no se guarda nada.
        {config?.aleatorio ? ' Al alumno le salen las preguntas en orden aleatorio.' : ''}
      </p>
      {esExamen && (
        <ul className="eval-previa-datos">
          <li>Mínimo para aprobar: <strong>{config?.min_aprobacion ?? 80}%</strong></li>
          <li>Intentos: <strong>{config?.intentos_max ? config.intentos_max : 'sin límite'}</strong></li>
          <li>{preguntas.length} {preguntas.length === 1 ? 'pregunta' : 'preguntas'}</li>
        </ul>
      )}
      <div className="eval-previa-progreso" aria-live="polite">
        <span>{revisando ? 'Revisión' : `Pregunta ${indice + 1} de ${preguntas.length}`} · {respondidas} contestadas</span>
        <div className="biblioteca-barra"><span style={{ width: `${(respondidas / preguntas.length) * 100}%` }} /></div>
      </div>
      {revisando ? <div className="eval-previa-revision"><h4>Revisa antes de enviar</h4><ol>{preguntas.map((p,i)=><li key={p.id}><button type="button" className="btn-crm-action outlined" onClick={()=>{setActual(i);setRevisando(false);}}>{i+1}. {p.texto}</button></li>)}</ol><p>Aquí solo pruebas la vista. Las respuestas de prueba no se envían.</p></div> : <ol className="eval-previa-lista">
        {preguntas.map((p, i) => {
          if (i !== indice) return null;
          const valor = respuestas[p.id];
          const etiquetas = p.tipo === 'escala' ? (p.opciones?.length ? p.opciones : ESCALA_BASE) : (p.opciones || []);
          return (
            <li key={p.id} className="eval-previa-pregunta">
              <fieldset>
                <legend>
                  <span className="eval-previa-num">{i + 1}</span>
                  <span>{p.texto}{p.obligatoria ? '' : <em> (opcional)</em>}</span>
                </legend>
                {p.tipo === 'multiple' && <small className="eval-previa-indicacion">Puedes elegir varias.</small>}
                {p.tipo === 'abierta' ? (
                  <textarea rows="3" className="lms-textarea" value={valor || ''} onChange={(e) => responder(p.id, e.target.value)} placeholder="Escribe tu respuesta" />
                ) : p.tipo === 'escala' ? (
                  <div className="eval-previa-escala">
                    {etiquetas.map((etiqueta, j) => (
                      <label key={j} className={valor === j + 1 ? 'elegida' : ''}>
                        <input type="radio" name={`previa-${p.id}`} checked={valor === j + 1} onChange={() => responder(p.id, j + 1)} />
                        <span className="eval-previa-escala-num">{j + 1}</span>
                        <span>{etiqueta}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="eval-previa-opciones">
                    {etiquetas.map((opcion, j) => {
                      const elegida = p.tipo === 'multiple' ? Array.isArray(valor) && valor.includes(j) : valor === j;
                      return (
                        <label key={j} className={elegida ? 'elegida' : ''}>
                          <input
                            type={p.tipo === 'multiple' ? 'checkbox' : 'radio'}
                            name={`previa-${p.id}`}
                            checked={elegida}
                            onChange={() => (p.tipo === 'multiple' ? alternarMultiple(p.id, j) : responder(p.id, j))}
                          />
                          <span>{opcion}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>}
      <div className="eval-previa-nav">
        <button type="button" className="btn-crm-action outlined" disabled={!revisando && indice===0} onClick={()=>{if(revisando)setRevisando(false);else setActual(indice-1);}}>Anterior</button>
        {!revisando && <button type="button" className="btn-crm-action solid" onClick={()=>indice===preguntas.length-1?setRevisando(true):setActual(indice+1)}>{indice===preguntas.length-1?'Revisar respuestas':'Siguiente'}</button>}
      </div>
      <button type="button" className="btn-crm-action outlined" onClick={() => {setRespuestas({});setActual(0);setRevisando(false);}}>Borrar mis respuestas de prueba</button>
    </div>
  );
}
