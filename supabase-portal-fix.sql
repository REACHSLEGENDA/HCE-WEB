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

-- 4. El avatar nunca debe formar parte de user_metadata/JWT.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'avatar_url'
WHERE COALESCE(raw_user_meta_data->>'avatar_url', '') LIKE 'data:image/%';

-- Evitar que select('*') descargue imágenes de varios MB desde profiles.
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url LIKE 'data:image/%';

COMMIT;

-- Después de ejecutar:
-- 1. Cerrar sesión o borrar los datos del sitio en el navegador afectado.
-- 2. Volver a iniciar sesión para recibir un JWT pequeño.
-- 3. Cada usuario puede volver a subir su foto; ahora se guardará en Storage.
