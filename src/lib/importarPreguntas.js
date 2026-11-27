// Importa preguntas de examen o encuesta desde un archivo de Excel (.xlsx), CSV o
// texto, para no volver a escribirlas en el editor.
//
// Devuelve { preguntas, avisos }. Cada pregunta trae exactamente:
//   { tipo: 'opcion'|'multiple'|'abierta'|'emparejar', texto, opciones: string[],
//     correctas: number[], pares?: [{ izquierda, derecha }] }
// `avisos` son frases en español sobre lo que no se pudo leer ("Renglón 7: …").
// Nunca lanza un error: lo que no entiende lo reporta en `avisos`.
//
// FORMATOS QUE ENTIENDE
//
// 1. Plantilla HCE (la de `descargarPlantilla`). Una pregunta por renglón:
//      Pregunta | Tipo | Opción 1 … Opción 8 | Correcta(s)
//    - Tipo: "Una correcta", "Varias correctas", "Abierta" o "Emparejar" (sin
//      importar acentos ni mayúsculas). Vacío: se deduce de las opciones.
//    - Correcta(s): números ("2", "1, 3") o letras ("B", "A, C"), o el texto
//      de la opción correcta.
//    - Emparejar: cada opción es "izquierda = derecha".
//    El mismo formato sirve en CSV, separado por coma, punto y coma o tabulador,
//    en UTF-8 (con o sin BOM; si no es UTF-8 se lee como Windows-1252, que es lo
//    que guarda Excel en Windows con "CSV").
//
// 2. Exportaciones de TalentLMS y de otras plataformas. Lo que encontramos:
//    - TalentLMS no documenta una exportación de las preguntas de un test a
//      Excel. Lo que sí tiene es "Export in Excel" en el reporte del test
//      (Reports > Learning activities > el test), que trae una hoja de resumen
//      ("Overview") con las preguntas y cómo se reparten las respuestas, más
//      hojas por usuario. No publica los nombres exactos de las columnas.
//      https://help.talentlms.com/hc/en-us/articles/9652242218396-How-to-export-test-reports-in-TalentLMS
//      https://help.talentlms.com/hc/en-us/articles/360015325059-How-to-export-test-reports-in-the-Legacy-interface
//    - Para IMPORTAR preguntas, TalentLMS solo acepta texto en formato GIFT o
//      AIKEN pegado en el test (Import questions).
//      https://help.talentlms.com/hc/en-us/articles/9652304102428-How-to-import-questions-in-the-GIFT-AIKEN-formats
//    - Sus tipos de pregunta: Multiple choice (una o varias correctas), Free
//      text, Fill the gap, Ordering, Drag and drop y Randomized.
//      https://www.talentlms.com/blog/tests-quizzes-talentlms/
//    Por eso el lector es tolerante y reconoce, por el nombre de los
//    encabezados (en inglés o español, en cualquiera de los primeros 15
//    renglones, aunque arriba haya un título):
//    a) Una pregunta por renglón: Question/Pregunta, Type/Tipo, Answer 1…,
//       Option A…, Choice 1…, Respuesta 1…, y Correct answer/Correcta(s)/Clave
//       con número, letra o texto. También columnas "Correct 1", "Correct 2"…
//       con verdadero/falso por opción.
//    b) Una respuesta por renglón: Question | Answer | Correct (Sí/No, True/
//       False, X, 1/0…). La pregunta puede repetirse en cada renglón o ir solo
//       en el primero.
//    c) Todas las opciones en una sola celda, separadas por saltos de línea,
//       "|" o ";".
//    d) Sin encabezados (como el resumen del reporte de TalentLMS o un texto
//       AIKEN): una pregunta seguida de sus respuestas, con "A." / "1)" al
//       inicio, o con números y porcentajes en las celdas de al lado, y la clave
//       en un renglón "ANSWER: B" / "Respuesta: B".
//    En cualquier formato, la respuesta correcta puede venir marcada con "*"
//    al inicio o al final, con "(correct)" / "(correcta)", con ✓, o (solo en
//    .xlsx) en negritas o en verde cuando las demás opciones no lo están.
//    Tipos de TalentLMS: Multiple choice queda como "Una correcta" o "Varias
//    correctas" según cuántas correctas tenga; Free text como "Abierta"; Drag
//    and drop como "Emparejar" si sus opciones son "izquierda = derecha". Fill
//    the gap, Ordering y Randomized no existen en el portal: se avisa y se
//    omiten.

export const TIPOS_IMPORTABLES = ['opcion', 'multiple', 'abierta', 'emparejar'];
export const MAX_OPCIONES_PLANTILLA = 8;
export const ENCABEZADOS_PLANTILLA = [
  'Pregunta',
  'Tipo',
  ...Array.from({ length: MAX_OPCIONES_PLANTILLA }, (_, i) => `Opción ${i + 1}`),
  'Correcta(s)',
];

const ESPERADO = 'Se esperaba una columna "Pregunta" (o "Question"), columnas "Opción 1", "Opción 2"… (o "Answer", "Respuesta") y una columna "Correcta(s)". Descarga la plantilla y copia ahí tus preguntas.';

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------

