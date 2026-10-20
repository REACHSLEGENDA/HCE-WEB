// Programas de HCE para el hub /programas, la página Para hospitales y el SEO.
// Solo datos confirmados en el sitio; lo que falta se dice como "consulta".
// `imagen`: foto del programa; `poster`: la tarjeta con su logo (la misma del inicio).

export const DEFINICION_HCE = 'HCE – Healthcare Training Experience es una organización de educación médica continua especializada en ECMO, cuidados críticos y simulación clínica para profesionales de la salud de Latinoamérica.';

export const PROGRAMAS = [
  {
    id: 'paris',
    nombre: 'Paris International Diploma in ECMO',
    ruta: '/paris-diploma-ecmo',
    inscripcion: '/inscripciones-step1',
    publico: 'Médicos especialistas, residentes, enfermería y otros profesionales de la salud',
    modalidad: 'Presencial en el INER, Ciudad de México: Step 1 (teórico) y Step 2 (simulación)',
    inicio: '28 de octubre de 2026',
    distintivo: 'Profesores Alain Combes y Matthieu Schmidt, del Hospital Pitié-Salpêtrière de París',
    resumen: 'Formación avanzada en ECMO con el equipo del Hospital Pitié-Salpêtrière de París. Se divide en Step 1 (teórico) y Step 2 (simulación práctica) y la próxima generación inicia el 28 de octubre de 2026 en el INER, Ciudad de México.',
    imagen: '/consultas/certificacion-ecmo.webp',
    poster: '/assets/componentes/expparis.webp',
    consultas: ['que-es-ecmo', 'ecmo-vv-vs-va', 'canulacion-ecmo', 'destete-ecmo', 'ecpr', 'certificacion-ecmo'],
  },
  {
    id: 'nursing',
    nombre: 'ECMO Nursing Care Course',
    ruta: '/ecmo-nursing-care',
    inscripcion: '/inscripciones-ecmo-nursing',
    publico: 'Enfermería en cuidados intensivos',
    modalidad: 'Consulta fechas y modalidad de la próxima edición',
    inicio: 'Próximamente (3.ª edición)',
    distintivo: 'El primer curso de ECMO diseñado por y para enfermería',
    resumen: 'Programa de alta especialidad en ECMO para enfermería en cuidados intensivos: vigilancia del circuito, protocolos, cuidados, emergencias y destete del paciente en soporte extracorpóreo.',
    imagen: '/consultas/cuidados-enfermeria-ecmo.webp',
    poster: '/assets/componentes/expnur.webp',
    consultas: ['cuidados-enfermeria-ecmo', 'anticoagulacion-ecmo', 'complicaciones-ecmo', 'que-es-ecmo'],
  },
  {
    id: 'sim',
    nombre: 'ECMO SIM',
    ruta: '/simulador-ecmo-sim',
    inscripcion: '/simulador-ecmo-sim',
    publico: 'Profesionales de la salud y equipos de hospital',
    modalidad: '100% en línea',
    inicio: 'Disponible',
    distintivo: 'Simulador clínico 3D con ventilador y consola ECMO que reaccionan a cada decisión',
    resumen: 'Simulador clínico virtual 100% en línea que recrea una terapia intensiva en 3D con ventilador y consola ECMO, para practicar decisiones y emergencias del circuito.',
    imagen: '/consultas/simulacion-ecmo.webp',
    poster: '/assets/componentes/expsim.webp',
    consultas: ['simulacion-ecmo', 'emergencias-circuito-ecmo', 'circuito-ecmo', 'ecmo-vv-vs-va'],
  },
  // Insuficiencia cardiaca: el diplomado se retiró del sitio el 25 ago 2026
  // ("no está listo para publicarse"). Se vuelve a agregar cuando se publique.

];
