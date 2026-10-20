// SEO, AEO y LLMs de las páginas públicas (propuesta del 15 oct 2026):
// título, descripción, imagen para compartir, texto base sin JavaScript y datos
// estructurados (JSON-LD) para Google y los buscadores con IA.
//
// Lo usa scripts/seo-paginas.mjs al compilar: genera un HTML por página con
// estas etiquetas y su contenido (los crawlers de IA no ejecutan JavaScript;
// sin esto solo veían el título). Sin precios por ahora (decisión del 15 oct).
// `archivos` son las fuentes de cada página: su último commit es el lastmod
// del sitemap. Cambia fechas y textos aquí cuando cambien en el sitio.

import { AUTOR, CONSULTAS, FAQ_ECMO, FAQ_PROGRAMAS, PROGRAMAS_CTA } from './consultas.js';
import { DEFINICION_HCE, PROGRAMAS } from './programas.js';
import { INSTRUCTORES } from './instructores.js';

export const SITIO = 'https://healthcareexp.com';
export const NOMBRE = 'HCE – Healthcare Training Experience';
const LOGO = `${SITIO}/icons/icon-512.png`;
const OG = (archivo) => `${SITIO}/og/${archivo}`;
const FOTO = (ruta) => `${SITIO}${ruta}`;

export const ORGANIZACION = {
  '@type': 'EducationalOrganization',
  '@id': `${SITIO}/#organizacion`,
  name: NOMBRE,
  alternateName: ['HCE', 'Healthcare Training Experience', 'HCE Healthcare Training Experience'],
  // Desambiguación: no es "HCE Healthcare Edition" de Dual Code (Canadá).
  disambiguatingDescription: 'Organización mexicana de educación médica continua en ECMO; no confundir con "HCE Healthcare Edition" de Dual Code (Canadá).',
  url: `${SITIO}/`,
  logo: LOGO,
  image: OG('hce.jpg'),
  description: DEFINICION_HCE,
  email: 'academia@healthcareexp.com',
  telephone: '+52 56 5927 1906',
  contactPoint: [{
    '@type': 'ContactPoint', contactType: 'admisiones', telephone: '+52 56 5927 1906', email: 'academia@healthcareexp.com',
    availableLanguage: ['es', 'en'], areaServed: ['MX', 'Latinoamérica'],
  }],
  founder: { '@type': 'Person', name: 'Dra. Jenifer Trejo Guerra' },
  areaServed: [{ '@type': 'Country', name: 'México' }, { '@type': 'Place', name: 'Latinoamérica' }],
  knowsAbout: ['ECMO', 'Oxigenación por membrana extracorpórea', 'Enfermería en cuidados críticos', 'Simulación clínica', 'Cuidados críticos', 'Insuficiencia cardiaca avanzada'],
  sameAs: [
    'https://www.facebook.com/hce.training/',
    'https://www.instagram.com/hce.training/',
    'https://www.tiktok.com/@hcetraining',
    'https://www.youtube.com/@HealthcareTrainingExperience',
  ],
};

const SEDE_INER = {
  '@type': 'Place',
  name: 'INER — Instituto Nacional de Enfermedades Respiratorias',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Calz. de Tlalpan 4502, Belisario Domínguez Secc 16',
    addressLocality: 'Tlalpan, Ciudad de México',
    postalCode: '14080',
    addressCountry: 'MX',
  },
};

const proveedor = { '@id': `${SITIO}/#organizacion` };
const programa = (id) => PROGRAMAS.find((p) => p.id === id);

function curso({ nombre, descripcion, ruta, imagen, instancias = [], publico }) {
  return {
    '@type': 'Course',
    name: nombre,
    description: descripcion,
    url: `${SITIO}${ruta}`,
    image: imagen,
    inLanguage: 'es',
    provider: proveedor,
    ...(publico ? { audience: { '@type': 'EducationalAudience', educationalRole: publico } } : {}),
    ...(instancias.length ? { hasCourseInstance: instancias } : {}),
  };
}

const faqSchema = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })),
});

const migas = (pasos) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [{ nombre: 'Inicio', ruta: '/' }, ...pasos].map((p, i) => ({
    '@type': 'ListItem', position: i + 1, name: p.nombre, item: `${SITIO}${p.ruta}`,
  })),
});

