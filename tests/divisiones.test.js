// Divisiones como TalentLMS: catálogo exclusivo e inscripción automática.
import { describe, expect, it } from 'vitest';
import { cursoDisponiblePara, inscribirEnDivision } from '../netlify/functions/_divisiones.js';

// Base mínima en memoria con lo que usan las funciones.
function base({ perfiles = [], divisiones = [], divisionCursos = [], inscripciones = [] } = {}) {
  const tablas = { profiles: perfiles, divisiones, division_cursos: divisionCursos, inscripciones };
  return {
    tablas,
    from(nombre) {
      const filtros = [];
      let filasUpsert = null;
      const q = {
        select: () => q,
        eq: (c, v) => { filtros.push((f) => f[c] === v); return q; },
        neq: (c, v) => { filtros.push((f) => f[c] !== v); return q; },
        maybeSingle: async () => ({ data: tablas[nombre].filter((f) => filtros.every((fn) => fn(f)))[0] || null, error: null }),
        upsert: (filas) => { filasUpsert = filas; return q; },
        then: (ok) => {
          if (filasUpsert) {
            const nuevas = filasUpsert.filter((n) => !tablas[nombre].some((f) => f.user_id === n.user_id && f.course_id === n.course_id));
            tablas[nombre].push(...nuevas);
            return ok({ data: nuevas, error: null });
          }
          return ok({ data: tablas[nombre].filter((f) => filtros.every((fn) => fn(f))), error: null });
        },
      };
      return q;
    },
  };
}

describe('Divisiones', () => {
  const divisiones = [
    { id: 1, nombre: 'Hospital X', catalogo: 'propio', inscripcion_auto: true },
    { id: 2, nombre: 'Asociación Y', catalogo: 'propio_y_hce', inscripcion_auto: false },
  ];
  const divisionCursos = [{ division_id: 1, course_id: 10 }, { division_id: 2, course_id: 20 }];

  it('un curso de una división es exclusivo de sus alumnos', async () => {
    const db = base({ perfiles: [{ id: 'hce', division_id: null }, { id: 'x', division_id: 1 }], divisiones, divisionCursos });
    expect((await cursoDisponiblePara(db, 'hce', 10)).disponible).toBe(false);
    expect((await cursoDisponiblePara(db, 'x', 10)).disponible).toBe(true);
    expect((await cursoDisponiblePara(db, 'hce', 99)).disponible).toBe(true);
  });

  it('catálogo "propio" solo deja sus cursos; "propio y HCE" también el general', async () => {
    const db = base({ perfiles: [{ id: 'x', division_id: 1 }, { id: 'y', division_id: 2 }], divisiones, divisionCursos });
    expect((await cursoDisponiblePara(db, 'x', 99)).disponible).toBe(false);
    expect((await cursoDisponiblePara(db, 'y', 99)).disponible).toBe(true);
    expect((await cursoDisponiblePara(db, 'y', 10)).disponible).toBe(false);
  });

  it('inscribe a sus alumnos en sus cursos una sola vez', async () => {
    const db = base({ perfiles: [{ id: 'a', division_id: 1, rol: 'estudiante' }, { id: 'b', division_id: 1, rol: 'estudiante' }], divisiones, divisionCursos });
    expect((await inscribirEnDivision(db, 1)).inscritos).toBe(2);
    expect((await inscribirEnDivision(db, 1)).inscritos).toBe(0);
    expect(db.tablas.inscripciones.every((i) => i.origen === 'division' && i.course_id === 10)).toBe(true);
  });

  it('sin inscripción automática no inscribe a nadie', async () => {
    const db = base({ perfiles: [{ id: 'c', division_id: 2, rol: 'estudiante' }], divisiones, divisionCursos });
    expect((await inscribirEnDivision(db, 2)).inscritos).toBe(0);
  });
});
