// Datos de la pantalla "Mi aprendizaje" del alumno: en qué lección va de cada
// curso, sus pendientes (tareas y exámenes) y las clases en vivo de la semana.
//
// Solo lee. Cada parte se carga por separado: si una tabla falta o una consulta
// falla, el resto de la pantalla sigue funcionando y esa parte queda vacía.

import { traerTodo } from './traerTodo';

const DIA = 86400000;

/** Un curso del alumno se puede tomar ya (no espera revisión, grupo ni venció). */
export const cursoAbierto = (c) => !!c.enrolled && !c.enRevision && !c.esperandoGrupo && !c.accesoVencido;

/** Lo que sigue en un curso: { leccion, numero, total, hechas } o null. */
export function siguienteDelCurso(lecciones, progreso) {
  const conContenido = (lecciones || []).filter((l) => l.tipo !== 'seccion');
  if (!conContenido.length) return null;
  const hechas = conContenido.filter((l) => progreso[l.id]?.completada).length;
  const indice = conContenido.findIndex((l) => !progreso[l.id]?.completada);
  return {
    leccion: indice >= 0 ? conContenido[indice] : null,
    numero: indice >= 0 ? indice + 1 : conContenido.length,
    total: conContenido.length,
    hechas,
  };
}

/**
 * Carga lo necesario para la pantalla de inicio. `cursos` son los cursos en los
 * que el alumno puede entrar ya (inscrito, cuenta aprobada, grupo abierto).
 */
export async function cargarInicioAlumno(userId, cursos) {
  const ids = [...new Set((cursos || []).map((c) => Number(c.id)).filter((n) => !Number.isNaN(n)))];
  const vacio = { lecciones: {}, progreso: {}, entregas: {}, ultimaActividad: {}, sesiones: [], errores: [], fallos: {} };
  if (!userId || !ids.length) return vacio;

  const [lecciones, progreso, entregas, actividad] = await Promise.allSettled([
    traerTodo('curso_lecciones', 'id, course_id, orden, titulo, tipo, obligatoria, duracion_min',
      (q) => q.in('course_id', ids), { orden: ['course_id', 'orden'] }),
    traerTodo('leccion_progreso', 'leccion_id, course_id, porcentaje, completada',
      (q) => q.eq('user_id', userId).in('course_id', ids)),
    traerTodo('tarea_entregas', 'leccion_id, course_id, estado, creada_en',
      (q) => q.eq('user_id', userId).in('course_id', ids)),
    traerTodo('student_progress', 'course_id, updated_at',
      (q) => q.eq('user_id', userId).in('course_id', ids)),
  ]);

  const resultado = { ...vacio, errores: [], fallos: { progreso: progreso.status === 'rejected', entregas: entregas.status === 'rejected' } };

  if (lecciones.status === 'fulfilled') {
    for (const l of lecciones.value) {
      const id = Number(l.course_id);
      (resultado.lecciones[id] ||= []).push(l);
    }
  } else {
    resultado.errores.push(lecciones.reason?.message || 'lecciones');
  }

  if (progreso.status === 'fulfilled') {
    resultado.progreso = Object.fromEntries(progreso.value.map((p) => [p.leccion_id, p]));
  } else {
    resultado.errores.push(progreso.reason?.message || 'avance');
  }

  if (entregas.status === 'fulfilled') {
    for (const e of entregas.value) {
      const previa = resultado.entregas[e.leccion_id];
      if (!previa || new Date(e.creada_en) > new Date(previa.creada_en)) resultado.entregas[e.leccion_id] = e;
    }
  } else {
    resultado.errores.push(entregas.reason?.message || 'tareas');
  }

  if (actividad.status === 'fulfilled') {
    resultado.ultimaActividad = Object.fromEntries(
      actividad.value.filter((f) => f.updated_at).map((f) => [Number(f.course_id), new Date(f.updated_at)])
    );
  } else {
    resultado.errores.push(actividad.reason?.message || 'actividad');
  }

  // Clases en vivo de los próximos 7 días (y la que esté en curso ahora).
  const idsSesion = (lecciones.status === 'fulfilled' ? lecciones.value : []).filter((l) => l.tipo === 'sesion').map((l) => l.id);
  if (idsSesion.length) {
    try {
      const horarios = await traerTodo('sesiones_clase', 'leccion_id, inicia_en, duracion_min', (q) => q.in('leccion_id', idsSesion));
      const ahora = Date.now();
      const porId = new Map(lecciones.value.map((l) => [l.id, l]));
      resultado.sesiones = horarios
        .map((h) => {
          const l = porId.get(h.leccion_id);
          const inicio = new Date(h.inicia_en);
          return {
            id: `s-${h.leccion_id}`,
            leccionId: h.leccion_id,
            courseId: Number(l?.course_id),
            titulo: l?.titulo || 'Sesión en vivo',
            inicio,
            duracionMin: h.duracion_min || 60,
          };
        })
        .filter((s) => !Number.isNaN(s.inicio.getTime())
          && s.inicio.getTime() + s.duracionMin * 60000 >= ahora
          && s.inicio.getTime() <= ahora + 7 * DIA)
        .sort((a, b) => a.inicio - b.inicio);
    } catch (err) {
      resultado.errores.push(err.message || 'sesiones');
    }
  }

  return resultado;
}

/**
 * Pendientes del alumno a partir de lo cargado: tareas por entregar o por
 * corregir y exámenes de lección sin aprobar. Las tareas en revisión no son
 * pendientes del alumno, pero se listan aparte para que sepa que van en camino.
 */
export function pendientesDe(datos, cursos) {
  const porCurso = new Map((cursos || []).map((c) => [Number(c.id), c]));
  const lista = [];
  for (const [courseId, lecciones] of Object.entries(datos.lecciones || {})) {
    const curso = porCurso.get(Number(courseId));
    if (!curso || curso.completed) continue;
    for (const l of lecciones) {
      const hecha = datos.progreso[l.id]?.completada;
      if (l.tipo === 'tarea') {
        if (datos.fallos?.entregas) continue;
        const entrega = datos.entregas[l.id];
        const estado = !entrega ? 'por-entregar' : entrega.estado === 'rechazada' ? 'por-corregir'
          : entrega.estado === 'aprobada' ? null : 'en-revision';
        if (estado) lista.push({ id: `t-${l.id}`, tipo: 'tarea', estado, leccion: l, curso });
      } else if (l.tipo === 'examen' && !hecha && !datos.fallos?.progreso) {
        lista.push({ id: `e-${l.id}`, tipo: 'examen', estado: 'disponible', leccion: l, curso });
      }
    }
  }
  const prioridad = { 'por-corregir': 0, 'por-entregar': 1, disponible: 2, 'en-revision': 3 };
  return lista.sort((a, b) => prioridad[a.estado] - prioridad[b.estado]
    || (a.leccion.obligatoria === false) - (b.leccion.obligatoria === false));
}
