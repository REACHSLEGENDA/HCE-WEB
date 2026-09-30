// Insignias, niveles y recompensas del alumno. Se calculan de los mismos
// conteos que dan los puntos (función mis_logros en Supabase), así que nunca
// se desincronizan: no hay insignias "guardadas" que alguien tenga que otorgar.

// Ocho escalones por categoría, como en TalentLMS.
export const ESCALONES = ['Novato', 'En crecimiento', 'Aventurero', 'Explorador', 'Estrella', 'Superestrella', 'Maestro', 'Gran maestro'];

export const CATEGORIAS = [
  { id: 'actividad', nombre: 'Actividad', unidad: 'días de estudio', valor: (l) => l.dias, metas: [1, 5, 10, 20, 40, 80, 150, 300] },
  { id: 'aprendizaje', nombre: 'Aprendizaje', unidad: 'lecciones completadas', valor: (l) => l.lecciones, metas: [1, 5, 15, 30, 60, 120, 250, 500] },
  { id: 'test', nombre: 'Test', unidad: 'exámenes aprobados', valor: (l) => (l.examenes || 0) + (l.primer_intento || 0), metas: [1, 3, 5, 10, 20, 40, 70, 100] },
  { id: 'tarea', nombre: 'Tarea', unidad: 'tareas entregadas', valor: (l) => l.tareas, metas: [1, 3, 5, 10, 20, 40, 70, 100] },
  { id: 'asistencia', nombre: 'Asistencia', unidad: 'sesiones en vivo y webinars', valor: (l) => (l.webinars || 0) + (l.sesiones || 0), metas: [1, 3, 5, 10, 20, 40, 70, 100] },
  { id: 'encuestas', nombre: 'Opinión', unidad: 'encuestas respondidas', valor: (l) => l.encuestas, metas: [1, 3, 5, 10, 20, 40, 70, 100] },
  { id: 'perfeccionismo', nombre: 'Perfeccionismo', unidad: 'calificaciones de 100', valor: (l) => l.perfectos, metas: [1, 2, 3, 5, 10, 20, 35, 50] },
  { id: 'certificacion', nombre: 'Certificación', unidad: 'cursos certificados', valor: (l) => l.certificados, metas: [1, 2, 3, 5, 8, 12, 16, 20] },
];

const BASE = {
  lecciones: 0, dias: 0, primer_intento: 0, perfectos: 0, certificados: 0, webinars: 0,
  examenes: 0, encuestas: 0, tareas: 0, sesiones: 0, logins: 0,
};

/** Por categoría: cuántos escalones lleva y cuánto le falta para el siguiente. */
export function insigniasPorCategoria(logros) {
  const l = { ...BASE, ...(logros || {}) };
  return CATEGORIAS.map((c) => {
    const valor = Number(c.valor(l)) || 0;
    const alcanzados = c.metas.filter((m) => valor >= m).length;
    const siguiente = c.metas[alcanzados] ?? null;
    return {
      id: c.id,
      nombre: c.nombre,
      unidad: c.unidad,
      valor,
      alcanzados,
      escalon: alcanzados ? ESCALONES[alcanzados - 1] : null,
      siguiente,
      siguienteNombre: siguiente != null ? ESCALONES[alcanzados] : null,
      metas: c.metas,
    };
  });
}

/** Total de insignias obtenidas (cada escalón cuenta como una). */
export const totalInsignias = (categorias) => categorias.reduce((t, c) => t + c.alcanzados, 0);

/** Nivel según los puntos: empieza en 1 y sube cada `porNivel` puntos. */
export function nivelDe(puntos, porNivel = 200) {
  const paso = Math.max(1, Number(porNivel) || 200);
  const p = Math.max(0, Number(puntos) || 0);
  const nivel = Math.floor(p / paso) + 1;
  return { nivel, enNivel: p % paso, paraSiguiente: paso - (p % paso), paso };
}

/** Recompensas configuradas, marcando las que ya alcanzó. */
export function recompensasDe(recompensas, nivel) {
  return (Array.isArray(recompensas) ? recompensas : [])
    .filter((r) => r && Number(r.nivel) > 0 && Number(r.descuento) > 0)
    .map((r) => ({ nivel: Number(r.nivel), descuento: Number(r.descuento), alcanzada: nivel >= Number(r.nivel) }))
    .sort((a, b) => a.nivel - b.nivel);
}

/** El mayor descuento que ya tiene ganado. */
export const descuentoGanado = (recompensas, nivel) =>
  recompensasDe(recompensas, nivel).filter((r) => r.alcanzada).reduce((m, r) => Math.max(m, r.descuento), 0);

// Compatibilidad: la lista plana de insignias (una por categoría, con su escalón).
export function insigniasDe(logros) {
  return insigniasPorCategoria(logros).map((c) => ({
    id: c.id,
    nombre: c.escalon ? `${c.nombre} · ${c.escalon}` : c.nombre,
    requisito: `${c.metas[0]} ${c.unidad}`,
    obtenida: c.alcanzados > 0,
    avance: c.siguiente != null ? `${Math.min(c.valor, c.siguiente)} de ${c.siguiente} ${c.unidad}` : 'Nivel máximo',
  }));
}

// Cómo se ganan los puntos, para explicárselo al alumno.
export const REGLAS_PUNTOS = [
  ['Lección completada', 10],
  ['Examen de lección aprobado', 15],
  ['Examen final aprobado a la primera', 20],
  ['Tarea entregada', 10],
  ['Encuesta respondida', 5],
  ['Sesión en vivo o webinar', 15],
  ['Día de estudio', 5],
  ['Día que entras al portal', 2],
  ['Curso certificado', 50],
];
