import React, { useState } from 'react';
import MetricasCursos from './MetricasCursos';
import AnaliticasPlataforma from './AnaliticasPlataforma';
import LineaTiempoPlataforma from './LineaTiempoPlataforma';
import './Informes.css';

// Informes del panel: métricas por curso, analíticas de toda la plataforma y
// la línea de tiempo general.

const PESTANAS = [['cursos', 'Cursos'], ['plataforma', 'Analíticas'], ['tiempo', 'Línea de tiempo']];

export default function InformesAdmin({ cursos, perfiles }) {
  const [pestana, setPestana] = useState('cursos');
  return (
    <div className="metricas inf-contenedor">
      <nav className="inf-pestanas" role="tablist">
        {PESTANAS.map(([id, n]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{n}</button>
        ))}
      </nav>
      {pestana === 'cursos' && <MetricasCursos cursos={cursos} perfiles={perfiles} />}
      {pestana === 'plataforma' && <AnaliticasPlataforma cursos={cursos} perfiles={perfiles} />}
      {pestana === 'tiempo' && <LineaTiempoPlataforma cursos={cursos} perfiles={perfiles} />}
    </div>
  );
}
