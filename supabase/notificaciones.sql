-- ============================================================================
-- Notificaciones automáticas por evento (como "Notificaciones" de TalentLMS).
--
-- El administrador arma cada aviso: en qué evento se manda, a quién, el asunto
-- y el texto (con variables como {nombre} o {curso}), y lo activa o apaga. El
-- servidor lo manda por Brevo cuando ocurre el evento, una sola vez por
-- persona y evento (notificaciones_enviadas evita duplicados).
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- ============================================================================

create table if not exists public.notificaciones (
  id bigserial primary key,
  nombre text not null,
  evento text not null,
  -- Solo para este curso; null = cualquier curso.
  course_id bigint references public.courses(id) on delete cascade,
  -- 'alumno' (quien provocó el evento) o 'admins' (todos los administradores).
  destinatario text not null default 'alumno',
  asunto text not null,
  cuerpo text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.notificaciones drop constraint if exists notificaciones_evento_check;
alter table public.notificaciones
  add constraint notificaciones_evento_check check (evento in (
    'registro_nuevo', 'cuenta_activada', 'inscrito_curso', 'sesion_registro',
    'sesion_recordatorio', 'examen_aprobado', 'tarea_revisada', 'curso_completado', 'mensaje_nuevo'
  ));
alter table public.notificaciones drop constraint if exists notificaciones_destinatario_check;
alter table public.notificaciones
  add constraint notificaciones_destinatario_check check (destinatario in ('alumno', 'admins'));

create table if not exists public.notificaciones_enviadas (
  id bigserial primary key,
  notificacion_id bigint not null references public.notificaciones(id) on delete cascade,
  -- Identifica el hecho notificado (p. ej. "certificado:123"): cada hecho se
  -- avisa una sola vez por notificación.
  clave text not null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  enviado_en timestamptz not null default now(),
  error text,
  unique (notificacion_id, clave)
);

create index if not exists notificaciones_enviadas_fecha_idx on public.notificaciones_enviadas (enviado_en desc);

-- Solo el administrador las ve y las edita; el envío lo hace el servidor.
alter table public.notificaciones enable row level security;
drop policy if exists "notificaciones: admin" on public.notificaciones;
create policy "notificaciones: admin" on public.notificaciones
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.notificaciones_enviadas enable row level security;
drop policy if exists "notificaciones enviadas: admin" on public.notificaciones_enviadas;
create policy "notificaciones enviadas: admin" on public.notificaciones_enviadas
  for select using (public.es_admin());

-- Avisos de fábrica, ya activos (con el diseño de los correos de HCE). Se
-- editan o apagan en Admin -> Notificaciones. Solo se agregan si no existe ya
-- uno general para ese evento, así que correr esto otra vez no los duplica.
-- La bienvenida al registrarse no va aquí: ya la manda el flujo "portal hce"
-- de Brevo.
insert into public.notificaciones (nombre, evento, destinatario, asunto, cuerpo)
select v.nombre, v.evento, v.destinatario, v.asunto, v.cuerpo
from (values
  ('Nueva cuenta por activar', 'registro_nuevo', 'admins',
   'Nueva cuenta por activar: {alumno}',
   E'Hola {nombre}:\n\n{alumno} ({correo_alumno}) se registró en el portal. Ya puede entrar, pero sus cursos quedan cerrados hasta que le des acceso y le asignes su grupo.\n\nAbre el panel en Alumnos → Cuentas por activar.'),
  ('Cuenta activada', 'cuenta_activada', 'alumno',
   '¡Tu cuenta en HCE ya está activa!',
   E'Hola {nombre}:\n\nTu cuenta ya tiene acceso. {acceso}\n\nYa puedes entrar a tu portal y empezar.'),
  ('Inscrito a un curso', 'inscrito_curso', 'alumno',
   'Ya estás inscrito en {curso}',
   E'Hola {nombre}:\n\nQuedaste inscrito en {curso}. {acceso}'),
  ('Registro a sesión en vivo', 'sesion_registro', 'alumno',
   'Registro confirmado: {sesion}',
   E'Hola {nombre}:\n\nQuedaste registrado a {sesion}, el {fecha}.\n\nPara entrar, abre la lección en tu aula: el botón "Unirse" se activa 15 minutos antes.'),
  ('Recordatorio de sesión en vivo', 'sesion_recordatorio', 'alumno',
   'En 1 hora empieza {sesion}',
   E'Hola {nombre}:\n\nTe recordamos que {sesion} empieza el {fecha}.\n\nEntra desde tu aula con el botón "Unirse".'),
  ('Examen aprobado', 'examen_aprobado', 'alumno',
   '¡Aprobaste {examen}!',
   E'Hola {nombre}:\n\n¡Felicidades! Aprobaste {examen} de {curso} con {calificacion}.\n\nSigue con tu curso cuando quieras.'),
  ('Tarea revisada', 'tarea_revisada', 'alumno',
   'Tu tarea {tarea} fue revisada',
   E'Hola {nombre}:\n\nTu tarea {tarea} quedó {estado}.\n\n{comentario}\n\nRevísala en tu aula.'),
  ('Curso terminado', 'curso_completado', 'alumno',
   '¡Terminaste {curso}!',
   E'Hola {nombre}:\n\n¡Felicidades por terminar {curso}! Tu certificado (folio {folio}) ya está en la pestaña Certificados de tu portal.'),
  ('Mensaje nuevo', 'mensaje_nuevo', 'alumno',
   'Tienes un mensaje nuevo: {asunto}',
   E'Hola {nombre}:\n\n{remitente} te escribió en el portal de HCE: "{asunto}".\n\nLéelo en tu bandeja de mensajes.')
) as v(nombre, evento, destinatario, asunto, cuerpo)
where not exists (
  select 1 from public.notificaciones n
  where n.evento = v.evento and n.destinatario = v.destinatario and n.course_id is null
);
