// Consultas HCE (blog clínico, /consultas): respuestas a lo que más se busca
// sobre ECMO, enfermería crítica, simulación e insuficiencia cardiaca. Mismo
// método que las consultas de apen.mx y que la propuesta SEO/AEO del 15 oct 2026:
// respuesta rápida bajo el H1, subtítulos como preguntas, una tabla por
// artículo, preguntas frecuentes, fuentes y un enlace al programa que lo enseña.
//
// Lo usan la página /consultas/:slug, la de preguntas frecuentes y el script de
// SEO (scripts/seo-paginas.mjs). Si cambias un texto, cámbialo aquí.
//
// Regla de contenido: solo información general y verificable, con fuente. No es
// consejo médico ni promete avales o equivalencias que HCE no haya confirmado.
// `revisor` queda vacío hasta que un instructor revise la consulta (la página
// muestra "pendiente de revisión médica" mientras tanto).

export const AUTOR = 'Equipo académico de HCE – Healthcare Training Experience';

const ELSO_GUIAS = { nombre: 'ELSO — Guías clínicas y recursos', url: 'https://www.elso.org/ecmo-resources/elso-ecmo-guidelines.aspx' };
const ELSO_CERT = { nombre: 'ELSO — Certificación individual', url: 'https://www.elso.org/ecmo-education/individualcertification.aspx' };
const ELSO_FAQ = { nombre: 'ELSO — Preguntas frecuentes de la certificación (E-AEC)', url: 'https://www.elso.org/ecmo-education/e-aec-application-faq.aspx' };
const ELSO_CURSOS = { nombre: 'ELSO — Cursos y talleres', url: 'https://www.elso.org/ecmo-education/elsocourses.aspx' };
const CUN = { nombre: 'Clínica Universidad de Navarra — Diccionario médico: ECMO', url: 'https://www.cun.es/diccionario-medico/terminos/ecmo' };
const SATI = { nombre: 'SATI — ¿Qué es ECMO? (PDF)', url: 'https://www.sati.org.ar/wp-content/uploads/Que-es-ECMO.pdf' };
const SEMICYUC = { nombre: 'Medicina Intensiva (SEMICYUC) — Uso de ECMO en la UCI', url: 'https://www.medintensiva.org/es-the-use-ecmo-in-icu--articulo-S2173572718302200' };
const AMSECT = { nombre: 'AmSECT — Certified ECMO Specialist – Adult (CES-A)', url: 'https://www.amsect.org/certification/ces-a' };
const ISHLT = { nombre: 'ISHLT — International Society for Heart and Lung Transplantation', url: 'https://ishlt.org/' };

export const PROGRAMAS_CTA = {
  paris: { nombre: 'Paris International Diploma in ECMO', enlace: '/paris-diploma-ecmo' },
  nursing: { nombre: 'ECMO Nursing Care Course', enlace: '/ecmo-nursing-care' },
  sim: { nombre: 'ECMO SIM', enlace: '/simulador-ecmo-sim' },
};

