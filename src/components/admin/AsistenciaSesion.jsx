import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, Download, Search, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { traerTodo } from '../../lib/traerTodo';
import { llamarSesion, fechaSesion, descargarCsv } from '../../lib/sesiones';
import './AdminLms.css';

// Asistencia a una sesión en vivo: todos los inscritos del curso (se hayan
// registrado o no) y quienes se registraron, con su asistencia según el
// reporte de Zoom. El administrador puede marcarla o quitarla a mano.

const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '');

// Nombre y correo de cada alumno (se piden por id, en tandas).
async function cargarPerfiles(ids) {
  const mapa = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('profiles').select('id, nombre_completo, email').in('id', ids.slice(i, i + 100));
    if (error) throw error;
    (data || []).forEach((p) => mapa.set(p.id, p));
  }
  return mapa;
}

async function cargarAsistencia(leccionId, courseId) {
  const [{ registros }, inscripciones] = await Promise.all([
    llamarSesion('registros', { leccionId }),
    courseId ? traerTodo('inscripciones', 'user_id, created_at', (q) => q.eq('course_id', Number(courseId))) : Promise.resolve([]),
  ]);
  const porUsuario = new Map((registros || []).map((r) => [r.user_id, r]));
  const inscritos = new Set(inscripciones.map((i) => i.user_id));
  const ids = [...new Set([...inscritos, ...porUsuario.keys()])];
  const perfiles = await cargarPerfiles(ids);

  const filas = ids.map((id) => {
    const r = porUsuario.get(id);
    const p = perfiles.get(id) || {};
    return {
      userId: id,
      nombre: p.nombre_completo || '',
      email: p.email || r?.email || '',
      inscrito: inscritos.has(id),
      registrado: !!r,
      registradoEn: r?.creado_en || null,
      asistio: !!r?.asistio,
      minutos: r?.minutos || 0,
      verificado: !!r?.verificado_en,
    };
  });
  // Primero quienes asistieron, luego los registrados y al final el resto.
  const peso = (f) => (f.asistio ? 0 : f.registrado ? 1 : 2);
  filas.sort((a, b) => peso(a) - peso(b) || (a.nombre || a.email).localeCompare(b.nombre || b.email, 'es'));
  return filas;
}

const estadoDe = (f) => {
  if (f.asistio) return 'Asistió';
  if (!f.registrado) return 'No se registró';
  return f.verificado ? 'No asistió' : 'Pendiente';
};

