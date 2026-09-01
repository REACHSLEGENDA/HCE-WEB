import { useRef, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Layout, Globe, Cpu, Zap, ArrowUpRight, Smartphone } from 'lucide-react';
import './Campus.css';

/* ---------------------------------------------------------------------------
 * Sección "Evoluciona tu formación".
 *
 * El movimiento se apoya en tres capas, todas sobre `transform` y `opacity`
 * para que el navegador las resuelva en la GPU y la sección no provoque
 * reflows al hacer scroll:
 *
 *   1. Entrada escalonada al aparecer en pantalla (--orden por elemento).
 *   2. Flotación lenta y continua del conjunto de mockups.
 *   3. Paralaje 3D que sigue al puntero, amortiguado con requestAnimationFrame.
 *
 * El paralaje se apaga solo en pantallas táctiles y con `prefers-reduced-motion`:
 * sin puntero fino no aporta nada y en móvil solo gastaría batería.
 * ------------------------------------------------------------------------ */

const CARACTERISTICAS = [
  { icon: Zap,        texto: 'Acceso 24/7' },
  { icon: Smartphone, texto: 'App Móvil' },
  { icon: Globe,      texto: 'Comunidad internacional' },
  { icon: Layout,     texto: 'Recursos exclusivos' },
];


// El mockup principal lleva barra de navegador; los otros dos van sueltos
// detrás, que es lo que da la sensación de pila.
const MOCKUPS = [
  { src: '/assets/componentes/campus-dashboard.webp', alt: 'Panel principal del campus virtual HCE', clase: 'cmp-shot-main', barra: true },
  { src: '/assets/componentes/campus-cursos.webp',    alt: 'Catálogo de cursos del campus HCE',      clase: 'cmp-shot-front' },
];

const movimientoReducido = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const punteroFino = () =>
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

const Campus = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  // Segundo observador, este SIN triggerOnce: sirve para parar las animaciones
  // decorativas cuando la sección sale de pantalla. Una animación infinita que
  // sigue corriendo fuera de vista gasta GPU y batería para nada.
  const { ref: refPantalla, inView: enPantalla } = useInView({ threshold: 0 });
  const escenaRef = useRef(null);
  // Ni el tipo de puntero ni la preferencia de movimiento cambian a media
  // sesión, así que se resuelven una sola vez al montar.
  const [conParalaje] = useState(() => punteroFino() && !movimientoReducido());

  useEffect(() => {
    const escena = escenaRef.current;
    if (!conParalaje || !escena) return;

    // El evento de ratón dispara muchas más veces de las que el navegador
    // pinta. Guardamos el último objetivo y lo aplicamos una vez por frame,
    // acercándonos poco a poco para que el giro se sienta con inercia.
    let objetivoX = 0, objetivoY = 0;
    let actualX = 0, actualY = 0;
    let frame = null;

    const animar = () => {
      actualX += (objetivoX - actualX) * 0.08;
      actualY += (objetivoY - actualY) * 0.08;
      escena.style.setProperty('--giro-y', `${actualX.toFixed(2)}deg`);
      escena.style.setProperty('--giro-x', `${actualY.toFixed(2)}deg`);

      // Paramos el bucle cuando ya no queda movimiento apreciable.
      if (Math.abs(objetivoX - actualX) > 0.01 || Math.abs(objetivoY - actualY) > 0.01) {
        frame = requestAnimationFrame(animar);
      } else {
        frame = null;
      }
    };

    const arrancar = () => {
      if (frame === null) frame = requestAnimationFrame(animar);
    };

    const alMover = (e) => {
      const caja = escena.getBoundingClientRect();
      const x = (e.clientX - caja.left) / caja.width - 0.5;   // -0.5 … 0.5
      const y = (e.clientY - caja.top) / caja.height - 0.5;
      objetivoX = x * 14;    // grados de giro horizontal
      objetivoY = y * -10;   // vertical, invertido para que siga al cursor
      arrancar();
    };

    const alSalir = () => {
      objetivoX = 0;
      objetivoY = 0;
      arrancar();
    };

    escena.addEventListener('pointermove', alMover);
    escena.addEventListener('pointerleave', alSalir);
    return () => {
      escena.removeEventListener('pointermove', alMover);
      escena.removeEventListener('pointerleave', alSalir);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [conParalaje]);

  return (
    <section className="cmp-section" id="campus" ref={refPantalla} data-activo={enPantalla || undefined}>
      <div className="cmp-aurora" aria-hidden="true" />
      <div className="cmp-grid-bg" aria-hidden="true" />

      <div className="hce-container cmp-layout" ref={ref} data-visible={inView || undefined}>

        <div className="cmp-copy">
          <div className="section-badge badge-oscuro cmp-anim" style={{ '--orden': 0 }}>
            <Cpu size={14} /> Campus virtual HCE
          </div>

          <h2 className="cmp-title cmp-anim" style={{ '--orden': 1 }}>
            Evoluciona tu <span className="cmp-title-accent">formación</span>
          </h2>

          <p className="cmp-lead cmp-anim" style={{ '--orden': 2 }}>
            Únete al ecosistema digital líder en Latinoamérica y potencia tu carrera profesional
            con nuestra plataforma inteligente que combina sesiones en vivo y contenido científico
            a tu ritmo, siempre guiado por expertos.
          </p>

          <ul className="cmp-features">
            {CARACTERISTICAS.map(({ icon, texto }, i) => {
              const Icono = icon;
              return (
                <li key={texto} className="cmp-feature cmp-anim" style={{ '--orden': 3 + i }}>
                  <span className="cmp-feature-icon"><Icono size={20} /></span>
                  <span className="cmp-feature-text">{texto}</span>
                </li>
              );
            })}
          </ul>

          <a
            href="https://campus.healthcareexp.com/plus/login"
            target="_blank"
            rel="noreferrer"
            className="cmp-cta cmp-anim"
            style={{ '--orden': 7 }}
          >
            <span>Entrar al Campus</span>
            <ArrowUpRight size={18} />
          </a>
        </div>

        <div
          className="cmp-scene cmp-anim"
          style={{ '--orden': 2 }}
          ref={escenaRef}
          data-paralaje={conParalaje || undefined}
        >
          <div className="cmp-halo" aria-hidden="true" />

          <div className="cmp-stack">
            {MOCKUPS.map(({ src, alt, clase, barra }) => (
              <figure key={src} className={`cmp-shot ${clase}`}>
                {barra && (
                  <div className="cmp-window-bar" aria-hidden="true">
                    <span className="cmp-dot" />
                    <span className="cmp-dot" />
                    <span className="cmp-dot" />
                    <span className="cmp-window-url">campus.healthcareexp.com</span>
                  </div>
                )}
                <img src={src} alt={alt} loading="lazy" decoding="async" />
              </figure>
            ))}
            <div className="cmp-scan" aria-hidden="true" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default Campus;
