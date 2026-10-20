// Consultas HCE (blog clínico) — mismo diseño que las consultas de apen.mx:
// índice con buscador y fichas; cada consulta con respuesta rápida, ficha
// clínica, bloques numerados, preguntas frecuentes, fuentes y programa.
// También: preguntas frecuentes, hub de programas y página para hospitales.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, ArrowRight, BookOpenCheck, Building2, ClipboardCheck, ExternalLink, FileCheck2, FileSearch,
  GraduationCap, HeartPulse, Link2, MessageCircle, MonitorPlay, Search, ShieldCheck, Stethoscope, TriangleAlert, Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import NotFound from './NotFound';
import { useSEO } from '../hooks/useSEO';
import { AUTOR, CONSULTAS, FAQ_ECMO, FAQ_PROGRAMAS, PROGRAMAS_CTA, consultaPorSlug } from '../data/consultas';
import { DEFINICION_HCE, PROGRAMAS } from '../data/programas';
import './Consultas.css';

const WHATSAPP = 'https://wa.me/525659271906';
const ICONOS = { ecmo: Activity, enfermeria: Stethoscope, formacion: GraduationCap, simulacion: MonitorPlay, ic: HeartPulse };
const ICONOS_BLOQUE = [FileSearch, ClipboardCheck, ShieldCheck, BookOpenCheck];
const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const sinAcentos = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    if (!t) return CONSULTAS;
    return CONSULTAS.filter((c) => sinAcentos([c.titulo, c.cluster, c.extracto, ...c.buscar].join(' ')).includes(t));
  }, [q]);

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
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca ECMO VV, enfermería, certificación…" />
              </label>
            </div>
            <figure className="cs-hero-foto">
              <img src="/consultas/portada.webp" alt="Generación del Diploma de París en ECMO de HCE" width="1200" height="900" />
              <figcaption>Generación del Diploma de París · INER 2025</figcaption>
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
            <BookOpenCheck size={34} aria-hidden="true" />
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
                    {!c.revisor && <p className="cs-pendiente"><TriangleAlert size={14} aria-hidden="true" /> Pendiente de revisión médica</p>}
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
        </div>
      </section>

      <BandaFinal titulo="Una consulta orienta. Un programa te prepara para el paciente real." boton="Ver programas" enlace="/programas" />
    </>
  );
}

// ---- Una consulta ----------------------------------------------------------------

