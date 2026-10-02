import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { traerTodo } from '../../lib/traerTodo';
import { reporteColectivo } from '../../lib/informes';
import MetricasCursos from './MetricasCursos';
import AnaliticasPlataforma from './AnaliticasPlataforma';
import LineaTiempoPlataforma from './LineaTiempoPlataforma';
import './Informes.css';

// Informes del panel: métricas por curso, analíticas de toda la plataforma y
// la línea de tiempo general.

const PESTANAS = [['cursos', 'Cursos'], ['grupos', 'Grupos'], ['plataforma', 'Analíticas'], ['tiempo', 'Línea de tiempo']];

export default function InformesAdmin({ cursos, perfiles, abrirCurso, notificar, confirmar }) {
  const [pestana, setPestana] = useState('cursos');
  // Si llega un curso para abrir, la pestaña de cursos va al frente.
  const [cursoVisto, setCursoVisto] = useState(abrirCurso);
  if (abrirCurso !== cursoVisto) {
    setCursoVisto(abrirCurso);
    if (abrirCurso) setPestana('cursos');
  }
  return (
    <div className="metricas inf-contenedor">
      <nav className="inf-pestanas" role="tablist">
        {PESTANAS.map(([id, n]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{n}</button>
        ))}
      </nav>
      {pestana === 'cursos' && <MetricasCursos cursos={cursos} perfiles={perfiles} abrirCurso={abrirCurso} notificar={notificar} confirmar={confirmar} />}
      {pestana === 'grupos' && <InformeGrupos cursos={cursos} perfiles={perfiles} />}
      {pestana === 'plataforma' && <AnaliticasPlataforma cursos={cursos} perfiles={perfiles} />}
      {pestana === 'tiempo' && <LineaTiempoPlataforma cursos={cursos} perfiles={perfiles} />}
    </div>
  );
}

async function filasDeAlumnos(tabla, columnas, ids, filtrar = (q) => q) {
  const filas = [];
  for (let inicio = 0; inicio < ids.length; inicio += 150) {
    const tanda = ids.slice(inicio, inicio + 150);
    filas.push(...await traerTodo(tabla, columnas, (q) => filtrar(q.in('user_id', tanda))));
  }
  return filas;
}

