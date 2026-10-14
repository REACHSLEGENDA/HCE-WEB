import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Panel que se abre a la derecha (en el celular ocupa toda la pantalla) para
// editar algo sin empujar la lista. Esc o la X piden cerrar: quien lo usa decide
// si pregunta antes por cambios sin guardar. Con `onSubmit` el panel es un
// formulario y Ctrl/Cmd+Enter también guarda.
//
// Se monta dentro del .admin-layout más cercano para heredar el tema (claro u oscuro).

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PanelLateral({ titulo, subtitulo, onCerrar, onSubmit, pie, cambios = false, ocupado = false, ancho = 560, children }) {
  const [contenedor, setContenedor] = useState(null);
  const panelRef = useRef(null);
  const idTitulo = useId();
  // Se lee en el efecto de abrir: el último onCerrar sin volver a enfocar.
  const cerrarRef = useRef(onCerrar);
  useEffect(() => { cerrarRef.current = onCerrar; }, [onCerrar]);

  // Al abrir: bloquea el desplazamiento de la página y enfoca el primer campo.
  // Al cerrar: devuelve el foco a donde estaba.
  useEffect(() => {
    if (!contenedor) return undefined;
    const previo = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primero = panelRef.current?.querySelector('.panel-lateral-cuerpo input, .panel-lateral-cuerpo textarea, .panel-lateral-cuerpo select, .panel-lateral-cuerpo button');
    (primero || panelRef.current)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      if (previo && typeof previo.focus === 'function' && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, [contenedor]);

  // Si el contenido cambia (p. ej. de elegir tipo al formulario) y el foco quedó
  // fuera, vuelve al panel para que Esc y Tab sigan funcionando.
  const esFormulario = !!onSubmit;
  useEffect(() => {
    if (contenedor && panelRef.current && !panelRef.current.contains(document.activeElement)) {
      panelRef.current.focus({ preventScroll: true });
    }
  }, [contenedor, titulo, esFormulario]);

  const alTeclear = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!ocupado) cerrarRef.current?.();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault();
      panelRef.current?.requestSubmit?.();
      return;
    }
    // El foco no se sale del panel con Tab.
    if (e.key === 'Tab' && panelRef.current) {
      const lista = [...panelRef.current.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === panelRef.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || document.activeElement === panelRef.current)) { e.preventDefault(); primero.focus(); }
    }
  };

  const Cuerpo = onSubmit ? 'form' : 'div';
  const panel = (
    <div className="panel-lateral-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) cerrarRef.current?.(); }}>
      <Cuerpo
        ref={panelRef}
        className="panel-lateral"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        style={{ '--panel-ancho': `${ancho}px` }}
        onKeyDown={alTeclear}
        onSubmit={onSubmit}
        noValidate={onSubmit ? true : undefined}
      >
        <header className="panel-lateral-cabecera">
          <div className="panel-lateral-titulos">
            <h3 id={idTitulo}>{titulo}</h3>
            {(subtitulo || cambios) && (
              <p>
                {subtitulo}
                {cambios && <span className="panel-lateral-cambios" role="status">Cambios sin guardar</span>}
              </p>
            )}
          </div>
          <button type="button" className="icon-action-btn" aria-label="Cerrar" title="Cerrar (Esc)" disabled={ocupado} onClick={() => cerrarRef.current?.()}>
            <X size={18} />
          </button>
        </header>
        <div className="panel-lateral-cuerpo">{children}</div>
        {pie && <footer className="panel-lateral-pie">{pie}</footer>}
      </Cuerpo>
    </div>
  );

  return (
    <>
      <span hidden ref={(nodo) => { if (nodo) setContenedor(nodo.closest('.admin-layout') || document.body); }} />
      {contenedor && createPortal(panel, contenedor)}
    </>
  );
}
