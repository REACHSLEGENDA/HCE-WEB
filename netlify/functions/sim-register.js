import { LISTS, isConfigured, buildAttributes, upsertContact, addToList, removeFromList } from './_brevo.js';

// Nombre legible del plan para el atributo PLAN_SIM. A diferencia de la versión
// de Mailchimp, no se guarda el precio: queda congelado en la ficha del contacto
// y envejece mal cada vez que cambian las tarifas.
const PLANES = {
  '4m':  'Plan 4 Meses',
  '12m': 'Plan 12 Meses',
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    const { email, planId } = payload;

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    if (!isConfigured()) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // El formulario del simulador manda `profesion` en vez de `grado`;
    // buildAttributes acepta ambos y descarta los campos que no vengan.
    const atributos = buildAttributes(payload);
    const planSim = PLANES[planId] || planId;
    if (planSim) atributos.PLAN_SIM = planSim;

    await upsertContact(email, atributos);
    await removeFromList(email, LISTS.CARRITO_SIM);
    await addToList(email, LISTS.COMPRADORES_SIM);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Sim register error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
