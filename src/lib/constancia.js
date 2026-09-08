// Generacion de constancias en el navegador.
//
// Es el mismo procedimiento que ya usa el aula para los cursos: se dibuja el
// nombre del alumno encima de la plantilla y se exporta como PNG. Aqui vive
// suelto para que los webinars puedan reutilizarlo sin depender del aula.

const PLANTILLA_POR_DEFECTO =
  'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png';

export async function generarConstancia({
  nombre,
  templateUrl,
  x = null,
  y = null,
  fontSize = null,
}) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = templateUrl || PLANTILLA_POR_DEFECTO;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('No se pudo cargar la plantilla de la constancia.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  ctx.font = `bold ${fontSize || 40}px Georgia, serif`;
  ctx.fillStyle = '#1B2B3C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nombre, x || canvas.width / 2, y || canvas.height / 2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  return { blob, dataUrl: canvas.toDataURL('image/png') };
}

// Descarga que funciona igual con una URL de Supabase Storage y con un data:
// URL. Se pasa por blob para que el navegador no abra la imagen en otra pestana.
export async function descargarConstancia(url, nombreArchivo) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
