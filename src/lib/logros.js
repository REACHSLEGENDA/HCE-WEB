// Insignias del alumno. Se calculan de los mismos conteos que dan los puntos
// (función mis_logros en Supabase), así que nunca se desincronizan: no hay
// insignias "guardadas" que alguien tenga que otorgar a mano.

export const INSIGNIAS = [
  { id: 'primer-paso', nombre: 'Primer paso', requisito: 'Completa tu primera lección', meta: (l) => l.lecciones >= 1 },
  { id: 'constancia', nombre: 'Constancia', requisito: 'Estudia en 5 días distintos', meta: (l) => l.dias >= 5, avance: (l) => [l.dias, 5] },
  { id: 'a-la-primera', nombre: 'A la primera', requisito: 'Aprueba un examen al primer intento', meta: (l) => l.primer_intento >= 1 },
  { id: 'perfecto', nombre: 'Calificación perfecta', requisito: 'Saca 100 en un examen', meta: (l) => l.perfectos >= 1 },
  { id: 'curso-completo', nombre: 'Curso completado', requisito: 'Obtén tu primer certificado', meta: (l) => l.certificados >= 1 },
  { id: 'coleccionista', nombre: 'Coleccionista', requisito: 'Obtén 3 certificados', meta: (l) => l.certificados >= 3, avance: (l) => [l.certificados, 3] },
  { id: 'en-vivo', nombre: 'En vivo', requisito: 'Asiste a un webinar', meta: (l) => l.webinars >= 1 },
];

export function insigniasDe(logros) {
  const l = {
    lecciones: 0, dias: 0, primer_intento: 0, perfectos: 0, certificados: 0, webinars: 0,
    ...(logros || {}),
  };
  return INSIGNIAS.map((ins) => {
    const obtenida = ins.meta(l);
    const [actual, total] = ins.avance ? ins.avance(l) : [obtenida ? 1 : 0, 1];
    return {
      id: ins.id,
      nombre: ins.nombre,
      requisito: ins.requisito,
      obtenida,
      avance: total > 1 && !obtenida ? `${Math.min(actual, total)} de ${total}` : null,
    };
  });
}

// Cómo se ganan los puntos, para explicárselo al alumno.
export const REGLAS_PUNTOS = [
  ['Lección completada', 10],
  ['Día de estudio', 5],
  ['Webinar al que asististe', 15],
  ['Examen aprobado al primer intento', 20],
  ['Curso certificado', 50],
];
