import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante, formatoPrecio } from '../../lib/cursos';
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
  formatoEntero,
  formatoMinutos,
  formatoPorcentaje,
  formatoDinero,
} from '../../lib/metricas';
import { GraficaColumnas, GraficaRetencion, BarrasHorizontales } from './GraficasMetricas';
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
const NOMBRE_ORIGEN = { gratis: 'Gratis', pago: 'Pagó', admin: 'Beca / admin', previo: 'Antes del registro' };

function inicioDelPeriodo(periodoId) {
  const periodo = PERIODOS.find((p) => p.id === periodoId);
  if (!periodo?.dias) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (periodo.dias - 1));
  return d;
}

// Supabase entrega 1,000 filas por petición; se piden en tandas hasta agotar.
async function traerTodo(tabla, columnas, filtrar) {
  const filas = [];
  const TANDA = 1000;
  for (let desde = 0; ; desde += TANDA) {
    const consulta = filtrar(supabase.from(tabla).select(columnas).order('id').range(desde, desde + TANDA - 1));
    const { data, error } = await consulta;
    if (error) throw error;
    filas.push(...data);
    if (data.length < TANDA) break;
  }
  return filas;
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

export default function MetricasCursos({ cursos, perfiles }) {
  const [periodo, setPeriodo] = useState('30');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState(null); // null | 'sin-migracion' | mensaje de error
  const [cursoAbierto, setCursoAbierto] = useState(null);

  const desde = useMemo(() => inicioDelPeriodo(periodo), [periodo]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setEstado(null);
    try {
      const desdeIso = desde ? desde.toISOString() : null;
      const [sesiones, eventos, inscripciones] = await Promise.all([
        traerTodo(
          'curso_sesiones',
          'id, user_id, course_id, iniciada_en, ultima_senal_en, segundos_activos, segundos_video, posicion_max_seg, duracion_video_seg, porcentaje_max, dispositivo',
          (q) => (desdeIso ? q.gte('iniciada_en', desdeIso) : q)
        ),
        traerTodo(
          'curso_eventos',
          'id, user_id, course_id, tipo, datos, creado_en',
          (q) => (desdeIso ? q.gte('creado_en', desdeIso) : q)
        ),
        // Las inscripciones van completas: "inscritos" es un total, no del periodo.
        traerTodo('inscripciones', 'id, user_id, course_id, origen, monto, moneda, created_at', (q) => q),
      ]);
      setDatos({ sesiones, eventos, inscripciones });
    } catch (err) {
      if (esTablaFaltante(err)) setEstado('sin-migracion');
      else setEstado(err.message || 'No se pudieron cargar las métricas.');
    } finally {
      setCargando(false);
    }
  }, [desde]);

  useEffect(() => { void cargar(); }, [cargar]);

  const resumen = useMemo(() => {
    if (!datos) return [];
    return resumenPorCurso({ cursos, ...datos, desde })
      .sort((a, b) => b.visitas - a.visitas || b.inscritos - a.inscritos);
  }, [datos, cursos, desde]);

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
        <button type="button" className="m-boton" onClick={() => void cargar()} disabled={cargando}>
          <RefreshCw size={15} className={cargando ? 'm-girando' : ''} /> Actualizar
        </button>
      </div>

      {estado && <p className="m-error">{estado}</p>}

      {!datos && cargando && <p className="m-cargando">Cargando métricas…</p>}

      {datos && (cursoDetalle ? (
        <DetalleCurso
          fila={cursoDetalle}
          datos={datos}
          perfiles={perfiles}
          desde={desde}
          minimoAprobacion={cursos.find((c) => Number(c.id) === cursoDetalle.courseId)?.minAprobacion || 80}
          onVolver={() => setCursoAbierto(null)}
        />
      ) : (
        <VistaGeneral resumen={resumen} datos={datos} desde={desde} onAbrir={setCursoAbierto} />
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
        <Indicador etiqueta="Certificados emitidos" valor={formatoEntero(t.certificados)} />
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
  { id: 'intentos', etiqueta: 'Intentos', num: true },
  { id: 'mejorCalificacion', etiqueta: 'Mejor calif.', num: true },
  { id: 'ultimaVisita', etiqueta: 'Última visita', num: true },
];

function DetalleCurso({ fila, datos, perfiles, desde, minimoAprobacion, onVolver }) {
  const [orden, setOrden] = useState({ columna: 'ultimaVisita', desc: true });
  const [alumnoAbierto, setAlumnoAbierto] = useState(null);

  const id = fila.courseId;
  const sesiones = useMemo(() => datos.sesiones.filter((s) => s.course_id === id), [datos, id]);
  const eventos = useMemo(() => datos.eventos.filter((e) => e.course_id === id), [datos, id]);
  const inscripciones = useMemo(() => datos.inscripciones.filter((i) => i.course_id === id), [datos, id]);

  const dias = visitasPorDia(sesiones, desde);
  const curva = curvaRetencion(sesiones);
  const caida = mayorCaida(curva);
  const duracionSeg = sesiones.reduce((m, s) => Math.max(m, s.duracion_video_seg || 0), 0) || null;
  const porDispositivo = dispositivos(sesiones);
  const calificaciones = distribucionCalificaciones(eventos);

  const alumnos = useMemo(() => {
    const filas = porAlumno({ sesiones, eventos, inscripciones, perfiles });
    const { columna, desc } = orden;
    return filas.sort((a, b) => {
      const va = a[columna] ?? -1;
      const vb = b[columna] ?? -1;
      const cmp = typeof va === 'string' && columna === 'nombre' ? va.localeCompare(vb, 'es') : va > vb ? 1 : va < vb ? -1 : 0;
      return desc ? -cmp : cmp;
    });
  }, [sesiones, eventos, inscripciones, perfiles, orden]);

  const aTiempo = (punto) => {
    if (!duracionSeg) return `el ${punto}% del video`;
    const seg = Math.round((punto / 100) * duracionSeg);
    return `el minuto ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  };

  const ordenarPor = (columna) => setOrden((o) => ({ columna, desc: o.columna === columna ? !o.desc : columna !== 'nombre' }));

  const exportar = () => descargarCsv(
    `Alumnos_${fila.titulo.replace(/\s+/g, '_')}.csv`,
    ['Alumno', 'Correo', 'Acceso', 'Visitas', 'Minutos activos', 'Minutos de video', 'Avance del video %', 'Intentos de examen', 'Mejor calificación', 'Aprobó', 'Certificado', 'Última visita'],
    alumnos.map((a) => [
      a.nombre, a.email, NOMBRE_ORIGEN[a.origen] || '', a.visitas, Math.round(a.minutosActivos), Math.round(a.minutosVideo),
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
          <Indicador etiqueta="Certificados" valor={formatoEntero(fila.certificados)} detalle="emitidos en el periodo" />
        )}
      </div>

      {sesiones.length === 0 ? (
        <Tarjeta titulo="Sin actividad" ancha>
          <p className="m-sin-datos">Nadie ha entrado a este curso en el periodo elegido.</p>
        </Tarjeta>
      ) : (
        <div className="m-rejilla">
          <Tarjeta
            titulo="¿Dónde abandonan el video?"
            subtitulo={caida
              ? `El tramo que más gente pierde va de ${aTiempo(caida.desde)} a ${aTiempo(caida.hasta)}: ahí se va el ${Math.round(caida.caida)}% de quienes lo empezaron.`
              : 'Porcentaje de alumnos que seguía viendo en cada punto del video.'}
            ancha
          >
            <GraficaRetencion curva={curva} caida={caida} duracionSeg={duracionSeg} />
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
              subtitulo={`${fila.intentos} intentos · promedio ${Math.round(fila.promedioCalificacion)} · se aprueba con ${minimoAprobacion}`}
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

      <Tarjeta titulo="Alumnos" subtitulo="Abre un alumno para ver cada una de sus visitas." ancha>
        <div className="m-tabla-acciones">
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
                            <span className="m-curso-nombre">{a.nombre}</span>
                            <span className="m-alumno-sub">{NOMBRE_ORIGEN[a.origen] || 'Sin inscripción'}{a.email ? ` · ${a.email}` : ''}</span>
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
                      <td className="num">{a.intentos || '—'}</td>
                      <td className="num">{a.mejorCalificacion ?? '—'}</td>
                      <td className="num">{fechaHora(a.ultimaVisita)}</td>
                      <td>
                        {a.certificado ? <span className="m-estado ok">✓ Certificado</span>
                          : a.aprobado ? <span className="m-estado ok">✓ Aprobó</span>
                            : a.intentos ? <span className="m-estado aviso">Reprobó</span>
                              : a.visitas ? <span className="m-estado">Cursando</span>
                                : <span className="m-estado apagado">Sin entrar</span>}
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="m-historial">
                        <td colSpan={8}>
                          <Historial visitas={historialDeAlumno(sesiones, a.userId)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {alumnos.length === 0 && (
                <tr><td colSpan={8} className="m-sin-datos">Todavía no hay alumnos en este curso.</td></tr>
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
