import { useAuth } from '../context/AuthContext';
import { FLUJOS as FLOWS } from '../data/asistenteFlujos';
import { detectarPantalla, pestanaValida } from '../data/asistenteContexto';
import { entradaPorId } from '../data/asistenteConocimiento';
import { resolverDuda, sugerencias } from '../data/asistenteMotor';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ChatBot.css';

const BOT_IMG = 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-03-12_01-43-49-485.png';

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
  const { profile } = useAuth();
  const [pregunta, setPregunta] = useState('');
  const [contextoTab, setContextoTab] = useState(null);
  const consultaRef = useRef(false);
  const ultimoContexto = useRef(null);
  const timersRef = useRef([]);
  const fabRef = useRef(null);
  useEffect(() => {
    const timers = timersRef.current;
    const cambio = (ev) => setContextoTab(ev.detail);
    window.addEventListener('hce:pantalla', cambio);
    return () => { window.removeEventListener('hce:pantalla', cambio); timers.forEach(clearTimeout); };
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Dentro del portal (alumno y admin) la burbuja "¿Necesitas ayuda?" no
  // aparece: quien está ahí ya conoce el sistema, y la burbuja tapaba el botón
  // principal de la pantalla cada doce segundos. El robot sigue disponible.
  const { pathname } = useLocation();
  const pantalla = detectarPantalla({ pathname, rol: profile?.rol,
    ...(contextoTab?.zona === 'admin' && pathname.startsWith('/admin') ? { tabAdmin: contextoTab.tab } : {}),
    ...(contextoTab?.zona === 'alumno' && pathname.startsWith('/dashboard') ? { tabAlumno: contextoTab.tab } : {}),
  });
  const propuestas = pregunta.trim().length > 2 ? sugerencias(pregunta, pantalla).slice(0, 3) : [];
  const responderEntrada = (entrada) => {
    const flujo = entrada.flujo ? FLOWS[entrada.flujo] : null;
    const texto = [entrada.titulo ? `**${entrada.titulo}**` : '', entrada.texto,
      !entrada.texto && !entrada.pasos?.length ? flujo?.text : '',
      ...(entrada.pasos || []).map((paso, i) => `${i + 1}. ${paso}`),
      ...(entrada.casos || []).map(caso => `${caso.si}: ${caso.entonces}`), entrada.nota].filter(Boolean).join('\n\n');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'bot', text: texto || 'Consulta la guía de esta pantalla.',
      buttons: entrada.ir ? [{ label: 'Llévame ahí', ir: entrada.ir }] : (flujo?.buttons || []) }]);
  };
  const enviarPregunta = async (ev) => {
    ev?.preventDefault();
    if (!pregunta.trim() || consultaRef.current) return;
    consultaRef.current = true;
    const texto = pregunta.trim(); setPregunta(''); setTyping(true);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'user', text: texto }]);
    try {
      const respuesta = await resolverDuda(texto, pantalla);
      if (respuesta.tipo === 'respuesta') responderEntrada(respuesta.entrada);
      else setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'bot',
        text: respuesta.tipo === 'resultados' ? 'Encontré estas opciones. Elige la que corresponda a tu duda.' : 'No encontré una respuesta clara. Prueba con «mi certificado», «no puedo entrar al curso» o contacta al equipo.',
        buttons: respuesta.tipo === 'resultados' ? respuesta.resultados.map(e => ({ label: e.titulo, entrada: e.id })) : [{ label: 'Contactar al equipo', next: 'contacto' }] }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'bot', text: 'No pude completar la búsqueda. Intenta de nuevo.', buttons: [] }]);
    } finally { consultaRef.current = false; setTyping(false); }
  };
  useEffect(() => {
    if (!isOpen) return undefined;
    const cerrar = (ev) => { if (ev.key === 'Escape') { setIsOpen(false); fabRef.current?.focus(); } };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [isOpen]);
  const enPortal = /^\/(dashboard|classroom|admin)(\/|$)/.test(pathname);
  // El inicio del alumno tiene barra inferior en el celular: el robot sube.
  const sobreBarraInferior = /^\/dashboard(\/|$)/.test(pathname);
  const tema = (() => {
    let preferencia = contextoTab?.theme;
    if (!preferencia) {
      try { preferencia = localStorage.getItem(pathname.startsWith('/admin') ? 'adminTheme' : 'studentTheme'); } catch { /* Tema del equipo. */ }
    }
    return preferencia === 'dark' || ((!preferencia || preferencia === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  })();

  // Tooltip pulse cycle when chat is closed
  useEffect(() => {
    if (isOpen || enPortal) return;
    const timers = [];
    const cycle = (delay) => {
      timers.push(setTimeout(() => setShowTooltip(true), delay));
      timers.push(setTimeout(() => setShowTooltip(false), delay + 4000));
    };
    cycle(2500);
    const interval = setInterval(() => {
      setShowTooltip(true);
      timers.push(setTimeout(() => setShowTooltip(false), 4000));
    }, 12000);
    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, [isOpen, enPortal]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addBotMessage = (flowKey, delay = 500) => {
    const flow = FLOWS[flowKey];
    if (!flow) return;
    setTyping(true);
    timersRef.current.push(setTimeout(() => {
      setTyping(false);
      setMessages(prev => [
        ...prev,
        { id: Date.now(), type: 'bot', text: flow.text, buttons: flow.buttons },
      ]);
    }, delay));
  };

  const open = () => {
    setIsOpen(true);
    setShowTooltip(false);
    if (pantalla.zona !== 'publico' && ultimoContexto.current !== pantalla.clave) {
      ultimoContexto.current = pantalla.clave;
      setHasOpened(true);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'bot', text: `Estás en **${pantalla.nombre}**. Escribe tu duda o elige una ayuda de esta pantalla.`,
        buttons: pantalla.acciones.map(entradaPorId).filter(Boolean).slice(0, 4).map(e => ({ label: e.titulo, entrada: e.id })) }]);
      return;
    }
    if (!hasOpened) {
      setHasOpened(true);
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        addBotMessage('welcome_admin', 600);
      } else if (path.startsWith('/dashboard') || path.startsWith('/classroom')) {
        addBotMessage('welcome_student', 600);
      } else {
        addBotMessage('welcome', 600);
      }
    }
  };

  const handleButton = (btn) => {
    if (btn.ir) {
      const { zona, tab } = btn.ir;
      if (zona && pestanaValida(zona, tab)) {
        const destino = zona === 'admin' ? '/admin' : '/dashboard';
        if (pathname.startsWith(destino)) window.dispatchEvent(new CustomEvent('hce:ir', { detail: { tab } }));
        else {
          try { localStorage.setItem(zona === 'admin' ? 'adminActiveTab' : 'studentActiveTab', tab); } catch { /* Sin almacenamiento. */ }
          navigate(`${destino}?tab=${encodeURIComponent(tab)}`);
        }
        setIsOpen(false);
      } else if (btn.ir.url?.startsWith('/') && !btn.ir.url.startsWith('//')) { navigate(btn.ir.url); setIsOpen(false); }
      return;
    }
    if (btn.entrada) { const entrada = entradaPorId(btn.entrada); if (entrada) responderEntrada(entrada); return; }
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: btn.label },
    ]);
    if (btn.action === 'inscribirse') {
      navigate('/inscripciones-step1');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'login') {
      navigate('/login');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'ecmo_sim_buy') {
      navigate('/simulador-ecmo-sim');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'step1_buy') {
      navigate('/inscripciones-step1');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'nursing_page') {
      navigate('/ecmo-nursing-care');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'portal_webinars') {
      navigate('/dashboard?tab=webinars');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'webinars_landing') {
      // La rejilla de webinars vive en la portada. Si ya estamos ahí basta
      // con desplazarse; si no, primero hay que navegar y esperar al render.
      const irAlBloque = () => document.getElementById('webinars-grid')?.scrollIntoView({ behavior: 'smooth' });
      if (window.location.pathname === '/') {
        irAlBloque();
      } else {
        navigate('/');
        setTimeout(irAlBloque, 400);
      }
      setIsOpen(false);
      return;
    }
    if (btn.action === 'whatsapp') {
      window.open('https://wa.me/525659271906', '_blank');
      return;
    }
    if (btn.action === 'email') {
      window.open('mailto:info@healthcareexp.com', '_blank');
      return;
    }
    
    // Resolve welcome redirection dynamically based on route
    if (btn.next === 'home_portal') {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        addBotMessage('welcome_admin');
        return;
      } else if (path.startsWith('/dashboard') || path.startsWith('/classroom')) {
        addBotMessage('welcome_student');
        return;
      } else {
        addBotMessage('welcome');
        return;
      }
    }

    if (btn.next) addBotMessage(btn.next);
  };

  return (
    <div data-theme={tema} className={`hce-chat-widget${enPortal ? ' hce-chat-widget--portal' : ''}${sobreBarraInferior ? ' hce-chat-widget--sobre-barra' : ''}`}>
      {/* Tooltip */}
      <div className={`hce-chat-tooltip ${showTooltip && !isOpen && !enPortal ? 'hce-chat-tooltip--visible' : ''}`}>
        ¿Necesitas ayuda?
      </div>

      {/* Chat window */}
      <div className={`hce-chat-window ${isOpen ? 'hce-chat-window--open' : ''}`} role={isOpen ? "dialog" : undefined} aria-label="Asistente HCE" aria-hidden={!isOpen} inert={!isOpen}>
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

        <p className="hce-chat-contexto">Ayuda en {pantalla.nombre}</p>
        <div className="hce-chat-messages" role="log" aria-live="polite">
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
        <form className="hce-chat-consulta" onSubmit={enviarPregunta}>
          <label htmlFor="hce-chat-pregunta">¿En qué te ayudo?</label>
          <div className="hce-chat-escritura"><input id="hce-chat-pregunta" value={pregunta} maxLength={500} onChange={(ev) => setPregunta(ev.target.value)} placeholder="Escribe tu duda…" disabled={typing} autoComplete="off" /><button type="submit" disabled={typing || !pregunta.trim()}>Enviar</button></div>
          {propuestas.length > 0 && <ul className="hce-chat-sugerencias">{propuestas.map(e => <li key={e.id}><button type="button" onClick={() => { setPregunta(''); responderEntrada(e); }}>{e.titulo}</button></li>)}</ul>}
        </form>
      </div>

      {/* Floating button */}
      <button
        ref={fabRef}
        className={`hce-chat-fab ${isOpen ? 'hce-chat-fab--open' : ''}`}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-label={isOpen ? "Cerrar asistente HCE" : "Abrir asistente HCE"} aria-expanded={isOpen}
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
