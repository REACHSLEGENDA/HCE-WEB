import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Users, Activity, CheckCircle2 } from 'lucide-react';
import './ParisMethodology.css';

const ParisMethodology = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="paris-methodology" ref={ref}>
      <div className={`paris-meth-container ${inView ? 'is-visible' : ''}`}>
        
        <div className="meth-header text-center">
          <h2 className="section-title-dark">La Metodología de la Experiencia</h2>
          <p className="section-subtitle-dark">
            Este programa integral y práctico de aprendizaje te proporcionará las habilidades para dominar el soporte ECMO en pacientes con insuficiencia respiratoria y/o cardiocirculatoria.
          </p>
        </div>

        <div className="meth-grid">
          {/* Card 1 */}
          <div className="meth-card">
            <div className="meth-icon-wrap">
              <Users size={32} />
            </div>
            <h3>Dinámica e Interactiva</h3>
            <p>Conferencias, estudio profundo de casos clínicos y extenso tiempo dedicado a preguntas y simulación con dispositivos extracorpóreos.</p>
          </div>

          {/* Card 2 */}
          <div className="meth-card featured">
            <div className="meth-icon-wrap accent">
              <svg viewBox="0 0 640 512" width="32" height="32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M232 224h56v56a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-56h56a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8h-56v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56h-56a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8zM576 48a48.14 48.14 0 0 0-48-48H112a48.14 48.14 0 0 0-48 48v336h512zm-64 272H128V64h384zm112 96H381.54c-.74 19.81-14.71 32-32.74 32H288c-18.69 0-33-17.47-32.77-32H16a16 16 0 0 0-16 16v16a64.19 64.19 0 0 0 64 64h512a64.19 64.19 0 0 0 64-64v-16a16 16 0 0 0-16-16z"></path></svg>
            </div>
            <h3>¿Conoces ECMO SIM?</h3>
            <p className="mb-3">En esta formación tendrás la oportunidad de aprender sin poner en riesgo la vida de tus pacientes. Usted será capaz de:</p>
            <ul className="meth-sim-list">
              <li>• Jugar el rol de Médic@ o Enfermer@ en ECMO V-V o V-A.</li>
              <li>• Tomar decisiones críticas sobre el manejo clínico.</li>
              <li>• Resolver complicaciones mecánicas y sistémicas.</li>
              <li>• Liderar un equipo ante una emergencia en ECMO.</li>
            </ul>
            <p className="mt-3 text-sm" style={{ color: '#fbc531' }}><em>* Disponible para adquirirlo con precio especial como alumno del diploma.</em></p>
          </div>

          {/* Card 3 */}
          <div className="meth-card">
            <div className="meth-icon-wrap">
              <Activity size={32} />
            </div>
            <h3>Multidisciplinario</h3>
            <p>Dirigido a médicos intensivistas, neumólogos, cirujanos, anestesiólogos, y profesionales de enfermería en programas ECMO.</p>
          </div>
        </div>

        <div className="meth-showcase">
          <div className="meth-showcase-text">
            <h2>Lleva ECMO Sim a tu Hospital</h2>
            <p>¿Te gustaría que nos acercáramos a tu centro médico para conversar sobre ECMO? Ofrecemos demostraciones de nuestro software y conferencias magistrales.</p>
            <ul className="meth-list">
              <li><CheckCircle2 size={18} className="icon-gold"/> Entrenamiento intensivo in situ.</li>
              <li><CheckCircle2 size={18} className="icon-gold"/> Demostración de ECMO SIM para tu departamento.</li>
              <li><CheckCircle2 size={18} className="icon-gold"/> Mejores prácticas académicas de élite mundial.</li>
            </ul>
            <a href="https://healthcareexp.com/contacto/" className="btn-outline-dark mt-4">
              Contáctanos Ahora
            </a>
          </div>
          <div className="meth-showcase-image">
            <img src="/assets/paris/DSC4952.jpg" alt="ECMO Sim Demo en Hospital" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default ParisMethodology;
