-- ============================================================================
-- Mejoras de exámenes y encuestas de lección.
--
-- Qué hace:
--   1. Agrega el tipo de pregunta 'emparejar' (como "Ordena correctamente los
--      hitos históricos de ECMO" de TalentLMS). En opciones se guarda
--      { "izquierda": [...], "derecha": [...] } con la columna derecha
--      revuelta; en evaluacion_claves.correctas, correctas[i] es el índice de
--      la derecha que corresponde a izquierda[i]. El alumno nunca ve la clave.
--   2. Agrega "Respuestas en orden aleatorio" (aleatorio_opciones).
--   3. Agrega qué ve el alumno al terminar el examen:
--        mostrar_calificacion  la calificación (por defecto sí)
--        mostrar_marcas        si cada respuesta fue correcta o incorrecta
--        mostrar_correctas     las respuestas correctas: nunca, siempre o
--                              solo si aprueba (al_aprobar)
--      Los exámenes que ya tenían "mostrar qué contestó bien"
--      (mostrar_respuestas = true) quedan con marcas = sí y correctas = siempre.
--      La columna mostrar_respuestas se conserva (el código la sigue llenando).
--
-- Es idempotente: se puede correr varias veces. No borra datos.
-- Mientras no se corra, el portal sigue funcionando con las reglas de antes
-- (sin Emparejar ni las opciones nuevas).
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run
-- Requiere lms-evaluaciones.sql.
-- ============================================================================

-- 1. Tipo de pregunta "Emparejar" ------------------------------------------------

alter table public.evaluacion_preguntas drop constraint if exists evaluacion_preguntas_tipo_check;
alter table public.evaluacion_preguntas
  add constraint evaluacion_preguntas_tipo_check
  check (tipo in ('opcion', 'multiple', 'escala', 'abierta', 'emparejar'));


-- 2. Respuestas en orden aleatorio ------------------------------------------------

alter table public.evaluacion_config
  add column if not exists aleatorio_opciones boolean not null default false;


-- 3. Qué ve el alumno al terminar ---------------------------------------------------

alter table public.evaluacion_config
  add column if not exists mostrar_calificacion boolean not null default true;
alter table public.evaluacion_config
  add column if not exists mostrar_marcas boolean not null default false;
alter table public.evaluacion_config
  add column if not exists mostrar_correctas text not null default 'nunca';

alter table public.evaluacion_config drop constraint if exists evaluacion_config_mostrar_correctas_check;
alter table public.evaluacion_config
  add constraint evaluacion_config_mostrar_correctas_check
  check (mostrar_correctas in ('nunca', 'siempre', 'al_aprobar'));

-- Se respeta lo que ya estaba configurado. Solo toca las filas que todavía
-- tienen los valores por defecto, para no pisar cambios hechos después.
update public.evaluacion_config
   set mostrar_marcas = true,
       mostrar_correctas = 'siempre'
 where mostrar_respuestas = true
   and mostrar_marcas = false
   and mostrar_correctas = 'nunca';
