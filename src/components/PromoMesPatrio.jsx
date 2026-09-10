import { Sparkles } from 'lucide-react';
import { PROMO_MES_PATRIO, promoMesPatrioActiva } from '../lib/promoMesPatrio';

/* Aviso grande arriba del formulario de inscripción. Las fechas y el
   porcentaje viven en src/lib/promoMesPatrio.js. */
const AvisoMesPatrio = ({ porcentaje }) => {
  if (!promoMesPatrioActiva()) return null;

  return (
    <div className="ins-promo-patria" role="note">
      <span className="ins-promo-patria-icono" aria-hidden="true">
        <Sparkles size={20} />
      </span>
      <div className="ins-promo-patria-texto">
        <strong>Promoción del Mes Patrio: {Math.round(porcentaje * 100)}% de descuento directo</strong>
        <span>
          Ya está aplicado en el precio, sin código. Válido hasta el{' '}
          <b>{PROMO_MES_PATRIO.vigenciaTexto}</b>.
        </span>
      </div>
      <span className="ins-promo-patria-chip">−{Math.round(porcentaje * 100)}%</span>
    </div>
  );
};

export default AvisoMesPatrio;
