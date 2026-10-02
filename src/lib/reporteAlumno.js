// Reporte de un alumno, como la ficha de usuario de TalentLMS: visión general,
// cursos, actividades (exámenes, encuestas, tareas, sesiones), insignias,
// certificados y línea de tiempo. Aquí solo hay cálculo; la carga de datos
// vive en cargarDatosAlumno (reporteAlumnoDatos.js).

export const ESTADOS_ACTIVIDAD = {
  aprobado: { texto: 'Aprobado', grupo: 'completada' },
  completado: { texto: 'Completado', grupo: 'completada' },
  asistio: { texto: 'Asistió', grupo: 'completada' },
  revision: { texto: 'En revisión', grupo: 'progreso' },
  registrado: { texto: 'Registrado', grupo: 'progreso' },
  no_aprobado: { texto: 'No aprobado', grupo: 'no_aprobada' },
  corregir: { texto: 'Por corregir', grupo: 'no_aprobada' },
  no_presentado: { texto: 'No presentado', grupo: 'no_empezada' },
};

export const FORMATOS = { examen: 'Test', encuesta: 'Encuesta', tarea: 'Tarea', sesion: 'Sesión en vivo', examen_final: 'Examen final' };

import { tasaFinalizacion } from './informes';
import { diaLocal } from './metricas';

const porFecha = (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0);
const ultimo = (lista, campo) => lista.reduce((m, x) => (!m || new Date(x[campo]) > new Date(m[campo]) ? x : m), null);

