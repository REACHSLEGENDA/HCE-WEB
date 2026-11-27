// Datos del ECMO Nursing Care Course en un solo lugar: los usan la página de
// inscripción, las preguntas frecuentes, el SEO (src/data/seo.js) y llms.txt.
// El cobro lo decide el servidor (netlify/functions/create-nursing-checkout.js),
// que tiene su propio interruptor BUEN_FIN: si cambias el precio aquí, cámbialo
// también allá y en public/llms.txt (texto fijo).

export const NURSING = {
  edicion: '3.ª edición',
  inicio: '2027-02-22',
  inicioTexto: '22 de febrero de 2027',
  // Precio Buen Fin (13 nov 2026, sin fecha de fin).
  buenFin: true,
  regular: { mxn: 5000, usd: 250 },
  promo: { mxn: 4000, usd: 200 },
  simMxn: 3500,
  inscripcion: '/inscripciones-ecmo-nursing',
};

export const precioNursing = () => (NURSING.buenFin ? NURSING.promo : NURSING.regular);

const dinero = (n) => n.toLocaleString('es-MX');
const textoPrecio = () => {
  const p = precioNursing();
  return NURSING.buenFin
    ? `Con el precio Buen Fin cuesta $${dinero(p.mxn)} MXN o USD ${p.usd} (precio regular: $${dinero(NURSING.regular.mxn)} MXN o USD ${NURSING.regular.usd}).`
    : `Cuesta $${dinero(p.mxn)} MXN o USD ${p.usd}.`;
};

// Preguntas frecuentes en texto plano (las que agrega la página y las que lee
// Google en el JSON-LD FAQPage). Solo datos confirmados en el sitio.
export const FAQ_NURSING_TEXTO = [
  {
    pregunta: '¿Cuándo inicia la 3.ª edición del ECMO Nursing Care Course?',
    respuesta: `La fase virtual inicia el ${NURSING.inicioTexto} y dura 2 meses, con clases sincrónicas (en vivo) y asincrónicas (a tu ritmo). La fase práctica presencial de simulación se anuncia por separado.`,
  },
  {
    pregunta: '¿Cuánto cuesta el ECMO Nursing Care Course?',
    respuesta: `${textoPrecio()} Puedes agregar el simulador ECMO SIM por 4 meses por $${dinero(NURSING.simMxn)} MXN.`,
  },
  {
    pregunta: '¿Puedo pagar en dólares desde otro país?',
    respuesta: 'Sí. Al inscribirte eliges pesos (MXN) o dólares (USD) y pagas en línea con tarjeta de crédito o débito. En pesos también puedes pagar en efectivo en OXXO. Si prefieres transferencia, escríbenos por WhatsApp.',
  },
  {
    pregunta: '¿Las clases quedan grabadas?',
    respuesta: 'Sí. En la fase virtual tienes acceso 24/7 a las clases grabadas, a la literatura científica y a las guías de ELSO en la plataforma de HCE, además de las sesiones en vivo con los profesores.',
  },
  {
    pregunta: '¿Quiénes son los profesores?',
    respuesta: 'Un claustro de 19 expertos en ECMO de Latinoamérica y España: enfermeras y enfermeros especialistas en cuidados intensivos y perfusionistas clínicos que trabajan con pacientes en ECMO.',
  },
  {
    pregunta: '¿Necesito haber trabajado con ECMO antes?',
    respuesta: 'No es indispensable. Se pide título o cédula de enfermería (o equivalente) y experiencia en áreas críticas, intermedias, urgencias o quirófano. El curso parte de las bases del circuito hasta el manejo de emergencias.',
  },
  {
    pregunta: '¿Qué documento recibo al terminar?',
    respuesta: 'Al aprobar todas las evaluaciones recibes la certificación de Healthcare Training Experience con aval de la FLECI (Federación Latinoamericana de Enfermería de Cuidados Intensivos), con folio verificable en healthcareexp.com/verificar.',
  },
  {
    pregunta: '¿Emiten factura?',
    respuesta: 'Sí, factura CFDI 4.0. Se solicita en healthcareexp.com/facturacion; tu recibo de pago trae un botón con los datos ya llenos.',
  },
];
