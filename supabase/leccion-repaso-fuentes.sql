-- ============================================================================
-- Fuentes y preguntas de repaso en lecturas y páginas web (24 nov 2026).
--
-- 1) fuentes: texto, una fuente por línea. Se pega la liga y el aula la
--    convierte en enlace sola ("ELSO Guidelines https://www.elso.org/...").
-- 2) repaso: preguntas cortas al final de la lección para que el alumno
--    compruebe lo que entendió: contesta y ve al instante si acertó, con una
--    explicación. No se califican ni cuentan para el examen final (para eso
--    está la lección de tipo Examen). Se guardan como JSON:
--    [{ "pregunta": "...", "opciones": ["...", "..."], "correcta": 0, "explicacion": "..." }]
--
-- Las ven los mismos que ya ven la lección (misma política de la tabla).
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.
-- Es idempotente. Mientras no se corra, el sitio funciona igual, solo que no
-- deja guardar fuentes ni preguntas de repaso.
-- ============================================================================

alter table public.leccion_contenido add column if not exists fuentes text;
alter table public.leccion_contenido add column if not exists repaso jsonb;