export const normalizar = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[()[\]{}:.#*¿?¡!"'_]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const limpiar = (valor) => String(valor ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

const VERDADERO = new Set(['si', 'sí', 'yes', 'y', 'true', 'verdadero', 'v', 'x', '1', 'correct', 'correcta', 'correcto', 'ok', '✓', '✔', 'right']);
const FALSO = new Set(['no', 'n', 'false', 'falso', 'f', '0', 'incorrect', 'incorrecta', 'incorrecto', 'wrong', '-', '']);

const esVerdadero = (valor) => VERDADERO.has(String(valor ?? '').trim().toLowerCase()) || VERDADERO.has(normalizar(valor));
const esFalso = (valor) => FALSO.has(String(valor ?? '').trim().toLowerCase()) || FALSO.has(normalizar(valor));

// Quita las marcas de "esta es la correcta" de una opción.
const MARCA_CORRECTA = /\s*[([]\s*(correct[ao]?|correct answer|respuesta correcta|right)\s*[)\]]\s*/i;
export function leerMarcaOpcion(valor) {
  let texto = limpiar(valor);
  let marcada = false;
  if (MARCA_CORRECTA.test(texto)) { marcada = true; texto = texto.replace(MARCA_CORRECTA, ' ').trim(); }
  if (/^[*✓✔]\s*/.test(texto)) { marcada = true; texto = texto.replace(/^[*✓✔]\s*/, ''); }
  if (/\s*[*✓✔]$/.test(texto)) { marcada = true; texto = texto.replace(/\s*[*✓✔]$/, ''); }
  // "~" es la marca de opción incorrecta en GIFT.
  texto = texto.replace(/^~\s*/, '');
  return { texto: texto.trim(), marcada };
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

// Devuelve 'opcion' | 'multiple' | 'abierta' | 'emparejar' | 'auto' (decidir por
// cuántas correctas tiene) | { noSoportado: nombre } | null (vacío) | { desconocido }.
export function leerTipo(valor) {
  const t = normalizar(valor).replace(/[/-]/g, ' ').replace(/\s+/g, ' ');
  if (!t) return null;
  const hay = (...claves) => claves.some((c) => t === c || t.includes(c));
  if (hay('varias correctas', 'varias respuestas', 'multiple answer', 'multiple response', 'multiple select', 'multi select', 'multiselect', 'casillas', 'checkbox', 'multiple correct', 'seleccion multiple con varias')) return 'multiple';
  if (hay('una correcta', 'una respuesta', 'unica', 'single choice', 'single answer', 'single select', 'verdadero o falso', 'verdadero falso', 'true false', 'true or false', 'cierto falso')) return 'opcion';
  if (hay('multiple choice', 'opcion multiple', 'seleccion multiple', 'multiple', 'opcion', 'opciones', 'choice', 'quiz')) return 'auto';
  if (hay('abierta', 'free text', 'texto libre', 'open', 'essay', 'ensayo', 'short answer', 'respuesta corta', 'desarrollo', 'texto', 'text')) return 'abierta';
  if (hay('emparejar', 'relacionar', 'relaciona', 'relacion', 'matching', 'match', 'drag and drop', 'drag drop', 'arrastrar', 'pares', 'columnas')) return 'emparejar';
  if (hay('fill the gap', 'fill in the blank', 'fill gap', 'completar', 'rellenar', 'huecos', 'espacios')) return { noSoportado: limpiar(valor) };
  if (hay('ordering', 'ordenar', 'order', 'secuencia', 'randomized', 'random', 'aleatori')) return { noSoportado: limpiar(valor) };
  return { desconocido: limpiar(valor) };
}

const esVerdaderoFalso = (valor) => /verdadero|true|cierto/.test(normalizar(valor));

// ---------------------------------------------------------------------------
// Encabezados
// ---------------------------------------------------------------------------

// Número pegado o separado ("Opción1", "Opción 1"); letra siempre separada
// ("Option A"), para que "Correcta" no se lea como "Correct" + "a".
const INDICE = '(?: ?(\\d{1,2})| ([a-h]))';
const indiceDe = (m) => (m[1] ? Number(m[1]) - 1 : LETRAS.indexOf(m[2]));

const RE_OPCION_N = new RegExp(`^(?:opcion|option|respuesta|answer|choice|alternativa|inciso|distractor)(?:es|s)?${INDICE}$`);
const RE_CORRECTA_N = new RegExp(`^(?:correcta|correcto|correct|es correcta|is correct|correct answer|correcta opcion)s?${INDICE}$`);
const RE_OPCION_N_CORRECTA = new RegExp(`^(?:opcion|option|respuesta|answer|choice)${INDICE} (?:correcta|correcto|correct|es correcta|is correct)$`);

// Clasifica un encabezado: { campo: 'pregunta'|'tipo'|'opcion'|'opciones'|'correcta'|'correctaN', indice? }
export function clasificarEncabezado(valor) {
  const h = normalizar(valor);
  if (!h) return null;
  let m = h.match(RE_OPCION_N_CORRECTA) || h.match(RE_CORRECTA_N);
  if (m) return { campo: 'correctaN', indice: indiceDe(m) };
  m = h.match(RE_OPCION_N);
  if (m) return { campo: 'opcion', indice: indiceDe(m) };
  if (/^(tipo|type|question type|tipo de pregunta|tipo pregunta|clase|formato)$/.test(h)) return { campo: 'tipo' };
  if (/(correct|correcta|correcto|clave|answer key|solucion|right answer)/.test(h)) return { campo: 'correcta' };
  if (/^(opciones|options|respuestas|answers|choices|alternativas|incisos|respuesta|answer|opcion|option|choice|alternativa|posibles respuestas)$/.test(h)) return { campo: 'opciones' };
  if (/^(pregunta|question|questions|preguntas|enunciado|reactivo|question text|texto de la pregunta|texto pregunta|texto|title|titulo|question title|stem)$/.test(h)) return { campo: 'pregunta' };
  return null;
}

function buscarEncabezados(filas) {
  for (let i = 0; i < Math.min(filas.length, 15); i += 1) {
    const columnas = { pregunta: [], tipo: [], opcion: [], opciones: [], correcta: [], correctaN: [] };
    filas[i].celdas.forEach((c, col) => {
      const clase = clasificarEncabezado(c.texto);
      if (clase) columnas[clase.campo].push({ col, indice: clase.indice });
    });
    if (columnas.pregunta.length !== 1) continue;
    // Una hoja de resultados por alumno trae "Question 1", "Question 2"…: no es esta.
    return { renglon: i, columnas };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Clave (respuestas correctas)
// ---------------------------------------------------------------------------

// Convierte "2", "1, 3", "B", "A y C", "AC" o el texto de la opción en índices.
// `opciones` es la lista con sus huecos ('' en las columnas vacías).
export function leerClave(valor, opciones) {
  const crudo = limpiar(valor);
  if (!crudo) return { indices: [], invalidos: [] };
  const n = normalizar(crudo);
  const porTexto = opciones.findIndex((o) => o && normalizar(leerMarcaOpcion(o).texto) === n);
  if (porTexto >= 0) return { indices: [porTexto], invalidos: [] };

  const tokens = crudo.toLowerCase()
    .replace(/\b(y|and)\b/g, ',')
    .split(/[\s,;/|&.+]+/)
    .map((t) => t.replace(/^(opcion|option|inciso|respuesta|answer)$/, '').trim())
    .filter(Boolean);
  const indices = [];
  const invalidos = [];
  const agregar = (i, original) => {
    if (i >= 0 && i < opciones.length && opciones[i]) { if (!indices.includes(i)) indices.push(i); } else invalidos.push(original);
  };
  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      const num = Number(t);
      // "13" con 4 opciones casi seguro quiso decir "1 y 3" (Excel se come la coma).
      if (t.length > 1 && num > opciones.length && [...t].every((d) => Number(d) >= 1 && Number(d) <= opciones.length)) [...t].forEach((d) => agregar(Number(d) - 1, d));
      else agregar(num - 1, t);
    } else if (/^[a-z]$/.test(t)) {
      agregar(LETRAS.indexOf(t), t.toUpperCase());
    } else if (/^[a-h]+$/.test(t) && t.length <= opciones.length) {
      [...t].forEach((l) => agregar(LETRAS.indexOf(l), l.toUpperCase()));
    } else {
      invalidos.push(t);
    }
  }
  if (invalidos.length && !indices.length) return { indices: [], invalidos: [crudo] };
  return { indices: indices.sort((a, b) => a - b), invalidos };
}

// ---------------------------------------------------------------------------
// Armado y validación de cada pregunta
// ---------------------------------------------------------------------------

const PAR = /\s*(?:=|→|->|=>)\s*/;

function leerPar(texto) {
  const partes = texto.split(PAR);
  if (partes.length < 2) return null;
  const izquierda = partes.shift().trim();
  const derecha = partes.join(' = ').trim();
  return izquierda && derecha ? { izquierda, derecha } : null;
}

const quitarPrefijo = (texto) => texto.replace(/^(pregunta|question|p)\s*\d+\s*[.:)\-–]\s*/i, '').replace(/^\d+\s*[.)\-–]\s+/, '').trim();

