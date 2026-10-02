import React, { useEffect, useMemo, useState } from 'react';
import { Check, UserX, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { llamarCuenta, esTablaFaltante } from '../../lib/cursos';
import './AdminLms.css';

// Cuentas nuevas esperando acceso. Ya entran al portal y pueden inscribirse o
// comprar, pero sus cursos siguen cerrados hasta que aquí se les da acceso. En
// el mismo paso se les asigna grupo (y con él sus cursos) y, si hace falta,
// cursos sueltos.

const fecha = (iso) => (iso
  ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');

export default function CuentasPorActivar({ pendientes, cursos, onCambio, notificar, confirmar }) {
  const [grupos, setGrupos] = useState([]);
  const [inscritos, setInscritos] = useState({});
  const [abierta, setAbierta] = useState(null);
  const [grupoId, setGrupoId] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [ocupado, setOcupado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const ids = useMemo(() => pendientes.map((p) => p.id).join(','), [pendientes]);

  // Grupos disponibles y lo que cada cuenta pendiente ya compró o se inscribió.
  useEffect(() => {
    let vigente = true;
    const lista = ids ? ids.split(',') : [];
    Promise.all([
      supabase.from('grupos').select('id, nombre').order('nombre'),
      supabase.from('grupo_cursos').select('grupo_id, course_id'),
      lista.length
        ? supabase.from('inscripciones').select('user_id, course_id, origen').in('user_id', lista)
        : Promise.resolve({ data: [] }),
    ]).then(([g, gc, ins]) => {
      if (!vigente) return;
      // Si solo falta la tabla de grupos (migración sin correr), se puede dar
      // acceso igual, sin grupo.
      const error = [g.error, gc.error, ins.error].find((e) => e && !esTablaFaltante(e));
      if (error) throw error;
      setErrorCarga('');
      setGrupos((g.data || []).map((grupo) => ({
        ...grupo,
        cursos: (gc.data || []).filter((x) => x.grupo_id === grupo.id).map((x) => Number(x.course_id)),
      })));
      const porCuenta = {};
      (ins.data || []).forEach((i) => { (porCuenta[i.user_id] ||= []).push(i); });
      setInscritos(porCuenta);
    }).catch((err) => { if (vigente) setErrorCarga(err.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [ids]);

  const nombreCurso = (id) => cursos.find((c) => Number(c.id) === Number(id))?.title || `Curso ${id}`;
  const grupoElegido = grupos.find((g) => String(g.id) === String(grupoId));

  const abrir = (cuenta) => {
    setAbierta(abierta === cuenta.id ? null : cuenta.id);
    setGrupoId('');
    setElegidos([]);
  };

  const alternarCurso = (id) => {
    setElegidos((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  };

  const aprobar = async (cuenta) => {
    setOcupado(cuenta.id);
    try {
      const r = await llamarCuenta('aprobar', {
        userId: cuenta.id,
        grupoId: grupoId ? Number(grupoId) : null,
        courseIds: elegidos,
      });
      const yaTenia = (inscritos[cuenta.id] || []).length;
      notificar(
        `${cuenta.nombre_completo || cuenta.email} ya tiene acceso` +
        (r.cursos || yaTenia ? ` a ${(r.cursos ?? 0) + yaTenia} curso(s).` : '. Todavía no tiene cursos asignados.'),
        'success'
      );
      setAbierta(null);
      await onCambio();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const rechazar = async (cuenta) => {
    const ok = await confirmar(
      `¿Rechazar la cuenta de ${cuenta.nombre_completo || cuenta.email}? Queda suspendida y no podrá entrar al portal. Puedes reactivarla después desde el directorio.`,
      'Rechazar cuenta'
    );
    if (!ok) return;
    setOcupado(cuenta.id);
    try {
      await llamarCuenta('rechazar', { userId: cuenta.id });
      notificar('Cuenta rechazada.', 'success');
      await onCambio();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(null);
    }
  };

  if (!pendientes.length) return null;

  return (
    <section className="cuentas-pendientes">
      <header className="cuentas-pendientes-cabecera">
        <Clock size={18} />
        <h3>Cuentas por activar <span className="cuentas-pendientes-num">{pendientes.length}</span></h3>
        <p>Ya pueden entrar al portal, pero sus cursos siguen cerrados hasta que les des acceso.</p>
      </header>
      {cargando && <p className="lms-cargando" role="status">Cargando grupos e inscripciones…</p>}
      {errorCarga && <p className="lms-aviso lms-aviso--error" role="alert">No se pudieron cargar los grupos e inscripciones: {errorCarga}. Recarga la página para reintentar.</p>}

      <ul className="cuentas-pendientes-lista">
        {pendientes.map((cuenta) => {
          const suyos = inscritos[cuenta.id] || [];
          const suyosIds = suyos.map((i) => Number(i.course_id));
          const delGrupo = grupoElegido?.cursos || [];
          const abiertaEsta = abierta === cuenta.id;
          return (
            <li key={cuenta.id} className={`cuenta-pendiente ${abiertaEsta ? 'abierta' : ''}`}>
              <div className="cuenta-pendiente-fila">
                <div className="cuenta-pendiente-datos">
                  <strong>{cuenta.nombre_completo || 'Sin nombre'}</strong>
                  <small>
                    {cuenta.email}
                    {cuenta.institucion ? ` · ${cuenta.institucion}` : ''}
                    {cuenta.pais ? ` · ${cuenta.pais}` : ''}
                    {` · se registró ${fecha(cuenta.created_at)}`}
                  </small>
                  {suyos.length > 0 && (
                    <small className="cuenta-pendiente-cursos">
                      Ya inscrito: {suyos.map((i) => `${nombreCurso(i.course_id)}${i.origen === 'pago' ? ' (pagado)' : ''}`).join(', ')}
                    </small>
                  )}
                </div>
                <div className="cuenta-pendiente-acciones">
                  <button type="button" className="btn-crm-action solid mini" onClick={() => abrir(cuenta)} disabled={ocupado === cuenta.id || cargando || !!errorCarga}>
                    Dar acceso {abiertaEsta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button type="button" className="icon-action-btn delete" title="Rechazar" onClick={() => rechazar(cuenta)} disabled={ocupado === cuenta.id}>
                    <UserX size={15} />
                  </button>
                </div>
              </div>

              {abiertaEsta && (
                <div className="cuenta-pendiente-panel">
                  <div className="crm-input-group">
                    <label htmlFor={`grupo-${cuenta.id}`}>Grupo</label>
                    <select id={`grupo-${cuenta.id}`} value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
                      <option value="">Sin grupo</option>
                      {grupos.map((g) => (
                        <option key={g.id} value={g.id}>{g.nombre}{g.cursos.length ? ` (${g.cursos.length} curso${g.cursos.length === 1 ? '' : 's'})` : ''}</option>
                      ))}
                    </select>
                    {grupoElegido && (
                      <small>
                        {delGrupo.length
                          ? `Queda inscrito en los cursos del grupo: ${delGrupo.map(nombreCurso).join(', ')}.`
                          : 'Este grupo todavía no tiene cursos asignados.'}
                      </small>
                    )}
                  </div>

                  <div className="crm-input-group">
                    <label>Cursos adicionales (opcional)</label>
                    <div className="cuenta-pendiente-opciones">
                      {cursos.filter((c) => c.activo !== false).map((c) => {
                        const id = Number(c.id);
                        const incluido = suyosIds.includes(id) || delGrupo.includes(id);
                        return (
                          <label key={id} className={`lms-check ${incluido ? 'incluido' : ''}`}>
                            <input
                              type="checkbox"
                              checked={incluido || elegidos.includes(id)}
                              disabled={incluido}
                              onChange={() => alternarCurso(id)}
                            />
                            {c.title}
                            {suyosIds.includes(id) && <em> · ya inscrito</em>}
                            {!suyosIds.includes(id) && delGrupo.includes(id) && <em> · por el grupo</em>}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lms-editor-acciones">
                    <button type="button" className="btn-crm-action outlined" onClick={() => setAbierta(null)}>Cancelar</button>
                    <button type="button" className="btn-crm-action solid" onClick={() => aprobar(cuenta)} disabled={ocupado === cuenta.id}>
                      <Check size={15} /> {ocupado === cuenta.id ? 'Activando…' : 'Activar cuenta'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
