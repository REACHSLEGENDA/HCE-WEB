/* ---------------------------------------------------------------------------
 * Promoción del Mes Patrio: descuento directo, sin código.
 *
 * Pedir el código por WhatsApp no estaba funcionando, así que el descuento se
 * aplica solo y las páginas de inscripción lo muestran tachando el precio
 * regular.
 *
 * Las fechas y porcentajes tienen que coincidir con AUTOMATICAS en
 * netlify/functions/_promos.js, que es donde se decide lo que se cobra. Esto
 * solo lo pinta: si los dos archivos no dicen lo mismo, la pantalla promete
 * una cosa y Stripe cobra otra.
 *
 * Al pasar la fecha, todo vuelve solo al precio regular sin desplegar nada.
 * ------------------------------------------------------------------------ */

export const PROMO_MES_PATRIO = {
  desde: new Date('2026-09-01T00:00:00-06:00'),
  hasta: new Date('2026-09-16T23:59:59-06:00'),
  vigenciaTexto: '16 de septiembre',
  porcentaje: {
    step1: 0.30,
    paris: 0.20,
  },
};

export const promoMesPatrioActiva = (ahora = new Date()) =>
  ahora >= PROMO_MES_PATRIO.desde && ahora <= PROMO_MES_PATRIO.hasta;
