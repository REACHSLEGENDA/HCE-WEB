import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Edit, Plus, Trash2, X } from 'lucide-react';
import {
  TIPOS_PREGUNTA,
  ESCALA_BASE,
  cargarEvaluacionAdmin,
  guardarConfigEvaluacion,
  guardarPregunta,
  borrarPregunta,
  reordenarPreguntas,
} from '../../lib/evaluaciones';
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

export default function EditorEvaluacion({ leccion, notificar, confirmar, onCerrar }) {
  const esExamen = leccion.tipo === 'examen';
  const [datos, setDatos] = useState(null);
  const [config, setConfig] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const aplicar = useCallback((r) => {
    if (r === null) { setFaltaMigracion(true); return; }
    setDatos(r);
    setConfig(r.config);
  }, []);

  const cargar = useCallback(async () => {
    try { aplicar(await cargarEvaluacionAdmin(leccion.id)); }
    catch (err) { notificar(`No se pudo cargar la evaluación: ${err.message}`, 'error'); }
  }, [leccion.id, notificar, aplicar]);

  useEffect(() => {
    let vigente = true;
    cargarEvaluacionAdmin(leccion.id)
      .then((r) => { if (vigente) aplicar(r); })
      .catch((err) => { if (vigente) notificar(`No se pudo cargar la evaluación: ${err.message}`, 'error'); });
    return () => { vigente = false; };
  }, [leccion.id, notificar, aplicar]);

  const guardarConfig = async () => {
    try {
      await guardarConfigEvaluacion(leccion.id, config);
      notificar('Reglas guardadas.', 'success');
    } catch (err) {
      notificar(`No se pudieron guardar las reglas: ${err.message}`, 'error');
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
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
      const orden = p.id ? p.orden : (datos.preguntas.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1);
      // En encuestas no hay respuestas correctas.
      await guardarPregunta(leccion.id, { ...p, orden, correctas: esExamen ? p.correctas : [] });
      // Primera pregunta: se guardan también las reglas, para que existan.
      if (!datos.preguntas.length) await guardarConfigEvaluacion(leccion.id, config);
      setEditando(null);
      await cargar();
    } catch (err) {
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

  const mover = async (i, dir) => {
    const lista = [...datos.preguntas];
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setDatos({ ...datos, preguntas: lista });
    await reordenarPreguntas(lista.map((p) => p.id));
    await cargar();
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
        <button type="button" className="btn-crm-action outlined" style={{ marginLeft: 10 }} onClick={onCerrar}>Volver</button>
      </div>
    );
  }
  if (!datos) return <p className="lms-cargando">Cargando preguntas…</p>;

  return (
    <div className="eval-editor">
      <div className="eval-editor-cabecera">
        <button type="button" className="btn-crm-action outlined" onClick={onCerrar}><ArrowLeft size={14} /> Lecciones</button>
        <div>
          <span className="eval-etiqueta">{esExamen ? 'Examen' : 'Encuesta'}</span>
          <h4>{leccion.titulo}</h4>
        </div>
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
        <button type="button" className="btn-crm-action solid" onClick={guardarConfig}>Guardar reglas</button>
      </div>

      {datos.preguntas.length === 0 && !editando && (
        <p className="lms-vacio">Todavía no hay preguntas. Agrega la primera.</p>
      )}

      {datos.preguntas.length > 0 && (
        <ol className="eval-lista">
          {datos.preguntas.map((p, i) => (
            <li key={p.id} className="eval-pregunta">
              <div className="eval-pregunta-cabecera">
                <span className="lms-orden">{i + 1}</span>
                <div className="eval-pregunta-texto">
                  <strong>{p.texto}</strong>
                  <small>{TIPOS_PREGUNTA[p.tipo]}{esExamen && ['opcion', 'multiple'].includes(p.tipo) ? ` · ${p.puntos} ${p.puntos === 1 ? 'punto' : 'puntos'}` : ''}{p.obligatoria ? '' : ' · opcional'}</small>
                </div>
                <span className="lms-acciones">
                  <button type="button" className="icon-action-btn" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp size={15} /></button>
                  <button type="button" className="icon-action-btn" title="Bajar" disabled={i === datos.preguntas.length - 1} onClick={() => mover(i, 1)}><ArrowDown size={15} /></button>
                  <button type="button" className="icon-action-btn edit" title="Editar" onClick={() => setEditando({ ...p, opciones: [...(p.opciones || [])], correctas: [...(p.correctas || [])] })}><Edit size={15} /></button>
                  <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(p)}><Trash2 size={15} /></button>
                </span>
              </div>
              {p.tipo !== 'abierta' && (
                <ul className="eval-opciones-vista">
                  {(p.opciones || []).map((o, j) => {
                    const correcta = esExamen && p.correctas.includes(j);
                    return (
                      <li key={j} className={correcta ? 'correcta' : ''}>
                        {correcta ? <Check size={13} /> : <span className="eval-punto" />} {p.tipo === 'escala' ? `${j + 1}. ` : ''}{o}
                      </li>
                    );
                  })}
                </ul>
              )}
              {esExamen && ['opcion', 'multiple'].includes(p.tipo) && !p.correctas.length && (
                <p className="lms-alerta eval-sin-clave">Sin respuesta correcta: no cuenta para la calificación.</p>
              )}
            </li>
          ))}
        </ol>
      )}

      {!editando && (
        <div className="lms-agregar">
          <span>Agregar pregunta:</span>
          {TIPOS_POR_EVALUACION[leccion.tipo].map((tipo) => (
            <button key={tipo} type="button" className="btn-crm-action outlined" onClick={() => setEditando(preguntaVacia(tipo))}>
              <Plus size={14} /> {TIPOS_PREGUNTA[tipo]}
            </button>
          ))}
        </div>
      )}

      {editando && (
        <form className="lms-editor" onSubmit={guardar}>
          <div className="lms-editor-cabecera">
            <h4>{editando.id ? 'Editar pregunta' : `Nueva pregunta · ${TIPOS_PREGUNTA[editando.tipo]}`}</h4>
            <button type="button" className="icon-action-btn" title="Cancelar" onClick={() => setEditando(null)}><X size={16} /></button>
          </div>

          <div className="crm-input-group">
            <label>Pregunta *</label>
            <textarea rows="3" className="lms-textarea" value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} placeholder="¿De qué depende la normalidad de una variable?" />
          </div>

          {editando.tipo !== 'abierta' && (
            <div className="crm-input-group">
              <label>
                {editando.tipo === 'escala' ? 'Etiquetas de la escala (1 a 5)'
                  : esExamen ? `Opciones · marca ${editando.tipo === 'opcion' ? 'la correcta' : 'las correctas'}` : 'Opciones'}
              </label>
              <div className="eval-opciones-edicion">
                {editando.opciones.map((o, j) => (
                  <div key={j} className="eval-opcion-fila">
                    {esExamen && editando.tipo !== 'escala' ? (
                      <input
                        type={editando.tipo === 'opcion' ? 'radio' : 'checkbox'}
                        name="correcta"
                        checked={editando.correctas.includes(j)}
                        onChange={() => alternarCorrecta(j)}
                        aria-label={`Opción ${j + 1} es correcta`}
                      />
                    ) : (
                      <span className="eval-numero">{j + 1}</span>
                    )}
                    <input
                      type="text"
                      value={o}
                      onChange={(e) => setEditando({ ...editando, opciones: editando.opciones.map((x, k) => (k === j ? e.target.value : x)) })}
                      placeholder={`Opción ${j + 1}`}
                    />
                    {editando.tipo !== 'escala' && editando.opciones.length > 2 && (
                      <button type="button" className="icon-action-btn delete" title="Quitar opción" onClick={() => quitarOpcion(j)}><X size={14} /></button>
                    )}
                  </div>
                ))}
                {editando.tipo !== 'escala' && editando.opciones.length < 10 && (
                  <button type="button" className="btn-crm-action outlined mini" onClick={() => setEditando({ ...editando, opciones: [...editando.opciones, ''] })}>
                    <Plus size={13} /> Agregar opción
                  </button>
                )}
              </div>
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

          <div className="lms-editor-acciones">
            <button type="button" className="btn-crm-action outlined" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-crm-action solid" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar pregunta'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
