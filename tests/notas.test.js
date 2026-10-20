// Notas por lección: formato del minuto del video.
import { describe, expect, it } from 'vitest';
import { formatoMinuto } from '../src/lib/notas.js';

describe('Notas por lección', () => {
  it('muestra el minuto como en YouTube', () => {
    expect(formatoMinuto(0)).toBe('0:00');
    expect(formatoMinuto(192)).toBe('3:12');
    expect(formatoMinuto(3725)).toBe('1:02:05');
    expect(formatoMinuto(null)).toBe('');
  });
});