function Ficha({ c }) {
  useSEO({ title: c.titulo, description: c.descripcion });
  const programa = PROGRAMAS_CTA[c.programa];
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
                <span className="cs-voz-logo" aria-hidden="true">HCE</span>
                <p>HCE explica: “{c.lineaHce}”</p>
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
                {programa && <Link to={programa.enlace} className="cs-enlace-programa">{programa.nombre} <ArrowRight size={14} /></Link>}
              </div>
            </aside>
          </div>

          {!c.revisor && (
            <div className="cs-aviso" role="status">
              <TriangleAlert size={22} aria-hidden="true" />
              <div>
                <p className="cs-aviso-titulo">Consulta pendiente de revisión médica</p>
                <p>Contenido educativo para profesionales de la salud. No sustituye el juicio clínico ni los protocolos de tu hospital.</p>
              </div>
            </div>
          )}
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
                    <p>{s.nota}</p>
                  </div>
                )}
                {i === 0 && programa && (
                  <div className="cs-cta-medio">
                    <p>{c.ctaIntermedio}</p>
                    <Link to={programa.enlace}>Ver programa <ArrowRight size={15} /></Link>
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

          {programa && (
            <section className="cs-cta-final">
              <p className="cs-eyebrow cs-eyebrow--claro">Equipo académico HCE</p>
              <h2>{c.ctaIntermedio}</h2>
              <div className="cs-cta-botones">
                <Link to={programa.enlace} className="cs-boton-cian">Ver {programa.nombre} <ArrowRight size={16} /></Link>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="cs-boton-contorno"><MessageCircle size={16} /> WhatsApp</a>
              </div>
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
  return (
    <div className="cs-pagina">
      <Navbar />
      <main>
        <section className="cs-hero cs-hero--simple">
          <div className="cs-contenedor">
            <Migas pasos={[{ nombre: 'Preguntas frecuentes' }]} />
            <p className="cs-eyebrow">Ayuda</p>
            <h1>Preguntas frecuentes</h1>
            <p className="cs-lead">{DEFINICION_HCE}</p>
          </div>
        </section>
        <section className="cs-indice">
          <div className="cs-contenedor cs-dos-bloques">
            <div>
              <p className="cs-eyebrow">Bloque 1</p>
              <h2 className="cs-h2">Sobre los programas de HCE</h2>
              <Preguntas faqs={FAQ_PROGRAMAS} />
            </div>
            <div>
              <p className="cs-eyebrow">Bloque 2</p>
              <h2 className="cs-h2">Sobre ECMO</h2>
              <Preguntas faqs={FAQ_ECMO} />
              <Link to="/consultas" className="cs-abrir">Ver todas las consultas <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>
        <BandaFinal titulo="¿No encontraste tu respuesta? Te orientamos sin compromiso." />
      </main>
      <Footer />
    </div>
  );
}

// ---- Hub de programas -----------------------------------------------------------------

export function Programas() {
  useSEO({
    title: 'Cursos de ECMO y cuidados críticos en México y Latinoamérica',
    description: 'Todos los programas de HCE: Diploma de París en ECMO, ECMO Nursing Care y ECMO SIM. Compara público, modalidad e inicio.',
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
                <h1>Cursos de ECMO y cuidados críticos en México y Latinoamérica</h1>
                <p className="cs-lead">{DEFINICION_HCE} Compara los programas y elige el que va contigo.</p>
              </div>
              <figure className="cs-hero-foto">
                <img src="/consultas/programas.webp" alt="Profesores del Diploma de París en ECMO en el INER" width="1200" height="900" />
                <figcaption>Diploma de París · INER, Ciudad de México</figcaption>
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
                  <img src={p.imagen} alt="" width="1200" height="900" loading="lazy" />
                  <div>
                    <h3>{p.nombre}</h3>
                    <p className="cs-distintivo">{p.distintivo}</p>
                    <p className="cs-extracto">{p.resumen}</p>
                    <p className="cs-codigo">Consultas: {p.consultas.map((s) => consultaPorSlug(s)?.tituloCorto).filter(Boolean).join(' · ')}</p>
                    <Link to={p.ruta} className="cs-abrir">Ver programa <ArrowRight size={16} /></Link>
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
    title: 'Capacitación en ECMO para hospitales',
    description: 'Capacitación en ECMO y cuidados críticos para equipos de hospital: programas para equipos ECMO nuevos, simulación con ECMO SIM y formación a la medida.',
  });
  const servicios = [
    { icono: Users, titulo: 'Equipos ECMO nuevos', texto: 'Formación para médicos, enfermería y perfusión que arrancan un programa de ECMO: bases, protocolos y trabajo en equipo.' },
    { icono: MonitorPlay, titulo: 'Simulación con ECMO SIM', texto: 'Práctica en línea de decisiones y emergencias del circuito para todo el equipo, a su ritmo.' },
    { icono: Building2, titulo: 'Capacitación a la medida', texto: 'Programas según las necesidades de tu hospital: temas, fechas y número de participantes.' },
    { icono: GraduationCap, titulo: 'Portal propio para tu institución', texto: 'Tus profesionales entran a un portal con el logo de tu hospital, sus cursos y sus reportes de avance.' },
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
                <h1>Capacitación en ECMO para hospitales</h1>
                <p className="cs-lead">Entrenamos a tu equipo en ECMO y cuidados críticos con profesores internacionales, simulación y un portal con seguimiento de avance.</p>
                <div className="cs-cta-botones">
                  <a className="cs-boton-azul" href={`${WHATSAPP}?text=${encodeURIComponent('Hola, me interesa capacitación en ECMO para mi hospital.')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Hablar con HCE</a>
                  <a className="cs-boton-linea" href="mailto:academia@healthcareexp.com?subject=Capacitaci%C3%B3n%20para%20hospital">academia@healthcareexp.com</a>
                </div>
              </div>
              <figure className="cs-hero-foto">
                <img src="/consultas/hospitales.webp" alt="Instructores de HCE con un equipo de salud durante una práctica de ECMO" width="1200" height="900" />
                <figcaption>Práctica con equipos de salud · HCE, INER 2025</figcaption>
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
            <div className="cs-cta-medio cs-cta-medio--ancho">
              <p>Lee primero: cómo funciona la ECMO y por qué la simulación es clave para un equipo nuevo.</p>
              <Link to="/consultas/simulacion-ecmo">Simulación en ECMO <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
        <BandaFinal titulo="Cuéntanos de tu equipo y armamos la propuesta." />
      </main>
      <Footer />
    </div>
  );
}
