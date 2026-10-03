// Lógica compartida de inscripciones a cursos del portal.
//
// La usan dos caminos que tienen que terminar exactamente igual: la función
// que confirma el pago cuando el alumno regresa de Stripe, y el webhook que
// Stripe manda por su cuenta aunque el alumno haya cerrado la pestaña. Con
// cualquiera de los dos basta; si llegan los dos, el segundo no duplica nada.

import { notificar } from './_notificaciones.js';
import { cuentaHabilitada, accesoVigente } from './_supabase.js';

/**
 * La frase del correo de "inscrito" según si el curso ya se le abrió:
 * cuenta en revisión, curso por generación que abre con su grupo, o abierto.
 * Si no se puede saber, una frase neutra: el correo no debe prometer de más.
 */
export async function textoAcceso(userId, courseId) {
  try {
    const { habilitada } = await cuentaHabilitada(userId, { exigirAprobacion: true });
    if (!habilitada) {
      return 'Tu lugar quedó apartado. En cuanto activemos tu cuenta y te asignemos tu grupo, tu curso se abrirá y te avisaremos por correo.';
    }
    const acceso = await accesoVigente(userId, courseId);
    if (acceso.porGrupo) {
      return 'Tu lugar quedó apartado. Te asignaremos a tu grupo y el curso se abrirá en su fecha de inicio; te avisaremos por correo.';
    }
    return 'Ya puedes empezar cuando quieras.';
  } catch (err) {
    console.error('No se pudo revisar el acceso para el aviso:', err.message);
    return 'Encontrarás el curso en tu portal.';
  }
}

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

export async function inscribir(db, { userId, courseId, origen, stripeSessionId = null, monto = null, moneda = null, avisar = true }) {
  const { data: previa } = await db
    .from('inscripciones')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

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

  // Aviso "inscrito a un curso", solo la primera vez. Al activar una cuenta
  // no se manda: el correo de cuenta activada ya lista sus cursos.
  if (!previa && avisar) {
    const acceso = await textoAcceso(userId, courseId);
    await notificar(db, 'inscrito_curso', {
      userId, courseId, clave: `inscripcion:${courseId}`, variables: { acceso },
    });
  }
  return { nueva: !previa };
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
