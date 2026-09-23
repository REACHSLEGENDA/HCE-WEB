-- ============================================================================
-- Cursos gratis y de pago, con inscripciones y acceso controlado.
--
-- Ejecutar DESPUÉS de que el código nuevo esté desplegado en Netlify:
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
--
-- El orden importa porque el paso 6 esconde el ID de los videos. El código
-- nuevo ya sabe leerlos del lugar protegido; el viejo no, y se quedaría sin
-- video si esto corriera primero.
-- ============================================================================


-- 1. Tipo de curso y precio --------------------------------------------------

alter table public.courses
  add column if not exists tipo text not null default 'gratis',
  add column if not exists precio_mxn integer,
  -- Indica si el curso se toma en el aula. Antes eso se deducía de que el curso
  -- trajera el ID del video, pero ese ID ya no es público (ver punto 2).
  add column if not exists tiene_video boolean not null default false;

alter table public.courses drop constraint if exists courses_tipo_check;
alter table public.courses
  add constraint courses_tipo_check check (tipo in ('gratis', 'pago'));

alter table public.courses drop constraint if exists courses_precio_check;
alter table public.courses
  add constraint courses_precio_check
  check (tipo = 'gratis' or (precio_mxn is not null and precio_mxn > 0));


-- 2. El video, fuera de la tabla pública -----------------------------------
--
-- `courses` la lee cualquiera, hasta sin sesión, porque es el catálogo. Si el
-- ID del video de YouTube viviera ahí, bastaría con abrir las herramientas del
-- navegador para copiarlo y ver un curso de pago sin haber pagado. Aquí solo
-- lo lee quien está inscrito o es administrador.

create table if not exists public.curso_contenido (
  course_id bigint primary key references public.courses(id) on delete cascade,
  youtube_video_id text,
  actualizado_en timestamptz not null default now()
);


-- 3. Inscripciones ----------------------------------------------------------

create table if not exists public.inscripciones (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,

  -- gratis -> se inscribió solo en un curso gratuito
  -- pago   -> pagó con Stripe
  -- admin  -> lo inscribió un administrador (becas, casos manuales)
  -- previo -> ya estaba tomando el curso antes de que existieran inscripciones
  origen text not null,

  stripe_session_id text unique,
  monto numeric,
  moneda text,

  created_at timestamptz not null default now(),

  unique (user_id, course_id)
);

alter table public.inscripciones drop constraint if exists inscripciones_origen_check;
alter table public.inscripciones
  add constraint inscripciones_origen_check
  check (origen in ('gratis', 'pago', 'admin', 'previo'));

create index if not exists inscripciones_course_idx on public.inscripciones (course_id);


-- 4. Funciones de apoyo para las políticas ---------------------------------
--
-- Van como SECURITY DEFINER para que una política pueda consultar otra tabla
-- protegida sin quedar atrapada en su propio RLS.

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.esta_inscrito(p_course bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.inscripciones
    where user_id = auth.uid() and course_id = p_course
  );
$$;


-- 5. Políticas --------------------------------------------------------------

alter table public.inscripciones enable row level security;

-- Cada alumno ve las suyas; el administrador, todas. Las altas y bajas no
-- tienen política: siempre pasan por las funciones de Netlify, que validan el
-- pago o el rol antes de escribir.
drop policy if exists "inscripciones propias" on public.inscripciones;
create policy "inscripciones propias" on public.inscripciones
  for select using (auth.uid() = user_id or public.es_admin());


alter table public.curso_contenido enable row level security;

drop policy if exists "contenido para inscritos" on public.curso_contenido;
create policy "contenido para inscritos" on public.curso_contenido
  for select using (public.es_admin() or public.esta_inscrito(course_id));

drop policy if exists "contenido lo edita admin" on public.curso_contenido;
create policy "contenido lo edita admin" on public.curso_contenido
  for all using (public.es_admin()) with check (public.es_admin());


-- 6. Migración de lo que ya existe -----------------------------------------

-- 6a. Los videos pasan a la tabla protegida.
insert into public.curso_contenido (course_id, youtube_video_id)
select id, youtube_video_id
from public.courses
where coalesce(youtube_video_id, '') <> ''
on conflict (course_id) do update set youtube_video_id = excluded.youtube_video_id;

update public.courses
set tiene_video = true
where coalesce(youtube_video_id, '') <> '';

-- 6b. Nadie pierde un curso que ya había empezado o terminado: quien tenga
-- avance o certificado queda inscrito automáticamente.
insert into public.inscripciones (user_id, course_id, origen)
select distinct sp.user_id, sp.course_id, 'previo'
from public.student_progress sp
where sp.course_id in (select id from public.courses)
  and sp.user_id in (select id from auth.users)
on conflict (user_id, course_id) do nothing;

insert into public.inscripciones (user_id, course_id, origen)
select distinct c.user_id, c.course_id, 'previo'
from public.certificates c
where c.course_id in (select id from public.courses)
  and c.user_id in (select id from auth.users)
on conflict (user_id, course_id) do nothing;

-- 6c. Por último se borra el ID del video de la tabla pública.
update public.courses
set youtube_video_id = null
where tiene_video = true;
