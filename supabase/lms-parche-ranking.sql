-- ============================================================================
-- Parche: la tabla de posiciones y los logros solo para alumnos con sesión.
--
-- Supabase da permiso de ejecutar cada función nueva a PUBLIC (todos). En
-- lms-estructura.sql se le quitó al rol anónimo, pero este lo sigue heredando
-- de PUBLIC, así que la tabla de posiciones (nombre corto y puntos) se podía
-- consultar sin iniciar sesión. Aquí se quita de PUBLIC y, además, la función
-- deja de devolver filas a quien no tenga sesión, por si el permiso se volviera
-- a abrir por error.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
-- ============================================================================

create or replace function public.tabla_posiciones(limite integer default 10)
returns table (posicion bigint, nombre text, puntos integer, soy_yo boolean)
language sql stable security definer set search_path = public
as $$
  select rank() over (order by t.puntos desc),
         trim(split_part(coalesce(p.nombre_completo, 'Alumno'), ' ', 1) || ' ' ||
              coalesce(nullif(left(split_part(coalesce(p.nombre_completo, ''), ' ', 2), 1), '') || '.', '')),
         t.puntos,
         t.user_id = auth.uid()
  from public._puntos_alumnos() t
  join public.profiles p on p.id = t.user_id
  where auth.uid() is not null
    and p.mostrar_en_ranking
    and t.puntos > 0
  order by t.puntos desc
  limit greatest(1, least(limite, 50));
$$;

revoke execute on function public.mis_logros() from public, anon;
revoke execute on function public.tabla_posiciones(integer) from public, anon;
grant execute on function public.mis_logros() to authenticated;
grant execute on function public.tabla_posiciones(integer) to authenticated;
