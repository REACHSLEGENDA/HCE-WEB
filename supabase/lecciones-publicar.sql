-- ============================================================================
-- Publicar / despublicar lecciones (27 nov 2026), como "Despublicar unidad" de
-- TalentLMS. Una lección despublicada no la ven los alumnos ni cuenta para
-- terminar el curso, el examen final o el certificado, hasta que la
-- administradora la publique (p. ej. el examen final y la encuesta de
-- satisfacción, que se abren el último día del presencial).
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.
-- Es idempotente. Todas las lecciones que ya existen quedan publicadas.
-- ============================================================================

alter table public.curso_lecciones add column if not exists publicada boolean not null default true;

notify pgrst, 'reload schema';
