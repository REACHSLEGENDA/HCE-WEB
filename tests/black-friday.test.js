// Black Friday de Nursing AUTOMÁTICO (sin código): 10% y meses sin intereses,
// del 27 de noviembre al 2 de diciembre de 2026 a las 23:59 (hora de México).
import { describe, expect, it } from 'vitest';
import { habilitaMeses, porcentajePromo, precioConPromo, promoAutomatica } from '../netlify/functions/_promos.js';
import { blackFridayNursing, precioNursing } from '../src/data/nursing.js';

const dentro = new Date('2026-11-28T12:00:00-06:00');
const ultimoMinuto = new Date('2026-12-02T23:59:00-06:00');
const fuera = new Date('2026-12-03T00:00:30-06:00');

describe('Black Friday automático de Nursing', () => {
  it('baja 10% sin código y habilita meses sin intereses', () => {
    expect(precioConPromo(5000, null, 'nursing', dentro)).toBe(4500);
    expect(Math.floor(250 * (1 - porcentajePromo(null, 'nursing', dentro)))).toBe(225);
    expect(habilitaMeses(null, 'nursing', dentro)).toBe(true);
    expect(promoAutomatica('nursing', dentro).etiqueta).toBe('BLACKFRIDAY');
  });
  it('sigue el miércoles 2 a las 23:59 y termina solo después', () => {
    expect(precioConPromo(5000, null, 'nursing', ultimoMinuto)).toBe(4500);
    expect(precioConPromo(5000, null, 'nursing', fuera)).toBe(5000);
    expect(habilitaMeses(null, 'nursing', fuera)).toBe(false);
  });
  it('no aplica a otros programas', () => {
    expect(precioConPromo(10000, null, 'step1', dentro)).toBe(10000);
  });
  it('la página pinta el mismo precio que cobra el servidor', () => {
    expect(precioNursing(dentro)).toEqual({ mxn: 4500, usd: 225 });
    expect(precioNursing(fuera)).toEqual({ mxn: 5000, usd: 250 });
    expect(blackFridayNursing(fuera)).toBeNull();
  });
});
