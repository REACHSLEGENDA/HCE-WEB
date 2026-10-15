import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheck, SearchX, Search, RefreshCw, CalendarDays, BookOpen, UserRound, Hash,
  Clock, CircleAlert, QrCode, Info,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';
import { normalizarFolio, folioValido } from '../lib/certificados';
import './VerificarCertificado.css';

/* ---------------------------------------------------------------------------
 * Verificación pública de certificados: /verificar/:folio
 *
 * A esta página lleva el QR del certificado en PDF. Cualquiera (un hospital,
 * un empleador) comprueba sin iniciar sesión que el folio existe en nuestro
 * registro. Solo se muestra lo que devuelve certificado-verificar: titular,
 * curso, fecha de emisión, vigencia y folio. Va con noindex: los nombres de
 * los alumnos no deben salir en buscadores.
 * ------------------------------------------------------------------------ */

const ENDPOINT = '/.netlify/functions/certificado-verificar';

const fechaLarga = (iso) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Vigencia({ vigencia }) {
  const { estado, hasta } = vigencia || {};
  if (estado === 'vigente') {
    return <span className="vc-chip vc-chip--ok">Vigente hasta el {fechaLarga(hasta)}</span>;
  }
  if (estado === 'vencido') {
    return <span className="vc-chip vc-chip--aviso">Vencido el {fechaLarga(hasta)}</span>;
  }
  return <span className="vc-chip vc-chip--info">Permanente (sin fecha de vencimiento)</span>;
}

function Buscador({ inicial }) {
  const navigate = useNavigate();
  const [valor, setValor] = useState(inicial);
  const normal = normalizarFolio(valor);
  const vacio = !valor.trim();
  const invalido = !vacio && !folioValido(normal);

  const enviar = (e) => {
    e.preventDefault();
    if (vacio || invalido) return;
    navigate(`/verificar/${encodeURIComponent(normal)}`);
  };

  return (
    <form className="vc-buscador" onSubmit={enviar} noValidate>
      <label htmlFor="vc-folio" className="vc-buscador-label">
        {inicial ? 'Verificar otro folio' : 'Escribe el folio del certificado'}
      </label>
      <div className="vc-buscador-fila">
        <div className="vc-input-wrap">
          <Hash size={18} aria-hidden="true" />
          <input
            id="vc-folio"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="FOL-123456"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            aria-invalid={invalido}
            aria-describedby="vc-folio-ayuda"
          />
        </div>
        <button type="submit" className="vc-btn vc-btn--primario" disabled={vacio || invalido}>
          <Search size={18} aria-hidden="true" /> Verificar
        </button>
      </div>
      <p id="vc-folio-ayuda" className={`vc-buscador-ayuda${invalido ? ' vc-buscador-ayuda--error' : ''}`} aria-live="polite">
        {invalido
          ? 'Escríbelo como aparece en el certificado: FOL- seguido de 6 números.'
          : 'El folio aparece en el certificado, debajo del código QR.'}
      </p>
    </form>
  );
}

