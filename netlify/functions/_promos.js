// Catalogo unico de codigos promocionales del lado del servidor.
//
// Antes, cada funcion de checkout repetia la lista de codigos en DOS cadenas de
// if/else dentro del mismo archivo (una para el importe de Stripe y otra para la
// metadata), y el frontend tenia su propia tercera lista. Cuando se agregaba un
// codigo al formulario sin agregarlo aqui, la pantalla mostraba el descuento y
// Stripe cobraba el precio completo: exactamente lo que paso con INER30,
// VIVAMEX, VIVAMEXTEAM y VIVAMEXTEORICO.
//
// El importe que se cobra sale SIEMPRE de esta tabla. El frontend puede mostrar
// lo que sea; aqui se decide el dinero.

// Promociones con fechas (ninguna activa por ahora). Formato:
//   nombre: ['2026-05-06T00:00:00-06:00', '2026-05-10T23:59:59-06:00'],
const VIGENCIAS = {
  // Step 1 a $7,000 (30% directo): del 6 al 15 de octubre de 2026.
  step1oct: ['2026-10-06T00:00:00-06:00', '2026-10-15T23:59:59-06:00'],
};

// `programas` limita en que paginas aplica cada codigo.
// `porcentaje` es el descuento (0.3 = 30%); `precioFijo` lo sustituye por completo.
// Octubre 2026: Paris y Step 1 no aceptan ningún código (ni descuentos, ni
// meses sin intereses, ni becas). Los vencidos (PERFUWEEK, VIVAMEXTEAM) se
// quitaron. Quedan solo los de ECMO Nursing.
// Octubre 2026: todos los descuentos con código están desactivados (Paris,
// Step 1 y Nursing). Para reactivar uno, agregarlo aquí y en su formulario.
const CODIGOS = {};

// Descuentos que se aplican sin que el alumno escriba nada. Cada uno con su
// vigencia: fuera de fechas no existe, y el precio vuelve solo al regular sin
// tener que desplegar nada.
const AUTOMATICAS = [
  // Step 1 directo en $7,000 (10,000 − 30%) hasta el 15 de octubre. Debe
  // coincidir con src/lib/promoMesPatrio.js, que solo lo pinta.
  { programas: ['step1'], porcentaje: 0.30, vigencia: 'step1oct', etiqueta: 'STEP1OCT30' },
];

function enVigencia(nombre, ahora) {
  const [desde, hasta] = VIGENCIAS[nombre];
  return ahora >= new Date(desde) && ahora <= new Date(hasta);
}

/** La promoción automática vigente para el programa, si hay. */
export function promoAutomatica(programa, ahora = new Date()) {
  return AUTOMATICAS.find(
    (a) => a.programas.includes(programa) && enVigencia(a.vigencia, ahora)
  ) || null;
}

function promoValida(promoCode, programa, ahora) {
  if (!promoCode) return null;

  const promo = CODIGOS[String(promoCode).trim().toUpperCase()];
  if (!promo) return null;
  if (!promo.programas.includes(programa)) return null;

  if (promo.vigencia && !enVigencia(promo.vigencia, ahora)) return null;

  return promo;
}

function precioConCodigo(precioMXN, promoCode, programa, ahora) {
  const promo = promoValida(promoCode, programa, ahora);
  if (!promo) return precioMXN;

  // Un precio fijo nunca puede subir el precio: HCEPRACTICA26 fija 18,500,
  // que en Paris es un descuento y en Step 1 (10,000) seria un aumento.
  if (promo.precioFijo !== undefined) return Math.min(promo.precioFijo, precioMXN);
  if (promo.porcentaje) return Math.floor(precioMXN * (1 - promo.porcentaje));

  return precioMXN;
}

/**
 * Precio final en pesos. Se calculan por separado el precio con el codigo que
 * escribio el alumno y el precio con la promocion automatica vigente, y gana
 * el mas bajo. No se acumulan: durante el Mes Patrio un codigo del 15% no
 * hace nada porque el 30% directo ya es mejor, y el de equipos (30% en Paris)
 * sigue ganando al 20% directo.
 */
export function precioConPromo(precioMXN, promoCode, programa, ahora = new Date()) {
  const conCodigo = precioConCodigo(precioMXN, promoCode, programa, ahora);
  const auto = promoAutomatica(programa, ahora);
  const conAuto = auto ? Math.floor(precioMXN * (1 - auto.porcentaje)) : precioMXN;
  return Math.min(conCodigo, conAuto);
}

/** Si el codigo habilita meses sin intereses en la pasarela. */
export function habilitaMeses(promoCode, programa, ahora = new Date()) {
  return Boolean(promoValida(promoCode, programa, ahora)?.meses);
}
