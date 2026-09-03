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

const VIGENCIAS = {
  // Del 6 al 10 de mayo de 2026, hora del centro de Mexico.
  perfuweek: ['2026-05-06T00:00:00-06:00', '2026-05-10T23:59:59-06:00'],
  // Fiestas patrias: del 1 al 16 de septiembre de 2026.
  vivamex:   ['2026-09-01T00:00:00-06:00', '2026-09-16T23:59:59-06:00'],
};

// `programas` limita en que paginas aplica cada codigo.
// `porcentaje` es el descuento (0.3 = 30%); `precioFijo` lo sustituye por completo.
const CODIGOS = {
  HCEPRACTICA26:       { precioFijo: 18500, programas: ['paris', 'step1'] },
  'HCE-INERPARIS2026': { porcentaje: 0.30,  programas: ['paris', 'step1'] },
  // Alias corto del anterior: es el que reparte el INER.
  INER30:              { porcentaje: 0.30,  programas: ['paris', 'step1'] },
  HCE10MSI:            { porcentaje: 0.10,  programas: ['paris', 'step1', 'nursing'], meses: true },
  HCEGRUPOS:           { porcentaje: 0.15,  programas: ['paris', 'step1', 'nursing'], meses: true },
  HCEGRUPOS15:         { porcentaje: 0.15,  programas: ['paris', 'step1', 'nursing'], meses: true },
  PERFUWEEK:           { porcentaje: 0.15,  programas: ['paris', 'step1'], vigencia: 'perfuweek' },
  STEP1EARLY:          { porcentaje: 0.50,  programas: ['step1'] },
  VIVAMEX:             { porcentaje: 0.20,  programas: ['paris'],  vigencia: 'vivamex' },
  VIVAMEXTEAM:         { porcentaje: 0.30,  programas: ['paris'],  vigencia: 'vivamex' },
  VIVAMEXTEORICO:      { porcentaje: 0.30,  programas: ['step1'],  vigencia: 'vivamex' },
  // Sin descuento: solo habilitan meses sin intereses.
  HCEMS:               { porcentaje: 0,     programas: ['paris', 'step1'], meses: true },
  HCEMESES:            { porcentaje: 0,     programas: ['paris', 'step1'], meses: true },
};

function promoValida(promoCode, programa, ahora) {
  if (!promoCode) return null;

  const promo = CODIGOS[String(promoCode).trim().toUpperCase()];
  if (!promo) return null;
  if (!promo.programas.includes(programa)) return null;

  if (promo.vigencia) {
    const [desde, hasta] = VIGENCIAS[promo.vigencia];
    if (ahora < new Date(desde) || ahora > new Date(hasta)) return null;
  }

  return promo;
}

/**
 * Precio final en pesos tras aplicar el codigo. Si el codigo no existe, no
 * aplica al programa o esta fuera de vigencia, devuelve el precio original.
 */
export function precioConPromo(precioMXN, promoCode, programa, ahora = new Date()) {
  const promo = promoValida(promoCode, programa, ahora);
  if (!promo) return precioMXN;

  if (promo.precioFijo !== undefined) return promo.precioFijo;
  if (promo.porcentaje) return Math.floor(precioMXN * (1 - promo.porcentaje));

  return precioMXN;
}

/** Si el codigo habilita meses sin intereses en la pasarela. */
export function habilitaMeses(promoCode, programa, ahora = new Date()) {
  return Boolean(promoValida(promoCode, programa, ahora)?.meses);
}
