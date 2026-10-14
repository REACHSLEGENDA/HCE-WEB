// Iconos y explicaciones de cada tipo de lección para el editor del curso.
// Los nombres vienen de TIPOS_LECCION (src/lib/lecciones.js), que también usa el aula.

import { PlayCircle, FileText, BookOpen, ClipboardList, Globe, FileCheck, MessageSquareText, Heading, Video } from 'lucide-react';

export const ICONOS_LECCION = {
  video: PlayCircle,
  pdf: FileText,
  texto: BookOpen,
  tarea: ClipboardList,
  web: Globe,
  examen: FileCheck,
  encuesta: MessageSquareText,
  seccion: Heading,
  sesion: Video,
};

export const PARA_QUE_SIRVE = {
  video: 'YouTube, Vimeo o un archivo de video. Se mide cuánto ve el alumno.',
  pdf: 'Un documento para leer o descargar, guardado en privado.',
  texto: 'Texto con títulos, viñetas, negritas y enlaces.',
  tarea: 'El alumno entrega un archivo o un texto y tú lo revisas.',
  web: 'Una presentación, formulario, simulador o sitio dentro del aula.',
  examen: 'Preguntas con calificación y un mínimo para aprobar.',
  encuesta: 'Preguntas de opinión, sin calificación.',
  sesion: 'Clase por Zoom con registro y asistencia automática.',
  seccion: 'Un título que agrupa las lecciones de abajo, como "Módulo I".',
};

// Orden en que se ofrecen los tipos al agregar una lección.
export const ORDEN_TIPOS = ['video', 'pdf', 'texto', 'tarea', 'web', 'examen', 'encuesta', 'sesion', 'seccion'];
