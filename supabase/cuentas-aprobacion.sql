-- ============================================================================
-- Aprobación de cuentas: quien se registra entra al portal y puede inscribirse
-- o comprar, pero sus cursos quedan cerrados hasta que un administrador le da
-- acceso (y le asigna grupo). Además, el bloqueo de cuentas deja de ser solo
-- una etiqueta: una cuenta bloqueada no ve el contenido de ningún curso.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
-- Requiere cursos-inscripciones.sql (usa es_admin() y esta_inscrito()).
--
-- Las cuentas que ya existen quedan aprobadas: solo las nuevas esperan.
-- ============================================================================

alter table public.profiles add column if not exists activo boolean default true;
update public.profiles set activo = true where activo is null;
alter table public.profiles alter column activo set default true;
alter table public.profiles alter column activo set not null;

alter table public.profiles add column if not exists aprobado boolean not null default true;
alter table public.profiles add column if not exists aprobado_en timestamptz;


-- 1. Nadie se aprueba ni se da permisos a sí mismo ----------------------------
--
-- Al crearse una cuenta (registro normal, o el perfil que el portal reconstruye
-- si faltaba) queda como alumno y pendiente, diga lo que diga el registro.
-- Solo el servidor (las funciones de Netlify) crea cuentas ya aprobadas.
--
-- Al editar su perfil, el alumno puede cambiar sus datos, pero no su rol ni el
-- estado de su cuenta: esos solo los cambia un administrador, el servidor o el
-- SQL Editor.
--
-- OJO: divisiones.sql vuelve a definir profiles_proteger() para proteger también
-- la división. Si corres de nuevo este archivo, corre después divisiones.sql.

create or replace function public.profiles_proteger()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  quien text := coalesce(auth.role(), '');
begin
  if tg_op = 'INSERT' then
    if quien <> 'service_role' then
      new.rol := 'estudiante';
      new.aprobado := false;
      new.aprobado_en := null;
      new.activo := true;
    end if;
    return new;
  end if;

  -- UPDATE: sin sesión (SQL Editor) o con la llave de servidor, se permite.
  if quien in ('', 'service_role') or public.es_admin() then
    return new;
  end if;

  new.rol := old.rol;
  new.activo := old.activo;
  new.aprobado := old.aprobado;
  new.aprobado_en := old.aprobado_en;
  return new;
end;
$$;

drop trigger if exists profiles_proteger on public.profiles;
create trigger profiles_proteger
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger();


-- 2. Solo las cuentas activas y aprobadas toman cursos -----------------------
--
-- esta_inscrito() es lo que usan las políticas del contenido de las lecciones,
-- el avance, las tareas y el registro de visitas. Con esta condición, una
-- cuenta pendiente o bloqueada no ve nada aunque tenga inscripciones.
--
-- OJO: lms-reglas.sql vuelve a definir esta_inscrito() para sumar los días de
-- acceso. Si corres de nuevo este archivo, corre después lms-reglas.sql.

create or replace function public.cuenta_habilitada()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rol = 'admin' or (activo and aprobado) from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.esta_inscrito(p_course bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.cuenta_habilitada() and exists (
    select 1 from public.inscripciones
    where user_id = auth.uid() and course_id = p_course
  );
$$;

create index if not exists profiles_pendientes_idx on public.profiles (created_at) where not aprobado;
