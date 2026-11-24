import React from 'react';

// Muestra la lectura de una lección (o las instrucciones de una tarea) con un
// formato sencillo, sin interpretar HTML: el texto lo escribe el administrador
// pero se dibuja como texto, así que nada de lo que se pegue ahí puede
// ejecutarse en el navegador del alumno.
//
// Formato que entiende:
//   # Título, ## Subtítulo
//   - viñeta   /   1. lista numerada
//   **negritas**, *cursivas* y [texto del enlace](https://…)
//   Una dirección https://… suelta también se vuelve enlace.
//   Una línea en blanco separa párrafos.

const ENLACE_SEGURO = /^https?:\/\//i;

function enLinea(texto, claveBase) {
  const partes = [];
  const patron = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>()]+)/g;
  let ultimo = 0;
  let m;
  let i = 0;

  while ((m = patron.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const token = m[0];
    const clave = `${claveBase}-${i++}`;

    if (token.startsWith('**')) {
      partes.push(<strong key={clave}>{token.slice(2, -2)}</strong>);
    } else if (/^https?:\/\//i.test(token)) {
      // Dirección suelta: el punto o la coma final no son parte del enlace.
      const url = token.replace(/[.,;:!?]+$/, '');
      partes.push(<a key={clave} href={url} target="_blank" rel="noopener noreferrer">{url}</a>);
      if (url.length < token.length) partes.push(token.slice(url.length));
    } else if (token.startsWith('[')) {
      const [, etiqueta, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      partes.push(ENLACE_SEGURO.test(url)
        ? <a key={clave} href={url} target="_blank" rel="noopener noreferrer">{etiqueta}</a>
        : etiqueta);
    } else {
      partes.push(<em key={clave}>{token.slice(1, -1)}</em>);
    }
    ultimo = m.index + token.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/**
 * Fuentes al final de una lectura: una por línea. Las ligas se vuelven enlace
 * solas y se puede poner el nombre antes ("ELSO Guidelines https://…").
 */
export function FuentesLeccion({ fuentes }) {
  const lineas = String(fuentes || '').replace(/\r\n/g, '\n').split('\n').map((l) => l.trim().replace(/^[-*]\s+/, '')).filter(Boolean);
  if (!lineas.length) return null;
  return (
    <aside className="fuentes-leccion" aria-label="Fuentes">
      <h4>{lineas.length === 1 ? 'Fuente' : 'Fuentes'}</h4>
      <ul>{lineas.map((l, i) => <li key={i}>{enLinea(l, `f${i}`)}</li>)}</ul>
    </aside>
  );
}

export default function TextoLeccion({ texto }) {
  if (!texto?.trim()) return null;

  const bloques = [];
  let lista = null;

  const cerrarLista = () => {
    if (lista) bloques.push(lista);
    lista = null;
  };

  texto.replace(/\r\n/g, '\n').split('\n').forEach((linea, n) => {
    const l = linea.trim();

    if (!l) {
      cerrarLista();
      // La línea en blanco cierra el párrafo: lo que siga empieza uno nuevo.
      const previo = bloques[bloques.length - 1];
      if (previo?.tipo === 'p') previo.cerrado = true;
      return;
    }

    const vineta = l.match(/^[-*]\s+(.*)$/);
    const numero = l.match(/^\d+[.)]\s+(.*)$/);
    if (vineta || numero) {
      const tipo = vineta ? 'ul' : 'ol';
      if (!lista || lista.tipo !== tipo) {
        cerrarLista();
        // La numerada empieza en el número escrito: si se separó con líneas en
        // blanco, sigue 2, 3… en lugar de volver a 1.
        lista = { tipo, items: [], clave: `l${n}`, inicio: numero ? Number(l.match(/^(\d+)/)[1]) : 1 };
      }
      lista.items.push(enLinea((vineta || numero)[1], `i${n}`));
      return;
    }

    cerrarLista();
    if (l.startsWith('## ')) bloques.push({ tipo: 'h4', contenido: enLinea(l.slice(3), `h${n}`), clave: `h${n}` });
    else if (l.startsWith('# ')) bloques.push({ tipo: 'h3', contenido: enLinea(l.slice(2), `h${n}`), clave: `h${n}` });
    else {
      // Líneas seguidas forman un mismo párrafo.
      const previo = bloques[bloques.length - 1];
      if (previo?.tipo === 'p' && !previo.cerrado) previo.contenido.push(' ', ...enLinea(l, `p${n}`));
      else bloques.push({ tipo: 'p', contenido: enLinea(l, `p${n}`), clave: `p${n}` });
    }
  });
  cerrarLista();

  return (
    <div className="texto-leccion">
      {bloques.map((b) => {
        if (b.tipo === 'ul' || b.tipo === 'ol') {
          const Lista = b.tipo;
          return <Lista key={b.clave} start={b.tipo === 'ol' && b.inicio > 1 ? b.inicio : undefined}>{b.items.map((it, i) => <li key={i}>{it}</li>)}</Lista>;
        }
        const Etiqueta = b.tipo;
        return <Etiqueta key={b.clave}>{b.contenido}</Etiqueta>;
      })}
    </div>
  );
}
