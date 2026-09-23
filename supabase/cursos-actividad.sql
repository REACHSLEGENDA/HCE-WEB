-- ============================================================================
-- Registro de actividad en los cursos: cada visita y cada examen.
--
-- Es la base de las métricas por curso. Hasta ahora el avance era una sola
-- fila por alumno que se sobreescribía, así que no había historial: no se
-- podía saber cuántas visitas hubo, cuándo, ni cuánto duró cada una.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente, y se puede
-- correr antes o después de desplegar: el código lo detecta solo.
-- Requiere haber corrido antes cursos-inscripciones.sql.
-- ============================================================================


-- 1. Visitas -----------------------------------------------------------------
--
-- Una fila por visita. Si el alumno deja la pestaña escondida más de 30
-- minutos y vuelve, cuenta como visita nueva, igual que en cualquier
-- herramienta de analítica.

create table if not exists public.curso_sesiones (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,

  iniciada_en timestamptz not null default now(),
  -- Último aviso del navegador. Hace de hora de salida: no hace falta que el
  -- alumno cierre "bien" la pestaña para que la visita quede medida.
  ultima_senal_en timestamptz not null default now(),

  -- Tiempo con el aula en pantalla y el alumno presente (no cuenta la
  -- pestaña escondida ni cinco minutos sin tocar nada con el video pausado).
  segundos_activos integer not null default 0,
  -- Tiempo con el video reproduciéndose.
  segundos_video integer not null default 0,

  -- Hasta dónde llegó en el video. Es lo que dice en qué minuto abandonan.
  posicion_max_seg integer not null default 0,
  duracion_video_seg integer,
  porcentaje_max integer not null default 0,

  dispositivo text
);

create index if not exists curso_sesiones_curso_idx  on public.curso_sesiones (course_id, iniciada_en);
create index if not exists curso_sesiones_alumno_idx on public.curso_sesiones (user_id, iniciada_en);


-- 2. Eventos -----------------------------------------------------------------

create table if not exists public.curso_eventos (
  id bigserial primary key,
  sesion_id bigint references public.curso_sesiones(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  tipo text not null,
  datos jsonb,
  creado_en timestamptz not null default now()
);

alter table public.curso_eventos drop constraint if exists curso_eventos_tipo_check;
alter table public.curso_eventos
  add constraint curso_eventos_tipo_check
  check (tipo in ('examen_enviado', 'certificado_emitido'));

create index if not exists curso_eventos_curso_idx on public.curso_eventos (course_id, creado_en);


-- 3. Saneamiento del lado del servidor --------------------------------------
--
-- Las visitas las escribe el navegador del alumno, así que aquí no se confía
-- en lo que mande: la hora la pone el servidor, los tiempos no pueden pasar
-- del tiempo real transcurrido y el avance en el video nunca retrocede. Sin
-- esto, cualquiera podría inflar sus propios minutos editando una petición.

create or replace function public.curso_sesiones_sanear()
returns trigger
language plpgsql
as $$
declare
  transcurrido integer;
begin
  if tg_op = 'UPDATE' then
    new.user_id     := old.user_id;
    new.course_id   := old.course_id;
    new.iniciada_en := old.iniciada_en;
    new.posicion_max_seg := greatest(old.posicion_max_seg, coalesce(new.posicion_max_seg, 0));
    new.porcentaje_max   := greatest(old.porcentaje_max,   coalesce(new.porcentaje_max, 0));
  else
    new.iniciada_en := now();
  end if;

  new.ultima_senal_en := now();

  -- Cinco segundos de holgura por el desfase entre el reloj del navegador y
  -- el del servidor.
  transcurrido := greatest(0, extract(epoch from (new.ultima_senal_en - new.iniciada_en))::integer) + 5;

  new.segundos_activos := least(greatest(coalesce(new.segundos_activos, 0), 0), transcurrido);
  new.segundos_video   := least(greatest(coalesce(new.segundos_video, 0), 0), transcurrido);
  new.porcentaje_max   := least(greatest(new.porcentaje_max, 0), 100);

  return new;
end;
$$;

drop trigger if exists curso_sesiones_sanear on public.curso_sesiones;
create trigger curso_sesiones_sanear
  before insert or update on public.curso_sesiones
  for each row execute function public.curso_sesiones_sanear();


-- 4. Políticas ---------------------------------------------------------------
--
-- Cada alumno escribe solo su propia actividad y solo en cursos donde está
-- inscrito. El administrador lo lee todo, para las métricas.

alter table public.curso_sesiones enable row level security;

drop policy if exists "sesiones: registrar la propia" on public.curso_sesiones;
create policy "sesiones: registrar la propia" on public.curso_sesiones
  for insert with check (auth.uid() = user_id and public.esta_inscrito(course_id));

drop policy if exists "sesiones: actualizar la propia" on public.curso_sesiones;
create policy "sesiones: actualizar la propia" on public.curso_sesiones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sesiones: leer" on public.curso_sesiones;
create policy "sesiones: leer" on public.curso_sesiones
  for select using (auth.uid() = user_id or public.es_admin());


alter table public.curso_eventos enable row level security;

drop policy if exists "eventos: registrar el propio" on public.curso_eventos;
create policy "eventos: registrar el propio" on public.curso_eventos
  for insert with check (auth.uid() = user_id and public.esta_inscrito(course_id));

drop policy if exists "eventos: leer" on public.curso_eventos;
create policy "eventos: leer" on public.curso_eventos
  for select using (auth.uid() = user_id or public.es_admin());
