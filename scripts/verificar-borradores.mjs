import assert from 'node:assert/strict';
import { claveBorradorEvaluacion, firmaEvaluacion, leerBorradorEvaluacion, guardarBorradorEvaluacion, borrarBorradorEvaluacion, validarBorradorEvaluacion } from '../src/lib/borradorEvaluacion.js';

const datos = { config: { aleatorio: true }, preguntas: [
  { id: 1, tipo: 'opcion', texto: 'Pregunta A', opciones: ['A', 'B'], puntos: 1, obligatoria: true },
  { id: 2, tipo: 'multiple', texto: 'Pregunta B', opciones: ['A', 'B', 'C'], puntos: 1, obligatoria: true },
  { id: 3, tipo: 'escala', texto: 'Pregunta C', opciones: [], puntos: 0, obligatoria: false },
  { id: 4, tipo: 'abierta', texto: 'Pregunta D', opciones: [], puntos: 0, obligatoria: false },
] };
const borrador = () => ({ version: 1, firma: firmaEvaluacion(datos), intentosPrevios: 0,
  iniciadoEn: '2026-10-13T18:00:00Z', respuestas: { 1: 0, 2: [0, 2], 3: 5, 4: 'Respuesta' }, orden: [3, 1, 4, 2], actual: 2, revisando: true });
const casos = [
  ['usuario y vista de administrador tienen borradores separados', () => {
    assert.notEqual(claveBorradorEvaluacion('u1', 7, false), claveBorradorEvaluacion('u2', 7, false));
    assert.notEqual(claveBorradorEvaluacion('u1', 7, false), claveBorradorEvaluacion('u1', 7, true));
  }],
  ['recupera respuestas, orden aleatorio, fecha y revisión', () => {
    assert.deepEqual(validarBorradorEvaluacion(borrador(), datos, 0), borrador());
  }],
  ['no reutiliza un borrador si cambiaron opciones o preguntas', () => {
    const nuevas = structuredClone(datos); nuevas.preguntas[0].opciones.reverse();
    assert.equal(validarBorradorEvaluacion(borrador(), nuevas, 0), null);
    nuevas.preguntas[0].texto = 'Otro texto';
    assert.equal(validarBorradorEvaluacion(borrador(), nuevas, 0), null);
  }],
  ['no reutiliza un intento que ya fue enviado desde otra pestaña', () => {
    assert.equal(validarBorradorEvaluacion(borrador(), datos, 1), null);
  }],
  ['no mezcla borradores de examen y encuesta si cambió el tipo', () => {
    const b = { ...borrador(), firma: firmaEvaluacion(datos, 'examen') };
    assert.ok(validarBorradorEvaluacion(b, datos, 0, 'examen'));
    assert.equal(validarBorradorEvaluacion(b, datos, 0, 'encuesta'), null);
  }],
  ['rechaza selecciones fuera del rango y opciones múltiples duplicadas', () => {
    for (const [id, valor] of [[1, 2], [1, '0'], [2, [0, 0]], [2, [9]], [3, 6], [4, { texto: 'Respuesta' }]]) {
      const b = borrador(); b.respuestas[id] = valor; assert.equal(validarBorradorEvaluacion(b, datos, 0), null);
    }
  }],
  ['rechaza orden incompleto o repetido que podría ocultar preguntas', () => {
    for (const orden of [[1, 2], [1, 2, 2, 4], [1, 2, 3, 99]]) assert.equal(validarBorradorEvaluacion({ ...borrador(), orden }, datos, 0), null);
  }],
  ['almacenamiento bloqueado devuelve fallo y no éxito falso', () => {
    globalThis.localStorage = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('sin espacio'); }, removeItem() { throw new Error('bloqueado'); } };
    assert.equal(leerBorradorEvaluacion('x'), null);
    assert.equal(guardarBorradorEvaluacion('x', borrador()), false);
    assert.equal(borrarBorradorEvaluacion('x'), false);
  }],
  ['guarda, recupera y elimina solo el borrador correspondiente', () => {
    const valores = new Map(); globalThis.localStorage = { getItem: k => valores.get(k), setItem: (k, v) => valores.set(k, v), removeItem: k => valores.delete(k) };
    assert.equal(guardarBorradorEvaluacion('u1', borrador()), true);
    guardarBorradorEvaluacion('u2', borrador());
    assert.deepEqual(leerBorradorEvaluacion('u1'), borrador());
    assert.equal(borrarBorradorEvaluacion('u1'), true);
    assert.equal(leerBorradorEvaluacion('u1'), null);
    assert.ok(leerBorradorEvaluacion('u2'));
    valores.set('mal', '{'); assert.equal(leerBorradorEvaluacion('mal'), null);
  }],
];
for (const [nombre, prueba] of casos) { prueba(); console.log(`PASS ${nombre}`); }
delete globalThis.localStorage;
