-- Notas por lección (19 oct 2026): el alumno escribe apuntes en el aula, ligados
-- al minuto del video, y los descarga en PDF.
-- Supabase -> SQL Editor -> pegar todo -> Run. Se puede correr más de una vez.
-- Sin esta tabla el aula funciona igual; solo no aparece "Mis notas".

begin;

create table if not exists public.leccion_notas (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 4000),
  segundo integer check (segundo is null or segundo >= 0),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
create index if not exists leccion_notas_alumno_curso on public.leccion_notas (user_id, course_id, leccion_id);

-- Cada alumno solo ve y edita sus propias notas.
alter table public.leccion_notas enable row level security;
drop policy if exists "notas: leer las propias" on public.leccion_notas;
create policy "notas: leer las propias" on public.leccion_notas
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notas: crear las propias" on public.leccion_notas;
create policy "notas: crear las propias" on public.leccion_notas
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "notas: editar las propias" on public.leccion_notas;
create policy "notas: editar las propias" on public.leccion_notas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notas: borrar las propias" on public.leccion_notas;
create policy "notas: borrar las propias" on public.leccion_notas
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.leccion_notas to authenticated;
grant usage, select on sequence public.leccion_notas_id_seq to authenticated;
grant all on public.leccion_notas to service_role;

commit;
