import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { Users, Globe, GraduationCap, Laptop2, BarChart3 } from 'lucide-react';
import './Impact.css';

/* ---------------------------------------------------------------------------
 * Sección "Impacto académico global".
 *
 * El contador va con requestAnimationFrame y no con setInterval: el intervalo
 * anterior avanzaba a saltos fijos y dejaba a la vista cifras intermedias sin
 * sentido (2000 se leía un instante como "1.92k"). Con rAF el número sigue el
 * refresco real de la pantalla, frena al final con una curva de salida y
 * siempre aterriza exacto en el valor objetivo.
 * ------------------------------------------------------------------------ */

const DURACION_MS = 1800;

// Desaceleración suave: rápido al principio, casi detenido al final.
const salidaSuave = (t) => 1 - Math.pow(1 - t, 3);

const movimientoReducido = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const formatear = (n) => n.toLocaleString('es-MX');

const useConteo = (objetivo, activo) => {
  // Quien pidió menos movimiento arranca ya en la cifra final: no hay animación
  // que ver, así que tampoco hay estado intermedio que renderizar.
  const [valor, setValor] = useState(() => (movimientoReducido() ? objetivo : 0));

  useEffect(() => {
    if (!activo || movimientoReducido()) return;

    let frame;
    let inicio = null;

    const paso = (ahora) => {
      if (inicio === null) inicio = ahora;
      const avance = Math.min((ahora - inicio) / DURACION_MS, 1);
      setValor(Math.round(salidaSuave(avance) * objetivo));
      if (avance < 1) frame = requestAnimationFrame(paso);
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [objetivo, activo]);

  return valor;
};

const METRICAS = [
  {
    icon: Users,
    objetivo: 2000,
    mas: true,
    titulo: 'Alumnos profesionales',
    detalle: <>Egresados de nuestros programas de <strong>entrenamiento intensivo</strong>.</>,
  },
  {
    icon: Globe,
    objetivo: 10000,
    mas: true,
    titulo: 'Alcance global',
    detalle: <>Especialistas conectados a través de nuestra <strong>red educativa</strong>.</>,
  },
  {
    icon: GraduationCap,
    objetivo: 100,
    titulo: 'Docentes internacionales',
    detalle: <>Expertos de <strong>centros líderes</strong> en Europa, EE. UU. y LATAM.</>,
  },
  {
    icon: Laptop2,
    objetivo: 50,
    titulo: 'Clases magistrales',
    detalle: <>Contenido premium disponible 24/7 en nuestro <a href="/login" className="imp-link">Portal Científico</a>.</>,
  },
];

const TarjetaMetrica = ({ icon, objetivo, mas, titulo, detalle, orden, activa }) => {
  // Alias en mayúscula: JSX necesita el componente capitalizado y así ESLint no
  // lo toma por un parámetro sin usar (no hay plugin de React que lea el JSX).
  const Icono = icon;
  const tarjetaRef = useRef(null);
  const valor = useConteo(objetivo, activa);

  // Progreso del arco: el mismo avance que el número, para que la cifra y el
  // trazo terminen juntos.
  const progreso = objetivo > 0 ? valor / objetivo : 0;
  const PERIMETRO = 226; // 2πr con r = 36

  // Foco de luz que sigue al cursor dentro de la tarjeta. Se escribe en
  // variables CSS para no re-renderizar React en cada movimiento del ratón.
  const alMover = (e) => {
    const caja = tarjetaRef.current?.getBoundingClientRect();
    if (!caja) return;
    tarjetaRef.current.style.setProperty('--foco-x', `${e.clientX - caja.left}px`);
    tarjetaRef.current.style.setProperty('--foco-y', `${e.clientY - caja.top}px`);
  };

  return (
    <article
      ref={tarjetaRef}
      className="imp-card imp-anim"
      style={{ '--orden': orden }}
      onPointerMove={alMover}
    >
      <div className="imp-card-foco" aria-hidden="true" />

      <div className="imp-card-top">
        <span className="imp-icon"><Icono size={26} /></span>

        <svg className="imp-arc" viewBox="0 0 80 80" aria-hidden="true">
          <circle className="imp-arc-pista" cx="40" cy="40" r="36" />
          <circle
            className="imp-arc-trazo"
            cx="40" cy="40" r="36"
            strokeDasharray={PERIMETRO}
            strokeDashoffset={PERIMETRO * (1 - progreso)}
          />
        </svg>
      </div>

      <p className="imp-number">
        {mas && <span className="imp-plus">+</span>}
        {formatear(valor)}
      </p>

      <h3 className="imp-label">{titulo}</h3>
      <p className="imp-detail">{detalle}</p>
    </article>
  );
};

const Impact = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  // Sin triggerOnce: apaga las animaciones de fondo al salir de pantalla.
  const { ref: refPantalla, inView: enPantalla } = useInView({ threshold: 0 });

  return (
    <section className="imp-section" id="impacto" ref={refPantalla} data-activo={enPantalla || undefined}>
      <div className="imp-aurora" aria-hidden="true" />
      <div className="imp-rays" aria-hidden="true" />

      <div className="hce-container" ref={ref} data-visible={inView || undefined}>
        <header className="imp-header">
          <div className="section-badge badge-oscuro imp-anim" style={{ '--orden': 0 }}>
            <BarChart3 size={16} /> Métricas de éxito
          </div>
          <h2 className="imp-title imp-anim" style={{ '--orden': 1 }}>
            Impacto <span className="imp-title-accent">académico</span> global
          </h2>
          <p className="imp-subtitle imp-anim" style={{ '--orden': 2 }}>
            Lideramos la educación clínica avanzada con resultados medibles y una comunidad
            en expansión.
          </p>
        </header>

        <div className="imp-grid">
          {METRICAS.map((m, i) => (
            <TarjetaMetrica key={m.titulo} {...m} orden={3 + i} activa={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Impact;
