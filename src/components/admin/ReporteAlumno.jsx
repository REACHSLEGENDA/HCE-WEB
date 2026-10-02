import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RotateCcw, Download, Award, Search } from 'lucide-react';
import { traerTodo } from '../../lib/traerTodo';
import { reiniciarIntentos } from '../../lib/evaluaciones';
import { insigniasPorCategoria, ESCALONES } from '../../lib/logros';
import { construirReporte, duracionTexto, ESTADOS_ACTIVIDAD, FORMATOS } from '../../lib/reporteAlumno';
import './ReporteAlumno.css';

// Ficha completa de un alumno (como el reporte de usuario de TalentLMS).

const PESTANAS = [
  ['general', 'Visión general'],
  ['cursos', 'Cursos'],
  ['actividades', 'Actividades de aprendizaje'],
  ['insignias', 'Insignias'],
  ['certificados', 'Certificados'],
  ['tiempo', 'Línea de tiempo'],
];
const ESTADO_CURSO = { completado: 'Completado', en_curso: 'En curso', no_empezado: 'No empezado' };
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
// Vigencia de un certificado: "Permanente" si no vence.
function vigencia(c, ahora = Date.now()) {
  if (!c.vigente_hasta) return { texto: 'Permanente', clase: 'completado' };
  const vence = new Date(c.vigente_hasta).getTime();
  if (vence < ahora) return { texto: `Venció el ${fecha(c.vigente_hasta)}`, clase: 'no_aprobada' };
  if (vence < ahora + 30 * 86400000) return { texto: `Vence el ${fecha(c.vigente_hasta)}`, clase: 'en_curso' };
  return { texto: `Hasta el ${fecha(c.vigente_hasta)}`, clase: 'completado' };
}
const fechaHora = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function filasPorIds(tabla, columnas, columna, ids) {
  const filas = [];
  for (let inicio = 0; inicio < ids.length; inicio += 150) {
    filas.push(...await traerTodo(tabla, columnas, (q) => q.in(columna, ids.slice(inicio, inicio + 150))));
  }
  return filas;
}

// Certificados con su vigencia; si la columna vigente_hasta todavía no existe
// (migración sin correr), se piden sin ella y todos se ven permanentes.
async function certificadosDe(userId) {
  try {
    return await traerTodo('certificates', 'id, course_id, folio, score, created_at, pdf_url, vigente_hasta', (q) => q.eq('user_id', userId));
  } catch (error) {
    if (error.code !== '42703') throw error;
    return traerTodo('certificates', 'id, course_id, folio, score, created_at, pdf_url', (q) => q.eq('user_id', userId));
  }
}

// Las visitas pueden pasar de 1,000 filas: se piden en tandas.
async function visitasDe(userId) {
  return traerTodo('curso_sesiones', 'id, course_id, iniciada_en, segundos_activos', (q) => q.eq('user_id', userId));
}

async function cargarDatosAlumno(userId) {
  const propias = (q) => q.eq('user_id', userId);
  const inscripciones = await traerTodo('inscripciones', 'course_id, origen, created_at', propias);
  const cursosIds = inscripciones.map((i) => i.course_id);
  const lecciones = cursosIds.length
    ? await filasPorIds('curso_lecciones', 'id, course_id, orden, titulo, tipo, obligatoria', 'course_id', cursosIds)
    : [];
  const sesionIds = lecciones.filter((l) => l.tipo === 'sesion').map((l) => l.id);

  const [progreso, intentos, entregas, sesionRegistros, sesionesHorario, certificados, visitas, examenesFinales, webinars] = await Promise.all([
    traerTodo('leccion_progreso', 'leccion_id, course_id, porcentaje, completada, completada_en', propias),
    traerTodo('evaluacion_intentos', 'id, leccion_id, course_id, numero, calificacion, aprobado, enviado_en, duracion_seg', propias),
    traerTodo('tarea_entregas', 'leccion_id, course_id, estado, creada_en, revisada_en', propias),
    traerTodo('sesion_registros', 'leccion_id, asistio, minutos, verificado_en', propias),
    sesionIds.length ? filasPorIds('sesiones_clase', 'leccion_id, inicia_en, duracion_min', 'leccion_id', sesionIds) : [],
    certificadosDe(userId),
    visitasDe(userId),
    traerTodo('curso_eventos', 'course_id, datos, creado_en', (q) => propias(q).eq('tipo', 'examen_enviado')),
    traerTodo('webinar_registros', 'asistio', propias),
  ]);

  return { inscripciones, lecciones, progreso, intentos, entregas, sesionRegistros, sesionesHorario, certificados, visitas, examenesFinales, webinars };
}

