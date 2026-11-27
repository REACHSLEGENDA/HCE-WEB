// Lecciones en borrador (despublicadas): el alumno no las ve; el admin sí.
import { describe, expect, it, vi } from 'vitest';

const filas = [
  { id: 1, course_id: 3, orden: 1, titulo: 'Bienvenida', tipo: 'texto', obligatoria: true },
  { id: 2, course_id: 3, orden: 2, titulo: 'Examen final', tipo: 'examen', obligatoria: true, publicada: false },
  { id: 3, course_id: 3, orden: 3, titulo: 'Encuesta', tipo: 'encuesta', obligatoria: true, publicada: true },
];

vi.mock('../src/lib/supabase', () => {
  const consulta = (datos) => {
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, then: (r) => Promise.resolve({ data: datos, error: null }).then(r) };
    return q;
  };
  return { supabase: { from: (tabla) => consulta(tabla === 'curso_lecciones' ? filas : []) } };
});

const { cargarLecciones, estaPublicada } = await import('../src/lib/lecciones.js');

describe('Lecciones en borrador', () => {
  it('el alumno no ve las despublicadas', async () => {
    const lista = await cargarLecciones(3);
    expect(lista.map((l) => l.id)).toEqual([1, 3]);
  });
  it('el administrador las ve todas', async () => {
    const lista = await cargarLecciones(3, { incluirNoPublicadas: true });
    expect(lista.map((l) => l.id)).toEqual([1, 2, 3]);
  });
  it('sin la columna, todas cuentan como publicadas', () => {
    expect(estaPublicada({ id: 1 })).toBe(true);
    expect(estaPublicada({ id: 1, publicada: false })).toBe(false);
  });
});
