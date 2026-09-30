import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, CheckCircle, Clock, Video, XCircle } from 'lucide-react';
import TextoLeccion from './TextoLeccion';
import { llamarSesion, fechaSesion, descargarIcs } from '../lib/sesiones';
import './SesionEnVivo.css';

// Sesión en vivo dentro de una lección: registrarse, unirse (sin ver el
// enlace) y ver si la asistencia quedó confirmada.

const faltaTexto = (ms) => {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
  return `${Math.floor(h / 24)} días`;
};

export default function SesionEnVivo({ leccion, curso, esAdmin, notificar, onCompletada }) {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  // El aula pasa una función nueva en cada render: se guarda en una referencia
  // para que el efecto de carga no se repita sin parar.
  const alCompletar = useRef(onCompletada);
  useEffect(() => { alCompletar.current = onCompletada; }, [onCompletada]);

  const aplicar = useCallback((e) => {
    setEstado(e);
    if (e.asistio) alCompletar.current?.();
  }, []);

  useEffect(() => {
    let vigente = true;
    // Si ya terminó, se pide verificar: revisa el reporte de Zoom.
    llamarSesion('estado', { leccionId: leccion.id })
      .then((e) => (e.terminada && e.registrado && !e.asistio ? llamarSesion('verificar', { leccionId: leccion.id }) : e))
      .then((e) => { if (vigente) aplicar(e); })
      .catch((err) => { if (vigente) setError(err.message); });
    return () => { vigente = false; };
  }, [leccion.id, aplicar]);

  // El reloj avanza cada 30 s para activar "Unirse" sin recargar.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const registrar = async () => {
    setOcupado(true);
    try {
      aplicar(await llamarSesion('registrar', { leccionId: leccion.id }));
      notificar('¡Listo! Quedaste registrado. El botón para entrar se activa 15 minutos antes.', 'success');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setOcupado(false);
    }
  };

  const unirse = async () => {
    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const pestana = window.open('', '_blank');
    setOcupado(true);
    try {
      const { url } = await llamarSesion('unirse', { leccionId: leccion.id });
      if (!url) throw new Error('La sesión todavía no tiene reunión.');
      if (pestana) { pestana.opener = null; pestana.location.href = url; } else window.location.href = url;
    } catch (err) {
      pestana?.close();
      notificar(err.message, 'error');
    } finally {
      setOcupado(false);
    }
  };

  if (error) return <p className="sesion-aviso">{error}</p>;
  if (!estado) return <p className="sesion-aviso">Cargando la sesión…</p>;

  const abre = new Date(estado.abreEn).getTime();
  const cierra = new Date(estado.cierraEn).getTime();
  const inicio = new Date(estado.iniciaEn).getTime();
  const enVentana = ahora >= abre && ahora <= cierra;
  const terminada = ahora > inicio + (estado.duracionMin || 60) * 60000;

  return (
    <div className="sesion">
      {leccion.contenido?.texto && <TextoLeccion texto={leccion.contenido.texto} />}

      <div className="sesion-horario">
        <Video size={22} />
        <div>
          <strong>{fechaSesion(estado.iniciaEn)}</strong>
          <span>Duración: {estado.duracionMin} min{!terminada && ahora < inicio ? ` · empieza en ${faltaTexto(inicio - ahora)}` : ''}</span>
        </div>
      </div>

      {estado.asistio ? (
        <p className="sesion-estado ok"><CheckCircle size={18} /> Asistencia confirmada{estado.minutos ? ` · ${estado.minutos} min conectado` : ''}.</p>
      ) : terminada && estado.registrado ? (
        <p className="sesion-estado pendiente"><Clock size={18} /> La sesión terminó. Estamos esperando el reporte de Zoom para confirmar tu asistencia; puede tardar unas horas.</p>
      ) : terminada ? (
        <p className="sesion-estado mal"><XCircle size={18} /> Esta sesión ya terminó y no te registraste.</p>
      ) : null}

      {!terminada && (
        <div className="sesion-acciones">
          {!estado.registrado ? (
            <button type="button" className="back-btn leccion-btn-principal" onClick={registrar} disabled={ocupado}>
              {ocupado ? 'Registrando…' : 'Registrarme a la sesión'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="back-btn leccion-btn-principal"
                onClick={unirse}
                disabled={ocupado || (!enVentana && !esAdmin)}
                title={enVentana ? '' : 'Se activa 15 minutos antes de la sesión'}
              >
                <Video size={16} /> {ocupado ? 'Abriendo Zoom…' : 'Unirse a la clase'}
              </button>
              <button
                type="button"
                className="back-btn"
                onClick={() => descargarIcs({ titulo: leccion.titulo, curso, iniciaEn: estado.iniciaEn, duracionMin: estado.duracionMin, url: window.location.href })}
              >
                <CalendarPlus size={16} /> Agregar a mi calendario
              </button>
            </>
          )}
        </div>
      )}

      {estado.registrado && !terminada && !enVentana && (
        <p className="sesion-aviso">✓ Estás registrado. El botón para entrar se activa 15 minutos antes. Tu enlace es personal: entra siempre desde aquí.</p>
      )}
      {esAdmin && <p className="sesion-aviso">Vista de administrador: puedes entrar en cualquier momento y tu registro no cuenta.</p>}
    </div>
  );
}
