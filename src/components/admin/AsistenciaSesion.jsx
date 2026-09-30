import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { llamarSesion, fechaSesion } from '../../lib/sesiones';
import './AdminLms.css';

// Registrados a una sesión en vivo y su asistencia según el reporte de Zoom.

export default function AsistenciaSesion({ leccion, notificar, onCerrar }) {
  const [registros, setRegistros] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { registros: lista } = await llamarSesion('registros', { leccionId: leccion.id });
      setRegistros(lista);
    } catch (err) {
      notificar(err.message, 'error');
      setRegistros([]);
    }
  }, [leccion.id, notificar]);

  useEffect(() => {
    let vigente = true;
    llamarSesion('registros', { leccionId: leccion.id })
      .then(({ registros: lista }) => { if (vigente) setRegistros(lista); })
      .catch((err) => { if (vigente) { notificar(err.message, 'error'); setRegistros([]); } });
    return () => { vigente = false; };
  }, [leccion.id, notificar]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await llamarSesion('sincronizar', { leccionId: leccion.id });
      if (r.corrio) notificar(`Reporte de Zoom revisado: ${r.asistieron} ${r.asistieron === 1 ? 'asistencia confirmada' : 'asistencias confirmadas'}.`, 'success');
      else if (r.motivo === 'no-ha-terminado') notificar('La sesión todavía no termina.', 'info');
      else if (r.motivo === 'reporte-pendiente') notificar('Zoom todavía no publica el reporte. Intenta en un rato.', 'info');
      else notificar('Esta sesión no tiene reunión de Zoom conectada.', 'info');
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setSincronizando(false);
    }
  };

  const asistieron = (registros || []).filter((r) => r.asistio).length;

  return (
    <div className="eval-editor">
      <div className="eval-editor-cabecera">
        <button type="button" className="btn-crm-action outlined" onClick={onCerrar}><ArrowLeft size={14} /> Lecciones</button>
        <div>
          <span className="eval-etiqueta">Sesión en vivo</span>
          <h4>{leccion.titulo}</h4>
          {leccion.sesion?.inicia_en && <small className="lms-ayuda">{fechaSesion(leccion.sesion.inicia_en)}</small>}
        </div>
      </div>

      <div className="lms-agregar">
        <span>{registros ? `${registros.length} registrados · ${asistieron} asistieron` : 'Cargando…'}</span>
        <button type="button" className="btn-crm-action outlined" onClick={sincronizar} disabled={sincronizando}>
          <RefreshCw size={14} /> {sincronizando ? 'Revisando Zoom…' : 'Revisar asistencia en Zoom'}
        </button>
      </div>

      {registros && registros.length === 0 && <p className="lms-vacio">Todavía no se registra nadie.</p>}
      {registros && registros.length > 0 && (
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla">
            <thead><tr><th>Correo</th><th>Registro</th><th className="num">Minutos</th><th>Asistencia</th></tr></thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{new Date(r.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                  <td className="num">{r.minutos || '—'}</td>
                  <td>{r.asistio ? <span className="lms-detectado"><CheckCircle size={13} /> Asistió</span> : r.verificado_en ? 'No presentado' : 'Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