async function exportarActividades(alumno, actividades) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Actividades');
  hoja.addRow(['Actividad', 'Formato', 'Curso', 'Fecha', 'Estado', 'Puntuación', 'Duración']).font = { bold: true };
  actividades.forEach((a) => {
    hoja.addRow([a.titulo, FORMATOS[a.formato], a.curso, a.fecha ? new Date(a.fecha).toLocaleDateString('es-MX') : '', ESTADOS_ACTIVIDAD[a.estado].texto, a.puntuacion != null ? Number(a.puntuacion) / 100 : '', a.duracionSeg != null ? duracionTexto(a.duracionSeg) : '']);
  });
  hoja.getColumn(6).numFmt = '0.00%';
  [40, 16, 36, 14, 16, 12, 12].forEach((w, i) => { hoja.getColumn(i + 1).width = w; });
  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Actividades_${(alumno.nombre_completo || alumno.email || 'alumno').replace(/[^\p{L}\p{N}]+/gu, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReporteAlumno({ alumno, cursos, notificar, confirmar, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [pestana, setPestana] = useState('general');
  const [busqueda, setBusqueda] = useState('');
  const [formato, setFormato] = useState('');
  const [verEventos, setVerEventos] = useState(50);
  const [errorCarga, setErrorCarga] = useState(null);

  const cargar = useCallback(async () => {
    try { setDatos(await cargarDatosAlumno(alumno.id)); setErrorCarga(null); }
    catch (err) { setErrorCarga(err.message || 'Error de conexión'); }
  }, [alumno.id]);

  useEffect(() => {
    let vigente = true;
    cargarDatosAlumno(alumno.id)
      .then((d) => { if (vigente) setDatos(d); })
      .catch((err) => { if (vigente) setErrorCarga(err.message || 'Error de conexión'); });
    return () => { vigente = false; };
  }, [alumno.id]);

  // Cerrar con Escape.
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const reporte = useMemo(() => (datos ? construirReporte(datos, cursos) : null), [datos, cursos]);
  const actividades = useMemo(() => {
    if (!reporte) return [];
    const q = busqueda.trim().toLowerCase();
    return reporte.actividades.filter((a) => (!formato || a.formato === formato) && (!q || `${a.titulo} ${a.curso}`.toLowerCase().includes(q)));
  }, [reporte, busqueda, formato]);

  const reiniciar = async (a) => {
    const ok = await confirmar(`¿Reiniciar "${a.titulo}"? Se borran sus ${a.intentos} ${a.intentos === 1 ? 'intento' : 'intentos'} y la lección vuelve a quedar pendiente para que la presente de nuevo.`, 'Reiniciar actividad');
    if (!ok) return;
    try {
      await reiniciarIntentos(alumno.id, a.leccionId);
      notificar('Actividad reiniciada.', 'success');
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const ind = reporte?.indicadores;

  return (
    <div className="reporte-fondo" role="dialog" aria-modal="true" aria-label={`Reporte de ${alumno.nombre_completo || alumno.email}`}>
      <div className="reporte">
        {errorCarga && <p className="m-error" role="alert">No se pudo cargar el reporte: {errorCarga} <button type="button" className="reporte-boton" onClick={cargar}>Reintentar</button></p>}
        <header className="reporte-cabecera">
          <div>
            <span className="reporte-migas">Informes › Usuarios</span>
            <h2>{alumno.nombre_completo || alumno.email}</h2>
            <small>{alumno.email}</small>
          </div>
          <button type="button" className="reporte-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <nav className="reporte-pestanas" role="tablist">
          {PESTANAS.map(([id, nombre]) => (
            <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{nombre}</button>
          ))}
        </nav>

        {!reporte ? (errorCarga ? null : <p className="reporte-vacio">Cargando reporte…</p>) : (
          <div className="reporte-cuerpo">
            {(pestana === 'general' || pestana === 'actividades') && (
              <dl className="reporte-indicadores">
                <div><dd>{Math.round(ind.tasaFinalizacion)}%</dd><dt>Tasa de finalización</dt></div>
                <div><dd>{ind.completadas}</dd><dt>Actividades completadas</dt></div>
                <div><dd>{ind.enProgreso}</dd><dt>En progreso</dt></div>
                <div><dd>{ind.noAprobadas}</dd><dt>No aprobadas</dt></div>
                <div><dd>{ind.noEmpezadas}</dd><dt>No empezadas</dt></div>
                <div><dd>{duracionTexto(ind.segundosFormacion)}</dd><dt>Duración de la formación</dt></div>
              </dl>
            )}

            {pestana === 'general' && (
              <>
                <h3 className="reporte-subtitulo">Cursos</h3>
                <ul className="reporte-cursos-resumen">
                  {reporte.cursos.map((c) => (
                    <li key={c.courseId}>
                      <span className="reporte-curso-nombre">{c.titulo}</span>
                      <span className="reporte-barra"><span style={{ width: `${c.avance}%` }} /></span>
                      <span className="reporte-num">{c.avance}%</span>
                    </li>
                  ))}
                  {!reporte.cursos.length && <li className="reporte-vacio">No está inscrito en ningún curso.</li>}
                </ul>
              </>
            )}

            {pestana === 'cursos' && (
              <div className="reporte-tabla-scroll">
                <table className="reporte-tabla">
                  <thead><tr><th>Curso</th><th>Inscrito</th><th>Lecciones</th><th>Avance</th><th>Estado</th><th>Calificación</th><th>Tiempo</th></tr></thead>
                  <tbody>
                    {reporte.cursos.map((c) => (
                      <tr key={c.courseId}>
                        <td className="reporte-fuerte">{c.titulo}</td>
                        <td>{fecha(c.inscritoEn)}</td>
                        <td>{c.lecciones}</td>
                        <td className="num">{c.avance}%</td>
                        <td><span className={`reporte-estado ${c.estado}`}>{ESTADO_CURSO[c.estado]}</span></td>
                        <td className="num">{c.calificacion != null ? `${c.calificacion}%` : '—'}</td>
                        <td className="num">{duracionTexto(c.segundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pestana === 'actividades' && (
              <>
                <div className="reporte-filtros">
                  <label className="reporte-buscar"><Search size={14} /><input type="search" placeholder="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
                  <select value={formato} onChange={(e) => setFormato(e.target.value)} aria-label="Formato">
                    <option value="">Todos los formatos</option>
                    {Object.entries(FORMATOS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                  </select>
                  <button type="button" className="reporte-boton" onClick={() => exportarActividades(alumno, actividades).catch((err) => notificar(err.message, 'error'))} disabled={!actividades.length}>
                    <Download size={15} /> Exportar en Excel
                  </button>
                </div>
                <div className="reporte-tabla-scroll">
                  <table className="reporte-tabla">
                    <thead><tr><th>Actividad</th><th>Formato</th><th>Curso</th><th>Fecha</th><th>Estado</th><th className="num">Puntuación</th><th className="num">Duración</th><th aria-label="Acciones" /></tr></thead>
                    <tbody>
                      {actividades.map((a) => (
                        <tr key={`${a.formato}-${a.leccionId ?? a.courseId}`}>
                          <td className="reporte-fuerte">{a.titulo}</td>
                          <td>{FORMATOS[a.formato]}</td>
                          <td>{a.curso}</td>
                          <td>{fecha(a.fecha)}</td>
                          <td><span className={`reporte-estado ${ESTADOS_ACTIVIDAD[a.estado].grupo}`}>{ESTADOS_ACTIVIDAD[a.estado].texto}</span></td>
                          <td className="num">{a.puntuacion != null ? `${Number(a.puntuacion).toFixed(2)}%` : '—'}</td>
                          <td className="num">{duracionTexto(a.duracionSeg)}</td>
                          <td>
                            {a.reiniciable && (
                              <button type="button" className="icon-action-btn" title="Reiniciar: vuelve a presentarlo" onClick={() => reiniciar(a)}><RotateCcw size={15} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!actividades.length && <tr><td colSpan={8} className="reporte-vacio">Sin actividades.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {pestana === 'insignias' && (
              <div className="reporte-categorias">
                {insigniasPorCategoria(reporte.logros).map((c) => (
                  <section key={c.id}>
                    <h4>{c.nombre} <small>{c.valor} {c.unidad}</small></h4>
                    <ul className="reporte-insignias">
                      {ESCALONES.map((nombre, i) => (
                        <li key={nombre} className={i < c.alcanzados ? 'obtenida' : ''} title={`${c.metas[i]} ${c.unidad}`}>
                          <Award size={26} />
                          <strong>{nombre}</strong>
                          <small>{c.metas[i]}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {pestana === 'certificados' && (
              reporte.certificados.length ? (
                <div className="reporte-tabla-scroll">
                  <table className="reporte-tabla">
                    <thead><tr><th>Curso</th><th>Folio</th><th>Emitido</th><th>Vigencia</th><th className="num">Calificación</th><th /></tr></thead>
                    <tbody>
                      {reporte.certificados.map((c) => (
                        <tr key={c.id}>
                          <td className="reporte-fuerte">{cursos.find((x) => Number(x.id) === Number(c.course_id))?.title || `Curso ${c.course_id}`}</td>
                          <td>{c.folio}</td>
                          <td>{fecha(c.created_at)}</td>
                          <td><span className={`reporte-estado ${vigencia(c).clase}`}>{vigencia(c).texto}</span></td>
                          <td className="num">{c.score != null ? `${c.score}%` : '—'}</td>
                          <td>{c.pdf_url && <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">Ver</a>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="reporte-vacio">Todavía no tiene certificados.</p>
            )}

            {pestana === 'tiempo' && (
              <>
                <ol className="reporte-tiempo">
                  {reporte.eventos.slice(0, verEventos).map((e, i) => (
                    <li key={i} className={`evento-${e.tipo}`}>
                      <span className="reporte-tiempo-fecha">{fechaHora(e.fecha)}</span>
                      <span>{e.texto}</span>
                    </li>
                  ))}
                  {!reporte.eventos.length && <li className="reporte-vacio">Sin actividad registrada.</li>}
                </ol>
                {reporte.eventos.length > verEventos && (
                  <button type="button" className="reporte-boton" onClick={() => setVerEventos((n) => n + 100)}>Ver más ({reporte.eventos.length - verEventos})</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
