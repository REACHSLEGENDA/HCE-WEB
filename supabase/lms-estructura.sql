-- ============================================================================
-- Portal como LMS: lecciones, materiales, tareas, grupos, recertificación,
-- recordatorios y puntos.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y SOLO AGREGA:
-- no cambia nada de lo que ya funciona, así que puede correrse antes o
-- después de desplegar el código.
--
-- Requiere haber corrido antes: cursos-inscripciones.sql y cursos-actividad.sql
-- (usa es_admin() y esta_inscrito(), que se crean ahí).
-- ============================================================================


-- 1. Lecciones ---------------------------------------------------------------
--
-- Un curso deja de ser "un video y un examen": es una lista ordenada de
-- lecciones de cuatro tipos. El examen final sigue siendo del curso y se
-- desbloquea al completar las lecciones obligatorias.

create table if not exists public.curso_lecciones (
  id bigserial primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  orden integer not null default 0,
  titulo text not null,
  tipo text not null default 'video',
  descripcion text,
  duracion_min integer,
  obligatoria boolean not null default true,
  creada_en timestamptz not null default now()
);

alter table public.curso_lecciones drop constraint if exists curso_lecciones_tipo_check;
alter table public.curso_lecciones
  add constraint curso_lecciones_tipo_check check (tipo in ('video', 'pdf', 'texto', 'tarea'));

create index if not exists curso_lecciones_curso_idx on public.curso_lecciones (course_id, orden);