// borrador: { fila, texto, tipoCrudo, opciones: [{texto, marcada, negrita}], clave, flags: Map }
function armarPregunta(b, avisos) {
  const r = `Renglón ${b.fila}`;
  const texto = quitarPrefijo(limpiar(b.texto));
  const opcionesCrudas = b.opciones.map((o) => ({ ...o, ...leerMarcaOpcion(o.texto) }));
  const hayOpciones = opcionesCrudas.some((o) => o.texto);
  if (!texto) {
    if (hayOpciones) avisos.push(`${r}: tiene opciones pero no el texto de la pregunta; no se importó.`);
    return null;
  }

  let tipo = b.tipoCrudo == null ? null : leerTipo(b.tipoCrudo);
  if (tipo && typeof tipo === 'object' && tipo.noSoportado) {
    avisos.push(`${r}: el tipo "${tipo.noSoportado}" no existe en el portal; no se importó.`);
    return null;
  }
  if (tipo && typeof tipo === 'object' && tipo.desconocido) {
    avisos.push(`${r}: no se reconoce el tipo "${tipo.desconocido}"; se tomó según sus opciones.`);
    tipo = null;
  }

  // Emparejar: explícito, o todas las opciones son "algo = algo".
  const conTexto = opcionesCrudas.filter((o) => o.texto);
  const todosPares = conTexto.length >= 2 && conTexto.every((o) => leerPar(o.texto));
  if (tipo === 'emparejar' || (!tipo && todosPares && !b.clave && !conTexto.some((o) => o.marcada))) {
    const pares = [];
    conTexto.forEach((o) => {
      const par = leerPar(o.texto);
      if (par) pares.push(par);
      else avisos.push(`${r}: la opción "${o.texto}" no tiene la forma "izquierda = derecha"; se omitió esa opción.`);
    });
    if (pares.length < 2) {
      avisos.push(`${r}: una pregunta de emparejar necesita al menos 2 pares "izquierda = derecha"; no se importó.`);
      return null;
    }
    return { tipo: 'emparejar', texto, opciones: [], correctas: [], pares };
  }

  // Verdadero o falso sin opciones escritas.
  if (!hayOpciones && b.tipoCrudo && esVerdaderoFalso(b.tipoCrudo)) {
    opcionesCrudas.push({ texto: 'Verdadero' }, { texto: 'Falso' });
  }

  if (!opcionesCrudas.some((o) => o.texto)) {
    if (tipo && tipo !== 'abierta') avisos.push(`${r}: dice que es de opciones pero no tiene ninguna; se importó como abierta.`);
    return { tipo: 'abierta', texto, opciones: [], correctas: [] };
  }
  if (tipo === 'abierta') {
    avisos.push(`${r}: es abierta pero trae opciones; se importó como abierta y sin opciones.`);
    return { tipo: 'abierta', texto, opciones: [], correctas: [] };
  }

  // Clave sobre la lista con huecos; luego se compacta.
  const lista = opcionesCrudas.map((o) => o.texto);
  const correctasHuecos = new Set();
  opcionesCrudas.forEach((o, i) => { if (o.texto && (o.marcada || b.flags?.get(i))) correctasHuecos.add(i); });
  if (b.clave) {
    const { indices, invalidos } = leerClave(b.clave, lista);
    indices.forEach((i) => correctasHuecos.add(i));
    if (invalidos.length) avisos.push(`${r}: la respuesta correcta "${invalidos.join(', ')}" no coincide con ninguna opción.`);
  }
  // Último recurso (.xlsx): la opción en negritas o en verde cuando las demás no lo están.
  if (!correctasHuecos.size) {
    const resaltadas = opcionesCrudas.map((o, i) => (o.texto && o.resaltada ? i : -1)).filter((i) => i >= 0);
    if (resaltadas.length && resaltadas.length < conTexto.length) resaltadas.forEach((i) => correctasHuecos.add(i));
  }

  const opciones = [];
  const correctas = [];
  const vistas = new Set();
  opcionesCrudas.forEach((o, i) => {
    if (!o.texto) return;
    const clave = normalizar(o.texto);
    if (vistas.has(clave)) {
      avisos.push(`${r}: la opción "${o.texto}" está repetida; se dejó una sola.`);
      if (correctasHuecos.has(i)) {
        const previa = opciones.findIndex((x) => normalizar(x) === clave);
        if (!correctas.includes(previa)) correctas.push(previa);
      }
      return;
    }
    vistas.add(clave);
    if (correctasHuecos.has(i)) correctas.push(opciones.length);
    opciones.push(o.texto);
  });
  correctas.sort((a, b2) => a - b2);

  if (opciones.length < 2) {
    avisos.push(`${r}: solo tiene una opción; agrega al menos dos o márcala como abierta. No se importó.`);
    return null;
  }

  let final = tipo;
  if (!final || final === 'auto') final = correctas.length > 1 ? 'multiple' : 'opcion';
  if (final === 'opcion' && correctas.length > 1) {
    if (tipo === 'opcion') avisos.push(`${r}: dice "Una correcta" pero tiene ${correctas.length} correctas; se importó como "Varias correctas".`);
    final = 'multiple';
  }
  return { tipo: final, texto, opciones, correctas, _sinClave: !correctas.length };
}

