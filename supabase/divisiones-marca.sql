-- ============================================================================
-- Divisiones como TalentLMS (19 oct 2026): cada división es un mini portal con
-- su dirección, su logo, su catálogo y su registro por enlace.
--
-- Supabase -> SQL Editor -> pegar todo -> Run. Se puede correr más de una vez.
-- Requiere divisiones.sql. Sin esta migración las divisiones siguen como antes.
-- ============================================================================

begin;

alter table public.divisiones add column if not exists slug text;
alter table public.divisiones add column if not exists dominio text;
alter table public.divisiones add column if not exists logo_url text;
alter table public.divisiones add column if not exists color text;
alter table public.divisiones add column if not exists bienvenida text;
alter table public.divisiones add column if not exists catalogo text not null default 'propio';
alter table public.divisiones add column if not exists inscripcion_auto boolean not null default true;
alter table public.divisiones add column if not exists registro_abierto boolean not null default true;
alter table public.divisiones add column if not exists aprobacion_auto boolean not null default true;

alter table public.divisiones drop constraint if exists divisiones_catalogo_check;
alter table public.divisiones add constraint divisiones_catalogo_check check (catalogo in ('propio', 'propio_y_hce'));
-- slug: minúsculas, números y guiones (es la parte "hospitalx" de hospitalx.healthcareexp.com).
alter table public.divisiones drop constraint if exists divisiones_slug_check;
alter table public.divisiones add constraint divisiones_slug_check check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$');
alter table public.divisiones drop constraint if exists divisiones_color_check;
alter table public.divisiones add constraint divisiones_color_check check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
create unique index if not exists divisiones_slug_unico on public.divisiones (slug) where slug is not null;
create unique index if not exists divisiones_dominio_unico on public.divisiones (lower(dominio)) where dominio is not null;

-- Las inscripciones que hace la propia división (registro por enlace o al
-- asignarle un curso) quedan marcadas con su origen.
alter table public.inscripciones drop constraint if exists inscripciones_origen_check;
alter table public.inscripciones
  add constraint inscripciones_origen_check
  check (origen in ('gratis', 'pago', 'admin', 'previo', 'grupo', 'division'));

-- Datos públicos de la marca para la pantalla de entrada (sin sesión): por la
-- dirección (dominio propio o subdominio) o por el enlace ?division=slug.
create or replace function public.division_publica(p_host text default null, p_slug text default null)
returns table (id bigint, nombre text, slug text, logo_url text, color text, bienvenida text, registro_abierto boolean)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.nombre, d.slug, d.logo_url, d.color, d.bienvenida, d.registro_abierto
  from public.divisiones d
  where (p_slug is not null and d.slug = lower(trim(p_slug)))
     or (p_host is not null and (
          lower(d.dominio) = lower(trim(p_host))
          or (d.slug is not null and lower(trim(p_host)) = d.slug || '.healthcareexp.com')
        ))
  limit 1;
$$;
revoke all on function public.division_publica(text, text) from public;
grant execute on function public.division_publica(text, text) to anon, authenticated, service_role;

-- Logos de las divisiones: se ven públicamente; solo un admin los sube.
insert into storage.buckets (id, name, public)
values ('divisiones', 'divisiones', true)
on conflict (id) do update set public = true;

drop policy if exists "divisiones logos: admin sube" on storage.objects;
create policy "divisiones logos: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'divisiones' and public.es_admin());
drop policy if exists "divisiones logos: admin cambia" on storage.objects;
create policy "divisiones logos: admin cambia" on storage.objects
  for update to authenticated using (bucket_id = 'divisiones' and public.es_admin())
  with check (bucket_id = 'divisiones' and public.es_admin());
drop policy if exists "divisiones logos: admin borra" on storage.objects;
create policy "divisiones logos: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'divisiones' and public.es_admin());

commit;
