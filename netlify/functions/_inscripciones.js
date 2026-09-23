// Lógica compartida de inscripciones a cursos del portal.
//
// La usan dos caminos que tienen que terminar exactamente igual: la función
// que confirma el pago cuando el alumno regresa de Stripe, y el webhook que
// Stripe manda por su cuenta aunque el alumno haya cerrado la pestaña. Con
// cualquiera de los dos basta; si llegan los dos, el segundo no duplica nada.

// Debe coincidir con el tipo de cambio que anuncian las páginas de inscripción.
export const USD_RATE = 17.5;

// Marca que distingue un cobro de curso del portal de los demás cobros que
// pasan por la misma cuenta de Stripe (París, Nursing, simulador).
export const TIPO_COBRO = 'curso_portal';

export function importeEnMoneda(precioMXN, moneda) {
  // En dólares se cobra el dólar entero hacia arriba, igual que en los
  // formularios de inscripción, para que lo que se ve sea lo que se paga.
  return moneda === 'usd' ? Math.ceil(precioMXN / USD_RATE) : precioMXN;
}

export async function inscribir(db, { userId, courseId, origen, stripeSessionId = null, monto = null, moneda = null }) {
  const { error } = await db.from('inscripciones').upsert(
    [{
      user_id: userId,
      course_id: courseId,
      origen,
      stripe_session_id: stripeSessionId,
      monto,
      moneda,
    }],
    // Si ya estaba inscrito se deja la fila original: conserva de dónde vino.
    { onConflict: 'user_id,course_id', ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);
}

// Un cobro solo inscribe si de verdad está pagado y es de este curso. Sirve
// igual para la sesión que llega en el webhook que para la que se consulta a
// Stripe al volver del pago.
export function sesionPagaCurso(session) {
  return (
    session?.metadata?.tipo === TIPO_COBRO &&
    session.payment_status === 'paid' &&
    session.metadata.user_id &&
    session.metadata.course_id
  );
}

export async function inscribirDesdeSesion(db, session) {
  if (!sesionPagaCurso(session)) return false;

  await inscribir(db, {
    userId: session.metadata.user_id,
    courseId: Number(session.metadata.course_id),
    origen: 'pago',
    stripeSessionId: session.id,
    monto: session.amount_total != null ? session.amount_total / 100 : null,
    moneda: session.currency || null,
  });

  return true;
}
