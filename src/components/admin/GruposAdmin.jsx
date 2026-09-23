import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Users, BookOpen, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, llamarInscripcion, extraerCorreos } from '../../lib/cursos';
import './AdminLms.css';

// Grupos (un hospital, una generación, un equipo) e inscripción masiva.
//
// Asignar un curso a un grupo inscribe a todos sus miembros, y quien entra
// después al grupo queda inscrito en los cursos del grupo. Quitar un curso del
// grupo NO da de baja a nadie: solo deja de inscribir a los nuevos. Las bajas
// se hacen alumno por alumno, a propósito, para no quitarle el acceso por
// error a quien ya pagó o ya avanzó.

async function consultarGrupos() {
  const [g, m, c] = await Promise.all([
    supabase.from('grupos').select('id, nombre, descripcion, creado_en').order('nombre'),
    supabase.from('grupo_miembros').select('grupo_id, user_id'),
    supabase.from('grupo_cursos').select('grupo_id, course_id'),
  ]);
  return { g, m, c };
}

export default function GruposAdmin({ cursos, perfiles, notificar, confirmar }) {
  const [grupos, setGrupos] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  // La consulta y la actualización del estado van separadas: el efecto solo
  // aplica el resultado cuando llega.
  const aplicar = useCallback(({ g, m, c }) => {
    const error = g.error || m.error || c.error;
    if (error) {
      if (esTablaFaltante(error)) setFaltaMigracion(true);
      else notificar(`No se pudieron cargar los grupos: ${error.message}`, 'error');
      setGrupos([]);
      return;
    }
    setGrupos((g.data || []).map((grupo) => ({
      ...grupo,
      miembros: (m.data || []).filter((x) => x.grupo_id === grupo.id).map((x) => x.user_id),
      cursos: (c.data || []).filter((x) => x.grupo_id === grupo.id).map((x) => Number(x.course_id)),
    })));
  }, [notificar]);

  const cargar = useCallback(async () => aplicar(await consultarGrupos()), [aplicar]);

  useEffect(() => {
    let vigente = true;
    consultarGrupos().then((r) => { if (vigente) aplicar(r); });
    return () => { vigente = false; };
  }, [aplicar]);

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    const { data, error } = await supabase.from('grupos').insert([{ nombre: nuevoNombre.trim() }]).select('id').single();
    if (error) {
      notificar(`No se pudo crear el grupo: ${error.message}`, 'error');
      return;
    }
    setNuevoNombre('');
    await cargar();
    setAbierto(data.id);
  };

  if (faltaMigracion) {
    return <div className="lms-aviso">Los grupos se activan al correr en Supabase la migración <code>lms-estructura.sql</code>.</div>;
  }
  if (grupos === null) return <p className="lms-cargando">Cargando grupos…</p>;

  const grupo = grupos.find((g) => g.id === abierto);
  if (grupo) {
    return (
      <DetalleGrupo
        grupo={grupo}
        cursos={cursos}
        perfiles={perfiles}
        notificar={notificar}
        confirmar={confirmar}
        onVolver={() => setAbierto(null)}
        onCambio={cargar}
      />
    );
  }

  return (
    <div className="lms-grupos">
      <section className="settings-card">
        <h3>Grupos</h3>
        <p className="lms-ayuda">Un grupo reúne alumnos para inscribirlos juntos: un hospital, una generación, un equipo de trabajo.</p>

        <form className="lms-inline" onSubmit={crear}>
          <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del grupo, ej. INER — Residentes 2026" />
          <button type="submit" className="btn-crm-action solid" disabled={!nuevoNombre.trim()}><Plus size={14} /> Crear grupo</button>
        </form>

        {grupos.length === 0 ? (
          <p className="lms-vacio">Todavía no hay grupos.</p>
        ) : (
          <div className="table-responsive-container">
            <table className="admin-table">
              <thead>
                <tr><th>Grupo</th><th>Miembros</th><th>Cursos</th><th></th></tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.nombre}</strong></td>
                    <td>{g.miembros.length}</td>
                    <td>{g.cursos.map((id) => cursos.find((c) => Number(c.id) === id)?.title).filter(Boolean).join(', ') || '—'}</td>
                    <td><button type="button" className="btn-crm-action outlined" onClick={() => setAbierto(g.id)}>Abrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InscripcionMasiva cursos={cursos} notificar={notificar} />
    </div>
  );
}