// ---------------------------------------------------------------------------
// Lectura de una tabla con encabezados
// ---------------------------------------------------------------------------

const separarLista = (texto) => {
  const t = String(texto ?? '');
  if (/\r?\n/.test(t)) return t.split(/\r?\n/);
  if (t.includes('|')) return t.split('|');
  if (t.includes(';')) return t.split(';');
  return [t];
};

function leerTabla(filas, encabezado, avisos) {
  const { columnas } = encabezado;
  const colPregunta = columnas.pregunta[0].col;
  const colTipo = columnas.tipo[0]?.col;
  const colClave = columnas.correcta[0]?.col;
  const colOpciones = columnas.opciones[0]?.col;
  const porIndice = [...columnas.opcion].sort((a, b) => a.indice - b.indice);
  const flags = columnas.correctaN;
  const modoLargo = !porIndice.length && colOpciones != null;

  const borradores = [];
  let actual = null;
  const celda = (fila, col) => (col == null ? undefined : fila.celdas[col]);
  const valor = (fila, col) => limpiar(celda(fila, col)?.texto);

  for (const fila of filas.slice(encabezado.renglon + 1)) {
    if (!fila.celdas.some((c) => limpiar(c?.texto))) { if (!modoLargo) actual = null; continue; }
    const textoPregunta = valor(fila, colPregunta);

    if (!modoLargo) {
      const opciones = [];
      porIndice.forEach(({ col, indice }) => {
        const c = celda(fila, col);
        opciones[indice] = { texto: c?.texto ?? '', resaltada: !!c?.resaltada };
      });
      for (let i = 0; i < opciones.length; i += 1) if (!opciones[i]) opciones[i] = { texto: '' };
      // Sin columnas "Opción N" pero con "Opciones" en una sola celda.
      if (!opciones.length && colOpciones != null) separarLista(valor(fila, colOpciones)).forEach((t) => opciones.push({ texto: t }));
      const mapa = new Map();
      flags.forEach(({ col, indice }) => { if (esVerdadero(valor(fila, col))) mapa.set(indice, true); });
      borradores.push({
        fila: fila.numero,
        texto: textoPregunta,
        tipoCrudo: colTipo == null ? null : valor(fila, colTipo),
        opciones,
        clave: colClave == null ? '' : valor(fila, colClave),
        flags: mapa,
      });
      continue;
    }

    // Una respuesta por renglón.
    const respuesta = valor(fila, colOpciones);
    const marcaCruda = colClave == null ? '' : valor(fila, colClave);
    const nueva = textoPregunta && (!actual || normalizar(textoPregunta) !== normalizar(actual.texto));
    if (nueva) {
      actual = { fila: fila.numero, texto: textoPregunta, tipoCrudo: colTipo == null ? null : valor(fila, colTipo), opciones: [], clave: '', flags: new Map() };
      borradores.push(actual);
    } else if (!actual) {
      avisos.push(`Renglón ${fila.numero}: tiene una respuesta pero no se sabe de qué pregunta es; no se importó.`);
      continue;
    }
    if (!actual.tipoCrudo && colTipo != null && valor(fila, colTipo)) actual.tipoCrudo = valor(fila, colTipo);
    const partes = respuesta ? separarLista(respuesta) : [];
    partes.forEach((t) => {
      const indice = actual.opciones.length;
      actual.opciones.push({ texto: t, resaltada: !!celda(fila, colOpciones)?.resaltada });
      if (partes.length === 1 && marcaCruda) {
        if (esVerdadero(marcaCruda)) actual.flags.set(indice, true);
        else if (!esFalso(marcaCruda)) actual.clave = actual.clave ? `${actual.clave}, ${marcaCruda}` : marcaCruda;
      }
    });
    if (partes.length > 1 && marcaCruda && !esFalso(marcaCruda) && !esVerdadero(marcaCruda)) actual.clave = marcaCruda;
  }
  return borradores;
}

