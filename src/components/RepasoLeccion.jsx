// "Comprueba lo que aprendiste": preguntas de repaso al final de una lectura.
// El alumno elige, revisa y ve al instante si acertó, con la explicación. No se
// califica ni se guarda: es solo para que compruebe que entendió la lección.
import { useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, XCircle } from 'lucide-react';
import { repasoValido } from '../lib/lecciones';
import './RepasoLeccion.css';

export default function RepasoLeccion({ preguntas: lista }) {
  const preguntas = useMemo(() => repasoValido(lista), [lista]);
  const [respuestas, setRespuestas] = useState({});
  const [revisado, setRevisado] = useState(false);

  if (!preguntas.length) return null;

  const contestadas = preguntas.filter((_, i) => respuestas[i] !== undefined).length;
  const aciertos = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
  const todas = contestadas === preguntas.length;

  const reiniciar = () => {
    setRespuestas({});
    setRevisado(false);
  };

  return (
    <section className="repaso-leccion" aria-labelledby="repaso-titulo">
      <header>
        <h3 id="repaso-titulo"><HelpCircle size={18} aria-hidden="true" /> Comprueba lo que aprendiste</h3>
        <p>{preguntas.length === 1 ? 'Una pregunta rápida' : `${preguntas.length} preguntas rápidas`} sobre la lección. No cuentan para tu calificación.</p>
      </header>

      <ol className="repaso-lista">
        {preguntas.map((p, i) => {
          const elegida = respuestas[i];
          const acerto = elegida === p.correcta;
          return (
            <li key={i} className="repaso-pregunta">
              <fieldset disabled={revisado}>
                <legend>{p.pregunta}</legend>
                {p.opciones.map((o, k) => {
                  const marcada = elegida === k;
                  const estado = revisado ? (k === p.correcta ? ' correcta' : marcada ? ' incorrecta' : '') : marcada ? ' marcada' : '';
                  return (
                    <label key={k} className={`repaso-opcion${estado}`}>
                      <input
                        type="radio"
                        name={`repaso-${i}`}
                        checked={marcada}
                        onChange={() => setRespuestas((r) => ({ ...r, [i]: k }))}
                      />
                      <span>{o}</span>
                      {revisado && k === p.correcta && <CheckCircle2 size={18} aria-label="Respuesta correcta" />}
                      {revisado && marcada && !acerto && <XCircle size={18} aria-label="Tu respuesta" />}
                    </label>
                  );
                })}
              </fieldset>
              {revisado && (
                <p className={`repaso-resultado${acerto ? ' bien' : ' mal'}`} role="status">
                  <strong>{acerto ? '¡Correcto!' : elegida === undefined ? 'Sin contestar.' : 'No es correcta.'}</strong>
                  {p.explicacion && <> {p.explicacion}</>}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="repaso-acciones">
        {revisado ? (
          <>
            <p className="repaso-puntaje" role="status">
              Acertaste <strong>{aciertos} de {preguntas.length}</strong>
              {aciertos === preguntas.length ? '. ¡Excelente!' : '. Puedes repasar la lección e intentarlo de nuevo.'}
            </p>
            <button type="button" className="repaso-boton secundario" onClick={reiniciar}>
              <RotateCcw size={15} aria-hidden="true" /> Intentar de nuevo
            </button>
          </>
        ) : (
          <>
            <span className="repaso-avance">{contestadas} de {preguntas.length} contestadas</span>
            <button type="button" className="repaso-boton" disabled={!todas} onClick={() => setRevisado(true)}>
              Revisar respuestas
            </button>
          </>
        )}
      </div>
    </section>
  );
}