export function construirReporte(datos, cursos, ahora = Date.now()) {
  const {
    inscripciones = [], lecciones = [], progreso = [], intentos = [], entregas = [],
    sesionRegistros = [], sesionesHorario = [], certificados = [], visitas = [], examenesFinales = [], webinars = [],
  } = datos;

  const tituloCurso = (id) => cursos.find((c) => Number(c.id) === Number(id))?.title || `Curso ${id}`;
  const conPreguntas = (id) => (cursos.find((c) => Number(c.id) === Number(id))?.questions?.length || 0) > 0;
  const completada = new Map(progreso.filter((p) => p.completada).map((p) => [p.leccion_id, p]));
  const horario = new Map(sesionesHorario.map((s) => [s.leccion_id, s]));

  // ---- Cursos -----------------------------------------------------------------
  const cursosAlumno = inscripciones.map((i) => {
    const deCurso = lecciones.filter((l) => Number(l.course_id) === Number(i.course_id) && l.tipo !== 'seccion');
    const obligatorias = deCurso.filter((l) => l.obligatoria !== false);
    const base = obligatorias.length ? obligatorias : deCurso;
    const hechas = base.filter((l) => completada.has(l.id)).length;
    const cert = certificados.find((c) => Number(c.course_id) === Number(i.course_id));
    const segundos = visitas.filter((v) => Number(v.course_id) === Number(i.course_id)).reduce((t, v) => t + (v.segundos_activos || 0), 0);
    const avance = cert ? 100 : base.length ? Math.round((hechas / base.length) * 100) : 0;
    return {
      courseId: Number(i.course_id),
      titulo: tituloCurso(i.course_id),
      inscritoEn: i.created_at,
      origen: i.origen,
      avance,
      lecciones: `${hechas} de ${base.length}`,
      estado: cert ? 'completado' : avance > 0 || segundos > 0 ? 'en_curso' : 'no_empezado',
      calificacion: cert?.score ?? null,
      certificadoEn: cert?.created_at || null,
      segundos,
    };
  });

  // ---- Actividades --------------------------------------------------------------
  const actividades = [];
  for (const l of lecciones) {
    if (!['examen', 'encuesta', 'tarea', 'sesion'].includes(l.tipo)) continue;
    const base = { leccionId: l.id, courseId: Number(l.course_id), titulo: l.titulo, formato: l.tipo, curso: tituloCurso(l.course_id), puntuacion: null, duracionSeg: null, fecha: null, reiniciable: false };

    if (l.tipo === 'examen' || l.tipo === 'encuesta') {
      const propios = intentos.filter((it) => it.leccion_id === l.id);
      const ult = ultimo(propios, 'enviado_en');
      const aprobado = propios.find((it) => it.aprobado);
      const mejor = propios.reduce((m, it) => (it.calificacion != null && Number(it.calificacion) > (m ?? -1) ? Number(it.calificacion) : m), null);
      const estado = !propios.length ? 'no_presentado'
        : l.tipo === 'encuesta' ? 'completado'
          : aprobado ? 'aprobado' : 'no_aprobado';
      actividades.push({
        ...base,
        estado,
        puntuacion: l.tipo === 'examen' ? mejor : null,
        fecha: (aprobado || ult)?.enviado_en || null,
        duracionSeg: (aprobado || ult)?.duracion_seg ?? null,
        intentos: propios.length,
        reiniciable: propios.length > 0,
      });
      continue;
    }

    if (l.tipo === 'tarea') {
      const ult = ultimo(entregas.filter((e) => e.leccion_id === l.id), 'creada_en');
      const estado = !ult ? 'no_presentado' : ult.estado === 'aprobada' ? 'aprobado' : ult.estado === 'rechazada' ? 'corregir' : 'revision';
      actividades.push({ ...base, estado, fecha: ult?.revisada_en || ult?.creada_en || null });
      continue;
    }

    const registro = sesionRegistros.find((r) => r.leccion_id === l.id);
    const h = horario.get(l.id);
    const terminada = h ? ahora > new Date(h.inicia_en).getTime() + (h.duracion_min || 60) * 60000 : false;
    const estado = registro?.asistio ? 'asistio' : registro && !terminada ? 'registrado' : 'no_presentado';
    actividades.push({ ...base, estado, fecha: h?.inicia_en || null, duracionSeg: registro?.minutos ? registro.minutos * 60 : null });
  }

  // Examen final de cada curso inscrito que lo tenga.
  for (const c of cursosAlumno) {
    const propios = examenesFinales.filter((e) => Number(e.course_id) === c.courseId);
    if (!conPreguntas(c.courseId) && !propios.length) continue;
    const aprobado = propios.find((e) => e.datos?.aprobado);
    const mejor = propios.reduce((m, e) => (Number.isFinite(Number(e.datos?.calificacion)) && Number(e.datos.calificacion) > (m ?? -1) ? Number(e.datos.calificacion) : m), null);
    actividades.push({
      leccionId: null,
      courseId: c.courseId,
      titulo: 'Examen final',
      formato: 'examen_final',
      curso: c.titulo,
      estado: aprobado ? 'aprobado' : propios.length ? 'no_aprobado' : 'no_presentado',
      puntuacion: mejor,
      fecha: (aprobado || ultimo(propios, 'creado_en'))?.creado_en || null,
      duracionSeg: null,
      intentos: propios.length,
      reiniciable: false,
    });
  }

  // ---- Indicadores ---------------------------------------------------------------
  const cuenta = (grupo) => actividades.filter((a) => ESTADOS_ACTIVIDAD[a.estado].grupo === grupo).length;
  const segundosTotales = visitas.reduce((t, v) => t + (v.segundos_activos || 0), 0);
  const indicadores = {
    // Misma definición que Analíticas y Divisiones (certificados ÷ inscripciones).
    tasaFinalizacion: tasaFinalizacion(cursosAlumno.filter((c) => c.estado === 'completado').length, cursosAlumno.length),
    completadas: cuenta('completada'),
    enProgreso: cuenta('progreso'),
    noAprobadas: cuenta('no_aprobada'),
    noEmpezadas: cuenta('no_empezada'),
    segundosFormacion: segundosTotales,
  };

  // ---- Logros (mismo criterio que la tabla de posiciones) --------------------------
  // Los días se cuentan en la zona horaria del navegador, no en UTC: una visita
  // a las 8 p. m. en México es del mismo día, no del siguiente.
  const diasEstudio = new Set(visitas.filter((v) => v.iniciada_en).map((v) => diaLocal(v.iniciada_en))).size;
  const primerIntento = examenesFinales.filter((e) => e.datos?.aprobado && Number(e.datos?.intento || 1) === 1).length
    + new Set(intentos.filter((i) => i.aprobado && i.numero === 1).map((i) => i.leccion_id)).size;
  const perfectos = examenesFinales.filter((e) => Number(e.datos?.calificacion) === 100).length
    + intentos.filter((i) => Number(i.calificacion) === 100).length;
  const logros = {
    examenes: new Set(intentos.filter((i) => i.aprobado).map((i) => i.leccion_id)).size,
    encuestas: new Set(intentos.filter((i) => i.calificacion == null).map((i) => i.leccion_id)).size,
    tareas: new Set(entregas.map((e) => e.leccion_id)).size,
    sesiones: sesionRegistros.filter((r) => r.asistio).length,
    lecciones: completada.size,
    dias: diasEstudio,
    primer_intento: primerIntento,
    perfectos,
    certificados: certificados.length,
    webinars: webinars.filter((w) => w.asistio).length,
  };

  // ---- Línea de tiempo ------------------------------------------------------------
  const tituloLeccion = (id) => lecciones.find((l) => l.id === id)?.titulo || 'una lección';
  const cursoDeLeccion = (id) => tituloCurso(lecciones.find((l) => l.id === id)?.course_id);
  const eventos = [
    ...inscripciones.map((i) => ({ tipo: 'inscripcion', fecha: i.created_at, texto: `Se inscribió en ${tituloCurso(i.course_id)}` })),
    ...progreso.filter((p) => p.completada && p.completada_en).map((p) => ({
      tipo: 'leccion', fecha: p.completada_en, texto: `Completó la lección ${tituloLeccion(p.leccion_id)} (${cursoDeLeccion(p.leccion_id)})`,
    })),
    ...intentos.map((i) => ({
      tipo: i.aprobado ? 'aprobado' : i.calificacion == null ? 'encuesta' : 'reprobado',
      fecha: i.enviado_en,
      texto: i.calificacion == null
        ? `Respondió la encuesta ${tituloLeccion(i.leccion_id)}`
        : `${i.aprobado ? 'Aprobó' : 'No aprobó'} ${tituloLeccion(i.leccion_id)} (score: ${Math.round(Number(i.calificacion))}%)`,
    })),
    ...examenesFinales.map((e) => ({
      tipo: e.datos?.aprobado ? 'aprobado' : 'reprobado',
      fecha: e.creado_en,
      texto: `${e.datos?.aprobado ? 'Aprobó' : 'No aprobó'} el examen final de ${tituloCurso(e.course_id)} (score: ${Math.round(Number(e.datos?.calificacion) || 0)}%)`,
    })),
    ...entregas.map((e) => ({ tipo: 'tarea', fecha: e.creada_en, texto: `Entregó la tarea ${tituloLeccion(e.leccion_id)}` })),
    ...sesionRegistros.filter((r) => r.asistio && r.verificado_en).map((r) => ({
      tipo: 'sesion', fecha: r.verificado_en, texto: `Asistió a la sesión en vivo ${tituloLeccion(r.leccion_id)}`,
    })),
    ...certificados.map((c) => ({ tipo: 'certificado', fecha: c.created_at, texto: `Obtuvo el certificado de ${tituloCurso(c.course_id)}` })),
    ...visitas.map((v) => ({ tipo: 'visita', fecha: v.iniciada_en, texto: `Entró a ${tituloCurso(v.course_id)}` })),
  ].filter((e) => e.fecha).sort(porFecha);

  return {
    indicadores,
    cursos: cursosAlumno.sort((a, b) => new Date(b.inscritoEn || 0) - new Date(a.inscritoEn || 0)),
    actividades: actividades.sort((a, b) => a.curso.localeCompare(b.curso, 'es') || a.titulo.localeCompare(b.titulo, 'es')),
    logros,
    certificados,
    eventos,
  };
}

export function duracionTexto(seg) {
  if (seg == null) return '—';
  const s = Math.round(seg);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
