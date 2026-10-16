-- Mejoras de correos (15 oct 2026): pagos, clases y aula.
-- Supabase -> SQL Editor -> pegar todo -> Run. Se puede correr más de una vez.
--
-- 1. Avisos nuevos del alumno (editables en Admin -> Notificaciones):
--      sesion_recordatorio_dia  1 día antes de una sesión en vivo
--      comentario_respondido    alguien respondió su pregunta en el aula
--      avance_semanal           lunes: resumen de su avance y "Continuar"
--      curso_casi               va en 80% o más y lleva días sin entrar
--      encuesta_curso           un día después de terminar: encuesta
-- 2. cobros_avisos: registro de correos de pagos (recibo, carrito abandonado,
--    pago no completado, fin de promoción) para no mandar nada dos veces.

begin;

alter table public.notificaciones drop constraint if exists notificaciones_evento_check;
alter table public.notificaciones
  add constraint notificaciones_evento_check check (evento in (
    'registro_nuevo', 'cuenta_activada', 'inscrito_curso', 'sesion_registro',
    'sesion_recordatorio', 'examen_aprobado', 'tarea_revisada', 'curso_completado', 'mensaje_nuevo',
    'curso_abierto',
    'sesion_recordatorio_dia', 'comentario_respondido', 'avance_semanal', 'curso_casi', 'encuesta_curso'
  ));

insert into public.notificaciones (nombre, evento, destinatario, asunto, cuerpo)
select v.nombre, v.evento, 'alumno', v.asunto, v.cuerpo
from (values
  ('Recordatorio un día antes', 'sesion_recordatorio_dia',
    'Mañana: {sesion}',
    E'Hola {nombre}:\n\nTe recordamos que mañana es {sesion} ({fecha}).\n\nAgrégala a tu calendario para no olvidarla:\n{calendario}\n\nEl día de la clase entra desde tu aula con el botón "Unirse".'),
  ('Respondieron tu pregunta', 'comentario_respondido',
    '{autor} respondió tu pregunta en {curso}',
    E'Hola {nombre}:\n\n{autor} respondió tu comentario en {curso}:\n\n"{respuesta}"\n\nEntra al aula para ver la conversación completa.'),
  ('Tu avance de la semana', 'avance_semanal',
    'Tu avance de la semana en HCE',
    E'Hola {nombre}:\n\nAsí vas en tus cursos:\n\n{resumen}\n\nUnos minutos hoy te acercan a tu certificado. Continúa donde te quedaste.'),
  ('Te falta poco', 'curso_casi',
    'Te falta poco para terminar {curso}',
    E'Hola {nombre}:\n\nYa llevas {porcentaje} de {curso}. ¡Estás muy cerca de tu certificado!\n\nEntra y termina las lecciones que te faltan.'),
  ('Encuesta al terminar', 'encuesta_curso',
    '¿Cómo te fue en {curso}?',
    E'Hola {nombre}:\n\nFelicidades por terminar {curso}. Tu opinión nos ayuda a mejorar cada programa.\n\nContesta la encuesta (toma 3 minutos):\n{encuesta}\n\n¡Gracias!')
) as v(nombre, evento, asunto, cuerpo)
where not exists (
  select 1 from public.notificaciones n
  where n.evento = v.evento and n.destinatario = 'alumno' and n.course_id is null
);

create table if not exists public.cobros_avisos (
  clave text primary key,
  tipo text not null check (tipo in ('recibo', 'carrito', 'pago_fallido', 'promo', 'resumen')),
  email text,
  programa text,
  session_id text,
  creado_en timestamptz not null default now()
);
create index if not exists cobros_avisos_email_idx on public.cobros_avisos (email, programa, creado_en desc);

-- Solo el servidor (llave de servicio) lee y escribe.
alter table public.cobros_avisos enable row level security;
revoke all on public.cobros_avisos from anon, authenticated;
grant select, insert, update, delete on public.cobros_avisos to service_role;

commit;
