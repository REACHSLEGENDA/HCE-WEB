import React, { useEffect, useState } from 'react';
import { ShieldCheck, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ParisNewDesign.css';
import Navbar from '../Navbar';
import Footer from '../Footer';

const syllabusData = [
    { title: "Circuito de ECMO: Componentes esenciales", desc: "Comprender la estructura y funcionamiento del circuito ECMO (bomba sanguínea, oxigenador y recubrimientos) para su correcta aplicación clínica." },
    { title: "Canulación para ECMO V-V", desc: "Identificar técnicas de canulación venovenosa seguras y efectivas para garantizar un soporte respiratorio adecuado." },
    { title: "Transferencia de gases en ECMO", desc: "Analizar los principios de intercambio gaseoso en ECMO y su impacto en la oxigenación y eliminación de CO₂." },
    { title: "Manejo de la anticoagulación en ECMO", desc: "Aplicar protocolos de anticoagulación para prevenir complicaciones trombóticas y hemorrágicas." },
    { title: "Shock cardiogénico e indicaciones de ECMO", desc: "Reconocer los criterios clínicos para el uso de ECMO en pacientes con compromiso cardiovascular severo." },
    { title: "ECMO en SDRA (Síndrome de Distrés Respiratorio Agudo)", desc: "Evaluar el uso de ECMO en pacientes con SDRA y su impacto en la supervivencia." },
    { title: "Ventilación mecánica en pacientes con ECMO", desc: "Optimizar estrategias de ventilación mecánica en pacientes bajo soporte ECMO." },
    { title: "ECMO en embolia pulmonar", desc: "Comprender el rol de ECMO como soporte en casos de embolia pulmonar grave." },
    { title: "Complicaciones neurológicas en ECMO", desc: "Identificar y prevenir complicaciones neurológicas asociadas al uso de ECMO." },
    { title: "Resultados a largo plazo en ECMO", desc: "Analizar la evolución y pronóstico de pacientes tratados con ECMO." },
    { title: "Implementación de un programa ECMO", desc: "Establecer las bases para desarrollar un programa ECMO institucional eficiente." },
    { title: "Edema pulmonar en ECMO V-A", desc: "Prevenir y tratar el edema pulmonar en pacientes bajo ECMO venoarterial." },
    { title: "Manejo de hipoxemia en ECMO V-V", desc: "Resolver casos de hipoxemia persistente en pacientes con ECMO venovenoso." },
    { title: "Posición prono en pacientes con ECMO", desc: "Evaluar la utilidad del decúbito prono en pacientes bajo soporte ECMO." },
    { title: "Selección de pacientes para ECMO", desc: "Aplicar herramientas y criterios para seleccionar adecuadamente candidatos a ECMO." },
    { title: "ECMO en paro cardíaco (E-RCP)", desc: "Comprender el uso de ECMO en reanimación cardiopulmonar avanzada." },
    { title: "Destete de ECMO (V-A y V-V)", desc: "Aplicar estrategias seguras para retirar el soporte ECMO." },
    { title: "ECMO en shock séptico", desc: "Evaluar la indicación de ECMO en pacientes con shock séptico refractario." },
    { title: "Farmacocinética y farmacodinamia en ECMO", desc: "Analizar cómo ECMO modifica la acción de los medicamentos en el organismo." },
    { title: "Complicaciones infecciosas en ECMO", desc: "Prevenir, detectar y tratar infecciones asociadas al uso de ECMO." },
    { title: "Cuidados de enfermería en ECMO", desc: "Implementar cuidados especializados para pacientes en soporte ECMO." },
    { title: "Casos clínicos en ECMO", desc: "Aplicar conocimientos teóricos en escenarios clínicos reales." },
    { title: "ECMO en manejo de vía aérea crítica", desc: "Utilizar ECMO como soporte en situaciones de compromiso severo de la vía aérea." }
];

const CATEGORIES = [
    {
        id: 'fundamentos',
        label: 'Fundamentos',
        emoji: '⚙️',
        items: [
            { title: "Circuito de ECMO: Componentes esenciales", desc: "Comprender la estructura y funcionamiento del circuito ECMO (bomba sanguínea, oxigenador y recubrimientos) para su correcta aplicación clínica." },
            { title: "Canulación para ECMO V-V", desc: "Identificar técnicas de canulación venovenosa seguras y efectivas para garantizar un soporte respiratorio adecuado." },
            { title: "Transferencia de gases en ECMO", desc: "Analizar los principios de intercambio gaseoso en ECMO y su impacto en la oxigenación y eliminación de CO₂." },
            { title: "Manejo de la anticoagulación en ECMO", desc: "Aplicar protocolos de anticoagulación para prevenir complicaciones trombóticas y hemorrágicas." },
        ],
    },
    {
        id: 'indicaciones',
        label: 'Indicaciones',
        emoji: '🫀',
        items: [
            { title: "Shock cardiogénico e indicaciones de ECMO", desc: "Reconocer los criterios clínicos para el uso de ECMO en pacientes con compromiso cardiovascular severo." },
            { title: "ECMO en SDRA", desc: "Evaluar el uso de ECMO en pacientes con SDRA y su impacto en la supervivencia." },
            { title: "ECMO en embolia pulmonar", desc: "Comprender el rol de ECMO como soporte en casos de embolia pulmonar grave." },
            { title: "Selección de pacientes para ECMO", desc: "Aplicar herramientas y criterios para seleccionar adecuadamente candidatos a ECMO." },
            { title: "ECMO en paro cardíaco (E-RCP)", desc: "Comprender el uso de ECMO en reanimación cardiopulmonar avanzada." },
            { title: "ECMO en shock séptico", desc: "Evaluar la indicación de ECMO en pacientes con shock séptico refractario." },
            { title: "ECMO en manejo de vía aérea crítica", desc: "Utilizar ECMO como soporte en situaciones de compromiso severo de la vía aérea." },
        ],
    },
    {
        id: 'manejo',
        label: 'Manejo Clínico',
        emoji: '🩺',
        items: [
            { title: "Ventilación mecánica en pacientes con ECMO", desc: "Optimizar estrategias de ventilación mecánica en pacientes bajo soporte ECMO." },
            { title: "Manejo de hipoxemia en ECMO V-V", desc: "Resolver casos de hipoxemia persistente en pacientes con ECMO venovenoso." },
            { title: "Posición prono en pacientes con ECMO", desc: "Evaluar la utilidad del decúbito prono en pacientes bajo soporte ECMO." },
            { title: "Destete de ECMO (V-A y V-V)", desc: "Aplicar estrategias seguras para retirar el soporte ECMO." },
            { title: "Farmacocinética y farmacodinamia en ECMO", desc: "Analizar cómo ECMO modifica la acción de los medicamentos en el organismo." },
            { title: "Resultados a largo plazo en ECMO", desc: "Analizar la evolución y pronóstico de pacientes tratados con ECMO." },
        ],
    },
    {
        id: 'complicaciones',
        label: 'Complicaciones',
        emoji: '⚠️',
        items: [
            { title: "Complicaciones neurológicas en ECMO", desc: "Identificar y prevenir complicaciones neurológicas asociadas al uso de ECMO." },
            { title: "Edema pulmonar en ECMO V-A", desc: "Prevenir y tratar el edema pulmonar en pacientes bajo ECMO venoarterial." },
            { title: "Complicaciones infecciosas en ECMO", desc: "Prevenir, detectar y tratar infecciones asociadas al uso de ECMO." },
        ],
    },
    {
        id: 'practica',
        label: 'Práctica Clínica',
        emoji: '🔬',
        items: [
            { title: "Implementación de un programa ECMO", desc: "Establecer las bases para desarrollar un programa ECMO institucional eficiente." },
            { title: "Cuidados de enfermería en ECMO", desc: "Implementar cuidados especializados para pacientes en soporte ECMO." },
            { title: "Casos clínicos en ECMO", desc: "Aplicar conocimientos teóricos en escenarios clínicos reales." },
        ],
    },
];

function SyllabusSection() {
    const [activeTab, setActiveTab] = useState(0);
    const cat = CATEGORIES[activeTab];

    return (
        <section className="section-padding syl-section reveal" id="temario">
            <div className="container">
                <div className="syl-header">
                    <div className="section-title">
                        Temario del <span className="gradient-text">Programa</span>
                    </div>
                    <p className="syl-sub">{syllabusData.length} temas distribuidos en {CATEGORIES.length} módulos</p>
                </div>

                {/* Tabs */}
                <div className="syl-tabs">
                    {CATEGORIES.map((c, i) => (
                        <button
                            key={c.id}
                            type="button"
                            className={`syl-tab${activeTab === i ? ' syl-tab--active' : ''}`}
                            onClick={() => setActiveTab(i)}
                        >
                            <span>{c.label}</span>
                            <span className="syl-tab-count">{c.items.length}</span>
                        </button>
                    ))}
                </div>

                {/* Items grid — altura fija, scroll interno */}
                <div className="syl-panel-wrap">
                    <div className="syl-panel">
                        {cat.items.map((item, i) => (
                            <div key={i} className="syl-card">
                                <span className="syl-card-num">{String(i + 1).padStart(2, '0')}</span>
                                <div className="syl-card-body">
                                    <h4 className="syl-card-title">{item.title}</h4>
                                    <p className="syl-card-desc">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="syl-cta">
                    <p className="syl-cta-text">¿Listo para dominar el ECMO al más alto nivel?</p>
                    <a href="/inscripciones-diploma-paris-ecmo" className="syl-cta-btn">
                        Inscríbete ahora
                    </a>
                </div>
            </div>
        </section>
    );
}

const ParisNewDesign = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const targetDate = new Date('2026-10-27T00:00:00').getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            if (distance < 0) {
                clearInterval(interval);
                return;
            }
            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
                    <div className="hero-actions">
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>Regístrate ahora</Link>
                    </div>
                    
                    {/* Hero Countdown */}
                    <div className="hero-countdown reveal active">
                        <div className="countdown-label">
                            <Calendar size={16} /> <span>Save the date: 27 de Octubre</span>
                        </div>
                        <div className="countdown-timer">
                            <div className="time-item">
                                <span className="time-value">{timeLeft.days}</span>
                                <span className="time-label">Días</span>
                            </div>
                            <span className="time-sep">:</span>
                            <div className="time-item">
                                <span className="time-value">{timeLeft.hours}</span>
                                <span className="time-label">Hrs</span>
                            </div>
                            <span className="time-sep">:</span>
                            <div className="time-item">
                                <span className="time-value">{timeLeft.minutes}</span>
                                <span className="time-label">Min</span>
                            </div>
                            <span className="time-sep">:</span>
                            <div className="time-item">
                                <span className="time-value">{timeLeft.seconds}</span>
                                <span className="time-label">Seg</span>
                            </div>
                        </div>
                    </div>
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>Certifícate</Link>
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>INSCRIBETE AHORA</Link>
                    </div>
                    <div className="experience-lead-img">
                        <img src="/assets/paris/DSC_0164.jpg" alt="Prof. Alain Combes Podium" />
                    </div>
                </div>
            </section>

            {/* SECTION 3: SYLLABUS (TEMARIO) */}
            <SyllabusSection />

            {/* SECTION 3.5: EXPERTS */}
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
                                <img src="/assets/componentes/Alain-Combes.jpg" alt="Prof. Alain Combes" className="faculty-img" />
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
                                <img src="/assets/componentes/Alain-Combes.png" alt="Prof. Matthieu Schmidt" className="faculty-img" />
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
                                <img src="/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-10-1.jpeg" alt="Enf. Hugo Guillou" className="faculty-img" />
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
                                <img src="/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-7-1.jpeg" alt="Enf. Emric Besnard" className="faculty-img" />
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>Inscríbete ahora</Link>
                    </div>
                </div>
            </section>

            {/* SECTION 4: METHODOLOGY */}
            <section className="section-padding methodology reveal">
                <div className="container">
                    <div className="method-content">
                        <div className="method-image reveal">
                            <img src="/assets/paris/DSC_4075.jpg" alt="Simulación ECMO" />
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
                                    <video controls poster="https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/Generated%20Image%20April%2015%2C%202026%20-%201_42AM.jpg">
                                        <source src="/assets/paris/WhatsApp-Video-2024-04-02-at-7.24.03-AM.mp4" type="video/mp4" />
                                    </video>
                                </div>
                                <div className="phone-button"></div>
                            </div>
                            <div className="floating-badge badge-top">Simulación 3D</div>
                            <div className="floating-badge badge-bottom">
                                <img 
                                    src="/assets/paginas/Picsart_26-03-03_21-37-18-446.png" 
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
                            <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary btn-lg">Empezar</Link>
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary btn-lg" style={{ padding: '1.5rem 4rem', fontSize: '1.2rem', borderRadius: '50px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>Acceder a formación de élite</Link>
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
                                <img src="/assets/componentes/logo.webp" alt="ELSO Certification" style={{ maxHeight: '120px', width: 'auto', filter: 'contrast(1.1)' }} />
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