export default function AsistenciaSesion({ leccion, courseId, notificar, confirmar, onCerrar }) {
  const [filas, setFilas] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [marcando, setMarcando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setFilas(await cargarAsistencia(leccion.id, courseId));
    } catch (err) {
      notificar(`No se pudo cargar la asistencia: ${err.message}`, 'error');
      setFilas((f) => f || []);
    }
  }, [leccion.id, courseId, notificar]);

  useEffect(() => {
    let vigente = true;
    cargarAsistencia(leccion.id, courseId)
      .then((lista) => { if (vigente) setFilas(lista); })
      .catch((err) => { if (vigente) { notificar(`No se pudo cargar la asistencia: ${err.message}`, 'error'); setFilas([]); } });
    return () => { vigente = false; };
  }, [leccion.id, courseId, notificar]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await llamarSesion('sincronizar', { leccionId: leccion.id });
      if (r.corrio) notificar(`Reporte de Zoom revisado: ${r.asistieron} ${r.asistieron === 1 ? 'asistencia confirmada' : 'asistencias confirmadas'}.`, 'success');
      else if (r.motivo === 'no-ha-terminado') notificar('La sesión todavía no termina.', 'info');
      else if (r.motivo === 'reporte-pendiente') notificar('Zoom todavía no publica el reporte. Intenta en un rato.', 'info');
      else if (r.motivo === 'revision-manual') notificar('Pasaron más de 48 h desde la sesión: marca la asistencia a mano en la lista.', 'info');
      else if (r.motivo === 'sin-horario') notificar('La sesión no tiene fecha y hora: agrégalas en la lección.', 'info');
      else notificar('Esta sesión no tiene reunión de Zoom conectada.', 'info');
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setSincronizando(false);
    }
  };

  const marcar = async (f, asistio) => {
    const quien = f.nombre || f.email || 'este alumno';
    if (!asistio) {
      const mensaje = `¿Quitar la asistencia de ${quien}? La lección de la sesión también deja de contar como completada.`;
      const ok = confirmar ? await confirmar(mensaje, 'Quitar asistencia') : window.confirm(mensaje);
      if (!ok) return;
    }
    setMarcando(f.userId);
    try {
      await llamarSesion('admin-asistencia', { leccionId: leccion.id, userId: f.userId, asistio });
      notificar(asistio ? `Asistencia de ${quien} marcada.` : `Asistencia de ${quien} quitada.`, 'success');
      await cargar();
    } catch (err) {
      notificar(`No se pudo cambiar la asistencia: ${err.message}`, 'error');
    } finally {
      setMarcando(null);
    }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (filas || []).filter((f) => {
      if (filtro === 'registrados' && !f.registrado) return false;
      if (filtro === 'asistieron' && !f.asistio) return false;
      if (filtro === 'faltaron' && f.asistio) return false;
      return !q || `${f.nombre} ${f.email}`.toLowerCase().includes(q);
    });
  }, [filas, busqueda, filtro]);

  const exportar = () => {
    descargarCsv(
      `Asistencia_${leccion.titulo || 'sesion'}`,
      ['Nombre', 'Correo', 'Inscrito', 'Registrado', 'Fecha de registro', 'Minutos', 'Asistencia'],
      visibles.map((f) => [
        f.nombre,
        f.email,
        f.inscrito ? 'Sí' : 'No',
        f.registrado ? 'Sí' : 'No',
        f.registradoEn ? new Date(f.registradoEn).toLocaleString('es-MX') : '',
        f.minutos || 0,
        estadoDe(f),
      ])
    );
  };

  const registrados = (filas || []).filter((f) => f.registrado).length;
  const asistieron = (filas || []).filter((f) => f.asistio).length;
  const inscritos = (filas || []).filter((f) => f.inscrito).length;

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
        <span>{filas ? `${inscritos} inscritos · ${registrados} registrados · ${asistieron} asistieron` : 'Cargando…'}</span>
        <button type="button" className="btn-crm-action outlined" onClick={sincronizar} disabled={sincronizando}>
          <RefreshCw size={14} /> {sincronizando ? 'Revisando Zoom…' : 'Revisar asistencia en Zoom'}
        </button>
        <button type="button" className="btn-crm-action outlined" onClick={exportar} disabled={!visibles.length}>
          <Download size={14} /> CSV
        </button>
      </div>

      {filas && filas.length > 0 && (
        <div className="biblioteca-filtros">
          <label className="biblioteca-buscar">
            <Search size={14} />
            <input type="search" aria-label="Buscar asistencia por nombre o correo" placeholder="Buscar por nombre o correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar">
            <option value="todos">Todos</option>
            <option value="registrados">Solo registrados</option>
            <option value="asistieron">Asistieron</option>
            <option value="faltaron">No asistieron</option>
          </select>
        </div>
      )}

      {filas && filas.length === 0 && <p className="lms-vacio">Nadie está inscrito en el curso ni registrado a la sesión todavía.</p>}
      {filas && filas.length > 0 && visibles.length === 0 && <p className="lms-vacio">Nadie coincide con el filtro.</p>}
      {visibles.length > 0 && (
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla">
            <thead><tr><th>Alumno</th><th>Registro</th><th className="num">Minutos</th><th>Asistencia</th><th aria-label="Acciones" /></tr></thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.userId}>
                  <td className="inscritos-alumno">
                    <strong>{f.nombre || 'Sin nombre'}</strong>
                    <small>{f.email || f.userId}{f.inscrito ? '' : ' · no inscrito'}</small>
                  </td>
                  <td>{f.registrado ? fechaCorta(f.registradoEn) : '—'}</td>
                  <td className="num">{f.minutos || '—'}</td>
                  <td>{f.asistio ? <span className="lms-detectado"><CheckCircle size={13} /> Asistió</span> : estadoDe(f)}</td>
                  <td>
                    {f.asistio ? (
                      <button type="button" className="btn-crm-action outlined mini" disabled={marcando !== null} onClick={() => marcar(f, false)} title="Quitar asistencia">
                        <UserX size={13} /> {marcando === f.userId ? 'Guardando…' : 'Quitar'}
                      </button>
                    ) : (
                      <button type="button" className="btn-crm-action outlined mini" disabled={marcando !== null} onClick={() => marcar(f, true)} title="Marcar asistencia a mano">
                        <UserCheck size={13} /> {marcando === f.userId ? 'Guardando…' : 'Marcar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
