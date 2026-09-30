import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ShieldCheck } from 'lucide-react';
import { fijarVistaAlumno } from '../lib/vista';
import './CambioVista.css';

// Interruptor entre la vista de administrador y la de alumno. Solo se muestra
// a administradores.
//   - En el panel de admin: botón "Ver como alumno" que abre el portal.
//   - En el portal o el aula en vista de alumno: franja para volver.

export function BotonVerComoAlumno({ destino = '/dashboard', className = '' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={`cambio-vista-boton ${className}`}
      onClick={() => { fijarVistaAlumno(true); navigate(destino); }}
      title="Ver el portal como lo ve un alumno"
      aria-label="Vista de alumno"
    >
      <Eye size={16} /> <span>Vista de alumno</span>
    </button>
  );
}

export function FranjaVistaAlumno({ onVolver, texto }) {
  const navigate = useNavigate();
  const volver = () => {
    fijarVistaAlumno(false);
    if (onVolver) onVolver();
    else navigate('/admin');
  };
  return (
    <div className="cambio-vista-franja" role="status">
      <Eye size={16} />
      <span>{texto || 'Estás viendo el portal como alumno. Tu actividad aquí no cuenta en las métricas.'}</span>
      <button type="button" onClick={volver}>
        <ShieldCheck size={15} /> Volver a vista de admin
      </button>
    </div>
  );
}
