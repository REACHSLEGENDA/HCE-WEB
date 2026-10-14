import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ExternalLink, Save, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { PESTANAS_CURSO } from './editorCurso';

/**
 * Armazón del editor de cursos: encabezado (nombre, estado, Ver aula, Cerrar),
 * pestañas y, en las pestañas del formulario, la barra fija de guardar.
 * El contenido de cada pestaña lo pone quien lo usa (children).
 */
export default function EditorCursoPestanas({
  titulo,
  courseId,
  activo,
  pestana,
  onPestana,
  pestanasConError = [],
  onCerrar,
  lateral,
  children,
}) {
  const refsPestanas = useRef({});
  const guardado = !!courseId;

  const disponibles = PESTANAS_CURSO.filter((p) => guardado || !p.requiereGuardado);

  // En el celular la barra de pestañas se desliza: la activa siempre a la vista.
  useEffect(() => {
    refsPestanas.current[pestana]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pestana]);

  // Flechas izquierda/derecha, Inicio y Fin entre pestañas (patrón WAI-ARIA).
  const alTeclear = (e) => {
    const indice = disponibles.findIndex((p) => p.id === pestana);
    let siguiente = null;
    if (e.key === 'ArrowRight') siguiente = disponibles[(indice + 1) % disponibles.length];
    else if (e.key === 'ArrowLeft') siguiente = disponibles[(indice - 1 + disponibles.length) % disponibles.length];
    else if (e.key === 'Home') siguiente = disponibles[0];
    else if (e.key === 'End') siguiente = disponibles[disponibles.length - 1];
    if (!siguiente) return;
    e.preventDefault();
    onPestana(siguiente.id);
    refsPestanas.current[siguiente.id]?.focus();
  };

  return (
    <div className="ec-editor">
      <div className="ec-encabezado">
        <button type="button" className="ec-volver" onClick={onCerrar} aria-label="Cerrar el editor y volver a la lista de cursos">
          <ArrowLeft size={18} />
        </button>
        <div className="ec-titulo">
          <span className="ec-sobretitulo">{guardado ? `Curso #${courseId}` : 'Curso nuevo'}</span>
          <h2>{titulo?.trim() || 'Sin título'}</h2>
        </div>
        <span className={`ec-estado ${activo ? 'activo' : 'borrador'}`} title={activo ? 'Los alumnos lo ven en el catálogo' : 'Los alumnos todavía no lo ven'}>
          {activo ? 'Activo' : 'Borrador'}
        </span>
        <div className="ec-acciones">
          {guardado && (
            <a className="btn-crm-action outlined" href={`/classroom/${courseId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> <span>Ver aula</span>
            </a>
          )}
          <button type="button" className="btn-crm-action outlined" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>

      <div className="ec-pestanas" role="tablist" aria-label="Secciones del curso" onKeyDown={alTeclear}>
        {PESTANAS_CURSO.map((p) => {
          const bloqueada = p.requiereGuardado && !guardado;
          const seleccionada = p.id === pestana;
          const conError = pestanasConError.includes(p.id);
          return (
            <button
              key={p.id}
              ref={(el) => { refsPestanas.current[p.id] = el; }}
              type="button"
              role="tab"
              id={`ec-tab-${p.id}`}
              aria-selected={seleccionada}
              aria-controls="ec-panel"
              aria-disabled={bloqueada || undefined}
              tabIndex={seleccionada ? 0 : -1}
              className={`ec-pestana${seleccionada ? ' activa' : ''}${bloqueada ? ' bloqueada' : ''}`}
              title={bloqueada ? 'Guarda el curso primero' : undefined}
              onClick={() => { if (!bloqueada) onPestana(p.id); }}
            >
              {bloqueada && <Lock size={12} aria-hidden="true" />}
              <span>{p.etiqueta}</span>
              {conError && <span className="ec-punto-error" aria-label="tiene campos por corregir" />}
            </button>
          );
        })}
      </div>
      {!guardado && (
        <p className="ec-nota-bloqueo">
          <Lock size={13} aria-hidden="true" /> Lecciones, Reglas, Biblioteca y Alumnos se habilitan al guardar el curso por primera vez.
        </p>
      )}

      <div className={`ec-cuerpo${lateral ? ' con-lateral' : ''}`}>
        <div className="ec-panel" id="ec-panel" role="tabpanel" aria-labelledby={`ec-tab-${pestana}`}>
          {children}
        </div>
        {lateral && <aside className="ec-lateral">{lateral}</aside>}
      </div>
    </div>
  );
}

/** Barra fija al pie de las pestañas del formulario. */
export function BarraGuardarCurso({ sucio, estado, nuevo, deshabilitado, onGuardar, errores = 0 }) {
  const guardando = estado === 'guardando';
  let indicador;
  if (guardando) indicador = <span className="ec-indicador">Guardando…</span>;
  else if (errores > 0) indicador = <span className="ec-indicador error"><AlertCircle size={14} /> {errores === 1 ? '1 campo por corregir' : `${errores} campos por corregir`}</span>;
  else if (sucio) indicador = <span className="ec-indicador sucio"><span className="ec-punto" aria-hidden="true" /> Cambios sin guardar</span>;
  else if (estado === 'guardado') indicador = <span className="ec-indicador ok"><CheckCircle size={14} /> Guardado</span>;
  else indicador = <span className="ec-indicador">{nuevo ? 'Completa la información y guarda el borrador' : 'Sin cambios'}</span>;

  return (
    <div className={`ec-barra-guardar${sucio ? ' sucio' : ''}`} role="region" aria-label="Guardar el curso">
      <div aria-live="polite">{indicador}</div>
      <button
        type="button"
        className="btn-crm-action solid"
        onClick={onGuardar}
        disabled={deshabilitado || guardando || (!sucio && !nuevo)}
      >
        <Save size={16} />
        <span>{guardando ? 'Guardando…' : nuevo ? 'Guardar borrador' : 'Guardar cambios'}</span>
      </button>
    </div>
  );
}
