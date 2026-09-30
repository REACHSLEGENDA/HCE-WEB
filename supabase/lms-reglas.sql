-- ============================================================================
-- Reglas de cada curso (como "Disponibilidad", "Límites" y "Finalización" de
-- TalentLMS):
--   - mostrarlo o no en el catálogo
--   - cupo máximo de alumnos
--   - solicitud de inscripción (un administrador aprueba a quién entra)
--   - días de acceso después de inscribirse, y si se conserva al terminar
--   - cursos prerrequisito
--   - cuándo se da por terminado: con el examen final, al completar las
--     lecciones obligatorias, o con cierto porcentaje de lecciones
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere cuentas-aprobacion.sql y lms-estructura.sql.
-- ============================================================================

create table if not exists public.curso_reglas (
  course_id bigint primary key references public.courses(id) on delete cascade,
  oculto_catalogo boolean not null default false,
  cupo integer,
  requiere_solicitud boolean not null default false,
  dias_acceso integer,
  conservar_acceso boolean not null default true,
  prerrequisitos bigint[] not null default '{}',
  regla_finalizacion text not null default 'examen_final',
  porcentaje_finalizacion integer not null default 100,
  actualizado_en timestamptz not null default now()
);

alter table public.curso_reglas drop constraint if exists curso_reglas_finalizacion_check;
alter table public.curso_reglas
  add constraint curso_reglas_finalizacion_check
  check (regla_finalizacion in ('examen_final', 'lecciones', 'porcentaje'));
alter table public.curso_reglas drop constraint if exists curso_reglas_porcentaje_check;
alter table public.curso_reglas
  add constraint curso_reglas_porcentaje_check check (porcentaje_finalizacion between 1 and 100);

-- Las reglas son públicas (el catálogo las necesita para mostrar "cupo lleno"
-- o "requiere otro curso"); solo el administrador las cambia.
alter table public.curso_reglas enable row level security;
drop policy if exists "reglas: leer" on public.curso_reglas;
create policy "reglas: leer" on public.curso_reglas for select using (true);
drop policy if exists "reglas: admin" on public.curso_reglas;
create policy "reglas: admin" on public.curso_reglas
  for all using (public.es_admin()) with check (public.es_admin());


-- Solicitudes de inscripción -----------------------------------------------------

create table if not exists public.solicitudes_inscripcion (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  estado text not null default 'pendiente',
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz,
  unique (user_id, course_id)
);

alter table public.solicitudes_inscripcion drop constraint if exists solicitudes_estado_check;
alter table public.solicitudes_inscripcion
  add constraint solicitudes_estado_check check (estado in ('pendiente', 'aprobada', 'rechazada'));

-- Las crea y resuelve el servidor (curso-inscripcion); el alumno ve las suyas.
alter table public.solicitudes_inscripcion enable row level security;
drop policy if exists "solicitudes: leer" on public.solicitudes_inscripcion;
create policy "solicitudes: leer" on public.solicitudes_inscripcion
  for select using (auth.uid() = user_id or public.es_admin());


-- Lugares ocupados de los cursos con cupo ----------------------------------------
--
-- El alumno solo puede leer sus propias inscripciones; para mostrar "quedan 3
-- lugares" se expone solo el conteo, y solo de cursos con cupo.
create or replace function public.lugares_ocupados()
returns table (course_id bigint, inscritos integer)
language sql stable security definer set search_path = public
as $$
  select r.course_id, count(i.id)::int
  from public.curso_reglas r
  left join public.inscripciones i on i.course_id = r.course_id
  where r.cupo is not null
  group by r.course_id;
$$;

revoke execute on function public.lugares_ocupados() from public;
grant execute on function public.lugares_ocupados() to anon, authenticated;


-- Acceso con fecha de vencimiento ------------------------------------------------
--
-- Si el curso tiene días de acceso, el alumno deja de ver el contenido al
-- cumplirse (a menos que ya lo haya terminado y el curso conserve el acceso).
-- esta_inscrito() es la función que usan todas las políticas del contenido.

create or replace function public.acceso_vigente(p_course bigint, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case
      when r.dias_acceso is null then true
      when i.created_at + make_interval(days => r.dias_acceso) > now() then true
      when r.conservar_acceso and exists (
        select 1 from public.certificates c where c.user_id = p_user and c.course_id = p_course
      ) then true
      else false
    end
    from public.inscripciones i
    left join public.curso_reglas r on r.course_id = i.course_id
    where i.user_id = p_user and i.course_id = p_course
    limit 1
  ), true);
$$;

create or replace function public.esta_inscrito(p_course bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.cuenta_habilitada()
    and exists (
      select 1 from public.inscripciones
      where user_id = auth.uid() and course_id = p_course
    )
    and public.acceso_vigente(p_course, auth.uid());
$$;
