-- Datos separados y edición del diploma. Compatible con solicitudes anteriores.
begin;
alter table public.alumni_pass_registros add column if not exists nombres text;
alter table public.alumni_pass_registros add column if not exists apellido_paterno text;
alter table public.alumni_pass_registros add column if not exists apellido_materno text;
alter table public.alumni_pass_registros add column if not exists edicion_diploma text;
commit;
