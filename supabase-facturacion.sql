-- ==========================================
-- SCRIPT DE CONFIGURACIÓN DE FACTURACIÓN
-- ==========================================

-- 1. Crear tabla de facturación
CREATE TABLE IF NOT EXISTS public.facturacion_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  razon_social text NOT NULL,
  rfc text NOT NULL,
  correo text NOT NULL,
  telefono text,
  cp_fiscal text NOT NULL,
  regimen_fiscal text NOT NULL,
  uso_cfdi text NOT NULL,
  direccion text,
  metodo_pago text NOT NULL,
  concepto text,
  monto text,
  notas text,
  constancia_url text,
  comprobantes_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pendiente' NOT NULL -- pendiente, completado
);

-- Habilitar RLS en la tabla
ALTER TABLE public.facturacion_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para facturacion_requests (Anónimos pueden insertar, solo admin puede leer/actualizar)
CREATE POLICY "Allow public insert to facturacion_requests"
ON public.facturacion_requests FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow admin read/update facturacion_requests"
ON public.facturacion_requests FOR ALL
TO authenticated
USING (true);

-- 2. Crear bucket de almacenamiento para los PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('facturacion_files', 'facturacion_files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket facturacion_files
-- Permitir a cualquier usuario subir archivos (insert)
CREATE POLICY "Allow public uploads to facturacion_files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'facturacion_files');

-- Permitir a cualquier usuario leer los archivos (para poder enviar el link público)
CREATE POLICY "Allow public read from facturacion_files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'facturacion_files');

-- Permitir a los admins borrar archivos si es necesario
CREATE POLICY "Allow admin delete from facturacion_files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facturacion_files');
