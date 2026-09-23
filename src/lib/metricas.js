// Cálculo de las métricas de cursos a partir del registro de actividad.
//
// Funciones puras: reciben filas ya descargadas y devuelven números. Así se
// pueden probar sin base de datos y el panel solo se ocupa de dibujar.
//
// Fuentes:
//   sesiones      -> curso_sesiones (una fila por visita)
//   eventos       -> curso_eventos  (intentos de examen, certificados)
//   inscripciones -> inscripciones  (quién tiene acceso y cómo lo obtuvo)

// Se considera que alguien vio el video completo a partir de aquí: los
// créditos finales y la despedida rara vez se ven.
export const UMBRAL_VIDEO_COMPLETO = 90;

const minutos = (segundos) => (segundos || 0) / 60;

// Fecha local en formato AAAA-MM-DD. `en-CA` es el único locale que la da así.
export const diaLocal = (fecha) => new Date(fecha).toLocaleDateString('en-CA');

const agruparPor = (filas, clave) => {
  const grupos = new Map();
  for (const fila of filas) {
    const k = typeof clave === 'function' ? clave(fila) : fila[clave];
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(fila);
  }
  return grupos;
};

const eventosDeExamen = (eventos) => eventos.filter((e) => e.tipo === 'examen_enviado');

/** Avance máximo en el video por alumno, sumando todas sus visitas. */
function avanceMaximoPorAlumno(sesiones) {
  const avance = new Map();
  for (const s of sesiones) {
    avance.set(s.user_id, Math.max(avance.get(s.user_id) || 0, s.porcentaje_max || 0));
  }
  return avance;
}

/** Una fila por curso, con todo lo que se ve en la tabla general. */
export function resumenPorCurso({ cursos, sesiones, eventos, inscripciones, desde = null }) {
  const sesionesPorCurso = agruparPor(sesiones, 'course_id');
  const eventosPorCurso = agruparPor(eventos, 'course_id');
  const inscripcionesPorCurso = agruparPor(inscripciones, 'course_id');

  return cursos.map((curso) => {
    const id = Number(curso.id);
    const ses = sesionesPorCurso.get(id) || [];
    const evs = eventosPorCurso.get(id) || [];
    const ins = inscripcionesPorCurso.get(id) || [];

    const alumnosActivos = new Set(ses.map((s) => s.user_id)).size;
    const segundosActivos = ses.reduce((t, s) => t + (s.segundos_activos || 0), 0);
    const segundosVideo = ses.reduce((t, s) => t + (s.segundos_video || 0), 0);

    const avance = avanceMaximoPorAlumno(ses);
    const vieronCompleto = [...avance.values()].filter((p) => p >= UMBRAL_VIDEO_COMPLETO).length;

    const examenes = eventosDeExamen(evs);
    const aprobaron = new Set(examenes.filter((e) => e.datos?.aprobado).map((e) => e.user_id)).size;
    const presentaron = new Set(examenes.map((e) => e.user_id)).size;
    const calificaciones = examenes.map((e) => Number(e.datos?.calificacion)).filter(Number.isFinite);

    const enPeriodo = (fecha) => !desde || new Date(fecha) >= desde;
    const pagadas = ins.filter((i) => i.origen === 'pago' && enPeriodo(i.created_at));
    const ingresos = { mxn: 0, usd: 0 };
    for (const p of pagadas) {
      const moneda = String(p.moneda || 'mxn').toLowerCase() === 'usd' ? 'usd' : 'mxn';
      ingresos[moneda] += Number(p.monto) || 0;
    }

    return {
      courseId: id,
      titulo: curso.title,
      tipo: curso.tipo || 'gratis',
      precio: curso.precio_mxn || null,

      inscritos: ins.length,
      nuevosInscritos: ins.filter((i) => enPeriodo(i.created_at)).length,
      alumnosActivos,
      visitas: ses.length,

      minutosActivos: minutos(segundosActivos),
      minutosVideo: minutos(segundosVideo),
      minutosPorAlumno: alumnosActivos ? minutos(segundosActivos) / alumnosActivos : 0,

      vieronCompleto,
      porcentajeVieronCompleto: alumnosActivos ? (vieronCompleto / alumnosActivos) * 100 : null,

      intentos: examenes.length,
      presentaron,
      aprobaron,
      porcentajeAprobacion: presentaron ? (aprobaron / presentaron) * 100 : null,
      intentosPorAlumno: presentaron ? examenes.length / presentaron : null,
      promedioCalificacion: calificaciones.length
        ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
        : null,

      certificados: evs.filter((e) => e.tipo === 'certificado_emitido').length,
      ventas: pagadas.length,
      ingresos,
    };
  });
}

