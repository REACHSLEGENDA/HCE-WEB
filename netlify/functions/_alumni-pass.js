// Confirmación compartida por el regreso de Checkout y el webhook firmado.
import { LISTS, isConfigured, upsertContact, addToList, enviarCorreo } from './_brevo.js';
import { plantillaHce } from './_notificaciones.js';

export const TIPO_ALUMNI = 'alumni_pass';
export const PRECIOS_ALUMNI = { presencial: 7000, virtual: 4000 };
export const GRABACIONES_ALUMNI = 1299;
export const importeAlumni = (mxn, moneda) => moneda === 'usd' ? Math.ceil(mxn / 17.5) : mxn;
export const totalAlumni = (modalidad, grabaciones, moneda) =>
  importeAlumni(PRECIOS_ALUMNI[modalidad], moneda) + (grabaciones ? importeAlumni(GRABACIONES_ALUMNI, moneda) : 0);

const escapar = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function confirmarAlumniDesdeSesion(db, sesion, { exigirCorreo = false } = {}) {
  if (sesion?.metadata?.tipo !== TIPO_ALUMNI || sesion.payment_status !== 'paid') return null;
  const id = Number(sesion.metadata.registro_id);
  const modalidad = sesion.metadata.modalidad;
  const grabaciones = sesion.metadata.grabaciones === 'si';
  const moneda = sesion.currency;
  if (!Number.isSafeInteger(id) || id <= 0 || !Object.hasOwn(PRECIOS_ALUMNI, modalidad)
    || !['mxn', 'usd'].includes(moneda)
    || sesion.amount_total !== totalAlumni(modalidad, grabaciones, moneda) * 100) {
    throw new Error('El importe o los datos del pago no corresponden al Alumni Pass. Contacta al equipo.');
  }
  const { data: registro, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!registro) throw new Error('No encontramos la solicitud de este pago.');
  if (registro.stripe_session_id !== sesion.id
    && (!registro.checkout_intento || registro.checkout_intento !== sesion.metadata.intento)) {
    throw new Error('El pago no corresponde al enlace de esta solicitud.');
  }
  if (registro.pagado && registro.stripe_session_id !== sesion.id) throw new Error('La solicitud ya tiene otro pago registrado. Contacta al equipo.');
  let actual = registro;
  if (!registro.pagado) {
    let escritura = db.from('alumni_pass_registros').update({
      pagado: true, pagado_en: new Date().toISOString(), folio: `AP26-${String(id).padStart(4, '0')}`,
      stripe_session_id: sesion.id, modalidad, grabaciones, moneda, importe: sesion.amount_total / 100,
    }).eq('id', id).eq('pagado', false);
    escritura = registro.checkout_intento ? escritura.eq('checkout_intento', registro.checkout_intento) : escritura.eq('stripe_session_id', sesion.id);
    const { data, error: fallo } = await escritura.select('*').maybeSingle();
    if (fallo) throw new Error(fallo.message);
    if (data) actual = data;
    else {
      const otra = await db.from('alumni_pass_registros').select('*').eq('id', id).single();
      if (otra.error || !otra.data?.pagado || otra.data.stripe_session_id !== sesion.id) throw new Error('No se pudo confirmar el registro del pago. Vuelve a intentar.');
      actual = otra.data;
    }
  }

  // Si falla Brevo, el pago se conserva. Stripe reintenta; el panel también
  // permite reintentar sin volver a cobrar ni generar otro folio.
  let avisoCorreo = '';
  try {
    if (!isConfigured()) throw new Error('El envío de correos no está configurado.');
    if (!actual.brevo_sincronizado_en) {
      const [nombre, ...apellidos] = actual.nombre.trim().split(/\s+/);
      await upsertContact(actual.email, {
        FIRSTNAME: nombre, ...(apellidos.length ? { LASTNAME: apellidos.join(' ') } : {}),
        ALUMNI_MODALIDAD: modalidad === 'presencial' ? 'Presencial' : 'Virtual (streaming en vivo)',
        ALUMNI_GRABACIONES: grabaciones ? 'Incluidas por 1 mes' : 'No incluidas', ALUMNI_FOLIO: actual.folio,
      });
      await addToList(actual.email, LISTS.ALUMNI_PASS);
      const fecha = new Date().toISOString();
      const guardado = await db.from('alumni_pass_registros').update({ brevo_sincronizado_en: fecha }).eq('id', id);
      if (guardado.error) throw new Error(guardado.error.message);
      actual = { ...actual, brevo_sincronizado_en: fecha };
    }
    if (!actual.aviso_pago_en) {
      const { data: admins, error: falloAdmins } = await db.from('profiles').select('email').eq('rol', 'admin').eq('activo', true);
      if (falloAdmins) throw new Error(falloAdmins.message);
      const adicionales = String(process.env.AVISO_REGISTROS_PARA || '').split(',').map(v => v.trim()).filter(Boolean);
      const para = [...new Set([...(admins || []).map(r => r.email).filter(Boolean), ...adicionales])];
      if (para.length) await enviarCorreo({ para, asunto: `Alumni Pass pagado: ${actual.nombre} (${actual.folio})`,
        claveIdempotencia: `alumni-pago-${sesion.id}`,
        html: plantillaHce(`<p>Se confirmó el pago de <strong>${escapar(actual.nombre)}</strong>.</p><p>Folio: ${escapar(actual.folio)}<br>Modalidad: ${escapar(modalidad)}<br>Importe: ${actual.importe} ${moneda.toUpperCase()}</p>`, { boton: 'Ver en el panel', enlace: 'https://healthcareexp.com/admin' }),
      });
      const fecha = new Date().toISOString();
      const guardado = await db.from('alumni_pass_registros').update({ aviso_pago_en: fecha }).eq('id', id);
      if (guardado.error) throw new Error(guardado.error.message);
      actual = { ...actual, aviso_pago_en: fecha };
    }
  } catch (err) {
    console.error('Alumni Pass: pago confirmado, aviso pendiente:', err.message);
    avisoCorreo = actual.brevo_sincronizado_en ? 'El aviso al equipo está pendiente.' : 'Tu pago está confirmado. El envío del pase por correo está pendiente; conserva tu folio.';
    if (exigirCorreo) throw err;
  }
  return { registro: actual, correoEnviado: !!actual.brevo_sincronizado_en, avisoCorreo };
}
