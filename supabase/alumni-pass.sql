-- ============================================================================
-- Alumni Pass: Step 1 Refresher (28 y 29 de octubre de 2026).
--
-- Exclusivo para exalumnos del Diploma Internacional de París en ECMO. El
-- exalumno solicita con su diploma; el equipo lo aprueba ANTES de enviarle
-- el enlace de pago. El webhook firmado o el regreso de Stripe confirman el
-- pago y agregan el contacto a Brevo; un fallo de correo admite reintento.
--
-- Todo lo escribe el servidor (netlify/functions/alumni-pass.js con la llave
-- de servicio). El administrador lo ve y revisa los diplomas desde el panel.
-- Los diplomas viven en un bucket PRIVADO: nadie los puede abrir sin ser admin.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Es idempotente y solo agrega.
-- Requiere cuentas-aprobacion.sql / endurecimiento.sql (función es_admin).
-- ============================================================================
begin;

create table if not exists public.alumni_pass_registros (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  email text not null,
  nombre text not null,
  telefono text,
  pais text,
  -- 'presencial' (30 lugares) o 'virtual' (streaming en vivo).
  modalidad text not null,
  -- Extra de grabaciones por 1 mes en el campus virtual.
  grabaciones boolean not null default false,
  diploma_path text not null,
  moneda text not null default 'mxn',
  importe numeric,
  stripe_session_id text unique,
  pagado boolean not null default false,
  pagado_en timestamptz,
  folio text unique,
  -- Revisión del diploma por el equipo.
  revision text not null default 'pendiente',
  notas text
);

-- Flujo de solicitud (14 oct): el exalumno solicita con sus datos y su diploma,
-- el equipo lo acepta y entonces recibe por correo su enlace de pago personal
-- (healthcareexp.com/alumni-pass-step1?pago=<token>).
alter table public.alumni_pass_registros add column if not exists ciudad text;
alter table public.alumni_pass_registros add column if not exists hospital text;
alter table public.alumni_pass_registros add column if not exists especialidad text;
alter table public.alumni_pass_registros add column if not exists nombres text;
alter table public.alumni_pass_registros add column if not exists apellido_paterno text;
alter table public.alumni_pass_registros add column if not exists apellido_materno text;
alter table public.alumni_pass_registros add column if not exists edicion_diploma text;
alter table public.alumni_pass_registros add column if not exists token text;
alter table public.alumni_pass_registros add column if not exists revisado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists pago_enviado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists brevo_sincronizado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists aviso_pago_en timestamptz;
alter table public.alumni_pass_registros add column if not exists correo_enlace_en timestamptz;
alter table public.alumni_pass_registros add column if not exists solicitud_clave uuid;
alter table public.alumni_pass_registros add column if not exists formulario_registrado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists formulario_id uuid not null default gen_random_uuid();
alter table public.alumni_pass_registros add column if not exists brevo_solicitud_en timestamptz;
alter table public.alumni_pass_registros add column if not exists formspree_estado text not null default 'pendiente';
alter table public.alumni_pass_registros add column if not exists formspree_enviado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists formspree_intento uuid;
alter table public.alumni_pass_registros add column if not exists formspree_intentado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists formspree_error text;
alter table public.alumni_pass_registros add column if not exists checkout_intento uuid;
alter table public.alumni_pass_registros add column if not exists checkout_reservado_hasta timestamptz;
alter table public.alumni_pass_registros add column if not exists checkout_creado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists checkout_modalidad text;
alter table public.alumni_pass_registros add column if not exists checkout_moneda text;
alter table public.alumni_pass_registros add column if not exists checkout_grabaciones boolean;
create unique index if not exists alumni_pass_token_idx on public.alumni_pass_registros (token);
create unique index if not exists alumni_pass_solicitud_idx on public.alumni_pass_registros (solicitud_clave);

alter table public.alumni_pass_registros drop constraint if exists alumni_pass_modalidad_check;
alter table public.alumni_pass_registros
  add constraint alumni_pass_modalidad_check check (modalidad in ('presencial', 'virtual'));
alter table public.alumni_pass_registros drop constraint if exists alumni_pass_revision_check;
alter table public.alumni_pass_registros
  add constraint alumni_pass_revision_check check (revision in ('pendiente', 'aprobado', 'rechazado'));

