import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Inbox } from 'lucide-react';
import { cargarSolicitudesPendientes } from '../../lib/reglas';
import { llamarInscripcion } from '../../lib/cursos';
import './AdminLms.css';

// Alumnos que pidieron entrar a un curso con "solicitud de inscripción".

const fecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SolicitudesInscripcion({ perfiles, cursos, notificar }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    try { setSolicitudes(await cargarSolicitudesPendientes()); }
    catch (err) { notificar(`No se pudieron cargar las solicitudes: ${err.message}`, 'error'); }
  }, [notificar]);

  useEffect(() => {
    let vigente = true;
    cargarSolicitudesPendientes()
      .then((lista) => { if (vigente) setSolicitudes(lista); })
      .catch(() => {});
    return () => { vigente = false; };
  }, []);

  const resolver = async (s, aprobar) => {
    setOcupado(s.id);
    try {
      await llamarInscripcion('admin-solicitud-resolver', { solicitudId: s.id, aprobar });
      notificar(aprobar ? 'Solicitud aprobada: el alumno ya está inscrito.' : 'Solicitud rechazada.', 'success');
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(null);
    }
  };

  if (!solicitudes.length) return null;

  const perfil = (id) => perfiles.find((p) => p.id === id);
  const curso = (id) => cursos.find((c) => Number(c.id) === Number(id));

  return (
    <section className="cuentas-pendientes solicitudes">
      <header className="cuentas-pendientes-cabecera">
        <Inbox size={18} />
        <h3>Solicitudes de inscripción <span className="cuentas-pendientes-num">{solicitudes.length}</span></h3>
        <p>Pidieron entrar a un curso que requiere tu aprobación.</p>
      </header>
      <ul className="cuentas-pendientes-lista">
        {solicitudes.map((s) => {
          const p = perfil(s.user_id);
          return (
            <li key={s.id} className="cuenta-pendiente">
              <div className="cuenta-pendiente-fila">
                <div className="cuenta-pendiente-datos">
                  <strong>{p?.nombre_completo || p?.email || 'Alumno'}</strong>
                  <small>{curso(s.course_id)?.title || `Curso ${s.course_id}`} · {fecha(s.creada_en)}</small>
                </div>
                <div className="cuenta-pendiente-acciones">
                  <button type="button" className="btn-crm-action solid mini" disabled={ocupado === s.id} onClick={() => resolver(s, true)}>
                    <Check size={14} /> Aprobar
                  </button>
                  <button type="button" className="icon-action-btn delete" title="Rechazar" disabled={ocupado === s.id} onClick={() => resolver(s, false)}>
                    <X size={15} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
