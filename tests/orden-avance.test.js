// Orden de las lecciones (regla orden_avance, supabase/curso-avance.sql):
// en un curso "en orden" cada lección se abre al terminar las obligatorias
// anteriores; en "libre" el alumno abre cualquiera.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
vi.mock('../src/lib/supabase', () => ({ supabase: { from: () => ({ upsert }) } }));
vi.mock('../src/lib/traerTodo', () => ({ traerTodo: async () => [] }));

const { leccionesBloqueadas, leccionImplicita } = await import('../src/lib/lecciones.js');
const { REGLAS_BASE, ORDENES_AVANCE, guardarReglasCurso, textoOrdenAvance } = await import('../src/lib/reglas.js');

const leccion = (id, extra = {}) => ({ id, titulo: `Lección ${id}`, tipo: 'texto', obligatoria: true, ...extra });
const seccion = (id) => ({ id, titulo: `Módulo ${id}`, tipo: 'seccion', obligatoria: false });
const hecha = { porcentaje: 100, completada: true };
const ids = (set) => [...set].sort((a, b) => a - b);

describe('leccionesBloqueadas', () => {
  const curso = [leccion(1), leccion(2), leccion(3)];

  it('en modo libre no bloquea nada (y es el valor por defecto)', () => {
    expect(REGLAS_BASE.orden_avance).toBe('libre');
    expect(leccionesBloqueadas(curso, {}, 'libre').size).toBe(0);
    expect(leccionesBloqueadas(curso, {}, undefined).size).toBe(0);
    expect(leccionesBloqueadas(curso, {}, REGLAS_BASE.orden_avance).size).toBe(0);
  });

  it('en orden: sin avance solo se abre la primera', () => {
    expect(ids(leccionesBloqueadas(curso, {}, 'secuencial'))).toEqual([2, 3]);
  });

  it('en orden: con avance parcial se abre hasta la primera pendiente', () => {
    expect(ids(leccionesBloqueadas(curso, { 1: hecha }, 'secuencial'))).toEqual([3]);
    expect(ids(leccionesBloqueadas(curso, { 1: hecha, 2: hecha }, 'secuencial'))).toEqual([]);
  });

  it('un video a medias o una lección sin completar sigue bloqueando', () => {
    const progreso = { 1: { porcentaje: 80, completada: false } };
    expect(ids(leccionesBloqueadas(curso, progreso, 'secuencial'))).toEqual([2, 3]);
  });

  it('las secciones son solo títulos: no cuentan ni se bloquean', () => {
    const conSecciones = [seccion(10), leccion(1), seccion(20), leccion(2), leccion(3)];
    const bloqueadas = leccionesBloqueadas(conSecciones, { 1: hecha }, 'secuencial');
    expect(ids(bloqueadas)).toEqual([3]);
    expect(bloqueadas.has(10)).toBe(false);
    expect(bloqueadas.has(20)).toBe(false);
  });

  it('una lección opcional no bloquea a las que siguen, pero espera a las obligatorias anteriores', () => {
    const conOpcional = [leccion(1), leccion(2, { obligatoria: false }), leccion(3)];
    // Sin avance: la opcional (2) y la 3 esperan a la 1.
    expect(ids(leccionesBloqueadas(conOpcional, {}, 'secuencial'))).toEqual([2, 3]);
    // Con la 1 terminada se abren la opcional y la 3, aunque la opcional siga pendiente.
    expect(ids(leccionesBloqueadas(conOpcional, { 1: hecha }, 'secuencial'))).toEqual([]);
  });

  it('la clase única de un curso sin lecciones nunca se bloquea', () => {
    const unica = [leccionImplicita({ id: 7, title: 'Curso' }, 'abc')];
    expect(leccionesBloqueadas(unica, {}, 'secuencial', 0).size).toBe(0);
  });

  it('acepta listas vacías o progreso nulo', () => {
    expect(leccionesBloqueadas([], null, 'secuencial').size).toBe(0);
    expect(leccionesBloqueadas(null, null, 'secuencial').size).toBe(0);
    expect(ids(leccionesBloqueadas(curso, null, 'secuencial'))).toEqual([2, 3]);
  });
});

describe('Regla de avance en las reglas del curso', () => {
  beforeEach(() => upsert.mockReset());

  it('tiene etiquetas claras', () => {
    expect(Object.keys(ORDENES_AVANCE)).toEqual(['libre', 'secuencial']);
    expect(textoOrdenAvance('secuencial')).toBe('Lecciones en orden');
    expect(textoOrdenAvance('libre')).toBe('Avance libre');
  });

  it('guarda el orden elegido', async () => {
    upsert.mockResolvedValue({ error: null });
    await guardarReglasCurso(7, { ...REGLAS_BASE, orden_avance: 'secuencial' });
    expect(upsert.mock.calls[0][0][0].orden_avance).toBe('secuencial');
  });

  it('antes de la migración guarda "libre" sin la columna', async () => {
    upsert
      .mockResolvedValueOnce({ error: { code: 'PGRST204', message: "Could not find the 'orden_avance' column of 'curso_reglas' in the schema cache" } })
      .mockResolvedValueOnce({ error: null });
    await guardarReglasCurso(7, { ...REGLAS_BASE });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect('orden_avance' in upsert.mock.calls[1][0][0]).toBe(false);
  });

  it('antes de la migración pide correrla para el avance en orden', async () => {
    upsert.mockResolvedValue({ error: { code: '42703', message: 'column "orden_avance" of relation "curso_reglas" does not exist' } });
    await expect(guardarReglasCurso(7, { ...REGLAS_BASE, orden_avance: 'secuencial' })).rejects.toThrow(/curso-avance\.sql/);
  });

  it('sin ninguna de las dos migraciones guarda lo de siempre', async () => {
    upsert
      .mockResolvedValueOnce({ error: { code: 'PGRST204', message: "Could not find the 'modo_acceso' column" } })
      .mockResolvedValueOnce({ error: { code: 'PGRST204', message: "Could not find the 'orden_avance' column" } })
      .mockResolvedValueOnce({ error: null });
    await guardarReglasCurso(7, { ...REGLAS_BASE });
    const ultima = upsert.mock.calls[2][0][0];
    expect('modo_acceso' in ultima || 'orden_avance' in ultima).toBe(false);
  });
});