export default function VerificarCertificado() {
  const { folio: parametro = '' } = useParams();
  const folio = normalizarFolio(parametro);
  const valido = folioValido(folio);
  const [intento, setIntento] = useState(0);
  // El resultado se guarda con la consulta que lo produjo: si el folio cambia,
  // el resultado anterior deja de coincidir y se muestra "Consultando…".
  const [resultado, setResultado] = useState({ clave: null });
  const clave = `${folio}#${intento}`;

  useSEO({
    title: folio && valido ? `Verificar certificado ${folio}` : 'Verificar certificado',
    description: 'Comprueba que un certificado de Healthcare Training Experience (HCE) es auténtico con su folio o código QR.',
    noindex: true,
  });

  useEffect(() => {
    if (!valido) return undefined;
    const control = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${ENDPOINT}?folio=${encodeURIComponent(folio)}`, { signal: control.signal });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.certificado) {
          setResultado({ clave, estado: 'ok', certificado: data.certificado });
        } else if (res.status === 404) {
          setResultado({ clave, estado: 'no-encontrado' });
        } else if (res.status === 400) {
          setResultado({ clave, estado: 'formato' });
        } else {
          setResultado({ clave, estado: 'error', mensaje: data.error });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setResultado({ clave, estado: 'error' });
      }
    })();
    return () => control.abort();
  }, [folio, valido, clave]);

  let estado;
  if (!parametro) estado = 'vacio';
  else if (!valido) estado = 'formato';
  else if (resultado.clave !== clave) estado = 'buscando';
  else estado = resultado.estado;

  const cert = estado === 'ok' ? resultado.certificado : null;

  return (
    <div className="vc-page">
      <Navbar />

      <main className="vc-main">
        <div className="vc-inner">
          <header className="vc-encabezado">
            <span className="vc-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> Verificación de certificados</span>
            <h1 className="vc-titulo">Verificar un certificado HCE</h1>
            <p className="vc-subtitulo">
              Comprueba que un certificado emitido por Healthcare Training Experience es auténtico
              y está registrado en nuestro sistema.
            </p>
          </header>

          {estado === 'buscando' && (
            <section className="vc-tarjeta vc-tarjeta--cargando" role="status" aria-live="polite">
              <div className="vc-spinner" aria-hidden="true" />
              <p>Consultando el folio <strong>{folio}</strong>…</p>
            </section>
          )}

          {estado === 'ok' && cert && (
            <section className="vc-tarjeta vc-tarjeta--ok" aria-labelledby="vc-sello-titulo">
              <div className="vc-sello vc-sello--ok">
                <span className="vc-sello-icono" aria-hidden="true"><ShieldCheck size={30} /></span>
                <div>
                  <h2 id="vc-sello-titulo" className="vc-sello-titulo">Certificado verificado{' '}✓</h2>
                  <p className="vc-sello-texto">
                    Este certificado fue emitido por Healthcare Training Experience (HCE) y está
                    registrado en nuestro sistema.
                  </p>
                </div>
              </div>

              <dl className="vc-datos">
                <div className="vc-dato vc-dato--ancho">
                  <dt><UserRound size={16} aria-hidden="true" /> Titular</dt>
                  <dd className="vc-dato-nombre">{cert.titular || 'Nombre no registrado'}</dd>
                </div>
                <div className="vc-dato vc-dato--ancho">
                  <dt><BookOpen size={16} aria-hidden="true" /> Curso</dt>
                  <dd>{cert.curso || 'Curso no disponible'}</dd>
                </div>
                <div className="vc-dato">
                  <dt><CalendarDays size={16} aria-hidden="true" /> Fecha de emisión</dt>
                  <dd>{fechaLarga(cert.emitido_en)}</dd>
                </div>
                <div className="vc-dato">
                  <dt><Clock size={16} aria-hidden="true" /> Vigencia</dt>
                  <dd><Vigencia vigencia={cert.vigencia} /></dd>
                </div>
                <div className="vc-dato vc-dato--ancho">
                  <dt><Hash size={16} aria-hidden="true" /> Folio</dt>
                  <dd className="vc-folio">{cert.folio}</dd>
                </div>
              </dl>

              {cert.vigencia?.estado === 'vencido' && (
                <p className="vc-nota vc-nota--aviso">
                  <CircleAlert size={16} aria-hidden="true" />
                  El certificado es auténtico, pero su vigencia ya terminó.
                </p>
              )}
              <p className="vc-nota">
                <Info size={16} aria-hidden="true" />
                Revisa que el nombre coincida con el de la persona que presenta el certificado.
              </p>
            </section>
          )}

          {estado === 'no-encontrado' && (
            <section className="vc-tarjeta" aria-labelledby="vc-sello-titulo">
              <div className="vc-sello vc-sello--no">
                <span className="vc-sello-icono" aria-hidden="true"><SearchX size={30} /></span>
                <div>
                  <h2 id="vc-sello-titulo" className="vc-sello-titulo">No encontramos este folio</h2>
                  <p className="vc-sello-texto">
                    No hay ningún certificado registrado con el folio <strong className="vc-folio">{folio}</strong>.
                  </p>
                </div>
              </div>
              <ul className="vc-lista">
                <li>Revisa que esté escrito exactamente como aparece en el certificado (por ejemplo, FOL-123456).</li>
                <li>Si escaneaste el código QR y aun así ves este mensaje, el documento podría no ser auténtico.</li>
                <li>
                  ¿Crees que es un error? Escríbenos a{' '}
                  <a href="mailto:info@healthcareexp.com">info@healthcareexp.com</a> con el folio y te ayudamos.
                </li>
              </ul>
            </section>
          )}

          {estado === 'formato' && (
            <section className="vc-tarjeta" aria-labelledby="vc-sello-titulo">
              <div className="vc-sello vc-sello--no">
                <span className="vc-sello-icono" aria-hidden="true"><CircleAlert size={30} /></span>
                <div>
                  <h2 id="vc-sello-titulo" className="vc-sello-titulo">Ese folio no es válido</h2>
                  <p className="vc-sello-texto">
                    Los folios de los certificados HCE tienen la forma <strong className="vc-folio">FOL-123456</strong>.
                    Revisa el que aparece en el certificado y escríbelo abajo.
                  </p>
                </div>
              </div>
            </section>
          )}

          {estado === 'error' && (
            <section className="vc-tarjeta" role="alert">
              <div className="vc-sello vc-sello--error">
                <span className="vc-sello-icono" aria-hidden="true"><CircleAlert size={30} /></span>
                <div>
                  <h2 className="vc-sello-titulo">No pudimos consultar en este momento</h2>
                  <p className="vc-sello-texto">
                    {resultado.mensaje || 'Revisa tu conexión a internet e intenta de nuevo.'} Esto no
                    significa que el certificado sea falso.
                  </p>
                </div>
              </div>
              <button type="button" className="vc-btn vc-btn--secundario" onClick={() => setIntento((n) => n + 1)}>
                <RefreshCw size={17} aria-hidden="true" /> Reintentar
              </button>
            </section>
          )}

          {estado === 'vacio' && (
            <section className="vc-tarjeta vc-tarjeta--vacio">
              <span className="vc-vacio-icono" aria-hidden="true"><QrCode size={34} /></span>
              <p>
                Escanea el código QR del certificado o escribe su folio para comprobar que es auténtico.
              </p>
            </section>
          )}

          <Buscador key={folio} inicial={valido ? folio : ''} />

          <section className="vc-como" aria-labelledby="vc-como-titulo">
            <h2 id="vc-como-titulo">¿Cómo funciona?</h2>
            <ul>
              <li>
                <QrCode size={18} aria-hidden="true" />
                <span>Cada certificado HCE en PDF lleva un código QR y un folio único que llevan a esta página.</span>
              </li>
              <li>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>
                  Por privacidad solo mostramos el nombre del titular, el curso, la fecha de emisión y la vigencia.
                </span>
              </li>
            </ul>
            <p className="vc-como-pie">
              ¿Dudas? Escríbenos a <a href="mailto:info@healthcareexp.com">info@healthcareexp.com</a> o vuelve al{' '}
              <Link to="/">inicio</Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
