// Reporte de inscritos por entrenamiento (Admin → Pagos y formularios →
// Reporte de inscritos). Sin React, para poder probarlo.
//
// Junta tres fuentes y las cruza por correo:
//   - pagos de Stripe (get-stripe-payments): programa, perfil, extras, código,
//     monto y moneda;
//   - registros del formulario después de pagar (form_submissions): nombre
//     completo, teléfono, país, institución, especialidad; también las becas y
//     transferencias, que no pasan por Stripe;
//   - solicitudes de factura (facturacion_requests).
//
// El porcentaje de descuento se calcula contra el precio regular del programa
// (el que tenía en la página sin promoción), así cuenta igual los códigos, las
// promociones directas (Mes Patrio, Buen Fin) y las becas.

import { PROGRAMA, programaDePago } from './ventas';

export const USD_RATE = 17.5;
const EXTRA_MXN = 3500;

// Precio regular del curso por programa y perfil (MXN). `usd` cuando el curso
// tiene precio propio en dólares.
const REGULAR = {
  paris: { especialista: 39000, residente: 37000, enfermero: 37000, _: 39000 },
  step1: { _: 10000 },
  step2: { _: 39000 },
  nursing: { _: 5000, usd: 250 },
  alumni: { _: 7000 },
};

const limpiar = (s) => String(s || '').trim().toLowerCase();

/** Extras comprados, a partir de la metadata o del texto del registro. */
export function extrasDe(texto) {
  const t = limpiar(texto);
  return {
    simulador: /ecmo_sim|simulador|ecmo sim/.test(t),
    nursing: /ecmo_nursing|nursing/.test(t),
  };
}

function perfilClave(perfil) {
  const t = limpiar(perfil);
  if (/residente/.test(t)) return 'residente';
  if (/enfermer|otro|fisio|kines|terapeuta/.test(t)) return 'enfermero';
  return 'especialista';
}

/**
 * Precio regular en la moneda del pago: `curso` solo el curso y `total` con
 * los extras (que no llevan descuento). null si el programa no tiene tabla.
 */
export function precioRegular(programa, perfil, extras, monedaPago) {
  const tabla = REGULAR[programa];
  if (!tabla) return null;
  const n = (extras.simulador ? 1 : 0) + (extras.nursing && programa !== 'nursing' ? 1 : 0);
  const cursoMxn = tabla[perfilClave(perfil)] || tabla._;
  if (monedaPago === 'USD') {
    const curso = tabla.usd || Math.ceil(cursoMxn / USD_RATE);
    return { curso, total: curso + n * Math.ceil(EXTRA_MXN / USD_RATE) };
  }
  return { curso: cursoMxn, total: cursoMxn + n * EXTRA_MXN };
}

/**
 * % de descuento sobre el precio del curso (entero): lo que se dejó de cobrar
 * del pedido entre el precio regular del curso. 0 si no hubo.
 */
export function porcentajeDescuento(regular, pagado) {
  if (!regular || pagado == null) return 0;
  const { curso, total } = typeof regular === 'number' ? { curso: regular, total: regular } : regular;
  if (!curso) return 0;
  const pct = Math.round(((total - pagado) / curso) * 100);
  return pct >= 2 ? Math.min(pct, 100) : 0; // menos de 2% es redondeo de la conversión
}

const codigoReal = (c) => {
  const t = String(c || '').trim();
  return t && t.toLowerCase() !== 'none' ? t.toUpperCase() : '';
};

// form_id del formulario de registro → programa (el formulario estándar lo
// comparten París, Step 1 y Step 2; se distingue por la etiqueta).
function programaDeRegistro(r) {
  const p = r.payload || {};
  if (r.formId === 'xpqenabk' || /nursing/i.test(p.tag || '')) return 'nursing';
  if (r.formId === 'xredqyol') return 'sim';
  if (/step\s*2|step2/i.test(`${p.tag || ''} ${r.formName || ''}`)) return 'step2';
  if (/step1|step\s*1/i.test(`${p.tag || ''}`)) return 'step1';
  if (r.formId === 'mnjlvbpw') return 'paris';
  if (/alumni/i.test(r.formName || '')) return 'alumni';
  return 'otro';
}

function datosRegistro(r) {
  const p = r?.payload || {};
  return {
    nombre: [p.nombres, p.apellidos].filter(Boolean).join(' ') || r?.senderName || '',
    telefono: p.telefono || '',
    pais: p.pais || '',
    institucion: p.institucion || p.hospital || '',
    especialidad: p.especialidad || p.grado || '',
  };
}

/**
 * Filas del reporte. `pagos`: lista de get-stripe-payments (solo los
 * completados); `registros`: form_submissions ya mapeados por el panel
 * ({ formId, formName, senderEmail, senderName, date, payload });
 * `facturas`: facturacion_requests.
 */
