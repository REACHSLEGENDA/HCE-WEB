// Consultas HCE (blog clínico) — mismo diseño que las consultas de apen.mx:
// índice con buscador y fichas; cada consulta con respuesta rápida, ficha
// clínica, bloques numerados, preguntas frecuentes, fuentes y programa.
// También: preguntas frecuentes, hub de programas y página para hospitales.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, BookOpenCheck, Building2, ClipboardCheck, CreditCard, ExternalLink, FileCheck2, FileSearch,
  GraduationCap, HeartPulse, Link2, Mail, MessageCircle, MonitorPlay, Plus, Search, ShieldCheck, Stethoscope, TriangleAlert, Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import NotFound from './NotFound';
import { useSEO } from '../hooks/useSEO';
import { AUTOR, CONSULTAS, FAQ_ECMO, FAQ_PROGRAMAS, PROGRAMAS_CTA, consultaPorSlug } from '../data/consultas';
import { HOSPITALES_H1, HOSPITALES_TEXTO, PROGRAMAS, PROGRAMAS_H1, PROGRAMAS_TEXTO } from '../data/programas';
import './Consultas.css';

const WHATSAPP = 'https://wa.me/525659271906';

// Ícono propio de ECMO con el trazo de lucide (24x24, sin relleno): la bomba
// (círculo) y el oxigenador (rectángulo) unidos por las líneas del circuito,
// con flechas del sentido del flujo.
function IconoEcmo({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5.5" cy="12" r="3.5" />
      <rect x="15" y="8" width="7" height="8" rx="1.5" />
      <path d="M18.5 10.5v3" />
      <path d="M5.5 8.5V7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      <path d="M18.5 16v1a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-1.5" />
      <path d="m11 3 2 2-2 2" />
      <path d="m13 17-2 2 2 2" />
    </svg>
  );
}

