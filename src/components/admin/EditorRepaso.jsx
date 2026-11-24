// Preguntas de repaso al final de una lectura. El alumno contesta y ve al
// instante si acertó, con una explicación. No se califican: para calificar se
// agrega una lección de tipo Examen después de la lectura.
//
// Se guardan en leccion_contenido.repaso (supabase/leccion-repaso-fuentes.sql) como
// [{ pregunta, opciones: [...], correcta: índice, explicacion }].
import { CheckCircle2, Circle, HelpCircle, Plus, Trash2, X } from 'lucide-react';
import './EditorRepaso.css';

const MAX_OPCIONES = 6;
const preguntaNueva = () => ({ pregunta: '', opciones: ['', ''], correcta: 0, explicacion: '' });

export default function EditorRepaso({ value, onChange }) {
  const preguntas = Array.isArray(value) ? value : [];

  const cambiar = (i, cambios) => onChange(preguntas.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  const quitar = (i) => onChange(preguntas.filter((_, j) => j !== i));
  const agregar = () => onChange([...preguntas, preguntaNueva()]);

  const cambiarOpcion = (i, k, texto) => cambiar(i, { opciones: preguntas[i].opciones.map((o, m) => (m === k ? texto : o)) });
  const agregarOpcion = (i) => cambiar(i, { opciones: [...preguntas[i].opciones, ''] });
  const quitarOpcion = (i, k) => {
    const p = preguntas[i];
    // La correcta se recorre si se quita una opción de antes.
    const correcta = k === p.correcta ? 0 : k < p.correcta ? p.correcta - 1 : p.correcta;
    cambiar(i, { opciones: p.opciones.filter((_, m) => m !== k), correcta });
  };

  return (
    <section className="erp" aria-labelledby="erp-titulo">
      <div className="erp-encabezado">
        <HelpCircle size={18} aria-hidden="true" />
        <div>
          <h4 id="erp-titulo">Preguntas de repaso <span>(opcional)</span></h4>
          <p>Aparecen al final de la lección para que el alumno compruebe lo que entendió. Ve al instante si acertó y la explicación. No cuentan para la calificación; para calificar, agrega después una lección de tipo Examen.</p>
        </div>
      </div>

      {preguntas.map((p, i) => (
        <div key={i} className="erp-pregunta">
          <div className="erp-pregunta-cabeza">
            <label htmlFor={`erp-p-${i}`}>Pregunta {i + 1}</label>
            <button type="button" className="erp-quitar" onClick={() => quitar(i)} aria-label={`Quitar la pregunta ${i + 1}`} title="Quitar pregunta">
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
          <textarea
            id={`erp-p-${i}`}
            rows={2}
            className="lms-textarea"
            value={p.pregunta}
            onChange={(e) => cambiar(i, { pregunta: e.target.value })}
            placeholder="Ej. ¿Cuál es la función principal de la ELSO?"
          />

          <fieldset className="erp-opciones">
            <legend>Opciones <span>· toca el círculo de la respuesta correcta</span></legend>
            {p.opciones.map((o, k) => {
              const esCorrecta = p.correcta === k;
              return (
                <div key={k} className={`erp-opcion${esCorrecta ? ' correcta' : ''}`}>
                  <button
                    type="button"
                    className="erp-marcar"
                    aria-pressed={esCorrecta}
                    aria-label={`Marcar la opción ${k + 1} como correcta`}
                    onClick={() => cambiar(i, { correcta: k })}
                  >
                    {esCorrecta ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
                  </button>
                  <input
                    type="text"
                    value={o}
                    onChange={(e) => cambiarOpcion(i, k, e.target.value)}
                    placeholder={`Opción ${k + 1}`}
                    aria-label={`Opción ${k + 1} de la pregunta ${i + 1}`}
                  />
                  {p.opciones.length > 2 && (
                    <button type="button" className="erp-quitar" onClick={() => quitarOpcion(i, k)} aria-label={`Quitar la opción ${k + 1}`} title="Quitar opción">
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
            {p.opciones.length < MAX_OPCIONES && (
              <button type="button" className="erp-agregar-opcion" onClick={() => agregarOpcion(i)}>
                <Plus size={14} aria-hidden="true" /> Agregar opción
              </button>
            )}
          </fieldset>

          <label htmlFor={`erp-e-${i}`} className="erp-etiqueta">Explicación <span>(opcional, se muestra al contestar)</span></label>
          <input
            id={`erp-e-${i}`}
            type="text"
            className="erp-explicacion"
            value={p.explicacion}
            onChange={(e) => cambiar(i, { explicacion: e.target.value })}
            placeholder="Por qué esa es la respuesta correcta."
          />
        </div>
      ))}

      <button type="button" className="btn-crm-action outlined erp-agregar" onClick={agregar}>
        <Plus size={14} aria-hidden="true" /> {preguntas.length ? 'Agregar otra pregunta' : 'Agregar pregunta de repaso'}
      </button>
    </section>
  );
}
