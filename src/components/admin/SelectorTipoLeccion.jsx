import React from 'react';
import { Copy, PlayCircle } from 'lucide-react';
import { TIPOS_LECCION } from '../../lib/lecciones';
import { ICONOS_LECCION, PARA_QUE_SIRVE, ORDEN_TIPOS } from './tiposLeccion';

// Tarjetas para elegir qué tipo de lección agregar (o copiar una ya hecha).

export default function SelectorTipoLeccion({ onElegir, onCopiar }) {
  return (
    <ul className="tipo-leccion-rejilla" aria-label="Tipo de lección">
      {ORDEN_TIPOS.filter((t) => TIPOS_LECCION[t]).map((tipo) => {
        const Icono = ICONOS_LECCION[tipo] || PlayCircle;
        return (
          <li key={tipo}>
            <button type="button" className={`tipo-leccion${tipo === 'seccion' ? ' tipo-leccion--seccion' : ''}`} onClick={() => onElegir(tipo)}>
              <span className="tipo-leccion-icono" aria-hidden="true"><Icono size={20} /></span>
              <span className="tipo-leccion-texto">
                <strong>{TIPOS_LECCION[tipo]}</strong>
                <small>{PARA_QUE_SIRVE[tipo]}</small>
              </span>
            </button>
          </li>
        );
      })}
      {onCopiar && (
        <li>
          <button type="button" className="tipo-leccion tipo-leccion--copiar" onClick={onCopiar}>
            <span className="tipo-leccion-icono" aria-hidden="true"><Copy size={20} /></span>
            <span className="tipo-leccion-texto">
              <strong>Copiar de otro curso</strong>
              <small>Reutiliza una lección que ya armaste, con su contenido.</small>
            </span>
          </button>
        </li>
      )}
    </ul>
  );
}
