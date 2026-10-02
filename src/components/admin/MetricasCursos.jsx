import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, formatoPrecio } from '../../lib/cursos';
import { LLAVES_SIN_ID } from '../../lib/traerTodo';
import {
  resumenPorCurso,
  totales,
  visitasPorDia,
  curvaRetencion,
  mayorCaida,
  dispositivos,
  distribucionCalificaciones,
  porAlumno,
  historialDeAlumno,
  avancePorLeccion,
  leccionesCompletadasPorAlumno,
  curvaRetencionDeLeccion,
  matrizDeUnidades,
  formatoEntero,
  formatoMinutos,
  formatoPorcentaje,
  formatoDinero,
} from '../../lib/metricas';
import { GraficaColumnas, GraficaRetencion, BarrasHorizontales } from './GraficasMetricas';
import MatrizUnidades from './MatrizUnidades';
import AnalisisEvaluaciones from './AnalisisEvaluaciones';
import ReporteAlumno from './ReporteAlumno';
import './MetricasCursos.css';

// Panel de métricas de los cursos del portal: la vista general de todos los
// cursos y, al abrir uno, el detalle con cada alumno y su historial.

const PERIODOS = [
  { id: '7', etiqueta: 'Últimos 7 días', dias: 7 },
  { id: '30', etiqueta: 'Últimos 30 días', dias: 30 },
  { id: '90', etiqueta: 'Últimos 90 días', dias: 90 },
  { id: 'todo', etiqueta: 'Todo', dias: null },
];

const NOMBRE_DISPOSITIVO = { escritorio: 'Computadora', movil: 'Celular', tablet: 'Tablet' };
const NOMBRE_ORIGEN = { gratis: 'Gratis', pago: 'Pagó', admin: 'Asignado', grupo: 'Por su grupo', previo: 'Antes del registro' };

// En qué va cada alumno. El orden es el del filtro y el de la tarjeta.
const ESTADOS = [
  { id: 'sin-empezar', etiqueta: 'Sin empezar', clase: 'apagado' },
  { id: 'cursando', etiqueta: 'Cursando', clase: '' },
  { id: 'reprobo', etiqueta: 'Reprobó', clase: 'aviso' },
  { id: 'aprobo', etiqueta: 'Aprobó', clase: 'ok' },
  { id: 'certificado', etiqueta: 'Certificado', clase: 'ok' },
];
const ESTADO_POR_ID = Object.fromEntries(ESTADOS.map((e) => [e.id, e]));

function estadoDe(a) {
  if (a.certificado) return 'certificado';
  if (a.aprobado) return 'aprobo';
  if (a.intentos) return 'reprobo';
  // Las lecciones son acumuladas: quien avanzó antes del periodo sigue cursando.
  if (a.actividadAcumulada || a.visitas || a.lecciones) return 'cursando';
  return 'sin-empezar';
}

function inicioDelPeriodo(periodoId) {
  const periodo = PERIODOS.find((p) => p.id === periodoId);
  if (!periodo?.dias) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (periodo.dias - 1));
  return d;
}

// Supabase entrega 1,000 filas por petición; se piden en tandas hasta agotar,
// siempre con orden estable (las tablas sin `id` van por su llave). Las tablas
// base (sesiones, eventos, inscripciones) son obligatorias: si faltan, avisa.
async function traerTodo(tabla, columnas, filtrar = (q) => q) {
  const filas = [];
  const TANDA = 1000;
  const orden = LLAVES_SIN_ID[tabla] || ['id'];
  for (let desde = 0; ; desde += TANDA) {
    let base = supabase.from(tabla).select(columnas);
    for (const col of orden) base = base.order(col, { ascending: true });
    const { data, error } = await filtrar(base).range(desde, desde + TANDA - 1);
    if (error) throw error;
    filas.push(...data);
    if (data.length < TANDA) break;
  }
  return filas;
}

// Lecciones, grupos y certificados llegaron después o pueden no existir: si su
// migración no corre, el panel funciona igual, solo sin esas vistas.
async function traerOpcional(tabla, columnas) {
  try {
    return await traerTodo(tabla, columnas);
  } catch (err) {
    if (esTablaFaltante(err)) return [];
    throw err;
  }
}

