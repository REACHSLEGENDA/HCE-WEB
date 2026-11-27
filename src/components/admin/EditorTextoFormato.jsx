// Editor de texto con formato para lecturas, tareas e instrucciones. Escribe el
// mismo formato que dibuja TextoLeccion (el alumno ve exactamente eso), pero
// sin que el administrador tenga que saber los símbolos:
//   - barra con Título, Subtítulo, Negritas, Cursiva, Viñetas, Numerada, Enlace
//     y Color de letra
//     (también Ctrl+B, Ctrl+I y Ctrl+K);
//   - al pegar desde Word, Google Docs o una página web se conservan títulos,
//     negritas, listas numeradas y enlaces;
//   - pestaña "Vista previa" para ver cómo queda antes de guardar.
import { useRef, useState } from 'react';
import { Bold, Eye, Heading1, Heading2, Italic, Link2, List, ListOrdered, Palette, PencilLine } from 'lucide-react';
import TextoLeccion from '../TextoLeccion';
import { COLORES_TEXTO, colorear, envolver, htmlAFormato, insertarEnlace, prefijarLineas } from '../../lib/formatoTexto';
import './EditorTextoFormato.css';

export default function EditorTextoFormato({ id, value, onChange, rows = 10, placeholder }) {
  const ref = useRef(null);
  const [vista, setVista] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const texto = value || '';

  // Aplica un cambio y deja seleccionado lo que corresponde para seguir escribiendo.
  const aplicar = (resultado) => {
    onChange(resultado.texto);
    requestAnimationFrame(() => {
      const caja = ref.current;
      if (!caja) return;
      caja.focus();
      caja.setSelectionRange(resultado.inicio, resultado.fin);
    });
  };
  const seleccion = () => {
    const caja = ref.current;
    return caja ? [caja.selectionStart, caja.selectionEnd] : [texto.length, texto.length];
  };

  const acciones = {
    titulo: () => aplicar(prefijarLineas(texto, ...seleccion(), '# ', /^#\s+/)),
    subtitulo: () => aplicar(prefijarLineas(texto, ...seleccion(), '## ', /^##\s+/)),
    negritas: () => aplicar(envolver(texto, ...seleccion(), '**')),
    cursiva: () => aplicar(envolver(texto, ...seleccion(), '*')),
    vinetas: () => aplicar(prefijarLineas(texto, ...seleccion(), '- ', /^[-*]\s+/)),
    numerada: () => aplicar(prefijarLineas(texto, ...seleccion(), (i) => `${i + 1}. `, /^\d+[.)]\s+/)),
    enlace: () => {
      const [inicio, fin] = seleccion();
      const url = window.prompt('Pega la dirección del enlace (https://…):', 'https://');
      if (!url || !/^https?:\/\/\S+$/i.test(url.trim())) return;
      aplicar(insertarEnlace(texto, inicio, fin, url.trim()));
    },
  };

  const BOTONES = [
    ['titulo', Heading1, 'Título'],
    ['subtitulo', Heading2, 'Subtítulo'],
    ['negritas', Bold, 'Negritas (Ctrl+B)'],
    ['cursiva', Italic, 'Cursiva (Ctrl+I)'],
    ['vinetas', List, 'Lista con viñetas'],
    ['numerada', ListOrdered, 'Lista numerada'],
    ['enlace', Link2, 'Enlace (Ctrl+K)'],
  ];

  const alTeclear = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const tecla = e.key.toLowerCase();
    const accion = tecla === 'b' ? 'negritas' : tecla === 'i' ? 'cursiva' : tecla === 'k' ? 'enlace' : null;
    if (!accion) return;
    e.preventDefault();
    acciones[accion]();
  };

  // Pegar desde Word, Docs o una página web conserva el formato.
  const alPegar = (e) => {
    const html = e.clipboardData?.getData('text/html');
    if (!html) return;
    const convertido = htmlAFormato(html);
    if (!convertido) return;
    e.preventDefault();
    const [inicio, fin] = seleccion();
    const nuevo = texto.slice(0, inicio) + convertido + texto.slice(fin);
    aplicar({ texto: nuevo, inicio: inicio + convertido.length, fin: inicio + convertido.length });
  };

  return (
    <div className="etf">
      <div className="etf-barra" role="toolbar" aria-label="Formato del texto">
        <div className="etf-botones">
          {BOTONES.map((boton) => {
            const [clave, Icono, etiqueta] = boton;
            return (
            <button key={clave} type="button" title={etiqueta} aria-label={etiqueta} disabled={vista}
              onMouseDown={(e) => e.preventDefault()} onClick={acciones[clave]}>
              <Icono size={16} aria-hidden="true" />
            </button>
            );
          })}
          {/* Color de letra: se elige de una paleta corta para que siempre se lea bien. */}
          <span className="etf-color">
            <button type="button" title="Color de letra" aria-label="Color de letra" aria-expanded={paleta} disabled={vista}
              onMouseDown={(e) => e.preventDefault()} onClick={() => setPaleta((v) => !v)}>
              <Palette size={16} aria-hidden="true" />
            </button>
            {paleta && !vista && (
              <span className="etf-paleta" role="menu" aria-label="Elige un color">
                {COLORES_TEXTO.map(([color, nombre]) => (
                  <button key={color} type="button" role="menuitem" title={nombre} aria-label={`Letra ${nombre.toLowerCase()}`}
                    className={`etf-muestra tl-color--${color}`} onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setPaleta(false); aplicar(colorear(texto, ...seleccion(), color)); }}>
                    <span aria-hidden="true">A</span>
                  </button>
                ))}
                <button type="button" role="menuitem" className="etf-quitar-color" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setPaleta(false); aplicar(colorear(texto, ...seleccion(), '')); }}>
                  Sin color
                </button>
              </span>
            )}
          </span>
        </div>
        <div className="etf-pestanas" role="tablist" aria-label="Modo">
          <button type="button" role="tab" aria-selected={!vista} className={!vista ? 'activa' : ''} onClick={() => setVista(false)}>
            <PencilLine size={14} aria-hidden="true" /> Escribir
          </button>
          <button type="button" role="tab" aria-selected={vista} className={vista ? 'activa' : ''} onClick={() => setVista(true)}>
            <Eye size={14} aria-hidden="true" /> Vista previa
          </button>
        </div>
      </div>
      {vista ? (
        <div className="etf-vista">
          {texto.trim() ? <TextoLeccion texto={texto} /> : <p className="etf-vacio">Todavía no hay texto.</p>}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={alTeclear}
          onPaste={alPegar}
          className="lms-textarea etf-texto"
          placeholder={placeholder}
        />
      )}
      <small className="etf-ayuda">
        Selecciona el texto y usa los botones. Puedes pegar desde Word, Google Docs o una página web y se conservan títulos, negritas, listas y enlaces. Las direcciones <code>https://…</code> se vuelven enlace solas.
      </small>
    </div>
  );
}
