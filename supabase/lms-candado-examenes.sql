-- ============================================================================
-- Candado de los exámenes: las respuestas correctas dejan de ser legibles
-- desde el navegador.
--
-- Hasta ahora el portal cargaba las preguntas con la respuesta correcta
-- incluida y calificaba en el navegador del alumno: cualquiera que abriera las
-- herramientas del navegador podía ver las respuestas o aprobar sin estudiar.
-- Ahora califica una función del servidor (examen-calificar).
--
-- CORRER SOLO DESPUÉS de desplegar el código nuevo. El código viejo pide las
-- preguntas con todas sus columnas y, con esto aplicado, el aula viejo se
-- quedaría sin examen.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
-- ============================================================================

-- Postgres no permite quitar UNA columna si el rol tiene permiso sobre la
-- tabla completa: hay que quitar el permiso de la tabla y volver a dar todas
-- las columnas menos la respuesta. Se arma la lista en automático para no
-- depender de conocer las demás columnas.
do $$
declare
  columnas text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into columnas
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'questions'
    and column_name <> 'correct_option_index';

  execute 'revoke select on public.questions from anon, authenticated';
  execute format('grant select (%s) on public.questions to anon, authenticated', columnas);
end $$;

-- Para deshacerlo (solo si algo fallara):
--   grant select on public.questions to anon, authenticated;
