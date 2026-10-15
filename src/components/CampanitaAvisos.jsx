import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award, Bell, BookOpen, CheckCheck, CheckCircle, ClipboardCheck, FileCheck, MessageSquare,
  PlayCircle, RotateCcw, TrendingUp, Unlock, Video, X,
} from 'lucide-react';
import {
  cargarAvisos, marcarAvisosLeidos, leerVistos, guardarVistos, haceCuanto, destinoDeEnlace,
} from '../lib/avisosPortal';
import './CampanitaAvisos.css';

// Campanita del encabezado del portal del alumno.
//
// Junta dos fuentes:
//  - Avisos del servidor (tabla notificaciones_portal): cuenta activada,
//    inscripción, examen aprobado, tarea revisada, certificado, mensajes,
//    sesiones en vivo. Se marcan como leídos al abrirlos o con "Marcar todo".
//  - Avisos calculados del avance (props `derivados`): certificado listo,
//    curso a medias, curso sin empezar. Cuentan como nuevos hasta que el
//    alumno abre el panel una vez.
// Si la tabla aún no existe, solo se muestran los calculados (como antes).

const REFRESCO_MS = 3 * 60 * 1000;

const ICONO = {
  cuenta_activada: CheckCircle,
  inscrito_curso: BookOpen,
  curso_abierto: Unlock,
  examen_aprobado: FileCheck,
  tarea_revisada: ClipboardCheck,
  curso_completado: Award,
  mensaje_nuevo: MessageSquare,
  sesion_registro: Video,
  sesion_recordatorio: Video,
  certificado: Award,
  progreso: TrendingUp,
  nuevo: PlayCircle,
};