const ICONOS = { ecmo: IconoEcmo, enfermeria: Stethoscope, formacion: GraduationCap, simulacion: MonitorPlay, ic: HeartPulse };
const ICONOS_BLOQUE = [FileSearch, ClipboardCheck, ShieldCheck, BookOpenCheck];
const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const sinAcentos = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Programa al que lleva una consulta, con su póster (la tarjeta con logo del
// inicio). "hospitales" no es un programa del catálogo: usa la foto de equipos.
const HOSPITALES = {
  id: 'hospitales',
  nombre: PROGRAMAS_CTA.hospitales.nombre,
  ruta: PROGRAMAS_CTA.hospitales.enlace,
  poster: '/consultas/hospitales.webp',
  distintivo: 'Formación, simulación y portal propio para equipos de hospital',
};
const programaDe = (id) => (id === 'hospitales' ? HOSPITALES : PROGRAMAS.find((p) => p.id === id) || null);

function TarjetaPrograma({ p, etiqueta = 'Ver programa' }) {
  return (
    <Link to={p.ruta} className="cs-poster">
      <img src={p.poster} alt={`${p.nombre} — HCE`} width="800" height="800" loading="lazy" />
      <span className="cs-poster-texto">
        <strong>{p.nombre}</strong>
        <span>{p.distintivo}</span>
        <em>{etiqueta} <ArrowRight size={14} aria-hidden="true" /></em>
      </span>
    </Link>
  );
}

function Migas({ pasos }) {
  return (
    <nav className="cs-migas" aria-label="Migas de pan">
      <Link to="/">Inicio</Link>
      {pasos.map((p) => (
        <span key={p.nombre}><span aria-hidden="true">/</span>{p.enlace ? <Link to={p.enlace}>{p.nombre}</Link> : <strong>{p.nombre}</strong>}</span>
      ))}
    </nav>
  );
}

function Preguntas({ faqs }) {
  return (
    <div className="cs-faqs">
      {faqs.map((f) => (
        <details key={f.pregunta}>
          <summary>{f.pregunta}</summary>
          <p>{f.respuesta}</p>
        </details>
      ))}
    </div>
  );
}

function BandaFinal({ etiqueta = 'Equipo académico HCE', titulo, boton = 'Escríbenos por WhatsApp', enlace = WHATSAPP }) {
  const externo = enlace.startsWith('http');
  return (
    <section className="cs-banda">
      <div className="cs-contenedor cs-banda-int">
        <div>
          <p className="cs-eyebrow cs-eyebrow--claro">{etiqueta}</p>
          <h2>{titulo}</h2>
        </div>
        {externo
          ? <a className="cs-boton-cian" href={enlace} target="_blank" rel="noopener noreferrer">{boton} <ArrowRight size={16} /></a>
          : <Link className="cs-boton-cian" to={enlace}>{boton} <ArrowRight size={16} /></Link>}
      </div>
    </section>
  );
}

function Tabla({ tabla }) {
  return (
    <div className="cs-tabla" tabIndex={0} aria-label={`${tabla.titulo} — tabla desplazable`}>
      <table>
        <caption>{tabla.titulo}</caption>
        <thead><tr>{tabla.encabezados.map((h, i) => <th key={h || i} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {tabla.filas.map((fila) => (
            <tr key={fila.join('|')}>{fila.map((c, i) => (i === 0 ? <th key={c} scope="row">{c}</th> : <td key={`${fila[0]}-${i}`}>{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Índice ------------------------------------------------------------------

function Indice() {
  useSEO({
    title: 'Consultas de ECMO y medicina crítica',
    description: 'Respuestas claras sobre ECMO, enfermería crítica, simulación clínica e insuficiencia cardiaca, con fuentes oficiales. Por el equipo académico de HCE.',
  });
  const [q, setQ] = useState('');
  const [tema, setTema] = useState('');
  const temas = useMemo(() => [...new Set(CONSULTAS.map((c) => c.cluster))], []);
  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    return CONSULTAS.filter((c) => (!tema || c.cluster === tema)
      && (!t || sinAcentos([c.titulo, c.cluster, c.extracto, ...c.buscar].join(' ')).includes(t)));
  }, [q, tema]);

  return (
    <>
      <section className="cs-hero">
        <div className="cs-contenedor">
          <Migas pasos={[{ nombre: 'Consultas' }]} />
          <div className="cs-hero-grid">
            <div>
              <p className="cs-eyebrow">HCE explica</p>
              <h1>Consultas de ECMO y medicina crítica</h1>
              <p className="cs-lead">Respuestas claras para médicos, enfermería y perfusión: qué es, cómo se hace y dónde aprenderlo, con fuentes oficiales.</p>
              <label className="cs-buscador">
                <span className="cs-sr">Buscar una consulta</span>
                <Search size={20} aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca ECMO V-V, enfermería, certificación…" />
              </label>
            </div>
            <figure className="cs-hero-foto">
              <img src="/consultas/portada.webp" alt="Instructor de HCE muestra la bomba y el oxigenador de un circuito de ECMO a un grupo de profesionales durante una simulación" width="1200" height="900" />
              <figcaption>Práctica con el circuito de ECMO · Paris ECMO Simulation Course, Santiago de Chile 2025</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="cs-indice">
        <div className="cs-contenedor">
          <div className="cs-indice-cabeza">
            <div>
              <p className="cs-eyebrow">Índice clínico</p>
              <h2>Consultas prioritarias</h2>
            </div>
            <span className="cs-contador">{lista.length} de {CONSULTAS.length}</span>
          </div>
          <div className="cs-filtros" role="group" aria-label="Filtrar por tema">
            {['', ...temas].map((t) => (
              <button key={t || 'todas'} type="button" className={tema === t ? 'activo' : ''} aria-pressed={tema === t} onClick={() => setTema(t)}>
                {t || 'Todas'}
              </button>
            ))}
          </div>
          {lista.length ? (
            <div className="cs-tarjetas">
              {lista.map((c) => {
                const Icono = ICONOS[c.tono] || BookOpenCheck;
                return (
                  <article key={c.slug} className="cs-tarjeta">
                    <div className="cs-tarjeta-cabeza">
                      <span className="cs-icono"><Icono size={24} aria-hidden="true" /></span>
                      <span className={`cs-insignia cs-insignia--${c.tono}`}>{c.insignia}</span>
                    </div>
                    <p className="cs-codigo">{c.codigo} · {c.cluster}</p>
                    <h3>{c.tituloCorto}</h3>
                    <p className="cs-extracto">{c.extracto}</p>
                    <Link to={`/consultas/${c.slug}`} className="cs-abrir">Abrir consulta <ArrowRight size={16} aria-hidden="true" /></Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cs-vacio">
              <p><strong>No encontramos una consulta con ese término.</strong></p>
              <p>Prueba con "ECMO", "enfermería", "simulación" o "certificación".</p>
            </div>
          )}

          <div className="cs-indice-cabeza cs-indice-cabeza--sub">
            <div><p className="cs-eyebrow">Donde se aprende</p><h2>Programas HCE</h2></div>
          </div>
          <div className="cs-posters">
            {PROGRAMAS.map((p) => <TarjetaPrograma key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      <BandaFinal titulo="Una consulta orienta. Un programa te prepara para el paciente real." boton="Ver programas" enlace="/programas" />
    </>
  );
}

// ---- Una consulta ----------------------------------------------------------------

function Ficha({ c }) {
  useSEO({ title: c.titulo, description: c.descripcion });
  const p = programaDe(c.programa);
  const programa = p && { nombre: p.nombre, enlace: p.ruta };
  const relacionadas = c.relacionadas.map(consultaPorSlug).filter(Boolean);

  return (
    <article className="cs-ficha">
      <header className="cs-ficha-cabeza">
        <div className="cs-contenedor">
          <Migas pasos={[{ nombre: 'Consultas', enlace: '/consultas' }, { nombre: c.tituloCorto }]} />
          <div className="cs-ficha-grid">
            <div>
              <div className="cs-chips">
                <span className="cs-chip-codigo">{c.codigo}</span>
                <span className="cs-chip-cluster">{c.cluster}</span>
                <span className={`cs-insignia cs-insignia--${c.tono}`}>{c.insignia}</span>
              </div>
              <div className="cs-voz">
                <span className="cs-voz-logo"><img src="/assets/componentes/firma-hce.png" alt="Logo de HCE" width="60" height="40" /></span>
                <p><strong>HCE – Healthcare Training Experience</strong> explica: “{c.lineaHce}”</p>
              </div>
              <h1>{c.titulo}</h1>
            </div>
            <aside>
              <figure className="cs-foto">
                <img src={c.imagen.src} alt={c.imagen.alt} width="1200" height="900" />
                <figcaption>{c.imagen.pie}</figcaption>
              </figure>
              <div className="cs-dato-lateral">
                <p className="cs-eyebrow">Ficha clínica</p>
                <p><strong>Última actualización</strong></p>
                <time dateTime={c.actualizado}>{fecha(c.actualizado)}</time>
                <p className="cs-autor">{AUTOR}</p>
              </div>
              {p && (
                <div className="cs-programa-lateral">
                  <p className="cs-eyebrow">Lo enseñamos en</p>
                  <TarjetaPrograma p={p} />
                </div>
              )}
            </aside>
          </div>

          {c.revisor && <p className="cs-revisado">Revisado por {c.revisor}</p>}
        </div>
      </header>

      <div className="cs-contenedor cs-cuerpo">
        <aside className="cs-toc" aria-label="Índice de la consulta">
          <p className="cs-toc-titulo"><BookOpenCheck size={16} aria-hidden="true" /> En esta consulta</p>
          <nav>
            <a href="#respuesta-rapida">Respuesta rápida</a>
            <a href="#ficha-clinica">Ficha clínica</a>
            {c.secciones.map((s) => <a key={s.id} href={`#${s.id}`}>{s.titulo}</a>)}
            <a href="#preguntas">Preguntas frecuentes</a>
            <a href="#fuentes">Fuentes</a>
          </nav>
        </aside>

        <div className="cs-contenido">
          <section id="respuesta-rapida" className="cs-respuesta">
            <p className="cs-eyebrow cs-eyebrow--claro">Respuesta rápida</p>
            <p className="guia-respuesta">{c.respuestaRapida}</p>
          </section>

          <section id="ficha-clinica" className="cs-bloque">
            <h2 className="cs-h2-icono"><ClipboardCheck size={24} aria-hidden="true" /> Ficha clínica</h2>
            <div className="cs-tabla cs-tabla--ficha" tabIndex={0}>
              <table><tbody>
                {c.ficha.map((f) => <tr key={f.dato}><th scope="row">{f.dato}</th><td>{f.valor}</td></tr>)}
              </tbody></table>
            </div>
          </section>

          {c.secciones.map((s, i) => {
            const Icono = ICONOS_BLOQUE[i % ICONOS_BLOQUE.length];
            return (
              <section key={s.id} id={s.id} className="cs-bloque cs-bloque--linea">
                <p className="cs-num">BLOQUE_{String(i + 1).padStart(2, '0')}</p>
                <h2 className="cs-h2-icono"><Icono size={24} aria-hidden="true" /> {s.titulo}</h2>
                {(s.parrafos || []).map((p) => <p key={p} className="cs-parrafo">{p}</p>)}
                {s.puntos && (
                  <ul className="cs-puntos">
                    {s.puntos.map((p) => <li key={p}><FileCheck2 size={18} aria-hidden="true" />{p}</li>)}
                  </ul>
                )}
                {s.tabla && <Tabla tabla={s.tabla} />}
                {s.nota && (
                  <div className="cs-nota" role="note">
                    <TriangleAlert size={20} aria-hidden="true" />
                    <p>
                      {s.nota}
                      {s.notaEnlace?.url && (
                        <>
                          {' '}
                          <a className="cs-nota-enlace" href={s.notaEnlace.url} target="_blank" rel="noopener noreferrer">
                            {s.notaEnlace.texto} <ExternalLink size={13} aria-hidden="true" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                )}
                {i === 0 && p && (
                  <div className="cs-cta-medio cs-cta-medio--poster">
                    <img src={p.poster} alt="" width="800" height="800" loading="lazy" />
                    <p>{c.ctaIntermedio}</p>
                    <Link to={p.ruta}>Ver programa <ArrowRight size={15} /></Link>
                  </div>
                )}
              </section>
            );
          })}

          <section className="cs-vision">
            <h2 className="cs-h2-icono"><ShieldCheck size={26} aria-hidden="true" /> La visión del equipo académico</h2>
            <p>{c.vision}</p>
          </section>

          <section className="cs-bloque cs-bloque--linea">
            <h2 className="cs-h2-icono"><Link2 size={22} aria-hidden="true" /> Consultas relacionadas</h2>
            <div className="cs-relacionadas">
              {relacionadas.map((r) => <Link key={r.slug} to={`/consultas/${r.slug}`}>{r.tituloCorto}</Link>)}
              {programa && <Link to={programa.enlace} className="cs-relacionada-programa">{programa.nombre}</Link>}
            </div>
          </section>

          <section id="preguntas" className="cs-bloque cs-bloque--linea">
            <h2>Preguntas frecuentes</h2>
            <Preguntas faqs={c.faqs} />
          </section>

          <section id="fuentes" className="cs-bloque cs-bloque--linea">
            <h2>Fuentes</h2>
            <ul className="cs-fuentes">
              {c.fuentes.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre} <ExternalLink size={14} aria-hidden="true" /></a></li>)}
            </ul>
            <p className="cs-legal">Publicada el {fecha(c.publicado)} · última actualización {fecha(c.actualizado)}. Contenido educativo para profesionales de la salud; no constituye consejo médico ni sustituye los protocolos institucionales.</p>
          </section>

          {p && (
            <section className="cs-cta-final cs-cta-final--poster">
              <div>
                <p className="cs-eyebrow cs-eyebrow--claro">Equipo académico HCE</p>
                <h2>{c.ctaIntermedio}</h2>
                <div className="cs-cta-botones">
                  <Link to={p.ruta} className="cs-boton-cian">Ver {p.nombre} <ArrowRight size={16} /></Link>
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="cs-boton-contorno"><MessageCircle size={16} /> WhatsApp</a>
                </div>
              </div>
              <Link to={p.ruta} className="cs-cta-poster" aria-label={p.nombre}>
                <img src={p.poster} alt={`${p.nombre} — HCE`} width="800" height="800" loading="lazy" />
              </Link>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Consultas() {
  const { slug } = useParams();
  const c = slug ? consultaPorSlug(slug) : null;
  if (slug && !c) return <NotFound />;
  return (
    <div className="cs-pagina">
      <Navbar />
      <main>{c ? <Ficha c={c} /> : <Indice />}</main>
      <Footer />
    </div>
  );
}

// ---- Preguntas frecuentes ----------------------------------------------------------

export function PreguntasFrecuentes() {
  useSEO({
    title: 'Preguntas frecuentes',
    description: 'Respuestas sobre los programas de HCE (fechas, inscripción, pagos, certificados y factura) y sobre ECMO, con fuentes oficiales.',
  });
  const [q, setQ] = useState('');
  const [tema, setTema] = useState('');
  const grupos = useMemo(() => {
    const t = sinAcentos(q.trim());
    return GRUPOS_FAQ
      .filter((g) => !tema || g.id === tema)
      .map((g) => ({ ...g, faqs: g.faqs.filter((f) => !t || sinAcentos(`${f.pregunta} ${f.respuesta}`).includes(t)) }))
      .filter((g) => g.faqs.length);
  }, [q, tema]);
  const total = grupos.reduce((n, g) => n + g.faqs.length, 0);

  return (
    <div className="cs-pagina">
      <Navbar />
      <main>
        <section className="cs-hero">
          <div className="cs-contenedor">
            <Migas pasos={[{ nombre: 'Preguntas frecuentes' }]} />
            <div className="cs-hero-grid">
              <div>
                <p className="cs-eyebrow">Centro de ayuda</p>
                <h1>Preguntas frecuentes</h1>
                <p className="cs-lead">Fechas, inscripción, pagos, certificados y lo esencial de ECMO, en respuestas cortas. Si quieres más detalle, cada respuesta te lleva a su consulta completa.</p>
                <label className="cs-buscador">
                  <span className="cs-sr">Buscar una pregunta</span>
                  <Search size={20} aria-hidden="true" />
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca factura, certificado, ECMO V-V…" />
                </label>
              </div>
              <div className="cs-faq-resumen">
                {GRUPOS_FAQ.map((g) => {
                  const Icono = g.icono;
                  return (
                    <button key={g.id} type="button" onClick={() => { setTema(g.id); document.getElementById('faq-lista')?.scrollIntoView({ behavior: 'smooth' }); }}>
                      <span className="cs-icono"><Icono size={22} aria-hidden="true" /></span>
                      <span><strong>{g.titulo}</strong><small>{g.faqs.length} preguntas</small></span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="cs-indice" id="faq-lista">
          <div className="cs-contenedor cs-faq-grid">
            <div>
              <div className="cs-filtros" role="group" aria-label="Filtrar por tema">
                {[{ id: '', titulo: 'Todas' }, ...GRUPOS_FAQ].map((g) => (
                  <button key={g.id || 'todas'} type="button" className={tema === g.id ? 'activo' : ''} aria-pressed={tema === g.id} onClick={() => setTema(g.id)}>
                    {g.titulo}
                  </button>
                ))}
              </div>
              {total ? grupos.map((g) => (
                <div key={g.id} className="cs-faq-grupo">
                  <h2 className="cs-faq-titulo">{g.titulo}</h2>
                  {g.faqs.map((f, i) => {
                    const consulta = f.consulta && consultaPorSlug(f.consulta);
                    return (
                      <details key={f.pregunta} className="cs-faq">
                        <summary>
                          <span className="cs-faq-num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="cs-faq-pregunta">{f.pregunta}</span>
                          <Plus size={18} aria-hidden="true" className="cs-faq-mas" />
                        </summary>
                        <div className="cs-faq-respuesta">
                          <p>{f.respuesta}</p>
                          {consulta && <Link to={`/consultas/${consulta.slug}`}>Leer la consulta: {consulta.tituloCorto} <ArrowRight size={14} aria-hidden="true" /></Link>}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )) : (
                <div className="cs-vacio">
                  <p><strong>No encontramos esa pregunta.</strong></p>
                  <p>Escríbenos por WhatsApp y te respondemos.</p>
                </div>
              )}
            </div>

            <aside className="cs-faq-lateral">
              <div className="cs-faq-contacto">
                <MessageCircle size={26} aria-hidden="true" />
                <h2>¿Aún tienes dudas?</h2>
                <p>Te orientamos sin compromiso sobre programas, fechas y pagos.</p>
                <a className="cs-boton-cian" href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowRight size={16} /></a>
                <a className="cs-faq-correo" href="mailto:academia@healthcareexp.com"><Mail size={15} aria-hidden="true" /> academia@healthcareexp.com</a>
              </div>
              <p className="cs-eyebrow">Nuestros programas</p>
              <div className="cs-posters cs-posters--lista">
                {PROGRAMAS.map((p) => <TarjetaPrograma key={p.id} p={p} />)}
              </div>
              <Link to="/consultas" className="cs-abrir">Ver todas las consultas <ArrowRight size={16} /></Link>
            </aside>
          </div>
        </section>
        <BandaFinal titulo="¿No encontraste tu respuesta? Te orientamos sin compromiso." />
      </main>
      <Footer />
    </div>
  );
}

const GRUPOS_FAQ = [
  { id: 'programas', titulo: 'Programas y fechas', icono: GraduationCap, faqs: FAQ_PROGRAMAS.filter((f) => f.tema === 'programas') },
  { id: 'pagos', titulo: 'Inscripción, pagos y documentos', icono: CreditCard, faqs: FAQ_PROGRAMAS.filter((f) => f.tema === 'pagos') },
  { id: 'ecmo', titulo: 'Sobre ECMO', icono: IconoEcmo, faqs: FAQ_ECMO },
];

// ---- Hub de programas -----------------------------------------------------------------

export function Programas() {
  useSEO({
    title: 'Cursos de ECMO y alianzas académicas en México y Latinoamérica',
    description: 'Programas propios de HCE en ECMO, cuidados críticos y simulación clínica: Diploma de París en ECMO, ECMO Nursing Care y ECMO SIM, y alianzas académicas con instituciones y sociedades médicas.',
  });
  return (
    <div className="cs-pagina">
      <Navbar />
      <main>
        <section className="cs-hero">
          <div className="cs-contenedor">
            <Migas pasos={[{ nombre: 'Programas' }]} />
            <div className="cs-hero-grid">
              <div>
                <p className="cs-eyebrow">Programas HCE</p>
                <h1>{PROGRAMAS_H1}</h1>
                <p className="cs-lead">{PROGRAMAS_TEXTO}</p>
              </div>
              <figure className="cs-hero-foto">
                <img src="/consultas/programas.webp" alt="Prof. Matthieu Schmidt, Dra. Jenifer Trejo Guerra y Prof. Alain Combes en el Paris International Diploma in ECMO, INER" width="1200" height="900" />
                <figcaption>Prof. Matthieu Schmidt, Dra. Jenifer Trejo Guerra y Prof. Alain Combes · Diploma de París, INER 2025</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="cs-indice">
          <div className="cs-contenedor">
            <div className="cs-indice-cabeza"><div><p className="cs-eyebrow">Comparativa</p><h2>¿Qué programa es para ti?</h2></div></div>
            <div className="cs-tabla" tabIndex={0} aria-label="Comparativa de programas — tabla desplazable">
              <table>
                <caption>Programas de HCE – Healthcare Training Experience</caption>
                <thead><tr><th scope="col">Programa</th><th scope="col">Para quién</th><th scope="col">Modalidad</th><th scope="col">Inicio</th></tr></thead>
                <tbody>
                  {PROGRAMAS.map((p) => (
                    <tr key={p.id}><th scope="row"><Link to={p.ruta}>{p.nombre}</Link></th><td>{p.publico}</td><td>{p.modalidad}</td><td>{p.inicio}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cs-programas">
              {PROGRAMAS.map((p) => (
                <article key={p.id} className="cs-programa">
                  <Link to={p.ruta} className="cs-programa-poster" tabIndex={-1} aria-hidden="true">
                    <img src={p.poster} alt="" width="800" height="800" loading="lazy" />
                  </Link>
                  <div>
                    <h3><Link to={p.ruta}>{p.nombre}</Link></h3>
                    <p className="cs-distintivo">{p.distintivo}</p>
                    <p className="cs-extracto">{p.resumen}</p>
                    <dl className="cs-programa-datos">
                      <div><dt>Para quién</dt><dd>{p.publico}</dd></div>
                      <div><dt>Modalidad</dt><dd>{p.modalidad}</dd></div>
                      <div><dt>Inicio</dt><dd>{p.inicio}</dd></div>
                    </dl>
                    <p className="cs-codigo">Consultas relacionadas</p>
                    <div className="cs-relacionadas">
                      {p.consultas.map(consultaPorSlug).filter(Boolean).map((c) => <Link key={c.slug} to={`/consultas/${c.slug}`}>{c.tituloCorto}</Link>)}
                    </div>
                    <Link to={p.ruta} className="cs-boton-azul cs-programa-boton">Ver programa <ArrowRight size={16} /></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <BandaFinal titulo="¿Tienes dudas de cuál programa tomar? Escríbenos." />
      </main>
      <Footer />
    </div>
  );
}

// ---- Para hospitales ------------------------------------------------------------------

export function ParaHospitales() {
  useSEO({
    title: 'Capacitación en ECMO para tu hospital',
    description: 'Entrenamos a tu equipo en ECMO según las necesidades de tu hospital: simulación, el simulador ECMO SIM y un portal con bibliografía científica y seguimiento de avance.',
  });
  const servicios = [
    { icono: Users, titulo: 'Equipos ECMO nuevos', texto: 'Formación para médicos, enfermería y perfusión que arrancan un programa de ECMO: bases, protocolos y trabajo en equipo.' },
    { icono: MonitorPlay, titulo: 'Simulación con ECMO SIM', texto: 'Práctica en línea de decisiones y emergencias del circuito para todo el equipo, a su ritmo.' },
    { icono: Building2, titulo: 'Capacitación a la medida', texto: 'Programas según las necesidades de tu hospital: temas, fechas y número de participantes.' },
    { icono: GraduationCap, titulo: 'Portal propio para tu institución', texto: 'Tus profesionales entran a un portal con sus cursos, bibliografía científica y reportes de avance.' },
  ];
  return (
    <div className="cs-pagina">
      <Navbar />
      <main>
        <section className="cs-hero">
          <div className="cs-contenedor">
            <Migas pasos={[{ nombre: 'Para hospitales' }]} />
            <div className="cs-hero-grid">
              <div>
                <p className="cs-eyebrow">Hospitales e instituciones</p>
                <h1>{HOSPITALES_H1}</h1>
                <p className="cs-lead">{HOSPITALES_TEXTO}</p>
                <div className="cs-cta-botones">
                  <a className="cs-boton-azul" href={`${WHATSAPP}?text=${encodeURIComponent('Hola, me interesa capacitación en ECMO para mi hospital.')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Hablar con HCE</a>
                  <a className="cs-boton-linea" href="mailto:academia@healthcareexp.com?subject=Capacitaci%C3%B3n%20para%20hospital">academia@healthcareexp.com</a>
                </div>
              </div>
              <figure className="cs-hero-foto">
                <img src="/consultas/hospitales.webp" alt="Instructores de HCE guían a médicos y enfermería en el manejo de la consola de ECMO durante un taller de simulación" width="1200" height="900" />
                <figcaption>Taller de simulación en ECMO con equipos de salud · Santiago de Chile 2025</figcaption>
              </figure>
            </div>
          </div>
        </section>
        <section className="cs-indice">
          <div className="cs-contenedor">
            <div className="cs-indice-cabeza"><div><p className="cs-eyebrow">Qué ofrecemos</p><h2>Formación para todo tu equipo</h2></div></div>
            <div className="cs-tarjetas">
              {servicios.map((sv) => {
                const Icono = sv.icono;
                return (
                  <article key={sv.titulo} className="cs-tarjeta">
                    <span className="cs-icono"><Icono size={24} aria-hidden="true" /></span>
                    <h3>{sv.titulo}</h3>
                    <p className="cs-extracto">{sv.texto}</p>
                  </article>
                );
              })}
            </div>
            <div className="cs-indice-cabeza cs-indice-cabeza--sub">
              <div><p className="cs-eyebrow">Programas que llevamos a tu hospital</p><h2>Elige por dónde empezar</h2></div>
            </div>
            <div className="cs-posters">
              {PROGRAMAS.map((p) => <TarjetaPrograma key={p.id} p={p} />)}
            </div>
            <div className="cs-cta-medio cs-cta-medio--ancho">
              <p>Lee primero: qué necesita un hospital para arrancar un programa de ECMO.</p>
              <Link to="/consultas/programa-ecmo-hospital">Programa de ECMO en tu hospital <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
        <BandaFinal titulo="Cuéntanos de tu equipo y armamos la propuesta." />
      </main>
      <Footer />
    </div>
  );
}
