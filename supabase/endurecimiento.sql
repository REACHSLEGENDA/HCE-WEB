-- ============================================================================
-- Integración y seguridad del portal HCE.
-- Publicar primero el código que usa certificado-emitir / usuario-crear.
-- Después: Supabase -> SQL Editor -> pegar todo -> Run.
-- Requiere las migraciones existentes hasta divisiones.sql. Es idempotente:
-- no elimina alumnos, inscripciones, certificados ni intentos históricos.
-- ============================================================================
begin;

-- Un administrador suspendido pierde permisos también en consultas directas.
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin' and activo); $$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.es_admin(); $$;
create or replace function public.cuenta_habilitada()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select activo and (rol = 'admin' or aprobado) from public.profiles where id = auth.uid()), false); $$;

-- Las políticas iniciales consultaban rol directamente; también respetan
-- ahora la suspensión del administrador.
drop policy if exists "Solo administradores pueden modificar cursos" on public.courses;
create policy "Solo administradores pueden modificar cursos" on public.courses
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Solo administradores pueden modificar preguntas" on public.questions;
create policy "Solo administradores pueden modificar preguntas" on public.questions
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Solo administradores pueden modificar categorias" on public.categories;
create policy "Solo administradores pueden modificar categorias" on public.categories
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Solo administradores pueden modificar webinars" on public.webinars;
create policy "Solo administradores pueden modificar webinars" on public.webinars
  for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Usuarios pueden ver sus propios certificados" on public.certificates;
create policy "Usuarios pueden ver sus propios certificados" on public.certificates
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists "Solo administradores pueden borrar certificados" on public.certificates;
create policy "Solo administradores pueden borrar certificados" on public.certificates
  for delete using (public.es_admin());

-- 1. Mensaje de bienvenida compartido entre admin y alumno.
create table if not exists public.portal_config (
  clave text primary key,
  valor jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);
alter table public.portal_config enable row level security;
grant select, insert, update, delete on public.portal_config to authenticated;
grant all on public.portal_config to service_role;
drop policy if exists "portal config: leer" on public.portal_config;
create policy "portal config: leer" on public.portal_config
  for select to authenticated using (true);