function DetalleGrupo({ grupo, cursos, perfiles, notificar, confirmar, onVolver, onCambio }) {
  const [busqueda, setBusqueda] = useState('');
  const [correos, setCorreos] = useState('');
  const [cursoNuevo, setCursoNuevo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const estudiantes = useMemo(() => (perfiles || []).filter((p) => p.rol !== 'admin'), [perfiles]);
  const miembros = estudiantes.filter((p) => grupo.miembros.includes(p.id));
  const candidatos = busqueda.trim().length < 2 ? [] : estudiantes
    .filter((p) => !grupo.miembros.includes(p.id))
    .filter((p) => `${p.nombre_completo || ''} ${p.email || ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .slice(0, 8);

  // Tras cualquier cambio se sincroniza: miembros × cursos del grupo.
  const sincronizar = async () => {
    const { nuevas } = await llamarInscripcion('admin-grupo-sincronizar', { grupoId: grupo.id });
    return nuevas;
  };

  const agregarMiembros = async (ids) => {
    if (!ids.length) return;
    setOcupado(true);
    try {
      const { error } = await supabase.from('grupo_miembros').upsert(
        ids.map((user_id) => ({ grupo_id: grupo.id, user_id })),
        { onConflict: 'grupo_id,user_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      const nuevas = await sincronizar();
      notificar(`${ids.length === 1 ? 'Miembro agregado' : `${ids.length} miembros agregados`}${nuevas ? ` · ${nuevas} inscripciones nuevas` : ''}.`, 'success');
      setBusqueda('');
      await onCambio();
    } catch (err) {
      notificar(`No se pudo agregar: ${err.message}`, 'error');
    } finally {
      setOcupado(false);
    }
  };

  const agregarPorCorreo = async (e) => {
    e.preventDefault();
    const lista = extraerCorreos(correos);
    if (!lista.length) {
      notificar('No encontré correos válidos en el texto.', 'error');
      return;
    }
    const porCorreo = new Map(estudiantes.map((p) => [String(p.email || '').toLowerCase(), p.id]));
    const encontrados = lista.filter((c) => porCorreo.has(c));
    const sinCuenta = lista.filter((c) => !porCorreo.has(c));
    await agregarMiembros(encontrados.map((c) => porCorreo.get(c)));
    if (sinCuenta.length) {
      notificar(`Sin cuenta en el portal (${sinCuenta.length}): ${sinCuenta.slice(0, 5).join(', ')}${sinCuenta.length > 5 ? '…' : ''}. Invítalos a registrarse y vuelve a agregarlos.`, 'warning');
    }
    setCorreos('');
  };

  const quitarMiembro = async (userId) => {
    const ok = await confirmar('¿Quitar a esta persona del grupo? Conserva los cursos en que ya está inscrita.', 'Quitar del grupo');
    if (!ok) return;
    await supabase.from('grupo_miembros').delete().eq('grupo_id', grupo.id).eq('user_id', userId);
    await onCambio();
  };

  const asignarCurso = async (e) => {
    e.preventDefault();
    if (!cursoNuevo) return;
    setOcupado(true);
    try {
      const { error } = await supabase.from('grupo_cursos').upsert(
        [{ grupo_id: grupo.id, course_id: Number(cursoNuevo) }],
        { onConflict: 'grupo_id,course_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      const nuevas = await sincronizar();
      notificar(`Curso asignado. ${nuevas} ${nuevas === 1 ? 'alumno quedó inscrito' : 'alumnos quedaron inscritos'}.`, 'success');
      setCursoNuevo('');
      await onCambio();
    } catch (err) {
      notificar(`No se pudo asignar el curso: ${err.message}`, 'error');
    } finally {
      setOcupado(false);
    }
  };

  const quitarCurso = async (courseId) => {
    const ok = await confirmar('¿Quitar el curso del grupo? Nadie pierde el acceso: solo deja de inscribirse a quien entre al grupo después.', 'Quitar curso');
    if (!ok) return;
    await supabase.from('grupo_cursos').delete().eq('grupo_id', grupo.id).eq('course_id', courseId);
    await onCambio();
  };

  const eliminarGrupo = async () => {
    const ok = await confirmar(`¿Eliminar el grupo "${grupo.nombre}"? Nadie pierde sus cursos.`, 'Eliminar grupo');
    if (!ok) return;
    await supabase.from('grupos').delete().eq('id', grupo.id);
    await onCambio();
    onVolver();
  };

  return (
    <div className="lms-grupos">
      <div className="lms-detalle-cabecera">
        <button type="button" className="btn-crm-action outlined" onClick={onVolver}><ArrowLeft size={14} /> Grupos</button>
        <h2>{grupo.nombre}</h2>
        <button type="button" className="btn-crm-action outlined lms-peligro" onClick={eliminarGrupo}><Trash2 size={14} /> Eliminar grupo</button>
      </div>

      <div className="lms-rejilla-dos">
        <section className="settings-card">
          <h3><BookOpen size={16} /> Cursos del grupo</h3>
          {grupo.cursos.length === 0 ? (
            <p className="lms-vacio">Asigna un curso para inscribir a todos los miembros.</p>
          ) : (
            <ul className="lms-lista-simple">
              {grupo.cursos.map((id) => (
                <li key={id}>
                  <span>{cursos.find((c) => Number(c.id) === id)?.title || `Curso #${id}`}</span>
                  <button type="button" className="icon-action-btn delete" title="Quitar del grupo" onClick={() => quitarCurso(id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <form className="lms-inline" onSubmit={asignarCurso}>
            <select value={cursoNuevo} onChange={(e) => setCursoNuevo(e.target.value)}>
              <option value="">Elegir curso…</option>
              {cursos.filter((c) => !grupo.cursos.includes(Number(c.id))).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button type="submit" className="btn-crm-action solid" disabled={!cursoNuevo || ocupado}><Plus size={14} /> Asignar</button>
          </form>
        </section>

        <section className="settings-card">
          <h3><Users size={16} /> Miembros ({miembros.length})</h3>

          <div className="crm-input-group">
            <label>Buscar alumno</label>
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o correo" />
          </div>
          {candidatos.length > 0 && (
            <ul className="lms-lista-simple lms-candidatos">
              {candidatos.map((p) => (
                <li key={p.id}>
                  <span><strong>{p.nombre_completo || 'Sin nombre'}</strong> <small>{p.email}</small></span>
                  <button type="button" className="btn-crm-action outlined" disabled={ocupado} onClick={() => agregarMiembros([p.id])}><Plus size={13} /> Agregar</button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={agregarPorCorreo} className="crm-input-group">
            <label><Mail size={13} /> O pega una lista de correos</label>
            <textarea rows="3" className="lms-textarea" value={correos} onChange={(e) => setCorreos(e.target.value)} placeholder="Una columna de Excel, o correos separados por comas" />
            <button type="submit" className="btn-crm-action outlined" disabled={!correos.trim() || ocupado}>Agregar correos</button>
          </form>

          {miembros.length > 0 && (
            <ul className="lms-lista-simple">
              {miembros.map((p) => (
                <li key={p.id}>
                  <span><strong>{p.nombre_completo || 'Sin nombre'}</strong> <small>{p.email}</small></span>
                  <button type="button" className="icon-action-btn delete" title="Quitar del grupo" onClick={() => quitarMiembro(p.id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// Inscribir de golpe una lista de correos en un curso, sin crear un grupo.
function InscripcionMasiva({ cursos, notificar }) {
  const [texto, setTexto] = useState('');
  const [curso, setCurso] = useState('');
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const correos = extraerCorreos(texto);

  const inscribir = async (e) => {
    e.preventDefault();
    if (!correos.length || !curso) return;
    setOcupado(true);
    try {
      const r = await llamarInscripcion('admin-inscribir-correos', { correos, courseId: Number(curso) });
      setResultado(r);
      notificar(`${r.inscritos} ${r.inscritos === 1 ? 'alumno inscrito' : 'alumnos inscritos'}.`, 'success');
      if (!r.sinCuenta?.length) setTexto('');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="settings-card">
      <h3>Inscripción masiva</h3>
      <p className="lms-ayuda">Pega los correos y elige el curso. Quien ya tenga cuenta queda inscrito al momento; a quien no, te lo listamos para invitarlo.</p>
      <form onSubmit={inscribir} className="lms-masiva">
        <textarea rows="5" className="lms-textarea" value={texto} onChange={(e) => { setTexto(e.target.value); setResultado(null); }}
          placeholder={'ana@hospital.mx\nluis@hospital.mx\n…'} />
        <div className="lms-inline">
          <select value={curso} onChange={(e) => setCurso(e.target.value)}>
            <option value="">Elegir curso…</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="submit" className="btn-crm-action solid" disabled={!correos.length || !curso || ocupado}>
            {ocupado ? 'Inscribiendo…' : `Inscribir ${correos.length || ''} ${correos.length === 1 ? 'correo' : 'correos'}`}
          </button>
        </div>
      </form>
      {resultado?.sinCuenta?.length > 0 && (
        <div className="lms-aviso">
          <strong>Sin cuenta en el portal ({resultado.sinCuenta.length}):</strong> {resultado.sinCuenta.join(', ')}
        </div>
      )}
    </section>
  );
}
