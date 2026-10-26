-- Mueve el testimonio de "Madelyn Raquel Valle Ramos" en /comunidad a la
-- categoría "Manejo de Avanzada en Insuficiencia Cardíaca"
-- (id en el código: 'Insuficiencia Cardiaca', columna testimonials.experience).
--
-- El nombre no vive en testimonials: se toma de profiles.nombre_completo
-- (testimonials.user_id -> profiles.id).
--
-- Seguro e idempotente:
--   * solo toca testimonios de esa persona que hoy NO están en
--     'Insuficiencia Cardiaca' (si se corre dos veces, la segunda no hace nada);
--   * solo actualiza si encuentra exactamente UN testimonio que mover; si
--     encuentra varios (o ninguno), no cambia nada y lo avisa, para revisarlo
--     a mano con la consulta del paso 1.

-- 1) Revisar primero (opcional): qué testimonios tiene y en qué categoría.
select t.id, t.experience, t.created_at, p.nombre_completo, left(t.content, 80) as inicio
from public.testimonials t
join public.profiles p on p.id = t.user_id
where lower(p.nombre_completo) like '%madelyn%'
  and lower(p.nombre_completo) like '%valle%'
  and lower(p.nombre_completo) like '%ramos%'
order by t.created_at;

-- 2) Mover.
do $$
declare
  n integer;
begin
  select count(*) into n
  from public.testimonials t
  join public.profiles p on p.id = t.user_id
  where lower(p.nombre_completo) like '%madelyn%'
    and lower(p.nombre_completo) like '%valle%'
    and lower(p.nombre_completo) like '%ramos%'
    and t.experience <> 'Insuficiencia Cardiaca';

  if n = 0 then
    raise notice 'Nada que mover: el testimonio ya está en Insuficiencia Cardiaca o no se encontró.';
  elsif n > 1 then
    raise notice 'Se encontraron % testimonios fuera de Insuficiencia Cardiaca; no se cambió nada. Revisa el paso 1 y mueve el correcto por id.', n;
  else
    update public.testimonials t
    set experience = 'Insuficiencia Cardiaca'
    from public.profiles p
    where p.id = t.user_id
      and lower(p.nombre_completo) like '%madelyn%'
      and lower(p.nombre_completo) like '%valle%'
      and lower(p.nombre_completo) like '%ramos%'
      and t.experience <> 'Insuficiencia Cardiaca';
    raise notice 'Listo: 1 testimonio movido a Insuficiencia Cardiaca.';
  end if;
end $$;
