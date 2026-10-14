import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Award, BookOpen, CalendarClock, CheckCircle, ClipboardList, Clock, Compass,
  FileCheck, Inbox, Lock, Megaphone, PlayCircle, Radio, RotateCcw, Sparkles, Video,
} from 'lucide-react';
import Comunicados from './Comunicados';
import { cargarInicioAlumno, pendientesDe, siguienteDelCurso, cursoAbierto } from '../lib/inicioAlumno';
import { formatearFechaHora, diaEnZona, zonaPreferida } from '../lib/zonaHoraria';
import './InicioAlumno.css';

// Pantalla de inicio del alumno ("Mi aprendizaje"): lo que sigue, lo que tiene
// pendiente y sus cursos, en ese orden. No decide accesos: recibe los cursos ya
// procesados por el portal (inscrito, en revisión, grupo cerrado, vencido).

const ICONO_TIPO = { video: PlayCircle, pdf: FileCheck, texto: BookOpen, tarea: ClipboardList, examen: FileCheck, encuesta: FileCheck, sesion: Video, web: Compass };

function BarraAvance({ valor, completo, etiqueta }) {
  const v = Math.max(0, Math.min(100, Math.round(valor || 0)));
  return (
    <div className="ia-avance">
      <div
        className={`ia-avance-barra${completo ? ' completo' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={etiqueta || 'Avance del curso'}
      >
        <span style={{ width: `${v}%` }} />
      </div>
      <span className="ia-avance-num">{v}%</span>
    </div>
  );
}

/** Tarjeta de un curso del alumno, con su estado y la acción que toca. */
export function TarjetaMiCurso({ curso, onAbrir, onVerCertificado }) {
  const estado = curso.enRevision ? 'revision'
    : curso.esperandoGrupo ? 'apartado'
      : curso.accesoVencido ? 'vencido'
        : curso.completed ? 'completo'
          : curso.progress > 0 ? 'progreso' : 'nuevo';
  const accion = {
    revision: 'Ver estado',
    apartado: 'Ver detalles',
    vencido: 'Ver opciones',
    completo: 'Repasar',
    progreso: 'Continuar',
    nuevo: 'Empezar',
  }[estado];
  return (
    <article className={`ia-curso ia-curso--${estado}`}>
      <div className="ia-curso-img">
        {curso.image ? <img src={curso.image} alt="" loading="lazy" /> : <BookOpen size={28} aria-hidden="true" />}
        <span className={`ia-chip ia-chip--${estado}`}>{curso.estadoCurso}</span>
      </div>
      <div className="ia-curso-cuerpo">
        <h3>{curso.title}</h3>
        {estado === 'revision' && <p className="ia-curso-nota"><Clock size={13} /> Se abre cuando un administrador active tu cuenta.</p>}
        {estado === 'apartado' && <p className="ia-curso-nota"><Lock size={13} /> Tu lugar está apartado; el curso abre con tu grupo.</p>}
        {estado === 'vencido' && <p className="ia-curso-nota"><Clock size={13} /> Tu periodo de acceso terminó.</p>}
        {(estado === 'progreso' || estado === 'completo' || estado === 'nuevo') && (
          <BarraAvance valor={curso.progress} completo={estado === 'completo'} etiqueta={`Avance en ${curso.title}`} />
        )}
        <div className="ia-curso-acciones">
          <button type="button" className={`ia-btn${estado === 'progreso' || estado === 'nuevo' ? ' ia-btn--principal' : ''}`} onClick={() => onAbrir(curso)}>
            {accion} {(estado === 'progreso' || estado === 'nuevo') && <ArrowRight size={15} />}
          </button>
          {estado === 'completo' && onVerCertificado && (
            <button type="button" className="ia-btn ia-btn--suave" onClick={onVerCertificado}>
              <Award size={15} /> Certificado
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const fechaCorta = (d, zona) => ({
  dia: d.toLocaleDateString('es-MX', { timeZone: zona, day: 'numeric' }),
  mes: d.toLocaleDateString('es-MX', { timeZone: zona, month: 'short' }).replace('.', ''),
});

function cuandoEs(inicio, duracionMin, zona) {
  const ahora = Date.now();
  if (inicio.getTime() <= ahora && inicio.getTime() + duracionMin * 60000 >= ahora) return { texto: 'En curso ahora', vivo: true };
  const hoy = diaEnZona(new Date(), zona);
  const manana = diaEnZona(new Date(Date.now() + 86400000), zona);
  const dia = diaEnZona(inicio, zona);
  const hora = inicio.toLocaleTimeString('es-MX', { timeZone: zona, hour: '2-digit', minute: '2-digit' });
  if (dia === hoy) return { texto: `Hoy, ${hora}` };
  if (dia === manana) return { texto: `Mañana, ${hora}` };
  return { texto: formatearFechaHora(inicio, { zona, conZona: false, opciones: { weekday: 'long', hour: '2-digit', minute: '2-digit' } }) };
}

const TEXTO_PENDIENTE = {
  'por-corregir': 'Por corregir',
  'por-entregar': 'Por entregar',
  disponible: 'Examen disponible',
  'en-revision': 'En revisión',
};

export default function InicioAlumno({
  userId,
  nombre,
  mensajeBienvenida,
  cursos,
  cursoSugerido,
  cursoOcupado,
  webinars = [],
  numCertificados = 0,
  onAbrirAula,
  onAbrirCurso,
  onIr,
  extra,
  cargandoCursos = false,
}) {
  const zona = zonaPreferida();
  const inscritos = useMemo(() => cursos.filter((c) => c.enrolled), [cursos]);
  const abiertos = useMemo(() => inscritos.filter(cursoAbierto), [inscritos]);
  const claveAbiertos = abiertos.map((c) => c.id).join(',');

  const [datos, setDatos] = useState(null);
  const [errorDatos, setErrorDatos] = useState('');
  const [intento, setIntento] = useState(0);

  // Cada carga se etiqueta con sus cursos: mientras llega la nueva, la
  // pantalla muestra "Cargando…" en lugar de datos de otra combinación.
  const claveCarga = `${userId}|${claveAbiertos}|${intento}`;
  useEffect(() => {
    let vigente = true;
    cargarInicioAlumno(userId, abiertos)
      .then((d) => { if (vigente) { setErrorDatos(d.errores.length ? d.errores.join(' · ') : ''); setDatos({ ...d, clave: claveCarga }); } })
      .catch((err) => { if (vigente) { setErrorDatos(err.message || 'No se pudo cargar tu avance.'); setDatos(null); } });
    return () => { vigente = false; };
    // Se recarga cuando cambian los cursos abiertos (clave), no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCarga]);

  const cargando = cargandoCursos || (!errorDatos && datos?.clave !== claveCarga);

  // Curso para "Continuar": el último que tocó y sigue sin terminar; si no, el
  // de más avance; si no, el primero sin empezar.
  const continuar = useMemo(() => {
    const candidatos = abiertos.filter((c) => !c.completed);
    if (!candidatos.length) return null;
    const ultima = datos?.ultimaActividad || {};
    return [...candidatos].sort((a, b) => {
      const ta = ultima[Number(a.id)]?.getTime() || 0;
      const tb = ultima[Number(b.id)]?.getTime() || 0;
      if ((a.progress > 0) !== (b.progress > 0)) return a.progress > 0 ? -1 : 1;
      return tb - ta || b.progress - a.progress;
    })[0];
  }, [abiertos, datos]);

  const siguiente = continuar && datos && !datos.fallos?.progreso
    ? siguienteDelCurso(datos.lecciones[Number(continuar.id)], datos.progreso)
    : null;

  const pendientes = useMemo(() => (datos ? pendientesDe(datos, abiertos) : []), [datos, abiertos]);
  const porHacer = pendientes.filter((p) => p.estado !== 'en-revision');
  const enRevision = pendientes.filter((p) => p.estado === 'en-revision');

  const enVivo = useMemo(() => {
    const ahora = Date.now();
    const limite = ahora + 7 * 86400000;
    const sesiones = (datos?.sesiones || []).map((s) => ({
      ...s,
      curso: abiertos.find((c) => Number(c.id) === s.courseId)?.title || '',
    }));
    const deWebinars = webinars
      .filter((w) => w.inicio && w.inicio.getTime() + 60 * 60000 >= ahora && w.inicio.getTime() <= limite)
      .map((w) => ({ id: `w-${w.id}`, tipo: 'webinar', titulo: w.title, curso: w.registrado ? 'Webinar · registrado' : 'Webinar gratuito', inicio: w.inicio, duracionMin: 60 }));
    return [...sesiones, ...deWebinars].sort((a, b) => a.inicio - b.inicio).slice(0, 5);
  }, [datos, abiertos, webinars]);

  const bloqueados = inscritos.filter((c) => !cursoAbierto(c) && !c.completed);
  const terminados = inscritos.filter((c) => c.completed).length;

  // ---- Tarjeta principal ----------------------------------------------------
  const renderContinuar = () => {
    if (cargandoCursos) {
      return (
        <section className="ia-continuar ia-continuar--espera" aria-busy="true">
          <div className="ia-continuar-cuerpo">
            <span className="ia-eyebrow">Continuar donde te quedaste</span>
            <p className="ia-continuar-leccion ia-esqueleto">Cargando tus cursos…</p>
          </div>
        </section>
      );
    }
    if (continuar) {
      const leccion = siguiente?.leccion;
      const Icono = ICONO_TIPO[leccion?.tipo] || PlayCircle;
      return (
        <section className="ia-continuar" aria-labelledby="ia-continuar-titulo">
          <div
            className="ia-continuar-img"
            // La misma portada, difuminada, rellena el fondo: así en el celular
            // se ve la imagen completa sin franjas negras a los lados.
            style={continuar.image ? { '--ia-fondo': `url("${continuar.image}")` } : undefined}
          >
            {continuar.image ? <img src={continuar.image} alt="" /> : <BookOpen size={40} aria-hidden="true" />}
          </div>
          <div className="ia-continuar-cuerpo">
            <span className="ia-eyebrow">{continuar.progress > 0 ? 'Continuar donde te quedaste' : 'Empieza tu curso'}</span>
            <h2 id="ia-continuar-titulo">{continuar.title}</h2>
            {cargando ? (
              <p className="ia-continuar-leccion ia-esqueleto" aria-busy="true">Buscando tu siguiente lección…</p>
            ) : leccion ? (
              <p className="ia-continuar-leccion">
                <Icono size={16} aria-hidden="true" />
                <span>
                  <strong>Lección {siguiente.numero} de {siguiente.total}:</strong> {leccion.titulo}
                  {leccion.duracion_min ? <small> · {leccion.duracion_min} min</small> : null}
                </span>
              </p>
            ) : siguiente && !siguiente.leccion ? (
              <p className="ia-continuar-leccion"><CheckCircle size={16} aria-hidden="true" /> <span>Completaste las {siguiente.total} lecciones. Te falta cerrar el curso.</span></p>
            ) : null}
            <BarraAvance valor={continuar.progress} etiqueta={`Avance en ${continuar.title}`} />
            <div className="ia-continuar-acciones">
              <button type="button" className="ia-btn ia-btn--principal ia-btn--grande" onClick={() => onAbrirAula(continuar.id)}>
                {continuar.progress > 0 ? 'Continuar' : 'Comenzar'} <ArrowRight size={17} />
              </button>
              {abiertos.filter((c) => !c.completed).length > 1 && (
                <button type="button" className="ia-btn ia-btn--suave" onClick={() => onIr('courses')}>Ver mis otros cursos</button>
              )}
            </div>
          </div>
        </section>
      );
    }

    if (bloqueados.length) {
      const c = bloqueados[0];
      return (
        <section className="ia-continuar ia-continuar--espera">
          <div className="ia-continuar-cuerpo">
            <span className="ia-eyebrow">{c.enRevision ? 'Cuenta en revisión' : c.esperandoGrupo ? 'Lugar apartado' : 'Acceso terminado'}</span>
            <h2>{c.title}</h2>
            <p className="ia-continuar-leccion">
              <Clock size={16} aria-hidden="true" />
              <span>
                {c.enRevision
                  ? 'Ya estás inscrito. El curso se abrirá en cuanto un administrador active tu cuenta y te asigne tu grupo.'
                  : c.esperandoGrupo
                    ? `${c.estadoCurso}. Te avisaremos por correo cuando se abra.`
                    : 'Tu periodo de acceso terminó. Si necesitas más tiempo, escríbenos.'}
              </span>
            </p>
            <div className="ia-continuar-acciones">
              <button type="button" className="ia-btn ia-btn--suave" onClick={() => onIr('explore')}>
                <Compass size={15} /> Explorar el catálogo
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (terminados > 0) {
      return (
        <section className="ia-continuar ia-continuar--espera">
          <div className="ia-continuar-cuerpo">
            <span className="ia-eyebrow">¡Vas al día!</span>
            <h2>Completaste todos tus cursos</h2>
            <p className="ia-continuar-leccion"><Award size={16} aria-hidden="true" /> <span>Tus certificados están listos para descargar. ¿Qué aprendes ahora?</span></p>
            <div className="ia-continuar-acciones">
              <button type="button" className="ia-btn ia-btn--principal" onClick={() => onIr('explore')}>Explorar el catálogo <ArrowRight size={15} /></button>
              <button type="button" className="ia-btn ia-btn--suave" onClick={() => onIr('certificates')}><Award size={15} /> Mis certificados</button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="ia-continuar ia-continuar--espera">
        <div className="ia-continuar-cuerpo">
          <span className="ia-eyebrow">Empieza por aquí</span>
          <h2>{cursoSugerido ? cursoSugerido.title : 'Aún no tienes cursos'}</h2>
          <p className="ia-continuar-leccion">
            <Sparkles size={16} aria-hidden="true" />
            <span>
              {cursoSugerido
                ? 'Está disponible sin costo y puedes verlo ahora mismo.'
                : 'Explora el catálogo e inscríbete a tu primer curso.'}
            </span>
          </p>
          <div className="ia-continuar-acciones">
            {cursoSugerido && (
              <button
                type="button"
                className="ia-btn ia-btn--principal ia-btn--grande"
                disabled={cursoOcupado === cursoSugerido.id}
                onClick={() => onAbrirCurso(cursoSugerido)}
              >
                {cursoOcupado === cursoSugerido.id ? 'Un momento…' : 'Comenzar ahora'} <ArrowRight size={17} />
              </button>
            )}
            <button type="button" className={`ia-btn${cursoSugerido ? ' ia-btn--suave' : ' ia-btn--principal'}`} onClick={() => onIr('explore')}>
              <Compass size={15} /> Explorar el catálogo
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="ia">
      <header className="ia-saludo">
        <div>
          <h1>Hola, {nombre}</h1>
          {mensajeBienvenida ? <p>{mensajeBienvenida}</p> : <p>Esto es lo que sigue en tu aprendizaje.</p>}
        </div>
        <ul className="ia-resumen" aria-label="Resumen">
          <li><BookOpen size={15} aria-hidden="true" /> <strong>{inscritos.length}</strong> {inscritos.length === 1 ? 'curso' : 'cursos'}</li>
          <li><CheckCircle size={15} aria-hidden="true" /> <strong>{terminados}</strong> {terminados === 1 ? 'terminado' : 'terminados'}</li>
          <li><Award size={15} aria-hidden="true" /> <strong>{numCertificados}</strong> {numCertificados === 1 ? 'certificado' : 'certificados'}</li>
        </ul>
      </header>

      {renderContinuar()}

      {errorDatos && (
        <div className="ia-error" role="alert">
          <span>No pudimos actualizar parte de tu aprendizaje: {errorDatos}</span>
          <button type="button" className="ia-btn ia-btn--suave" onClick={() => { setErrorDatos(''); setIntento((n) => n + 1); }}>
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      )}

      <div className="ia-columnas">
        <section className="ia-panel" aria-labelledby="ia-vivo-titulo">
          <header className="ia-panel-cabecera">
            <h2 id="ia-vivo-titulo"><CalendarClock size={17} aria-hidden="true" /> Próximas clases en vivo</h2>
            <button type="button" className="ia-enlace" onClick={() => onIr('calendario')}>Calendario</button>
          </header>
          {cargando ? (
            <p className="ia-vacio ia-esqueleto">Cargando…</p>
          ) : enVivo.length === 0 ? (
            <div className="ia-vacio">
              <p>{errorDatos ? 'Reintenta para confirmar tus próximas clases.' : 'No tienes clases en vivo en los próximos 7 días.'}</p>
              <button type="button" className="ia-enlace" onClick={() => onIr('webinars')}>Ver webinars gratuitos</button>
            </div>
          ) : (
            <ul className="ia-lista">
              {enVivo.map((e) => {
                const f = fechaCorta(e.inicio, zona);
                const cuando = cuandoEs(e.inicio, e.duracionMin, zona);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="ia-item"
                      onClick={() => (e.tipo === 'webinar' ? onIr('webinars') : onAbrirAula(e.courseId, e.leccionId))}
                    >
                      <span className={`ia-fecha${cuando.vivo ? ' vivo' : ''}`} aria-hidden="true">
                        <strong>{f.dia}</strong><small>{f.mes}</small>
                      </span>
                      <span className="ia-item-texto">
                        <strong>{e.titulo}</strong>
                        <small>{e.tipo === 'webinar' ? <Radio size={12} aria-hidden="true" /> : <Video size={12} aria-hidden="true" />} {e.curso}</small>
                        <span className={`ia-cuando${cuando.vivo ? ' vivo' : ''}`}>{cuando.texto}</span>
                      </span>
                      <ArrowRight size={16} className="ia-item-flecha" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ia-panel" aria-labelledby="ia-pend-titulo">
          <header className="ia-panel-cabecera">
            <h2 id="ia-pend-titulo">
              <ClipboardList size={17} aria-hidden="true" /> Pendientes
              {porHacer.length > 0 && <span className="ia-contador">{porHacer.length}</span>}
            </h2>
            <button type="button" className="ia-enlace" onClick={() => onIr('calificaciones')}>Calificaciones</button>
          </header>
          {cargando ? (
            <p className="ia-vacio ia-esqueleto">Cargando…</p>
          ) : pendientes.length === 0 ? (
            <div className="ia-vacio">
              <p>{errorDatos ? 'Reintenta para confirmar tus tareas y exámenes pendientes.' : <><CheckCircle size={15} aria-hidden="true" /> No tienes tareas ni exámenes pendientes.</>}</p>
            </div>
          ) : (
            <ul className="ia-lista">
              {[...porHacer.slice(0, 5), ...enRevision.slice(0, Math.max(0, 5 - porHacer.length))].map((p) => {
                const Icono = p.tipo === 'tarea' ? ClipboardList : FileCheck;
                return (
                  <li key={p.id}>
                    <button type="button" className="ia-item" onClick={() => onAbrirAula(p.curso.id, p.leccion.id)}>
                      <span className={`ia-pend-icono ia-pend-icono--${p.estado}`} aria-hidden="true"><Icono size={17} /></span>
                      <span className="ia-item-texto">
                        <strong>{p.leccion.titulo}</strong>
                        <small>{p.curso.title}{p.leccion.obligatoria === false ? ' · opcional' : ''}</small>
                      </span>
                      <span className={`ia-chip-pend ia-chip-pend--${p.estado}`}>{TEXTO_PENDIENTE[p.estado]}</span>
                    </button>
                  </li>
                );
              })}
              {porHacer.length > 5 && (
                <li className="ia-mas">y {porHacer.length - 5} más en tus cursos</li>
              )}
            </ul>
          )}
        </section>
      </div>

      <section className="ia-avisos" aria-labelledby="ia-avisos-titulo">
        <h2 id="ia-avisos-titulo" className="ia-titulo-seccion"><Megaphone size={17} aria-hidden="true" /> Avisos</h2>
        <Comunicados tipo="interno" vacio={<p className="ia-vacio ia-vacio--linea">No hay avisos nuevos.</p>} />
      </section>

      <section aria-labelledby="ia-cursos-titulo">
        <header className="ia-panel-cabecera ia-panel-cabecera--suelta">
          <h2 id="ia-cursos-titulo" className="ia-titulo-seccion"><BookOpen size={17} aria-hidden="true" /> Mis cursos</h2>
          {inscritos.length > 0 && <button type="button" className="ia-enlace" onClick={() => onIr('courses')}>Ver todos ({inscritos.length})</button>}
        </header>
        {cargandoCursos ? (
          <p className="ia-vacio ia-esqueleto">Cargando tus cursos…</p>
        ) : inscritos.length === 0 ? (
          <div className="ia-vacio ia-vacio--caja">
            <Inbox size={30} aria-hidden="true" />
            <p>Todavía no te inscribes a ningún curso.</p>
            <button type="button" className="ia-btn ia-btn--principal" onClick={() => onIr('explore')}>
              <Compass size={15} /> Explora el catálogo
            </button>
          </div>
        ) : (
          <div className="ia-cursos">
            {inscritos.slice(0, 6).map((c) => (
              <TarjetaMiCurso key={c.id} curso={c} onAbrir={() => onAbrirAula(c.id)} onVerCertificado={() => onIr('certificates')} />
            ))}
          </div>
        )}
      </section>

      {extra}
    </div>
  );
}
