-- ============================================================================
-- Sesiones en vivo como clase del curso (las unidades "ILT" de TalentLMS).
--
-- Una lección de tipo 'sesion' tiene fecha, hora y su reunión de Zoom. El
-- alumno se registra desde la lección (Zoom le genera su enlace personal), el
-- botón "Unirse" se activa 15 minutos antes y lo lleva directo a la clase sin
-- mostrar el enlace, y la asistencia se confirma sola con el reporte de Zoom.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere lms-evaluaciones.sql (que agrega el tipo 'sesion').
-- ============================================================================

-- Horario de la sesión: lo ve el alumno inscrito.
create table if not exists public.sesiones_clase (
  leccion_id bigint primary key references public.curso_lecciones(id) on delete cascade,
  inicia_en timestamptz not null,
  duracion_min integer not null default 60,
  -- Minutos mínimos conectado para contar como asistencia.
  minutos_minimos integer not null default 0,
  sincronizado_en timestamptz,
  actualizado_en timestamptz not null default now()
);

-- Datos de Zoom: solo los administradores y el servidor. Con el ID de la
-- reunión cualquiera podría registrarse por fuera del portal.
create table if not exists public.sesion_secretos (
  leccion_id bigint primary key references public.curso_lecciones(id) on delete cascade,
  zoom_id text,
  zoom_tipo text not null default 'meeting',
  -- Enlace genérico por si Zoom no está configurado.
  enlace_respaldo text
);

alter table public.sesion_secretos drop constraint if exists sesion_secretos_tipo_check;
alter table public.sesion_secretos
  add constraint sesion_secretos_tipo_check check (zoom_tipo in ('meeting', 'webinar'));

-- Registro y asistencia de cada alumno. Los escribe el servidor.
create table if not exists public.sesion_registros (
  id bigserial primary key,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  -- Enlace personal de Zoom: nunca se lee desde el navegador; el servidor lo
  -- entrega solo al pulsar "Unirse", en su horario.
  join_url text,
  zoom_registrant_id text,
  asistio boolean not null default false,
  minutos integer not null default 0,
  verificado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (leccion_id, user_id)
);

create index if not exists sesion_registros_leccion_idx on public.sesion_registros (leccion_id);


alter table public.sesiones_clase enable row level security;
drop policy if exists "sesiones: leer" on public.sesiones_clase;
create policy "sesiones: leer" on public.sesiones_clase
  for select using (public.es_admin() or public.esta_inscrito(public.curso_de_leccion(leccion_id)));
drop policy if exists "sesiones: admin" on public.sesiones_clase;
create policy "sesiones: admin" on public.sesiones_clase
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.sesion_secretos enable row level security;
drop policy if exists "sesion secretos: admin" on public.sesion_secretos;
create policy "sesion secretos: admin" on public.sesion_secretos
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.sesion_registros enable row level security;
drop policy if exists "sesion registros: admin" on public.sesion_registros;
create policy "sesion registros: admin" on public.sesion_registros
  for select using (public.es_admin());

-- El alumno ve su registro (sin el enlace): si está registrado y si asistió.
revoke select on public.sesion_registros from anon, authenticated;
grant select (id, leccion_id, user_id, asistio, minutos, verificado_en, creado_en) on public.sesion_registros to authenticated;
drop policy if exists "sesion registros: el propio" on public.sesion_registros;
create policy "sesion registros: el propio" on public.sesion_registros
  for select using (auth.uid() = user_id);