async function exportarGrupo(nombre, matriz) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Portal HCE';
  const hoja = libro.addWorksheet('Alumnos y cursos', { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.addRow(['Alumno', 'Correo', 'Curso', 'Avance', 'Estado', 'Calificación', 'Certificado']).font = { bold: true };
  for (const fila of matriz.filas) {
    fila.celdas.forEach((celda, indice) => hoja.addRow([
      fila.alumno.nombre_completo || fila.alumno.email || 'Alumno', fila.alumno.email || '', matriz.columnas[indice].title,
      celda.avance == null ? '' : celda.avance / 100, celda.estado,
      celda.calificacion == null ? '' : Number(celda.calificacion) / 100, celda.certificado || '',
    ]));
  }
  [34, 34, 42, 12, 20, 14, 20].forEach((ancho, indice) => { hoja.getColumn(indice + 1).width = ancho; });
  hoja.getColumn(4).numFmt = '0%';
  hoja.getColumn(6).numFmt = '0.00%';
  hoja.autoFilter = { from: 'A1', to: 'G1' };
  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `Reporte_${nombre.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 60)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function InformeGrupos({ cursos, perfiles }) {
  const [catalogo, setCatalogo] = useState(null);
  const [seleccion, setSeleccion] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [errorExportacion, setErrorExportacion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      traerTodo('grupos', 'id, nombre'),
      traerTodo('divisiones', 'id, nombre'),
      traerTodo('grupo_miembros', 'grupo_id, user_id'),
      traerTodo('grupo_cursos', 'grupo_id, course_id'),
      traerTodo('division_cursos', 'division_id, course_id'),
    ]).then(([grupos, divisiones, miembros, gruposCursos, divisionesCursos]) => {
      if (vigente) setCatalogo({ grupos, divisiones, miembros, gruposCursos, divisionesCursos });
    }).catch((err) => { if (vigente) setError(err.message || 'Error de conexión'); });
    return () => { vigente = false; };
  }, [recarga]);

  const alumnos = useMemo(() => {
    if (!catalogo || !seleccion) return [];
    const [tipo, id] = seleccion.split(':');
    if (tipo === 'd') return perfiles.filter((p) => String(p.division_id) === id);
    const ids = new Set(catalogo.miembros.filter((m) => String(m.grupo_id) === id).map((m) => m.user_id));
    return perfiles.filter((p) => ids.has(p.id));
  }, [catalogo, seleccion, perfiles]);

  const cursosAsignados = useMemo(() => {
    if (!catalogo || !seleccion) return [];
    const [tipo, id] = seleccion.split(':');
    const filas = tipo === 'd' ? catalogo.divisionesCursos : catalogo.gruposCursos;
    return filas.filter((f) => String(tipo === 'd' ? f.division_id : f.grupo_id) === id).map((f) => Number(f.course_id));
  }, [catalogo, seleccion]);

  useEffect(() => {
    if (!catalogo || !seleccion) return undefined;
    let vigente = true;
    const ids = alumnos.map((p) => p.id);
    Promise.all([
      filasDeAlumnos('inscripciones', 'user_id, course_id', ids),
      filasDeAlumnos('certificates', 'user_id, course_id, folio, score', ids),
      filasDeAlumnos('leccion_progreso', 'user_id, course_id, leccion_id, completada, porcentaje', ids),
      filasDeAlumnos('curso_eventos', 'user_id, course_id, datos', ids, (q) => q.eq('tipo', 'examen_enviado')),
      filasDeAlumnos('evaluacion_intentos', 'user_id, course_id, calificacion, aprobado', ids),
    ]).then(async ([inscripciones, certificados, progreso, examenes, intentos]) => {
      const idsCursos = [...new Set([...cursosAsignados, ...inscripciones.map((i) => Number(i.course_id))])];
      const lecciones = [];
      for (let inicio = 0; inicio < idsCursos.length; inicio += 150) {
        lecciones.push(...await traerTodo('curso_lecciones', 'id, course_id, tipo, obligatoria', (q) => q.in('course_id', idsCursos.slice(inicio, inicio + 150))));
      }
      if (vigente) setDatos({ seleccion, inscripciones, certificados, progreso, examenes, intentos, lecciones });
    }).catch((err) => { if (vigente) setError(err.message || 'Error de conexión'); });
    return () => { vigente = false; };
  }, [catalogo, seleccion, alumnos, cursosAsignados]);

  const matriz = useMemo(() => datos?.seleccion === seleccion
    ? reporteColectivo({ alumnos, cursos, cursosAsignados, ...datos }) : null, [datos, seleccion, alumnos, cursos, cursosAsignados]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (matriz?.filas || []).filter((fila) => !q || `${fila.alumno.nombre_completo || ''} ${fila.alumno.email || ''}`.toLowerCase().includes(q));
  }, [matriz, busqueda]);
  const [tipo, id] = seleccion.split(':');
  const nombre = (tipo === 'd' ? catalogo?.divisiones : catalogo?.grupos)?.find((g) => String(g.id) === id)?.nombre || 'Grupo';
  const actualizar = () => { setError(null); setDatos(null); setCatalogo(null); setRecarga((n) => n + 1); };
  const exportar = async () => {
    setExportando(true);
    setErrorExportacion(null);
    try { await exportarGrupo(nombre, { ...matriz, filas: visibles }); }
    catch (err) { setErrorExportacion(err.message || 'No se pudo exportar'); }
    finally { setExportando(false); }
  };

  return <section className="inf inf-grupos" aria-label="Reporte por grupo o división">
    <div className="inf-filtros">
      <label className="inf-grupo-selector">Grupo o división
        <select className="m-select" value={seleccion} onChange={(e) => { setSeleccion(e.target.value); setDatos(null); setError(null); setErrorExportacion(null); setBusqueda(''); }}>
          <option value="">Elige un grupo o división</option>
          {catalogo?.divisiones.length > 0 && <optgroup label="Divisiones">{catalogo.divisiones.map((d) => <option key={d.id} value={`d:${d.id}`}>{d.nombre}</option>)}</optgroup>}
          {catalogo?.grupos.length > 0 && <optgroup label="Grupos">{catalogo.grupos.map((g) => <option key={g.id} value={`g:${g.id}`}>{g.nombre}</option>)}</optgroup>}
        </select>
      </label>
      <button type="button" className="m-boton" onClick={actualizar}><RefreshCw size={15} /> Actualizar</button>
    </div>
    {error && <p className="m-error" role="alert">No se pudo cargar el reporte: {error} <button type="button" className="m-boton" onClick={actualizar}>Reintentar</button></p>}
    {errorExportacion && <p className="m-error" role="alert">No se pudo exportar: {errorExportacion}</p>}
    {!catalogo && !error && <p className="m-cargando">Cargando grupos y divisiones…</p>}
    {catalogo && !catalogo.grupos.length && !catalogo.divisiones.length && <p className="m-sin-datos">Todavía no hay grupos ni divisiones. Si falta activar estas funciones, corre las migraciones grupos.sql y divisiones.sql.</p>}
    {seleccion && !matriz && !error && <p className="m-cargando">Cargando el historial de los alumnos…</p>}
    {matriz && !error && <>
      <div className="inf-filtros">
        <label className="inf-buscar"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Buscar alumno por nombre o correo" placeholder="Buscar alumno" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
        <button type="button" className="m-boton" onClick={exportar} disabled={exportando || !visibles.length || !matriz.columnas.length}><Download size={15} /> {exportando ? 'Exportando…' : 'Exportar a Excel'}</button>
      </div>
      <p className="inf-nota">{nombre} · {visibles.length} alumnos · {matriz.columnas.length} cursos. Historial acumulado. La exportación incluye los alumnos de la búsqueda.</p>
      {!matriz.filas.length ? <p className="m-sin-datos">Este grupo o división todavía no tiene alumnos.</p>
        : !matriz.columnas.length ? <p className="m-sin-datos">No hay cursos asignados ni inscripciones en este grupo o división.</p>
          : <div className="m-tabla-scroll" tabIndex={0} role="region" aria-label="Tabla de alumnos y cursos; desplaza horizontalmente para ver todos los cursos">
            <table className="m-tabla inf-grupos-tabla">
              <caption className="inf-grupos-caption">Avance, estado, calificación y certificado de cada alumno</caption>
              <thead><tr><th scope="col">Alumno</th>{matriz.columnas.map((c) => <th scope="col" key={c.id}>{c.title}</th>)}</tr></thead>
              <tbody>{visibles.map((fila) => <tr key={fila.alumno.id}>
                <th scope="row"><strong>{fila.alumno.nombre_completo || fila.alumno.email || 'Alumno'}</strong><small>{fila.alumno.email}</small></th>
                {fila.celdas.map((celda) => <td key={celda.courseId}>
                  <strong>{celda.avance == null ? '—' : `${celda.avance}%`}</strong><span>{celda.estado}</span>
                  <small>Calificación: {celda.calificacion == null ? '—' : `${Number(celda.calificacion).toFixed(1)}%`}</small>
                  <small>Certificado: {celda.certificado || '—'}</small>
                </td>)}
              </tr>)}{!visibles.length && <tr><td colSpan={matriz.columnas.length + 1}>Ningún alumno coincide con la búsqueda.</td></tr>}</tbody>
            </table>
          </div>}
    </>}
  </section>;
}
