import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import './FAQSection.css';

const FAQ_NURSING = [
  {
    q: '¿Qué es el curso ECMO Nursing Care?',
    a: 'Es el primer programa de entrenamiento de alta especialidad en Latinoamérica y el mundo diseñado por y para profesionales de enfermería. Su objetivo es brindar las herramientas teóricas y prácticas necesarias para liderar con total seguridad, criterio clínico y autonomía el cuidado integral y el monitoreo del paciente en soporte ECMO.',
  },
  {
    q: '¿A quién está dirigido este entrenamiento?',
    a: (
      <>
        Este curso está diseñado específicamente para profesionales a la cabecera del paciente crítico:
        <ul>
          <li>Licenciados/as en Enfermería General.</li>
          <li>Enfermeros/as especialistas en cuidados críticos, intensivos o cardiovasculares.</li>
          <li>Enfermeros/as de unidades coronarias, urgencias y quirófano.</li>
          <li>Perfusionistas interesados en el cuidado continuo.</li>
        </ul>
      </>
    ),
  },
  {
    q: '¿Cuál es el principal enfoque del programa?',
    a: 'ECMO Nursing Care se centra por completo en el día a día al pie de la cama del paciente. Aprenderás a realizar un monitoreo adecuado del binomio circuito-paciente, evaluar el sitio de canulación, prevenir y resolver de inmediato escenarios de crisis, manejar las complicaciones en ECMO, vigilar la anticoagulación segura y comprender la transferencia de gases.',
  },
  {
    q: '¿Qué avales y certificaciones otorga este curso?',
    a: 'Al concluir y aprobar satisfactoriamente todas las evaluaciones, recibirás una Certificación Oficial emitida por Healthcare Training Experience (HTE) con el prestigioso aval de la FLECI (Federación Latinoamericana de Enfermería de Cuidados Intensivos). Esta credencial acredita tus competencias avanzadas en el cuidado de enfermería en ECMO, respaldada por un cuerpo docente experto y tecnología de simulación de vanguardia.',
  },
  {
    q: '¿Cuál es la modalidad del entrenamiento y cómo está estructurado?',
    a: (
      <>
        El curso cuenta con un formato híbrido y optimizado para profesionales en activo:
        <ul>
          <li><strong>Fase Teórica-Virtual (Plataforma HTE):</strong>
            <ul>
              <li><em>Aprendizaje Asincrónico ("Aprende a tu ritmo"):</em> Flexibilidad total con acceso 24/7 a clases grabadas, literatura científica y normativas ELSO.</li>
              <li><em>Aprendizaje Sincrónico ("Consolida con expertos"):</em> Sesiones interactivas en vivo para resolución de dudas y análisis de casos clínicos.</li>
            </ul>
          </li>
          <li><strong>Fase Práctica Presencial:</strong>
            <ul>
              <li><em>Ponencias Magistrales ("Inspiración y Evidencia"):</em> Espacios exclusivos con enfermeros especialistas de renombre global.</li>
              <li><em>Simulación clínica ("Práctica sin riesgo"):</em> Entrenamiento práctico con fidelidad progresiva de la mano de instructores internacionales.</li>
            </ul>
          </li>
        </ul>
      </>
    ),
  },
  {
    q: '¿Cuáles son los requisitos de inscripción?',
    a: (
      <ul>
        <li>Contar con título o cédula profesional de enfermería (o equivalente en tu país de origen).</li>
        <li>Desempeñarse o tener experiencia previa en unidades de cuidados críticos, intermedios, urgencias o quirófano.</li>
        <li>Interés por especializarse en terapias de soporte vital avanzado.</li>
      </ul>
    ),
  },
  {
    q: '¿Cuáles son los métodos de pago y opciones de financiamiento?',
    a: (
      <ul>
        <li>Pago en línea 100% seguro con tarjeta de crédito o débito directamente en nuestro portal web.</li>
        <li>Transferencias bancarias directas.</li>
        <li>Planes de financiamiento en parcialidades mensuales (disponibles para participantes en México).</li>
        <li>Precios especiales para grupos: ofrecemos tarifas preferenciales para instituciones, hospitales o grupos de colegas.</li>
      </ul>
    ),
  },
  {
    q: '¿Por qué el cupo es estrictamente limitado?',
    a: 'Debido a que el éxito del profesional de enfermería en ECMO depende enteramente de la destreza manual y la rápida toma de decisiones, los talleres de simulación clínica se realizan en grupos pequeños. Esto garantiza que pases el máximo tiempo interactuando con el circuito y recibas retroalimentación personalizada de los instructores internacionales.',
  },
  {
    q: '¿Cómo puedo inscribirme?',
    a: (
      <>
        ¡Es muy sencillo! Puedes asegurar tu lugar de inmediato accediendo directamente a nuestro formulario de registro y pasarela de pago seguro.{' '}
        <a href="/inscripciones-ecmo-nursing" style={{ color: '#e31837', fontWeight: 700 }}>Inscríbete aquí →</a>
        <br /><br />
        <em>📩 ¿Tienes otra duda? Escríbenos a <strong>info@healthcareexp.com</strong> o utiliza el botón de WhatsApp. ¡Nuestro equipo de admisiones te atenderá de inmediato!</em>
      </>
    ),
  },
];

