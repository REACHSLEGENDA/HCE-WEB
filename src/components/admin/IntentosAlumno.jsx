import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { esRespuestaCorrecta, textoRespuesta } from '../../lib/analisisEvaluacion';

// Intentos de un alumno en un examen o encuesta: cada intento con su fecha,
// calificación y lo que respondió en cada pregunta (como en TalentLMS).

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function IntentosAlumno({ intentos, preguntas, perfiles, esExamen }) {
  const nombres = useMemo(() => new Map(perfiles.map((p) => [p.id, p.nombre_completo || p.email || 'Alumno'])), [perfiles]);
  const alumnos = useMemo(() => {
    const ids = [...new Set(intentos.map((i) => i.user_id))];
    return ids.map((id) => ({ id, nombre: nombres.get(id) || 'Alumno', intentos: intentos.filter((i) => i.user_id === id).length }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [intentos, nombres]);
  const [alumnoId, setAlumnoId] = useState('');
  const [abiertos, setAbiertos] = useState({});

  const suyos = useMemo(
    () => intentos.filter((i) => i.user_id === alumnoId).sort((a, b) => (a.numero || 0) - (b.numero || 0)),
    [intentos, alumnoId]
  );

  if (!alumnos.length) return null;

  return (
    <section className="m-intentos" aria-labelledby="m-intentos-titulo">
      <h4 id="m-intentos-titulo">Intentos por alumno</h4>
      <p className="m-analisis-sub">Elige un alumno para ver cada uno de sus intentos y lo que respondió.</p>
      <select className="m-select" value={alumnoId} onChange={(e) => { setAlumnoId(e.target.value); setAbiertos({}); }} aria-label="Alumno">
        <option value="">Elige un alumno…</option>
        {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.intentos} {a.intentos === 1 ? 'intento' : 'intentos'}</option>)}
      </select>

      {alumnoId && (
        <ol className="m-intentos-lista">
          {suyos.map((intento) => {
            const abierto = abiertos[intento.id] ?? suyos.length === 1;
            return (
              <li key={intento.id} className="m-intento">
                <button type="button" className="m-intento-cabeza" aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [intento.id]: !abierto }))}>
                  {abierto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <strong>Intento {intento.numero}</strong>
                  <span>{fecha(intento.enviado_en)}</span>
                  {esExamen && intento.calificacion != null && (
                    <span className={`m-intento-nota${intento.aprobado ? ' ok' : ''}`}>
                      {Math.round(Number(intento.calificacion))}% · {intento.aprobado ? 'Aprobado' : 'No aprobado'}
                    </span>
                  )}
                </button>
                {abierto && (
                  <ol className="m-intento-respuestas">
                    {preguntas.map((p, i) => {
                      const r = intento.respuestas?.[p.id];
                      const texto = textoRespuesta(p, r);
                      const correcta = esExamen ? esRespuestaCorrecta(p, r) : null;
                      return (
                        <li key={p.id}>
                          <p className="m-intento-pregunta"><span>{i + 1}.</span> {p.texto}</p>
                          <p className={`m-intento-respuesta${correcta === true ? ' bien' : correcta === false ? ' mal' : ''}`}>
                            {correcta === true && <Check size={14} aria-label="Correcta" />}
                            {correcta === false && <X size={14} aria-label="Incorrecta" />}
                            {texto || <em>Sin contestar</em>}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
