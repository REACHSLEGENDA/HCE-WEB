import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatBot.css';

const BOT_IMG = 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-03-12_01-43-49-485.png';

const FLOWS = {

  // ── Bienvenida ──────────────────────────────────────────────────────────────
  welcome: {
    text: '¡Hola! Soy el asistente de HCE.\n\n¿En qué puedo ayudarte?',
    buttons: [
      { label: '¿Qué es HCE?',            next: 'que_es_hce' },
      { label: 'Ver programas',            next: 'programas' },
      { label: 'Experiencias abiertas',    next: 'disponibles' },
      { label: 'Hablar con un asesor',     next: 'contacto' },
    ],
  },

  // ── Experiencias abiertas ────────────────────────────────────────────────────
  disponibles: {
    text: 'Actualmente tenemos abierta la siguiente experiencia:\n\n**Paris International Diploma in ECMO**\nCertificación internacional en soporte vital extracorpóreo, desarrollada con el Hospital Pitié-Salpêtrière de París.\n\nFecha: **27 de octubre de 2026**\nSede: **INER — Instituto Nacional de Enfermedades Respiratorias, Ciudad de México**\nModalidad: Presencial\n\nCupo limitado.',
    buttons: [
      { label: 'Ver temario completo',   next: 'temario' },
      { label: 'Quiénes lo imparten',    next: 'instructores' },
      { label: 'Quiero inscribirme',     next: 'inscripcion_paris' },
      { label: 'Inicio',                 next: 'welcome' },
    ],
  },

  // ── Qué es HCE ──────────────────────────────────────────────────────────────
  que_es_hce: {
    text: 'HCE (Healthcare Training Experience) es una institución educativa especializada en el entrenamiento de alta complejidad para el manejo del paciente crítico cardiovascular.\n\nNo somos una universidad convencional. Fusionamos simulación clínica, tecnología y experiencia internacional para preparar a los mejores profesionales de Latinoamérica.\n\nMás de **2,000 alumnos** formados en más de **15 países**.',
    buttons: [
      { label: '¿Quién la fundó?',   next: 'fundadora' },
      { label: 'Ver programas',      next: 'programas' },
      { label: 'Inicio',             next: 'welcome' },
    ],
  },

  // ── Fundadora ────────────────────────────────────────────────────────────────
  fundadora: {
    text: 'HCE fue fundada en 2024 por la **Dra. Jenifer Trejo Guerra**, médica especialista en Medicina Interna y Medicina Crítica con más de 8 años de experiencia en la UCI.\n\nRealizó su posgrado internacional en ECMO en el Hospital Pitié-Salpêtrière de París, uno de los centros de referencia mundial en soporte vital extracorpóreo.',
    buttons: [
      { label: 'Ver programas',   next: 'programas' },
      { label: 'Inicio',          next: 'welcome' },
    ],
  },

  // ── Programas ────────────────────────────────────────────────────────────────
  programas: {
    text: 'HCE ofrece 4 experiencias de formación:\n\n**Diploma Paris ECMO** — Certificación internacional presencial (inscripciones abiertas)\n\n**ECMO Sim** — Simulador clínico virtual, 100% online\n\n**ECMO Nursing Care** — Formación especializada para enfermería en UCI\n\n**Webinars** — Sesiones en vivo con expertos internacionales (próximamente)\n\n¿Sobre cuál te gustaría saber más?',
    buttons: [
      { label: 'Diploma Paris ECMO',   next: 'paris' },
      { label: 'ECMO Sim',             next: 'ecmo_sim' },
      { label: 'ECMO Nursing Care',    next: 'nursing' },
      { label: 'Inicio',               next: 'welcome' },
    ],
  },

  // ── Paris ────────────────────────────────────────────────────────────────────
  paris: {
    text: '**Paris International Diploma in ECMO**\n\nEl programa de formación en ECMO más completo de Latinoamérica, desarrollado en colaboración con el Hospital Pitié-Salpêtrière de París — centro de referencia mundial.\n\nAbarca desde los fundamentos del circuito hasta el manejo clínico avanzado: destete, anticoagulación, ventilación en paciente crítico, manejo de complicaciones y casos clínicos reales.\n\nFecha: **27 de octubre de 2026**\nSede: **INER, Ciudad de México**\n\nCupo limitado.',
    buttons: [
      { label: 'Ver temario completo',  next: 'temario' },
      { label: 'Quiénes lo imparten',   next: 'instructores' },
      { label: 'Quiero inscribirme',    next: 'inscripcion_paris' },
      { label: 'Inicio',                next: 'welcome' },
    ],
  },

  // ── Temario ──────────────────────────────────────────────────────────────────
  temario: {
    text: 'El programa cubre **23 temas** en **5 módulos**:\n\n**Fundamentos** — Circuito ECMO, canulación V-V, transferencia de gases, anticoagulación\n\n**Indicaciones** — Shock cardiogénico, SDRA, embolia pulmonar, E-RCP, shock séptico, vía aérea crítica\n\n**Manejo Clínico Avanzado** — Ventilación mecánica en ECMO, manejo de hipoxemia, decúbito prono, destete V-A y V-V, farmacocinética\n\n**Complicaciones** — Neurológicas, edema pulmonar V-A, infecciones\n\n**Práctica Clínica** — Implementación de programa ECMO, cuidados de enfermería, casos clínicos',
    buttons: [
      { label: 'Quiénes lo imparten',  next: 'instructores' },
      { label: 'Quiero inscribirme',   next: 'inscripcion_paris' },
      { label: 'Volver',               next: 'paris' },
    ],
  },

  // ── Instructores ─────────────────────────────────────────────────────────────
  instructores: {
    text: 'El programa es impartido por referentes mundiales en ECMO:\n\n**Prof. Alain Combes** — Director del Programa. Hosp. Pitié-Salpêtrière, Francia\n\n**Prof. Matthieu Schmidt** — Presidente Científico. Hosp. Pitié-Salpêtrière, Francia\n\n**Enf. Hugo Guillou** — CEO Pratico Santé, Francia\n\n**Enf. Emric Besnard** — Presidente Pratico Santé, Francia\n\nHCE también cuenta con docentes nacionales e internacionales especializados.',
    buttons: [
      { label: 'Quiero inscribirme',  next: 'inscripcion_paris' },
      { label: 'Volver a Paris',      next: 'paris' },
      { label: 'Inicio',              next: 'welcome' },
    ],
  },

  // ── Inscripción Paris ────────────────────────────────────────────────────────
  inscripcion_paris: {
    text: 'Puedes completar tu inscripción directamente en nuestro sitio web.\n\nSi tienes dudas sobre perfiles, complementos o formas de pago, un asesor puede orientarte sin compromiso.',
    buttons: [
      { label: 'Ir a inscripción',       action: 'inscribirse' },
      { label: 'Hablar con un asesor',   next: 'contacto' },
      { label: 'Inicio',                 next: 'welcome' },
    ],
  },

  // ── ECMO Sim ─────────────────────────────────────────────────────────────────
  ecmo_sim: {
    text: '**ECMO Sim** — Simulador clínico virtual para profesionales de la salud.\n\nRecrea una UCI real en 3D: interactúas con ventiladores mecánicos, consolas ECMO y constantes vitales que reaccionan en tiempo real a cada decisión. Aprende a manejar escenarios críticos sin riesgo para el paciente.\n\n100% online, accede desde tu computadora.\nSuscripción de **4 meses** con acceso ilimitado a todos los escenarios.\nPrecio: **$250 USD**',
    buttons: [
      { label: 'Acceder al simulador',   action: 'ecmo_sim_buy' },
      { label: 'Ver otros programas',    next: 'programas' },
      { label: 'Inicio',                 next: 'welcome' },
    ],
  },

  // ── Nursing Care ─────────────────────────────────────────────────────────────
  nursing: {
    text: '**ECMO Nursing Care Course**\n\nFormación especializada para enfermeros/as y profesionales de cuidados intensivos. Cubre los protocolos, monitoreo y cuidados específicos del paciente bajo soporte ECMO desde la perspectiva de enfermería en UCI.\n\nPara información sobre fechas, acceso y proceso de registro, te recomendamos hablar con un asesor.',
    buttons: [
      { label: 'Hablar con un asesor',   next: 'contacto' },
      { label: 'Ver otros programas',    next: 'programas' },
      { label: 'Inicio',                 next: 'welcome' },
    ],
  },

  // ── Contacto ─────────────────────────────────────────────────────────────────
  contacto: {
    text: 'Un asesor de HCE puede orientarte sobre programas, fechas, proceso de inscripción o cualquier duda.\n\n¿Cómo prefieres que te contactemos?',
    buttons: [
      { label: 'WhatsApp',            action: 'whatsapp' },
      { label: 'Correo electrónico',  action: 'email' },
      { label: 'Inicio',              next: 'welcome' },
    ],
  },

};