// ---------------------------------------------------------------------------
// Lectura sin encabezados (resumen de TalentLMS, AIKEN, listas numeradas)
// ---------------------------------------------------------------------------

const RE_OPCION_LINEA = /^([a-hA-H]|[1-8])\s*[.)]\s+(.+)$/;
const RE_CLAVE_LINEA = /^(answer|answers|respuesta correcta|respuestas correctas|respuesta|correcta|correctas|correct answer|correct|clave)\s*[:=]\s*(.+)$/i;
const RE_PREGUNTA_LINEA = /^(pregunta|question|p)\s*\d+\s*[.:)\-–]?\s*\S/i;
const pareceDato = (t) => /^-?\d+([.,]\d+)?\s*%?$/.test(limpiar(t));

function leerBloques(filas) {
  const borradores = [];
  let actual = null;
  for (const fila of filas) {
    const llenas = fila.celdas.map((c, col) => ({ ...c, col })).filter((c) => limpiar(c?.texto));
    if (!llenas.length) { actual = null; continue; }
    const primera = llenas.find((c) => !pareceDato(c.texto)) || llenas[0];
    const linea = limpiar(primera.texto);
    const conDatos = llenas.some((c) => c !== primera && pareceDato(c.texto));

    const clave = linea.match(RE_CLAVE_LINEA);
    if (clave && actual) { actual.clave = clave[2]; continue; }
    const opcion = linea.match(RE_OPCION_LINEA);
    const pregunta = RE_PREGUNTA_LINEA.test(linea);
    if (actual && !pregunta && (opcion || conDatos)) {
      actual.opciones.push({ texto: opcion ? opcion[2] : linea, resaltada: !!primera.resaltada });
      continue;
    }
    if (actual && !actual.opciones.length && !pregunta && !opcion) {
      actual.texto = `${actual.texto} ${linea}`;
      continue;
    }
    actual = { fila: fila.numero, texto: linea, tipoCrudo: null, opciones: [], clave: '', flags: new Map() };
    borradores.push(actual);
  }
  // Solo cuenta si de verdad parecen preguntas con respuestas.
  return borradores.filter((b) => b.opciones.length >= 2 || b.clave);
}

