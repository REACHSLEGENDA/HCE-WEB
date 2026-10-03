-- ============================================================================
-- Cursos por generación: el alumno paga (o se inscribe), su lugar queda
-- apartado, el administrador lo junta en un grupo y el curso se abre a todo el
-- grupo en su fecha de inicio.
--
-- Cada curso elige su modo en Reglas del curso:
--   'inmediato'  como hasta ahora: inscrito (y con cuenta aprobada) = acceso.
--   'grupo'      además debe estar en un grupo que tenga el curso, y la fecha
--                de apertura de ese grupo para el curso ya debe haber llegado.
-- Los cursos existentes quedan en 'inmediato': nada cambia hasta que el
-- administrador elija 'grupo'.
--
-- Excepciones del modo 'grupo': el administrador; quien fue inscrito a mano
-- por el administrador (origen 'admin', es su decisión); y quien ya terminó
-- el curso (tiene certificado).
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere lms-estructura.sql, lms-reglas.sql, cuentas-aprobacion.sql,
-- notificaciones.sql y endurecimiento.sql.
-- ============================================================================
begin;

alter table public.curso_reglas add column if not exists modo_acceso text not null default 'inmediato';
alter table public.curso_reglas drop constraint if exists curso_reglas_modo_acceso_check;
alter table public.curso_reglas
  add constraint curso_reglas_modo_acceso_check check (modo_acceso in ('inmediato', 'grupo'));

-- Fecha en que el curso se abre para ese grupo. Vacía = se abre al asignarlo.
alter table public.grupo_cursos add column if not exists abre_en timestamptz;

-- Fecha desde la que el curso está abierto para el alumno por su grupo
-- (la más temprana de sus grupos ya abiertos), o null si todavía no.
create or replace function public.apertura_por_grupo(p_course bigint, p_user uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select min(coalesce(gc.abre_en, gm.agregado_en))
  from public.grupo_miembros gm
  join public.grupo_cursos gc on gc.grupo_id = gm.grupo_id
  where gm.user_id = p_user and gc.course_id = p_course
    and (gc.abre_en is null or gc.abre_en <= now());
$$;

create or replace function public.acceso_por_grupo(p_course bigint, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when coalesce((select r.modo_acceso from public.curso_reglas r where r.course_id = p_course), 'inmediato') <> 'grupo' then true
    when exists (select 1 from public.profiles p where p.id = p_user and p.rol = 'admin') then true
    when exists (select 1 from public.inscripciones i
      where i.user_id = p_user and i.course_id = p_course and i.origen = 'admin') then true
    when exists (select 1 from public.certificates c where c.user_id = p_user and c.course_id = p_course) then true
    else public.apertura_por_grupo(p_course, p_user) is not null
  end;
$$;

-- Los días de acceso de un curso por generación cuentan desde que se abre
-- para el alumno, no desde que pagó (puede pagar semanas antes).
create or replace function public.acceso_vigente(p_course bigint, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case
      when r.dias_acceso is null then true
      when greatest(
        i.created_at,
        case when r.modo_acceso = 'grupo'
          then coalesce(public.apertura_por_grupo(p_course, p_user), i.created_at)
          else i.created_at end
      ) + make_interval(days => r.dias_acceso) > now() then true
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
    and public.acceso_vigente(p_course, auth.uid())
    and public.acceso_por_grupo(p_course, auth.uid());
$$;

-- Solo el servidor las consulta para cualquier alumno; el alumno usa
-- mi_apertura() para lo suyo.
revoke execute on function public.apertura_por_grupo(bigint, uuid) from public, anon, authenticated;
revoke execute on function public.acceso_por_grupo(bigint, uuid) from public, anon, authenticated;
revoke execute on function public.acceso_vigente(bigint, uuid) from public, anon, authenticated;
grant execute on function public.apertura_por_grupo(bigint, uuid) to service_role;
grant execute on function public.acceso_por_grupo(bigint, uuid) to service_role;
grant execute on function public.acceso_vigente(bigint, uuid) to service_role;

-- Lo que el alumno puede saber de su propia apertura (los grupos solo los
-- lee el administrador): si el curso es por grupo, si ya tiene grupo con ese
-- curso, y la próxima fecha de apertura.
create or replace function public.mi_apertura(p_course bigint)
returns table (modo text, con_grupo boolean, abre_en timestamptz, abierto boolean, abierto_desde timestamptz)
language sql stable security definer set search_path = public
as $$
  select
    coalesce((select r.modo_acceso from public.curso_reglas r where r.course_id = p_course), 'inmediato'),
    exists (select 1 from public.grupo_miembros gm join public.grupo_cursos gc on gc.grupo_id = gm.grupo_id
      where gm.user_id = auth.uid() and gc.course_id = p_course),
    (select min(gc.abre_en) from public.grupo_miembros gm join public.grupo_cursos gc on gc.grupo_id = gm.grupo_id
      where gm.user_id = auth.uid() and gc.course_id = p_course and gc.abre_en > now()),
    public.acceso_por_grupo(p_course, auth.uid()),
    public.apertura_por_grupo(p_course, auth.uid());
$$;
revoke all on function public.mi_apertura(bigint) from public, anon;
grant execute on function public.mi_apertura(bigint) to authenticated, service_role;

-- Aviso "tu curso ya está abierto" (lo manda notificaciones-programadas).
alter table public.notificaciones drop constraint if exists notificaciones_evento_check;
alter table public.notificaciones
  add constraint notificaciones_evento_check check (evento in (
    'registro_nuevo', 'cuenta_activada', 'inscrito_curso', 'sesion_registro',
    'sesion_recordatorio', 'examen_aprobado', 'tarea_revisada', 'curso_completado', 'mensaje_nuevo',
    'curso_abierto'
  ));

insert into public.notificaciones (nombre, evento, destinatario, asunto, cuerpo)
select 'Curso abierto', 'curso_abierto', 'alumno',
  '¡Tu curso {curso} ya está abierto!',
  E'Hola {nombre}:\n\nTu grupo ya comenzó: {curso} está abierto y puedes empezar cuando quieras.'
where not exists (
  select 1 from public.notificaciones n
  where n.evento = 'curso_abierto' and n.destinatario = 'alumno' and n.course_id is null
);

commit;
