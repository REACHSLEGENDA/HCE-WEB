import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Search, UserMinus, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, extraerCorreos } from '../../lib/cursos';
import { traerTodo } from '../../lib/traerTodo';
import './AdminLms.css';

// Divisiones: otras asociaciones dentro del mismo portal, cada una con sus
// alumnos, sus cursos y sus grupos.

export default function DivisionesAdmin({ perfiles, cursos, onPerfilesCambiados, notificar, confirmar }) {
  const [divisiones, setDivisiones] = useState(null);
  const [cursosDe, setCursosDe] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [falta, setFalta] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [pestana, setPestana] = useState('miembros');
  const [nueva, setNueva] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [correos, setCorreos] = useState('');
  const [resumen, setResumen] = useState(null);

  const cargar = useCallback(async () => {
    const [d, dc, g] = await Promise.all([
      supabase.from('divisiones').select('*').order('nombre'),
      supabase.from('division_cursos').select('division_id, course_id'),
      supabase.from('grupos').select('id, nombre, division_id').order('nombre'),
    ]);
    if (d.error) { if (esTablaFaltante(d.error)) setFalta(true); setDivisiones([]); return; }
    setDivisiones(d.data || []);
    setCursosDe(dc.data || []);
    setGrupos(g.data || []);
  }, []);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      supabase.from('divisiones').select('*').order('nombre'),
      supabase.from('division_cursos').select('division_id, course_id'),
      supabase.from('grupos').select('id, nombre, division_id').order('nombre'),
    ]).then(([d, dc, g]) => {
      if (!vigente) return;
      if (d.error) { if (esTablaFaltante(d.error)) setFalta(true); setDivisiones([]); return; }
      setDivisiones(d.data || []);
      setCursosDe(dc.data || []);
      setGrupos(g.data || []);
    });
    return () => { vigente = false; };
  }, []);

  const miembros = useMemo(() => (abierta ? perfiles.filter((p) => Number(p.division_id) === abierta.id) : []), [perfiles, abierta]);

  // Resumen de la división: inscripciones y certificados de sus miembros.
  useEffect(() => {
    if (!abierta || pestana !== 'resumen') return undefined;
    let vigente = true;
    const ids = new Set(miembros.map((m) => m.id));
    Promise.all([
      traerTodo('inscripciones', 'user_id, course_id'),
      traerTodo('certificates', 'user_id, course_id'),
    ]).then(([ins, cer]) => {
      if (!vigente) return;
      const propias = ins.filter((i) => ids.has(i.user_id));
      const certs = cer.filter((c) => ids.has(c.user_id));
      setResumen({ inscripciones: propias.length, certificados: certs.length, tasa: propias.length ? (certs.length / propias.length) * 100 : 0 });
    }).catch(() => { if (vigente) setResumen(null); });
    return () => { vigente = false; };
  }, [abierta, pestana, miembros]);

  const crear = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;
    const { error } = await supabase.from('divisiones').insert([{ nombre: nueva.trim() }]);
    if (error) { notificar(error.code === '23505' ? 'Ya hay una división con ese nombre.' : error.message, 'error'); return; }
    setNueva('');
    await cargar();
  };

  const eliminar = async (d) => {
    if (!(await confirmar(`¿Eliminar la división "${d.nombre}"? Sus alumnos, cursos y grupos no se borran: solo dejan de estar en la división.`, 'Eliminar división'))) return;
    const { error } = await supabase.from('divisiones').delete().eq('id', d.id);
    if (error) { notificar(error.message, 'error'); return; }
    setAbierta(null);
    await cargar();
    onPerfilesCambiados?.();
  };

  const asignarMiembros = async (ids, divisionId) => {
    if (!ids.length) return;
    const { error } = await supabase.from('profiles').update({ division_id: divisionId }).in('id', ids);
    if (error) { notificar(error.message, 'error'); return false; }
    await onPerfilesCambiados?.();
    return true;
  };

  const agregarPorCorreos = async () => {
    const lista = extraerCorreos(correos);
    const porCorreo = new Map(perfiles.map((p) => [String(p.email || '').toLowerCase(), p.id]));
    const ids = lista.map((c) => porCorreo.get(c)).filter(Boolean);
    const sinCuenta = lista.filter((c) => !porCorreo.has(c));
    if (await asignarMiembros(ids, abierta.id)) {
      notificar(`${ids.length} agregados a la división.${sinCuenta.length ? ` Sin cuenta: ${sinCuenta.join(', ')}` : ''}`, sinCuenta.length ? 'warning' : 'success');
      setCorreos('');
    }
  };

  const alternarCurso = async (courseId) => {
    const tiene = cursosDe.some((x) => x.division_id === abierta.id && Number(x.course_id) === courseId);
    const { error } = tiene
      ? await supabase.from('division_cursos').delete().eq('division_id', abierta.id).eq('course_id', courseId)
      : await supabase.from('division_cursos').insert([{ division_id: abierta.id, course_id: courseId }]);
    if (error) { notificar(error.message, 'error'); return; }
    await cargar();
  };

  const alternarGrupo = async (g) => {
    const { error } = await supabase.from('grupos').update({ division_id: g.division_id === abierta.id ? null : abierta.id }).eq('id', g.id);
    if (error) { notificar(error.message, 'error'); return; }
    await cargar();
  };

  if (falta) return <div className="lms-aviso">Las divisiones se activan al correr en Supabase la migración <code>divisiones.sql</code>.</div>;
  if (!divisiones) return <p className="lms-cargando">Cargando…</p>;

  // ---- Una división abierta ---------------------------------------------------
  if (abierta) {
    const q = busqueda.trim().toLowerCase();
    const candidatos = q.length >= 2
      ? perfiles.filter((p) => p.rol !== 'admin' && Number(p.division_id) !== abierta.id && `${p.nombre_completo || ''} ${p.email || ''}`.toLowerCase().includes(q)).slice(0, 8)
      : [];
    return (
      <div className="eval-editor">
        <div className="eval-editor-cabecera">
          <button type="button" className="btn-crm-action outlined" onClick={() => { setAbierta(null); setResumen(null); }}><ArrowLeft size={14} /> Divisiones</button>
          <div><span className="eval-etiqueta">División</span><h4>{abierta.nombre}</h4></div>
          <button type="button" className="icon-action-btn delete" style={{ marginLeft: 'auto' }} title="Eliminar división" onClick={() => eliminar(abierta)}><Trash2 size={15} /></button>
        </div>

        <nav className="reporte-pestanas notif-pestanas" role="tablist">
          {[['miembros', `Alumnos (${miembros.length})`], ['cursos', 'Cursos'], ['grupos', 'Grupos'], ['resumen', 'Resumen']].map(([id, n]) => (
            <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{n}</button>
          ))}
        </nav>

        {pestana === 'miembros' && (
          <>
            <div className="reglas-grupo">
              <label className="biblioteca-buscar"><Search size={14} /><input type="search" placeholder="Buscar alumno para agregar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
              {candidatos.length > 0 && (
                <ul className="lms-copiar-lista">
                  {candidatos.map((p) => (
                    <li key={p.id}>
                      <span>{p.nombre_completo || p.email} <small>{p.email}{p.division_id ? ' · en otra división' : ''}</small></span>
                      <button type="button" className="btn-crm-action outlined mini" onClick={async () => { if (await asignarMiembros([p.id], abierta.id)) setBusqueda(''); }}><Plus size={13} /> Agregar</button>
                    </li>
                  ))}
                </ul>
              )}
              <textarea rows="3" className="lms-textarea" placeholder="O pega una lista de correos (de Excel, separados por coma o renglón)" value={correos} onChange={(e) => setCorreos(e.target.value)} />
              <button type="button" className="btn-crm-action solid mini" style={{ alignSelf: 'flex-start' }} disabled={!correos.trim()} onClick={agregarPorCorreos}>Agregar correos</button>
            </div>
            {miembros.length === 0 ? <p className="lms-vacio">Esta división todavía no tiene alumnos.</p> : (
              <div className="biblioteca-tabla-scroll">
                <table className="biblioteca-tabla">
                  <thead><tr><th>Alumno</th><th>Correo</th><th aria-label="Acciones" /></tr></thead>
                  <tbody>
                    {miembros.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.nombre_completo || '—'}</strong></td>
                        <td>{m.email}</td>
                        <td><button type="button" className="icon-action-btn delete" title="Quitar de la división" onClick={() => asignarMiembros([m.id], null)}><UserMinus size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {pestana === 'cursos' && (
          <div className="reglas-grupo">
            <small className="lms-ayuda" style={{ marginLeft: 0 }}>Los cursos que ofrece esta asociación. Un curso puede estar en varias divisiones.</small>
            <div className="reglas-lista" style={{ maxHeight: 420 }}>
              {cursos.filter((c) => !isNaN(Number(c.id))).map((c) => (
                <label key={c.id} className="lms-check">
                  <input type="checkbox" checked={cursosDe.some((x) => x.division_id === abierta.id && Number(x.course_id) === Number(c.id))} onChange={() => alternarCurso(Number(c.id))} />
                  {c.title}
                </label>
              ))}
            </div>
          </div>
        )}

        {pestana === 'grupos' && (
          <div className="reglas-grupo">
            {grupos.length === 0 ? <p className="lms-vacio">No hay grupos. Créalos en la pestaña Grupos.</p> : grupos.map((g) => (
              <label key={g.id} className="lms-check">
                <input type="checkbox" checked={g.division_id === abierta.id} onChange={() => alternarGrupo(g)} />
                {g.nombre}{g.division_id && g.division_id !== abierta.id ? <small className="lms-ayuda" style={{ margin: '0 0 0 6px' }}>(en otra división)</small> : null}
              </label>
            ))}
          </div>
        )}

        {pestana === 'resumen' && (
          <dl className="m-analisis-resumen">
            <div><dt>Alumnos</dt><dd>{miembros.length}</dd></div>
            <div><dt>Cursos</dt><dd>{cursosDe.filter((x) => x.division_id === abierta.id).length}</dd></div>
            <div><dt>Grupos</dt><dd>{grupos.filter((g) => g.division_id === abierta.id).length}</dd></div>
            <div><dt>Inscripciones</dt><dd>{resumen ? resumen.inscripciones : '…'}</dd></div>
            <div><dt>Certificados</dt><dd>{resumen ? resumen.certificados : '…'}</dd></div>
            <div><dt>Tasa de finalización</dt><dd>{resumen ? `${Math.round(resumen.tasa)}%` : '…'}</dd></div>
          </dl>
        )}
        {pestana === 'resumen' && <small className="lms-ayuda" style={{ marginLeft: 0 }}>Para las métricas detalladas de la división, en Informes elige la división en el filtro.</small>}
      </div>
    );
  }

  // ---- Lista de divisiones --------------------------------------------------------
  return (
    <div className="eval-editor">
      <form className="lms-agregar" onSubmit={crear}>
        <input type="text" className="lms-input-nueva" placeholder="Nombre de la nueva división (p. ej. SMNyCT)" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className="btn-crm-action solid" disabled={!nueva.trim()}><Plus size={14} /> Crear división</button>
      </form>
      {divisiones.length === 0 ? <p className="lms-vacio">Todavía no hay divisiones.</p> : (
        <ul className="lms-copiar-lista">
          {divisiones.map((d) => (
            <li key={d.id}>
              <Building2 size={16} className="lms-icono" />
              <span><strong>{d.nombre}</strong> <small>
                {perfiles.filter((p) => Number(p.division_id) === d.id).length} alumnos · {cursosDe.filter((x) => x.division_id === d.id).length} cursos · {grupos.filter((g) => g.division_id === d.id).length} grupos
              </small></span>
              <button type="button" className="btn-crm-action outlined mini" onClick={() => { setAbierta(d); setPestana('miembros'); }}>Abrir</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
