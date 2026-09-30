-- ============================================================================
-- Biblioteca de archivos por curso (como "Archivos" de TalentLMS).
--
-- Cada curso tiene su biblioteca: artículos, manuales, programas, imágenes…
-- Un archivo puede ir ligado a una clase (aparece dentro de esa lección) o
-- quedar solo en la biblioteca general del curso. "Compartido" decide si los
-- alumnos lo ven; uno sin compartir queda solo para el administrador.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere lms-estructura.sql.
-- ============================================================================

create table if not exists public.curso_archivos (
  id bigserial primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  leccion_id bigint references public.curso_lecciones(id) on delete set null,
  nombre text not null,
  -- Ruta dentro del bucket privado "curso-biblioteca": <curso>/<archivo>
  ruta text not null unique,
  tamano bigint,
  tipo text,
  etiquetas text[] not null default '{}',
  compartido boolean not null default true,
  subido_en timestamptz not null default now()
);

create index if not exists curso_archivos_curso_idx on public.curso_archivos (course_id, leccion_id);

alter table public.curso_archivos enable row level security;

drop policy if exists "biblioteca: leer" on public.curso_archivos;
create policy "biblioteca: leer" on public.curso_archivos
  for select using (public.es_admin() or (compartido and public.esta_inscrito(course_id)));

drop policy if exists "biblioteca: admin" on public.curso_archivos;
create policy "biblioteca: admin" on public.curso_archivos
  for all using (public.es_admin()) with check (public.es_admin());


-- Bucket propio: así un archivo sin compartir no se puede abrir aunque el
-- alumno adivine su ruta. Solo se descarga si su fila está compartida y el
-- alumno está inscrito en ese curso.
insert into storage.buckets (id, name, public)
values ('curso-biblioteca', 'curso-biblioteca', false)
on conflict (id) do nothing;

drop policy if exists "biblioteca: descargar" on storage.objects;
create policy "biblioteca: descargar" on storage.objects
  for select using (
    bucket_id = 'curso-biblioteca'
    and (
      public.es_admin()
      or exists (
        select 1 from public.curso_archivos a
        where a.ruta = storage.objects.name
          and a.compartido
          and public.esta_inscrito(a.course_id)
      )
    )
  );

drop policy if exists "biblioteca: admin sube" on storage.objects;
create policy "biblioteca: admin sube" on storage.objects
  for insert with check (bucket_id = 'curso-biblioteca' and public.es_admin());

drop policy if exists "biblioteca: admin gestiona" on storage.objects;
create policy "biblioteca: admin gestiona" on storage.objects
  for update using (bucket_id = 'curso-biblioteca' and public.es_admin());

drop policy if exists "biblioteca: admin borra" on storage.objects;
create policy "biblioteca: admin borra" on storage.objects
  for delete using (bucket_id = 'curso-biblioteca' and public.es_admin());
