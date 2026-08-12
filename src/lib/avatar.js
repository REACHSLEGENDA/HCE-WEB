const INLINE_IMAGE_PREFIX = 'data:image/';

export const isInlineAvatar = (value) => (
  typeof value === 'string' && value.startsWith(INLINE_IMAGE_PREFIX)
);

export const getSafeAvatarUrl = (...candidates) => (
  candidates.find((value) => (
    typeof value === 'string' && value.trim() !== '' && !isInlineAvatar(value)
  )) || ''
);

export const dataUrlToBlob = async (dataUrl) => {
  if (!isInlineAvatar(dataUrl)) {
    throw new Error('El avatar heredado no es una imagen Base64 válida.');
  }

  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('No se pudo convertir el avatar heredado.');
  }

  return response.blob();
};

export const uploadAvatar = async (supabase, userId, file) => {
  if (!userId) throw new Error('No hay un usuario autenticado.');
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.');
  }

  const filePath = `${userId}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Supabase no devolvió la URL pública del avatar.');
  }

  return `${data.publicUrl}?v=${Date.now()}`;
};
