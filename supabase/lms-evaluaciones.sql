-- ============================================================================
-- Exámenes y encuestas dentro del curso (como los "Test" y "Survey" de
-- TalentLMS): un curso puede tener varios, en cualquier punto del temario
-- (diagnóstico inicial, evaluación por módulo, encuesta de satisfacción…).
--
-- Son lecciones de tipo 'examen' o 'encuesta'. El examen final del curso sigue
-- funcionando igual que antes.
--
-- Las respuestas correctas viven en una tabla aparte que solo leen los
-- administradores y el servidor: el alumno nunca las recibe, y la calificación
-- la hace la función evaluacion-enviar.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere lms-estructura.sql y lms-enlaces.sql.
-- ============================================================================

-- 1. Nuevos tipos de lección ---------------------------------------------------

alter table public.curso_lecciones drop constraint if exists curso_lecciones_tipo_check;
alter table public.curso_lecciones
  add constraint curso_lecciones_tipo_check
  check (tipo in ('video', 'pdf', 'texto', 'tarea', 'web', 'examen', 'encuesta', 'seccion', 'sesion'));


-- 2. Configuración de cada examen o encuesta ------------------------------------

create table if not exists public.evaluacion_config (
  leccion_id bigint primary key references public.curso_lecciones(id) on delete cascade,
  -- Solo exámenes: calificación mínima para aprobar (0 a 100).
  min_aprobacion integer not null default 80,
  -- Intentos permitidos; null = sin límite.
  intentos_max integer,
  -- Al terminar, el alumno ve cuáles contestó bien y cuál era la correcta.
  mostrar_respuestas boolean not null default false,
  -- Preguntas en orden aleatorio para cada intento.
  aleatorio boolean not null default false,
  -- Si cuenta para la calificación del curso (reportes).
  cuenta_calificacion boolean not null default true,
  actualizado_en timestamptz not null default now()
);


-- 3. Preguntas -------------------------------------------------------------------
--
-- tipo:
--   opcion    una respuesta de varias (examen o encuesta)
--   multiple  varias respuestas correctas (examen o encuesta)
--   escala    1 a 5, de "Muy mal" a "Muy bien" (encuesta)
--   abierta   texto libre (encuesta; en examen no se califica)

create table if not exists public.evaluacion_preguntas (
  id bigserial primary key,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  orden integer not null default 0,
  tipo text not null default 'opcion',
  texto text not null,
  -- Lista de textos de las opciones (en escala, las etiquetas de 1 a 5).
  opciones jsonb not null default '[]'::jsonb,
  puntos integer not null default 1,
  obligatoria boolean not null default true,
  creada_en timestamptz not null default now()
);

alter table public.evaluacion_preguntas drop constraint if exists evaluacion_preguntas_tipo_check;
alter table public.evaluacion_preguntas
  add constraint evaluacion_preguntas_tipo_check check (tipo in ('opcion', 'multiple', 'escala', 'abierta'));

create index if not exists evaluacion_preguntas_leccion_idx on public.evaluacion_preguntas (leccion_id, orden);

-- Respuestas correctas: índices (desde 0) de las opciones correctas.
create table if not exists public.evaluacion_claves (
  pregunta_id bigint primary key references public.evaluacion_preguntas(id) on delete cascade,
  correctas jsonb not null default '[]'::jsonb
);


-- 4. Intentos ---------------------------------------------------------------------
--
-- Los escribe solo el servidor (evaluacion-enviar). respuestas guarda lo que
-- contestó el alumno en cada pregunta: índice, lista de índices, número de la
-- escala o texto. Es lo que alimenta el análisis por pregunta.

create table if not exists public.evaluacion_intentos (
  id bigserial primary key,
  leccion_id bigint not null references public.curso_lecciones(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  numero integer not null default 1,
  respuestas jsonb not null default '{}'::jsonb,
  -- null en encuestas: no se califican.
  calificacion numeric(5, 2),
  aprobado boolean,
  iniciado_en timestamptz,
  enviado_en timestamptz not null default now(),
  duracion_seg integer
);

create index if not exists evaluacion_intentos_leccion_idx on public.evaluacion_intentos (leccion_id, user_id);
create index if not exists evaluacion_intentos_curso_idx on public.evaluacion_intentos (course_id, enviado_en);


-- 5. Permisos ----------------------------------------------------------------------

alter table public.evaluacion_config enable row level security;
drop policy if exists "evaluacion config: leer" on public.evaluacion_config;
create policy "evaluacion config: leer" on public.evaluacion_config
  for select using (public.es_admin() or public.esta_inscrito(public.curso_de_leccion(leccion_id)));
drop policy if exists "evaluacion config: admin" on public.evaluacion_config;
create policy "evaluacion config: admin" on public.evaluacion_config
  for all using (public.es_admin()) with check (public.es_admin());

-- Las preguntas (sin respuesta) las ve el alumno inscrito.
alter table public.evaluacion_preguntas enable row level security;
drop policy if exists "evaluacion preguntas: leer" on public.evaluacion_preguntas;
create policy "evaluacion preguntas: leer" on public.evaluacion_preguntas
  for select using (public.es_admin() or public.esta_inscrito(public.curso_de_leccion(leccion_id)));
drop policy if exists "evaluacion preguntas: admin" on public.evaluacion_preguntas;
create policy "evaluacion preguntas: admin" on public.evaluacion_preguntas
  for all using (public.es_admin()) with check (public.es_admin());

-- Las respuestas correctas: solo administradores.
alter table public.evaluacion_claves enable row level security;
drop policy if exists "evaluacion claves: admin" on public.evaluacion_claves;
create policy "evaluacion claves: admin" on public.evaluacion_claves
  for all using (public.es_admin()) with check (public.es_admin());

-- Intentos: cada alumno ve los suyos; el administrador, todos. Nadie los
-- escribe desde el navegador (no hay política de insert/update).
alter table public.evaluacion_intentos enable row level security;
drop policy if exists "evaluacion intentos: leer" on public.evaluacion_intentos;
create policy "evaluacion intentos: leer" on public.evaluacion_intentos
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists "evaluacion intentos: admin borra" on public.evaluacion_intentos;
create policy "evaluacion intentos: admin borra" on public.evaluacion_intentos
  for delete using (public.es_admin());


-- 6. Candado del avance ------------------------------------------------------------
--
-- El avance de las lecciones lo escribe el navegador del alumno (videos, PDF,
-- lecturas). Un examen, una encuesta o una sesión en vivo, en cambio, solo
-- cuentan como completados si lo decide el servidor (al calificar o al revisar
-- la asistencia de Zoom): si no, bastaría una petición a mano para "aprobar".

create or replace function public.leccion_progreso_candado()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  quien text := coalesce(auth.role(), '');
  tipo_leccion text;
begin
  if quien in ('', 'service_role') or public.es_admin() then
    return new;
  end if;

  select tipo into tipo_leccion from public.curso_lecciones where id = new.leccion_id;
  if tipo_leccion in ('examen', 'encuesta', 'sesion', 'seccion') then
    if tg_op = 'INSERT' then
      new.completada := false;
      new.porcentaje := 0;
    else
      new.completada := old.completada;
      new.porcentaje := old.porcentaje;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leccion_progreso_candado on public.leccion_progreso;
create trigger leccion_progreso_candado
  before insert or update on public.leccion_progreso
  for each row execute function public.leccion_progreso_candado();