drop policy if exists "portal config: admin" on public.portal_config;
create policy "portal config: admin" on public.portal_config
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- 2. Comentarios: datos públicos mínimos, sin correo, teléfono ni aprobación.
create or replace function public.perfiles_publicos(p_ids uuid[])
returns table (id uuid, nombre text, avatar_url text, rol text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.nombre_completo, p.avatar_url, p.rol
  from public.profiles p where p.id = any(p_ids);
$$;
revoke all on function public.perfiles_publicos(uuid[]) from public, anon;
grant execute on function public.perfiles_publicos(uuid[]) to authenticated, service_role;

-- 3. Certificados y resultados: solo los emite el servidor.
drop policy if exists "Usuarios pueden crear sus propios certificados" on public.certificates;
revoke insert, update on public.certificates from anon, authenticated;
grant insert, update on public.certificates to service_role;

-- El bucket público permite leer el certificado con su enlace, pero solo
-- su dueño o un admin puede crear, reemplazar o quitar el archivo.
drop policy if exists "Permitir inserción de certificados" on storage.objects;
drop policy if exists "Permitir borrado de certificados" on storage.objects;
drop policy if exists "certificados: subir el propio" on storage.objects;
create policy "certificados: subir el propio" on storage.objects
  for insert to authenticated with check (bucket_id = 'certificates' and
    (split_part(name, '/', 1) = auth.uid()::text or public.es_admin()));
drop policy if exists "certificados: actualizar el propio" on storage.objects;
create policy "certificados: actualizar el propio" on storage.objects
  for update to authenticated using (bucket_id = 'certificates' and
    (split_part(name, '/', 1) = auth.uid()::text or public.es_admin()))
  with check (bucket_id = 'certificates' and
    (split_part(name, '/', 1) = auth.uid()::text or public.es_admin()));
drop policy if exists "certificados: borrar el propio" on storage.objects;
create policy "certificados: borrar el propio" on storage.objects
  for delete to authenticated using (bucket_id = 'certificates' and
    (split_part(name, '/', 1) = auth.uid()::text or public.es_admin()));

-- El navegador ya no registra ninguno de los dos tipos de curso_eventos.
-- Ambas escrituras pasan por examen-calificar y certificado-emitir.
drop policy if exists "eventos: registrar el propio" on public.curso_eventos;
revoke insert, update, delete on public.curso_eventos from anon, authenticated;
grant insert, update, delete on public.curso_eventos to service_role;

-- Preservar el historial: esta función antigua borraba a los 30 días los
-- certificados que prueban finalización, prerrequisitos y puntos.
create or replace function public.clean_expired_certificates()
returns void language plpgsql security definer set search_path = public
as $$ begin return; end; $$;
revoke all on function public.clean_expired_certificates() from public, anon, authenticated;
grant execute on function public.clean_expired_certificates() to service_role;

-- Evita duplicados por peticiones simultáneas; conserva duplicados viejos si
-- existen, para que el administrador pueda revisarlos sin perder historia.
do $$
begin
  if not exists (select 1 from public.certificates group by user_id, course_id having count(*) > 1) then
    create unique index if not exists certificates_usuario_curso_unico on public.certificates (user_id, course_id);
  else
    raise notice 'Hay certificados históricos duplicados: se conservan. Revisarlos antes de crear certificates_usuario_curso_unico.';
  end if;
end $$;

-- 4. Las entregas solo pueden completar lecciones reales de tipo tarea.
drop policy if exists "tareas: entregar la propia" on public.tarea_entregas;
create policy "tareas: entregar la propia" on public.tarea_entregas
  for insert to authenticated with check (
    auth.uid() = user_id and estado = 'entregada'
    and comentario is null and revisada_en is null
    and public.esta_inscrito(course_id)
    and exists (select 1 from public.curso_lecciones l
      where l.id = leccion_id and l.course_id = tarea_entregas.course_id and l.tipo = 'tarea')
    and (archivo_path is null or
      (split_part(archivo_path, '/', 1) = course_id::text and split_part(archivo_path, '/', 2) = auth.uid()::text))
  );

create or replace function public.tarea_entrega_actualizar_progreso()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  alumno uuid := coalesce(new.user_id, old.user_id);
  leccion bigint := coalesce(new.leccion_id, old.leccion_id);
  curso bigint;
  ultimo_estado text;
begin
  select l.course_id into curso from public.curso_lecciones l where l.id = leccion and l.tipo = 'tarea';
  if curso is null then return null; end if;
  -- Se toma la entrega más reciente, no una revisión vieja que llegó tarde.
  perform pg_advisory_xact_lock(hashtextextended(alumno::text || ':' || leccion::text, 0));
  select e.estado into ultimo_estado from public.tarea_entregas e
    where e.user_id = alumno and e.leccion_id = leccion and e.course_id = curso
    order by e.creada_en desc, e.id desc limit 1;
  insert into public.leccion_progreso (user_id, leccion_id, course_id, porcentaje, completada)
  values (alumno, leccion, curso,
    case when ultimo_estado in ('entregada', 'aprobada') then 100 else 0 end,
    coalesce(ultimo_estado in ('entregada', 'aprobada'), false))
  on conflict (user_id, leccion_id) do update set
    porcentaje = excluded.porcentaje, completada = excluded.completada;
  return null;
end;
$$;
revoke all on function public.tarea_entrega_actualizar_progreso() from public, anon, authenticated;
drop trigger if exists tarea_entrega_actualizar_progreso on public.tarea_entregas;
create trigger tarea_entrega_actualizar_progreso
  after insert or update of estado on public.tarea_entregas
  for each row execute function public.tarea_entrega_actualizar_progreso();

create or replace function public.leccion_progreso_candado()
returns trigger language plpgsql set search_path = public
as $$
declare
  quien text := coalesce(auth.role(), '');
  tipo_leccion text;
begin
  if quien in ('', 'service_role') or public.es_admin() then return new; end if;
  -- El trigger confiable de tarea corre como dueño de la función. auth.role()
  -- sigue siendo 'authenticated': solo esa escritura anidada se permite.
  if pg_trigger_depth() > 1 and current_user = (
    select pg_get_userbyid(proowner) from pg_proc
    where oid = 'public.tarea_entrega_actualizar_progreso()'::regprocedure
  ) then return new; end if;
  select tipo into tipo_leccion from public.curso_lecciones where id = new.leccion_id;
  if tipo_leccion in ('examen', 'encuesta', 'sesion', 'seccion', 'tarea') then
    if tg_op = 'INSERT' then new.completada := false; new.porcentaje := 0;
    else new.completada := old.completada; new.porcentaje := old.porcentaje;
    end if;
  end if;
  return new;
end;
$$;

-- El saneamiento mantiene avance de videos, pero permite que una corrección
-- de tarea o asistencia manual vuelva realmente a 0%.
create or replace function public.leccion_progreso_sanear()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.porcentaje := least(greatest(coalesce(new.porcentaje, 0), 0), 100);
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id; new.leccion_id := old.leccion_id; new.course_id := old.course_id;
    if coalesce(auth.role(), '') not in ('', 'service_role') and not public.es_admin()
       and pg_trigger_depth() = 1 then
      new.porcentaje := greatest(old.porcentaje, new.porcentaje);
    end if;
  end if;
  if new.completada and (tg_op = 'INSERT' or not old.completada) then new.completada_en := now();
  elsif not new.completada then new.completada_en := null;
  end if;
  new.actualizado_en := now(); return new;
end;
$$;

-- 5. Perfil: el alumno no cambia su identidad ni datos de control.
create or replace function public.profiles_proteger()
returns trigger language plpgsql set search_path = public
as $$
declare quien text := coalesce(auth.role(), '');
begin
  if tg_op = 'INSERT' then
    if quien <> 'service_role' then
      new.rol := 'estudiante'; new.aprobado := false; new.aprobado_en := null;
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

-- esta_inscrito() conserva acceso por ser SECURITY DEFINER.
revoke execute on function public.acceso_vigente(bigint, uuid) from public, anon, authenticated;
grant execute on function public.acceso_vigente(bigint, uuid) to service_role;

-- 6. Destinatarios: cada alumno ve su fila; remitente y admin ven todas.
drop policy if exists "mensaje destinatarios: leer" on public.mensaje_destinatarios;
create policy "mensaje destinatarios: leer" on public.mensaje_destinatarios
  for select to authenticated using (
    public.es_admin() or auth.uid() = user_id or exists (
      select 1 from public.mensajes m where m.id = mensaje_id and m.remitente_id = auth.uid()
    )
  );

-- El id de los certificados es uuid: el recordatorio de recertificación no se
-- podía guardar y el aviso se repetía cada día.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'recordatorios' and column_name = 'certificado_id' and data_type <> 'text') then
    alter table public.recordatorios alter column certificado_id type text using certificado_id::text;
  end if;
end $$;

-- 7. El correo de inscripción respeta cuentas pendientes de aprobación.
update public.notificaciones
set cuerpo = E'Hola {nombre}:\n\nQuedaste inscrito en {curso}. {acceso}'
where evento = 'inscrito_curso' and course_id is null and cuerpo like '%Ya tienes acceso a {curso}%';

do $$
begin
  if not exists (select 1 from public.evaluacion_intentos group by leccion_id, user_id, numero having count(*) > 1) then
    create unique index if not exists evaluacion_intentos_numero_unico on public.evaluacion_intentos (leccion_id, user_id, numero);
  else
    raise notice 'Hay números de intento históricos repetidos: se conservan. Revisarlos antes de crear evaluacion_intentos_numero_unico.';
  end if;
end $$;
commit;
