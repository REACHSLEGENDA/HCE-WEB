-- Alumni Pass: invitación al portal después de pagar (16 oct 2026).
-- Supabase -> SQL Editor -> pegar todo -> Run. Se puede correr más de una vez.
--
-- portal_invitado_en  cuándo se le mandó el acceso al portal (una sola vez)
-- portal_modo         'nueva' (se le creó la cuenta) o 'existente' (ya tenía)
-- Sin estas columnas el pago funciona igual; solo no se manda la invitación.

begin;
alter table public.alumni_pass_registros add column if not exists portal_invitado_en timestamptz;
alter table public.alumni_pass_registros add column if not exists portal_modo text;
commit;
