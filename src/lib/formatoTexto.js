// Herramientas del editor de texto con formato (lecturas, tareas, instrucciones).
// El formato es el que dibuja src/components/TextoLeccion.jsx:
//   # Título, ## Subtítulo, - viñeta, 1. lista numerada,
//   **negritas**, *cursiva*, [texto](https://…). Línea en blanco = párrafo nuevo.

// ---- Pegar desde Word, Google Docs o una página web ------------------------

const limpiarEspacios = (t) => t.replace(/[ \t\u00a0]+/g, ' ');

function enLinea(nodo) {
  if (nodo.nodeType === 3) return limpiarEspacios(nodo.textContent);
  if (nodo.nodeType !== 1) return '';
  const etiqueta = nodo.tagName.toLowerCase();
  if (['style', 'script', 'head', 'meta', 'title'].includes(etiqueta)) return '';
  if (etiqueta === 'br') return '\n';
  const dentro = [...nodo.childNodes].map(enLinea).join('');
  const estilo = (nodo.getAttribute('style') || '').toLowerCase();
  const negrita = ['strong', 'b'].includes(etiqueta) || /font-weight:\s*(bold|[6-9]00)/.test(estilo);
  const cursiva = ['em', 'i'].includes(etiqueta) || /font-style:\s*italic/.test(estilo);
  let t = dentro;
  if (!t.trim()) return t;
  // Los espacios de las orillas quedan fuera de los asteriscos.
  const [, antes, centro, despues] = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
  t = centro;
  if (cursiva && !negrita) t = `*${t}*`;
  if (negrita) t = `**${t}**`;
  if (etiqueta === 'a') {
    const href = nodo.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) t = `[${t.replace(/\*/g, '')}](${href})`;
  }
  return antes + t + despues;
}

function bloques(nodo, salida) {
  for (const hijo of nodo.childNodes) {
    if (hijo.nodeType === 3) {
      const t = limpiarEspacios(hijo.textContent);
      if (t.trim()) salida.push({ tipo: 'p', texto: t.trim() });
      continue;
    }
    if (hijo.nodeType !== 1) continue;
    const etiqueta = hijo.tagName.toLowerCase();
    if (['style', 'script', 'head', 'meta', 'title'].includes(etiqueta)) continue;
    if (/^h[1-2]$/.test(etiqueta)) salida.push({ tipo: 'p', texto: `# ${enLinea(hijo).replace(/\*/g, '').trim()}` });
    else if (/^h[3-6]$/.test(etiqueta)) salida.push({ tipo: 'p', texto: `## ${enLinea(hijo).replace(/\*/g, '').trim()}` });
    else if (etiqueta === 'ul' || etiqueta === 'ol') {
      let n = Number(hijo.getAttribute('start')) || 1;
      const items = [...hijo.children].filter((li) => li.tagName.toLowerCase() === 'li');
      salida.push({
        tipo: 'lista',
        lineas: items.map((li) => `${etiqueta === 'ol' ? `${n++}.` : '-'} ${enLinea(li).replace(/\n+/g, ' ').trim()}`),
      });
    } else if (['p', 'li', 'blockquote', 'pre'].includes(etiqueta)) {
      const t = enLinea(hijo).trim();
      if (t) salida.push({ tipo: 'p', texto: t });
    } else if (['div', 'section', 'article', 'main', 'body', 'html', 'span', 'font', 'table', 'tbody', 'tr', 'td', 'th'].includes(etiqueta)) {
      // Contenedores: si solo traen texto en línea, son un párrafo.
      const tieneBloques = hijo.querySelector('p, div, ul, ol, h1, h2, h3, h4, h5, h6, li, table, blockquote');
      if (tieneBloques) bloques(hijo, salida);
      else {
        const t = enLinea(hijo).trim();
        if (t) salida.push({ tipo: 'p', texto: t });
      }
    } else {
      const t = enLinea(hijo).trim();
      if (t) salida.push({ tipo: 'p', texto: t });
    }
  }
}

/** Convierte el HTML del portapapeles al formato del aula. */
export function htmlAFormato(html) {
  if (!html || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const salida = [];
  bloques(doc.body, salida);
  return salida
    .map((b) => (b.tipo === 'lista' ? b.lineas.join('\n') : b.texto.split('\n').map((l) => l.trim()).join('\n')))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- Botones de la barra ---------------------------------------------------

/**
 * Envuelve la selección con marcas (negritas, cursiva). Si no hay selección,
 * inserta las marcas con un texto de ejemplo seleccionado.
 * Devuelve { texto, inicio, fin } con la nueva selección.
 */
export function envolver(texto, inicio, fin, marca, ejemplo = 'texto') {
  const elegido = texto.slice(inicio, fin) || ejemplo;
  const nuevo = texto.slice(0, inicio) + marca + elegido + marca + texto.slice(fin);
  return { texto: nuevo, inicio: inicio + marca.length, fin: inicio + marca.length + elegido.length };
}

/**
 * Pone o quita un prefijo en cada línea seleccionada (título, viñeta, número).
 * `prefijo` puede ser una función (i) => '1. ' para numerar.
 */
export function prefijarLineas(texto, inicio, fin, prefijo, patronQuitar) {
  const desde = texto.lastIndexOf('\n', inicio - 1) + 1;
  const finLinea = texto.indexOf('\n', fin);
  const hasta = finLinea === -1 ? texto.length : finLinea;
  const lineas = texto.slice(desde, hasta).split('\n');
  const yaTienen = lineas.filter((l) => l.trim()).every((l) => patronQuitar.test(l));
  let i = 0;
  const nuevas = lineas.map((l) => {
    if (!l.trim()) return l;
    const limpia = l.replace(/^(#{1,2}\s+|[-*]\s+|\d+[.)]\s+)/, '');
    if (yaTienen) return limpia;
    const p = typeof prefijo === 'function' ? prefijo(i++) : prefijo;
    return p + limpia;
  });
  const bloque = nuevas.join('\n');
  return { texto: texto.slice(0, desde) + bloque + texto.slice(hasta), inicio: desde, fin: desde + bloque.length };
}

/** Colores de letra disponibles ({rojo}texto{/rojo}); TextoLeccion los dibuja. */
export const COLORES_TEXTO = [
  ['rojo', 'Rojo'],
  ['azul', 'Azul'],
  ['verde', 'Verde'],
  ['naranja', 'Naranja'],
  ['morado', 'Morado'],
];

/**
 * Pone la selección de un color: {rojo}texto{/rojo}. Si ya tenía color, se lo
 * cambia; con `color` vacío se lo quita.
 */
export function colorear(texto, inicio, fin, color) {
  const marca = /^\{(rojo|azul|verde|naranja|morado)\}([\s\S]*)\{\/(rojo|azul|verde|naranja|morado)\}$/;
  let elegido = texto.slice(inicio, fin) || (color ? 'texto' : '');
  const previo = elegido.match(marca);
  if (previo) elegido = previo[2];
  const nuevo = color ? `{${color}}${elegido}{/${color}}` : elegido;
  const abre = color ? color.length + 2 : 0;
  return { texto: texto.slice(0, inicio) + nuevo + texto.slice(fin), inicio: inicio + abre, fin: inicio + abre + elegido.length };
}

/** Inserta un enlace [texto](url) en la selección. */
export function insertarEnlace(texto, inicio, fin, url) {
  const etiqueta = texto.slice(inicio, fin) || 'texto del enlace';
  const enlace = `[${etiqueta}](${url})`;
  return { texto: texto.slice(0, inicio) + enlace + texto.slice(fin), inicio: inicio + 1, fin: inicio + 1 + etiqueta.length };
}
