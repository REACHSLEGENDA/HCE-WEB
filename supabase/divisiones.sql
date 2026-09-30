-- ============================================================================
-- Divisiones (como "Divisiones" de TalentLMS): separar a otras asociaciones u
-- organizaciones dentro del mismo portal. Cada división tiene sus alumnos, sus
-- cursos y sus grupos, y el panel puede ver reportes solo de esa división.
--
-- Por ahora las administra el administrador general. (Un administrador propio
-- por división, que solo vea lo suyo, es un rol aparte y se agrega después.)
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere cuentas-aprobacion.sql y lms-estructura.sql (grupos).
-- ============================================================================

create table if not exists public.divisiones (
  id bigserial primary key,
  nombre text not null unique,
  descripcion text,
  creada_en timestamptz not null default now()
);

-- Cada alumno pertenece a lo más a una división.
alter table public.profiles add column if not exists division_id bigint references public.divisiones(id) on delete set null;
create index if not exists profiles_division_idx on public.profiles (division_id);

-- Un curso puede estar en varias divisiones.
create table if not exists public.division_cursos (
  division_id bigint not null references public.divisiones(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  primary key (division_id, course_id)
);

-- Cada grupo pertenece a lo más a una división.
alter table public.grupos add column if not exists division_id bigint references public.divisiones(id) on delete set null;

alter table public.divisiones enable row level security;
drop policy if exists "divisiones: leer" on public.divisiones;
create policy "divisiones: leer" on public.divisiones for select using (auth.uid() is not null);
drop policy if exists "divisiones: admin" on public.divisiones;
create policy "divisiones: admin" on public.divisiones
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.division_cursos enable row level security;
drop policy if exists "division cursos: leer" on public.division_cursos;
create policy "division cursos: leer" on public.division_cursos for select using (auth.uid() is not null);
drop policy if exists "division cursos: admin" on public.division_cursos;
create policy "division cursos: admin" on public.division_cursos
  for all using (public.es_admin()) with check (public.es_admin());

-- La división del alumno la asigna el administrador: el alumno no puede
-- cambiársela desde su perfil (se agrega al candado de cuentas-aprobacion.sql).
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
      new.division_id := null;
    end if;
    return new;
  end if;

  if quien in ('', 'service_role') or public.es_admin() then
    return new;
  end if;

  new.rol := old.rol;
  new.activo := old.activo;
  new.aprobado := old.aprobado;
  new.aprobado_en := old.aprobado_en;
  new.division_id := old.division_id;
  return new;
end;
$$;
