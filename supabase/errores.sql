-- ============================================================================
-- Aviso automático de errores del portal (errores_cliente).
--
-- Cuando una pantalla truena en el navegador de alguien, el portal lo manda a
-- netlify/functions/reportar-error.js, que lo guarda aquí agrupado por
-- "huella" (mensaje + primera línea del stack + ruta) con un contador, y avisa
-- por correo a los administradores la primera vez (y luego máximo 1 por hora
-- por huella). El panel lo muestra en Sistema -> Errores.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere la función public.es_admin() (cursos-inscripciones.sql /
-- endurecimiento.sql), que ya existe en producción.
--
-- Antes de correrlo el portal sigue funcionando: la función solo deja el
-- error en el registro de Netlify y el panel muestra "Falta correr el SQL".
-- ============================================================================

begin;

create table if not exists public.errores_cliente (
  id bigint generated always as identity primary key,
  huella text not null unique,
  mensaje text not null,
  stack text,
  componente text,              -- pila de componentes de React (si fue al dibujar)
  ruta text,                    -- ruta normalizada (/classroom/:id), sin ?query ni #hash
  origen text,                  -- render | error | promesa
  version text,                 -- build que lo produjo (hash del archivo principal)
  navegador text,               -- "Chrome 141 · Android"
  user_agent text,
  ultimo_user_id uuid,          -- última cuenta con sesión que lo vio (si había)
  veces integer not null default 1,
  primera_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  correo_enviado_en timestamptz,
  resuelto boolean not null default false,
  resuelto_en timestamptz,
  resuelto_por uuid
);

create index if not exists errores_cliente_ultima_vez_idx on public.errores_cliente (ultima_vez desc);
create index if not exists errores_cliente_pendientes_idx on public.errores_cliente (resuelto, ultima_vez desc);

-- Límite por IP (la IP se guarda como hash, nunca en claro). Ventanas de 10 min.
create table if not exists public.errores_cliente_tasa (
  ip_hash text not null,
  ventana timestamptz not null,
  conteo integer not null default 0,
  primary key (ip_hash, ventana)
);

-- ---------------------------------------------------------------------------
-- Permisos: el navegador NUNCA inserta. Solo el admin lee y marca resuelto.
-- ---------------------------------------------------------------------------
alter table public.errores_cliente enable row level security;
alter table public.errores_cliente_tasa enable row level security;

revoke all on public.errores_cliente from anon, authenticated;
revoke all on public.errores_cliente_tasa from anon, authenticated;
grant select, update on public.errores_cliente to authenticated;
grant all on public.errores_cliente to service_role;
grant all on public.errores_cliente_tasa to service_role;
grant usage, select on sequence public.errores_cliente_id_seq to service_role;

drop policy if exists "errores: admin lee" on public.errores_cliente;
create policy "errores: admin lee" on public.errores_cliente
  for select to authenticated using (public.es_admin());

drop policy if exists "errores: admin actualiza" on public.errores_cliente;
create policy "errores: admin actualiza" on public.errores_cliente
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Registro atómico: límite por IP + agrupación por huella + decisión de correo
-- en una sola transacción, para que dos reportes simultáneos no manden dos
-- correos. Devuelve { limitado, nuevo, reabierto, enviar_correo, veces, id }.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_error_cliente(
  p_huella text, p_mensaje text, p_stack text, p_componente text, p_ruta text,
  p_origen text, p_version text, p_navegador text, p_user_agent text,
  p_user_id uuid, p_ip_hash text, p_limite integer default 30
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ventana timestamptz := date_bin('10 minutes', now(), timestamptz '2000-01-01');
  v_conteo integer;
  r public.errores_cliente;
  v_nuevo boolean := false;
  v_reabierto boolean := false;
  v_enviar boolean := false;
begin
  if p_ip_hash is not null then
    insert into public.errores_cliente_tasa as t (ip_hash, ventana, conteo)
    values (p_ip_hash, v_ventana, 1)
    on conflict (ip_hash, ventana) do update set conteo = t.conteo + 1
    returning conteo into v_conteo;
    if v_conteo > coalesce(p_limite, 30) then
      return jsonb_build_object('limitado', true);
    end if;
    -- Limpieza ocasional de ventanas viejas.
    if random() < 0.02 then
      delete from public.errores_cliente_tasa where ventana < now() - interval '1 day';
    end if;
  end if;

  select * into r from public.errores_cliente where huella = p_huella for update;
  if not found then
    insert into public.errores_cliente (huella, mensaje, stack, componente, ruta, origen, version,
      navegador, user_agent, ultimo_user_id, correo_enviado_en)
    values (p_huella, left(p_mensaje, 500), left(p_stack, 4000), left(p_componente, 2000), left(p_ruta, 300),
      left(p_origen, 20), left(p_version, 80), left(p_navegador, 80), left(p_user_agent, 300), p_user_id, now())
    on conflict (huella) do nothing
    returning * into r;
    if r.id is not null then
      v_nuevo := true;
      v_enviar := true;
    else
      -- Otro reporte la creó al mismo tiempo: se toma como repetición.
      select * into r from public.errores_cliente where huella = p_huella for update;
    end if;
  end if;

  if not v_nuevo then
    v_reabierto := r.resuelto;
    v_enviar := r.resuelto or r.correo_enviado_en is null or r.correo_enviado_en < now() - interval '1 hour';
    update public.errores_cliente set
      veces = veces + 1,
      ultima_vez = now(),
      stack = coalesce(left(p_stack, 4000), stack),
      componente = coalesce(left(p_componente, 2000), componente),
      version = coalesce(left(p_version, 80), version),
      navegador = coalesce(left(p_navegador, 80), navegador),
      user_agent = coalesce(left(p_user_agent, 300), user_agent),
      ultimo_user_id = coalesce(p_user_id, ultimo_user_id),
      resuelto = false,
      resuelto_en = case when resuelto then null else resuelto_en end,
      resuelto_por = case when resuelto then null else resuelto_por end,
      correo_enviado_en = case when v_enviar then now() else correo_enviado_en end
    where id = r.id
    returning * into r;
  end if;

  return jsonb_build_object('limitado', false, 'nuevo', v_nuevo, 'reabierto', v_reabierto,
    'enviar_correo', v_enviar, 'veces', r.veces, 'id', r.id);
end;
$$;
revoke all on function public.registrar_error_cliente(text, text, text, text, text, text, text, text, text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.registrar_error_cliente(text, text, text, text, text, text, text, text, text, uuid, text, integer) to service_role;

commit;
