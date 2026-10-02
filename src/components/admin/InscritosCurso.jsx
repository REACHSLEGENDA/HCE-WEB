import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, Plus, Trash2, Mail, RefreshCw, UserPlus, X, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { llamarInscripcion, extraerCorreos } from '../../lib/cursos';
import { traerTodo } from '../../lib/traerTodo';
import { descargarCsv } from '../../lib/sesiones';
import './AdminLms.css';

// Alumnos inscritos en un curso: de dónde vienen, cuánto llevan y si ya tienen
// certificado. Desde aquí se inscribe a uno, a una lista de correos, o se quita
// una inscripción. Las altas y bajas pasan por la función curso-inscripcion
// (la tabla no acepta escrituras desde el navegador).

const ORIGENES = { gratis: 'Gratis', pago: 'Pagó', admin: 'Por admin', previo: 'Previo', grupo: 'Por grupo' };
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Perfiles que no vinieron en la lista del panel (se piden por id, en tandas).
async function completarPerfiles(ids, conocidos) {
  const faltan = ids.filter((id) => !conocidos.has(id));
  const extra = new Map();
  for (let i = 0; i < faltan.length; i += 100) {
    const { data, error } = await supabase.from('profiles').select('id, nombre_completo, email').in('id', faltan.slice(i, i + 100));
    if (error) throw error;
    (data || []).forEach((p) => extra.set(p.id, p));
  }
  return extra;
}

async function cargarInscritos(courseId, perfiles) {
  const id = Number(courseId);
  const [inscripciones, lecciones, progreso, certificados] = await Promise.all([
    traerTodo('inscripciones', 'id, user_id, origen, created_at', (q) => q.eq('course_id', id)),
    traerTodo('curso_lecciones', 'id, tipo, obligatoria', (q) => q.eq('course_id', id)),
    traerTodo('leccion_progreso', 'user_id, leccion_id', (q) => q.eq('course_id', id).eq('completada', true).order('leccion_id'), { orden: 'user_id' }),
    traerTodo('certificates', 'id, user_id', (q) => q.eq('course_id', id)),
  ]);

  // Mismo criterio que el aula: cuentan las lecciones obligatorias, sin secciones.
  const obligatorias = new Set(lecciones.filter((l) => l.tipo !== 'seccion' && l.obligatoria !== false).map((l) => l.id));
  const completadas = new Map();
  progreso.forEach((p) => {
    if (obligatorias.has(p.leccion_id)) completadas.set(p.user_id, (completadas.get(p.user_id) || 0) + 1);
  });
  const conCertificado = new Set(certificados.map((c) => c.user_id));

  const conocidos = new Map((perfiles || []).map((p) => [p.id, p]));
  const extra = await completarPerfiles([...new Set(inscripciones.map((i) => i.user_id))], conocidos);

  return {
    total: obligatorias.size,
    filas: inscripciones
      .map((i) => {
        const p = conocidos.get(i.user_id) || extra.get(i.user_id) || {};
        return {
          userId: i.user_id,
          nombre: p.nombre_completo || '',
          email: p.email || '',
          origen: i.origen,
          inscritoEn: i.created_at,
          completadas: completadas.get(i.user_id) || 0,
          certificado: conCertificado.has(i.user_id),
        };
      })
      .sort((a, b) => String(b.inscritoEn || '').localeCompare(String(a.inscritoEn || ''))),
  };
}

// Constantes para que los valores por omisión no cambien en cada render (si no,
// los efectos que dependen de ellos se repetirían sin fin).
const SIN_CURSOS = [];
const SIN_PERFILES = [];

