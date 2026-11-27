// Mejoras de exámenes: preguntas de emparejar, respuestas en orden aleatorio y
// qué ve el alumno al terminar. Sin red ni Supabase real: el servidor se
// prueba con una base simulada en memoria.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const falso = vi.hoisted(() => ({ tablas: {}, usuario: { id: 'alumno-1' } }));

// Base simulada mínima: select/eq/in/order/maybeSingle/single/insert/upsert.
function consulta(tabla) {
  const filtros = [];
  let operacion = 'select';
  let valores = null;
  let uno = false;
  const q = {
    select: () => q,
    eq: (k, v) => { filtros.push((r) => String(r[k]) === String(v)); return q; },
    in: (k, lista) => { filtros.push((r) => lista.map(String).includes(String(r[k]))); return q; },
    order: () => q,
    maybeSingle: () => { uno = true; return q; },
    single: () => { uno = true; return q; },
    insert: (v) => { operacion = 'insert'; valores = v; return q; },
    upsert: (v) => { operacion = 'upsert'; valores = v; return q; },
    then: (resolve, reject) => {
      const filas = (falso.tablas[tabla] ||= []);
      if (operacion !== 'select') {
        filas.push(...(Array.isArray(valores) ? valores : [valores]));
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      }
      const lista = filas.filter((r) => filtros.every((f) => f(r)));
      return Promise.resolve({ data: uno ? (lista[0] ?? null) : lista, error: null }).then(resolve, reject);
    },
  };
  return q;
}

vi.mock('../netlify/functions/_supabase.js', () => ({
  admin: () => ({ from: consulta }),
  usuarioDesdeToken: async () => falso.usuario,
  cuentaHabilitada: async () => ({ habilitada: true }),
  accesoVigente: async () => ({ vigente: true }),
  isConfigured: () => true,
  json: (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) }),
}));
vi.mock('../netlify/functions/_notificaciones.js', () => ({ notificar: async () => ({ enviadas: 0 }) }));

import { handler, limpiarRespuesta, calificar, esCalificable, resultadoVisible, finalizacionDe } from '../netlify/functions/evaluacion-enviar.js';
import { prepararEmparejar, paresDesdeGuardado, validarPares, ordenarOpciones, indicesVisibles, esPermutacion, finalizacionDe as finalizacionCliente } from '../src/lib/evaluacionesLogica.js';
import { firmaEvaluacion, validarBorradorEvaluacion } from '../src/lib/borradorEvaluacion.js';

// "Ordena correctamente los hitos históricos de ECMO": izquierda 1971, 1972,
// 1975; la derecha está guardada revuelta y la clave dice dónde quedó cada una.
const EMPAREJAR = {
  id: 30,
  tipo: 'emparejar',
  texto: 'Ordena correctamente los hitos históricos de ECMO',
  opciones: { izquierda: ['1971', '1972', '1975'], derecha: ['Texto de 1975', 'Texto de 1971', 'Texto de 1972'] },
  puntos: 2,
  obligatoria: true,
};
const CLAVE_EMPAREJAR = [1, 2, 0];

describe('Emparejar: calificación en el servidor', () => {
  it('vale todos sus puntos solo si todos los pares están bien', () => {
    const clave = new Map([[30, CLAVE_EMPAREJAR]]);
    const bien = calificar([EMPAREJAR], { 30: [1, 2, 0] }, clave);
    expect(bien).toMatchObject({ puntosPosibles: 2, puntosObtenidos: 2, correctasCuenta: 1, calificables: 1 });
    expect(bien.detalle[30]).toEqual({ correcta: true, correctas: CLAVE_EMPAREJAR });

    // Dos pares cruzados: no hay puntos parciales (igual que "varias correctas").
    const mal = calificar([EMPAREJAR], { 30: [2, 1, 0] }, clave);
    expect(mal).toMatchObject({ puntosObtenidos: 0, correctasCuenta: 0, calificables: 1 });
    expect(mal.detalle[30].correcta).toBe(false);
  });

  it('limpia la respuesta: incompleta, fuera de rango o de otro largo no cuenta', () => {
    expect(limpiarRespuesta(EMPAREJAR, [1, 2, 0])).toEqual([1, 2, 0]);
    expect(limpiarRespuesta(EMPAREJAR, ['1', '2', '0'])).toEqual([1, 2, 0]);
    expect(limpiarRespuesta(EMPAREJAR, [1, null, 0])).toBeNull();
    expect(limpiarRespuesta(EMPAREJAR, [1, 2])).toBeNull();
    expect(limpiarRespuesta(EMPAREJAR, [1, 2, 3])).toBeNull();
    expect(limpiarRespuesta(EMPAREJAR, 1)).toBeNull();
  });

  it('una clave incompleta no cuenta para la calificación', () => {
    expect(esCalificable(EMPAREJAR, CLAVE_EMPAREJAR)).toBe(true);
    expect(esCalificable(EMPAREJAR, [1, 2])).toBe(false);
    expect(esCalificable(EMPAREJAR, [1, 2, 7])).toBe(false);
    expect(esCalificable(EMPAREJAR, [])).toBe(false);
  });

  it('opción única y varias correctas se califican igual que antes', () => {
    const preguntas = [
      { id: 1, tipo: 'opcion', opciones: ['A', 'B', 'C'], puntos: 1 },
      { id: 2, tipo: 'multiple', opciones: ['A', 'B', 'C'], puntos: 1 },
      { id: 3, tipo: 'abierta', opciones: [], puntos: 1 },
    ];
    const clave = new Map([[1, [2]], [2, [0, 2]], [3, []]]);
    const r = calificar(preguntas, { 1: 2, 2: [0, 2], 3: 'texto' }, clave);
    expect(r).toMatchObject({ puntosPosibles: 2, puntosObtenidos: 2, calificables: 2 });
  });
});

