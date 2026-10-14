// Reglas de la interfaz del editor de cursos (pestañas, validación y
// detección de cambios sin guardar). No toca Supabase.

export const PESTANAS_CURSO = [
  { id: 'info', etiqueta: 'Información', formulario: true },
  { id: 'precio', etiqueta: 'Precio y acceso', formulario: true },
  { id: 'certificado', etiqueta: 'Certificado', formulario: true },
  { id: 'examen', etiqueta: 'Examen final', formulario: true },
  { id: 'lecciones', etiqueta: 'Lecciones', requiereGuardado: true },
  { id: 'reglas', etiqueta: 'Reglas', requiereGuardado: true },
  { id: 'biblioteca', etiqueta: 'Biblioteca', requiereGuardado: true },
  { id: 'alumnos', etiqueta: 'Alumnos', requiereGuardado: true },
];

export const esPestanaFormulario = (id) => PESTANAS_CURSO.some((p) => p.id === id && p.formulario);
const existePestana = (id) => PESTANAS_CURSO.some((p) => p.id === id);

const CLAVE_PESTANA = 'adminEditorCursoPestana';

/** Última pestaña abierta; en un curso nuevo solo vale si es del formulario. */
export function pestanaInicialCurso(cursoGuardado) {
  let guardada = null;
  try { guardada = localStorage.getItem(CLAVE_PESTANA); } catch { /* sin almacenamiento */ }
  if (!guardada || !existePestana(guardada)) return 'info';
  if (!cursoGuardado && !esPestanaFormulario(guardada)) return 'info';
  return guardada;
}

export function recordarPestanaCurso(id) {
  try { localStorage.setItem(CLAVE_PESTANA, id); } catch { /* sin almacenamiento */ }
}

const vacio = (valor) => !String(valor ?? '').trim();

/**
 * Errores del formulario del curso, en el orden de las pestañas. Cada error
 * dice en qué pestaña está y qué campo enfocar (id del elemento).
 */
export function validarCurso(form, { esMiniaturaYoutube = () => false } = {}) {
  const errores = [];
  const agregar = (campo, pestana, mensaje) => errores.push({ campo, pestana, mensaje, foco: `curso-${campo}` });

  if (vacio(form.title)) agregar('titulo', 'info', 'Escribe el título del curso.');
  if (vacio(form.duracion)) agregar('duracion', 'info', 'Indica la duración (por ejemplo, 40 horas).');
  if (vacio(form.description)) agregar('descripcion', 'info', 'Escribe una descripción breve.');
  if (form.tipo === 'pago' && esMiniaturaYoutube(form.image)) {
    agregar('portada', 'info', 'Los cursos de pago necesitan una portada propia: la miniatura de YouTube deja ver el video sin pagar.');
  }

  if (form.tipo === 'pago' && !(Number(form.precio_mxn) > 0)) {
    agregar('precio', 'precio', 'Un curso de pago necesita un precio mayor a cero.');
  }

  if (form.vigencia_meses !== '' && form.vigencia_meses != null && !(Number(form.vigencia_meses) >= 1)) {
    agregar('vigencia', 'certificado', 'La vigencia debe ser de al menos 1 mes, o déjala vacía si no vence.');
  }

  const minimo = Number(form.minAprobacion);
  if (form.minAprobacion === '' || !Number.isFinite(minimo) || minimo < 0 || minimo > 100) {
    agregar('min-aprobacion', 'examen', 'El porcentaje mínimo de aprobación debe estar entre 0 y 100.');
  }

  (form.questions || []).forEach((q, i) => {
    if (vacio(q.question_text)) agregar(`pregunta-${i}-texto`, 'examen', `Escribe el texto de la pregunta ${i + 1}.`);
    const opciones = Array.isArray(q.options) ? q.options : [];
    opciones.forEach((o, j) => {
      if (vacio(o)) agregar(`pregunta-${i}-op-${j}`, 'examen', `Completa la opción ${j + 1} de la pregunta ${i + 1}.`);
    });
    const correcta = Number(q.correct_option_index);
    if (opciones.length < 2 || !Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) {
      agregar(`pregunta-${i}-correcta`, 'examen', `Elige una respuesta correcta válida en la pregunta ${i + 1}.`);
    }
  });

  return errores;
}

/**
 * Huella de lo editable del formulario. Deja fuera lo que el guardado cambia
 * por su cuenta (estado activo e ids de preguntas recién insertadas) para no
 * marcar "cambios sin guardar" justo después de guardar.
 */
export function firmaCurso(form) {
  if (!form) return '';
  const { activo: _activo, questions, ...resto } = form;
  return JSON.stringify({
    ...resto,
    questions: (questions || []).map((q) => ({
      question_text: q.question_text ?? '',
      options: q.options || [],
      correct_option_index: q.correct_option_index,
    })),
  });
}
