-- ============================================================================
-- Bitácora del portal: lo que no queda registrado en otras tablas y que la
-- línea de tiempo de TalentLMS sí muestra.
--   login        la persona inició sesión (lo registra su navegador, una vez
--                por sesión)
--   descarga     abrió o descargó un archivo de la biblioteca de un curso
--   admin        acciones de administradores: activar, bloquear o rechazar
--                cuentas, inscribir o dar de baja, aprobar solicitudes
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- ============================================================================

create table if not exists public.actividad_portal (
  id bigserial primary key,
  -- Quién lo hizo.
  user_id uuid references auth.users(id) on delete cascade,
  tipo text not null,
  -- Sobre quién (en acciones de administrador) y en qué curso.
  objetivo_user_id uuid references auth.users(id) on delete cascade,
  course_id bigint references public.courses(id) on delete cascade,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

alter table public.actividad_portal drop constraint if exists actividad_portal_tipo_check;
alter table public.actividad_portal
  add constraint actividad_portal_tipo_check check (tipo in ('login', 'descarga', 'admin'));

create index if not exists actividad_portal_fecha_idx on public.actividad_portal (creado_en desc);
create index if not exists actividad_portal_usuario_idx on public.actividad_portal (user_id, creado_en desc);

alter table public.actividad_portal enable row level security;

-- El navegador solo puede registrar su propio inicio de sesión o sus propias
-- descargas; las acciones de administrador las escribe el servidor.
drop policy if exists "actividad: registrar la propia" on public.actividad_portal;
create policy "actividad: registrar la propia" on public.actividad_portal
  for insert with check (auth.uid() = user_id and tipo in ('login', 'descarga'));

drop policy if exists "actividad: leer" on public.actividad_portal;
create policy "actividad: leer" on public.actividad_portal
  for select using (public.es_admin() or auth.uid() = user_id);

-- La hora la pone el servidor, no el navegador.
create or replace function public.actividad_portal_hora()
returns trigger
language plpgsql
as $$
begin
  new.creado_en := now();
  return new;
end;
$$;

drop trigger if exists actividad_portal_hora on public.actividad_portal;
create trigger actividad_portal_hora
  before insert on public.actividad_portal
  for each row execute function public.actividad_portal_hora();
