-- ============================================================================
-- Portal del alumno: campanita de avisos y perfil completo.
--
-- 1. notificaciones_portal: avisos que ve el alumno en la campanita del
--    portal (cuenta activada, inscrito, curso abierto, examen aprobado, tarea
--    revisada, certificado, mensaje nuevo, sesión en vivo). Los escribe SOLO
--    el servidor (netlify/functions/_notificaciones.js, con la llave de
--    servicio); cada alumno lee los suyos y solo puede marcarlos como leídos.
-- 2. Columnas nuevas de profiles: cédula profesional y datos de facturación,
--    editables por el propio alumno desde "Mi perfil". El candado
--    profiles_proteger() no las toca (solo protege rol, activo, aprobado,
--    aprobado_en, division_id, email y created_at).
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- El portal funciona igual antes de correrlo (la campanita usa los avisos
-- calculados del avance y el perfil guarda solo los campos que ya existían).
-- ============================================================================

begin;

-- 1. Avisos del portal --------------------------------------------------------

create table if not exists public.notificaciones_portal (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text,
  -- Ruta dentro del portal: /classroom/12?leccion=34, /dashboard?tab=certificates…
  enlace text,
  -- Identifica el hecho ("examen_aprobado:examen:34"): un aviso por hecho.
  clave text,
  leida boolean not null default false,
  leida_en timestamptz,
  creada_en timestamptz not null default now()
);

create unique index if not exists notificaciones_portal_clave_idx
  on public.notificaciones_portal (user_id, clave);
create index if not exists notificaciones_portal_usuario_idx
  on public.notificaciones_portal (user_id, creada_en desc);
create index if not exists notificaciones_portal_no_leidas_idx
  on public.notificaciones_portal (user_id) where not leida;

alter table public.notificaciones_portal enable row level security;

drop policy if exists "notificaciones portal: leer las mias" on public.notificaciones_portal;
create policy "notificaciones portal: leer las mias" on public.notificaciones_portal
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notificaciones portal: marcar las mias" on public.notificaciones_portal;
create policy "notificaciones portal: marcar las mias" on public.notificaciones_portal
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sin política de insert ni delete: solo el servidor (service_role) escribe.
-- Y del update, el alumno solo puede tocar "leida" y "leida_en".
revoke insert, update, delete on public.notificaciones_portal from anon, authenticated;
grant select on public.notificaciones_portal to authenticated;
grant update (leida, leida_en) on public.notificaciones_portal to authenticated;
grant all on public.notificaciones_portal to service_role;
grant usage, select on sequence public.notificaciones_portal_id_seq to service_role;

-- 2. Perfil completo -----------------------------------------------------------

-- Datos profesionales (algunos ya existían; "if not exists" no los toca).
alter table public.profiles add column if not exists pais text;
alter table public.profiles add column if not exists estado text;
alter table public.profiles add column if not exists grado text;
alter table public.profiles add column if not exists especialidad text;
alter table public.profiles add column if not exists institucion text;
alter table public.profiles add column if not exists cargo text;

-- Nuevos: cédula profesional y datos de facturación (CFDI).
alter table public.profiles add column if not exists cedula_profesional text;
alter table public.profiles add column if not exists rfc text;
alter table public.profiles add column if not exists razon_social text;
alter table public.profiles add column if not exists regimen_fiscal text;
alter table public.profiles add column if not exists codigo_postal_fiscal text;
alter table public.profiles add column if not exists uso_cfdi text;

-- Que PostgREST vea las columnas y la tabla nuevas sin esperar.
notify pgrst, 'reload schema';
commit;
