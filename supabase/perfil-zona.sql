-- ============================================================================
-- Zona horaria de cada alumno: con ella el portal le muestra en su hora las
-- sesiones en vivo, los webinars y el calendario. Vacía = la de su equipo.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- ============================================================================

alter table public.profiles add column if not exists zona_horaria text;