export default function InscritosCurso({ courseId, cursos = SIN_CURSOS, perfiles = SIN_PERFILES, notificar, confirmar }) {
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [buscaAlumno, setBuscaAlumno] = useState('');
  const [correos, setCorreos] = useState('');
  const [sinCuenta, setSinCuenta] = useState([]);
  const [ocupado, setOcupado] = useState(null);

  const curso = cursos.find((c) => Number(c.id) === Number(courseId));

  const cargar = useCallback(async () => {
    setErrorCarga('');
    try {
      setDatos(await cargarInscritos(courseId, perfiles));
    } catch (err) {
      setErrorCarga(err.message);
      setDatos((d) => d || { total: 0, filas: [] });
    }
  }, [courseId, perfiles]);

  useEffect(() => {
    let vigente = true;
    cargarInscritos(courseId, perfiles)
      .then((r) => { if (vigente) { setDatos(r); setErrorCarga(''); } })
      .catch((err) => { if (vigente) { setErrorCarga(err.message); setDatos({ total: 0, filas: [] }); } });
    return () => { vigente = false; };
  }, [courseId, perfiles]);

  const inscritosIds = useMemo(() => new Set((datos?.filas || []).map((f) => f.userId)), [datos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return datos?.filas || [];
    return (datos?.filas || []).filter((f) => `${f.nombre} ${f.email}`.toLowerCase().includes(q));
  }, [datos, busqueda]);

  const candidatos = useMemo(() => {
    const q = buscaAlumno.trim().toLowerCase();
    if (q.length < 2) return [];
    return perfiles
      .filter((p) => p.rol !== 'admin' && !inscritosIds.has(p.id) && `${p.nombre_completo || ''} ${p.email || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [perfiles, buscaAlumno, inscritosIds]);

  const listaCorreos = extraerCorreos(correos);

  const inscribirUno = async (p) => {
    setOcupado(`alta-${p.id}`);
    try {
      await llamarInscripcion('admin-inscribir', { userId: p.id, courseId: Number(courseId) });
      notificar(`${p.nombre_completo || p.email} quedó inscrito.`, 'success');
      setBuscaAlumno('');
      await cargar();
    } catch (err) {
      notificar(`No se pudo inscribir: ${err.message}`, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const inscribirCorreos = async (e) => {
    e.preventDefault();
    if (!listaCorreos.length) return;
    // Cuántos de esos correos ya estaban inscritos, para no contarlos como nuevos.
    const yaEstaban = new Set((datos?.filas || []).map((f) => f.email.toLowerCase()).filter(Boolean));
    const repetidos = listaCorreos.filter((c) => yaEstaban.has(c)).length;
    setOcupado('correos');
    try {
      const r = await llamarInscripcion('admin-inscribir-correos', { correos: listaCorreos, courseId: Number(courseId) });
      const nuevos = Math.max(0, (r.inscritos || 0) - repetidos);
      notificar(
        `${nuevos} ${nuevos === 1 ? 'alumno inscrito' : 'alumnos inscritos'}` +
        (repetidos ? ` · ${repetidos} ya estaba${repetidos === 1 ? '' : 'n'} inscrito${repetidos === 1 ? '' : 's'}` : '') +
        (r.sinCuenta?.length ? ` · ${r.sinCuenta.length} sin cuenta` : '') + '.',
        r.sinCuenta?.length ? 'warning' : 'success'
      );
      setSinCuenta(r.sinCuenta || []);
      // Se quedan en el cuadro solo los que no tienen cuenta, para invitarlos.
      setCorreos((r.sinCuenta || []).join('\n'));
      await cargar();
    } catch (err) {
      notificar(`No se pudo inscribir la lista: ${err.message}`, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (f) => {
    const quien = f.nombre || f.email || 'este alumno';
    const mensaje = `¿Quitar a ${quien} de este curso? Deja de ver las lecciones. Su avance y su certificado (si lo tiene) no se borran: si lo vuelves a inscribir, sigue donde se quedó.`;
    const ok = confirmar ? await confirmar(mensaje, 'Quitar inscripción') : window.confirm(mensaje);
    if (!ok) return;
    setOcupado(`baja-${f.userId}`);
    try {
      await llamarInscripcion('admin-quitar', { userId: f.userId, courseId: Number(courseId) });
      notificar(`${quien} ya no está inscrito.`, 'success');
      await cargar();
    } catch (err) {
      notificar(`No se pudo quitar la inscripción: ${err.message}`, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const exportar = () => {
    const obligatorias = datos?.total || 0;
    descargarCsv(
      `Inscritos_${curso?.title || `curso_${courseId}`}`,
      ['Nombre', 'Correo', 'Origen', 'Inscrito', 'Lecciones completadas', 'Lecciones obligatorias', 'Avance %', 'Certificado'],
      visibles.map((f) => [
        f.nombre,
        f.email,
        ORIGENES[f.origen] || f.origen || '',
        f.inscritoEn ? new Date(f.inscritoEn).toLocaleDateString('es-MX') : '',
        f.completadas,
        obligatorias,
        obligatorias ? Math.round((f.completadas / obligatorias) * 100) : '',
        f.certificado ? 'Sí' : 'No',
      ])
    );
  };

  if (!datos) return <p className="lms-cargando">Cargando inscritos…</p>;

  const total = datos.total;
  const certificados = datos.filas.filter((f) => f.certificado).length;

  return (
    <div className="inscritos">
      {errorCarga && (
        <div className="lms-aviso lms-aviso--error">
          No se pudo cargar la lista de inscritos: {errorCarga}
          <button type="button" className="btn-crm-action outlined mini" onClick={cargar}><RefreshCw size={13} /> Reintentar</button>
        </div>
      )}

      <div className="inscritos-barra">
        <span className="inscritos-contador">
          <strong>{datos.filas.length}</strong> {datos.filas.length === 1 ? 'inscrito' : 'inscritos'}
          {certificados > 0 && <> · {certificados} con certificado</>}
          {busqueda.trim() && <> · {visibles.length} {visibles.length === 1 ? 'coincide' : 'coinciden'}</>}
        </span>
        <label className="biblioteca-buscar">
          <Search size={14} />
          <input type="search" aria-label="Buscar inscritos por nombre o correo" placeholder="Buscar por nombre o correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <div className="inscritos-botones">
          <button type="button" className="btn-crm-action outlined" onClick={cargar} title="Actualizar"><RefreshCw size={14} /></button>
          <button type="button" className="btn-crm-action outlined" onClick={exportar} disabled={!visibles.length}><Download size={14} /> CSV</button>
          <button type="button" className="btn-crm-action solid" onClick={() => setAgregando((v) => !v)}>
            {agregando ? <X size={14} /> : <UserPlus size={14} />} {agregando ? 'Cerrar' : 'Inscribir'}
          </button>
        </div>
      </div>

      {agregando && (
        <div className="inscritos-alta">
          <div className="crm-input-group">
            <label>Inscribir a un alumno</label>
            <input type="text" value={buscaAlumno} onChange={(e) => setBuscaAlumno(e.target.value)} placeholder="Escribe su nombre o correo" />
          </div>
          {buscaAlumno.trim().length >= 2 && candidatos.length === 0 && (
            <small className="lms-ayuda">Nadie sin inscribir coincide con "{buscaAlumno.trim()}".</small>
          )}
          {candidatos.length > 0 && (
            <ul className="lms-lista-simple lms-candidatos">
              {candidatos.map((p) => (
                <li key={p.id}>
                  <span><strong>{p.nombre_completo || 'Sin nombre'}</strong> <small>{p.email}</small></span>
                  <button type="button" className="btn-crm-action outlined mini" disabled={!!ocupado} onClick={() => inscribirUno(p)}>
                    <Plus size={13} /> {ocupado === `alta-${p.id}` ? 'Inscribiendo…' : 'Inscribir'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={inscribirCorreos} className="crm-input-group inscritos-correos">
            <label><Mail size={13} /> O pega una lista de correos</label>
            <textarea rows="3" className="lms-textarea" value={correos} onChange={(e) => { setCorreos(e.target.value); setSinCuenta([]); }} placeholder={'ana@hospital.mx\nluis@hospital.mx\n…'} />
            <button type="submit" className="btn-crm-action solid" disabled={!listaCorreos.length || !!ocupado}>
              {ocupado === 'correos' ? 'Inscribiendo…' : `Inscribir ${listaCorreos.length || ''} ${listaCorreos.length === 1 ? 'correo' : 'correos'}`}
            </button>
          </form>
          {sinCuenta.length > 0 && (
            <div className="lms-aviso">
              <strong>Sin cuenta en el portal ({sinCuenta.length}):</strong> {sinCuenta.join(', ')}. Invítalos a registrarse y vuelve a inscribirlos.
            </div>
          )}
        </div>
      )}

      {datos.filas.length === 0 ? (
        <p className="lms-vacio">Nadie está inscrito en este curso todavía.</p>
      ) : visibles.length === 0 ? (
        <p className="lms-vacio">Nadie coincide con la búsqueda.</p>
      ) : (
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla inscritos-tabla">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Origen</th>
                <th>Inscrito</th>
                <th className="num">Avance</th>
                <th>Certificado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const pct = total ? Math.round((f.completadas / total) * 100) : null;
                return (
                  <tr key={f.userId}>
                    <td className="inscritos-alumno">
                      <strong>{f.nombre || 'Sin nombre'}</strong>
                      <small>{f.email || f.userId}</small>
                    </td>
                    <td>{ORIGENES[f.origen] || f.origen || '—'}</td>
                    <td className="inscritos-fecha">{fecha(f.inscritoEn)}</td>
                    <td className="num" title={total ? `${f.completadas} de ${total} lecciones obligatorias` : 'El curso no tiene lecciones obligatorias'}>
                      {total ? `${f.completadas}/${total} · ${pct}%` : '—'}
                    </td>
                    <td>{f.certificado ? <span className="lms-detectado"><Award size={13} /> Sí</span> : 'No'}</td>
                    <td>
                      <button type="button" className="icon-action-btn delete" title="Quitar inscripción" disabled={!!ocupado} onClick={() => quitar(f)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
