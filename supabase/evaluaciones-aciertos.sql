-- ============================================================================
-- Exámenes: "Cuántas contestó bien" separado de "Su calificación" (27 nov 2026).
--
-- Al terminar un examen, la administradora elige por separado si el alumno ve:
--   su calificación (85%), cuántas contestó bien (17 de 20), si cada respuesta
--   fue correcta o incorrecta, y las respuestas correctas.
-- Antes, la calificación y los aciertos iban juntos: se copia ese valor para
-- que los exámenes que ya existen se vean igual que hoy.
--
-- Requiere evaluaciones-mejoras.sql (ya corrida).
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.
-- Es idempotente. Mientras no se corra, los aciertos siguen a la calificación.
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'evaluacion_config' and column_name = 'mostrar_aciertos') then
    alter table public.evaluacion_config add column mostrar_aciertos boolean not null default true;
    update public.evaluacion_config set mostrar_aciertos = mostrar_calificacion;
  end if;
end $$;

notify pgrst, 'reload schema';
