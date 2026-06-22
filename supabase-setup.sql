-- ====================================================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS - HCE (SUPABASE)
-- ====================================================================
-- Este archivo documenta la estructura de base de datos y la automatización
-- de perfiles para el sistema de login de HCE.
--
-- INSTRUCCIONES:
-- 1. Ve a la consola de Supabase (https://supabase.com).
-- 2. Entra a tu proyecto de HCE.
-- 3. En la barra lateral izquierda, haz clic en "SQL Editor".
-- 4. Haz clic en "New query".
-- 5. Pega todo el contenido de este archivo en el editor de texto.
-- 6. Haz clic en el botón "Run" (ejecutar) en la esquina inferior derecha.
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE PERFILES
-- Esta tabla se encuentra en el esquema público y guarda los datos de contacto
-- e información de rol de los alumnos/instructores de HCE.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nombre_completo TEXT,
  telefono TEXT,
  rol TEXT DEFAULT 'estudiante' CHECK (rol IN ('estudiante', 'instructor', 'admin')),
  pais TEXT,
  estado TEXT,
  grado TEXT,
  especialidad TEXT,
  institucion TEXT,
  cargo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
-- Esto protege las filas de tu base de datos para que los alumnos no puedan
-- modificar los datos de otros.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACCESO RLS
-- Permitimos que cualquiera pueda consultar los perfiles (por ejemplo, para 
-- ver nombres o instructores), pero solo el propio dueño de la cuenta puede
-- actualizar su información personal (nombre y teléfono).
DROP POLICY IF EXISTS "Cualquiera puede leer perfiles" ON public.profiles;
CREATE POLICY "Cualquiera puede leer perfiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. FUNCIÓN DISPARADORA (TRIGGER FUNCTION)
-- Esta función se ejecuta automáticamente cuando Supabase Auth registra un
-- nuevo usuario en el sistema. Toma el email y los metadatos de registro 
-- enviados desde React (como el nombre completo y el rol) y crea
-- una fila correspondiente en nuestra tabla pública de perfiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, nombre_completo, rol, telefono, pais, estado, grado, especialidad, institucion, cargo, avatar_url
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre_completo', ''),
    coalesce(new.raw_user_meta_data->>'rol', 'estudiante'),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    coalesce(new.raw_user_meta_data->>'pais', ''),
    coalesce(new.raw_user_meta_data->>'estado', ''),
    coalesce(new.raw_user_meta_data->>'grado', ''),
    coalesce(new.raw_user_meta_data->>'especialidad', ''),
    coalesce(new.raw_user_meta_data->>'institucion', ''),
    coalesce(new.raw_user_meta_data->>'cargo', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ASOCIACIÓN DEL TRIGGER A LA TABLA AUTH.USERS
-- Este disparador vincula la función de arriba con la tabla interna de
-- usuarios de Supabase, asegurándose de ejecutarse justo después de que
-- la inserción en auth.users termine.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ====================================================================
-- PARTE 2: CURSOS, EXÁMENES Y CERTIFICADOS TEMPORALES
-- ====================================================================

-- 1. TABLA DE CURSOS
CREATE TABLE IF NOT EXISTS public.courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duracion TEXT,
  modalidad TEXT,
  requisitos TEXT,
  image_url TEXT,
  link TEXT,
  youtube_video_id TEXT,
  certificado_template_url TEXT,
  certificado_x INTEGER DEFAULT 300,
  certificado_y INTEGER DEFAULT 400,
  certificado_font_size INTEGER DEFAULT 40,
  min_aprobacion INTEGER DEFAULT 80,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE PREGUNTAS
CREATE TABLE IF NOT EXISTS public.questions (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE CERTIFICADOS
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  pdf_url TEXT NOT NULL,
  folio TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '30 days') NOT NULL
);

-- 4. HABILITAR RLS (SEGURIDAD DE FILAS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA CURSOS
DROP POLICY IF EXISTS "Permitir lectura publica de cursos" ON public.courses;
CREATE POLICY "Permitir lectura publica de cursos" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden modificar cursos" ON public.courses;
CREATE POLICY "Solo administradores pueden modificar cursos" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 6. POLÍTICAS RLS PARA PREGUNTAS
DROP POLICY IF EXISTS "Permitir lectura publica de preguntas" ON public.questions;
CREATE POLICY "Permitir lectura publica de preguntas" ON public.questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden modificar preguntas" ON public.questions;
CREATE POLICY "Solo administradores pueden modificar preguntas" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 7. POLÍTICAS RLS PARA CERTIFICADOS
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios certificados" ON public.certificates;
CREATE POLICY "Usuarios pueden ver sus propios certificados" ON public.certificates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear sus propios certificados" ON public.certificates;
CREATE POLICY "Usuarios pueden crear sus propios certificados" ON public.certificates
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Solo administradores pueden borrar certificados" ON public.certificates;
CREATE POLICY "Solo administradores pueden borrar certificados" ON public.certificates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 8. FUNCIÓN DE LIMPIEZA DE CERTIFICADOS EXPIRADOS
CREATE OR REPLACE FUNCTION public.clean_expired_certificates()
RETURNS void AS $$
BEGIN
  -- 1. Elimina de storage.objects (para limpiar archivos fisicos del Storage bucket 'certificates')
  DELETE FROM storage.objects
  WHERE bucket_id = 'certificates'
    AND name IN (
      SELECT split_part(pdf_url, '/public/certificates/', 2)
      FROM public.certificates
      WHERE expires_at < now()
    );

  -- 2. Elimina los registros de la tabla publica
  DELETE FROM public.certificates
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================================
-- PARTE 3: CREACIÓN AUTOMÁTICA DEL BUCKET DE STORAGE 'certificates'
-- ====================================================================
-- Este bloque crea el bucket de almacenamiento 'certificates' y le da
-- permisos públicos para lectura, inserción y borrado.

-- 1. Insertar el bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar políticas de Storage
DROP POLICY IF EXISTS "Permitir lectura pública de certificados" ON storage.objects;
CREATE POLICY "Permitir lectura pública de certificados" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

DROP POLICY IF EXISTS "Permitir inserción de certificados" ON storage.objects;
CREATE POLICY "Permitir inserción de certificados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'certificates');

DROP POLICY IF EXISTS "Permitir borrado de certificados" ON storage.objects;
CREATE POLICY "Permitir borrado de certificados" ON storage.objects
  FOR DELETE USING (bucket_id = 'certificates');

-- 3. Asegurar que la columna 'link' existe si la tabla ya había sido creada anteriormente
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS link TEXT;


-- ====================================================================
-- PARTE 4: SISTEMA DE CATEGORÍAS PARA RECOMENDACIONES
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR RLS (SEGURIDAD DE FILAS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS PARA CATEGORÍAS
DROP POLICY IF EXISTS "Permitir lectura publica de categorias" ON public.categories;
CREATE POLICY "Permitir lectura publica de categorias" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden modificar categorias" ON public.categories;
CREATE POLICY "Solo administradores pueden modificar categorias" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 4. VINCULACIÓN DE CURSOS CON CATEGORÍAS
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL;


-- ====================================================================
-- PARTE 5: SISTEMA DE WEBINARS DINÁMICOS
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE WEBINARS
CREATE TABLE IF NOT EXISTS public.webinars (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT NOT NULL,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  en_vivo BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR RLS (SEGURIDAD DE FILAS)
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS PARA WEBINARS
DROP POLICY IF EXISTS "Permitir lectura publica de webinars" ON public.webinars;
CREATE POLICY "Permitir lectura publica de webinars" ON public.webinars
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden modificar webinars" ON public.webinars;
CREATE POLICY "Solo administradores pueden modificar webinars" ON public.webinars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ====================================================================
-- PARTE 6: ACTUALIZACIÓN DE PERFILES PARA FOTO Y PAÍS/DATOS CLÍNICOS
-- ====================================================================
-- Ejecuta este bloque si ya creaste la base de datos anteriormente
-- para agregar los campos necesarios en la vista del administrador.

-- 1. Agregar columnas nuevas a la tabla public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pais TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grado TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS especialidad TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institucion TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Actualizar función disparadora para registrar nuevos usuarios con estos metadatos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, nombre_completo, rol, telefono, pais, estado, grado, especialidad, institucion, cargo, avatar_url
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre_completo', ''),
    coalesce(new.raw_user_meta_data->>'rol', 'estudiante'),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    coalesce(new.raw_user_meta_data->>'pais', ''),
    coalesce(new.raw_user_meta_data->>'estado', ''),
    coalesce(new.raw_user_meta_data->>'grado', ''),
    coalesce(new.raw_user_meta_data->>'especialidad', ''),
    coalesce(new.raw_user_meta_data->>'institucion', ''),
    coalesce(new.raw_user_meta_data->>'cargo', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ====================================================================
-- PARTE 7: SISTEMA DE TESTIMONIOS Y FORO PÚBLICO
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE TESTIMONIOS
CREATE TABLE IF NOT EXISTS public.testimonials (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  experience TEXT NOT NULL, -- 'Insuficiencia Cardiaca', 'ECMO Nursing Care', 'Paris Diploma ECMO', 'ECMO SIM', 'Webinars portal'
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS DE TESTIMONIOS
DROP POLICY IF EXISTS "Lectura pública de testimonios" ON public.testimonials;
CREATE POLICY "Lectura pública de testimonios" ON public.testimonials
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados crean testimonios" ON public.testimonials;
CREATE POLICY "Usuarios autenticados crean testimonios" ON public.testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los autores y administradores pueden eliminar testimonios
DROP POLICY IF EXISTS "Usuarios borran sus propios testimonios" ON public.testimonials;
CREATE POLICY "Usuarios borran sus propios testimonios" ON public.testimonials
  FOR DELETE USING (
    (auth.uid() = user_id AND created_at > now() - interval '5 minutes') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ====================================================================
-- PARTE 8: SISTEMA DE DUDAS Y RETROALIMENTACIÓN DE CLASES (CLASSROOM)
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE COMENTARIOS/DUDAS DE AULA
CREATE TABLE IF NOT EXISTS public.classroom_comments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES public.classroom_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE public.classroom_comments ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS DE COMENTARIOS DE AULA
DROP POLICY IF EXISTS "Lectura pública de comentarios de aula" ON public.classroom_comments;
CREATE POLICY "Lectura pública de comentarios de aula" ON public.classroom_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados crean comentarios de aula" ON public.classroom_comments;
CREATE POLICY "Usuarios autenticados crean comentarios de aula" ON public.classroom_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los autores y administradores pueden eliminar comentarios de aula
DROP POLICY IF EXISTS "Usuarios borran sus propios comentarios de aula" ON public.classroom_comments;
CREATE POLICY "Usuarios borran sus propios comentarios de aula" ON public.classroom_comments
  FOR DELETE USING (
    (auth.uid() = user_id AND created_at > now() - interval '5 minutes') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );


-- ====================================================================
-- PARTE 10: SEGUIMIENTO DE PROGRESO Y ACTIVIDAD DE ALUMNOS (VIGILANCIA)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.student_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  watch_percent INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de progreso" ON public.student_progress;
CREATE POLICY "Lectura pública de progreso" ON public.student_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios modifican su propio progreso" ON public.student_progress;
CREATE POLICY "Usuarios modifican su propio progreso" ON public.student_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.student_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_action TEXT DEFAULT 'Explorando' NOT NULL,
  session_duration INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.student_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de actividad" ON public.student_activity;
CREATE POLICY "Lectura pública de actividad" ON public.student_activity
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios modifican su propia actividad" ON public.student_activity;
CREATE POLICY "Usuarios modifican su propia actividad" ON public.student_activity
  FOR ALL USING (auth.uid() = user_id);

-- Alter statements to add metadata to progress and activity
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.student_activity ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.student_activity ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.student_activity ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Form Submissions Table for Automating Guest Registration Forms
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT NOT NULL,
  form_name TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercion publica" ON public.form_submissions;
CREATE POLICY "Permitir insercion publica" 
ON public.form_submissions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON public.form_submissions;
CREATE POLICY "Permitir lectura a autenticados" 
ON public.form_submissions 
FOR SELECT 
TO authenticated 
USING (true);


