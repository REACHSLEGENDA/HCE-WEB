-- ====================================================================
-- MIGRACION DE EMERGENCIA: AVATARES BASE64 / JWT SOBREDIMENSIONADO
-- Ejecutar una sola vez en Supabase > SQL Editor antes de desplegar.
-- Es idempotente: se puede volver a ejecutar sin duplicar respaldos.
-- ====================================================================

BEGIN;

-- 1. Crear el bucket nuevo para las fotos de perfil.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Restringir escritura a la carpeta del usuario autenticado.
DROP POLICY IF EXISTS "Lectura publica de avatares HCE" ON storage.objects;
CREATE POLICY "Lectura publica de avatares HCE" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuarios suben su avatar HCE" ON storage.objects;
CREATE POLICY "Usuarios suben su avatar HCE" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuarios actualizan su avatar HCE" ON storage.objects;
CREATE POLICY "Usuarios actualizan su avatar HCE" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuarios borran su avatar HCE" ON storage.objects;
CREATE POLICY "Usuarios borran su avatar HCE" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Respaldar avatares Base64 antes de quitarlos de las tablas activas.
CREATE TABLE IF NOT EXISTS public.avatar_migration_backups (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_data TEXT NOT NULL,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.avatar_migration_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.avatar_migration_backups FROM anon, authenticated;

INSERT INTO public.avatar_migration_backups (user_id, avatar_data)
SELECT id, avatar_url
FROM public.profiles
WHERE avatar_url LIKE 'data:image/%'
ON CONFLICT (user_id) DO NOTHING;

-- Algunas cuentas solo conservan la imagen dentro de Auth, no en profiles.
INSERT INTO public.avatar_migration_backups (user_id, avatar_data)
SELECT id, raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'avatar_url', '') LIKE 'data:image/%'
ON CONFLICT (user_id) DO NOTHING;

-- 4. El avatar nunca debe formar parte de user_metadata/JWT.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'avatar_url'
WHERE COALESCE(raw_user_meta_data, '{}'::jsonb) ? 'avatar_url';

-- Evitar que select('*') descargue imágenes de varios MB desde profiles.
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url LIKE 'data:image/%';

-- 5. Reparar cuentas de Auth cuyo trigger original no creó public.profiles.
-- El rol se fuerza a estudiante: user_metadata es editable por el usuario y no es una fuente segura para privilegios.
INSERT INTO public.profiles (
  id, email, nombre_completo, rol, telefono, pais, estado, grado,
  especialidad, institucion, cargo, avatar_url
)
SELECT
  u.id,
  COALESCE(u.email, u.id::text || '@perfil-pendiente.local'),
  COALESCE(u.raw_user_meta_data->>'nombre_completo', u.raw_user_meta_data->>'full_name', ''),
  'estudiante',
  COALESCE(u.raw_user_meta_data->>'telefono', ''),
  COALESCE(u.raw_user_meta_data->>'pais', ''),
  COALESCE(u.raw_user_meta_data->>'estado', ''),
  COALESCE(u.raw_user_meta_data->>'grado', ''),
  COALESCE(u.raw_user_meta_data->>'especialidad', ''),
  COALESCE(u.raw_user_meta_data->>'institucion', ''),
  COALESCE(u.raw_user_meta_data->>'cargo', ''),
  NULL
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Permite que el frontend reconstruya únicamente el perfil propio y siempre como estudiante.
DROP POLICY IF EXISTS "Usuarios crean su propio perfil de estudiante" ON public.profiles;
CREATE POLICY "Usuarios crean su propio perfil de estudiante" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND rol = 'estudiante');

-- La limpieza de certificados borra datos y nunca debe ejecutarse desde el navegador.
REVOKE EXECUTE ON FUNCTION public.clean_expired_certificates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_expired_certificates() TO service_role;

COMMIT;

-- VERIFICACIÓN: los tres valores deben ser 0.
SELECT
  (SELECT count(*) FROM auth.users WHERE COALESCE(raw_user_meta_data, '{}'::jsonb) ? 'avatar_url')
    AS auth_avatar_keys_remaining,
  (SELECT count(*) FROM public.profiles WHERE avatar_url LIKE 'data:image/%')
    AS profile_base64_remaining,
  (SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL)
    AS users_without_profile;

-- Después de ejecutar:
-- 1. Confirmar que la consulta de verificación devuelve 0, 0, 0.
-- 2. Pulsar "Reintentar sesión" en el portal o cerrar sesión y volver a ingresar.
-- 3. Cada usuario puede volver a subir su foto; ahora se guardará en Storage.