// ---------------------------------------------------------------------------
// Entrada pública: filas ya leídas
// ---------------------------------------------------------------------------

// `filas`: arreglo de arreglos de texto (o de { texto, resaltada }), o de
// { numero, celdas }. Devuelve { preguntas, avisos }.
export function leerFilas(filas, { esExamen = true } = {}) {
  const avisos = [];
  const normalizadas = (filas || []).map((f, i) => {
    if (f && Array.isArray(f.celdas)) return f;
    const celdas = (Array.isArray(f) ? f : []).map((c) => (c && typeof c === 'object' ? c : { texto: c == null ? '' : String(c) }));
    return { numero: i + 1, celdas };
  });

  const encabezado = buscarEncabezados(normalizadas);
  let borradores;
  if (encabezado) {
    const { columnas } = encabezado;
    if (!columnas.opcion.length && !columnas.opciones.length) {
      avisos.push('El archivo tiene la columna de preguntas pero ninguna de opciones; todas se importan como abiertas.');
    }
    borradores = leerTabla(normalizadas, encabezado, avisos);
  } else {
    borradores = leerBloques(normalizadas);
    if (!borradores.length) {
      return { preguntas: [], avisos: [`No se reconocieron las columnas del archivo. ${ESPERADO}`] };
    }
    avisos.push('El archivo no tiene encabezados; se leyó como lista de preguntas con sus respuestas. Revisa la vista previa con cuidado.');
  }

  const preguntas = [];
  for (const b of borradores) {
    const p = armarPregunta(b, avisos);
    if (p) preguntas.push({ ...p, _fila: b.fila });
  }
  return adaptarPreguntas(preguntas, { esExamen, avisos });
}

// Quita lo que no aplica (encuestas: sin correctas ni emparejar) y deja cada
// pregunta con el formato exacto del editor.
export function adaptarPreguntas(preguntas, { esExamen = true, avisos = [] } = {}) {
  const salida = [];
  const sinClave = [];
  for (const p of preguntas) {
    const fila = p._fila;
    if (!esExamen && p.tipo === 'emparejar') {
      avisos.push(`${fila ? `Renglón ${fila}` : `"${p.texto}"`}: las encuestas no tienen preguntas de emparejar; no se importó.`);
      continue;
    }
    if (esExamen && p._sinClave && ['opcion', 'multiple'].includes(p.tipo)) sinClave.push(fila);
    const limpia = {
      tipo: p.tipo,
      texto: p.texto,
      opciones: [...(p.opciones || [])],
      correctas: esExamen ? [...(p.correctas || [])] : [],
    };
    if (p.tipo === 'emparejar') limpia.pares = (p.pares || []).map(({ izquierda, derecha }) => ({ izquierda, derecha }));
    salida.push(limpia);
  }
  sinClave.forEach((fila) => {
    avisos.push(`${fila ? `Renglón ${fila}` : 'Una pregunta'}: no tiene respuesta correcta marcada; se importó sin clave.`);
  });
  avisos.sort((a, b) => numeroAviso(a) - numeroAviso(b));
  return { preguntas: salida, avisos };
}

const numeroAviso = (aviso) => {
  const m = String(aviso).match(/^Renglón (\d+)/);
  return m ? Number(m[1]) : 0;
};

// ---------------------------------------------------------------------------
// CSV y texto
// ---------------------------------------------------------------------------

export function decodificarTexto(bytes) {
  const datos = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let texto;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(datos);
  } catch {
    texto = new TextDecoder('windows-1252').decode(datos);
  }
  return texto.replace(/^\uFEFF/, '');
}

function detectarSeparador(texto) {
  const primera = (texto.split(/\r?\n/).find((l) => l.trim()) || '').replace(/"[^"]*"/g, '');
  const cuenta = (c) => primera.split(c).length - 1;
  const opciones = [[';', cuenta(';')], [',', cuenta(',')], ['\t', cuenta('\t')]];
  opciones.sort((a, b) => b[1] - a[1]);
  return opciones[0][1] ? opciones[0][0] : ',';
}

// CSV con comillas, "" escapadas y saltos de línea dentro de comillas.
export function leerCsv(texto) {
  const t = String(texto ?? '').replace(/^\uFEFF/, '');
  const sep = detectarSeparador(t);
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i += 1; } else comillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"' && campo.trim() === '') { comillas = true; campo = ''; continue; }
    if (c === sep) { fila.push(campo); campo = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; continue; }
    campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

// ---------------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------------

function textoCelda(valor) {
  if (valor == null) return '';
  if (valor instanceof Date) return valor.toLocaleDateString('es-MX');
  if (typeof valor === 'number') return String(valor);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') {
    if (Array.isArray(valor.richText)) return valor.richText.map((r) => r.text || '').join('');
    if ('result' in valor) return textoCelda(valor.result);
    if ('text' in valor) return textoCelda(valor.text);
    if ('error' in valor) return '';
    return '';
  }
  return String(valor);
}

