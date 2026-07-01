import React, { useEffect, useState } from 'react';
import { ShieldCheck, Calendar, Clock, Sparkles, MapPin, ExternalLink, BookOpen, Activity, Globe } from 'lucide-react';
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
                    <p className="syl-cta-text">¿Listo para dominar el soporte ECMO al más alto nivel?</p>
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
                    <img 
                        src="https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png" 
                        alt="Paris International Diploma Logo" 
                        className="hero-main-logo"
                    />
                    <div className="h1-style">¡Conviértete en un <br />especialista en <span className="gradient-text">ECMO</span>!</div>
                    <p className="hero-sub">Certifícate con la más alta tecnología de talla internacional.</p>
                    <div className="hero-actions">
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Inscríbete ahora</Link>
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

                        {/* Dates and Schedules */}
                        <div className="countdown-schedule-info" style={{
                            marginTop: '1.2rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            fontSize: '0.85rem',
                            color: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} style={{ color: '#00d2ff' }} />
                                <span><strong>28 al 31 de Octubre, 2026</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} style={{ color: '#00d2ff' }} />
                                <span><strong>8 AM a 6 PM</strong></span>
                            </div>
                        </div>

                        <div className="hero-venue-info" style={{ marginTop: '1rem' }}>
                            <MapPin size={12} /> 
                            <a href="https://share.google/sHSrTC0wdg5BJAodK" target="_blank" rel="noopener noreferrer" className="hero-venue-link">
                                Sede: INER, Ciudad de México
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* TOP HANGING ENDORSEMENT TABS */}
            <div style={{ 
                background: '#ffffff', 
                borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                padding: '0 0 3.5rem 0',
                position: 'relative',
                zindex: 10
            }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', padding: '0 1rem' }}>
                    
                    {/* TAB 1: ELSO */}
                    <div style={{
                        width: '210px',
                        background: '#ffffff',
                        borderRadius: '0 0 24px 24px',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
                        padding: '1.5rem 1.25rem 2rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '240px',
                        borderTop: '4px solid #00d2ff',
                        transition: 'transform 0.3s ease',
                        marginTop: '-1px'
                    }}
                    className="hanging-tab"
                    >
                        <div style={{
                            fontFamily: 'Outfit',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            color: '#0a192f',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            textAlign: 'center',
                            lineHeight: '1.3',
                            marginBottom: '1rem'
                        }}>
                            PROGRAMA<br />AVALADO POR
                        </div>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                        }}>
                            <img src="/assets/componentes/logo.webp" alt="ELSO" style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>

                    {/* TAB 2: ALAT */}
                    <div style={{
                        width: '210px',
                        background: '#ffffff',
                        borderRadius: '0 0 24px 24px',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
                        padding: '1.5rem 1.25rem 2rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '240px',
                        borderTop: '4px solid #10b981',
                        transition: 'transform 0.3s ease',
                        marginTop: '-1px'
                    }}
                    className="hanging-tab"
                    >
                        <div style={{
                            fontFamily: 'Outfit',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            color: '#0a192f',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            textAlign: 'center',
                            lineHeight: '1.3',
                            marginBottom: '1rem'
                        }}>
                            PROGRAMA<br />AVALADO POR
                        </div>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                        }}>
                            <img src="/assets/componentes/alat.png" alt="ALAT" style={{ maxHeight: '42px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>

                    {/* TAB 3: SMNYCT */}
                    <div style={{
                        width: '210px',
                        background: '#ffffff',
                        borderRadius: '0 0 24px 24px',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
                        padding: '1.5rem 1.25rem 2rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '240px',
                        borderTop: '4px solid #fbc531',
                        transition: 'transform 0.3s ease',
                        marginTop: '-1px'
                    }}
                    className="hanging-tab"
                    >
                        <div style={{
                            fontFamily: 'Outfit',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            color: '#0a192f',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            textAlign: 'center',
                            lineHeight: '1.3',
                            marginBottom: '1rem'
                        }}>
                            PROGRAMA<br />AVALADO POR
                        </div>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                        }}>
                            <img src="/assets/componentes/SS.webp" alt="SMNYCT" style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>

                </div>
            </div>

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
                    <div style={{ textAlign: 'center', marginTop: '3rem', position: 'relative', zIndex: 3 }}>
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Certifícate</Link>
                    </div>
                </div>
            </section>

            {/* SECTION 1.5: WHY PARIS DIPLOMA */}
            <section className="why-paris-section reveal">
                <div className="container">
                    <div className="why-header">
                        <div className="section-title">
                            ¿Por qué el <span className="gradient-text">Paris Diploma</span>?
                        </div>
                    </div>
                    
                    <div className="why-grid">
                        <div className="why-card">
                            <div className="why-icon-wrap">
                                <BookOpen size={28} />
                            </div>
                            <h3 className="why-card-title">Faculty Internacional</h3>
                            <p className="why-card-desc">Aprende de quienes escribieron las guías</p>
                        </div>
                        
                        <div className="why-card">
                            <div className="why-icon-wrap">
                                <Activity size={28} />
                            </div>
                            <h3 className="why-card-title">Simulación de Élite</h3>
                            <p className="why-card-desc">Tecnología que no encontrarás en otro lugar.</p>
                        </div>
                        
                        <div className="why-card">
                            <div className="why-icon-wrap">
                                <Globe size={28} />
                            </div>
                            <h3 className="why-card-title">Red Global</h3>
                            <p className="why-card-desc">Conecta con especialistas de todo el mundo.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: EXPERIENCE LEAD */}
            <section className="experience-lead reveal">
                <div className="container">
                    <div className="experience-lead-text">
                        <div className="section-badge">
                            <Sparkles size={16} /> Aprende de los expertos
                        </div>
                        <div className="h2-style" style={{ fontSize: '2.5rem', lineHeight: '1.2', marginBottom: '2rem' }}>Nuestro diplomado está liderado por el <span className="gradient-text">Prof. Alain Combes</span></div>
                        <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.7' }}>
                            Jefe de la unidad de cuidados intensivos del <strong>Hospital La Pitié-Salpétrière</strong> de París, Francia, quien con su equipo ha entrenado a más de 2000 profesionales de la salud a nivel internacional.
                        </p>
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Inscríbete ahora</Link>
                    </div>
                    <div className="experience-lead-img">
                        <img src="/assets/paris/DSC_0164.jpg" alt="Prof. Alain Combes Podium" />
                    </div>
                </div>
            </section>

            {/* SECTION 3: SYLLABUS (TEMARIO) */}
            <SyllabusSection />

            {/* SECTION 4: METHODOLOGY (MOVED HERE) */}
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
                                    ExPresidente de EuroELSO. Jefe de la UCI del Hosp. Pitié-Salpêtrière, Paris. Investigador principal de EOLIA. +372 publicaciones.
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
                                    Presidente actual de EuroELSO. Presidente del Comité Científico de EuroELSO (2018-2022). Médico de la UCI del Hosp. Pitié-Salpêtrière.
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Inscríbete ahora</Link>
                    </div>
                </div>
            </section>



            <section className="video-experience-redesign">
                <div className="container">
                    <div className="video-flex-container">
                        <div className="video-mockup-side reveal">
                            <div className="phone-frame">
                                <div className="phone-screen">
                                    <video controls preload="auto" playsInline>
                                        <source src="/assets/paris/WhatsApp-Video-2024-04-02-at-7.24.03-AM.mp4#t=0.001" type="video/mp4" />
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
                            <div className="h2-style" style={{ color: 'var(--primary)', fontSize: '3.5rem', lineHeight: '1.15', marginBottom: '2rem', fontWeight: 900 }}>
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

            {/* SECTION 3.6: SEDE 2026 (REDESIGNED) */}
            <section className="sede-section-v2" id="sede">
                <div className="container">
                    <div className="sede-v2-grid">
                        {/* Left: info */}
                        <div className="sede-v2-info reveal">
                            <div className="sede-v2-top">
                                <img src="/assets/componentes/lgo7-1.png" alt="INER" className="sede-v2-logo" />
                                <span className="sede-v2-badge"><MapPin size={13} /> Ciudad de México</span>
                            </div>
                            <h2 className="sede-v2-big-title">SEDE Octubre 2026</h2>
                            <h3 className="sede-v2-title">Instituto Nacional de Enfermedades Respiratorias</h3>
                            <p className="sede-v2-abbr">(INER)</p>
                            
                            <div className="sede-v2-schedule" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                                marginBottom: '1.2rem',
                                marginTop: '1.2rem',
                                padding: '1rem',
                                background: 'rgba(0, 71, 255, 0.03)',
                                borderLeft: '4px solid #0047ff',
                                borderRadius: '4px 8px 8px 4px',
                                width: 'fit-content'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--primary)' }}>
                                    <Calendar size={16} style={{ color: '#0047ff' }} />
                                    <span><strong>Fechas:</strong> 28 al 31 de Octubre 2026</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--primary)' }}>
                                    <Clock size={16} style={{ color: '#0047ff' }} />
                                    <span><strong>Horario:</strong> 8:00 AM a 6:00 PM (Todos los días)</span>
                                </div>
                            </div>

                            <div className="sede-v2-addr">
                                <MapPin size={16} />
                                <span>Calz. de Tlalpan 4502, Belisario Domínguez Secc 16, Tlalpan, 14080 CDMX</span>
                            </div>
                            <div className="sede-v2-actions">
                                <a href="https://share.google/sHSrTC0wdg5BJAodK" target="_blank" rel="noopener noreferrer" className="btn btn-outline sede-v2-map-btn">
                                    <ExternalLink size={16} /> Ver en Maps
                                </a>
                                <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Inscríbete ahora</Link>
                            </div>
                        </div>

                        {/* Right: image */}
                        <div className="sede-v2-img-wrap reveal">
                            <img src="https://i0.wp.com/gaceta.facmed.unam.mx/wp-content/uploads/2021/03/edificio-de-gobierno.jpeg?resize=1024%2C475&ssl=1" alt="INER Sede 2026" className="sede-v2-img" />
                            <div className="sede-v2-img-badge">
                                <MapPin size={14} /> INER · CDMX · 2026
                            </div>
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
                        <Link to="/inscripciones-diploma-paris-ecmo" className="btn btn-primary">Acceder a formación de élite</Link>
                    </div>
                </div>
            </section>

            {/* Benefit banner for Nurses */}
            <section style={{ padding: '0 2rem 4rem 2rem', background: '#0a192f' }}>
                <div className="reveal" style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        background: 'rgba(37, 99, 235, 0.2)',
                        color: '#00e5ff',
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="m0 8.853 2.886 10.115c2.738-.403 5.899-.633 9.113-.633s6.375.23 9.467.675l-.353-.042 2.886-10.115c-9.502-4.225-15.141-4.448-23.999 0zm14.918 4.276h-2.071v2.071h-1.686v-2.071h-2.071v-1.686h2.071v-2.072h1.686v2.072h2.071z" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: '280px', textAlign: 'left' }}>
                        <span style={{
                            background: 'rgba(0, 229, 255, 0.1)',
                            color: '#00e5ff',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'inline-block',
                            marginBottom: '0.8rem'
                        }}>
                            Beneficio Especial de Enfermería
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
                            Agrega ECMO Nursing con 20% de Descuento
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', marginBottom: '1.2rem' }}>
                            Si eres enfermero(a), puedes complementar tu inscripción al Diploma Internacional con el <strong>ECMO Nursing Care Course</strong> con un <strong>20% de descuento</strong>. Fecha de inicio: <strong>20 de Julio</strong> — ideal como preparación teórica y práctica antes de la certificación en París en Octubre.
                        </p>
                        <Link 
                            to="/inscripciones-diploma-paris-ecmo" 
                            className="btn btn-primary"
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '0.55rem 1.4rem', 
                                fontSize: '0.85rem',
                                fontWeight: '750',
                                borderRadius: '30px'
                            }}
                        >
                            ¡Inscríbete ya!
                        </Link>
                    </div>
                </div>
            </section>

            {/* SECTION 8: CERTIFICATIONS (NURSING-STYLE ENDORSEMENTS) */}
            <section className="certification-prestige" style={{ padding: '6rem 0' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div className="h2-style" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white', fontWeight: 700 }}>
                            Avales y <span className="gradient-text">Certificaciones</span>
                        </div>
                        <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', maxWidth: '700px', margin: '0 auto' }}>
                            El Diploma Internacional de Paris en ECMO cuenta con el máximo reconocimiento internacional, respaldado por las organizaciones líderes en soporte vital y salud respiratoria.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* CARD 1: ELSO */}
                        <div className="n-endorsement-card">
                            <div style={{ 
                                background: 'white', 
                                padding: '1rem', 
                                borderRadius: '16px', 
                                width: '150px', 
                                height: '150px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <img src="/assets/componentes/logo.webp" alt="ELSO" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="n-endorsement-text">
                                <span style={{ 
                                    background: 'rgba(0, 210, 255, 0.1)', 
                                    color: '#00d2ff', 
                                    padding: '4px 12px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '800', 
                                    display: 'inline-flex',
                                    marginBottom: '0.6rem',
                                    letterSpacing: '0.05em'
                                }}>
                                    AVAL INTERNACIONAL
                                </span>
                                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                                    Extracorporeal Life Support Organization (ELSO)
                                </h3>
                                <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: 0 }}>
                                    El programa cumple rigurosamente con los estándares y lineamientos internacionales de la <strong>ELSO</strong> para la educación y entrenamiento en soporte vital extracorpóreo, garantizando una formación de nivel mundial.
                                </p>
                            </div>
                        </div>

                        {/* CARD 2: SOCIEDAD MEXICANA */}
                        <div className="n-endorsement-card" style={{ borderLeftColor: '#fbc531' }}>
                            <div style={{ 
                                background: 'white', 
                                padding: '1rem', 
                                borderRadius: '16px', 
                                width: '150px', 
                                height: '150px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <img src="/assets/componentes/SS.webp" alt="Sociedad Mexicana de Neumología y Cirugía de Tórax" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="n-endorsement-text">
                                <span style={{ 
                                    background: 'rgba(251, 197, 49, 0.1)', 
                                    color: '#fbc531', 
                                    padding: '4px 12px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '800', 
                                    display: 'inline-flex',
                                    marginBottom: '0.6rem',
                                    letterSpacing: '0.05em'
                                }}>
                                    AVAL NACIONAL (MÉXICO)
                                </span>
                                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                                    Sociedad Mexicana de Neumología y Cirugía de Tórax (SMNYCT)
                                </h3>
                                <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: 0 }}>
                                    Cuenta con el aval académico oficial de la sociedad líder de neumología en el país, impulsando y certificando la excelencia científica en la práctica de la medicina respiratoria en México.
                                </p>
                            </div>
                        </div>

                        {/* CARD 3: ALAT */}
                        <div className="n-endorsement-card" style={{ borderLeftColor: '#10b981' }}>
                            <div style={{ 
                                background: 'white', 
                                padding: '1rem', 
                                borderRadius: '16px', 
                                width: '150px', 
                                height: '150px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <img src="/assets/componentes/alat.png" alt="Asociación Latinoamericana de Tórax" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="n-endorsement-text">
                                <span style={{ 
                                    background: 'rgba(16, 185, 129, 0.1)', 
                                    color: '#10b981', 
                                    padding: '4px 12px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '800', 
                                    display: 'inline-flex',
                                    marginBottom: '0.6rem',
                                    letterSpacing: '0.05em'
                                }}>
                                    AVAL REGIONAL (LATINOAMÉRICA)
                                </span>
                                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                                    Asociación Latinoamericana de Tórax (ALAT)
                                </h3>
                                <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: 0 }}>
                                    Respaldado científicamente por la asociación de referencia en salud pulmonar y cuidados respiratorios para toda la comunidad médica de América Latina.
                                </p>
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