-- El contenido va aparte, igual que el video del curso: el temario (títulos)
-- es público para vender el curso, pero el video, el PDF y la lectura solo los
-- ve quien está inscrito.
create table if not exists public.leccion_contenido (
  leccion_id bigint primary key references public.curso_lecciones(id) on delete cascade,
  youtube_video_id text,
  -- Ruta dentro del bucket privado "curso-materiales": <curso>/<leccion>/<archivo>
  archivo_path text,
  -- Lectura (tipo texto) o instrucciones (tipo tarea). Admite un markdown
  -- sencillo: títulos con #, listas con -, **negritas** y enlaces.
  texto text,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.leccion_progreso (
  user_id uuid not null references auth.users(id) on delete cascade,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  -- Hasta dónde llegó en el video (0 a 100). En PDF y lectura va a 100 al
  -- completarla.
  porcentaje integer not null default 0,
  completada boolean not null default false,
  completada_en timestamptz,
  actualizado_en timestamptz not null default now(),
  primary key (user_id, leccion_id)
);

create index if not exists leccion_progreso_curso_idx on public.leccion_progreso (course_id);

-- Igual que con las visitas: el avance lo escribe el navegador del alumno,
-- así que el servidor pone la hora y no deja que el porcentaje retroceda.
create or replace function public.leccion_progreso_sanear()
returns trigger
language plpgsql
as $$
begin
  new.porcentaje := least(greatest(coalesce(new.porcentaje, 0), 0), 100);
  if tg_op = 'UPDATE' then
    new.user_id    := old.user_id;
    new.leccion_id := old.leccion_id;
    new.course_id  := old.course_id;
    new.porcentaje := greatest(old.porcentaje, new.porcentaje);
  end if;
  if new.completada and (tg_op = 'INSERT' or not old.completada) then
    new.completada_en := now();
  elsif not new.completada then
    new.completada_en := null;
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists leccion_progreso_sanear on public.leccion_progreso;
create trigger leccion_progreso_sanear
  before insert or update on public.leccion_progreso
  for each row execute function public.leccion_progreso_sanear();


-- 2. Tareas ------------------------------------------------------------------

create table if not exists public.tarea_entregas (
  id bigserial primary key,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text,
  -- Ruta dentro del bucket privado "tareas": <curso>/<alumno>/<archivo>
  archivo_path text,
  estado text not null default 'entregada',
  comentario text,
  revisada_en timestamptz,
  creada_en timestamptz not null default now()
);

alter table public.tarea_entregas drop constraint if exists tarea_entregas_estado_check;
alter table public.tarea_entregas
  add constraint tarea_entregas_estado_check check (estado in ('entregada', 'aprobada', 'rechazada'));

create index if not exists tarea_entregas_estado_idx on public.tarea_entregas (estado, creada_en);


-- 3. Políticas de lecciones y tareas -----------------------------------------

-- Curso al que pertenece una lección, para usarlo dentro de las políticas.
create or replace function public.curso_de_leccion(p_leccion bigint)
returns bigint
language sql stable security definer set search_path = public
as $$
  select course_id from public.curso_lecciones where id = p_leccion;
$$;

alter table public.curso_lecciones enable row level security;
drop policy if exists "lecciones: temario publico" on public.curso_lecciones;
create policy "lecciones: temario publico" on public.curso_lecciones
  for select using (true);
drop policy if exists "lecciones: admin" on public.curso_lecciones;
create policy "lecciones: admin" on public.curso_lecciones
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.leccion_contenido enable row level security;
drop policy if exists "contenido leccion: inscritos" on public.leccion_contenido;
create policy "contenido leccion: inscritos" on public.leccion_contenido
  for select using (public.es_admin() or public.esta_inscrito(public.curso_de_leccion(leccion_id)));
drop policy if exists "contenido leccion: admin" on public.leccion_contenido;
create policy "contenido leccion: admin" on public.leccion_contenido
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.leccion_progreso enable row level security;
drop policy if exists "progreso: leer" on public.leccion_progreso;
create policy "progreso: leer" on public.leccion_progreso
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists "progreso: registrar el propio" on public.leccion_progreso;
create policy "progreso: registrar el propio" on public.leccion_progreso
  for insert with check (
    auth.uid() = user_id
    and public.esta_inscrito(course_id)
    and public.curso_de_leccion(leccion_id) = course_id
  );
drop policy if exists "progreso: actualizar el propio" on public.leccion_progreso;
create policy "progreso: actualizar el propio" on public.leccion_progreso
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- El administrador reabre una lección cuando rechaza una tarea.
drop policy if exists "progreso: admin" on public.leccion_progreso;
create policy "progreso: admin" on public.leccion_progreso
  for update using (public.es_admin()) with check (public.es_admin());

alter table public.tarea_entregas enable row level security;
drop policy if exists "tareas: leer" on public.tarea_entregas;
create policy "tareas: leer" on public.tarea_entregas
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists "tareas: entregar la propia" on public.tarea_entregas;
create policy "tareas: entregar la propia" on public.tarea_entregas
  for insert with check (
    auth.uid() = user_id
    and estado = 'entregada'
    and public.esta_inscrito(course_id)
    and public.curso_de_leccion(leccion_id) = course_id
  );
drop policy if exists "tareas: revisar" on public.tarea_entregas;
create policy "tareas: revisar" on public.tarea_entregas
  for update using (public.es_admin()) with check (public.es_admin());


-- 4. Archivos privados -------------------------------------------------------
--
-- Dos buckets privados: los materiales de los cursos (PDF) y las tareas que
-- suben los alumnos. Nada de esto tiene URL pública: el portal pide un enlace
-- temporal que solo se le da a quien tiene permiso.

insert into storage.buckets (id, name, public)
values ('curso-materiales', 'curso-materiales', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tareas', 'tareas', false)
on conflict (id) do nothing;

-- Primer tramo de la ruta como número de curso, o null si no lo es.
create or replace function public.curso_de_ruta(p_ruta text)
returns bigint
language sql immutable
as $$
  select case when split_part(p_ruta, '/', 1) ~ '^[0-9]+$'
              then split_part(p_ruta, '/', 1)::bigint end;
$$;

drop policy if exists "materiales: leer inscritos" on storage.objects;
create policy "materiales: leer inscritos" on storage.objects
  for select using (
    bucket_id = 'curso-materiales'
    and (public.es_admin() or public.esta_inscrito(public.curso_de_ruta(name)))
  );

drop policy if exists "materiales: admin sube" on storage.objects;
create policy "materiales: admin sube" on storage.objects
  for insert with check (bucket_id = 'curso-materiales' and public.es_admin());

drop policy if exists "materiales: admin gestiona" on storage.objects;
create policy "materiales: admin gestiona" on storage.objects
  for update using (bucket_id = 'curso-materiales' and public.es_admin());

drop policy if exists "materiales: admin borra" on storage.objects;
create policy "materiales: admin borra" on storage.objects
  for delete using (bucket_id = 'curso-materiales' and public.es_admin());

drop policy if exists "tareas: alumno sube la suya" on storage.objects;
create policy "tareas: alumno sube la suya" on storage.objects
  for insert with check (
    bucket_id = 'tareas'
    and split_part(name, '/', 2) = auth.uid()::text
    and public.esta_inscrito(public.curso_de_ruta(name))
  );

drop policy if exists "tareas: leer" on storage.objects;
create policy "tareas: leer" on storage.objects
  for select using (
    bucket_id = 'tareas'
    and (public.es_admin() or split_part(name, '/', 2) = auth.uid()::text)
  );


-- 5. Grupos ------------------------------------------------------------------
--
-- Para inscribir de golpe a un hospital, una generación o un equipo. Asignar
-- un curso al grupo inscribe a todos sus miembros, y quien entra después al
-- grupo queda inscrito en sus cursos.

create table if not exists public.grupos (
  id bigserial primary key,
  nombre text not null,
  descripcion text,
  creado_en timestamptz not null default now()
);

create table if not exists public.grupo_miembros (
  grupo_id bigint not null references public.grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agregado_en timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create table if not exists public.grupo_cursos (
  grupo_id bigint not null references public.grupos(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  agregado_en timestamptz not null default now(),
  primary key (grupo_id, course_id)
);

alter table public.grupos enable row level security;
alter table public.grupo_miembros enable row level security;
alter table public.grupo_cursos enable row level security;

drop policy if exists "grupos: admin" on public.grupos;
create policy "grupos: admin" on public.grupos
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "grupo miembros: admin" on public.grupo_miembros;
create policy "grupo miembros: admin" on public.grupo_miembros
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "grupo cursos: admin" on public.grupo_cursos;
create policy "grupo cursos: admin" on public.grupo_cursos
  for all using (public.es_admin()) with check (public.es_admin());

-- Nuevo origen de inscripción: por pertenecer a un grupo.
alter table public.inscripciones drop constraint if exists inscripciones_origen_check;
alter table public.inscripciones
  add constraint inscripciones_origen_check
  check (origen in ('gratis', 'pago', 'admin', 'previo', 'grupo'));


-- 6. Recertificación ---------------------------------------------------------
--
-- Un curso puede tener vigencia: su certificado vale N meses y después hay que
-- volver a presentar el examen. Sin vigencia, el certificado es permanente.

alter table public.courses
  add column if not exists vigencia_meses integer;

alter table public.courses drop constraint if exists courses_vigencia_check;
alter table public.courses
  add constraint courses_vigencia_check check (vigencia_meses is null or vigencia_meses > 0);

alter table public.certificates
  add column if not exists vigente_hasta timestamptz;


-- 7. Recordatorios -----------------------------------------------------------
--
-- Bitácora de los correos automáticos, para no mandar el mismo recordatorio
-- todos los días. La escribe la función programada de Netlify.

create table if not exists public.recordatorios (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint references public.courses(id) on delete cascade,
  certificado_id bigint,
  tipo text not null,
  enviado_en timestamptz not null default now()
);

alter table public.recordatorios drop constraint if exists recordatorios_tipo_check;
alter table public.recordatorios
  add constraint recordatorios_tipo_check check (tipo in ('inactividad', 'recertificacion'));

create index if not exists recordatorios_busqueda_idx on public.recordatorios (user_id, course_id, tipo, enviado_en);

alter table public.recordatorios enable row level security;
drop policy if exists "recordatorios: admin" on public.recordatorios;
create policy "recordatorios: admin" on public.recordatorios
  for select using (public.es_admin());


-- 8. Exámenes ----------------------------------------------------------------
--
-- Las respuestas correctas dejan de viajar al navegador del alumno (ver
-- lms-candado-examenes.sql). El administrador las sigue necesitando para
-- editar los exámenes: las lee por esta función, que verifica su rol.

create or replace function public.preguntas_admin()
returns setof public.questions
language sql stable security definer set search_path = public
as $$
  select * from public.questions where public.es_admin() order by id;
$$;


-- 9. Puntos, insignias y tabla de posiciones ---------------------------------
--
-- Todo se calcula a partir de lo que ya se registra; no hay puntos guardados
-- que se puedan desincronizar. Puntos:
--   10 por lección completada          50 por curso certificado
--   20 por examen aprobado al primer intento
--    5 por cada día distinto de estudio 15 por webinar al que asistió

alter table public.profiles
  add column if not exists mostrar_en_ranking boolean not null default true;

create or replace function public._puntos_alumnos()
returns table (
  user_id uuid,
  lecciones integer,
  certificados integer,
  primer_intento integer,
  perfectos integer,
  dias integer,
  webinars integer,
  puntos integer
)
language sql stable security definer set search_path = public
as $$
  with
  lec as (
    select lp.user_id, count(*)::int as n from public.leccion_progreso lp where lp.completada group by lp.user_id
  ),
  cer as (
    select c.user_id, count(distinct c.course_id)::int as n from public.certificates c group by c.user_id
  ),
  ex as (
    select t.user_id,
           count(*) filter (where t.primero_aprobado)::int as primera,
           count(*) filter (where t.perfecto)::int as perfectos
    from (
      select e.user_id, e.course_id,
             (array_agg(coalesce((e.datos->>'aprobado')::boolean, false) order by e.creado_en))[1] as primero_aprobado,
             bool_or(coalesce((e.datos->>'calificacion')::numeric, 0) >= 100) as perfecto
      from public.curso_eventos e
      where e.tipo = 'examen_enviado'
      group by e.user_id, e.course_id
    ) t
    group by t.user_id
  ),
  dias as (
    select s.user_id, count(distinct (s.iniciada_en at time zone 'America/Mexico_City')::date)::int as n
    from public.curso_sesiones s
    group by s.user_id
  ),
  web as (
    select w.user_id, count(*)::int as n from public.webinar_registros w where w.asistio and w.user_id is not null group by w.user_id
  )
  select p.id,
         coalesce(lec.n, 0), coalesce(cer.n, 0), coalesce(ex.primera, 0), coalesce(ex.perfectos, 0),
         coalesce(dias.n, 0), coalesce(web.n, 0),
         (coalesce(lec.n, 0) * 10 + coalesce(cer.n, 0) * 50 + coalesce(ex.primera, 0) * 20
          + coalesce(dias.n, 0) * 5 + coalesce(web.n, 0) * 15)::int
  from public.profiles p
  left join lec  on lec.user_id  = p.id
  left join cer  on cer.user_id  = p.id
  left join ex   on ex.user_id   = p.id
  left join dias on dias.user_id = p.id
  left join web  on web.user_id  = p.id
  where coalesce(p.rol, 'estudiante') = 'estudiante';
$$;

-- La función de arriba ve los datos de todos: solo la usan las dos de abajo,
-- que devuelven únicamente lo que cada alumno puede ver.
revoke execute on function public._puntos_alumnos() from public, anon, authenticated;

-- Los puntos, insignias y posición del alumno que pregunta.
create or replace function public.mis_logros()
returns json
language sql stable security definer set search_path = public
as $$
  with todos as (select * from public._puntos_alumnos()),
  ranking as (
    select t.user_id, t.puntos,
           rank() over (order by t.puntos desc) as posicion
    from todos t join public.profiles p on p.id = t.user_id
    where p.mostrar_en_ranking and t.puntos > 0
  ),
  yo as (select * from todos where user_id = auth.uid())
  select json_build_object(
    'puntos', coalesce((select puntos from yo), 0),
    'lecciones', coalesce((select lecciones from yo), 0),
    'certificados', coalesce((select certificados from yo), 0),
    'primer_intento', coalesce((select primer_intento from yo), 0),
    'perfectos', coalesce((select perfectos from yo), 0),
    'dias', coalesce((select dias from yo), 0),
    'webinars', coalesce((select webinars from yo), 0),
    'posicion', (select posicion from ranking where user_id = auth.uid()),
    'participantes', (select count(*) from ranking),
    'mostrar_en_ranking', coalesce((select mostrar_en_ranking from public.profiles where id = auth.uid()), true)
  );
$$;

-- Los primeros lugares. Solo nombre y primera inicial del apellido, y solo de
-- quien no pidió ocultarse.
create or replace function public.tabla_posiciones(limite integer default 10)
returns table (posicion bigint, nombre text, puntos integer, soy_yo boolean)
language sql stable security definer set search_path = public
as $$
  select rank() over (order by t.puntos desc),
         trim(split_part(coalesce(p.nombre_completo, 'Alumno'), ' ', 1) || ' ' ||
              coalesce(nullif(left(split_part(coalesce(p.nombre_completo, ''), ' ', 2), 1), '') || '.', '')),
         t.puntos,
         t.user_id = auth.uid()
  from public._puntos_alumnos() t
  join public.profiles p on p.id = t.user_id
  where p.mostrar_en_ranking and t.puntos > 0
  order by t.puntos desc
  limit greatest(1, least(limite, 50));
$$;

grant execute on function public.mis_logros() to authenticated;
grant execute on function public.tabla_posiciones(integer) to authenticated;
revoke execute on function public.mis_logros() from anon;
revoke execute on function public.tabla_posiciones(integer) from anon;


-- 10. Migración: cada curso con video pasa a tener su primera lección --------

insert into public.curso_lecciones (course_id, orden, titulo, tipo)
select c.id, 1, c.title, 'video'
from public.courses c
join public.curso_contenido cc on cc.course_id = c.id
where coalesce(cc.youtube_video_id, '') <> ''
  and not exists (select 1 from public.curso_lecciones l where l.course_id = c.id);

insert into public.leccion_contenido (leccion_id, youtube_video_id)
select l.id, cc.youtube_video_id
from public.curso_lecciones l
join public.curso_contenido cc on cc.course_id = l.course_id
where l.tipo = 'video' and l.orden = 1
  and not exists (select 1 from public.leccion_contenido x where x.leccion_id = l.id);

-- El avance que ya tenían los alumnos en ese video se conserva.
insert into public.leccion_progreso (user_id, leccion_id, course_id, porcentaje, completada)
select sp.user_id, l.id, l.course_id,
       least(greatest(coalesce(sp.watch_percent, 0), 0), 100)::int,
       coalesce(sp.watch_percent, 0) >= 90
from public.student_progress sp
join public.curso_lecciones l on l.course_id = sp.course_id and l.orden = 1
where sp.user_id in (select id from auth.users)
on conflict (user_id, leccion_id) do nothing;

-- Quien ya tiene certificado tiene la lección completa, sin importar el video.
insert into public.leccion_progreso (user_id, leccion_id, course_id, porcentaje, completada)
select distinct c.user_id, l.id, l.course_id, 100, true
from public.certificates c
join public.curso_lecciones l on l.course_id = c.course_id
where c.user_id in (select id from auth.users)
on conflict (user_id, leccion_id) do update set completada = true, porcentaje = 100;