const esVerde = (argb) => {
  if (typeof argb !== 'string' || argb.length < 6) return false;
  const hex = argb.slice(-6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return g > 120 && g > r + 40 && g > b + 20;
};

function celdaResaltada(celda) {
  const fuente = celda.font || {};
  const relleno = celda.fill || {};
  const negritaRica = Array.isArray(celda.value?.richText) && celda.value.richText.length > 0
    && celda.value.richText.every((r) => !r.text?.trim() || r.font?.bold);
  return !!(fuente.bold || negritaRica || esVerde(fuente.color?.argb) || esVerde(relleno.fgColor?.argb));
}

function filasDeHoja(hoja) {
  const filas = [];
  const total = hoja.rowCount || 0;
  for (let n = 1; n <= total; n += 1) {
    const row = hoja.getRow(n);
    const celdas = [];
    const ancho = Math.max(row.cellCount || 0, hoja.columnCount || 0);
    for (let c = 1; c <= ancho; c += 1) {
      const celda = row.getCell(c);
      const texto = textoCelda(celda.value);
      celdas.push({ texto, resaltada: texto ? celdaResaltada(celda) : false });
    }
    filas.push({ numero: n, celdas });
  }
  return filas;
}

const HOJAS_AYUDA = /^(instrucciones|instructions|ayuda|help|leeme|readme|como llenar)/;

export async function leerXlsx(datos, { esExamen = true } = {}) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(datos);
  } catch {
    return { preguntas: [], avisos: ['No se pudo abrir el archivo de Excel. Ábrelo en Excel y guárdalo de nuevo como "Libro de Excel (.xlsx)".'] };
  }
  const hojas = libro.worksheets.filter((h) => h.rowCount > 0 && !HOJAS_AYUDA.test(normalizar(h.name)));
  // Primero la que se llame como preguntas o resumen.
  const prioridad = (h) => (/(pregunta|question|overview|resumen|test|examen)/.test(normalizar(h.name)) ? 0 : 1);
  hojas.sort((a, b) => prioridad(a) - prioridad(b));
  let primerResultado = null;
  for (const hoja of hojas) {
    const resultado = leerFilas(filasDeHoja(hoja), { esExamen });
    if (resultado.preguntas.length) {
      if (hojas.length > 1) resultado.avisos.unshift(`Se leyeron las preguntas de la hoja "${hoja.name}".`);
      return resultado;
    }
    if (!primerResultado) primerResultado = resultado;
  }
  return primerResultado || { preguntas: [], avisos: ['El archivo de Excel está vacío.'] };
}

// ---------------------------------------------------------------------------
// Entrada pública: un archivo
// ---------------------------------------------------------------------------

async function bytesDe(archivo) {
  if (archivo instanceof ArrayBuffer) return new Uint8Array(archivo);
  if (ArrayBuffer.isView(archivo)) return new Uint8Array(archivo.buffer, archivo.byteOffset, archivo.byteLength);
  if (archivo && typeof archivo.arrayBuffer === 'function') return new Uint8Array(await archivo.arrayBuffer());
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(new Uint8Array(lector.result));
    lector.onerror = () => rechazar(lector.error);
    lector.readAsArrayBuffer(archivo);
  });
}

// `archivo`: File, Blob, ArrayBuffer o Uint8Array. `nombre` ayuda a saber el
// formato cuando no es un File.
export async function leerArchivoPreguntas(archivo, { esExamen = true, nombre } = {}) {
  try {
    if (!archivo) return { preguntas: [], avisos: ['No se eligió ningún archivo.'] };
    const nombreArchivo = String(nombre || archivo.name || '').toLowerCase();
    if (/\.(xls|ods|numbers)$/.test(nombreArchivo)) {
      return { preguntas: [], avisos: ['Este archivo es de un formato antiguo u otro programa. Ábrelo en Excel y guárdalo como "Libro de Excel (.xlsx)" o como CSV.'] };
    }
    const bytes = await bytesDe(archivo);
    if (!bytes.length) return { preguntas: [], avisos: ['El archivo está vacío.'] };
    // Un .xlsx es un ZIP: empieza con "PK".
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return await leerXlsx(bytes, { esExamen });
    if (/\.(xlsx|xlsm)$/.test(nombreArchivo)) return { preguntas: [], avisos: ['No se pudo abrir el archivo de Excel. Ábrelo en Excel y guárdalo de nuevo como "Libro de Excel (.xlsx)".'] };
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
      return { preguntas: [], avisos: ['Este archivo es de Excel antiguo (.xls). Ábrelo en Excel y guárdalo como "Libro de Excel (.xlsx)".'] };
    }
    const texto = decodificarTexto(bytes);
    const filas = /\.txt$/.test(nombreArchivo) ? texto.split(/\r?\n/).map((l) => [l]) : leerCsv(texto);
    return leerFilas(filas, { esExamen });
  } catch (error) {
    return { preguntas: [], avisos: [`No se pudo leer el archivo (${error?.message || 'error desconocido'}). Intenta guardarlo de nuevo como .xlsx o .csv.`] };
  }
}

