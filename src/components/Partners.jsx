import { ShieldCheck } from 'lucide-react';
import './Partners.css';

const logos = [
  { src: "/assets/componentes/logo.webp",       alt: "Institución 1" },
  { src: "/assets/componentes/534.webp",        alt: "Institución 2" },
  { src: "/assets/paginas/65-1.png",            alt: "Institución 3" },
  { src: "/assets/componentes/sdfgf.webp",      alt: "Institución 4" },
  { src: "/assets/componentes/ecmo-couj.webp",  alt: "Institución 5" },
  { src: "/assets/componentes/ecmo-coujj.png",  alt: "Institución 6" },
  { src: "/assets/componentes/56.webp",         alt: "Institución 7" },
  { src: "/assets/componentes/SS.webp",         alt: "Institución 8" },
  { src: "/assets/componentes/images.webp",     alt: "Institución 9" },
];

const Partners = () => (
  <section className="partners-section">
    <div className="hce-container partners-header">
      <div className="partners-badge">
        <ShieldCheck size={15} />
        Confianza Global
      </div>
      <h2 className="partners-title">Respaldados por la Excelencia</h2>
      <p className="partners-sub">
        Instituciones, Sociedades Científicas y Centros de Prestigio Internacional de los que forman parte nuestros docentes.
      </p>
    </div>

    <div className="partners-marquee-wrap">
      <div className="partners-fade partners-fade--left" />
      <div className="partners-fade partners-fade--right" />
      <div className="partners-track">
        {/* Duplicated for seamless infinite loop */}
        {[...logos, ...logos].map((logo, i) => (
          <div key={i} className="partners-logo-item">
            <img src={logo.src} alt={logo.alt} />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Partners;
