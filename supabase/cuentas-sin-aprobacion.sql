-- ============================================================================
-- Cuentas activas desde el registro (29 oct 2026).
--
-- Antes: quien se registraba quedaba "por activar" y no abría ningún curso,
-- ni los gratuitos, hasta que un administrador lo aprobaba.
-- Ahora: al registrarse la cuenta queda activa y abre los cursos gratuitos de
-- inmediato (ese es el plus del registro). Los cursos de pago se abren al
-- pagarlos desde la plataforma (inscripción de origen 'pago'), y si el curso es
-- por generación, cuando el administrador lo junta en su grupo. Bloquear una
-- cuenta (activo = false) sigue cerrando todo.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente.
-- Reemplaza profiles_proteger() y cuenta_habilitada() de endurecimiento.sql
-- (si vuelves a correr endurecimiento.sql, corre este después).
-- ============================================================================
begin;

-- 1. Al registrarse: alumno, activo y aprobado. El alumno sigue sin poder
--    cambiarse el rol, el estado, la división, el correo ni la fecha de alta.
create or replace function public.profiles_proteger()
returns trigger language plpgsql set search_path = public
as $$
declare quien text := coalesce(auth.role(), '');
begin
  if tg_op = 'INSERT' then
    if quien <> 'service_role' then
      new.rol := 'estudiante'; new.aprobado := true; new.aprobado_en := now();
      new.activo := true; new.division_id := null;
    end if;
    return new;
  end if;
  if quien in ('', 'service_role') or public.es_admin() then return new; end if;
  new.rol := old.rol; new.activo := old.activo; new.aprobado := old.aprobado;
  new.aprobado_en := old.aprobado_en; new.division_id := old.division_id;
  new.email := old.email; new.created_at := old.created_at;
  return new;
end;
$$;

-- 2. Para tomar cursos basta con que la cuenta no esté bloqueada. Qué cursos
--    abre cada quien lo deciden sus inscripciones (gratis al inscribirse, de
--    pago al pagar), los días de acceso y, en cursos por generación, su grupo.
create or replace function public.cuenta_habilitada()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select activo from public.profiles where id = auth.uid()), false); $$;

-- 3. Las cuentas que estaban esperando activación quedan activas.
update public.profiles
   set aprobado = true, aprobado_en = coalesce(aprobado_en, now())
 where aprobado = false and activo;

commit;

-- Revisión (opcional): debe dar 0.
-- select count(*) from public.profiles where not aprobado and activo;
