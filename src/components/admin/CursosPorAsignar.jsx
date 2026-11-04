import React, { useCallback, useEffect, useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { llamarCuenta, esTablaFaltante } from '../../lib/cursos';
import './AdminLms.css';

// Cursos por asignar: alumnos que pagaron un curso por generación (modo
// "grupo") y todavía no están en un grupo con ese curso. Desde el 4 nov 2026
// las cuentas quedan activas al registrarse (supabase/cuentas-sin-aprobacion.sql):
// esto es lo único que queda pendiente para el equipo. Al elegir el grupo, el
// alumno queda en él, inscrito a sus cursos, y le llega el correo con su acceso.

const fecha = (iso) => (iso
  ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

export default function CursosPorAsignar({ perfiles, cursos, notificar }) {
  const [pendientes, setPendientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [elegido, setElegido] = useState({});
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [reglas, gruposR, gc, miembros] = await Promise.all([
      supabase.from('curso_reglas').select('course_id, modo_acceso').eq('modo_acceso', 'grupo'),
      supabase.from('grupos').select('id, nombre').order('nombre'),
      supabase.from('grupo_cursos').select('grupo_id, course_id'),
      supabase.from('grupo_miembros').select('grupo_id, user_id'),
    ]);
    // Sin las migraciones de grupos no hay cursos por generación: nada que asignar.
    const falla = [reglas.error, gruposR.error, gc.error, miembros.error].find(Boolean);
    if (falla) {
      if (esTablaFaltante(falla) || /modo_acceso/.test(falla.message || '')) { setPendientes([]); return; }
      throw falla;
    }
    const porGrupo = new Set((reglas.data || []).map((r) => Number(r.course_id)));
    if (!porGrupo.size) { setPendientes([]); return; }

    const { data: pagadas, error: errIns } = await supabase.from('inscripciones')
      .select('user_id, course_id, origen, created_at')
      .eq('origen', 'pago')
      .in('course_id', [...porGrupo]);
    if (errIns) throw errIns;

    const cursosDeGrupo = {};
    (gc.data || []).forEach((x) => { (cursosDeGrupo[x.grupo_id] ||= new Set()).add(Number(x.course_id)); });
    const conGrupo = new Set();
    (miembros.data || []).forEach((m) => {
      (cursosDeGrupo[m.grupo_id] || []).forEach((c) => conGrupo.add(`${m.user_id}|${c}`));
    });
    setGrupos((gruposR.data || []).map((g) => ({ ...g, cursos: cursosDeGrupo[g.id] || new Set() })));
    setPendientes((pagadas || []).filter((i) => !conGrupo.has(`${i.user_id}|${Number(i.course_id)}`)));
  }, []);

  useEffect(() => {
    let vigente = true;
    cargar().then(() => { if (vigente) setError(''); })
      .catch((err) => { if (vigente) setError(err.message || 'No se pudo cargar.'); });
    return () => { vigente = false; };
  }, [cargar]);

  const perfil = (id) => perfiles.find((p) => p.id === id);
  const nombreCurso = (id) => cursos.find((c) => Number(c.id) === Number(id))?.title || `Curso ${id}`;
  const clave = (i) => `${i.user_id}|${i.course_id}`;

  const asignar = async (ins) => {
    const grupoId = elegido[clave(ins)];
    if (!grupoId) return;
    setOcupado(clave(ins));
    try {
      await llamarCuenta('aprobar', { userId: ins.user_id, grupoId: Number(grupoId), courseIds: [] });
      const p = perfil(ins.user_id);
      notificar(`${p?.nombre_completo || p?.email || 'El alumno'} quedó en su grupo y ya tiene ${nombreCurso(ins.course_id)}.`, 'success');
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(null);
    }
  };

  if (error) return <p className="lms-aviso lms-aviso--error" role="alert">No se pudieron cargar los cursos por asignar: {error}</p>;
  if (!pendientes.length) return null;

  return (
    <section className="cuentas-pendientes">
      <header className="cuentas-pendientes-cabecera">
        <Layers size={18} />
        <h3>Cursos por asignar <span className="cuentas-pendientes-num">{pendientes.length}</span></h3>
        <p>Pagaron un curso por generación y esperan su grupo. Al asignarlo se les abre el curso y les llega el correo con su acceso.</p>
      </header>
      <ul className="cuentas-pendientes-lista">
        {pendientes.map((ins) => {
          const p = perfil(ins.user_id);
          const opciones = grupos.filter((g) => g.cursos.has(Number(ins.course_id)));
          const k = clave(ins);
          return (
            <li key={k} className="cuenta-pendiente">
              <div className="cuenta-pendiente-fila">
                <div className="cuenta-pendiente-datos">
                  <strong>{p?.nombre_completo || p?.email || 'Alumno'}</strong>
                  <small>{p?.email}{` · pagó ${nombreCurso(ins.course_id)} el ${fecha(ins.created_at)}`}</small>
                </div>
                <div className="cuenta-pendiente-acciones">
                  {opciones.length ? (
                    <>
                      <select aria-label={`Grupo para ${p?.nombre_completo || 'el alumno'}`} value={elegido[k] || ''}
                        onChange={(e) => setElegido((x) => ({ ...x, [k]: e.target.value }))}>
                        <option value="">Elegir grupo…</option>
                        {opciones.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </select>
                      <button type="button" className="btn-crm-action solid mini" onClick={() => asignar(ins)} disabled={!elegido[k] || ocupado === k}>
                        <Check size={14} /> {ocupado === k ? 'Asignando…' : 'Asignar'}
                      </button>
                    </>
                  ) : (
                    <small>Ningún grupo tiene este curso todavía. Créalo en Grupos.</small>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