create index if not exists alumni_pass_pagado_idx on public.alumni_pass_registros (pagado, modalidad);
create index if not exists alumni_pass_email_idx on public.alumni_pass_registros (lower(email));

alter table public.alumni_pass_registros enable row level security;
revoke all on public.alumni_pass_registros from anon;
grant select, update on public.alumni_pass_registros to authenticated;
grant all on public.alumni_pass_registros to service_role;
grant usage, select on sequence public.alumni_pass_registros_id_seq to service_role;
-- La tabla general existe desde supabase-setup.sql. La copia de Alumni Pass
-- la escribe el servidor; el navegador continúa usando su política de lectura.
grant select, insert, update on public.form_submissions to service_role;

drop policy if exists "alumni pass: admin lee" on public.alumni_pass_registros;
create policy "alumni pass: admin lee" on public.alumni_pass_registros
  for select to authenticated using (public.es_admin());
drop policy if exists "alumni pass: admin revisa" on public.alumni_pass_registros;
create policy "alumni pass: admin revisa" on public.alumni_pass_registros
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Bucket privado de diplomas: lo sube el servidor; solo el admin lo lee.
insert into storage.buckets (id, name, public)
values ('alumni-diplomas', 'alumni-diplomas', false)
on conflict (id) do update set public = false;

drop policy if exists "alumni diplomas: admin lee" on storage.objects;
create policy "alumni diplomas: admin lee" on storage.objects
  for select to authenticated using (bucket_id = 'alumni-diplomas' and public.es_admin());

-- El bloqueo serializa las reservas de los 30 lugares. Solo el servidor puede
-- llamarlo; dos clics o dos compradores por el último lugar no crean sobrecupo.
create or replace function public.alumni_reservar_pago(p_id bigint, p_modalidad text, p_moneda text, p_grabaciones boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.alumni_pass_registros; ocupados integer;
begin
  perform pg_advisory_xact_lock(20261028);
  select * into r from public.alumni_pass_registros where id = p_id for update;
  if not found or r.revision <> 'aprobado' or r.pagado then
    raise exception 'La solicitud no está disponible para pago.';
  end if;
  if p_modalidad is null or p_moneda is null or p_modalidad not in ('presencial', 'virtual') or p_moneda not in ('mxn', 'usd') or p_grabaciones is null then
    raise exception 'Opciones de pago inválidas.';
  end if;
  if r.checkout_intento is not null and r.checkout_reservado_hasta > now() then
    return to_jsonb(r);
  end if;
  if p_modalidad = 'presencial' then
    select count(*) into ocupados from public.alumni_pass_registros a where
      (a.pagado and a.modalidad = 'presencial') or
      (not a.pagado and a.checkout_modalidad = 'presencial' and a.checkout_reservado_hasta > now()) or
      (not a.pagado and a.checkout_intento is null and a.modalidad = 'presencial'
        and a.stripe_session_id is not null and a.pago_enviado_en > now() - interval '35 minutes');
    if ocupados >= 30 then raise exception 'ALUMNI_AGOTADO'; end if;
  end if;
  update public.alumni_pass_registros set
    checkout_intento = gen_random_uuid(), checkout_creado_en = now(),
    checkout_reservado_hasta = now() + interval '35 minutes',
    checkout_modalidad = p_modalidad, checkout_moneda = p_moneda,
    checkout_grabaciones = p_grabaciones, stripe_session_id = null
  where id = p_id returning * into r;
  return to_jsonb(r);
end;
$$;
revoke all on function public.alumni_reservar_pago(bigint, text, text, boolean) from public, anon, authenticated;
grant execute on function public.alumni_reservar_pago(bigint, text, text, boolean) to service_role;

create or replace function public.alumni_liberar_pago(p_id bigint, p_intento uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.alumni_pass_registros set checkout_reservado_hasta = now(), checkout_intento = null,
    stripe_session_id = null
  where id = p_id and checkout_intento = p_intento and not pagado;
$$;
revoke all on function public.alumni_liberar_pago(bigint, uuid) from public, anon, authenticated;
grant execute on function public.alumni_liberar_pago(bigint, uuid) to service_role;

commit;