describe('Emparejar: lo que guarda el editor', () => {
  const pares = [
    { izquierda: '1971', derecha: 'Texto de 1971' },
    { izquierda: '1972', derecha: 'Texto de 1972' },
    { izquierda: '1975', derecha: 'Texto de 1975' },
  ];

  it('revuelve la derecha y la clave apunta a la pareja correcta', () => {
    for (const valor of [0, 0.3, 0.6, 0.99]) {
      const { opciones, correctas } = prepararEmparejar(pares, null, () => valor);
      expect(opciones.izquierda).toEqual(['1971', '1972', '1975']);
      expect([...opciones.derecha].sort()).toEqual(['Texto de 1971', 'Texto de 1972', 'Texto de 1975']);
      // Nunca en el mismo orden que la izquierda: regalaría la respuesta.
      expect(opciones.derecha).not.toEqual(['Texto de 1971', 'Texto de 1972', 'Texto de 1975']);
      pares.forEach((par, i) => expect(opciones.derecha[correctas[i]]).toBe(par.derecha));
      expect(paresDesdeGuardado(opciones, correctas)).toEqual(pares);
    }
  });

  it('conserva el orden de la derecha si sus textos no cambiaron', () => {
    const { opciones } = prepararEmparejar(pares, EMPAREJAR.opciones.derecha);
    expect(opciones.derecha).toEqual(EMPAREJAR.opciones.derecha);
  });

  it('pide de 2 a 10 pares completos y sin repetir', () => {
    expect(validarPares(pares)).toBe('');
    expect(validarPares(pares.slice(0, 1))).toMatch(/al menos 2/);
    expect(validarPares(Array.from({ length: 11 }, (_, i) => ({ izquierda: `${i}`, derecha: `d${i}` })))).toMatch(/10/);
    expect(validarPares([...pares.slice(0, 2), { izquierda: '1975', derecha: ' ' }])).toMatch(/incompletos/);
    expect(validarPares([...pares.slice(0, 2), { izquierda: '1971', derecha: 'Otro' }])).toMatch(/izquierda/);
    expect(validarPares([...pares.slice(0, 2), { izquierda: '1975', derecha: 'texto de 1971' }])).toMatch(/derecha/);
  });
});

