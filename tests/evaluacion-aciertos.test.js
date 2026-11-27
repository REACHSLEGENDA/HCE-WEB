// "Su calificación" y "Cuántas contestó bien" se eligen por separado.
import { describe, expect, it } from 'vitest';
import { resultadoVisible, finalizacionDe } from '../netlify/functions/evaluacion-enviar.js';
import { finalizacionDe as finalizacionCliente } from '../src/lib/evaluacionesLogica.js';

const base = { esExamen: true, aprobado: true, calificacion: 85, correctas: 17, calificables: 20, detalle: {} };

describe('Calificación y aciertos por separado', () => {
  it('solo la calificación', () => {
    const r = resultadoVisible({ ...base, config: { mostrar_calificacion: true, mostrar_aciertos: false } });
    expect(r).toMatchObject({ calificacion: 85, correctas: null, calificables: null });
  });
  it('solo cuántas contestó bien', () => {
    const r = resultadoVisible({ ...base, config: { mostrar_calificacion: false, mostrar_aciertos: true } });
    expect(r).toMatchObject({ calificacion: null, correctas: 17, calificables: 20 });
  });
  it('sin la columna nueva, los aciertos siguen a la calificación (como antes)', () => {
    for (const f of [finalizacionDe, finalizacionCliente]) {
      expect(f({ mostrar_calificacion: false }).mostrar_aciertos).toBe(false);
      expect(f({ mostrar_calificacion: true }).mostrar_aciertos).toBe(true);
      expect(f({}).mostrar_aciertos).toBe(true);
    }
  });
});
