-- ============================================================================
-- Mensajes internos y comunicados (como "Mensajes" y "Comunicados" de
-- TalentLMS).
--
-- Mensajes: el administrador escribe a una persona, a un grupo, a los inscritos
-- de un curso, a todos los alumnos o a los administradores, con archivo
-- adjunto; los alumnos escriben a los administradores y responden. El envío lo
-- hace la función mensajes-enviar, que resuelve a quién le llega.
--
-- Comunicados: avisos que se muestran en el portal del alumno (internos) o en
-- la página de inicio para quien no ha entrado (externos).
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- ============================================================================

create table if not exists public.mensajes (
  id bigserial primary key,
  remitente_id uuid not null references auth.users(id) on delete cascade,
  -- Se guarda el nombre: el alumno no puede leer el perfil de otras personas.
  remitente_nombre text,
  asunto text not null,
  cuerpo text not null,
  -- Archivo adjunto en el bucket privado "mensajes".
  adjunto_path text,
  adjunto_nombre text,
  -- A quién se mandó, para mostrarlo en "Enviados".
  destino_tipo text not null default 'usuario',
  destino_id text,
  destino_nombre text,
  -- Conversación: el primer mensaje de la conversación.
  hilo_id bigint references public.mensajes(id) on delete cascade,
  creado_en timestamptz not null default now()
);

alter table public.mensajes drop constraint if exists mensajes_destino_check;
alter table public.mensajes
  add constraint mensajes_destino_check check (destino_tipo in ('usuario', 'grupo', 'curso', 'todos', 'admins'));

alter table public.mensajes add column if not exists remitente_nombre text;

create index if not exists mensajes_hilo_idx on public.mensajes (hilo_id);
create index if not exists mensajes_remitente_idx on public.mensajes (remitente_id, creado_en desc);

create table if not exists public.mensaje_destinatarios (
  mensaje_id bigint not null references public.mensajes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  leido_en timestamptz,
  archivado boolean not null default false,
  primary key (mensaje_id, user_id)
);

create index if not exists mensaje_destinatarios_usuario_idx on public.mensaje_destinatarios (user_id, leido_en);

-- Si el usuario participa en un mensaje (lo mandó o le llegó).
create or replace function public.participa_en_mensaje(p_mensaje bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.mensajes where id = p_mensaje and remitente_id = auth.uid())
      or exists (select 1 from public.mensaje_destinatarios where mensaje_id = p_mensaje and user_id = auth.uid());
$$;

alter table public.mensajes enable row level security;
drop policy if exists "mensajes: leer" on public.mensajes;
create policy "mensajes: leer" on public.mensajes
  for select using (public.es_admin() or public.participa_en_mensaje(id));

alter table public.mensaje_destinatarios enable row level security;
drop policy if exists "mensaje destinatarios: leer" on public.mensaje_destinatarios;
create policy "mensaje destinatarios: leer" on public.mensaje_destinatarios
  for select using (public.es_admin() or auth.uid() = user_id or public.participa_en_mensaje(mensaje_id));
-- El destinatario marca como leído o archiva el suyo; nada más.
drop policy if exists "mensaje destinatarios: marcar el propio" on public.mensaje_destinatarios;
create policy "mensaje destinatarios: marcar el propio" on public.mensaje_destinatarios
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke update on public.mensaje_destinatarios from anon, authenticated;
grant update (leido_en, archivado) on public.mensaje_destinatarios to authenticated;


-- Adjuntos ------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('mensajes', 'mensajes', false)
on conflict (id) do nothing;

-- Cada quien sube a su carpeta: <su id>/<archivo>.
drop policy if exists "mensajes: subir adjunto" on storage.objects;
create policy "mensajes: subir adjunto" on storage.objects
  for insert with check (bucket_id = 'mensajes' and split_part(name, '/', 1) = auth.uid()::text);

-- Lo abre quien participa en el mensaje que lo lleva.
drop policy if exists "mensajes: leer adjunto" on storage.objects;
create policy "mensajes: leer adjunto" on storage.objects
  for select using (
    bucket_id = 'mensajes'
    and (
      public.es_admin()
      or split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1 from public.mensajes m
        where m.adjunto_path = storage.objects.name and public.participa_en_mensaje(m.id)
      )
    )
  );


-- Comunicados ------------------------------------------------------------------------

create table if not exists public.comunicados (
  id bigserial primary key,
  -- interno: en el portal del alumno. externo: en la página de inicio.
  tipo text not null default 'interno',
  titulo text not null,
  cuerpo text,
  enlace text,
  activo boolean not null default true,
  desde timestamptz,
  hasta timestamptz,
  creado_en timestamptz not null default now()
);

alter table public.comunicados drop constraint if exists comunicados_tipo_check;
alter table public.comunicados add constraint comunicados_tipo_check check (tipo in ('interno', 'externo'));

alter table public.comunicados enable row level security;
drop policy if exists "comunicados: leer vigentes" on public.comunicados;
create policy "comunicados: leer vigentes" on public.comunicados
  for select using (
    public.es_admin()
    or (
      activo
      and (desde is null or desde <= now())
      and (hasta is null or hasta >= now())
      and (tipo = 'externo' or auth.uid() is not null)
    )
  );
drop policy if exists "comunicados: admin" on public.comunicados;
create policy "comunicados: admin" on public.comunicados
  for all using (public.es_admin()) with check (public.es_admin());