describe('Respuestas en orden aleatorio', () => {
  const preguntas = [
    { id: 1, tipo: 'opcion', opciones: ['A', 'B', 'C', 'D'] },
    { id: 2, tipo: 'multiple', opciones: ['A', 'B'] },
    { id: 3, tipo: 'abierta', opciones: [] },
    { id: 4, tipo: 'escala', opciones: ['1', '2', '3', '4', '5'] },
    EMPAREJAR,
  ];

  it('revuelve opción única, varias y la derecha de emparejar conservando los índices originales', () => {
    const orden = ordenarOpciones(preguntas, () => 0);
    expect(Object.keys(orden).sort()).toEqual(['1', '2', '30']);
    expect(esPermutacion(orden[1], 4)).toBe(true);
    expect(orden[1]).not.toEqual([0, 1, 2, 3]);
    expect(esPermutacion(orden[30], 3)).toBe(true);
    // Lo que se muestra en cada lugar es la opción original de ese índice.
    expect(indicesVisibles(preguntas[0], orden).map((i) => preguntas[0].opciones[i]).sort()).toEqual(['A', 'B', 'C', 'D']);
    // Sin orden guardado (o con uno inválido), el orden original.
    expect(indicesVisibles(preguntas[0], {})).toEqual([0, 1, 2, 3]);
    expect(indicesVisibles(preguntas[0], { 1: [0, 0, 1, 2] })).toEqual([0, 1, 2, 3]);
  });

  it('el borrador guarda el orden de las respuestas y la respuesta de emparejar', () => {
    const datos = { config: { aleatorio_opciones: true }, preguntas };
    const borrador = {
      version: 1, firma: firmaEvaluacion(datos, 'examen'), intentosPrevios: 0, iniciadoEn: '2026-11-27T18:00:00Z',
      respuestas: { 1: 3, 30: [1, null, 0] }, orden: [], ordenOpciones: { 1: [3, 2, 1, 0], 30: [2, 0, 1] }, actual: 0, revisando: false,
    };
    expect(validarBorradorEvaluacion(borrador, datos, 0, 'examen')).toMatchObject({ respuestas: { 1: 3, 30: [1, null, 0] }, ordenOpciones: borrador.ordenOpciones });
    expect(validarBorradorEvaluacion({ ...borrador, respuestas: { 30: [1, 2] } }, datos, 0, 'examen')).toBeNull();
    expect(validarBorradorEvaluacion({ ...borrador, respuestas: { 30: [1, 2, 9] } }, datos, 0, 'examen')).toBeNull();
    expect(validarBorradorEvaluacion({ ...borrador, ordenOpciones: { 1: [0, 1] } }, datos, 0, 'examen')).toBeNull();
    // Cambiar qué ve el alumno al terminar no tira el borrador.
    const otraFinal = { ...datos, config: { ...datos.config, mostrar_correctas: 'siempre', aleatorio_opciones: false } };
    expect(validarBorradorEvaluacion(borrador, otraFinal, 0, 'examen')).not.toBeNull();
  });
});

describe('Qué ve el alumno al terminar', () => {
  const detalle = { 1: { correcta: false, correctas: [2] }, 30: { correcta: true, correctas: CLAVE_EMPAREJAR } };
  const base = { esExamen: true, aprobado: false, calificacion: 50, correctas: 1, calificables: 2, detalle };

  it('con "Nunca" no salen las respuestas correctas', () => {
    const r = resultadoVisible({ ...base, config: { mostrar_marcas: true, mostrar_correctas: 'nunca' } });
    expect(r.detalle).toEqual({ 1: { correcta: false }, 30: { correcta: true } });
    expect(JSON.stringify(r)).not.toContain('correctas":[');
  });

  it('sin marcas ni correctas no se manda detalle; sin calificación no se manda la cifra', () => {
    const r = resultadoVisible({ ...base, config: { mostrar_calificacion: false, mostrar_marcas: false, mostrar_correctas: 'nunca' } });
    expect(r).toMatchObject({ detalle: null, calificacion: null, correctas: null, calificables: null, mostrarCalificacion: false });
  });

  it('"Solo si aprueba" las muestra solo al aprobar', () => {
    const config = { mostrar_marcas: false, mostrar_correctas: 'al_aprobar' };
    expect(resultadoVisible({ ...base, config }).detalle).toBeNull();
    expect(resultadoVisible({ ...base, aprobado: true, config }).detalle).toEqual({ 1: { correctas: [2] }, 30: { correctas: CLAVE_EMPAREJAR } });
  });

  it('"mostrar qué contestó bien" de antes equivale a marcas y correctas siempre', () => {
    for (const f of [finalizacionDe, finalizacionCliente]) {
      expect(f({ mostrar_respuestas: true })).toMatchObject({ mostrar_calificacion: true, mostrar_marcas: true, mostrar_correctas: 'siempre' });
      expect(f({ mostrar_respuestas: false })).toMatchObject({ mostrar_calificacion: true, mostrar_marcas: false, mostrar_correctas: 'nunca' });
      // Con las columnas nuevas, mandan ellas.
      expect(f({ mostrar_respuestas: true, mostrar_marcas: false, mostrar_correctas: 'nunca', mostrar_calificacion: false }))
        .toMatchObject({ mostrar_calificacion: false, mostrar_marcas: false, mostrar_correctas: 'nunca' });
    }
  });

  it('mientras le queden intentos no salen las correctas, aunque diga Siempre', () => {
    const config = { mostrar_marcas: true, mostrar_correctas: 'siempre' };
    expect(resultadoVisible({ ...base, config, puedeReintentar: true }).detalle).toEqual({ 1: { correcta: false }, 30: { correcta: true } });
    expect(resultadoVisible({ ...base, config, puedeReintentar: false }).detalle[1]).toEqual({ correcta: false, correctas: [2] });
  });

  it('en encuestas no se manda calificación ni detalle', () => {
    expect(resultadoVisible({ ...base, esExamen: false, config: { mostrar_correctas: 'siempre' } }))
      .toMatchObject({ detalle: null, calificacion: null });
  });
});

