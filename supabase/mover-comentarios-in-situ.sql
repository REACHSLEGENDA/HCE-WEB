-- Mueve 4 testimonios de /comunidad a la tarjeta "Docentes, Conferencias y
-- Entrenamiento In Situ" (id en el código: 'Experiencia Docente'), a petición
-- de la Dra. Trejo (24 nov 2026):
--   del Paris International Diploma in ECMO ('Paris Diploma ECMO'):
--     Ester Abrego · María Javiera García Inostrosa (así está en su perfil)
--   del Simulador ECMO SIM ('ECMO SIM'):
--     Mariela Cecilia Castro · Lucas Zelada
--
-- El nombre no vive en testimonials: se toma de profiles.nombre_completo
-- (testimonials.user_id -> profiles.id). Se busca sin acentos ni mayúsculas.
-- Seguro e idempotente: solo mueve testimonios de esas personas que sigan en
-- la categoría de origen; si se corre dos veces, la segunda no hace nada.
--
-- Supabase -> SQL Editor (proyecto mxpxvtklkyvonbhqjdmq) -> pegar todo -> Run.

create extension if not exists unaccent;

-- 1) Revisar primero: qué testimonios se van a mover (deben salir 4).
select t.id, t.experience as categoria_actual, p.nombre_completo, left(t.content, 70) as inicio
from public.testimonials t
join public.profiles p on p.id = t.user_id
where (t.experience = 'Paris Diploma ECMO' and (
        (unaccent(lower(p.nombre_completo)) like '%ester%' and unaccent(lower(p.nombre_completo)) like '%abrego%')
     or (unaccent(lower(p.nombre_completo)) like '%javiera%' and unaccent(lower(p.nombre_completo)) similar to '%inostro(s|z)a%')))
   or (t.experience = 'ECMO SIM' and (
        (unaccent(lower(p.nombre_completo)) like '%mariela%' and unaccent(lower(p.nombre_completo)) like '%castro%')
     or (unaccent(lower(p.nombre_completo)) like '%lucas%' and unaccent(lower(p.nombre_completo)) like '%zelada%')))
order by p.nombre_completo;

-- 2) Mover.
update public.testimonials t
set experience = 'Experiencia Docente'
from public.profiles p
where p.id = t.user_id
  and ((t.experience = 'Paris Diploma ECMO' and (
          (unaccent(lower(p.nombre_completo)) like '%ester%' and unaccent(lower(p.nombre_completo)) like '%abrego%')
       or (unaccent(lower(p.nombre_completo)) like '%javiera%' and unaccent(lower(p.nombre_completo)) similar to '%inostro(s|z)a%')))
    or (t.experience = 'ECMO SIM' and (
          (unaccent(lower(p.nombre_completo)) like '%mariela%' and unaccent(lower(p.nombre_completo)) like '%castro%')
       or (unaccent(lower(p.nombre_completo)) like '%lucas%' and unaccent(lower(p.nombre_completo)) like '%zelada%'))));
