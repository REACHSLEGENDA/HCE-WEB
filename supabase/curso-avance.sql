-- ============================================================================
-- Orden de las lecciones de cada curso (regla "Avance" en Reglas del curso):
--   - 'libre': el alumno abre cualquier lección en el orden que quiera
--     (como hasta ahora, y el valor por defecto)
--   - 'secuencial': una lección se abre al terminar las lecciones
--     obligatorias anteriores. Las secciones son solo títulos y no cuentan;
--     las lecciones opcionales no bloquean a las que siguen.
--
-- Mientras no se corra, todos los cursos siguen como 'libre'.
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.
-- Es idempotente y solo agrega. Requiere lms-reglas.sql.
-- ============================================================================

alter table public.curso_reglas
  add column if not exists orden_avance text not null default 'libre';

alter table public.curso_reglas drop constraint if exists curso_reglas_orden_avance_check;
alter table public.curso_reglas
  add constraint curso_reglas_orden_avance_check check (orden_avance in ('libre', 'secuencial'));

-- Que PostgREST vea la columna nueva sin esperar.
notify pgrst, 'reload schema';
