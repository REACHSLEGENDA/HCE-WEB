// Análisis de un examen o una encuesta de lección, como el "Análisis de test"
// y el "Análisis de encuesta" de TalentLMS: cuántos contestaron cada pregunta,
// qué porcentaje eligió cada opción y las respuestas abiertas.

import { ESCALA_BASE } from './evaluacionesBase';

/** De cada alumno, su último intento (o todos). */
export function intentosAnalizados(intentos, modo = 'ultimo') {
  if (modo === 'todos') return intentos;
  const ultimo = new Map();
  for (const i of intentos) {
    const previo = ultimo.get(i.user_id);
    if (!previo || i.numero > previo.numero) ultimo.set(i.user_id, i);
  }
  return [...ultimo.values()];
}

const igualesOrdenados = (a, b) => {
  const x = [...a].sort((m, n) => m - n);
  const y = [...b].sort((m, n) => m - n);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

export function esRespuestaCorrecta(pregunta, respuesta) {
  const correctas = (pregunta.correctas || []).map(Number);
  if (!correctas.length || respuesta == null) return null;
  if (pregunta.tipo === 'opcion') return correctas.includes(Number(respuesta));
  if (pregunta.tipo === 'multiple') return Array.isArray(respuesta) && igualesOrdenados(respuesta.map(Number), correctas);
  return null;
}

export function etiquetasDe(pregunta) {
  if (pregunta.tipo === 'escala') return pregunta.opciones?.length ? pregunta.opciones : ESCALA_BASE;
  return pregunta.opciones || [];
}

/**
 * Por pregunta: veces contestada, correctas, y cuántos eligieron cada opción.
 * En preguntas abiertas, la lista de respuestas con su autor.
 */
export function analizarPreguntas({ preguntas, intentos, perfiles = [] }) {
  const nombre = new Map(perfiles.map((p) => [p.id, p.nombre_completo || p.email || 'Alumno']));
  return preguntas.map((p, indice) => {
    const etiquetas = etiquetasDe(p);
    const conteo = etiquetas.map(() => 0);
    const abiertas = [];
    let contestada = 0;
    let correctas = 0;
    const calificable = ['opcion', 'multiple'].includes(p.tipo) && (p.correctas || []).length > 0;

    for (const intento of intentos) {
      const r = intento.respuestas?.[p.id];
      if (r == null || r === '' || (Array.isArray(r) && !r.length)) continue;
      contestada += 1;
      if (p.tipo === 'abierta') {
        abiertas.push({ userId: intento.user_id, nombre: nombre.get(intento.user_id) || 'Alumno', texto: String(r), fecha: intento.enviado_en });
        continue;
      }
      const elegidas = p.tipo === 'multiple' ? (Array.isArray(r) ? r : [r]) : [p.tipo === 'escala' ? Number(r) - 1 : Number(r)];
      elegidas.forEach((e) => { if (e >= 0 && e < conteo.length) conteo[e] += 1; });
      if (calificable && esRespuestaCorrecta(p, r)) correctas += 1;
    }

    const promedioEscala = p.tipo === 'escala' && contestada
      ? conteo.reduce((t, n, i) => t + n * (i + 1), 0) / contestada
      : null;

    return {
      id: p.id,
      numero: indice + 1,
      tipo: p.tipo,
      texto: p.texto,
      calificable,
      contestada,
      correctas,
      porcentajeCorrectas: calificable && contestada ? (correctas / contestada) * 100 : null,
      promedioEscala,
      opciones: etiquetas.map((texto, i) => ({
        indice: i,
        texto,
        correcta: (p.correctas || []).map(Number).includes(i),
        veces: conteo[i],
        porcentaje: contestada ? (conteo[i] / contestada) * 100 : 0,
      })),
      abiertas: abiertas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    };
  });
}

/** Resumen del examen o encuesta: presentaron, aprobaron, promedio, tiempo. */
export function resumenEvaluacion({ intentosTodos, analizados, inscritos, esExamen }) {
  const presentaron = new Set(intentosTodos.map((i) => i.user_id)).size;
  const aprobaron = new Set(intentosTodos.filter((i) => i.aprobado).map((i) => i.user_id)).size;
  const calificaciones = analizados.map((i) => Number(i.calificacion)).filter(Number.isFinite);
  const tiempos = analizados.map((i) => i.duracion_seg).filter((d) => d != null);
  return {
    presentaron,
    noPresentaron: Math.max(0, inscritos - presentaron),
    aprobaron: esExamen ? aprobaron : null,
    noAprobados: esExamen ? presentaron - aprobaron : null,
    intentos: intentosTodos.length,
    promedio: calificaciones.length ? calificaciones.reduce((t, c) => t + c, 0) / calificaciones.length : null,
    tiempoPromedioSeg: tiempos.length ? tiempos.reduce((t, c) => t + c, 0) / tiempos.length : null,
    tasaFinalizacion: inscritos ? ((esExamen ? aprobaron : presentaron) / inscritos) * 100 : null,
  };
}

/** Texto legible de una respuesta, para el Excel de detalles. */
export function textoRespuesta(pregunta, respuesta) {
  if (respuesta == null || respuesta === '') return '';
  const etiquetas = etiquetasDe(pregunta);
  if (pregunta.tipo === 'abierta') return String(respuesta);
  if (pregunta.tipo === 'escala') return `${respuesta}. ${etiquetas[Number(respuesta) - 1] || ''}`.trim();
  const lista = Array.isArray(respuesta) ? respuesta : [respuesta];
  return lista.map((i) => etiquetas[Number(i)] ?? '').filter(Boolean).join(' · ');
}
