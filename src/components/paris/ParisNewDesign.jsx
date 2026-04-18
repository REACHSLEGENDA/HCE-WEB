import React, { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import './ParisNewDesign.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const ParisNewDesign = () => {

    useEffect(() => {
        const revealElements = document.querySelectorAll('.reveal, .section-title, .welcome-text, .audience-box');
        revealElements.forEach(el => el.classList.add('reveal'));

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));

        return () => {
            revealElements.forEach(el => observer.unobserve(el));
        };
    }, []);

    return (
      <div className="paris-page-wrapper">
        <Navbar />
        
        <div className="paris-redesign">
            {/* HERO */}
            <section className="hero">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="h1-style">¡Conviértete en un especialista en <span className="gradient-text">ECMO</span>!</div>
                    <p className="hero-sub">Certifícate con la más alta tecnología de talla internacional.</p>
                    <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Regístrate</a>
                </div>
            </section>

            {/* SECTION 1: WELCOME & CAROUSEL */}
            <section id="welcome" className="section-padding">
                <div className="container">
                    <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto 4rem' }}>
                        <div className="section-title">
                            <span className="gradient-text">Paris International Diploma in ECMO &amp; Simulation Course</span> en Latinoamérica.
                        </div>
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                            Vive la experiencia teórico-práctica liderada por expertos mundiales y certifícate como un profesional en soporte ECMO.
                        </p>
                    </div>
                </div>

                <div className="carousel-container">
                    <div style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Outfit', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 700 }}>Dirigido a especialistas en:</div>
                    <div className="carousel-track">
                        {/* First set of tags */}
                        <span className="tag">Intensivistas</span>
                        <span className="tag">Cardiólogos</span>
                        <span className="tag">Neumólogos</span>
                        <span className="tag">Cirujanos</span>
                        <span className="tag">Anestesiólogos</span>
                        <span className="tag">Médicos de Urgencias</span>
                        <span className="tag">Enfermeras/os</span>
                        <span className="tag">Perfusionistas</span>
                        <span className="tag">Terapeutas Respiratorios</span>
                        {/* Duplicate set for infinite effect */}
                        <span className="tag">Intensivistas</span>
                        <span className="tag">Cardiólogos</span>
                        <span className="tag">Neumólogos</span>
                        <span className="tag">Cirujanos</span>
                        <span className="tag">Anestesiólogos</span>
                        <span className="tag">Médicos de Urgencias</span>
                        <span className="tag">Enfermeras/os</span>
                        <span className="tag">Perfusionistas</span>
                        <span className="tag">Terapeutas Respiratorios</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>Certifícate</a>
                    </div>
                </div>
            </section>

            {/* SECTION 2: EXPERIENCE LEAD */}
            <section className="experience-lead reveal">
                <div className="container">
                    <div className="experience-lead-text">
                        <div className="h4-style" style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Aprende de los expertos</div>
                        <div className="h2-style" style={{ fontSize: '2.5rem', lineHeight: '1.2', marginBottom: '2rem' }}>Nuestro diplomado está liderado por el <span className="gradient-text">Prof. Alain Combes</span></div>
                        <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.7' }}>
                            Jefe de la unidad de cuidados intensivos del <strong>Hospital La Pitié-Salpétrière</strong> de París, Francia, quien con su equipo ha entrenado a más de 2000 profesionales de la salud a nivel internacional.
                        </p>
                        <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>INSCRIBETE AHORA</a>
                    </div>
                    <div className="experience-lead-img">
                        <img src="https://healthcareexp.com/wp-content/uploads/2025/04/DSC_0164.jpg" alt="Prof. Alain Combes Podium" />
                    </div>
                </div>
            </section>

            {/* SECTION 3: EXPERTS */}
            <section className="section-padding" id="experts">
                <div className="container">
                    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                        <div className="section-title">
                            La experiencia de <span className="gradient-text">París</span> en Latinoamérica
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Conoce a nuestros expertos:</p>
                    </div>
                    
                    <div className="faculty-grid">
                        {/* Prof 1 */}
                        <div className="faculty-card reveal">
                            <div className="faculty-img-container">
                                <img src="https://healthcareexp.com/wp-content/uploads/2024/11/Alain-Combes.jpg" alt="Prof. Alain Combes" className="faculty-img" />
                            </div>
                            <div className="faculty-info">
                                <span className="faculty-role-tag">Director del Programa</span>
                                <div className="faculty-name">Prof. Alain Combes</div>
                                <div className="faculty-bio">
                                    Jefe de la UCI del Hosp. Pitié-Salpêtrière, Paris. Investigador principal de EOLIA. +372 publicaciones.
                                </div>
                            </div>
                        </div>
                        {/* Prof 2 */}
                        <div className="faculty-card reveal">
                            <div className="faculty-img-container">
                                <img src="https://healthcareexp.com/wp-content/uploads/2024/11/Alain-Combes.png" alt="Prof. Matthieu Schmidt" className="faculty-img" />
                            </div>
                            <div className="faculty-info">
                                <span className="faculty-role-tag">Presidente Científico</span>
                                <div className="faculty-name">Prof. Matthieu Schmidt</div>
                                <div className="faculty-bio">
                                    Médico de la UCI del Hosp. Pitié-Salpêtrière. Presidente del Comité Científico de EuroELSO (2018-2022).
                                </div>
                            </div>
                        </div>
                        {/* Prof 3 */}
                        <div className="faculty-card reveal">
                            <div className="faculty-img-container">
                                <img src="https://healthcareexp.com/wp-content/uploads/2024/11/WhatsApp-Image-2024-04-09-at-11.02.32-10-1-1152x1536.jpeg" alt="Enf. Hugo Guillou" className="faculty-img" />
                            </div>
                            <div className="faculty-info">
                                <span className="faculty-role-tag">CEO Practico Santé</span>
                                <div className="faculty-name">Enf. Hugo Guillou</div>
                                <div className="faculty-bio">
                                    Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador de Simulación ELSO. Creador de ECMO SIM.
                                </div>
                            </div>
                        </div>
                        {/* Prof 4 */}
                        <div className="faculty-card reveal">
                            <div className="faculty-img-container">
                                <img src="https://healthcareexp.com/wp-content/uploads/2024/11/WhatsApp-Image-2024-04-09-at-11.02.32-7-1-1152x1536.jpeg" alt="Enf. Emric Besnard" className="faculty-img" />
                            </div>
                            <div className="faculty-info">
                                <span className="faculty-role-tag">Presidente Practico Santé</span>
                                <div className="faculty-name">Enf. Emric Besnard</div>
                                <div className="faculty-bio">
                                    Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador de Simulación ELSO. Co-creador de ECMO SIM.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                        <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>Inscríbete ahora</a>
                    </div>
                </div>
            </section>

            {/* SECTION 4: METHODOLOGY */}
            <section className="section-padding methodology reveal">
                <div className="container">
                    <div className="method-content">
                        <div className="method-image reveal">
                            <img src="https://healthcareexp.com/wp-content/uploads/2025/04/DSC_4075.jpg" alt="Simulación ECMO" />
                        </div>
                        <div className="method-text reveal">
                            <div className="section-title" style={{ color: 'white', fontSize: '3rem', marginBottom: '2rem' }}>
                                <span className="gradient-text">Metodología</span> de la Experiencia
                            </div>
                            <p style={{ marginBottom: '2.5rem', opacity: 0.8, fontSize: '1.15rem' }}>Entrenamiento aplicable desde el primer día con una metodología dinámica e interactiva a través de:</p>
                            <ul className="method-list">
                                <li><ShieldCheck style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '15px' }} /> Conferencias magistrales</li>
                                <li><ShieldCheck style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '15px' }} /> Estudio de casos reales</li>
                                <li><ShieldCheck style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '15px' }} /> Simulación Clínica de alta fidelidad</li>
                                <li><ShieldCheck style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '15px' }} /> Sesiones de Q&A con los expertos referentes internacionales</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>


            <section className="video-experience-redesign">
                <div className="container">
                    <div className="video-flex-container">
                        <div className="video-mockup-side reveal">
                            <div className="phone-frame">
                                <div className="phone-screen">
                                    <video controls poster="https://healthcareexp.com/wp-content/uploads/2024/11/2500-x-1105-banner-1_.png">
                                        <source src="https://healthcareexp.com/wp-content/uploads/2024/11/WhatsApp-Video-2024-04-02-at-7.24.03-AM.mp4" type="video/mp4" />
                                    </video>
                                </div>
                                <div className="phone-button"></div>
                            </div>
                            <div className="floating-badge badge-top">Simulación 3D</div>
                            <div className="floating-badge badge-bottom">
                                <img 
                                    src="https://healthcareexp.com/wp-content/uploads/2026/03/Picsart_26-03-03_21-37-18-446.png" 
                                    alt="ECMO SIM Logo" 
                                    className="logo-colored"
                                />
                            </div>
                        </div>
                        <div className="video-text-side reveal">
                            <div className="h2-style" style={{ color: 'var(--primary)', fontSize: '3.5rem', lineHeight: '1', marginBottom: '2rem', fontWeight: 900 }}>
                                Innovación en <br />
                                <span className="gradient-text">Educación de Élite</span>
                            </div>
                            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '3rem' }}>
                                Sé parte de un entrenamiento revolucionario en Latinoamérica con herramientas de entrenamiento como <strong>ECMO SIM</strong>. Potenciamos tus habilidades para convertirte en un líder en ECMO.
                            </p>
                            <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary btn-lg">Empezar</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 7: FINAL CTA (MINIMALIST REDESIGN) */}
            <section className="final-cta-minimalist">
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div className="reveal">
                        <div className="h2-style" style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '2rem', color: 'var(--primary)', fontWeight: 700 }}>Empieza hoy y conviértete en el <span className="gradient-text">profesional que tu hospital necesita.</span></div>
                        <p style={{ fontSize: '1.3rem', marginBottom: '3.5rem', color: 'var(--text-muted)', maxWidth: '800px', marginInline: 'auto', lineHeight: '1.6' }}>
                            Entrenarte en ECMO te brinda acceso a formación de élite para desarrollar habilidades clave que no solo fortalecen tu perfil, sino que elevan el nivel clínico de todo tu equipo.
                        </p>
                        <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn btn-primary btn-lg" style={{ padding: '1.5rem 4rem', fontSize: '1.2rem', borderRadius: '50px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>Acceder a formación de élite</a>
                    </div>
                </div>
            </section>

            {/* SECTION 8: CERTIFICATION (PRESTIGE REDESIGN) */}
            <section className="certification-prestige">
                <div className="container container-sm" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ flex: 1, minWidth: '300px', textAlign: 'left' }}>
                            <div className="h2-style" style={{ fontSize: '2.5rem', lineHeight: '1.1', marginBottom: '1.5rem', color: 'white', fontWeight: 700 }}>Certificación <br /><span className="gradient-text">Avalada por ELSO</span></div>
                            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: 0 }}>
                                El Diploma Internacional de Paris en ECMO cuenta con el máximo reconocimiento internacional, cumpliendo con los estándares de excelencia de la <strong>Extracorporeal Life Support Organization (ELSO)</strong>. Un sello de calidad que impulsa tu carrera profesional a nivel global.
                            </p>
                        </div>
                        <div style={{ flex: '0 0 auto' }}>
                            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,229,255,0.2)', transition: 'transform 0.3s ease' }}>
                                <img src="https://healthcareexp.com/wp-content/uploads/2024/11/Captura-de-pantalla-2024-11-18-005556.png" alt="ELSO Certification" style={{ maxHeight: '120px', width: 'auto', filter: 'contrast(1.1)' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        
        <Footer />
      </div>
    );
};

export default ParisNewDesign;