const personas = () => INSTRUCTORES.map((i) => ({
  '@type': 'Person',
  name: i.name.replace(/^(Prof\.|Enf\.|Dra?\.)\s*/, ''),
  honorificPrefix: (i.name.match(/^(Prof\.|Enf\.|Dra?\.)/) || [])[0],
  jobTitle: i.role,
  description: i.bio,
  image: i.image ? FOTO(i.image) : undefined,
  nationality: i.country,
  worksFor: proveedor,
  ...(i.linkedin ? { sameAs: [i.linkedin] } : {}),
}));

// Texto base (sin JavaScript) de una ficha de programa: respuesta directa,
// ficha rápida y sus consultas.
const fichaPrograma = (p) => ({
  respuesta: p.resumen,
  ficha: [['Para quién', p.publico], ['Modalidad', p.modalidad], ['Inicio', p.inicio], ['Distintivo', p.distintivo]],
  enlaces: p.consultas.map((s) => CONSULTAS.find((c) => c.slug === s)).filter(Boolean).map((c) => ({ ruta: `/consultas/${c.slug}`, texto: c.tituloCorto })),
});

// ---------------------------------------------------------------------------
export const PAGINAS = [
  {
    ruta: '/',
    titulo: 'HCE – Healthcare Training Experience | Cursos de ECMO y cuidados críticos',
    descripcion: 'Educación médica continua en ECMO, enfermería crítica y simulación clínica para Latinoamérica: Diploma de París en ECMO, ECMO Nursing Care y el simulador ECMO SIM.',
    imagen: OG('hce.jpg'),
    prioridad: 1.0,
    h1: 'HCE – Healthcare Training Experience: cursos de ECMO y cuidados críticos',
    texto: { respuesta: DEFINICION_HCE, enlaces: PROGRAMAS.map((p) => ({ ruta: p.ruta, texto: p.nombre })) },
    archivos: ['src/pages/Home.jsx'],
    schema: () => [{ '@type': 'WebSite', '@id': `${SITIO}/#sitio`, url: `${SITIO}/`, name: NOMBRE, inLanguage: 'es', publisher: proveedor }],
  },
  {
    ruta: '/programas',
    titulo: 'Cursos de ECMO y cuidados críticos en México y Latinoamérica | HCE',
    descripcion: 'Compara los programas de HCE: Diploma de París en ECMO, curso de ECMO para enfermería y simulador ECMO SIM. Público, modalidad e inicio.',
    imagen: OG('hce.jpg'),
    prioridad: 0.9,
    h1: 'Cursos de ECMO y cuidados críticos en México y Latinoamérica',
    texto: {
      respuesta: DEFINICION_HCE,
      tabla: { encabezados: ['Programa', 'Para quién', 'Modalidad', 'Inicio'], filas: PROGRAMAS.map((p) => [p.nombre, p.publico, p.modalidad, p.inicio]) },
      enlaces: PROGRAMAS.map((p) => ({ ruta: p.ruta, texto: p.nombre })),
    },
    archivos: ['src/data/programas.js', 'src/pages/Consultas.jsx'],
    schema: (p) => [
      { '@type': 'ItemList', name: p.h1, itemListElement: PROGRAMAS.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITIO}${x.ruta}`, name: x.nombre })) },
      migas([{ nombre: 'Programas', ruta: p.ruta }]),
    ],
  },
  {
    ruta: '/paris-diploma-ecmo',
    titulo: 'Diploma Internacional París en ECMO | INER, Ciudad de México – HCE',
    descripcion: 'Certifícate con los profesores Alain Combes y Matthieu Schmidt (Pitié-Salpêtrière, París). Inicio 28 de octubre de 2026 en el INER, CDMX. Temario, fechas e inscripción.',
    imagen: OG('paris.jpg'),
    prioridad: 0.9,
    h1: 'Paris International Diploma in ECMO — Diploma Internacional París en ECMO',
    texto: fichaPrograma(programa('paris')),
    archivos: ['src/pages/ParisDiploma.jsx', 'src/components/paris/ParisNewDesign.jsx', 'src/data/programas.js'],
    schema: (p) => [
      curso({
        nombre: 'Paris International Diploma in ECMO', descripcion: programa('paris').resumen, ruta: p.ruta, imagen: p.imagen,
        publico: programa('paris').publico,
        instancias: [{ '@type': 'CourseInstance', courseMode: 'onsite', startDate: '2026-10-28', endDate: '2026-10-31', location: SEDE_INER,
          instructor: personas().filter((x) => /Combes|Schmidt/.test(x.name)) }],
      }),
      {
        '@type': 'Event',
        name: 'Paris International Diploma in ECMO 2026',
        description: programa('paris').resumen,
        image: p.imagen,
        startDate: '2026-10-28T08:00:00-06:00',
        endDate: '2026-10-31T18:00:00-06:00',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: SEDE_INER,
        organizer: proveedor,
      },
      migas([{ nombre: 'Programas', ruta: '/programas' }, { nombre: 'Diploma de París en ECMO', ruta: p.ruta }]),
    ],
  },
  {
    ruta: '/ecmo-nursing-care',
    titulo: 'Curso ECMO para Enfermería | ECMO Nursing Care Course – HCE',
    descripcion: 'El primer entrenamiento en ECMO diseñado por y para enfermería: cuidado del circuito, vigilancia, complicaciones y simulación. Fechas y registro.',
    imagen: OG('nursing.jpg'),
    prioridad: 0.9,
    h1: 'Curso de ECMO para enfermería: ECMO Nursing Care Course',
    texto: fichaPrograma(programa('nursing')),
    archivos: ['src/pages/Nursing.jsx', 'src/data/programas.js'],
    schema: (p) => [
      curso({ nombre: 'ECMO Nursing Care Course', descripcion: programa('nursing').resumen, ruta: p.ruta, imagen: p.imagen, publico: programa('nursing').publico }),
      migas([{ nombre: 'Programas', ruta: '/programas' }, { nombre: 'ECMO Nursing Care', ruta: p.ruta }]),
    ],
  },
  {
    ruta: '/simulador-ecmo-sim',
    titulo: 'ECMO SIM: Simulador ECMO para Entrenamiento Clínico | HCE',
    descripcion: 'ECMO SIM: simulador clínico 100% en línea con ventilador y consola ECMO en una terapia intensiva 3D. Para profesionales y para hospitales que entrenan a su equipo.',
    imagen: OG('ecmosim.jpg'),
    prioridad: 0.8,
    h1: 'ECMO SIM: simulador ECMO para entrenamiento clínico',
    texto: fichaPrograma(programa('sim')),
    archivos: ['src/pages/EcmoSim.jsx', 'src/data/programas.js'],
    schema: (p) => [
      curso({ nombre: 'ECMO SIM — Simulador clínico de ECMO', descripcion: programa('sim').resumen, ruta: p.ruta, imagen: p.imagen, publico: programa('sim').publico,
        instancias: [{ '@type': 'CourseInstance', courseMode: 'online' }] }),
      migas([{ nombre: 'Programas', ruta: '/programas' }, { nombre: 'ECMO SIM', ruta: p.ruta }]),
    ],
  },
  {
    ruta: '/para-hospitales',
    titulo: 'Capacitación en ECMO para hospitales | HCE',
    descripcion: 'Capacitación en ECMO y cuidados críticos para equipos de hospital: programas para equipos ECMO nuevos, simulación con ECMO SIM y formación a la medida.',
    imagen: OG('hce.jpg'),
    prioridad: 0.7,
    h1: 'Capacitación en ECMO para hospitales',
    texto: { respuesta: 'HCE capacita a equipos de hospital en ECMO y cuidados críticos: programas para equipos ECMO nuevos, simulación con ECMO SIM, formación a la medida y un portal con la marca de la institución para dar seguimiento al avance.' },
    archivos: ['src/pages/Consultas.jsx'],
    schema: (p) => [
      { '@type': 'Service', name: p.h1, serviceType: 'Capacitación médica para hospitales', provider: proveedor, areaServed: 'Latinoamérica', url: `${SITIO}${p.ruta}` },
      migas([{ nombre: 'Para hospitales', ruta: p.ruta }]),
    ],
  },
  {
    ruta: '/consultas',
    titulo: 'Consultas de ECMO y medicina crítica | HCE',
    descripcion: 'Respuestas claras sobre ECMO, enfermería crítica, simulación clínica e insuficiencia cardiaca, con fuentes oficiales. Por el equipo académico de HCE.',
    imagen: OG('guias.jpg'),
    prioridad: 0.8,
    h1: 'Consultas de ECMO y medicina crítica',
    texto: { respuesta: 'Respuestas claras para médicos, enfermería y perfusión: qué es, cómo se hace y dónde aprenderlo.', enlaces: CONSULTAS.map((c) => ({ ruta: `/consultas/${c.slug}`, texto: c.titulo })) },
    archivos: ['src/data/consultas.js', 'src/pages/Consultas.jsx'],
    schema: (p) => [
      { '@type': 'CollectionPage', url: `${SITIO}${p.ruta}`, name: p.titulo, hasPart: CONSULTAS.map((c) => ({ '@type': 'MedicalWebPage', headline: c.titulo, url: `${SITIO}/consultas/${c.slug}` })) },
      migas([{ nombre: 'Consultas', ruta: p.ruta }]),
    ],
  },
  ...CONSULTAS.map((c) => ({
    ruta: `/consultas/${c.slug}`,
    titulo: `${c.titulo} | HCE`,
    descripcion: c.descripcion,
    imagen: FOTO(c.imagen.src),
    imagenCuadrada: true,
    prioridad: 0.7,
    h1: c.titulo,
    tipoOg: 'article',
    consulta: c,
    archivos: ['src/data/consultas.js'],
    actualizado: c.actualizado,
    schema: (p) => [
      {
        '@type': 'MedicalWebPage',
        '@id': `${SITIO}${p.ruta}#pagina`,
        url: `${SITIO}${p.ruta}`,
        name: c.titulo,
        headline: c.titulo,
        description: c.descripcion,
        image: p.imagen,
        inLanguage: 'es',
        datePublished: c.publicado,
        dateModified: c.actualizado,
        ...(c.revisor ? { lastReviewed: c.actualizado, reviewedBy: { '@type': 'Person', name: c.revisor } } : {}),
        author: { '@type': 'Organization', name: AUTOR, url: `${SITIO}/` },
        publisher: proveedor,
        audience: { '@type': 'MedicalAudience', audienceType: 'Clinician' },
        about: { '@type': 'MedicalEntity', name: c.palabraClave },
        keywords: [c.palabraClave, ...c.buscar].join(', '),
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.guia-respuesta'] },
        mentions: PROGRAMAS_CTA[c.programa] ? { '@type': 'Course', name: PROGRAMAS_CTA[c.programa].nombre, url: `${SITIO}${PROGRAMAS_CTA[c.programa].enlace}` } : undefined,
      },
      faqSchema(c.faqs),
      migas([{ nombre: 'Consultas', ruta: '/consultas' }, { nombre: c.tituloCorto, ruta: p.ruta }]),
    ],
  })),
  {
    ruta: '/preguntas-frecuentes',
    titulo: 'Preguntas frecuentes sobre los cursos de ECMO | HCE',
    descripcion: 'Respuestas sobre los programas de HCE (fechas, inscripción, pagos, certificados y factura) y sobre ECMO, con fuentes oficiales.',
    imagen: OG('hce.jpg'),
    prioridad: 0.7,
    h1: 'Preguntas frecuentes',
    faqs: [...FAQ_PROGRAMAS, ...FAQ_ECMO],
    archivos: ['src/data/consultas.js'],
    schema: (p) => [faqSchema([...FAQ_PROGRAMAS, ...FAQ_ECMO]), migas([{ nombre: 'Preguntas frecuentes', ruta: p.ruta }])],
  },
  {
    ruta: '/quienes-somos',
    titulo: 'Quiénes somos | HCE – Healthcare Training Experience',
    descripcion: 'HCE – Healthcare Training Experience: educación médica continua en ECMO, cuidados críticos y simulación clínica para Latinoamérica. Fundada por la Dra. Jenifer Trejo Guerra.',
    imagen: OG('hce.jpg'),
    prioridad: 0.6,
    h1: 'Quiénes somos',
    texto: { respuesta: DEFINICION_HCE },
    archivos: ['src/pages/AboutUs.jsx'],
    schema: (p) => [{ '@type': 'AboutPage', url: `${SITIO}${p.ruta}`, name: p.titulo, about: proveedor }, migas([{ nombre: 'Quiénes somos', ruta: p.ruta }])],
  },
  {
    ruta: '/instructores',
    titulo: 'Instructores: Alain Combes, Matthieu Schmidt y facultad de ECMO | HCE',
    descripcion: 'Aprende con referentes mundiales en ECMO y medicina crítica: el Prof. Alain Combes y el Prof. Matthieu Schmidt (Pitié-Salpêtrière, París) y su equipo de enfermería.',
    imagen: OG('hce.jpg'),
    prioridad: 0.6,
    h1: 'Instructores y facultad',
    texto: { respuesta: INSTRUCTORES.map((i) => `${i.name} — ${i.role}. ${i.bio}`).join(' ') },
    archivos: ['src/data/instructores.js', 'src/pages/Instructores.jsx'],
    schema: (p) => [...personas(), migas([{ nombre: 'Instructores', ruta: p.ruta }])],
  },
  {
    ruta: '/verificar',
    noindex: true,
    titulo: 'Verificar certificado HCE con folio o QR',
    descripcion: 'Comprueba que un certificado de HCE – Healthcare Training Experience es auténtico con su folio o código QR.',
    imagen: OG('verificar.jpg'),
    prioridad: 0.3,
    h1: 'Verificar un certificado de HCE',
    archivos: ['src/pages/VerificarCertificado.jsx'],
  },
  // Inscripciones y facturación: bloqueadas a buscadores (robots.txt), pero con
  // su vista previa al compartirlas por WhatsApp.
  { ruta: '/inscripciones-step1', noindex: true, titulo: 'Inscripción Step 1 · Diploma de París en ECMO | HCE', descripcion: 'Inscríbete al Step 1 (teórico) del Paris International Diploma in ECMO: 28 y 29 de octubre de 2026, INER, Ciudad de México.', imagen: OG('step1.jpg'), prioridad: 0.1, h1: 'Inscripción al Step 1 del Diploma de París en ECMO', archivos: ['src/pages/InscripcionesStep1.jsx'] },
  { ruta: '/facturacion', noindex: true, titulo: 'Facturación electrónica CFDI 4.0 | HCE', descripcion: 'Solicita tu factura electrónica CFDI 4.0 de los programas de HCE.', imagen: OG('hce.jpg'), prioridad: 0.1, h1: 'Facturación electrónica', archivos: ['src/pages/Facturacion.jsx'] },
  { ruta: '/galeria', titulo: 'Galería de experiencias | HCE', descripcion: 'Fotos de los cursos, la simulación clínica y las entregas de diplomas de HCE en México, Chile y Ecuador.', imagen: OG('hce.jpg'), prioridad: 0.4, h1: 'Galería de experiencias HCE', archivos: ['src/pages/Gallery.jsx'] },
  { ruta: '/comunidad', titulo: 'Testimonios y comunidad | HCE', descripcion: 'Opiniones y testimonios de alumnos e instructores sobre los programas y simuladores de HCE.', imagen: OG('hce.jpg'), prioridad: 0.5, h1: 'Testimonios y comunidad HCE', archivos: ['src/pages/Comunidad.jsx'] },
  { ruta: '/aviso-de-privacidad', titulo: 'Aviso de privacidad | HCE', descripcion: 'Aviso de privacidad de HCE – Healthcare Training Experience.', imagen: OG('hce.jpg'), prioridad: 0.2, h1: 'Aviso de privacidad', archivos: ['src/pages/PrivacyPolicy.jsx'] },
];

// JSON-LD completo de una página (la organización va en todas).
export function jsonLdDe(pagina) {
  const extra = typeof pagina.schema === 'function' ? pagina.schema(pagina) : [];
  // Quita campos vacíos (undefined) para que el JSON quede limpio.
  return JSON.parse(JSON.stringify({ '@context': 'https://schema.org', '@graph': [ORGANIZACION, ...extra] }));
}

export const paginaPorRuta = (ruta) => PAGINAS.find((p) => p.ruta === ruta);
