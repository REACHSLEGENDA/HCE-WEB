-- ============================================================================
-- Webinars con registro en el portal, asistencia verificada y constancia.
--
-- Ejecutar una sola vez en Supabase: panel del proyecto -> SQL Editor ->
-- pegar todo -> Run. Es idempotente: si se corre dos veces no rompe nada.
-- ============================================================================


-- 1. Campos nuevos del webinar --------------------------------------------
--
-- Nada de esto es secreto: la tabla `webinars` la lee el sitio publico con la
-- llave anonima. El codigo de asistencia vive aparte (ver punto 2).

alter table public.webinars
  -- Cuando esta en false el webinar se comporta como siempre: el boton de la
  -- landing manda al enlace externo. Asi los webinars viejos no cambian.
  add column if not exists registro_portal boolean not null default false,

  -- ID numerico de la reunion o seminario en Zoom (el de 11 digitos).
  add column if not exists zoom_id text,
  add column if not exists zoom_tipo text not null default 'webinar',

  -- Minutos que hay que haber estado conectado para que cuente como asistencia.
  -- En 0 basta con aparecer en el reporte de Zoom.
  add column if not exists minutos_minimos integer not null default 0,

  -- bloqueada -> nadie puede descargar todavia
  -- codigo    -> se libera con el codigo que dijo el ponente, o con Zoom
  -- libre     -> descarga abierta para todo el que se haya registrado
  add column if not exists constancia_estado text not null default 'bloqueada',

  -- Mismos campos que ya usan los cursos para dibujar el nombre encima de la
  -- plantilla. Si van en null se usa la plantilla por defecto de HCE.
  add column if not exists certificado_template_url text,
  add column if not exists certificado_x integer,
  add column if not exists certificado_y integer,
  add column if not exists certificado_font_size integer,

  -- Lista de Brevo a la que entran los registrados de este webinar.
  add column if not exists brevo_lista_id integer,

  -- Ultima vez que se jalo el reporte de asistencia de Zoom. Sirve para no
  -- pegarle a la API en cada clic del alumno.
  add column if not exists sincronizado_en timestamptz;

alter table public.webinars
  drop constraint if exists webinars_constancia_estado_check;

alter table public.webinars
  add constraint webinars_constancia_estado_check
  check (constancia_estado in ('bloqueada', 'codigo', 'libre'));

alter table public.webinars
  drop constraint if exists webinars_zoom_tipo_check;

alter table public.webinars
  add constraint webinars_zoom_tipo_check
  check (zoom_tipo in ('webinar', 'meeting'));


-- 2. El codigo de asistencia, en su propia tabla ---------------------------
--
-- Va aparte a proposito. Si viviera como columna de `webinars`, cualquiera
-- podria leerlo desde el navegador con la llave anonima y descargarse la
-- constancia sin haber entrado a la clase. Aqui RLS queda activo y sin ninguna
-- politica, o sea: nadie lo lee salvo las funciones de Netlify, que usan la
-- llave de servicio y se saltan RLS.

create table if not exists public.webinar_secretos (
  webinar_id bigint primary key references public.webinars(id) on delete cascade,
  codigo text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.webinar_secretos enable row level security;


-- 3. Registros y asistencia ------------------------------------------------

create table if not exists public.webinar_registros (
  id bigserial primary key,
  webinar_id bigint not null references public.webinars(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  email text not null,
  nombre_completo text,

  -- Enlace personal que devolvio Zoom al registrar a la persona. Si Zoom no
  -- estaba configurado se guarda el enlace generico del webinar.
  join_url text,
  zoom_registrant_id text,

  asistio boolean not null default false,
  minutos integer not null default 0,
  -- 'zoom' cuando lo confirmo el reporte, 'codigo' cuando lo desbloqueo la
  -- persona con la clave del cierre, 'libre' cuando el webinar estaba abierto.
  metodo text,
  verificado_en timestamptz,

  -- Constancia ya generada. Se guarda aqui y no en `certificates` para no
  -- tocar la tabla de los cursos de paga.
  certificado_url text,
  folio text,
  certificado_en timestamptz,

  created_at timestamptz not null default now(),

  unique (webinar_id, email)
);

create index if not exists webinar_registros_webinar_idx
  on public.webinar_registros (webinar_id);

create index if not exists webinar_registros_user_idx
  on public.webinar_registros (user_id);

alter table public.webinar_registros enable row level security;


-- Lectura: cada quien ve sus propios registros. Las escrituras no tienen
-- politica porque siempre pasan por las funciones de Netlify, que validan el
-- token del usuario antes de tocar la fila.

drop policy if exists "registros propios" on public.webinar_registros;
create policy "registros propios"
  on public.webinar_registros
  for select
  using (auth.uid() = user_id);


-- Los administradores ven todo, para el listado del panel.

drop policy if exists "registros admin" on public.webinar_registros;
create policy "registros admin"
  on public.webinar_registros
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.rol = 'admin'
    )
  );