const FAQ_PARIS = [
  {
    q: '¿Qué es el Diploma Internacional de París en ECMO?',
    a: 'Es el programa de entrenamiento en Oxigenación por Membrana Extracorpórea (ECMO) más prestigioso de Europa, con más de 15 años impartiéndose en París, Francia. Por tercera vez, y gracias a la alianza estratégica entre nuestra academia Healthcare Training Experience y Pratico Santé, este programa de élite se imparte en México, manteniendo los mismos estándares de calidad y rigor académico que en su sede de origen.',
  },
  {
    q: '¿A quién está dirigido este diploma?',
    a: (
      <ul>
        <li>Intensivistas (Adultos y Pediátricos/Neonatales).</li>
        <li>Neumólogos, Cardiólogos, Cirujanos Cardiotorácicos.</li>
        <li>Emergenciólogos, Anestesiólogos, Infectólogos.</li>
        <li>Enfermeros/as especialistas en cuidados críticos y cardiovasculares.</li>
        <li>Perfusionistas y Terapeutas respiratorios en áreas críticas.</li>
      </ul>
    ),
  },
  {
    q: '¿Qué aval o certificación académica otorga?',
    a: 'Al finalizar el programa, los participantes reciben su constancia firmada por el Prof. Alain Combes (ExPresidente de EuroELSO) y el Prof. Matthieu Schmidt (Presidente actual de EuroELSO). El programa cuenta con el endorsement internacional de la ELSO como Step 1 y Step 2, el aval regional de la Asociación Latinoamericana de Tórax (ALAT), el aval en México de la Sociedad Mexicana de Neumología y Cirugía de Tórax (SMNyCT), y es certificado por Pratico Santé junto con HCE.',
  },
  {
    q: '¿Cuál es la modalidad del entrenamiento?',
    a: (
      <ul>
        <li><strong>Fase de Preparación:</strong> Material de estudio interactivo a través de nuestra plataforma, disponible 1 mes antes de la certificación.</li>
        <li><strong>Fase Teórica:</strong> Ponencias magistrales en el auditorio del INER impartidas por el Prof. Alain Combes y Prof. Matthieu Schmidt.</li>
        <li><strong>Fase Práctica:</strong> Simulaciones de alta fidelidad avanzadas de ECMO V-V y V-A en el Centro de Simulación del INER, incluyendo el uso del simulador de vanguardia ECMO SIM.</li>
      </ul>
    ),
  },
  {
    q: '¿Cuánto tiempo dura el programa y cuál es la carga horaria?',
    a: 'El programa está estructurado para completarse en 4 días intensivos. La fase teórica presencial se realizará del 28 al 29 de octubre de 2026 en el Auditorio del INER de 8:00 a 18:00 horas. La fase práctica presencial se realiza del 30 al 31 de octubre en el Centro de Simulación del INER de 8:00 a 18:00 horas. El horario puede variar dependiendo del desarrollo de las actividades del grupo.',
  },
  {
    q: '¿Cuáles son los requisitos de inscripción?',
    a: (
      <ul>
        <li>Ser Profesional de Salud.</li>
        <li>Ser Residente o Especialista en las áreas mencionadas.</li>
        <li>Interés en ECMO.</li>
        <li>Idealmente que tu hospital esté por iniciar un programa de ECMO.</li>
      </ul>
    ),
  },
  {
    q: '¿Cuáles son las formas de pago y opciones de financiamiento?',
    a: (
      <ul>
        <li>Pago en línea 100% seguro con tarjeta de crédito o débito a través de nuestro portal web.</li>
        <li>Transferencias bancarias directas contactando a nuestro equipo.</li>
        <li>Planes de financiamiento en parcialidades mensuales (disponibles para México).</li>
        <li>Descuentos para grupos hospitalarios: consulta a nuestro equipo por precios especiales.</li>
      </ul>
    ),
  },
  {
    q: '¿El cupo es limitado?',
    a: 'Sí. Para garantizar una experiencia de aprendizaje personalizada y el máximo tiempo de práctica directa en las simulaciones de alta fidelidad, los cupos son estrictamente limitados.',
  },
  {
    q: '¿Cómo inscribirse?',
    a: (
      <>
        Puedes asegurar tu cupo de inmediato directamente en nuestro formulario de inscripción.{' '}
        <a href="/inscripciones-diploma-paris-ecmo" style={{ color: '#0047ff', fontWeight: 700 }}>Da clic aquí →</a>
        <br /><br />
        <em>📩 ¿Tienes otra duda? Escríbenos a <strong>info@healthcareexp.com</strong> o utiliza el botón de WhatsApp. ¡Nuestro equipo de admisiones te atenderá de inmediato!</em>
      </>
    ),
  },
];

