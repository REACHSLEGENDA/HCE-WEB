// Cálculos del reporte de ventas: programa de cada pago, comparación justa,
// netos con reembolsos, programa × mes, CNADOT aparte y recuperación.
import { describe, expect, it } from 'vitest';
import { filtrar, matriz, mesesDe, programaDePago, rangoDe, recuperacion, totales, variacion } from '../src/lib/ventas.js';

const pago = (id, fecha, monto, extra = {}) => ({
  id, date: fecha, amount: monto, currency: 'MXN', studentEmail: `${id}@prueba.test`, studentName: id, courseName: 'Paris International Diploma in ECMO', ...extra,
});

describe('Reporte de ventas', () => {
  it('clasifica el programa aunque el pago no lo traiga', () => {
    expect(programaDePago({ programa: 'step1' })).toBe('step1');
    expect(programaDePago({ courseName: 'ECMO Nursing Care Course' })).toBe('nursing');
    expect(programaDePago({ courseName: 'ECMO SIM — Plan 12 Meses' })).toBe('sim');
    expect(programaDePago({ courseName: 'Paris ECMO Simulation Course' })).toBe('step2');
    expect(programaDePago({ courseName: 'Inscripción CNADOT', courseId: 'cnadot' })).toBe('cnadot');
    expect(programaDePago({ courseName: 'Curso de ventilación', courseId: '12' })).toBe('curso');
  });

  it('"este mes" se compara con los mismos días del mes pasado', () => {
    const r = rangoDe('mes', new Date(2026, 9, 15, 12));
    expect(r.inicio).toEqual(new Date(2026, 9, 1));
    expect(r.anterior.inicio).toEqual(new Date(2026, 8, 1));
    expect(r.anterior.fin.getDate()).toBe(15);
    expect(r.anterior.fin.getMonth()).toBe(8);
  });

  it('el 31 de un mes se compara con el último día del mes anterior', () => {
    const r = rangoDe('mes', new Date(2026, 2, 31, 12));
    expect(r.anterior.fin.getMonth()).toBe(1);
    expect(r.anterior.fin.getDate()).toBe(28);
  });

  it('suma netos por moneda, descuenta reembolsos y calcula el ticket', () => {
    const r = rangoDe('mes', new Date(2026, 9, 15, 12));
    const t = totales([
      pago('a', '2026-10-02T10:00:00', 10000),
      pago('b', '2026-10-03T10:00:00', 7000, { reembolsado: 2000 }),
      pago('c', '2026-10-04T10:00:00', 400, { currency: 'usd' }),
      pago('viejo', '2026-09-20T10:00:00', 9999),
    ], r);
    expect(t.ventas).toBe(3);
    expect(t.porMoneda.MXN.neto).toBe(15000);
    expect(t.porMoneda.MXN.reembolsos).toBe(2000);
    expect(t.porMoneda.MXN.ticket).toBe(7500);
    expect(t.porMoneda.USD.neto).toBe(400);
  });

  it('CNADOT queda fuera salvo que se pida', () => {
    const lista = [pago('a', '2026-10-02', 1), pago('c', '2026-10-02', 1, { courseId: 'cnadot', courseName: 'CNADOT' })];
    expect(filtrar(lista)).toHaveLength(1);
    expect(filtrar(lista, { incluirCnadot: true })).toHaveLength(2);
  });

  it('arma la tabla programa × mes con totales', () => {
    const r = rangoDe('anio', new Date(2026, 9, 15, 12));
    const meses = mesesDe(r, new Date(2026, 9, 15, 12));
    const m = matriz([
      pago('a', '2026-09-10T10:00:00', 1000, { programa: 'nursing' }),
      pago('b', '2026-10-10T10:00:00', 3000, { programa: 'step1' }),
      pago('c', '2026-10-11T10:00:00', 2000, { programa: 'step1' }),
    ], r, meses, 'MXN');
    expect(meses).toHaveLength(10);
    expect(m.filas[0].programa).toBe('step1');
    expect(m.filas[0].total).toBe(5000);
    expect(m.totalesMes['2026-10']).toBe(5000);
    expect(m.total).toBe(6000);
  });

  it('cuenta carritos recuperados (pagó después el mismo programa)', () => {
    const r = rangoDe('mes', new Date(2026, 9, 15, 12));
    const rec = recuperacion(
      [
        { tipo: 'carrito', email: 'a@prueba.test', programa: 'step1', creado_en: '2026-10-05T10:00:00' },
        { tipo: 'pago_fallido', email: 'b@prueba.test', programa: 'step1', creado_en: '2026-10-06T10:00:00' },
      ],
      [pago('a', '2026-10-07T10:00:00', 10000, { programa: 'step1' })],
      r,
    );
    expect(rec).toEqual({ carritos: 1, rechazados: 1, recuperados: 1 });
  });

  it('sin base para comparar no inventa porcentajes', () => {
    expect(variacion(100, 0)).toBeNull();
    expect(variacion(50, 100)).toBe(-50);
  });
});
