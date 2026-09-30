-- ============================================================================
-- Gamificación completa (como "Gamificación" de TalentLMS): los puntos cuentan
-- también exámenes y encuestas de lección, tareas, sesiones en vivo e inicios
-- de sesión; hay niveles por puntos y recompensas (descuento en los cursos de
-- pago al llegar a cierto nivel). Las insignias por categoría se calculan en
-- el navegador a partir de estos mismos conteos.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
-- Requiere: lms-estructura.sql, lms-evaluaciones.sql, lms-sesiones.sql y
-- actividad-portal.sql.
-- ============================================================================

-- Configuración (una sola fila).
create table if not exists public.gamificacion_config (
  id integer primary key default 1 check (id = 1),
  activo boolean not null default true,
  puntos_por_nivel integer not null default 200 check (puntos_por_nivel > 0),
  -- [{ "nivel": 3, "descuento": 10 }, …]: al llegar al nivel, ese % de
  -- descuento en los cursos de pago.
  recompensas jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into public.gamificacion_config (id) values (1) on conflict (id) do nothing;

alter table public.gamificacion_config enable row level security;
drop policy if exists "gamificacion: leer" on public.gamificacion_config;
create policy "gamificacion: leer" on public.gamificacion_config for select using (true);
drop policy if exists "gamificacion: admin" on public.gamificacion_config;
create policy "gamificacion: admin" on public.gamificacion_config
  for all using (public.es_admin()) with check (public.es_admin());


-- Puntos: se vuelve a crear con los conteos nuevos.
--   10 por lección completada        50 por curso certificado
--   20 por examen final a la primera 15 por examen de lección aprobado
--    5 por encuesta respondida       10 por tarea entregada
--   15 por webinar o sesión en vivo    5 por día de estudio
--    2 por día con inicio de sesión
drop function if exists public._puntos_alumnos();
create function public._puntos_alumnos()
returns table (
  user_id uuid,
  lecciones integer,
  certificados integer,
  primer_intento integer,
  perfectos integer,
  dias integer,
  webinars integer,
  examenes integer,
  encuestas integer,
  tareas integer,
  sesiones integer,
  logins integer,
  puntos integer
)
language sql stable security definer set search_path = public
as $$
  with
  lec as (
    select lp.user_id, count(*)::int as n
    from public.leccion_progreso lp
    join public.curso_lecciones l on l.id = lp.leccion_id
    where lp.completada and l.tipo not in ('examen', 'encuesta', 'sesion', 'seccion')
    group by lp.user_id
  ),
  cer as (
    select c.user_id, count(distinct c.course_id)::int as n from public.certificates c group by c.user_id
  ),
  ex as (
    select t.user_id,
           count(*) filter (where t.primero_aprobado)::int as primera,
           count(*) filter (where t.perfecto)::int as perfectos
    from (
      select e.user_id, e.course_id,
             (array_agg(coalesce((e.datos->>'aprobado')::boolean, false) order by e.creado_en))[1] as primero_aprobado,
             bool_or(coalesce((e.datos->>'calificacion')::numeric, 0) >= 100) as perfecto
      from public.curso_eventos e
      where e.tipo = 'examen_enviado'
      group by e.user_id, e.course_id
    ) t
    group by t.user_id
  ),
  evl as (
    select i.user_id,
           count(distinct i.leccion_id) filter (where i.aprobado)::int as examenes,
           count(distinct i.leccion_id) filter (where i.calificacion is null)::int as encuestas,
           count(distinct i.leccion_id) filter (where i.calificacion >= 100)::int as perfectos
    from public.evaluacion_intentos i
    group by i.user_id
  ),
  tar as (
    select t.user_id, count(distinct t.leccion_id)::int as n from public.tarea_entregas t group by t.user_id
  ),
  dias as (
    select s.user_id, count(distinct (s.iniciada_en at time zone 'America/Mexico_City')::date)::int as n
    from public.curso_sesiones s
    group by s.user_id
  ),
  web as (
    select w.user_id, count(*)::int as n from public.webinar_registros w where w.asistio and w.user_id is not null group by w.user_id
  ),
  ses as (
    select r.user_id, count(*)::int as n from public.sesion_registros r where r.asistio group by r.user_id
  ),
  ing as (
    select a.user_id, count(distinct (a.creado_en at time zone 'America/Mexico_City')::date)::int as n
    from public.actividad_portal a
    where a.tipo = 'login'
    group by a.user_id
  )
  select p.id,
         coalesce(lec.n, 0), coalesce(cer.n, 0), coalesce(ex.primera, 0),
         coalesce(ex.perfectos, 0) + coalesce(evl.perfectos, 0),
         coalesce(dias.n, 0), coalesce(web.n, 0),
         coalesce(evl.examenes, 0), coalesce(evl.encuestas, 0), coalesce(tar.n, 0), coalesce(ses.n, 0), coalesce(ing.n, 0),
         (coalesce(lec.n, 0) * 10 + coalesce(cer.n, 0) * 50 + coalesce(ex.primera, 0) * 20
          + coalesce(evl.examenes, 0) * 15 + coalesce(evl.encuestas, 0) * 5 + coalesce(tar.n, 0) * 10
          + (coalesce(web.n, 0) + coalesce(ses.n, 0)) * 15
          + coalesce(dias.n, 0) * 5 + coalesce(ing.n, 0) * 2)::int
  from public.profiles p
  left join lec  on lec.user_id  = p.id
  left join cer  on cer.user_id  = p.id
  left join ex   on ex.user_id   = p.id
  left join evl  on evl.user_id  = p.id
  left join tar  on tar.user_id  = p.id
  left join dias on dias.user_id = p.id
  left join web  on web.user_id  = p.id
  left join ses  on ses.user_id  = p.id
  left join ing  on ing.user_id  = p.id
  where coalesce(p.rol, 'estudiante') = 'estudiante';
$$;

revoke execute on function public._puntos_alumnos() from public, anon, authenticated;


-- Los logros del alumno que pregunta, con su nivel.
create or replace function public.mis_logros()
returns json
language sql stable security definer set search_path = public
as $$
  with todos as (select * from public._puntos_alumnos()),
  ranking as (
    select t.user_id, t.puntos,
           rank() over (order by t.puntos desc) as posicion
    from todos t join public.profiles p on p.id = t.user_id
    where p.mostrar_en_ranking and t.puntos > 0
  ),
  yo as (select * from todos where user_id = auth.uid()),
  cfg as (select * from public.gamificacion_config where id = 1)
  select json_build_object(
    'puntos', coalesce((select puntos from yo), 0),
    'lecciones', coalesce((select lecciones from yo), 0),
    'certificados', coalesce((select certificados from yo), 0),
    'primer_intento', coalesce((select primer_intento from yo), 0),
    'perfectos', coalesce((select perfectos from yo), 0),
    'dias', coalesce((select dias from yo), 0),
    'webinars', coalesce((select webinars from yo), 0),
    'examenes', coalesce((select examenes from yo), 0),
    'encuestas', coalesce((select encuestas from yo), 0),
    'tareas', coalesce((select tareas from yo), 0),
    'sesiones', coalesce((select sesiones from yo), 0),
    'logins', coalesce((select logins from yo), 0),
    'posicion', (select posicion from ranking where user_id = auth.uid()),
    'participantes', (select count(*) from ranking),
    'mostrar_en_ranking', coalesce((select mostrar_en_ranking from public.profiles where id = auth.uid()), true),
    'puntos_por_nivel', coalesce((select puntos_por_nivel from cfg), 200),
    'recompensas', coalesce((select recompensas from cfg), '[]'::json),
    'gamificacion_activa', coalesce((select activo from cfg), true)
  );
$$;

revoke execute on function public.mis_logros() from public, anon;
grant execute on function public.mis_logros() to authenticated;


-- Puntos de un alumno, para el descuento al cobrar. Solo el servidor.
create or replace function public.puntos_de_usuario(p_user uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce((select puntos from public._puntos_alumnos() where user_id = p_user), 0);
$$;

revoke execute on function public.puntos_de_usuario(uuid) from public, anon, authenticated;
grant execute on function public.puntos_de_usuario(uuid) to service_role;
