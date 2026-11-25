// Estado de un pago al volver de Stripe: si quedó pendiente (OXXO o SPEI), la
// página se lo dice al alumno y le deja volver a ver su ficha o sus datos de
// transferencia. Solo responde lo necesario para eso.

import { estadoPago } from './_pagos.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { sid } = JSON.parse(event.body || '{}');
    const estado = await estadoPago(sid);
    if (!estado) return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado' }) };
    const { pagado, pendiente, metodo, instrucciones } = estado;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ pagado, pendiente, metodo, instrucciones: pendiente ? instrucciones : null }),
    };
  } catch (err) {
    console.error('pago-estado:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo consultar el pago' }) };
  }
};
