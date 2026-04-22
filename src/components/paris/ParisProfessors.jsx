import { Award, BookOpen, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ParisProfessors.css';

const professors = [
  {
    name: 'Prof. Alain Combes',
    role: 'Jefe UCI Pitié-Salpêtrière, Paris',
    image: '/assets/componentes/Alain-Combes.jpg',
    description: 'Líder en uno de los centros de ECMO más grandes del mundo. Profesor de Medicina de Cuidados Intensivos en la Sorbonne Université. Investigador principal de EOLIA y +372 publicaciones.',
    highlights: ['+372 Publicaciones', 'Presidente EuroELSO 2017-2020']
  },
  {
    name: 'Prof. Matthieu Schmidt',
    role: 'Médico UCI Pitié-Salpêtrière, Paris',
    image: '/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-7-1.jpeg',
    description: 'Profesor de Medicina de Cuidados Intensivos. Presidente del Comité Científico de EuroELSO 2018-2022. Investigador de 3 ensayos clínicos multicéntricos y +235 publicaciones.',
    highlights: ['+235 Publicaciones', 'Comité EuroELSO 2018-2022']
  },
  {
    name: 'Enf. Hugo Guillou',
    role: 'CEO Pratico Santé & Simulación',
    image: '/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-10-1.jpeg',
    description: 'Enfermero Especialista en ECMO desde 2009. Creador del Serious Game Digital ECMO SIM y Entrenador de Simulación certificado por ELSO en la Universidad Drexel.',
    highlights: ['ECMO SIM Creator', 'ELSO Trainer']
  },
  {
    name: 'Enf. Emric Besnard',
    role: 'Presidente Pratico Santé',
    image: '/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-7-1.jpeg',
    description: 'Especialista en Cuidados Intensivos HMA Pitié-Salpêtrière (2012-2018). Co-desarrollador de la herramienta líder ECMO SIM y Entrenador de Simulación con aval internacional.',
    highlights: ['Simulation Leader', 'ELSO Certified']
  }
];

const ParisProfessors = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="paris-professors" ref={ref}>
      <div className={`prof-container ${inView ? 'is-visible' : ''}`}>
        
        <div className="prof-header text-center">
          <div className="section-badge"><Award size={16}/> Docencia Mundial</div>
          <h2 className="section-title-light">Liderado por la Élite Mundial</h2>
          <p className="section-subtitle-light">
            Vive la Experiencia de Paris en Latinoamérica. Fórmate con el equipo clínico responsable de uno de los centros de ECMO más prestigiosos y activos a nivel global.
          </p>
        </div>

        <div className="prof-grid">
          {professors.map((prof, index) => (
            <div className="prof-card" key={index}>
              <div className="prof-image-wrapper">
                <img src={prof.image} alt={prof.name} className="prof-image" />
                <div className="prof-overlay">
                  <div className="prof-highlights">
                    {prof.highlights.map((h, i) => (
                      <span key={i} className="highlight-tag">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="prof-info">
                <h3>{prof.name}</h3>
                <h4 className="prof-role"><Building2 size={14}/> {prof.role}</h4>
                <p>{prof.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="prof-cta text-center">
          <Link to="/inscripciones-diploma-paris-ecmo" className="btn-paris-gold">
            Reserva tu Lugar con Nosotros
          </Link>
        </div>

      </div>
    </section>
  );
};

export default ParisProfessors;
