import Stripe from 'stripe';

// HCE opera dos cuentas de Stripe. La principal cobra en pesos; la segunda
// recibe dos cosas distintas: los cobros en dólares que enruta _stripe.js y los
// de CNADOT (curso de donación de órganos).
//
// Los de CNADOT no nacen de este código sino de payment links creados en el
// panel de Stripe, así que llegan sin metadata propia y su concepto viaja en la
// descripción del cargo. Los nuestros sí traen `metadata.curso`, y por eso esa
// metadata es lo que distingue unos de otros dentro de la misma cuenta: la
// cuenta de origen por sí sola ya no basta.
const GATEWAYS = [
  { id: 'principal', label: 'HCE',    envVar: 'STRIPE_SECRET_KEY' },
  { id: 'cnadot',    label: 'CNADOT', envVar: 'STRIPE_SECRET_KEY_2' },
];

const DESDE = Math.floor(new Date('2026-05-01T00:00:00Z').getTime() / 1000);

// Stripe devuelve como máximo 100 registros por página y el límite cuenta TODOS
// los intentos, incluidos los fallidos y abandonados. Sin paginar, los cobros
// exitosos se perdían en silencio en cuanto el histórico crecía.
async function listarTodos(stripe) {
  const todos = [];
  let startingAfter;

  for (let pagina = 0; pagina < 25; pagina++) { // tope de seguridad: 2,500 intentos
    const res = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: DESDE },
      expand: ['data.latest_charge'],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    todos.push(...res.data);
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }

  return todos;
}

// Los conceptos de CNADOT llevan anexo "A nombre de: X | Inst: Y" para que
// administración identifique al asistente, que no siempre es quien paga.
function separarAnexo(descripcion = '') {
  const match = /A nombre de:\s*([^|]+?)\s*\|\s*Inst:\s*(.+)/i.exec(descripcion);
  const concepto = descripcion.split(/A nombre de:/i)[0].trim().replace(/[|\-\u2013\s]+$/, '');
  return {
    concepto,
    asistente:  match ? match[1].trim() : '',
    institucion: match ? match[2].trim() : '',
  };
}

// Un cobro de la segunda cuenta es de CNADOT solo si NO lo generamos nosotros.
// Las funciones de checkout siempre escriben `curso` en la metadata; los payment
// links del panel, nunca.
const esCnadot = (pi, gateway) => gateway.id === 'cnadot' && !pi.metadata?.curso;

function nombreDelCurso(pi, charge, cnadot) {
  const explicito = pi.metadata?.curso;
  if (explicito) return explicito;

  const descripcion = charge?.description || pi.description || '';

  if (cnadot) {
    const { concepto } = separarAnexo(descripcion);
    return concepto || 'Inscripción CNADOT';
  }

  // Cobros antiguos de la pasarela principal: antes de que existiera `curso`
  // el programa solo se podía deducir del tag de Mailchimp que se guardaba
  // en la metadata. Se conserva por los registros históricos de Stripe.
  const tag = pi.metadata?.mailchimp_tag;
  if (tag === 'CANCELPARIS')   return 'Diploma Internacional París en ECMO';
  if (tag === 'CANCELNURSING') return 'ECMO Nursing Care Course';
  if (tag === 'CANCELSIM' || pi.metadata?.plan) {
    const plan = pi.metadata?.plan;
    if (plan === '12m') return 'ECMO SIM — Plan 12 Meses';
    if (plan === '4m')  return 'ECMO SIM — Plan 4 Meses';
    return 'ECMO SIM: Realidad Clínica';
  }

  return descripcion || 'Inscripción HCE';
}

function mapearPago(pi, gateway) {
  const charge = pi.latest_charge;
  const descripcion = charge?.description || pi.description || '';
  const cnadot = esCnadot(pi, gateway);
  const anexo = cnadot ? separarAnexo(descripcion) : {};

  const email =
    pi.receipt_email ||
    charge?.billing_details?.email ||
    charge?.receipt_email ||
    pi.metadata?.email ||
    '';

  // En CNADOT el titular de la tarjeta suele ser distinto del asistente.
  const nombre =
    anexo.asistente ||
    charge?.billing_details?.name ||
    pi.metadata?.customer_name ||
    '';

  const cardBrand = charge?.payment_method_details?.card?.brand || 'card';
  const last4     = charge?.payment_method_details?.card?.last4 || '';

  return {
    id: pi.id,
    gateway:        gateway.id,
    gatewayLabel:   cnadot ? gateway.label : 'HCE',
    studentName:    nombre || 'Invitado HCE',
    studentEmail:   email  || 'sin-email@stripe.com',
    studentCountry: charge?.billing_details?.address?.country || 'MX',
    institucion:    anexo.institucion || pi.metadata?.institucion || '',
    courseName:     nombreDelCurso(pi, charge, cnadot),
    courseId:       pi.metadata?.course_id || (cnadot ? 'cnadot' : 'general'),
    extras:         pi.metadata?.extras || '',
    amount:         pi.amount / 100,
    currency:       pi.currency.toUpperCase(),
    status:         pi.status,
    date:           new Date(pi.created * 1000).toISOString(),
    method:         last4 ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} **** ${last4}` : cardBrand,
    promoCode:      pi.metadata?.promo_code || pi.metadata?.promo_applied || pi.metadata?.coupon || pi.metadata?.code || '',
  };
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async () => {
  const activas = GATEWAYS.filter((g) => process.env[g.envVar]);

  if (activas.length === 0) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No hay ninguna clave de Stripe configurada en Netlify.' }),
    };
  }

  // Una pasarela caída no debe dejar el panel en blanco: se reporta aparte y
  // se devuelven los cobros de la que sí respondió.
  const resultados = await Promise.allSettled(
    activas.map(async (gateway) => {
      const stripe = new Stripe(process.env[gateway.envVar]);
      const intents = await listarTodos(stripe);
      return intents
        .filter((pi) => pi.status === 'succeeded')
        .map((pi) => mapearPago(pi, gateway));
    })
  );

  const payments = [];
  const errores  = [];

  resultados.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      payments.push(...res.value);
    } else {
      console.error(`Stripe (${activas[i].id}) falló:`, res.reason?.message);
      errores.push({ gateway: activas[i].id, error: res.reason?.message || 'Error desconocido' });
    }
  });

  if (payments.length === 0 && errores.length > 0) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: errores[0].error, errores }) };
  }

  payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      payments,
      gateways: activas.map((g) => g.id),
      errores: errores.length ? errores : undefined,
    }),
  };
};
