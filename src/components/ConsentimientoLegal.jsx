import { Link } from 'react-router-dom';

/* ---------------------------------------------------------------------------
 * Bloque legal de las páginas de inscripción.
 *
 * Va compartido a propósito, aunque las tres páginas de inscripción sean casi
 * gemelas por decisión de diseño: este texto es legal y tiene que decir
 * exactamente lo mismo en los tres formularios. Con el bloque copiado tres
 * veces, cualquier corrección futura se aplicaría en dos y se olvidaría en el
 * tercero.
 *
 * Contenido tomado del documento "Leyendas web y presentaciones HCE",
 * apartados A.1 (aviso de acceso), A.2 (casillas de consentimiento) y A.3
 * (aviso de privacidad simplificado).
 * ------------------------------------------------------------------------ */

const CORREO = 'info@healthcareexp.com';

const ConsentimientoLegal = ({
  consentPrimary,
  setConsentPrimary,
  consentSecondary,
  setConsentSecondary,
}) => (
  <div className="ins-privacy-block">
    {/* A.1 — Aviso de acceso y contenidos */}
    <p className="ins-privacy-text">
      El acceso a nuestros programas es personal e intransferible. Los contenidos,
      materiales y grabaciones están protegidos por la Ley Federal del Derecho de Autor
      y se te otorgan bajo una licencia de uso individual con fines formativos.
    </p>
    <p className="ins-privacy-text">
      Compartir tus credenciales o reproducir, distribuir o publicar los materiales dará
      lugar a la cancelación de tu acceso, sin perjuicio de las acciones legales que
      correspondan.
    </p>

    {/* A.2 — Casilla obligatoria.
        Los Términos y Condiciones y el Acuerdo de Confidencialidad todavía no
        existen como página en el sitio, así que van sin enlace: es preferible a
        mandar al alumno a un enlace muerto justo donde declara haberlos leído. */}
    <label className="ins-consent-row">
      <input
        type="checkbox"
        checked={consentPrimary}
        onChange={(e) => setConsentPrimary(e.target.checked)}
      />
      <span>
        He leído y acepto los Términos y Condiciones, el Acuerdo de Confidencialidad y el{' '}
        <Link to="/aviso-de-privacidad" target="_blank" rel="noreferrer" className="ins-consent-link">
          Aviso de Privacidad
        </Link>.
      </span>
    </label>

    {/* A.2 — Casilla opcional: puede quedarse sin marcar y no bloquea el pago. */}
    <label className="ins-consent-row">
      <input
        type="checkbox"
        checked={consentSecondary}
        onChange={(e) => setConsentSecondary(e.target.checked)}
      />
      <span>
        Autorizo que mis datos se usen para enviarme información sobre futuros programas
        y promociones. No es necesario para inscribirme y puedo cancelarlo cuando quiera.
      </span>
    </label>

    {/* A.3 — Aviso de privacidad simplificado. Va plegado para no empujar el
        botón de pago fuera de la pantalla, pero queda a un toque. */}
    <details className="ins-aviso">
      <summary className="ins-aviso-titulo">Aviso de Privacidad</summary>

      <div className="ins-aviso-cuerpo">
        <p>
          Healthcare Training Experience, S.C., con domicilio en Cerrada del Tordillo 63,
          colonia Villas de la Hacienda, Atizapán de Zaragoza, Estado de México, C.P. 52929,
          es responsable del tratamiento de tus datos personales.
        </p>
        <p>
          Los utilizamos para procesar tu inscripción, validar tu perfil académico, darte
          acceso a la plataforma, dar seguimiento a tu desempeño, emitir tu constancia y
          cumplir con las obligaciones fiscales correspondientes.
        </p>
        <p>
          Consulta el Aviso de Privacidad Integral en{' '}
          <Link to="/aviso-de-privacidad" target="_blank" rel="noreferrer">
            healthcareexp.com/aviso-de-privacidad
          </Link>
          , donde encontrarás las finalidades adicionales, las transferencias que requieren
          tu consentimiento y el procedimiento para ejercer tus derechos de acceso,
          rectificación, cancelación y oposición, o para revocar tu consentimiento. También
          puedes escribirnos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.
        </p>
      </div>
    </details>
  </div>
);

export default ConsentimientoLegal;