describe('evaluacion-enviar con base simulada', () => {
  const evento = (respuestas) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer prueba' }, body: JSON.stringify({ leccionId: 900, respuestas }) });

  beforeEach(() => {
    falso.tablas = {
      profiles: [{ id: 'alumno-1', rol: 'estudiante' }],
      curso_lecciones: [{ id: 900, course_id: 7, tipo: 'examen', titulo: 'Examen ECMO' }],
      inscripciones: [{ id: 1, user_id: 'alumno-1', course_id: 7 }],
      evaluacion_config: [{ leccion_id: 900, min_aprobacion: 80, intentos_max: null, mostrar_respuestas: true, mostrar_marcas: true, mostrar_correctas: 'nunca', mostrar_calificacion: true }],
      evaluacion_preguntas: [
        { id: 1, leccion_id: 900, tipo: 'opcion', texto: '¿Cuál?', opciones: ['A', 'B', 'C'], puntos: 1, obligatoria: true },
        { ...EMPAREJAR, leccion_id: 900 },
      ],
      evaluacion_claves: [{ pregunta_id: 1, correctas: [2] }, { pregunta_id: 30, correctas: CLAVE_EMPAREJAR }],
      evaluacion_intentos: [],
      leccion_progreso: [],
    };
  });

  it('con "Nunca" no devuelve las correctas, aunque la columna vieja diga que sí', async () => {
    const r = await handler(evento({ 1: 0, 30: [1, 2, 0] }));
    expect(r.statusCode).toBe(200);
    const cuerpo = JSON.parse(r.body);
    // Emparejar vale 2 de 3 puntos: 66.67%.
    expect(cuerpo).toMatchObject({ calificacion: 66.67, aprobado: false, correctas: 1, calificables: 2 });
    expect(cuerpo.detalle).toEqual({ 1: { correcta: false }, 30: { correcta: true } });
    expect(r.body).not.toMatch(/"correctas":\[/);
    // El intento se guarda con la respuesta de emparejar.
    expect(falso.tablas.evaluacion_intentos[0].respuestas).toEqual({ 1: 0, 30: [1, 2, 0] });
  });

  it('pide contestar emparejar completo si es obligatoria', async () => {
    const r = await handler(evento({ 1: 2, 30: [1, null, 0] }));
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body)).toMatchObject({ estado: 'faltan-respuestas', faltan: [2] });
  });

  it('con "Al terminar sus intentos" no las devuelve mientras pueda reintentar', async () => {
    falso.tablas.evaluacion_config[0].mostrar_correctas = 'siempre';
    const cuerpo = JSON.parse((await handler(evento({ 1: 0, 30: [1, 2, 0] }))).body);
    expect(cuerpo.detalle).toEqual({ 1: { correcta: false }, 30: { correcta: true } });
  });

  it('con "Al terminar sus intentos" las devuelve cuando ya no le quedan', async () => {
    Object.assign(falso.tablas.evaluacion_config[0], { mostrar_correctas: 'siempre', intentos_max: 1 });
    const cuerpo = JSON.parse((await handler(evento({ 1: 0, 30: [1, 2, 0] }))).body);
    expect(cuerpo.detalle).toEqual({ 1: { correcta: false, correctas: [2] }, 30: { correcta: true, correctas: CLAVE_EMPAREJAR } });
  });

  it('sin la migración nueva respeta "mostrar qué contestó bien"', async () => {
    falso.tablas.evaluacion_config = [{ leccion_id: 900, min_aprobacion: 80, mostrar_respuestas: false }];
    const cuerpo = JSON.parse((await handler(evento({ 1: 2, 30: [1, 2, 0] }))).body);
    expect(cuerpo).toMatchObject({ calificacion: 100, aprobado: true, detalle: null });
  });
});
