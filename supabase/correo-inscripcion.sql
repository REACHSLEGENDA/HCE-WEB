-- ============================================================================
-- Correo "Inscrito a un curso" con el texto de la Dra. Trejo (27 nov 2026).
--
-- Cambia el asunto y el texto del aviso general (el que no es de un curso en
-- particular). Solo lo cambia si todavía tiene el texto de antes, así no pisa
-- una versión que se haya editado a mano en Admin -> Notificaciones.
-- {acceso} dice "El contenido ya está disponible en tu portal…" cuando el curso
-- ya se abrió, o que su lugar quedó apartado si falta activar su cuenta o grupo.
-- El botón del correo ahora dice "Comenzar mi curso".
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.
-- ============================================================================

update public.notificaciones
set asunto = '¡Tu inscripción a {curso} fue exitosa!',
    cuerpo = E'¡Hola, {nombre}!\n\n¡Tu inscripción al {curso} ha sido exitosa!\n\n{acceso}\n\nNos entusiasma acompañarte en esta nueva experiencia de aprendizaje y contribuir a tu desarrollo profesional.\n\n¡Te damos la bienvenida a la comunidad de Healthcare Training Experience!\n\nAprende. Entrena. Transforma.\nEquipo HCE',
    actualizado_en = now()
where evento = 'inscrito_curso'
  and course_id is null
  and destinatario = 'alumno'
  and cuerpo like '%Quedaste inscrito en {curso}%';

select id, asunto, cuerpo, activo from public.notificaciones where evento = 'inscrito_curso';
