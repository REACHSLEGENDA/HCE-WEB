// Revisión de los códigos de descuento antes de cada build.
//
// El dinero lo decide netlify/functions/_promos.js; los formularios de
// inscripción solo muestran el descuento. Ya van tres veces que alguien agrega
// un código al formulario y olvida el catálogo del servidor: la pantalla
// enseña el descuento y Stripe cobra el precio completo (INER30, VIVAMEX,
// TEAMPROMO…). Este script detiene el despliegue si vuelve a pasar.
//
// Corre solo con `npm run build` (ver "prebuild" en package.json). Si falla,
// Netlify no publica y el sitio sigue con la versión anterior, que cobra bien.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORMULARIOS = {
  paris: 'src/pages/Inscripciones.jsx',
  step1: 'src/pages/InscripcionesStep1.jsx',
  nursing: 'src/pages/InscripcionesNursing.jsx',
};

// Códigos que viven solo en el formulario A PROPÓSITO. Agregar uno aquí es una
// decisión consciente: tiene que ir con el motivo.
const SOLO_EN_FORMULARIO = {
  // No dan descuento propio: el de Mes Patrio ya se aplica solo.
  VIVAMEX: 'no aplica descuento, el automático de Mes Patrio ya entra',
  VIVAMEXTEORICO: 'no aplica descuento, el automático de Mes Patrio ya entra',
  // Becas y transferencias: nunca pasan por Stripe.
  BECAPARIS26: 'beca, se registra sin pasarela',
  BECANURSING26: 'beca, se registra sin pasarela',
  BECAINER26: 'beca, se registra sin pasarela',
  TRANSFER2026: 'transferencia, se registra sin pasarela',
};

const catalogo = fs.readFileSync(path.join(raiz, 'netlify/functions/_promos.js'), 'utf8');
const bloque = catalogo.slice(catalogo.indexOf('const CODIGOS'), catalogo.indexOf('};', catalogo.indexOf('const CODIGOS')));

// programa -> set de códigos que el servidor acepta para ese programa
const enServidor = {};
for (const m of bloque.matchAll(/^\s+'?([A-Z0-9-]+)'?:\s*\{([^}]*)\}/gm)) {
  const [, codigo, cuerpo] = m;
  const programas = [...(cuerpo.match(/programas:\s*\[([^\]]*)\]/)?.[1] || '').matchAll(/'([a-z0-9]+)'/g)].map((x) => x[1]);
  for (const prog of programas) (enServidor[prog] ||= new Set()).add(codigo);
}

const problemas = [];
for (const [programa, archivo] of Object.entries(FORMULARIOS)) {
  const fuente = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  const inicio = fuente.indexOf('const applyPromo');
  if (inicio === -1) {
    problemas.push(`${archivo}: no encontré la función applyPromo (¿cambió de nombre?)`);
    continue;
  }
  // La función termina donde empieza la siguiente declaración de nivel superior.
  const resto = fuente.slice(inicio);
  const fin = resto.search(/\n {2}const (?!code\b|now\b|is)[a-zA-Z]+ = /);
  const cuerpo = fin > 0 ? resto.slice(0, fin) : resto.slice(0, 6000);

  const codigos = new Set([...cuerpo.matchAll(/code === '([A-Z0-9-]+)'/g)].map((m) => m[1]));
  for (const codigo of codigos) {
    if (SOLO_EN_FORMULARIO[codigo]) continue;
    if (!enServidor[programa]?.has(codigo)) {
      problemas.push(`${codigo} aparece en ${archivo} pero el servidor no lo acepta para "${programa}".`);
    }
  }
}

if (problemas.length) {
  console.error('\n✖ Códigos de descuento que la página muestra pero Stripe NO cobraría:\n');
  for (const p of problemas) console.error(`  - ${p}`);
  console.error(
    '\nAgrégalos a CODIGOS en netlify/functions/_promos.js (con el programa correcto),\n' +
    'o, si de verdad no deben pasar por Stripe, a SOLO_EN_FORMULARIO en scripts/verificar-promos.mjs.\n'
  );
  process.exit(1);
}

const total = Object.values(enServidor).reduce((n, s) => n + s.size, 0);
console.log(`✓ Códigos de descuento en orden (${total} combinaciones código-programa en el servidor).`);
