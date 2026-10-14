import React, { useEffect, useRef } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import './NavegacionMovil.css';

// Navegación del portal del alumno en celular: barra fija abajo con los
// destinos principales y "Más" para el resto, en una hoja que sube desde abajo.
// En escritorio no se muestra (ahí está el menú lateral).

export default function NavegacionMovil({ principales, secundarios, activo, onIr, abierta, onAbrir, onCerrar }) {
  const hojaRef = useRef(null);
  const cerrarRef = useRef(onCerrar);
  useEffect(() => { cerrarRef.current = onCerrar; }, [onCerrar]);
  const enMas = secundarios.some((s) => s.id === activo);

  // La hoja se cierra con Escape y recibe el foco al abrirse.
  useEffect(() => {
    if (!abierta) return undefined;
    const previo = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // El robot del chat flota encima de todo y tapaba la última fila de la hoja.
    document.body.classList.add('nav-movil-abierta');
    hojaRef.current?.focus();
    const alTeclear = (e) => {
      if (e.key === 'Escape') cerrarRef.current();
      if (e.key !== 'Tab') return;
      const botones = [...(hojaRef.current?.querySelectorAll('button:not([disabled]), a[href]') || [])];
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (!primero) return;
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === hojaRef.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || document.activeElement === hojaRef.current)) { e.preventDefault(); primero.focus(); }
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflow;
      document.body.classList.remove('nav-movil-abierta');
      if (document.contains(previo)) previo?.focus();
    };
  }, [abierta]);

  return (
    <>
      <nav className="nav-movil" aria-label="Navegación principal">
        {principales.map(({ id, label, corto, icon, contador }) => (
          <button
            key={id}
            type="button"
            className={`nav-movil-item${activo === id ? ' activo' : ''}`}
            aria-current={activo === id ? 'page' : undefined}
            onClick={() => onIr(id)}
          >
            <span className="nav-movil-icono">
              {React.createElement(icon, { size: 21, 'aria-hidden': true })}
              {contador > 0 && <span className="nav-movil-contador" aria-label={`${contador} sin leer`}>{contador > 99 ? '99+' : contador}</span>}
            </span>
            <span className="nav-movil-texto">{corto || label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`nav-movil-item${enMas || abierta ? ' activo' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={abierta}
          onClick={abierta ? onCerrar : onAbrir}
        >
          <span className="nav-movil-icono"><MoreHorizontal size={21} aria-hidden="true" /></span>
          <span className="nav-movil-texto">Más</span>
        </button>
      </nav>

      {abierta && (
        <div className="nav-movil-fondo" onClick={onCerrar}>
          <div
            ref={hojaRef}
            className="nav-movil-hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Más opciones"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-movil-hoja-cabecera">
              <span className="nav-movil-asa" aria-hidden="true" />
              <strong>Más opciones</strong>
              <button type="button" className="nav-movil-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <ul className="nav-movil-opciones">
              {secundarios.map(({ id, label, icon, peligro, accion }) => (
                <li key={id}>
                  <button
                    type="button"
                    className={`nav-movil-opcion${activo === id ? ' activo' : ''}${peligro ? ' peligro' : ''}`}
                    onClick={() => { onCerrar(); if (accion) accion(); else onIr(id); }}
                  >
                    {React.createElement(icon, { size: 20, 'aria-hidden': true })}
                    <span>{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