export function filasInscritos({ pagos = [], registros = [], facturas = [] }) {
  const registroPorCorreo = new Map();
  for (const r of registros) {
    const correo = limpiar(r.senderEmail || r.payload?.email);
    if (correo && !registroPorCorreo.has(correo)) registroPorCorreo.set(correo, r);
  }
  const facturaPorCorreo = new Map();
  for (const f of facturas) {
    const correo = limpiar(f.correo);
    if (correo) facturaPorCorreo.set(correo, f);
  }

  const filas = [];
  const usados = new Set();
  for (const pago of pagos) {
    if (pago.status && pago.status !== 'succeeded') continue;
    const programa = programaDePago(pago);
    if (programa === 'cnadot' || programa === 'curso') continue;
    const correo = limpiar(pago.studentEmail);
    const registro = registroPorCorreo.get(correo);
    if (registro) usados.add(registro);
    const mon = String(pago.currency || 'MXN').toUpperCase();
    const extras = extrasDe(`${pago.extras || ''} ${registro?.payload?.extras || ''}`);
    const perfil = pago.perfil || registro?.payload?.perfil || '';
    let pct = 0;
    if (programa === 'sim' && pago.usdOriginal && pago.usdFinal) {
      pct = porcentajeDescuento(pago.usdOriginal, pago.usdFinal);
    } else {
      const regular = precioRegular(programa, perfil, extras, mon);
      // En pesos se compara el monto cobrado; en dólares, el cobrado en dólares.
      pct = porcentajeDescuento(regular, Number(pago.amount) || 0);
    }
    const codigo = codigoReal(pago.promoCode);
    const factura = facturaPorCorreo.get(correo);
    const datos = datosRegistro(registro);
    filas.push({
      programa,
      entrenamiento: PROGRAMA[programa]?.nombre || pago.courseName || 'Otro',
      fecha: pago.date,
      nombre: datos.nombre || pago.studentName || '',
      correo: pago.studentEmail || '',
      telefono: datos.telefono,
      pais: datos.pais || pago.studentCountry || '',
      institucion: datos.institucion || pago.institucion || '',
      especialidad: datos.especialidad,
      perfil,
      simulador: extras.simulador,
      nursing: extras.nursing && programa !== 'nursing',
      descuento: pct > 0 || !!codigo,
      porcentaje: pct,
      codigo,
      factura: !!factura,
      facturaRfc: factura?.rfc || '',
      monto: Number(pago.amount) || 0,
      moneda: mon,
      origen: 'Stripe',
      registro: !!registro,
    });
  }

  // Becas y transferencias: se registran sin pasar por Stripe (total 0).
  for (const r of registros) {
    if (usados.has(r)) continue;
    const p = r.payload || {};
    const total = Number(p.total_mxn);
    if (!(p.promoCode || total === 0)) continue;
    const programa = programaDeRegistro(r);
    if (programa === 'otro') continue;
    const correo = limpiar(r.senderEmail || p.email);
    const factura = facturaPorCorreo.get(correo);
    const extras = extrasDe(p.extras);
    const datos = datosRegistro(r);
    filas.push({
      programa,
      entrenamiento: PROGRAMA[programa]?.nombre || 'Otro',
      fecha: r.date,
      nombre: datos.nombre,
      correo: r.senderEmail || p.email || '',
      telefono: datos.telefono,
      pais: datos.pais,
      institucion: datos.institucion,
      especialidad: datos.especialidad,
      perfil: p.perfil || '',
      simulador: extras.simulador,
      nursing: extras.nursing && programa !== 'nursing',
      descuento: true,
      porcentaje: 100,
      codigo: codigoReal(p.promoCode) || 'BECA / TRANSFERENCIA',
      factura: !!factura,
      facturaRfc: factura?.rfc || '',
      monto: 0,
      moneda: 'MXN',
      origen: 'Beca o transferencia',
      registro: true,
    });
  }

  return filas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/** Resumen por entrenamiento: inscritos, con extras, con descuento, con factura e ingresos. */
export function resumenPorEntrenamiento(filas) {
  const por = new Map();
  for (const f of filas) {
    const r = por.get(f.programa) || { programa: f.programa, entrenamiento: f.entrenamiento, inscritos: 0, simulador: 0, nursing: 0, descuento: 0, factura: 0, MXN: 0, USD: 0 };
    r.inscritos += 1;
    if (f.simulador) r.simulador += 1;
    if (f.nursing) r.nursing += 1;
    if (f.descuento) r.descuento += 1;
    if (f.factura) r.factura += 1;
    r[f.moneda] = (r[f.moneda] || 0) + f.monto;
    por.set(f.programa, r);
  }
  return [...por.values()].sort((a, b) => b.inscritos - a.inscritos);
}