const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const fechaHora = (iso) => (iso
  ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

function descargarCsv(nombre, encabezados, filas) {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // El BOM hace que Excel en Windows respete los acentos.
  const csv = '\uFEFF' + [encabezados, ...filas].map((f) => f.map(escapar).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// En los indicadores cabe una sola cifra grande: la moneda principal va como
// valor y la otra se menciona debajo, para que la fila no se descuadre.
function ingresosParaIndicador(ingresos, ventas) {
  const soloDolares = !ingresos.mxn && ingresos.usd;
  const valor = soloDolares ? `US${formatoEntero(ingresos.usd)}` : `${formatoEntero(ingresos.mxn)} MXN`;
  const extra = ingresos.mxn && ingresos.usd ? `+ US${formatoEntero(ingresos.usd)} · ` : '';
  return { valor, detalle: `${extra}${ventas} ${ventas === 1 ? 'venta' : 'ventas'}` };
}

function Indicador({ etiqueta, valor, detalle }) {
  return (
    <div className="m-indicador">
      <span className="m-indicador-etiqueta">{etiqueta}</span>
      <span className="m-indicador-valor">{valor}</span>
      {detalle && <span className="m-indicador-detalle">{detalle}</span>}
    </div>
  );
}

function Tarjeta({ titulo, subtitulo, children, ancha = false }) {
  return (
    <section className={`m-tarjeta${ancha ? ' m-tarjeta--ancha' : ''}`}>
      <header>
        <h3>{titulo}</h3>
        {subtitulo && <p>{subtitulo}</p>}
      </header>
      {children}
    </section>
  );
}

function columnasDeVisitas(dias) {
  return dias.map((d) => ({
    clave: d.fecha,
    valor: d.visitas,
    etiquetaEje: fechaCorta(d.fecha),
    detalle: (
      <>
        <strong>{d.visitas} {d.visitas === 1 ? 'visita' : 'visitas'}</strong>
        <span className="m-recuadro-sub">{fechaCorta(d.fecha)} · {d.alumnos} {d.alumnos === 1 ? 'alumno' : 'alumnos'}</span>
      </>
    ),
  }));
}

const tablaDeVisitas = (dias) => ({
  titulo: 'Visitas por día',
  encabezados: ['Día', 'Visitas', 'Alumnos'],
  filas: dias.map((d) => [fechaCorta(d.fecha), d.visitas, d.alumnos]),
});

export default function MetricasCursos({ cursos, perfiles, abrirCurso, notificar, confirmar }) {
  const [periodo, setPeriodo] = useState('30');
  // Lo acumulado (inscripciones, avance, exámenes, certificados…) se trae una
  // vez; al cambiar de periodo solo se vuelven a pedir las visitas.
  const [acumulado, setAcumulado] = useState(null);
  const [delPeriodo, setDelPeriodo] = useState(null); // { sesiones }
  const [cargandoAcumulado, setCargandoAcumulado] = useState(false);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
  const [estadoAcumulado, setEstado] = useState(null); // null | 'sin-migracion' | mensaje de error
  const [estadoPeriodo, setEstadoPeriodo] = useState(null);
  const estado = estadoAcumulado || estadoPeriodo;
  const peticionPeriodo = useRef(0);
  const cargando = cargandoAcumulado || cargandoPeriodo;
  const datos = useMemo(
    () => (acumulado && delPeriodo ? { ...acumulado, ...delPeriodo } : null),
    [acumulado, delPeriodo]
  );
  const [cursoAbierto, setCursoAbierto] = useState(abrirCurso?.id != null ? Number(abrirCurso.id) : null);
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [alumnoReporte, setAlumnoReporte] = useState(null);

  const desde = useMemo(() => inicioDelPeriodo(periodo), [periodo]);

  // Desde la lista de cursos se puede saltar directo a las métricas de uno.
  const [cursoVisto, setCursoVisto] = useState(abrirCurso);
  if (abrirCurso !== cursoVisto) {
    setCursoVisto(abrirCurso);
    if (abrirCurso?.id != null) setCursoAbierto(Number(abrirCurso.id));
  }

  // Todo lo que no depende del periodo: quién está inscrito, qué avanzó, si
  // aprobó o se certificó. Es lo que dice "en qué va" cada alumno.
  const cargarAcumulado = useCallback(async () => {
    setCargandoAcumulado(true);
    setEstado(null);
    try {
      const [inscripciones, examenes, actividad] = await Promise.all([
        // "Inscritos" es un total, no del periodo.
        traerTodo('inscripciones', 'id, user_id, course_id, origen, monto, moneda, created_at'),
        // Intentos y mejor calificación son de todo el historial.
        traerTodo('curso_eventos', 'id, user_id, course_id, tipo, datos, creado_en', (q) => q.eq('tipo', 'examen_enviado')),
        // Quien visitó antes del periodo sigue cursando, incluso en cursos
        // antiguos sin leccion_progreso. Solo descargamos las dos llaves.
        traerTodo('curso_sesiones', 'user_id, course_id'),
      ]);
      const [lecciones, progreso, grupos, miembros, entregas, intentosEval, divisiones, certificados] = await Promise.all([
        traerOpcional('curso_lecciones', 'id, course_id, orden, titulo, tipo, obligatoria'),
        traerOpcional('leccion_progreso', 'user_id, leccion_id, course_id, porcentaje, completada'),
        traerOpcional('grupos', 'id, nombre'),
        traerOpcional('grupo_miembros', 'grupo_id, user_id'),
        traerOpcional('tarea_entregas', 'id, user_id, leccion_id, course_id, estado, creada_en'),
        traerOpcional('evaluacion_intentos', 'id, leccion_id, course_id, user_id, numero, respuestas, calificacion, aprobado, enviado_en, duracion_seg'),
        traerOpcional('divisiones', 'id, nombre'),
        // Los certificados se cuentan de su tabla, no de los eventos.
        traerOpcional('certificates', 'id, user_id, course_id, created_at'),
      ]);
      setAcumulado({ inscripciones, lecciones, progreso, grupos, miembros, entregas, examenes, intentosEval, divisiones, certificados, actividad });
    } catch (err) {
      if (esTablaFaltante(err)) setEstado('sin-migracion');
      else setEstado(err.message || 'No se pudieron cargar las métricas.');
    } finally {
      setCargandoAcumulado(false);
    }
  }, []);

  // Solo las visitas (y su tiempo) dependen del periodo.
  const cargarPeriodo = useCallback(async () => {
    const numero = ++peticionPeriodo.current;
    setCargandoPeriodo(true);
    setEstadoPeriodo(null);
    try {
      const desdeIso = desde ? desde.toISOString() : null;
      const sesiones = await traerTodo(
        'curso_sesiones',
        'id, user_id, course_id, iniciada_en, ultima_senal_en, segundos_activos, segundos_video, posicion_max_seg, duracion_video_seg, porcentaje_max, dispositivo',
        (q) => (desdeIso ? q.gte('iniciada_en', desdeIso) : q)
      );
      // Si el usuario ya eligió otro periodo, esta respuesta llegó tarde.
      if (numero === peticionPeriodo.current) setDelPeriodo({ sesiones });
    } catch (err) {
      if (numero !== peticionPeriodo.current) return;
      if (esTablaFaltante(err)) setEstadoPeriodo('sin-migracion');
      else setEstadoPeriodo(err.message || 'No se pudieron cargar las visitas del periodo.');
    } finally {
      if (numero === peticionPeriodo.current) setCargandoPeriodo(false);
    }
  }, [desde]);

  useEffect(() => { void cargarAcumulado(); }, [cargarAcumulado]);
  useEffect(() => { void cargarPeriodo(); }, [cargarPeriodo]);

  const cargar = () => { void cargarAcumulado(); void cargarPeriodo(); };

  // Con un grupo elegido, todo el panel se limita a sus miembros: sirve para
  // ver cómo va un hospital o una generación en particular.
  const datosVista = useMemo(() => {
    if (!datos || !grupoFiltro) return datos;
    // "g-3" es el grupo 3; "d-2", la división 2.
    const [tipoFiltro, idFiltro] = grupoFiltro.split('-');
    const miembros = new Set(tipoFiltro === 'd'
      ? perfiles.filter((p) => String(p.division_id) === idFiltro).map((p) => p.id)
      : datos.miembros.filter((m) => String(m.grupo_id) === idFiltro).map((m) => m.user_id));
    const soloMiembros = (filas) => filas.filter((f) => miembros.has(f.user_id));
    return {
      ...datos,
      sesiones: soloMiembros(datos.sesiones),
      actividad: soloMiembros(datos.actividad || []),
      inscripciones: soloMiembros(datos.inscripciones),
      progreso: soloMiembros(datos.progreso),
      entregas: soloMiembros(datos.entregas || []),
      examenes: soloMiembros(datos.examenes || []),
      intentosEval: soloMiembros(datos.intentosEval || []),
      certificados: soloMiembros(datos.certificados || []),
    };
  }, [datos, grupoFiltro, perfiles]);

  const resumen = useMemo(() => {
    if (!datosVista) return [];
    return resumenPorCurso({ cursos, ...datosVista, desde })
      .sort((a, b) => b.visitas - a.visitas || b.inscritos - a.inscritos);
  }, [datosVista, cursos, desde]);

  if (estado === 'sin-migracion') {
    return (
      <div className="metricas">
        <div className="m-vacio">
          <h3>Falta activar el registro de actividad</h3>
          <p>Corre en Supabase las migraciones <code>cursos-inscripciones.sql</code> y <code>cursos-actividad.sql</code>. Las métricas empiezan a contar desde ese momento.</p>
        </div>
      </div>
    );
  }

  const cursoDetalle = cursoAbierto != null ? resumen.find((r) => r.courseId === cursoAbierto) : null;

  return (
    <div className={`metricas${cargando && datos ? ' metricas--recargando' : ''}`}>
      {alumnoReporte && <ReporteAlumno alumno={alumnoReporte} cursos={cursos} notificar={notificar} confirmar={confirmar} onCerrar={() => setAlumnoReporte(null)} />}
      {/* Filtros: una sola fila arriba, y afectan todo lo de abajo. */}
      <div className="m-filtros">
        <div className="m-periodos" role="group" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodo === p.id ? 'activo' : ''}
              aria-pressed={periodo === p.id}
              onClick={() => setPeriodo(p.id)}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <div className="m-filtros-derecha">
          <select
            className="m-select"
            value={cursoAbierto ?? ''}
            onChange={(e) => setCursoAbierto(e.target.value ? Number(e.target.value) : null)}
            aria-label="Curso"
          >
            <option value="">Todos los cursos</option>
            {cursos.filter((c) => !Number.isNaN(Number(c.id))).map((c) => (
              <option key={c.id} value={Number(c.id)}>{c.title}</option>
            ))}
          </select>
          {(datos?.grupos?.length > 0 || datos?.divisiones?.length > 0) && (
            <select className="m-select" value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} aria-label="Filtrar por grupo o división">
              <option value="">Todos los alumnos</option>
              {datos.divisiones?.length > 0 && (
                <optgroup label="Divisiones">
                  {datos.divisiones.map((d) => <option key={`d-${d.id}`} value={`d-${d.id}`}>{d.nombre}</option>)}
                </optgroup>
              )}
              {datos.grupos?.length > 0 && (
                <optgroup label="Grupos">
                  {datos.grupos.map((g) => <option key={`g-${g.id}`} value={`g-${g.id}`}>{g.nombre}</option>)}
                </optgroup>
              )}
            </select>
          )}
          <button type="button" className="m-boton" onClick={cargar} disabled={cargando}>
            <RefreshCw size={15} className={cargando ? 'm-girando' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {estado && <p className="m-error">{estado}</p>}

      {!datos && cargando && <p className="m-cargando">Cargando métricas…</p>}

      {datos && (cursoDetalle ? (
        <DetalleCurso
          fila={cursoDetalle}
          datos={datosVista}
          perfiles={perfiles}
          desde={desde}
          minimoAprobacion={cursos.find((c) => Number(c.id) === cursoDetalle.courseId)?.minAprobacion || 80}
          conExamen={(cursos.find((c) => Number(c.id) === cursoDetalle.courseId)?.questions?.length || 0) > 0}
          onVolver={() => setCursoAbierto(null)}
          onReporte={notificar && confirmar ? (userId) => setAlumnoReporte(perfiles.find((p) => p.id === userId) || { id: userId, nombre_completo: 'Alumno' }) : null}
        />
      ) : (
        <VistaGeneral resumen={resumen} datos={datosVista} desde={desde} onAbrir={setCursoAbierto} />
      ))}
    </div>
  );
}

// ---- Vista general ------------------------------------------------------------

function VistaGeneral({ resumen, datos, desde, onAbrir }) {
  const t = totales(resumen, datos.sesiones);
  const dias = visitasPorDia(datos.sesiones, desde);
  const sinActividad = datos.sesiones.length === 0;

  const exportar = () => descargarCsv(
    'Metricas_cursos.csv',
    ['Curso', 'Acceso', 'Inscritos', 'Nuevos en el periodo', 'Alumnos activos', 'Visitas', 'Minutos activos',
      'Minutos por alumno', 'Vieron el video completo', 'Presentaron examen', 'Aprobación', 'Certificados', 'Ventas', 'Ingresos MXN', 'Ingresos USD'],
    resumen.map((r) => [
      r.titulo, r.tipo === 'pago' ? 'De pago' : 'Gratis', r.inscritos, r.nuevosInscritos, r.alumnosActivos, r.visitas,
      Math.round(r.minutosActivos), Math.round(r.minutosPorAlumno), formatoPorcentaje(r.porcentajeVieronCompleto),
      r.presentaron, formatoPorcentaje(r.porcentajeAprobacion), r.certificados, r.ventas, r.ingresos.mxn, r.ingresos.usd,
    ])
  );

  return (
    <>
      <div className="m-indicadores m-indicadores--cinco">
        <Indicador etiqueta="Visitas" valor={formatoEntero(t.visitas)} />
        <Indicador etiqueta="Alumnos activos" valor={formatoEntero(t.alumnosActivos)} detalle="entraron al menos una vez" />
        <Indicador etiqueta="Tiempo de estudio" valor={formatoMinutos(t.horasActivas * 60)} detalle="con el aula en pantalla" />
        <Indicador etiqueta="Certificados emitidos" valor={formatoEntero(t.certificados)} detalle={desde ? `${formatoEntero(t.certificadosPeriodo)} en el periodo` : 'desde el inicio'} />
        <Indicador etiqueta="Ingresos por cursos" {...ingresosParaIndicador(t.ingresos, t.ventas)} />
      </div>

      <Tarjeta titulo="Visitas por día" subtitulo="Todos los cursos" ancha>
        {sinActividad ? (
          <p className="m-sin-datos">Todavía no hay visitas registradas en este periodo.</p>
        ) : (
          <GraficaColumnas datos={columnasDeVisitas(dias)} tabla={tablaDeVisitas(dias)} />
        )}
      </Tarjeta>

      <Tarjeta titulo="Cursos" subtitulo="Abre un curso para ver a cada alumno, dónde abandonan el video y cómo les va en el examen." ancha>
        <div className="m-tabla-acciones">
          <button type="button" className="m-boton" onClick={exportar} disabled={!resumen.length}>
            <Download size={15} /> Exportar
          </button>
        </div>
        <div className="m-tabla-scroll">
          <table className="m-tabla">
            <thead>
              <tr>
                <th>Curso</th>
                <th className="num">Inscritos</th>
                <th className="num">Activos</th>
                <th className="num">Visitas</th>
                <th className="num">Min. por alumno</th>
                <th className="num">Vieron completo</th>
                <th className="num">Aprobación</th>
                <th className="num">Certificados</th>
                <th className="num">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.courseId} className="m-fila-clic" tabIndex={0}
                  onClick={() => onAbrir(r.courseId)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(r.courseId); }}
                >
                  <td>
                    <span className="m-curso-nombre">{r.titulo}</span>
                    <span className={`m-chip ${r.tipo === 'pago' ? 'pago' : 'gratis'}`}>
                      {r.tipo === 'pago' && r.precio ? formatoPrecio(r.precio) : 'Gratis'}
                    </span>
                  </td>
                  <td className="num">{formatoEntero(r.inscritos)}</td>
                  <td className="num">{formatoEntero(r.alumnosActivos)}</td>
                  <td className="num">{formatoEntero(r.visitas)}</td>
                  <td className="num">{r.alumnosActivos ? formatoMinutos(r.minutosPorAlumno) : '—'}</td>
                  <td className="num">{formatoPorcentaje(r.porcentajeVieronCompleto)}</td>
                  <td className="num">{formatoPorcentaje(r.porcentajeAprobacion)}</td>
                  <td className="num">{formatoEntero(r.certificados)}</td>
                  <td className="num">{r.ventas ? formatoDinero(r.ingresos) : '—'}</td>
                </tr>
              ))}
              {resumen.length === 0 && (
                <tr><td colSpan={9} className="m-sin-datos">No hay cursos dados de alta.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}

// ---- Detalle de un curso --------------------------------------------------------

const COLUMNAS_ALUMNO = [
  { id: 'nombre', etiqueta: 'Alumno', num: false },
  { id: 'visitas', etiqueta: 'Visitas', num: true },
  { id: 'minutosActivos', etiqueta: 'Tiempo activo', num: true },
  { id: 'avanceVideo', etiqueta: 'Avance del video', num: true },
  { id: 'avanceCurso', etiqueta: 'Avance del curso', num: true },
  { id: 'intentos', etiqueta: 'Intentos', num: true },
  { id: 'mejorCalificacion', etiqueta: 'Mejor calif.', num: true },
  { id: 'ultimaVisita', etiqueta: 'Última visita', num: true },
];

function DetalleCurso({ fila, datos, perfiles, desde, minimoAprobacion, conExamen, onVolver, onReporte }) {
  const [orden, setOrden] = useState({ columna: 'ultimaVisita', desc: true });
  const [alumnoAbierto, setAlumnoAbierto] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const id = fila.courseId;
  const sesiones = useMemo(() => datos.sesiones.filter((s) => s.course_id === id), [datos, id]);
  const actividad = useMemo(() => (datos.actividad || []).filter((s) => Number(s.course_id) === id), [datos, id]);
  // Exámenes y certificados son de todo el historial: el estado del alumno no
  // cambia con el periodo (las visitas y el tiempo sí).
  const eventos = useMemo(() => (datos.examenes || []).filter((e) => Number(e.course_id) === id), [datos, id]);
  const certificados = useMemo(() => (datos.certificados || []).filter((c) => Number(c.course_id) === id), [datos, id]);
  const inscripciones = useMemo(() => datos.inscripciones.filter((i) => i.course_id === id), [datos, id]);
  const lecciones = useMemo(() => (datos.lecciones || []).filter((l) => Number(l.course_id) === id), [datos, id]);
  const progreso = useMemo(() => (datos.progreso || []).filter((p) => Number(p.course_id) === id), [datos, id]);

  // Con lecciones, la curva de abandono es la de cada video, elegible.
  const videos = lecciones.filter((l) => l.tipo === 'video' && progreso.some((p) => p.leccion_id === l.id));
  const [videoElegido, setVideoElegido] = useState(null);
  const videoCurva = videos.find((v) => v.id === videoElegido) || videos[0] || null;
  const embudo = lecciones.length > 1 ? avancePorLeccion({ lecciones, progreso, inscritos: inscripciones.length }) : [];
  const contenido = lecciones.filter((l) => l.tipo !== 'seccion');
  const requeridas = contenido.filter((l) => l.obligatoria !== false);
  const baseAvance = requeridas.length ? requeridas : contenido;
  const idsBase = new Set(baseAvance.map((l) => l.id));
  const leccionesDe = leccionesCompletadasPorAlumno(progreso.filter((p) => idsBase.has(p.leccion_id)));
  const matriz = useMemo(() => matrizDeUnidades({
    lecciones,
    progreso,
    entregas: (datos.entregas || []).filter((e) => Number(e.course_id) === id),
    examenes: eventos,
    intentosEval: (datos.intentosEval || []).filter((e) => Number(e.course_id) === id),
    inscripciones,
    perfiles,
    conExamen: conExamen || eventos.length > 0,
  }), [lecciones, progreso, datos, id, eventos, inscripciones, perfiles, conExamen]);
  const obligatorias = baseAvance.length;

  const dias = visitasPorDia(sesiones, desde);
  const curva = videoCurva
    ? curvaRetencionDeLeccion(progreso.filter((p) => p.leccion_id === videoCurva.id))
    : curvaRetencion(sesiones);
  const caida = mayorCaida(curva);
  const duracionSeg = sesiones.reduce((m, s) => Math.max(m, s.duracion_video_seg || 0), 0) || null;
  const porDispositivo = dispositivos(sesiones);
  const calificaciones = distribucionCalificaciones(eventos);

  // Nombre de los grupos de cada alumno, para ubicarlo de un vistazo.
  const gruposDe = useMemo(() => {
    const nombre = new Map((datos.grupos || []).map((g) => [g.id, g.nombre]));
    const mapa = {};
    for (const m of datos.miembros || []) {
      if (!nombre.has(m.grupo_id)) continue;
      (mapa[m.user_id] ||= []).push(nombre.get(m.grupo_id));
    }
    return mapa;
  }, [datos]);

  const todosLosAlumnos = useMemo(() => porAlumno({ sesiones, eventos, inscripciones, perfiles, certificados, actividad })
    .map((f) => {
      const leccionesHechas = leccionesDe[f.userId] || 0;
      const fila = {
        ...f,
        lecciones: leccionesHechas,
        // Con lecciones, el avance es el del curso; sin ellas, el del video.
        avanceCurso: f.certificado ? 100 : contenido.length
          ? Math.min(100, Math.round((leccionesHechas / (obligatorias || 1)) * 100))
          : f.avanceVideo,
        grupos: (gruposDe[f.userId] || []).join(', '),
      };
      return { ...fila, estado: estadoDe(fila) };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sesiones, actividad, eventos, certificados, inscripciones, perfiles, progreso, gruposDe, lecciones, obligatorias]);

  const conteoEstados = useMemo(() => {
    const c = Object.fromEntries(ESTADOS.map((e) => [e.id, 0]));
    for (const a of todosLosAlumnos) c[a.estado] += 1;
    return c;
  }, [todosLosAlumnos]);

  const alumnos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filas = todosLosAlumnos.filter((a) => (!filtroEstado || a.estado === filtroEstado)
      && (!texto || `${a.nombre} ${a.email} ${a.grupos}`.toLowerCase().includes(texto)));
    const { columna, desc } = orden;
    return filas.sort((a, b) => {
      const va = a[columna] ?? -1;
      const vb = b[columna] ?? -1;
      const cmp = typeof va === 'string' && columna === 'nombre' ? va.localeCompare(vb, 'es') : va > vb ? 1 : va < vb ? -1 : 0;
      return desc ? -cmp : cmp;
    });
  }, [todosLosAlumnos, busqueda, filtroEstado, orden]);

  const aTiempo = (punto) => {
    if (!duracionSeg) return `el ${punto}% del video`;
    const seg = Math.round((punto / 100) * duracionSeg);
    return `el minuto ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  };

  const ordenarPor = (columna) => setOrden((o) => ({ columna, desc: o.columna === columna ? !o.desc : columna !== 'nombre' }));

  const exportar = () => descargarCsv(
    `Alumnos_${fila.titulo.replace(/\s+/g, '_')}.csv`,
    ['Alumno', 'Correo', 'Grupo', 'Acceso', 'Estado', 'Avance del curso %', 'Lecciones completadas', 'Visitas', 'Minutos activos', 'Minutos de video', 'Avance del video %', 'Intentos de examen', 'Mejor calificación', 'Aprobó', 'Certificado', 'Última visita'],
    alumnos.map((a) => [
      a.nombre, a.email, a.grupos, NOMBRE_ORIGEN[a.origen] || '', ESTADO_POR_ID[a.estado].etiqueta, a.avanceCurso, a.lecciones, a.visitas, Math.round(a.minutosActivos), Math.round(a.minutosVideo),
      a.avanceVideo, a.intentos, a.mejorCalificacion ?? '', a.aprobado ? 'Sí' : 'No', a.certificado ? 'Sí' : 'No',
      a.ultimaVisita ? new Date(a.ultimaVisita).toLocaleString('es-MX') : '',
    ])
  );

  return (
    <>
      <div className="m-detalle-cabecera">
        <button type="button" className="m-boton" onClick={onVolver}>
          <ArrowLeft size={15} /> Todos los cursos
        </button>
        <h2>{fila.titulo}</h2>
        <span className={`m-chip ${fila.tipo === 'pago' ? 'pago' : 'gratis'}`}>
          {fila.tipo === 'pago' && fila.precio ? formatoPrecio(fila.precio) : 'Gratis'}
        </span>
      </div>

      <div className="m-indicadores m-indicadores--seis">
        <Indicador etiqueta="Inscritos" valor={formatoEntero(fila.inscritos)} detalle={`${fila.nuevosInscritos} nuevos en el periodo`} />
        <Indicador etiqueta="Alumnos activos" valor={formatoEntero(fila.alumnosActivos)} detalle={`${formatoEntero(fila.visitas)} visitas`} />
        <Indicador etiqueta="Tiempo por alumno" valor={fila.alumnosActivos ? formatoMinutos(fila.minutosPorAlumno) : '—'} detalle={`${formatoMinutos(fila.minutosActivos)} en total`} />
        <Indicador etiqueta="Vieron el video completo" valor={formatoPorcentaje(fila.porcentajeVieronCompleto)} detalle={`${fila.vieronCompleto} de ${fila.alumnosActivos}`} />
        <Indicador
          etiqueta="Aprobación del examen"
          valor={formatoPorcentaje(fila.porcentajeAprobacion)}
          detalle={fila.presentaron ? `${fila.aprobaron} de ${fila.presentaron} · ${fila.intentosPorAlumno.toFixed(1)} intentos c/u` : 'nadie lo ha presentado'}
        />
        {fila.tipo === 'pago' ? (
          <Indicador etiqueta="Ingresos" {...ingresosParaIndicador(fila.ingresos, fila.ventas)} />
        ) : (
          <Indicador etiqueta="Certificados" valor={formatoEntero(fila.certificados)} detalle={desde ? `${formatoEntero(fila.certificadosPeriodo)} en el periodo` : 'emitidos'} />
        )}
      </div>

      {todosLosAlumnos.length > 0 && (
        <Tarjeta
          titulo="¿En qué va cada alumno?"
          subtitulo="Es acumulado: aprobó, reprobó o se certificó en cualquier momento. Toca un estado para ver solo a esos alumnos en la tabla de abajo."
          ancha
        >
          <div className="m-estados" role="group" aria-label="Filtrar alumnos por estado">
            {ESTADOS.map((e) => {
              const n = conteoEstados[e.id];
              const pct = Math.round((n / todosLosAlumnos.length) * 100);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`m-estado-boton${filtroEstado === e.id ? ' activo' : ''}`}
                  aria-pressed={filtroEstado === e.id}
                  onClick={() => setFiltroEstado(filtroEstado === e.id ? '' : e.id)}
                >
                  <span className={`m-estado ${e.clase}`}>{e.etiqueta}</span>
                  <strong>{formatoEntero(n)}</strong>
                  <span className="m-estado-pct">{pct}%</span>
                </button>
              );
            })}
          </div>
        </Tarjeta>
      )}

      {sesiones.length === 0 ? (
        <Tarjeta titulo="Sin actividad" ancha>
          <p className="m-sin-datos">Nadie ha entrado a este curso en el periodo elegido.</p>
        </Tarjeta>
      ) : (
        <div className="m-rejilla">
          {embudo.length > 0 && (
            <Tarjeta
              titulo="¿En qué lección se quedan?"
              subtitulo="Cuántos de los inscritos completaron cada lección, desde el inicio del curso."
              ancha
            >
              <BarrasHorizontales

                filas={embudo.map((e, i) => ({
                  clave: e.leccionId,
                  etiqueta: `${i + 1}. ${e.titulo}`,
                  valor: e.porcentaje,
                  texto: `${e.completaron} · ${Math.round(e.porcentaje)}%`,
                }))}
              />
            </Tarjeta>
          )}

          <Tarjeta
            titulo={videoCurva ? `¿Dónde abandonan el video? · ${videoCurva.titulo}` : '¿Dónde abandonan el video?'}
            subtitulo={caida
              ? `El tramo que más gente pierde va de ${aTiempo(caida.desde)} a ${aTiempo(caida.hasta)}: ahí se va el ${Math.round(caida.caida)}% de quienes lo empezaron.`
              : 'Porcentaje de alumnos que seguía viendo en cada punto del video.'}
            ancha
          >
            {videos.length > 1 && (
              <select className="m-select" value={videoCurva?.id || ''} onChange={(e) => setVideoElegido(Number(e.target.value))} aria-label="Video">
                {videos.map((v) => <option key={v.id} value={v.id}>{v.titulo}</option>)}
              </select>
            )}
            <GraficaRetencion curva={curva} caida={caida} duracionSeg={videoCurva ? null : duracionSeg} />
          </Tarjeta>

          <Tarjeta titulo="Visitas por día">
            <GraficaColumnas datos={columnasDeVisitas(dias)} tabla={tablaDeVisitas(dias)} alto={180} />
          </Tarjeta>

          <Tarjeta titulo="Desde dónde entran" subtitulo="Visitas por tipo de dispositivo">
            <BarrasHorizontales
              filas={porDispositivo.map((d) => ({
                clave: d.tipo,
                etiqueta: NOMBRE_DISPOSITIVO[d.tipo],
                valor: d.visitas,
                texto: `${formatoEntero(d.visitas)} · ${Math.round(d.porcentaje)}%`,
              }))}
            />
          </Tarjeta>

          {fila.intentos > 0 && (
            <Tarjeta
              titulo="Calificaciones del examen"
              subtitulo={`${fila.intentos} intentos desde el inicio · promedio ${Math.round(fila.promedioCalificacion)} · se aprueba con ${minimoAprobacion}`}
              ancha
            >
              <GraficaColumnas
                alto={180}
                umbral={{ indice: Math.floor(minimoAprobacion / 10), etiqueta: `Mínimo ${minimoAprobacion}` }}
                datos={calificaciones.map((t) => ({
                  clave: t.desde,
                  valor: t.intentos,
                  etiquetaEje: `${t.desde}`,
                  detalle: (
                    <>
                      <strong>{t.intentos} {t.intentos === 1 ? 'intento' : 'intentos'}</strong>
                      <span className="m-recuadro-sub">con {t.desde} a {t.hasta} puntos</span>
                    </>
                  ),
                }))}
                tabla={{
                  titulo: 'Calificaciones',
                  encabezados: ['Calificación', 'Intentos'],
                  filas: calificaciones.map((t) => [`${t.desde}–${t.hasta}`, t.intentos]),
                }}
              />
            </Tarjeta>
          )}
        </div>
      )}

      {matriz.columnas.length > 0 && (
        <Tarjeta
          titulo="Matriz de unidades"
          subtitulo="Cada alumno inscrito contra cada lección del curso. Es acumulada: no depende del periodo elegido."
          ancha
        >
          <MatrizUnidades tituloCurso={fila.titulo} matriz={matriz} />
        </Tarjeta>
      )}

      {lecciones.some((l) => l.tipo === 'examen' || l.tipo === 'encuesta') && (
        <Tarjeta
          titulo="Exámenes y encuestas"
          subtitulo="Pregunta por pregunta: qué contestaron y cuántos acertaron. Es acumulado: no depende del periodo elegido."
          ancha
        >
          <AnalisisEvaluaciones
            tituloCurso={fila.titulo}
            lecciones={lecciones}
            intentos={(datos.intentosEval || []).filter((i) => Number(i.course_id) === id)}
            perfiles={perfiles}
            inscritos={inscripciones.length}
          />
        </Tarjeta>
      )}

      <Tarjeta titulo="Alumnos" subtitulo="Visitas y tiempo son del periodo; intentos, calificación y resultado, de todo el historial. Abre un alumno para ver sus visitas." ancha>
        <div className="m-tabla-acciones">
          <label className="m-buscar">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o grupo"
              aria-label="Buscar alumno"
            />
          </label>
          {filtroEstado && (
            <button type="button" className="m-boton" onClick={() => setFiltroEstado('')}>
              {ESTADO_POR_ID[filtroEstado].etiqueta} · quitar filtro
            </button>
          )}
          <button type="button" className="m-boton" onClick={exportar} disabled={!alumnos.length}>
            <Download size={15} /> Exportar
          </button>
        </div>
        <div className="m-tabla-scroll">
          <table className="m-tabla">
            <thead>
              <tr>
                {COLUMNAS_ALUMNO.map((c) => (
                  <th key={c.id} className={c.num ? 'num' : ''} aria-sort={orden.columna === c.id ? (orden.desc ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" className="m-orden" onClick={() => ordenarPor(c.id)}>
                      {c.etiqueta}{orden.columna === c.id ? (orden.desc ? ' ↓' : ' ↑') : ''}
                    </button>
                  </th>
                ))}
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a) => {
                const abierto = alumnoAbierto === a.userId;
                return (
                  <React.Fragment key={a.userId}>
                    <tr className="m-fila-clic" tabIndex={0}
                      onClick={() => setAlumnoAbierto(abierto ? null : a.userId)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setAlumnoAbierto(abierto ? null : a.userId); }}
                    >
                      <td>
                        <span className="m-alumno">
                          {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>
                            {onReporte ? <button type="button" className="m-orden m-curso-nombre" title={`Ver reporte de ${a.nombre}`}
                              onClick={(e) => { e.stopPropagation(); onReporte(a.userId); }} onKeyDown={(e) => e.stopPropagation()}>{a.nombre}</button>
                              : <span className="m-curso-nombre">{a.nombre}</span>}
                            <span className="m-alumno-sub">{NOMBRE_ORIGEN[a.origen] || 'Sin inscripción'}{a.grupos ? ` · ${a.grupos}` : ''}{a.email ? ` · ${a.email}` : ''}</span>
                          </span>
                        </span>
                      </td>
                      <td className="num">{a.visitas}</td>
                      <td className="num">{formatoMinutos(a.minutosActivos)}</td>
                      <td className="num">
                        <span className="m-avance">
                          <span className="m-avance-pista"><span style={{ width: `${a.avanceVideo}%` }} /></span>
                          {a.avanceVideo}%
                        </span>
                      </td>
                      <td className="num">
                        <span className="m-avance" title={lecciones.length ? `${a.lecciones} de ${obligatorias} lecciones` : 'Avance del video'}>
                          <span className="m-avance-pista"><span style={{ width: `${a.avanceCurso}%` }} /></span>
                          {a.avanceCurso}%
                        </span>
                      </td>
                      <td className="num">{a.intentos || '—'}</td>
                      <td className="num">{a.mejorCalificacion ?? '—'}</td>
                      <td className="num">{fechaHora(a.ultimaVisita)}</td>
                      <td>
                        <span className={`m-estado ${ESTADO_POR_ID[a.estado].clase}`}>
                          {a.estado === 'certificado' || a.estado === 'aprobo' ? '✓ ' : ''}{ESTADO_POR_ID[a.estado].etiqueta}
                        </span>
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="m-historial">
                        <td colSpan={9}>
                          <Historial visitas={historialDeAlumno(sesiones, a.userId)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {alumnos.length === 0 && (
                <tr><td colSpan={9} className="m-sin-datos">{todosLosAlumnos.length ? 'Ningún alumno coincide con la búsqueda.' : 'Todavía no hay alumnos en este curso.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}

function Historial({ visitas }) {
  if (!visitas.length) {
    return <p className="m-sin-datos">No ha entrado al curso en este periodo.</p>;
  }
  return (
    <ol className="m-linea-tiempo">
      {visitas.map((v) => (
        <li key={v.id}>
          <span className="m-lt-fecha">{fechaHora(v.inicio)}</span>
          <span>{formatoMinutos(v.minutosActivos)} activo</span>
          <span>{formatoMinutos(v.minutosVideo)} de video</span>
          <span>llegó al {v.avance}%</span>
          <span className="m-lt-disp">{NOMBRE_DISPOSITIVO[v.dispositivo] || '—'}</span>
        </li>
      ))}
    </ol>
  );
}