export default function CampanitaAvisos({ userId, derivados = [], onIr, onAbrirAula }) {
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState({ cargando: true, disponible: false, avisos: [], error: '' });
  const [vistosDe, setVistosDe] = useState(() => ({ userId, ids: userId ? leerVistos(userId) : new Set() }));
  const [marcando, setMarcando] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const ultimaCarga = useRef(0);

  const cargar = useCallback(async () => {
    if (!userId) return;
    ultimaCarga.current = Date.now();
    try {
      const r = await cargarAvisos(userId);
      setEstado({ cargando: false, disponible: r.disponible, avisos: r.avisos, error: '' });
    } catch (err) {
      setEstado((previo) => ({ ...previo, cargando: false, error: err.message || 'No se pudieron cargar tus avisos.' }));
    }
  }, [userId]);

  // Al entrar, cada pocos minutos y al volver a la pestaña.
  useEffect(() => {
    if (!userId) return undefined;
    void cargar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void cargar(); }, REFRESCO_MS);
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaCarga.current > 20000) void cargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [userId, cargar]);

  // Los calculados no repiten lo que ya avisó el servidor (mismo curso).
  const { servidor, calculados } = useMemo(() => {
    const deServidor = estado.disponible ? estado.avisos : [];
    const cursosConAviso = new Map();
    deServidor.forEach((a) => {
      const destino = destinoDeEnlace(a.enlace);
      const curso = destino?.courseId || destino?.curso;
      if (curso) cursosConAviso.set(`${a.tipo}:${curso}`, true);
    });
    const repetido = (d) => d.courseId != null && (
      (d.tipo === 'certificado' && cursosConAviso.has(`curso_completado:${d.courseId}`))
      || (d.tipo === 'nuevo' && (cursosConAviso.has(`inscrito_curso:${d.courseId}`) || cursosConAviso.has(`curso_abierto:${d.courseId}`)))
    );
    return { servidor: deServidor, calculados: derivados.filter((d) => !repetido(d)) };
  }, [estado.disponible, estado.avisos, derivados]);

  const vistos = vistosDe.userId === userId ? vistosDe.ids : (userId ? leerVistos(userId) : new Set());
  const noLeidosServidor = servidor.filter((a) => !a.leida).length;
  const calculadosNuevos = calculados.filter((d) => !vistos.has(d.id)).length;
  const total = noLeidosServidor + calculadosNuevos;

  // Al abrir el panel, los calculados quedan vistos.
  const alternar = () => {
    if (!abierta && userId && calculadosNuevos > 0) {
      const nuevos = new Set(vistos);
      calculados.forEach((d) => nuevos.add(d.id));
      setVistosDe({ userId, ids: nuevos });
      guardarVistos(userId, nuevos);
    }
    setAbierta(!abierta);
  };

  // Se cierra con Escape o tocando fuera.
  useEffect(() => {
    if (!abierta) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape') { setAbierta(false); botonRef.current?.focus(); }
    };
    const alTocar = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierta(false);
    };
    window.addEventListener('keydown', alTeclear);
    document.addEventListener('pointerdown', alTocar);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierta]);

  const ir = (destino) => {
    if (!destino) return;
    if (destino.courseId) onAbrirAula?.(destino.courseId, destino.leccionId || null);
    else if (destino.tab) onIr?.(destino.tab);
    else if (destino.url) window.location.assign(destino.url);
  };

  const abrirAviso = (aviso) => {
    // Primero se navega (el aula puede abrirse en otra pestaña y el navegador
    // solo lo permite en respuesta directa al clic); después se marca leído.
    setAbierta(false);
    ir(destinoDeEnlace(aviso.enlace));
    if (!aviso.leida) {
      setEstado((previo) => ({ ...previo, avisos: previo.avisos.map((a) => (a.id === aviso.id ? { ...a, leida: true } : a)) }));
      marcarAvisosLeidos(userId, [aviso.id]).catch(() => {
        setEstado(previo => ({ ...previo, avisos: previo.avisos.map(a => a.id === aviso.id ? { ...a, leida: false } : a), error: 'No se pudo marcar el aviso como leído.' }));
      });
    }
  };

  const marcarTodo = async () => {
    setMarcando(true);
    const previos = estado.avisos;
    setEstado((previo) => ({ ...previo, avisos: previo.avisos.map((a) => ({ ...a, leida: true })) }));
    try {
      await marcarAvisosLeidos(userId);
    } catch (err) {
      setEstado((previo) => ({ ...previo, avisos: previos, error: err.message }));
    } finally {
      setMarcando(false);
    }
  };

  const etiqueta = total > 0 ? `Avisos: ${total} sin leer` : 'Avisos';

  return (
    <div className="avisos" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className={`avisos-boton${abierta ? ' abierta' : ''}`}
        onClick={alternar}
        aria-label={etiqueta}
        title={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierta}
      >
        <Bell size={20} aria-hidden="true" />
        {total > 0 && <span className="avisos-contador" aria-hidden="true">{total > 9 ? '9+' : total}</span>}
      </button>

      {abierta && (
        <div className="avisos-panel" role="dialog" aria-label="Avisos">
          <div className="avisos-cabecera">
            <strong>Avisos</strong>
            <div className="avisos-cabecera-acciones">
              {noLeidosServidor > 0 && (
                <button type="button" className="avisos-marcar" onClick={marcarTodo} disabled={marcando}>
                  <CheckCheck size={15} aria-hidden="true" /> {marcando ? 'Marcando…' : 'Marcar todo como leído'}
                </button>
              )}
              <button type="button" className="avisos-cerrar" onClick={() => setAbierta(false)} aria-label="Cerrar avisos">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="avisos-cuerpo">
            {estado.error && (
              <div className="avisos-error" role="alert">
                <span>No pudimos actualizar tus avisos.</span>
                <button type="button" onClick={() => { setEstado((p) => ({ ...p, error: '' })); void cargar(); }}>
                  <RotateCcw size={13} aria-hidden="true" /> Reintentar
                </button>
              </div>
            )}

            {estado.cargando && !servidor.length && !calculados.length ? (
              <p className="avisos-vacio" role="status">Cargando avisos…</p>
            ) : !servidor.length && !calculados.length ? (
              <div className="avisos-vacio">
                <Bell size={26} aria-hidden="true" />
                <p><strong>Estás al día.</strong></p>
                <p>Aquí verás cuando se abra un curso, te califiquen una tarea, tengas un mensaje o tu certificado esté listo.</p>
              </div>
            ) : (
              <>
                {servidor.length > 0 && (
                  <ul className="avisos-lista">
                    {servidor.map((a) => {
                      const Icono = ICONO[a.tipo] || Bell;
                      return (
                        <li key={a.id}>
                          <button type="button" className={`avisos-item${a.leida ? '' : ' nuevo'}`} onClick={() => abrirAviso(a)}>
                            <span className={`avisos-icono avisos-icono--${a.tipo}`} aria-hidden="true"><Icono size={16} /></span>
                            <span className="avisos-texto">
                              <strong>{a.titulo}</strong>
                              {a.cuerpo && <span>{a.cuerpo}</span>}
                              <small>{haceCuanto(a.creada_en)}{a.leida ? '' : ' · nuevo'}</small>
                            </span>
                            {!a.leida && <span className="avisos-punto" aria-label="Sin leer" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {calculados.length > 0 && (
                  <>
                    <p className="avisos-subtitulo">Para continuar</p>
                    <ul className="avisos-lista">
                      {calculados.map((d) => {
                        const Icono = ICONO[d.tipo] || Bell;
                        return (
                          <li key={d.id}>
                            <button
                              type="button"
                              className="avisos-item"
                              onClick={() => { setAbierta(false); ir(d.destino); }}
                            >
                              <span className={`avisos-icono avisos-icono--${d.tipo}`} aria-hidden="true"><Icono size={16} /></span>
                              <span className="avisos-texto"><span>{d.texto}</span></span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
