import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, LogIn, UserPlus, BookOpen, FileCheck, ClipboardList, Video, Award, Download, Shield, XCircle, Search } from 'lucide-react';
import { traerTodo } from '../../lib/traerTodo';
import { eventosPlataforma, haceCuanto, TIPOS_EVENTO } from '../../lib/informes';
import './Informes.css';

// Línea de tiempo de todo el portal (como la de los informes de TalentLMS).

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
  const [tipo, setTipo] = useState('');
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
      traerTodo('curso_lecciones', 'id, titulo'),
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
    return eventos.filter((e) => (!tipo || e.tipo === tipo) && (!q || e.texto.toLowerCase().includes(q)));
  }, [eventos, tipo, busqueda]);

  return (
    <div className="inf">
      <div className="inf-filtros">
        <div className="m-periodos" role="group" aria-label="Periodo">
          {PERIODOS.map(([id, n]) => (
            <button key={id} type="button" className={dias === id ? 'activo' : ''} aria-pressed={dias === id} onClick={() => { if (id === dias) return; setDatos(null); setError(null); setDias(id); setMostrar(50); }}>{n}</button>
          ))}
        </div>
        <select className="m-select" value={tipo} onChange={(e) => { setTipo(e.target.value); setMostrar(50); }} aria-label="Tipo de evento">
          <option value="">Todos los eventos</option>
          {Object.entries(TIPOS_EVENTO).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
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
            {!filtrados.length && <li className="m-sin-datos">No hubo eventos en este periodo.</li>}
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