function FAQItem({ item, index, accentColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`} style={{ '--faq-accent': accentColor }}>
      <button className="faq-question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="faq-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="faq-q-text">{item.q}</span>
        <ChevronDown size={20} className="faq-chevron" />
      </button>
      <div className="faq-answer-wrap">
        <div className="faq-answer">{item.a}</div>
      </div>
    </div>
  );
}

export function FAQNursing() {
  return (
    <section className="faq-section" id="faq-nursing">
      <div className="faq-inner">
        <div className="faq-header">
          <span className="faq-badge" style={{ background: 'rgba(227,24,55,0.1)', color: '#e31837' }}>Preguntas Frecuentes</span>
          <h2 className="faq-title">FAQ – <span style={{ color: '#e31837' }}>ECMO Nursing Care Course</span></h2>
          <p className="faq-subtitle">Resolvemos tus dudas más importantes sobre el programa.</p>
        </div>
        <div className="faq-list">
          {FAQ_NURSING.map((item, i) => (
            <FAQItem key={i} item={item} index={i} accentColor="#e31837" />
          ))}
        </div>
        <div className="faq-cta">
          <a
            href="https://wa.me/525659271906?text=Hola,%20tengo%20una%20duda%20sobre%20el%20ECMO%20Nursing%20Care%20Course."
            target="_blank"
            rel="noreferrer"
            className="faq-wa-btn"
          >
            <MessageCircle size={18} />
            ¿Más preguntas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function FAQParis() {
  return (
    <section className="faq-section faq-section--dark" id="faq-paris">
      <div className="faq-inner">
        <div className="faq-header">
          <span className="faq-badge" style={{ background: 'rgba(0,71,255,0.12)', color: '#6090ff' }}>Preguntas Frecuentes</span>
          <h2 className="faq-title" style={{ color: '#ffffff' }}>FAQ – <span style={{ color: '#6090ff' }}>Diploma Internacional de París en ECMO</span></h2>
          <p className="faq-subtitle" style={{ color: 'rgba(255,255,255,0.65)' }}>Todo lo que necesitas saber antes de inscribirte.</p>
        </div>
        <div className="faq-list">
          {FAQ_PARIS.map((item, i) => (
            <FAQItem key={i} item={item} index={i} accentColor="#6090ff" />
          ))}
        </div>
        <div className="faq-cta">
          <a
            href="https://wa.me/525659271906?text=Hola,%20tengo%20una%20duda%20sobre%20el%20Diploma%20Internacional%20de%20París%20en%20ECMO."
            target="_blank"
            rel="noreferrer"
            className="faq-wa-btn"
          >
            <MessageCircle size={18} />
            ¿Más preguntas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

// Componente para la Home — botones que llevan a cada FAQ
export function FAQHome() {
  const [active, setActive] = useState(null); // 'nursing' | 'paris'

  return (
    <section className="faq-home-section" id="faq">
      <div className="faq-inner">
        <div className="faq-header">
          <span className="faq-badge">Preguntas Frecuentes</span>
          <h2 className="faq-title">¿Tienes dudas sobre <span className="gradient-text">nuestros programas</span>?</h2>
          <p className="faq-subtitle">Selecciona el programa sobre el que quieres saber más.</p>
        </div>

        <div className="faq-program-tabs">
          <button
            className={`faq-tab-btn ${active === 'nursing' ? 'faq-tab-btn--active-red' : ''}`}
            onClick={() => setActive(active === 'nursing' ? null : 'nursing')}
          >
            <span className="faq-tab-dot" style={{ background: '#e31837' }} />
            FAQ – ECMO Nursing Care
            <ChevronDown size={16} className={`faq-tab-chevron ${active === 'nursing' ? 'rotated' : ''}`} />
          </button>
          <button
            className={`faq-tab-btn ${active === 'paris' ? 'faq-tab-btn--active-blue' : ''}`}
            onClick={() => setActive(active === 'paris' ? null : 'paris')}
          >
            <span className="faq-tab-dot" style={{ background: '#0047ff' }} />
            FAQ – Diploma París ECMO
            <ChevronDown size={16} className={`faq-tab-chevron ${active === 'paris' ? 'rotated' : ''}`} />
          </button>
        </div>

        {active === 'nursing' && (
          <div className="faq-list faq-list--animated">
            {FAQ_NURSING.map((item, i) => (
              <FAQItem key={i} item={item} index={i} accentColor="#e31837" />
            ))}
          </div>
        )}

        {active === 'paris' && (
          <div className="faq-list faq-list--animated">
            {FAQ_PARIS.map((item, i) => (
              <FAQItem key={i} item={item} index={i} accentColor="#6090ff" />
            ))}
          </div>
        )}

        <div className="faq-cta" style={{ marginTop: active ? '2rem' : '1rem' }}>
          <a
            href="https://wa.me/525659271906?text=Hola,%20tengo%20una%20duda%20sobre%20los%20programas%20de%20HCE."
            target="_blank"
            rel="noreferrer"
            className="faq-wa-btn"
          >
            <MessageCircle size={18} />
            ¿Tienes otra duda? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
