import { ShieldCheck } from 'lucide-react';
import './Partners.css';

const logos = [
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/logo.png",      alt: "Institución 1" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/534.png",       alt: "Institución 2" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/65-1.png",      alt: "Institución 3" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/sdfgf.png",     alt: "Institución 4" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/ecmo-couj.png", alt: "Institución 5" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/ecmo-coujj.png",alt: "Institución 6" },
  { src: "https://healthcareexp.com/wp-content/uploads/2024/12/56.png",        alt: "Institución 7" },
  { src: "https://healthcareexp.com/wp-content/uploads/2025/01/SS.png",        alt: "Institución 8" },
  { src: "https://healthcareexp.com/wp-content/uploads/2026/03/images.png",    alt: "Institución 9" },
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
        Instituciones, Sociedades Científicas y Centros de Prestigio Internacional que han confiado en nosotros o de los que forman parte nuestros docentes.
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
