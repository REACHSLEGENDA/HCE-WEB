-- ============================================================================
-- Lecciones con enlaces: videos de Vimeo u otras plataformas, y páginas web
-- insertadas (iframe).
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere lms-estructura.sql.
-- ============================================================================

-- Enlace del video (cuando no es de YouTube) o de la página web. Queda en la
-- misma tabla protegida que el resto del contenido: solo lo leen los inscritos.
alter table public.leccion_contenido add column if not exists enlace text;

-- Nuevo tipo de lección: "web", una página insertada en el aula.
alter table public.curso_lecciones drop constraint if exists curso_lecciones_tipo_check;
alter table public.curso_lecciones
  add constraint curso_lecciones_tipo_check check (tipo in ('video', 'pdf', 'texto', 'tarea', 'web', 'examen', 'encuesta', 'seccion', 'sesion'));