// ---------------------------------------------------------------------------
// Plantilla
// ---------------------------------------------------------------------------

export const EJEMPLOS_PLANTILLA = [
  ['(Ejemplo) ¿Cuál es la principal indicación de la ECMO venovenosa?', 'Una correcta', 'Falla cardiaca aislada', 'Falla respiratoria grave y potencialmente reversible', 'Paro cardiaco presenciado', 'Sepsis sin falla de órganos', '', '', '', '', '2'],
  ['(Ejemplo) ¿Cuáles son complicaciones de la ECMO?', 'Varias correctas', 'Sangrado', 'Trombosis en el circuito', 'Hemólisis', 'Mejora inmediata de la función renal', '', '', '', '', 'A, B, C'],
  ['(Ejemplo) Explica con tus palabras qué es la ECMO venoarterial.', 'Abierta', '', '', '', '', '', '', '', '', ''],
  ['(Ejemplo) Relaciona cada año con su hito en la historia de la ECMO.', 'Emparejar', '1971 = Primer caso exitoso en adultos (J. Donald Hill)', '1972 = Hill publica el caso en el New England Journal of Medicine', '', '', '', '', '', '', ''],
];

const TEXTOS_EJEMPLO = new Set(EJEMPLOS_PLANTILLA.map((e) => normalizar(e[0])));
export const esEjemploPlantilla = (pregunta) => TEXTOS_EJEMPLO.has(normalizar(pregunta?.texto)) || /^\(ejemplo\)/i.test(String(pregunta?.texto || ''));

const INSTRUCCIONES = [
  ['Cómo llenar la plantilla de preguntas'],
  [''],
  ['1. Escribe una pregunta por renglón en la hoja "Preguntas". Borra los renglones de ejemplo (los que empiezan con "(Ejemplo)").'],
  ['2. En "Tipo" elige una de estas opciones:'],
  ['     Una correcta: el alumno elige una sola respuesta.'],
  ['     Varias correctas: el alumno marca todas las que apliquen.'],
  ['     Abierta: el alumno escribe su respuesta. Deja vacías las opciones.'],
  ['     Emparejar: el alumno relaciona dos columnas (solo en exámenes).'],
  ['3. Escribe cada respuesta posible en "Opción 1", "Opción 2"… (hasta 8). Deja vacías las que no uses.'],
  ['4. En "Correcta(s)" escribe el número o la letra de la respuesta correcta: 2 o B. Si son varias, sepáralas con coma: 1, 3 o A, C.'],
  ['5. Para "Emparejar", escribe cada par en una opción con un signo igual en medio: 1971 = Primer caso exitoso en adultos. Deja vacía "Correcta(s)".'],
  ['6. En encuestas no hay respuestas correctas: puedes dejar vacía "Correcta(s)".'],
  ['7. Guarda el archivo y súbelo en el portal con "Importar desde Excel". Antes de importar verás una vista previa para revisar cada pregunta.'],
  [''],
  ['También puedes subir el Excel o CSV que exportes de TalentLMS u otra plataforma: el portal busca las columnas de pregunta, opciones y respuesta correcta.'],
];

export async function crearPlantilla() {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Portal HCE';

  const hoja = libro.addWorksheet('Preguntas', { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.addRow(ENCABEZADOS_PLANTILLA);
  EJEMPLOS_PLANTILLA.forEach((e) => hoja.addRow(e));
  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
  cabecera.alignment = { vertical: 'middle', wrapText: true };
  cabecera.height = 22;
  hoja.columns.forEach((col, i) => {
    col.width = i === 0 ? 50 : i === 1 ? 18 : i === ENCABEZADOS_PLANTILLA.length - 1 ? 14 : 28;
    col.alignment = { vertical: 'top', wrapText: true };
  });
  const ultimaColumna = String.fromCharCode(64 + ENCABEZADOS_PLANTILLA.length);
  hoja.dataValidations.add('B2:B500', {
    type: 'list',
    allowBlank: true,
    formulae: ['"Una correcta,Varias correctas,Abierta,Emparejar"'],
    showErrorMessage: false,
    showInputMessage: true,
    promptTitle: 'Tipo de pregunta',
    prompt: 'Una correcta, Varias correctas, Abierta o Emparejar',
  });
  hoja.getCell(`${ultimaColumna}1`).note = 'Número o letra de la correcta: 2 o B. Varias: 1, 3 o A, C.';

  const ayuda = libro.addWorksheet('Instrucciones');
  INSTRUCCIONES.forEach((r) => ayuda.addRow(r));
  ayuda.getColumn(1).width = 110;
  ayuda.getColumn(1).alignment = { wrapText: true, vertical: 'top' };
  ayuda.getRow(1).font = { bold: true, size: 14 };

  return libro.xlsx.writeBuffer();
}

export async function descargarPlantilla() {
  const buffer = await crearPlantilla();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-preguntas.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