function parseBold(line) {
  const parts = line.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function BubbleText({ text }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} style={{ margin: '0 0 3px' }}>
          {line ? parseBold(line) : <br />}
        </p>
      ))}
    </>
  );
}

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Tooltip pulse cycle when chat is closed
  useEffect(() => {
    if (isOpen) return;
    const timers = [];
    const cycle = (delay) => {
      timers.push(setTimeout(() => setShowTooltip(true), delay));
      timers.push(setTimeout(() => setShowTooltip(false), delay + 4000));
    };
    cycle(2500);
    const interval = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 12000);
    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addBotMessage = (flowKey, delay = 500) => {
    const flow = FLOWS[flowKey];
    if (!flow) return;
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [
        ...prev,
        { id: Date.now(), type: 'bot', text: flow.text, buttons: flow.buttons },
      ]);
    }, delay);
  };

  const open = () => {
    setIsOpen(true);
    setShowTooltip(false);
    if (!hasOpened) {
      setHasOpened(true);
      addBotMessage('welcome', 600);
    }
  };

  const handleButton = (btn) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: btn.label },
    ]);
    if (btn.action === 'inscribirse') {
      navigate('/inscripciones-diploma-paris-ecmo');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'ecmo_sim_buy') {
      window.open('https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U', '_blank');
      return;
    }
    if (btn.action === 'whatsapp') {
      window.open('https://wa.me/5212221234567', '_blank');
      return;
    }
    if (btn.action === 'email') {
      window.open('mailto:info@hce.mx', '_blank');
      return;
    }
    if (btn.next) addBotMessage(btn.next);
  };

  return (
    <div className="hce-chat-widget">
      {/* Tooltip */}
      <div className={`hce-chat-tooltip ${showTooltip && !isOpen ? 'hce-chat-tooltip--visible' : ''}`}>
        ¿Necesitas ayuda?
      </div>

      {/* Chat window */}
      <div className={`hce-chat-window ${isOpen ? 'hce-chat-window--open' : ''}`}>
        <div className="hce-chat-header">
          <img src={BOT_IMG} alt="bot" className="hce-chat-header-img" />
          <div className="hce-chat-header-info">
            <span className="hce-chat-header-name">Asistente HCE</span>
            <span className="hce-chat-header-status">
              <span className="hce-status-dot" /> En línea
            </span>
          </div>
          <button className="hce-chat-close" onClick={() => setIsOpen(false)} aria-label="Cerrar">✕</button>
        </div>

        <div className="hce-chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`hce-msg hce-msg--${msg.type}`}>
              {msg.type === 'bot' && (
                <img src={BOT_IMG} alt="" className="hce-msg-avatar" />
              )}
              <div className="hce-msg-content">
                <div className="hce-msg-bubble">
                  <BubbleText text={msg.text} />
                </div>
                {msg.buttons && (
                  <div className="hce-msg-buttons">
                    {msg.buttons.map((btn, i) => (
                      <button key={i} className="hce-quick-btn" onClick={() => handleButton(btn)}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="hce-msg hce-msg--bot">
              <img src={BOT_IMG} alt="" className="hce-msg-avatar" />
              <div className="hce-msg-content">
                <div className="hce-msg-bubble hce-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating button */}
      <button
        className={`hce-chat-fab ${isOpen ? 'hce-chat-fab--open' : ''}`}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-label="Abrir asistente HCE"
      >
        <span className="hce-wave hce-wave--1" />
        <span className="hce-wave hce-wave--2" />
        <span className="hce-wave hce-wave--3" />
        <img src={BOT_IMG} alt="Asistente HCE" className="hce-fab-img" />
        <span className="hce-fab-close-icon">✕</span>
      </button>
    </div>
  );
}
