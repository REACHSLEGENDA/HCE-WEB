// Analíticas de toda la plataforma y línea de tiempo general (como
// "Analíticas" y "Línea de tiempo" de los informes de TalentLMS). Solo cálculo.

const DIA = 24 * 60 * 60 * 1000;

// ---- Analíticas -----------------------------------------------------------------

export function analiticasPlataforma({ perfiles, cursos, inscripciones, certificados, lecciones, progreso, visitas, logins, archivos = [] }, ahora = Date.now()) {
  const alumnos = perfiles.filter((p) => p.rol !== 'admin');
  const hace30 = ahora - 30 * DIA;

  // Estado de cada inscripción.
  const certificadoDe = new Set(certificados.map((c) => `${c.user_id}:${c.course_id}`));
  const conActividad = new Set([
    ...progreso.filter((p) => p.completada || p.porcentaje > 0).map((p) => `${p.user_id}:${p.course_id}`),
    ...visitas.map((v) => `${v.user_id}:${v.course_id}`),
  ]);
  const estados = { completado: 0, en_curso: 0, no_empezado: 0 };
  for (const i of inscripciones) {
    const clave = `${i.user_id}:${i.course_id}`;
    if (certificadoDe.has(clave)) estados.completado += 1;
    else if (conActividad.has(clave)) estados.en_curso += 1;
    else estados.no_empezado += 1;
  }
  const totalInscripciones = inscripciones.length;

  // Tiempo promedio de inscribirse a certificarse.
  const inscritoEn = new Map(inscripciones.map((i) => [`${i.user_id}:${i.course_id}`, new Date(i.created_at).getTime()]));
  const tiempos = certificados
    .map((c) => new Date(c.created_at).getTime() - (inscritoEn.get(`${c.user_id}:${c.course_id}`) ?? NaN))
    .filter((t) => Number.isFinite(t) && t >= 0);

  const calificaciones = certificados.map((c) => Number(c.score)).filter(Number.isFinite);
  const conContenido = lecciones.filter((l) => l.tipo !== 'seccion');

  // Certificados vigentes, por vencer en 30 días y vencidos.
  const vigencia = { vigente: 0, por_vencer: 0, vencido: 0 };
  for (const c of certificados) {
    if (!c.vigente_hasta) { vigencia.vigente += 1; continue; }
    const vence = new Date(c.vigente_hasta).getTime();
    if (vence < ahora) vigencia.vencido += 1;
    else if (vence < ahora + 30 * DIA) vigencia.por_vencer += 1;
    else vigencia.vigente += 1;
  }

  const idsLogin30 = new Set(logins.filter((l) => new Date(l.creado_en).getTime() >= hace30).map((l) => l.user_id));
  const idsInscritos = new Set(inscripciones.map((i) => i.user_id));
  const idsActivos30 = new Set(visitas.filter((v) => new Date(v.iniciada_en).getTime() >= hace30).map((v) => v.user_id));
  const pct = (a, b) => (b ? (a / b) * 100 : 0);

  // Horas de formación por curso.
  const segundosPorCurso = new Map();
  for (const v of visitas) segundosPorCurso.set(Number(v.course_id), (segundosPorCurso.get(Number(v.course_id)) || 0) + (v.segundos_activos || 0));
  const formacion = cursos
    .map((c) => ({ courseId: Number(c.id), titulo: c.title, segundos: segundosPorCurso.get(Number(c.id)) || 0 }))
    .filter((c) => c.segundos > 0)
    .sort((a, b) => b.segundos - a.segundos);

  return {
    usuarios: { total: perfiles.length, alumnos: alumnos.length, admins: perfiles.length - alumnos.length, activos30: idsActivos30.size },
    progreso: {
      total: totalInscripciones,
      completado: pct(estados.completado, totalInscripciones),
      en_curso: pct(estados.en_curso, totalInscripciones),
      no_empezado: pct(estados.no_empezado, totalInscripciones),
      cuentas: estados,
    },
    cursos: {
      total: cursos.length,
      puntuacionMedia: calificaciones.length ? calificaciones.reduce((t, c) => t + c, 0) / calificaciones.length : null,
      tiempoFinalizacionSeg: tiempos.length ? tiempos.reduce((t, c) => t + c, 0) / tiempos.length / 1000 : null,
      tasaFinalizacion: pct(estados.completado, totalInscripciones),
      actividades: conContenido.filter((l) => ['examen', 'encuesta', 'tarea', 'sesion'].includes(l.tipo)).length,
    },
    analisis: {
      iniciosSesion: pct(idsLogin30.size, alumnos.length),
      inscripciones: pct(idsInscritos.size, alumnos.length),
      participacion: pct([...idsActivos30].filter((id) => idsInscritos.has(id)).length, idsInscritos.size),
      finalizacion: pct(estados.completado, totalInscripciones),
    },
    biblioteca: {
      total: conContenido.length + archivos.length,
      videos: conContenido.filter((l) => l.tipo === 'video').length,
      documentos: conContenido.filter((l) => l.tipo === 'pdf').length + archivos.length,
      lecturas: conContenido.filter((l) => l.tipo === 'texto' || l.tipo === 'web').length,
      evaluaciones: conContenido.filter((l) => l.tipo === 'examen' || l.tipo === 'encuesta').length,
      sesiones: conContenido.filter((l) => l.tipo === 'sesion').length,
    },
    certificados: { total: certificados.length, ...vigencia },
    formacion,
  };
}

// ---- Línea de tiempo --------------------------------------------------------------

