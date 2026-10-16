import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, LogIn, UserPlus, BookOpen, FileCheck, ClipboardList, Video, Award, Download, Shield, XCircle, Search } from 'lucide-react';
import { traerTodo } from '../../lib/traerTodo';
import { eventosPlataforma, haceCuanto, TIPOS_EVENTO, VISTAS_EVENTO } from '../../lib/informes';
import './Informes.css';

// Línea de tiempo del portal (como la de los informes de TalentLMS). Se ve por
// separado: el aprendizaje de los alumnos (lo normal), los inicios de sesión y
// las acciones del equipo, para que no se mezclen; y se puede filtrar por curso.

const ICONOS = {
  login: LogIn, inscripcion: UserPlus, leccion: BookOpen, evaluacion: FileCheck, tarea: ClipboardList,
  sesion: Video, certificado: Award, descarga: Download, admin: Shield,
};
const PERIODOS = [['1', 'Último día'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días']];

export default function LineaTiempoPlataforma({ perfiles, cursos }) {
  const [dias, setDias] = useState('7');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [vista, setVista] = useState('aprendizaje');
  const [tipo, setTipo] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrar, setMostrar] = useState(50);

  useEffect(() => {
    let vigente = true;
    const desde = new Date(Date.now() - Number(dias) * 86400000).toISOString();
    const desdeCol = (col) => (q) => q.gte(col, desde);
    Promise.all([
      traerTodo('actividad_portal', 'user_id, tipo, objetivo_user_id, course_id, detalle, creado_en', desdeCol('creado_en')),
      traerTodo('inscripciones', 'user_id, course_id, origen, created_at', desdeCol('created_at')),
      // Sin `id`: traerTodo la ordena por su llave (user_id, leccion_id).
      traerTodo('leccion_progreso', 'user_id, course_id, leccion_id, completada, completada_en', desdeCol('completada_en')),
      traerTodo('evaluacion_intentos', 'user_id, leccion_id, calificacion, aprobado, enviado_en', desdeCol('enviado_en')),
      traerTodo('curso_eventos', 'user_id, course_id, datos, creado_en', (q) => q.eq('tipo', 'examen_enviado').gte('creado_en', desde)),
      traerTodo('tarea_entregas', 'user_id, leccion_id, creada_en', desdeCol('creada_en')),
      traerTodo('sesion_registros', 'user_id, leccion_id, asistio, verificado_en', desdeCol('verificado_en')),
      traerTodo('certificates', 'user_id, course_id, created_at', desdeCol('created_at')),
      traerTodo('curso_lecciones', 'id, titulo, course_id'),
    ])
      .then(([actividad, inscripciones, progreso, intentos, examenesFinales, entregas, asistencias, certificados, lecciones]) => {
        if (vigente) setDatos({ actividad, inscripciones, progreso, intentos, examenesFinales, entregas, asistencias, certificados, lecciones });
      })
      // Antes un error dejaba la línea vacía como si no hubiera pasado nada.
      .catch((err) => { if (vigente) setError(err.message || 'Error desconocido'); });
    return () => { vigente = false; };
  }, [dias, recarga]);

  const eventos = useMemo(() => (datos ? eventosPlataforma({ perfiles, cursos, ...datos }) : null), [datos, perfiles, cursos]);
  const filtrados = useMemo(() => {
    if (!eventos) return [];
    const q = busqueda.trim().toLowerCase();
    const tipos = VISTAS_EVENTO[vista].tipos;
    return eventos.filter((e) => tipos.includes(e.tipo)
      && (!tipo || e.tipo === tipo)
      && (!cursoId || Number(e.courseId) === Number(cursoId))
      && (!q || e.texto.toLowerCase().includes(q)));
  }, [eventos, vista, tipo, cursoId, busqueda]);
  const tiposVista = VISTAS_EVENTO[vista].tipos;
  const conCurso = vista !== 'accesos';

  return (
    <div className="inf">
      <div className="m-periodos inf-vistas" role="tablist" aria-label="Qué ver">
        {Object.entries(VISTAS_EVENTO).map(([id, v]) => (
          <button key={id} type="button" role="tab" aria-selected={vista === id} className={vista === id ? 'activo' : ''} onClick={() => { setVista(id); setTipo(''); setMostrar(50); }}>{v.nombre}</button>
        ))}
      </div>
      <div className="inf-filtros">
        <div className="m-periodos" role="group" aria-label="Periodo">
          {PERIODOS.map(([id, n]) => (
            <button key={id} type="button" className={dias === id ? 'activo' : ''} aria-pressed={dias === id} onClick={() => { if (id === dias) return; setDatos(null); setError(null); setDias(id); setMostrar(50); }}>{n}</button>
          ))}
        </div>
        {tiposVista.length > 1 && (
          <select className="m-select" value={tipo} onChange={(e) => { setTipo(e.target.value); setMostrar(50); }} aria-label="Tipo de evento">
            <option value="">Todo el aprendizaje</option>
            {tiposVista.map((id) => <option key={id} value={id}>{TIPOS_EVENTO[id]}</option>)}
          </select>
        )}
        {conCurso && (
          <select className="m-select" value={cursoId} onChange={(e) => { setCursoId(e.target.value); setMostrar(50); }} aria-label="Curso">
            <option value="">Todos los cursos</option>
            {[...cursos].sort((a, b) => String(a.title).localeCompare(String(b.title), 'es')).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
        <label className="inf-buscar"><Search size={14} /><input type="search" placeholder="Buscar persona o curso" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
      </div>

      {error ? (
        <p className="m-error">
          No se pudo cargar la línea de tiempo: {error}{' '}
          <button type="button" className="m-boton" onClick={() => { setError(null); setDatos(null); setRecarga((n) => n + 1); }}>Reintentar</button>
        </p>
      ) : !eventos ? <p className="m-cargando">Cargando…</p> : (
        <>
          <ol className="inf-eventos">
            {filtrados.slice(0, mostrar).map((e, i) => {
              const Icono = e.tipo === 'evaluacion' && e.aprobado === false ? XCircle : e.tipo === 'evaluacion' && e.aprobado ? CheckCircle : ICONOS[e.tipo] || CheckCircle;
              return (
                <li key={i} className={`inf-evento ${e.tipo}${e.aprobado === false ? ' mal' : ''}`}>
                  <span className="inf-evento-icono"><Icono size={16} /></span>
                  <div>
                    <small title={new Date(e.fecha).toLocaleString('es-MX')}>{haceCuanto(e.fecha)}</small>
                    <p>{e.texto}</p>
                  </div>
                </li>
              );
            })}
            {!filtrados.length && <li className="m-sin-datos">{vista === 'aprendizaje' ? 'No hubo actividad de aprendizaje con estos filtros.' : vista === 'accesos' ? 'Nadie inició sesión en este periodo.' : 'El equipo no hizo cambios en este periodo.'}</li>}
          </ol>
          <p className="inf-pie">
            {Math.min(mostrar, filtrados.length)} de {filtrados.length} eventos
            {filtrados.length > mostrar && <button type="button" className="m-boton" onClick={() => setMostrar((n) => n + 100)}>Ver más</button>}
          </p>
        </>
      )}
    </div>
  );
}
