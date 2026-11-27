// Código BLACKFRIDAY de Nursing: 10% y meses sin intereses solo del 27 al 30 de noviembre de 2026.
import { describe, expect, it } from 'vitest';
import { habilitaMeses, porcentajeCodigo, precioConPromo } from '../netlify/functions/_promos.js';

const dentro = new Date('2026-11-28T12:00:00-06:00');
const fuera = new Date('2026-12-01T00:30:00-06:00');

describe('BLACKFRIDAY', () => {
  it('baja Nursing 10% y habilita meses sin intereses en su vigencia', () => {
    expect(precioConPromo(5000, 'blackfriday', 'nursing', dentro)).toBe(4500);
    expect(porcentajeCodigo('BLACKFRIDAY', 'nursing', dentro)).toBe(0.1);
    expect(habilitaMeses('BLACKFRIDAY', 'nursing', dentro)).toBe(true);
  });
  it('no aplica fuera de fechas ni en otros programas', () => {
    expect(precioConPromo(5000, 'BLACKFRIDAY', 'nursing', fuera)).toBe(5000);
    expect(habilitaMeses('BLACKFRIDAY', 'nursing', fuera)).toBe(false);
    expect(precioConPromo(10000, 'BLACKFRIDAY', 'step1', dentro)).toBe(10000);
  });
});