export const CONSULTAS = [
  {
    slug: 'que-es-ecmo',
    codigo: 'ECMO-01',
    cluster: 'ECMO · Conceptos',
    insignia: 'Guía esencial',
    tono: 'ecmo',
    titulo: '¿Qué es la ECMO? Guía completa para profesionales de la salud',
    tituloCorto: '¿Qué es la ECMO?',
    descripcion: 'Qué es la oxigenación por membrana extracorpórea (ECMO), cómo funciona el circuito, en qué pacientes se considera y qué equipo necesita un hospital.',
    extracto: 'Cómo funciona el circuito, cuándo se considera y por qué es una terapia de equipo.',
    palabraClave: 'qué es ECMO',
    buscar: ['oxigenación por membrana extracorpórea', 'ECLS', 'soporte vital', 'circuito'],
    lineaHce: 'La ECMO no cura: da tiempo para que el corazón o los pulmones se recuperen.',
    respuestaRapida: 'La ECMO (oxigenación por membrana extracorpórea) es un soporte vital temporal que reemplaza la función de los pulmones, del corazón o de ambos en pacientes críticos. La sangre sale del cuerpo por una cánula, pasa por una bomba y un oxigenador que añade oxígeno y retira CO₂, y regresa al paciente.',
    ficha: [
      { dato: 'Qué es', valor: 'Soporte vital extracorpóreo temporal (ECLS).' },
      { dato: 'Qué sustituye', valor: 'Intercambio de gases (VV) o intercambio de gases y circulación (VA).' },
      { dato: 'Componentes', valor: 'Cánulas, bomba centrífuga, oxigenador de membrana y circuito.' },
      { dato: 'Duración típica', valor: 'De días a semanas, según la causa y la recuperación.' },
      { dato: 'Quién la maneja', valor: 'Equipo multidisciplinario: intensivistas, cirujanos, perfusión, enfermería y terapia respiratoria.' },
    ],
    secciones: [
      {
        id: 'como-funciona',
        titulo: '¿Cómo funciona el circuito de ECMO?',
        parrafos: [
          'La sangre se drena por una cánula colocada en una vena grande, una bomba centrífuga la impulsa hacia el oxigenador de membrana —donde recibe oxígeno y libera dióxido de carbono— y regresa al cuerpo por otra cánula.',
          'Según por dónde regresa la sangre se habla de ECMO venovenosa (VV), que apoya a los pulmones, o venoarterial (VA), que apoya al corazón y a los pulmones.',
        ],
        tabla: {
          titulo: 'Partes del circuito y su función',
          encabezados: ['Componente', 'Función'],
          filas: [
            ['Cánula de drenaje', 'Saca la sangre venosa del paciente.'],
            ['Bomba centrífuga', 'Genera el flujo de sangre por el circuito.'],
            ['Oxigenador de membrana', 'Añade oxígeno y retira CO₂ (el "pulmón artificial").'],
            ['Cánula de retorno', 'Devuelve la sangre a una vena (VV) o a una arteria (VA).'],
          ],
        },
      },
      {
        id: 'cuando-se-usa',
        titulo: '¿En qué pacientes se considera la ECMO?',
        parrafos: ['Es una terapia de rescate para insuficiencia respiratoria o cardiaca grave que no responde al tratamiento convencional optimizado. Algunos escenarios descritos en la literatura:'],
        puntos: [
          'Síndrome de dificultad respiratoria aguda (SDRA) grave con hipoxemia o hipercapnia refractarias.',
          'Choque cardiogénico refractario (por ejemplo, tras un infarto o una miocarditis).',
          'Paro cardiaco refractario en centros con programa de ECPR.',
          'Puente a trasplante de pulmón o de corazón, o a un dispositivo de asistencia ventricular.',
        ],
        nota: 'La decisión de iniciar ECMO es individual y la toma un equipo experto con base en guías como las de ELSO. Esta consulta es educativa y no sustituye el juicio clínico ni los protocolos de tu hospital.',
      },
      {
        id: 'que-necesita-un-hospital',
        titulo: '¿Qué necesita un hospital para ofrecer ECMO?',
        parrafos: ['ECMO no es solo una máquina: requiere un equipo multidisciplinario entrenado, protocolos escritos, disponibilidad las 24 horas y entrenamiento continuo con simulación. Por eso la formación del equipo es tan importante como el equipo médico.'],
      },
    ],
    vision: 'En los programas de HCE la ECMO se enseña como una terapia de equipo: médicos, enfermería y perfusión aprenden con el mismo lenguaje y practican juntos en simulación antes de enfrentarse al primer paciente.',
    ctaIntermedio: 'Aprende ECMO con el equipo del Hospital Pitié-Salpêtrière de París.',
    programa: 'paris',
    relacionadas: ['ecmo-vv-vs-va', 'cuidados-enfermeria-ecmo', 'certificacion-ecmo'],
    faqs: [
      { pregunta: '¿La ECMO cura la enfermedad?', respuesta: 'No. Gana tiempo para que el corazón o los pulmones se recuperen, o para llegar a otra terapia como un trasplante o un dispositivo de largo plazo.' },
      { pregunta: '¿ECMO es lo mismo que un ventilador?', respuesta: 'No. El ventilador mueve aire dentro de los pulmones; la ECMO oxigena la sangre fuera del cuerpo. En ECMO VV el ventilador suele quedar en parámetros de protección pulmonar.' },
      { pregunta: '¿Cuánto tiempo puede estar un paciente en ECMO?', respuesta: 'Es una terapia de días a semanas; la duración depende de la causa y de la recuperación del órgano, y se reevalúa todos los días.' },
      { pregunta: '¿Cuáles son las complicaciones más frecuentes?', respuesta: 'Sangrado y trombosis (por la anticoagulación y el contacto de la sangre con el circuito), infecciones, complicaciones en el sitio de canulación y fallas del circuito.' },
    ],
    fuentes: [ELSO_GUIAS, CUN, SATI],
    imagen: { src: '/consultas/que-es-ecmo.webp', alt: 'Circuito y oxigenador de ECMO durante una práctica del Diploma de París en el INER', pie: 'Práctica con circuito de ECMO · HCE, INER 2025' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
  {
    slug: 'ecmo-vv-vs-va',
    codigo: 'ECMO-02',
    cluster: 'ECMO · Conceptos',
    insignia: 'Comparativa',
    tono: 'ecmo',
    titulo: 'ECMO VV vs VA: diferencias, indicaciones y cuándo elegir cada una',
    tituloCorto: 'ECMO VV vs VA',
    descripcion: 'Diferencias entre ECMO venovenosa y venoarterial: qué órgano apoya cada una, canulación, indicaciones típicas y vigilancia. Comparación rápida para clínicos.',
    extracto: 'Qué apoya cada modalidad, cuándo se usa y qué se vigila distinto.',
    palabraClave: 'ECMO venovenoso vs venoarterial',
    buscar: ['ECMO VV', 'ECMO VA', 'venovenosa', 'venoarterial', 'recirculación', 'arlequín'],
    lineaHce: 'VV apoya a los pulmones; VA apoya al corazón y a los pulmones.',
    respuestaRapida: 'La ECMO venovenosa (VV) solo da soporte respiratorio: saca y devuelve la sangre a una vena, y necesita que el corazón funcione. La venoarterial (VA) devuelve la sangre a una arteria y da soporte respiratorio y circulatorio. VV se usa cuando fallan los pulmones; VA, en choque cardiogénico o paro.',
    ficha: [
      { dato: 'VV', valor: 'Soporte respiratorio; retorno a una vena.' },
      { dato: 'VA', valor: 'Soporte respiratorio y circulatorio; retorno a una arteria.' },
      { dato: 'Uso típico VV', valor: 'SDRA grave, insuficiencia respiratoria refractaria.' },
      { dato: 'Uso típico VA', valor: 'Choque cardiogénico, paro cardiaco refractario (ECPR).' },
    ],
    secciones: [
      {
        id: 'comparacion',
        titulo: '¿En qué se diferencian VV y VA?',
        parrafos: ['La diferencia principal es a dónde regresa la sangre oxigenada y, por lo tanto, qué función sustituye.'],
        tabla: {
          titulo: 'Comparación rápida VV vs VA',
          encabezados: ['', 'VV (venovenosa)', 'VA (venoarterial)'],
          filas: [
            ['Qué apoya', 'Pulmones (oxigenación y CO₂)', 'Corazón y pulmones'],
            ['Retorno de la sangre', 'A una vena', 'A una arteria'],
            ['¿Necesita que el corazón funcione?', 'Sí', 'No (lo sustituye en parte)'],
            ['Uso típico', 'SDRA grave, falla respiratoria', 'Choque cardiogénico, ECPR'],
          ],
        },
      },
      {
        id: 'vigilancia',
        titulo: '¿Qué se vigila distinto en cada modalidad?',
        puntos: [
          'En VV importa la recirculación: sangre oxigenada que vuelve a la cánula de drenaje sin pasar por el cuerpo.',
          'En VA periférica se vigila la poscarga del ventrículo izquierdo, la perfusión de la pierna canulada y el posible "síndrome arlequín" (oxigenación distinta entre la parte alta y la baja del cuerpo).',
          'En ambas: anticoagulación, hemólisis, presiones de la bomba y del oxigenador, y complicaciones de las cánulas.',
        ],
      },
      {
        id: 'cambio-de-modalidad',
        titulo: '¿Se puede cambiar de VV a VA?',
        parrafos: ['Sí. Si el corazón falla durante una ECMO VV, el equipo puede convertirla o agregar una cánula (configuraciones híbridas). La decisión depende del centro y del paciente.'],
      },
    ],
    vision: 'Elegir la modalidad correcta es tan importante como manejar bien el circuito. En HCE se entrena con casos clínicos y simulación para reconocer a tiempo cuándo un paciente necesita otra configuración.',
    ctaIntermedio: 'Practica VV y VA con casos reales en el Diploma de París.',
    programa: 'paris',
    relacionadas: ['que-es-ecmo', 'simulacion-ecmo', 'ic-avanzada'],
    faqs: [
      { pregunta: '¿Cuál es más riesgosa, VV o VA?', respuesta: 'Ambas tienen riesgos (sangrado, trombosis, infección). La VA suele tener más complicaciones vasculares por la canulación arterial; el riesgo real depende del equipo y del paciente.' },
      { pregunta: '¿Qué es el síndrome arlequín?', respuesta: 'En ECMO VA periférica, cuando el corazón se recupera pero los pulmones no, la parte alta del cuerpo puede recibir sangre poco oxigenada mientras la baja recibe la del circuito.' },
      { pregunta: '¿Dónde practicar ambos modos?', respuesta: 'En cursos con simulación de alta fidelidad, como el Step 2 del Paris International Diploma in ECMO, y en simuladores en línea como ECMO SIM.' },
    ],
    fuentes: [ELSO_GUIAS, SEMICYUC],
    imagen: { src: '/consultas/ecmo-vv-vs-va.webp', alt: 'Clase teórica de ECMO con monitor de signos vitales en el INER', pie: 'Clase del Diploma de París · HCE, INER 2025' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
  {
    slug: 'certificacion-ecmo',
    codigo: 'FORM-01',
    cluster: 'Formación y certificación',
    insignia: 'Paso a paso',
    tono: 'formacion',
    titulo: 'Cómo obtener una certificación en ECMO (ELSO E-AEC paso a paso)',
    tituloCorto: 'Certificación en ECMO',
    descripcion: 'Cómo obtener la certificación individual de ELSO en ECMO para adultos (E-AEC): cursos teóricos y de simulación, experiencia clínica, examen, vigencia y recertificación.',
    extracto: 'Requisitos de ELSO, cómo elegir cursos que te sirvan y qué es la CES-A.',
    palabraClave: 'certificación ECMO',
    buscar: ['ELSO', 'E-AEC', 'examen ECMO', 'ECMO specialist', 'CES-A', 'recertificación'],
    lineaHce: 'Antes de pagar un curso, pregunta qué aval tiene y guarda tus constancias con horas.',
    respuestaRapida: 'La referencia internacional es ELSO, con certificaciones individuales para adultos (E-AEC) y neonatos/pediatría (E-NPEC). Para la de adultos se combinan formación teórica, simulación, experiencia clínica supervisada y un examen; la certificación dura tres años. Revisa siempre los requisitos vigentes en elso.org antes de aplicar.',
    ficha: [
      { dato: 'Organismo', valor: 'ELSO (Extracorporeal Life Support Organization).' },
      { dato: 'Certificaciones', valor: 'E-AEC (adultos) y E-NPEC (neonatos y pediatría).' },
      { dato: 'Requisitos', valor: 'Cursos teóricos y de simulación, experiencia clínica supervisada y examen.' },
      { dato: 'Vigencia', valor: 'Tres años; se renueva con educación continua.' },
      { dato: 'Abierta a', valor: 'Médicos, enfermería, perfusión y otros especialistas en ECMO.' },
    ],
    secciones: [
      {
        id: 'pasos',
        titulo: '¿Cuáles son los pasos para certificarse?',
        tabla: {
          titulo: 'Ruta hacia la certificación individual de ELSO (adultos)',
          encabezados: ['Paso', 'Qué incluye'],
          filas: [
            ['1. Formación teórica', 'Un curso didáctico elegible.'],
            ['2. Simulación', 'Un curso práctico con simulación elegible.'],
            ['3. Experiencia clínica', 'Práctica supervisada con pacientes en ECMO, según el perfil.'],
            ['4. Examen', 'Solicitud y examen de opción múltiple de ELSO.'],
            ['5. Recertificación', 'Cada tres años, con horas de educación continua.'],
          ],
        },
        nota: 'Los detalles (horas exactas, número de preguntas, costos e idiomas) cambian. Consulta la guía vigente en elso.org antes de inscribirte.',
      },
      {
        id: 'como-elegir-cursos',
        titulo: '¿Cómo elijo cursos que me sirvan para certificarme?',
        parrafos: [
          'Según ELSO, solo los cursos avalados o impartidos por ELSO pueden afirmar oficialmente que cumplen sus criterios; lo demás es autodeclarado. Antes de pagar, pregunta al organizador qué aval tiene el curso y guarda tus constancias con horas y fechas.',
          'Un buen programa combina teoría, simulación con consola real y casos clínicos, y lo imparte un equipo que trabaja ECMO todos los días.',
        ],
      },
      {
        id: 'ces-a',
        titulo: '¿Qué es la certificación CES-A?',
        parrafos: ['El Certified ECMO Specialist – Adult (CES-A) es de AmSECT y es distinta a la de ELSO. Está pensada para especialistas en ECMO (enfermería, terapia respiratoria y profesiones aliadas) con experiencia laboral en ECMO.'],
      },
    ],
    vision: 'El Paris International Diploma in ECMO se divide en Step 1 (teórico) y Step 2 (simulación práctica), el mismo esquema que piden las certificaciones. Escríbenos y te decimos qué constancias recibes; no damos por hecha ninguna equivalencia que ELSO no haya confirmado.',
    ctaIntermedio: 'Inscríbete al Step 1 del Diploma de París.',
    programa: 'paris',
    relacionadas: ['que-es-ecmo', 'simulacion-ecmo', 'cuidados-enfermeria-ecmo'],
    faqs: [
      { pregunta: '¿Cuánto dura la certificación de ELSO?', respuesta: 'Tres años. Para renovarla, ELSO pide horas de educación continua dentro de ese periodo; revisa la guía de recertificación vigente.' },
      { pregunta: '¿Enfermería puede certificarse?', respuesta: 'Sí. La certificación individual de ELSO está abierta a especialistas en ECMO (enfermería, terapia respiratoria y otros), médicos y perfusionistas que cumplan los requisitos.' },
      { pregunta: '¿El Diploma de París cuenta para la certificación ELSO?', respuesta: 'El diploma sigue el esquema teórico + simulación. Si cuenta como curso elegible lo confirma ELSO; escríbenos y te decimos qué constancias recibes.' },
    ],
    fuentes: [ELSO_CERT, ELSO_FAQ, AMSECT],
    imagen: { src: '/consultas/certificacion-ecmo.webp', alt: 'Generación del Diploma de París en ECMO con sus constancias en el INER', pie: 'Generación del Diploma de París · HCE, INER 2025' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
  {
    slug: 'cuidados-enfermeria-ecmo',
    codigo: 'ENF-01',
    cluster: 'Enfermería en ECMO',
    insignia: 'Para enfermería',
    tono: 'enfermeria',
    titulo: 'Cuidados de enfermería en ECMO: rol, vigilancia y checklist por turno',
    tituloCorto: 'Cuidados de enfermería en ECMO',
    descripcion: 'El papel de enfermería en el paciente con ECMO: vigilancia del circuito, anticoagulación, cánulas y emergencias, con un checklist por turno y cómo formarte.',
    extracto: 'Qué vigila enfermería en cada turno y qué competencias necesita.',
    palabraClave: 'cuidados de enfermería en ECMO',
    buscar: ['enfermería', 'enfermera ECMO', 'checklist', 'turno', 'cuidados', 'nursing'],
    lineaHce: 'Enfermería es la primera línea: detecta antes que nadie cuando algo cambia en el circuito.',
    respuestaRapida: 'La enfermera vigila al paciente y al circuito de forma continua: flujos, presiones, color de las líneas, sitio de cánulas, sangrado, anticoagulación, perfusión distal y respuesta a emergencias del circuito. Es una de las profesiones que pueden certificarse como especialista en ECMO.',
    ficha: [
      { dato: 'Rol', valor: 'Vigilancia continua del paciente y del circuito.' },
      { dato: 'Prioridades', valor: 'Cánulas, anticoagulación, sangrado, perfusión y alarmas.' },
      { dato: 'Emergencias', valor: 'Aire en el circuito, falla de bomba u oxigenador, decanulación.' },
      { dato: 'Formación', valor: 'Teoría específica para enfermería + simulación de crisis + práctica supervisada.' },
    ],
    secciones: [
      {
        id: 'checklist',
        titulo: '¿Qué se revisa en cada turno?',
        parrafos: ['Un checklist sistemático ayuda a no pasar nada por alto. Adáptalo siempre a los protocolos de tu hospital.'],
        tabla: {
          titulo: 'Checklist de turno del paciente en ECMO (orientativo)',
          encabezados: ['Área', 'Qué revisar'],
          filas: [
            ['Circuito', 'Flujo, revoluciones, presiones, color de las líneas, coágulos y aire.'],
            ['Cánulas', 'Fijación, sitio de inserción, sangrado, signos de infección.'],
            ['Anticoagulación', 'Dosis, laboratorios y tendencias; signos de sangrado o trombosis.'],
            ['Perfusión', 'Pulsos y temperatura de la extremidad canulada (VA periférica).'],
            ['Paciente', 'Signos vitales, gasometría, piel, posición y confort.'],
            ['Seguridad', 'Pinzas a la mano, consola cargada, alarmas activas y plan de emergencia.'],
          ],
        },
      },
      {
        id: 'competencias',
        titulo: '¿Qué competencias necesita enfermería en ECMO?',
        puntos: [
          'Revisión sistemática del circuito y de las cánulas.',
          'Interpretar la anticoagulación y sus señales de alarma.',
          'Responder a emergencias: falla de bomba, desplazamiento de cánula, aire en el circuito.',
          'Movilización, posición prono y traslados seguros.',
          'Comunicación clara con el equipo y con la familia.',
        ],
      },
      {
        id: 'como-formarse',
        titulo: '¿Cómo me formo en ECMO si soy enfermera?',
        parrafos: ['La combinación más efectiva es teoría específica para enfermería, simulación de emergencias del circuito y práctica supervisada. La formación estandarizada para enfermería todavía es escasa en Latinoamérica; el ECMO Nursing Care Course de HCE está diseñado por y para profesionales de enfermería en cuidados intensivos.'],
      },
    ],
    vision: 'La mayoría de la oferta en español es médica o multidisciplinaria. HCE creó el ECMO Nursing Care Course pensando en lo que enfermería vive junto a la cama del paciente, turno a turno.',
    ctaIntermedio: 'Conoce el primer curso de ECMO diseñado por y para enfermería.',
    programa: 'nursing',
    relacionadas: ['que-es-ecmo', 'simulacion-ecmo', 'certificacion-ecmo'],
    faqs: [
      { pregunta: '¿Hay cursos de ECMO solo para enfermería?', respuesta: 'Pocos. HCE ofrece el ECMO Nursing Care Course, centrado en monitoreo, protocolos, cuidados y destete del paciente en ECMO.' },
      { pregunta: '¿Enfermería puede ser especialista en ECMO?', respuesta: 'Sí. En muchos centros el especialista en ECMO es de enfermería, y tanto ELSO como AmSECT tienen certificaciones abiertas a enfermería con experiencia.' },
      { pregunta: '¿Qué debo saber antes de cuidar a mi primer paciente en ECMO?', respuesta: 'Bases de fisiología del circuito, anticoagulación, los protocolos de tu hospital y el manejo de emergencias del circuito. Practicarlas en simulación antes de vivirlas es lo más recomendable.' },
    ],
    fuentes: [ELSO_CERT, AMSECT, ELSO_GUIAS],
    imagen: { src: '/consultas/cuidados-enfermeria-ecmo.webp', alt: 'Equipo de enfermería durante una práctica de ECMO junto a la cama del paciente', pie: 'Práctica de enfermería en ECMO · HCE, INER 2025' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
  {
    slug: 'simulacion-ecmo',
    codigo: 'SIM-01',
    cluster: 'Simulación clínica',
    insignia: 'Entrenamiento',
    tono: 'simulacion',
    titulo: 'Simulación clínica en ECMO: por qué entrenar antes del primer paciente',
    tituloCorto: 'Simulación en ECMO',
    descripcion: 'Por qué la simulación es indispensable para aprender ECMO, qué escenarios practicar y cómo combinar la simulación presencial con un simulador en línea como ECMO SIM.',
    extracto: 'Qué emergencias practicar y cómo combinar simulación presencial y en línea.',
    palabraClave: 'simulación clínica ECMO',
    buscar: ['simulador ECMO', 'ECMO SIM', 'alta fidelidad', 'emergencias del circuito', 'entrenamiento'],
    lineaHce: 'Las emergencias del circuito son raras: la simulación es la única forma segura de practicarlas.',
    respuestaRapida: 'Las emergencias de ECMO son poco frecuentes pero graves; la simulación permite practicarlas sin poner en riesgo a un paciente. Por eso las certificaciones piden un curso de simulación además de la teoría. Lo ideal es combinar simulación presencial con consola real y práctica frecuente en un simulador en línea.',
    ficha: [
      { dato: 'Para qué sirve', valor: 'Practicar decisiones y emergencias sin riesgo para el paciente.' },
      { dato: 'Presencial', valor: 'Entrena las manos y el trabajo en equipo con consola real.' },
      { dato: 'En línea', valor: 'Permite repetir decisiones las veces que haga falta.' },
      { dato: 'En la certificación', valor: 'ELSO pide un curso de simulación elegible.' },
    ],
    secciones: [
      {
        id: 'escenarios',
        titulo: '¿Qué escenarios debería practicar un equipo de ECMO?',
        tabla: {
          titulo: 'Escenarios clave de simulación',
          encabezados: ['Escenario', 'Qué entrena'],
          filas: [
            ['Aire en el circuito', 'Reconocimiento rápido y pinzamiento seguro.'],
            ['Falla de bomba u oxigenador', 'Plan de respaldo y cambio de componentes.'],
            ['Decanulación accidental', 'Control de sangrado y comunicación del equipo.'],
            ['Hipoxemia en VV / síndrome arlequín en VA', 'Razonamiento clínico y ajustes del soporte.'],
            ['Traslado del paciente', 'Coordinación y seguridad fuera de la UCI.'],
          ],
        },
      },
      {
        id: 'presencial-y-en-linea',
        titulo: '¿Simulación presencial o en línea?',
        parrafos: ['Las dos se complementan. La simulación presencial entrena las manos y el trabajo en equipo; la simulación en línea permite repetir decisiones. ECMO SIM recrea una terapia intensiva en 3D con ventilador y consola ECMO cuyas constantes reaccionan a cada decisión.'],
      },
    ],
    vision: 'HCE integra la simulación en todos sus programas porque el primer contacto con una emergencia del circuito no debería ser con un paciente real.',
    ctaIntermedio: 'Practica en línea con ECMO SIM.',
    programa: 'sim',
    relacionadas: ['ecmo-vv-vs-va', 'cuidados-enfermeria-ecmo', 'certificacion-ecmo'],
    faqs: [
      { pregunta: '¿Existe un simulador de ECMO en línea?', respuesta: 'Sí. ECMO SIM es un simulador clínico virtual 100% en línea que HCE trae a Latinoamérica.' },
      { pregunta: '¿La simulación cuenta para certificarme?', respuesta: 'Las certificaciones piden un curso de simulación elegible. Revisa con ELSO qué cursos cuentan y pide al organizador las constancias con horas.' },
      { pregunta: '¿Los hospitales pueden entrenar a su equipo con simulación?', respuesta: 'Sí. HCE ofrece capacitación para equipos de hospital; escríbenos desde la página Para hospitales.' },
    ],
    fuentes: [ELSO_CURSOS, ELSO_CERT],
    imagen: { src: '/consultas/simulacion-ecmo.webp', alt: 'Práctica de simulación con el circuito de ECMO en el INER', pie: 'Simulación del Step 2 · HCE, INER 2025' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
  {
    slug: 'ic-avanzada',
    codigo: 'IC-01',
    cluster: 'Insuficiencia cardiaca',
    insignia: 'Guía clínica',
    tono: 'ic',
    titulo: 'Insuficiencia cardiaca avanzada: criterios y opciones de tratamiento',
    tituloCorto: 'Insuficiencia cardiaca avanzada',
    descripcion: 'Qué es la insuficiencia cardiaca avanzada, qué opciones de tratamiento existen (soporte circulatorio mecánico y trasplante) y qué buscar en un diplomado para el equipo clínico.',
    extracto: 'Cuándo se considera avanzada, qué opciones hay y el puente con el soporte mecánico.',
    palabraClave: 'insuficiencia cardiaca avanzada',
    buscar: ['insuficiencia cardiaca', 'choque cardiogénico', 'soporte circulatorio', 'trasplante', 'asistencia ventricular'],
    lineaHce: 'De la insuficiencia cardiaca avanzada al soporte mecánico: referir a tiempo cambia el pronóstico.',
    respuestaRapida: 'La insuficiencia cardiaca avanzada es la etapa en la que los síntomas persisten pese al tratamiento óptimo y se valoran terapias como el soporte circulatorio mecánico o el trasplante. Su manejo exige un equipo formado en toda la ruta: diagnóstico, optimización, soporte y referencia oportuna.',
    ficha: [
      { dato: 'Qué es', valor: 'Etapa con síntomas persistentes pese al tratamiento óptimo.' },
      { dato: 'Opciones', valor: 'Optimización, soporte circulatorio temporal o duradero, trasplante y cuidados paliativos.' },
      { dato: 'Puente con ECMO', valor: 'La ECMO VA es una opción de soporte temporal en choque cardiogénico.' },
    ],
    secciones: [
      {
        id: 'opciones',
        titulo: '¿Qué opciones de tratamiento existen?',
        tabla: {
          titulo: 'Ruta del paciente con insuficiencia cardiaca avanzada',
          encabezados: ['Etapa', 'Qué se busca'],
          filas: [
            ['Reconocer al paciente avanzado', 'Identificarlo a tiempo y referirlo a un centro con experiencia.'],
            ['Optimizar el tratamiento', 'Asegurar el tratamiento médico recomendado.'],
            ['Soporte temporal', 'Estabilizar en choque cardiogénico (incluida la ECMO VA).'],
            ['Terapias definitivas', 'Dispositivo de asistencia ventricular o trasplante.'],
            ['Decisiones compartidas', 'Cuidados paliativos y metas del paciente.'],
          ],
        },
      },
      {
        id: 'choque-cardiogenico',
        titulo: '¿Cuándo se pasa al soporte mecánico?',
        parrafos: ['Cuando el corazón no logra mantener una perfusión adecuada a pesar del tratamiento, el equipo valora el soporte circulatorio mecánico. La elección del dispositivo depende del paciente, de la causa y de los recursos del centro.'],
        nota: 'Contenido educativo general. Las decisiones de tratamiento siguen las guías vigentes y los protocolos de cada hospital.',
      },
    ],
    vision: 'En HCE la insuficiencia cardiaca avanzada se enseña conectada con el soporte mecánico y la ECMO, para que el equipo vea la ruta completa del paciente y no piezas sueltas.',
    ctaIntermedio: 'Aprende el soporte con ECMO VA en el Diploma de París.',
    programa: 'paris',
    relacionadas: ['ecmo-vv-vs-va', 'que-es-ecmo', 'certificacion-ecmo'],
    faqs: [
      { pregunta: '¿La ECMO se usa en insuficiencia cardiaca?', respuesta: 'La ECMO VA puede usarse como soporte temporal en choque cardiogénico refractario, mientras se recupera el corazón o se decide una terapia definitiva.' },
      { pregunta: '¿Quién decide el soporte mecánico?', respuesta: 'Un equipo con experiencia (cardiología, terapia intensiva, cirugía cardiaca) según las guías vigentes y los recursos del centro.' },
    ],
    fuentes: [ISHLT, ELSO_GUIAS],
    imagen: { src: '/consultas/ic-avanzada.webp', alt: 'Conferencia del Diploma de París en ECMO en la Ciudad de México', pie: 'Conferencia académica · HCE, CDMX 2024' },
    publicado: '2026-10-20',
    actualizado: '2026-10-20',
    revisor: null,
  },
];

export const consultaPorSlug = (slug) => CONSULTAS.find((c) => c.slug === slug) || null;

// Preguntas frecuentes (/preguntas-frecuentes). Bloque 1: sobre HCE y sus
// programas (solo datos confirmados); bloque 2: sobre ECMO.
export const FAQ_PROGRAMAS = [
  { pregunta: '¿Qué es HCE – Healthcare Training Experience?', respuesta: 'Es una organización de educación médica continua especializada en ECMO, cuidados críticos y simulación clínica para profesionales de la salud de Latinoamérica. Imparte el Paris International Diploma in ECMO, el ECMO Nursing Care Course y entrenamientos con el simulador ECMO SIM.' },
  { pregunta: '¿Cuándo inicia la próxima generación del Diploma de París?', respuesta: 'El 28 de octubre de 2026 en el INER, Ciudad de México. El Step 1 (teórico) es el 28 y 29 de octubre.' },
  { pregunta: '¿Quién puede inscribirse al Diploma de París en ECMO?', respuesta: 'Médicos especialistas, médicos residentes, enfermería y otros profesionales de la salud. Al inscribirte eliges tu perfil.' },
  { pregunta: '¿Cómo me inscribo y cómo pago?', respuesta: 'Desde la página de cada programa. El pago es en línea con tarjeta, en pesos (MXN) o en dólares (USD); al confirmarse recibes tu recibo con folio y acceso a tu portal.' },
  { pregunta: '¿Recibo un documento al terminar?', respuesta: 'Sí. En el portal recibes tu certificado en PDF con folio y código QR, que cualquier hospital puede verificar en healthcareexp.com/verificar.' },
  { pregunta: '¿Estos cursos cuentan para la certificación ELSO?', respuesta: 'El Diploma de París sigue el esquema teórico + simulación que piden las certificaciones, pero la elegibilidad la confirma ELSO. Escríbenos y te decimos qué constancias recibes.' },
  { pregunta: '¿Emiten factura?', respuesta: 'Sí, factura CFDI 4.0. Se solicita en healthcareexp.com/facturacion; el recibo de pago trae un botón con los datos ya llenos.' },
  { pregunta: '¿Los hospitales pueden contratar capacitación para su equipo?', respuesta: 'Sí. Ofrecemos programas para equipos de hospital y el simulador ECMO SIM. Escríbenos desde la página Para hospitales.' },
  { pregunta: '¿Cómo los contacto?', respuesta: 'Por WhatsApp al +52 56 5927 1906 o por correo a academia@healthcareexp.com.' },
];

export const FAQ_ECMO = [
  { pregunta: '¿Qué es ECMO?', respuesta: 'La ECMO (oxigenación por membrana extracorpórea) es un soporte vital temporal que reemplaza la función de los pulmones, del corazón o de ambos en pacientes críticos.' },
  { pregunta: '¿Cuál es la diferencia entre ECMO VV y ECMO VA?', respuesta: 'La ECMO venovenosa (VV) solo da soporte respiratorio; la venoarterial (VA) da soporte respiratorio y circulatorio. VV se usa cuando el corazón funciona y los pulmones no; VA, en choque cardiogénico o paro.' },
  { pregunta: '¿La ECMO cura la enfermedad?', respuesta: 'No. Gana tiempo para que el corazón o los pulmones se recuperen, o para llegar a otra terapia como un trasplante o un dispositivo de largo plazo.' },
  { pregunta: '¿Cuáles son las complicaciones más frecuentes?', respuesta: 'Sangrado y trombosis, infecciones, complicaciones en el sitio de canulación y fallas del circuito.' },
  { pregunta: '¿Qué hace la enfermera en un paciente en ECMO?', respuesta: 'Vigila al paciente y al circuito de forma continua: flujos, presiones, color de las líneas, sitio de cánulas, sangrado, anticoagulación, perfusión distal y respuesta a emergencias del circuito.' },
  { pregunta: '¿Cómo se obtiene una certificación en ECMO?', respuesta: 'La referencia internacional es ELSO, con certificaciones individuales para adultos (E-AEC) y neonatos/pediatría (E-NPEC) que combinan formación teórica, simulación, experiencia clínica supervisada y examen.' },
];
