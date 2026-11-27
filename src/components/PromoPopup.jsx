// Ventana emergente de una promoción (póster + botón). Sale una sola vez por
// visita (sessionStorage) y solo mientras la promoción está vigente.
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './PromoPopup.css';

export default function PromoPopup({ id, imagen, alt, boton, enlace, retrasoMs = 1200 }) {
  const [abierto, setAbierto] = useState(false);
  const cerrarRef = useRef(null);
  const clave = `promo-vista:${id}`;

  const cerrar = useCallback(() => {
    setAbierto(false);
    try { sessionStorage.setItem(clave, '1'); } catch { /* sin almacenamiento */ }
  }, [clave]);

  useEffect(() => {
    let vista = false;
    try { vista = sessionStorage.getItem(clave) === '1'; } catch { /* sin almacenamiento */ }
    if (vista) return undefined;
    const t = setTimeout(() => setAbierto(true), retrasoMs);
    return () => clearTimeout(t);
  }, [clave, retrasoMs]);

  useEffect(() => {
    if (!abierto) return undefined;
    cerrarRef.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, cerrar]);

  if (!abierto) return null;
  return (
    <div className="promo-popup-fondo" onClick={cerrar} role="presentation">
      <div className="promo-popup" role="dialog" aria-modal="true" aria-label={alt} onClick={(e) => e.stopPropagation()}>
        <button ref={cerrarRef} type="button" className="promo-popup-cerrar" onClick={cerrar} aria-label="Cerrar">
          <X size={20} aria-hidden="true" />
        </button>
        <a href={enlace} onClick={cerrar} className="promo-popup-imagen">
          <img src={imagen} alt={alt} width="800" height="993" />
        </a>
        {boton && <a href={enlace} onClick={cerrar} className="promo-popup-boton">{boton}</a>}
      </div>
    </div>
  );
}