/** Los números de la fila de indicadores, sumando todos los cursos. */
export function totales(resumen, sesiones) {
  return {
    visitas: resumen.reduce((t, r) => t + r.visitas, 0),
    // Un alumno activo en dos cursos es una sola persona.
    alumnosActivos: new Set(sesiones.map((s) => s.user_id)).size,
    horasActivas: resumen.reduce((t, r) => t + r.minutosActivos, 0) / 60,
    certificados: resumen.reduce((t, r) => t + r.certificados, 0),
    ventas: resumen.reduce((t, r) => t + r.ventas, 0),
    ingresos: {
      mxn: resumen.reduce((t, r) => t + r.ingresos.mxn, 0),
      usd: resumen.reduce((t, r) => t + r.ingresos.usd, 0),
    },
  };
}

/**
 * Visitas por día, con los días sin actividad en cero: un hueco en la gráfica
 * tiene que verse como hueco, no desaparecer.
 */
export function visitasPorDia(sesiones, desde, hasta = new Date()) {
  const porDia = agruparPor(sesiones, (s) => diaLocal(s.iniciada_en));

  let inicio = desde;
  if (!inicio) {
    const primera = sesiones.reduce((min, s) => {
      const f = new Date(s.iniciada_en);
      return !min || f < min ? f : min;
    }, null);
    inicio = primera || hasta;
  }

  const dias = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());

  while (cursor <= fin) {
    const clave = diaLocal(cursor);
    const del = porDia.get(clave) || [];
    dias.push({
      fecha: clave,
      visitas: del.length,
      alumnos: new Set(del.map((s) => s.user_id)).size,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

/**
 * Curva de retención del video: qué porcentaje de quienes lo empezaron
 * seguía ahí en cada punto. De aquí sale en qué minuto abandona la gente.
 */
export function curvaRetencion(sesiones, paso = 10) {
  // Quien llegó al umbral cuenta como que lo terminó: sin esto la curva cae
  // de golpe al final por los créditos y parece que todos se van ahí.
  const avance = [...avanceMaximoPorAlumno(sesiones).values()]
    .map((a) => (a >= UMBRAL_VIDEO_COMPLETO ? 100 : a));
  const total = avance.length;
  const puntos = [];

  for (let p = 0; p <= 100; p += paso) {
    const siguen = avance.filter((a) => a >= p).length;
    puntos.push({ punto: p, alumnos: siguen, porcentaje: total ? (siguen / total) * 100 : 0 });
  }
  return { puntos, total };
}

/** El tramo del video donde se pierde más gente. */
export function mayorCaida(curva) {
  let peor = null;
  for (let i = 1; i < curva.puntos.length; i++) {
    const caida = curva.puntos[i - 1].porcentaje - curva.puntos[i].porcentaje;
    // El último tramo (90 -> 100) casi siempre cae por los créditos finales;
    // no es abandono real.
    if (curva.puntos[i].punto > UMBRAL_VIDEO_COMPLETO) continue;
    if (caida > 0 && (!peor || caida > peor.caida)) {
      peor = { desde: curva.puntos[i - 1].punto, hasta: curva.puntos[i].punto, caida };
    }
  }
  return peor;
}

/** Visitas por tipo de dispositivo. */
export function dispositivos(sesiones) {
  const conteo = { escritorio: 0, movil: 0, tablet: 0 };
  for (const s of sesiones) {
    if (s.dispositivo in conteo) conteo[s.dispositivo] += 1;
  }
  const total = sesiones.length;
  return Object.entries(conteo)
    .map(([tipo, visitas]) => ({ tipo, visitas, porcentaje: total ? (visitas / total) * 100 : 0 }))
    .sort((a, b) => b.visitas - a.visitas);
}

/** Distribución de calificaciones en tramos de 10 puntos. */
export function distribucionCalificaciones(eventos) {
  const tramos = Array.from({ length: 10 }, (_, i) => ({
    desde: i * 10,
    hasta: i === 9 ? 100 : i * 10 + 9,
    intentos: 0,
  }));
  for (const e of eventosDeExamen(eventos)) {
    const c = Number(e.datos?.calificacion);
    if (!Number.isFinite(c)) continue;
    tramos[Math.min(9, Math.max(0, Math.floor(c / 10)))].intentos += 1;
  }
  return tramos;
}

/** Una fila por alumno de un curso: lo que se ve en la tabla del detalle. */
export function porAlumno({ sesiones, eventos, inscripciones, perfiles }) {
  const perfilPorId = new Map(perfiles.map((p) => [p.id, p]));
  const sesionesPorAlumno = agruparPor(sesiones, 'user_id');
  const eventosPorAlumno = agruparPor(eventos, 'user_id');
  const inscripcionPorAlumno = new Map(inscripciones.map((i) => [i.user_id, i]));

  // Aparece quien está inscrito y también quien tiene actividad sin inscripción
  // registrada (por ejemplo, un administrador que lo quitó después).
  const ids = new Set([...inscripcionPorAlumno.keys(), ...sesionesPorAlumno.keys()]);

  return [...ids].map((userId) => {
    const ses = sesionesPorAlumno.get(userId) || [];
    const evs = eventosPorAlumno.get(userId) || [];
    const examenes = eventosDeExamen(evs);
    const calificaciones = examenes.map((e) => Number(e.datos?.calificacion)).filter(Number.isFinite);
    const perfil = perfilPorId.get(userId);
    const fechas = ses.map((s) => new Date(s.ultima_senal_en || s.iniciada_en).getTime());

    return {
      userId,
      nombre: perfil?.nombre_completo || perfil?.email || 'Alumno sin perfil',
      email: perfil?.email || '',
      origen: inscripcionPorAlumno.get(userId)?.origen || null,
      inscritoEn: inscripcionPorAlumno.get(userId)?.created_at || null,
      visitas: ses.length,
      minutosActivos: minutos(ses.reduce((t, s) => t + (s.segundos_activos || 0), 0)),
      minutosVideo: minutos(ses.reduce((t, s) => t + (s.segundos_video || 0), 0)),
      avanceVideo: ses.reduce((m, s) => Math.max(m, s.porcentaje_max || 0), 0),
      intentos: examenes.length,
      mejorCalificacion: calificaciones.length ? Math.max(...calificaciones) : null,
      aprobado: examenes.some((e) => e.datos?.aprobado),
      certificado: evs.some((e) => e.tipo === 'certificado_emitido'),
      ultimaVisita: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
    };
  });
}

/** Las visitas de un alumno, la más reciente primero. */
export function historialDeAlumno(sesiones, userId) {
  return sesiones
    .filter((s) => s.user_id === userId)
    .sort((a, b) => new Date(b.iniciada_en) - new Date(a.iniciada_en))
    .map((s) => ({
      id: s.id,
      inicio: s.iniciada_en,
      fin: s.ultima_senal_en,
      minutosActivos: minutos(s.segundos_activos),
      minutosVideo: minutos(s.segundos_video),
      avance: s.porcentaje_max || 0,
      dispositivo: s.dispositivo,
    }));
}

// ---- Formato ------------------------------------------------------------------

export const formatoEntero = (n) => Math.round(n || 0).toLocaleString('es-MX');

export function formatoMinutos(min) {
  if (!min) return '0 min';
  if (min < 1) return '< 1 min';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatoPorcentaje = (p) => (p == null ? '—' : `${Math.round(p)}%`);

export function formatoDinero(ingresos) {
  const partes = [];
  if (ingresos.mxn) partes.push(`$${formatoEntero(ingresos.mxn)} MXN`);
  if (ingresos.usd) partes.push(`US$${formatoEntero(ingresos.usd)}`);
  return partes.length ? partes.join(' · ') : '$0';
}

/**
 * Cuántos alumnos completaron cada lección del curso, en orden. Es el embudo
 * del curso: dice en qué lección se atora la gente. El porcentaje es sobre los
 * inscritos, que son quienes podrían haberla hecho.
 */
export function avancePorLeccion({ lecciones, progreso, inscritos }) {
  const completas = new Map();
  for (const p of progreso) {
    if (!p.completada) continue;
    completas.set(p.leccion_id, (completas.get(p.leccion_id) || 0) + 1);
  }
  return [...lecciones]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id)
    .map((l) => {
      const completaron = completas.get(l.id) || 0;
      return {
        leccionId: l.id,
        titulo: l.titulo,
        tipo: l.tipo,
        completaron,
        porcentaje: inscritos ? Math.min(100, (completaron / inscritos) * 100) : 0,
      };
    });
}

/** Lecciones completadas por alumno en un curso: { user_id: cantidad }. */
export function leccionesCompletadasPorAlumno(progreso) {
  const conteo = {};
  for (const p of progreso) if (p.completada) conteo[p.user_id] = (conteo[p.user_id] || 0) + 1;
  return conteo;
}

/**
 * Curva de retención de una lección de video, a partir de su avance guardado
 * (uno por alumno). Mismo formato que curvaRetencion.
 */
export function curvaRetencionDeLeccion(progresoDeLeccion) {
  return curvaRetencion(progresoDeLeccion.map((p) => ({
    user_id: p.user_id,
    porcentaje_max: p.completada ? 100 : p.porcentaje || 0,
  })));
}