const ACCIONES_ADMIN = {
  cuenta_activada: (o) => `activó la cuenta de ${o}`,
  cuenta_rechazada: (o) => `rechazó la cuenta de ${o}`,
  cuenta_bloqueada: (o) => `bloqueó la cuenta de ${o}`,
  cuenta_reactivada: (o) => `reactivó la cuenta de ${o}`,
  inscripcion_admin: (o, c) => `inscribió a ${o} en ${c}`,
  baja_curso: (o, c) => `dio de baja a ${o} de ${c}`,
  solicitud_aprobada: (o, c) => `aprobó la solicitud de ${o} para ${c}`,
  solicitud_rechazada: (o, c) => `rechazó la solicitud de ${o} para ${c}`,
  curso_clonado: (o, c) => `clonó un curso como ${c}`,
  leccion_copiada: (o, c) => `copió una lección a ${c}`,
};

export const TIPOS_EVENTO = {
  login: 'Inicios de sesión',
  inscripcion: 'Inscripciones',
  leccion: 'Lecciones completadas',
  evaluacion: 'Exámenes y encuestas',
  tarea: 'Tareas',
  sesion: 'Sesiones en vivo',
  certificado: 'Certificados',
  descarga: 'Descargas',
  admin: 'Acciones de administradores',
};

export function eventosPlataforma({ perfiles, cursos, lecciones, actividad = [], inscripciones = [], progreso = [], intentos = [], examenesFinales = [], entregas = [], asistencias = [], certificados = [] }) {
  const nombre = new Map(perfiles.map((p) => [p.id, p.nombre_completo || p.email || 'Alguien']));
  const persona = (id) => nombre.get(id) || 'Un usuario';
  const curso = (id) => cursos.find((c) => Number(c.id) === Number(id))?.title || 'un curso';
  const leccion = (id) => lecciones.find((l) => l.id === id);

  const eventos = [
    ...actividad.map((a) => {
      if (a.tipo === 'login') return { tipo: 'login', fecha: a.creado_en, userId: a.user_id, texto: `${persona(a.user_id)} ha iniciado sesión` };
      if (a.tipo === 'descarga') return { tipo: 'descarga', fecha: a.creado_en, userId: a.user_id, texto: `${persona(a.user_id)} descargó el archivo ${a.detalle?.nombre || ''} (${curso(a.course_id)})` };
      const texto = ACCIONES_ADMIN[a.detalle?.accion]?.(persona(a.objetivo_user_id), curso(a.course_id)) || a.detalle?.accion || 'hizo un cambio';
      return { tipo: 'admin', fecha: a.creado_en, userId: a.user_id, texto: `${persona(a.user_id)} ${texto}` };
    }),
    ...inscripciones.map((i) => ({ tipo: 'inscripcion', fecha: i.created_at, userId: i.user_id, texto: `${persona(i.user_id)} fue inscrito en ${curso(i.course_id)}${i.origen === 'pago' ? ' (pagó)' : ''}` })),
    ...progreso.filter((p) => p.completada && p.completada_en).map((p) => {
      const l = leccion(p.leccion_id);
      return { tipo: 'leccion', fecha: p.completada_en, userId: p.user_id, texto: `${persona(p.user_id)} completó la unidad ${l?.titulo || ''} (${curso(p.course_id)})` };
    }),
    ...intentos.map((i) => {
      const l = leccion(i.leccion_id);
      const texto = i.calificacion == null
        ? `respondió la encuesta ${l?.titulo || ''}`
        : `${i.aprobado ? 'ha aprobado' : 'no aprobó'} la unidad ${l?.titulo || ''} (score: ${Number(i.calificacion).toFixed(2)}%)`;
      return { tipo: 'evaluacion', fecha: i.enviado_en, userId: i.user_id, aprobado: i.aprobado, texto: `${persona(i.user_id)} ${texto}` };
    }),
    ...examenesFinales.map((e) => ({
      tipo: 'evaluacion', fecha: e.creado_en, userId: e.user_id, aprobado: !!e.datos?.aprobado,
      texto: `${persona(e.user_id)} ${e.datos?.aprobado ? 'ha aprobado' : 'no aprobó'} el examen final de ${curso(e.course_id)} (score: ${Number(e.datos?.calificacion || 0).toFixed(2)}%)`,
    })),
    ...entregas.map((e) => ({ tipo: 'tarea', fecha: e.creada_en, userId: e.user_id, texto: `${persona(e.user_id)} entregó la tarea ${leccion(e.leccion_id)?.titulo || ''}` })),
    ...asistencias.filter((r) => r.asistio && r.verificado_en).map((r) => ({ tipo: 'sesion', fecha: r.verificado_en, userId: r.user_id, texto: `${persona(r.user_id)} asistió a la sesión ${leccion(r.leccion_id)?.titulo || ''}` })),
    ...certificados.map((c) => ({ tipo: 'certificado', fecha: c.created_at, userId: c.user_id, texto: `${persona(c.user_id)} obtuvo el certificado de ${curso(c.course_id)}` })),
  ];

  return eventos.filter((e) => e.fecha).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/** "hace 18 horas", "hace 2 días", o la fecha. */
export function haceCuanto(iso, ahora = Date.now()) {
  const seg = Math.max(0, (ahora - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} ${Math.floor(seg / 3600) === 1 ? 'hora' : 'horas'}`;
  if (seg < 7 * 86400) return `hace ${Math.floor(seg / 86400)} ${Math.floor(seg / 86400) === 1 ? 'día' : 'días'}`;
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
