import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Webinars.css';

const WebinarCard = ({ image, title, date, time, link, enVivo }) => {
  return (
    <div className="webinar-immersive-card">
      <div className="webinar-card-image-container">
        <img src={image} alt={title} className="webinar-card-img" />
        {enVivo && (
          <div className="webinar-live-badge">
            <span className="live-pulse-dot" />
            EN VIVO
          </div>
        )}
      </div>

      <div className="webinar-card-content">
        <p className="webinar-card-date">{date}</p>
        <h3 className="webinar-card-title">{title}</h3>
        <p className="webinar-card-time" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', fontWeight: '500' }}>{time}</p>
        <div className="webinar-card-action">
          <a href={link} target="_blank" rel="noreferrer" className="btn-webinar-card">
            {enVivo ? 'Unirse al Webinar (En Vivo)' : 'Registrarme Gratis'}
          </a>
        </div>
      </div>
    </div>
  );
};

const Webinars = () => {
  const [webinars, setWebinars] = useState([]);

  useEffect(() => {
    const loadWebinars = async () => {
      try {
        const { data, error } = await supabase
          .from('webinars')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) throw error;
        setWebinars((data || []).filter(w => w.activo));
      } catch (err) {
        console.warn('Error loading webinars from Supabase, loading from localStorage:', err.message);
        const local = localStorage.getItem('webinars');
        if (local) {
          setWebinars(JSON.parse(local).filter(w => w.activo));
        } else {
          // Initialize default webinar
          const defaultWebinars = [
            {
              id: 1,
              title: 'Trasplante pulmonar en Latinoamérica',
              date: '28 de Abril, 2026',
              time: '5:00 PM (MEX/CR) | 8:00 PM (ARG/CHI)',
              image_url: 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/WhatsApp%20Image%202026-04-21%20at%2011.18.02%20AM.jpeg',
              link: 'https://bit.ly/LATICE-Trasplante-Pulmonar',
              en_vivo: false,
              activo: true
            }
          ];
          setWebinars(defaultWebinars);
          localStorage.setItem('webinars', JSON.stringify(defaultWebinars));
        }
      }
    };

    loadWebinars();
  }, []);

  const isWebinarLive = (webinar) => {
    if (webinar.fecha_inicio && webinar.fecha_fin) {
      const now = new Date();
      const start = new Date(webinar.fecha_inicio);
      const end = new Date(webinar.fecha_fin);
      return now >= start && now <= end;
    }
    return !!webinar.en_vivo;
  };

  return (
    <>
      <section className="webinars-immersive-section" id="webinars-grid">
        <div className="hce-container">
          <div className="section-header" style={{ marginBottom: '3.5rem', textAlign: 'center', opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="section-badge">
                <CalendarDays size={16} /> webinars
              </span>
            </div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              Próximos webinars <span className="text-gradient">gratuitos</span>
            </h2>
            <p style={{ color: '#4b5563', maxWidth: '600px', margin: '1rem auto 0', fontSize: '1.1rem', lineHeight: '1.5', textAlign: 'center' }}>
              Actualización clínica con expertos, casos reales y mejores prácticas.
            </p>
          </div>
        </div>
        <div className="webinar-immersive-grid" style={{ display: 'grid', gridTemplateColumns: webinars.length > 1 ? 'repeat(auto-fit, minmax(350px, 1fr))' : '1fr', gap: '30px', maxWidth: '1200px' }}>
          {webinars.map((webinar) => (
            <WebinarCard 
              key={webinar.id}
              image={webinar.image_url}
              title={webinar.title}
              date={webinar.date}
              time={webinar.time}
              link={webinar.link}
              enVivo={isWebinarLive(webinar)}
            />
          ))}
          {webinars.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#7f8c8d' }}>No hay webinars programados por el momento.</p>
          )}
        </div>
      </section>
    </>
  );
};

export default Webinars;
