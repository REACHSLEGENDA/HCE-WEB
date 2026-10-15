import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, CalendarDays, Check, FileUp, Loader2, MailCheck, MapPin, MonitorPlay, PlayCircle, ShieldCheck, Ticket, Users, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';
import { useMonedaSugerida } from '../hooks/useMonedaSugerida';
import './AlumniPass.css';

/* ---------------------------------------------------------------------------
 * Alumni Pass: Step 1 Refresher (28 y 29 de octubre de 2026).
 *
 * Exclusivo para exalumnos del Diploma Internacional de París en ECMO.
 *   1. Solicitud: datos + foto del diploma de Step 1, sin pagar.
 *   2. El equipo la revisa en el panel (Ventas → Alumni Pass).
 *   3. Si la acepta, el exalumno recibe por correo su enlace de pago personal:
 *      /alumni-pass-step1?pago=<token> (vista PaginaPago).
 * Los precios los decide netlify/functions/alumni-pass.js; aquí solo se muestran.
 * ------------------------------------------------------------------------ */

const USD_RATE = 17.5; // Igual que la función.
const PRECIOS = { presencial: 7000, virtual: 4000 };
const GRABACIONES = 1299;
const MAX_PDF = 3.5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const llamar = async (cuerpo) => {
  const res = await fetch('/.netlify/functions/alumni-pass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(30000),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(datos.error || 'No se pudo completar. Intenta de nuevo.');
    err.estado = datos.estado;
    throw err;
  }
  return datos;
};

const dinero = (mxn, moneda) => (moneda === 'usd'
  ? `US$${Math.ceil(mxn / USD_RATE).toLocaleString('es-MX')}`
  : `$${mxn.toLocaleString('es-MX')} MXN`);

// Las fotos del celular pesan mucho: se reducen a 2000 px en JPEG antes de subir.
async function prepararArchivo(archivo) {
  if (archivo.type === 'application/pdf') {
    if (archivo.size > MAX_PDF) throw new Error('El PDF debe pesar menos de 3.5 MB. También puedes subir una foto.');
    return { blob: archivo, tipo: 'application/pdf' };
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No pudimos leer la imagen. Prueba con otra foto.'));
      i.src = url;
    });
    const escala = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((resolve) => lienzo.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('No pudimos preparar la imagen.');
    return { blob, tipo: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const aBase64 = (blob) => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(String(lector.result).split(',')[1] || '');
  lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  lector.readAsDataURL(blob);
});

function Encabezado({ onInscribirme }) {
  return (
    <section className="ap-hero">
      <div className="ap-ticket" aria-label="Alumni Pass">
        <div className="ap-ticket-talon" aria-hidden="true">
          <span>ALUMNI PASS</span>
        </div>
        <div className="ap-ticket-cuerpo">
          <p className="ap-kicker"><Award size={16} /> Exclusivo para exalumnos</p>
          <h1>
            Alumni Pass
            <span>Step 1 Refresher</span>
          </h1>
          <p className="ap-programa">Diploma Internacional de París en ECMO</p>
          <div className="ap-datos">
            <span><CalendarDays size={16} /> 28 y 29 de octubre de 2026</span>
            <span><MapPin size={16} /> Presencial o virtual</span>
          </div>
          <p className="ap-lema">
            Refresca tu conocimiento y conéctate en vivo con la facultad de París, con el
            <strong> Prof. Matthieu Schmidt</strong>, presidente actual de EuroELSO.
          </p>
          {onInscribirme && <button type="button" className="ap-cta" onClick={onInscribirme}>Quiero inscribirme aquí</button>}
        </div>
      </div>
    </section>
  );
}

function PaseConfirmado({ pase }) {
  return (
    <section className="ap-seccion ap-confirmado">
      <div className="ap-ticket ap-ticket--pase">
        <div className="ap-ticket-talon" aria-hidden="true"><span>{pase.folio}</span></div>
        <div className="ap-ticket-cuerpo">
          <p className="ap-kicker"><Check size={16} /> Pago confirmado</p>
          <h1>Tu Alumni Pass<span>está confirmado</span></h1>
          <dl className="ap-pase-datos">
            <div><dt>Nombre</dt><dd>{pase.nombre}</dd></div>
            <div><dt>Modalidad</dt><dd>{pase.modalidad === 'presencial' ? 'Presencial' : 'Virtual (streaming en vivo)'}</dd></div>
            <div><dt>Grabaciones</dt><dd>{pase.grabaciones ? 'Incluidas por 1 mes' : 'No incluidas'}</dd></div>
            <div><dt>Fechas</dt><dd>28 y 29 de octubre de 2026</dd></div>
            <div><dt>Folio</dt><dd>{pase.folio}</dd></div>
          </dl>
          <p className="ap-nota">
            {pase.correoEnviado ? <>El envío de tu pase está registrado para <strong>{pase.email}</strong>.</> : <>Tu pago quedó registrado. Conserva tu folio; el envío a <strong>{pase.email}</strong> está pendiente.</>} Antes del evento recibirás los detalles de acceso
            ({pase.modalidad === 'presencial' ? 'sede y horario' : 'enlace de la transmisión'}).
          </p>
          {pase.avisoCorreo && <p className="ap-aviso ap-aviso--info" role="status">{pase.avisoCorreo}</p>}
        </div>
      </div>
    </section>
  );
}

function SelectorMoneda({ moneda, onCambiar }) {
  return (
    <div className="ap-moneda" role="group" aria-label="Moneda">
      {['mxn', 'usd'].map((m) => (
        <button key={m} type="button" className={moneda === m ? 'activa' : ''} aria-pressed={moneda === m} onClick={() => onCambiar(m)}>
          {m === 'mxn' ? 'Pesos (MXN)' : 'Dólares (USD)'}
        </button>
      ))}
    </div>
  );
}

// ---- Enlace de pago personal (solicitud aceptada) -------------------------------

function PaginaPago({ token, cancelado }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [moneda, setMoneda] = useState('mxn');
  const [eligioMoneda, setEligioMoneda] = useState(false);
  const [grabaciones, setGrabaciones] = useState(false);
  const [modalidad, setModalidad] = useState('');
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState('');
  const pagandoRef = useRef(false);
  const [recarga, setRecarga] = useState(0);
  useMonedaSugerida(setMoneda, eligioMoneda);

  const cargar = () => {
    setInfo(null);
    setError('');
    setErrorPago('');
    setRecarga((n) => n + 1);
  };
  useEffect(() => {
    let vigente = true;
    llamar({ accion: 'pago-info', token }).then((r) => {
      if (!vigente) return;
      setInfo(r);
      setGrabaciones(!!r.grabaciones);
      setModalidad(r.modalidad === 'presencial' && r.presencial?.restantes <= 0 ? 'virtual' : r.modalidad);
    }).catch((err) => { if (vigente) setError(err.message); });
    return () => { vigente = false; };
  }, [token, recarga]);

  const pagar = async () => {
    if (pagandoRef.current) return;
    pagandoRef.current = true;
    setPagando(true);
    setErrorPago('');
    try {
      const { url } = await llamar({ accion: 'pagar', token, moneda, grabaciones, modalidad });
      window.location.href = url;
    } catch (err) {
      setErrorPago(err.message);
      if (err.estado === 'agotado') {
        setModalidad('virtual');
        setInfo((previa) => ({ ...previa, presencial: { ...previa.presencial, restantes: 0 } }));
      }
      if (err.estado === 'pagado') void cargar();
      setPagando(false);
      pagandoRef.current = false;
    }
  };

  if (error) {
    return (
      <section className="ap-seccion ap-centro">
        <div className="ap-aviso ap-aviso--error" role="alert">
          <p>{error}</p>
          <button type="button" className="ap-cta ap-cta--chico" onClick={cargar}>Reintentar</button>
        </div>
      </section>
    );
  }
  if (!info) {
    return <section className="ap-seccion ap-centro"><p className="ap-cargando"><Loader2 size={20} className="ap-girando" /> Cargando tu enlace de pago…</p></section>;
  }
  if (info.pagado) return <PaseConfirmado pase={info} />;

  const agotado = info.presencial?.restantes <= 0;
  const convertir = (importe) => moneda === 'usd' ? Math.ceil(importe / USD_RATE) : importe;
  const total = convertir(PRECIOS[modalidad]) + (grabaciones ? convertir(GRABACIONES) : 0);
  const totalTexto = moneda === 'usd' ? `US$${total.toLocaleString('es-MX')}` : `$${total.toLocaleString('es-MX')} MXN`;
  return (
    <>
      <Encabezado />
      <section className="ap-seccion">
        {cancelado && <p className="ap-aviso ap-aviso--info" role="status">Regresaste del pago. Puedes revisar tus opciones e intentarlo de nuevo. Si ya pagaste, espera la confirmación antes de repetirlo.</p>}
        <div className="ap-formulario" aria-busy={pagando}>
          <fieldset className="ap-controles" disabled={pagando}>
          <h2 className="ap-titulo-seccion"><Ticket size={22} /> ¡Hola, {String(info.nombre).split(/\s+/)[0]}! Tu solicitud fue aprobada</h2>
          <p className="ap-nota">Completa tu pago para asegurar tu lugar. Al pagar recibirás tu Alumni Pass con folio en <strong>{info.email}</strong>.</p>
          <SelectorMoneda moneda={moneda} onCambiar={(m) => { setMoneda(m); setEligioMoneda(true); }} />
          <div className="ap-campo-grupo">
            <span className="ap-etiqueta">Modalidad</span>
            <div className="ap-chips">
              {['presencial', 'virtual'].map((m) => (
                <button key={m} type="button" disabled={m === 'presencial' && agotado}
                  className={modalidad === m ? 'activa' : ''} aria-pressed={modalidad === m} onClick={() => setModalidad(m)}>
                  {m === 'presencial' ? `Presencial · ${dinero(PRECIOS.presencial, moneda)}${agotado ? ' (agotado)' : ''}` : `Virtual · ${dinero(PRECIOS.virtual, moneda)}`}
                </button>
              ))}
            </div>
            {agotado && info.modalidad === 'presencial' && <small className="ap-error-texto">Los lugares presenciales se agotaron; puedes asegurar tu lugar en la modalidad virtual.</small>}
          </div>
          <label className={`ap-extra${grabaciones ? ' activa' : ''}`}>
            <input type="checkbox" checked={grabaciones} onChange={(e) => setGrabaciones(e.target.checked)} />
            <span className="ap-tarjeta-icono"><PlayCircle size={22} /></span>
            <span>
              <strong>Grabaciones · +{dinero(GRABACIONES, moneda)}</strong>
              Acceso a las grabaciones de las ponencias por 1 mes en nuestro campus virtual.
            </span>
          </label>
          <div className="ap-resumen" aria-live="polite">
            <div><span>{modalidad === 'presencial' ? 'Presencial' : 'Virtual'}</span><strong>{dinero(PRECIOS[modalidad], moneda)}</strong></div>
            {grabaciones && <div><span>Grabaciones (1 mes)</span><strong>{dinero(GRABACIONES, moneda)}</strong></div>}
            <div className="ap-total"><span>Total</span><strong>{totalTexto}</strong></div>
          </div>
          {errorPago && <p className="ap-aviso ap-aviso--error" role="alert">{errorPago}</p>}
          <button type="button" className="ap-cta ap-cta--ancho" onClick={pagar} disabled={pagando || (modalidad === 'presencial' && agotado)}>
            {pagando ? 'Abriendo el pago seguro…' : 'Pagar mi Alumni Pass'}
          </button>
          <p className="ap-legal">Pago seguro con Stripe.</p>
          </fieldset>
        </div>
      </section>
    </>
  );
}

// ---- Página principal: información y solicitud --------------------------------

export default function AlumniPass() {
  useSEO({
    title: 'Alumni Pass · Step 1 Refresher',
    description: 'Exclusivo para exalumnos del Diploma Internacional de París en ECMO: 28 y 29 de octubre de 2026, presencial o virtual.',
    noindex: true,
  });

  const [params, setParams] = useSearchParams();
  const formularioRef = useRef(null);
  const [cupo, setCupo] = useState(null);
  const [modalidad, setModalidad] = useState('');
  const [grabaciones, setGrabaciones] = useState(false);
  const [datos, setDatos] = useState({ nombre: '', email: '', telefono: '', ciudad: '', pais: '', hospital: '', especialidad: '' });
  const [diploma, setDiploma] = useState(null); // { nombre, vista, blob, tipo }
  const [arrastrando, setArrastrando] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState('idle'); // idle | preparando | enviando
  const [error, setError] = useState('');
  const [tocado, setTocado] = useState({});
  const [enviada, setEnviada] = useState(false);
  const [acuseEnviado, setAcuseEnviado] = useState(null);
  const [solicitudClave] = useState(() => crypto.randomUUID());
  const ocupadoRef = useRef(false);
  const [pase, setPase] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [errorCupo, setErrorCupo] = useState(false);

  const status = params.get('status');
  const sessionId = params.get('session_id');
  const token = params.get('pago');

  useEffect(() => {
    let vigente = true;
    llamar({ accion: 'cupo' }).then((r) => { if (vigente) setCupo(r.presencial); }).catch(() => { if (vigente) setErrorCupo(true); });
    return () => { vigente = false; };
  }, []);

  const confirmar = async () => {
    if (!sessionId) return;
    setConfirmando(true);
    setErrorConfirmar('');
    try {
      setPase(await llamar({ accion: 'confirmar', sessionId, moneda: params.get('m') }));
    } catch (err) {
      setErrorConfirmar(err.message);
    } finally {
      setConfirmando(false);
    }
  };

  useEffect(() => {
    if (status === 'success' && sessionId) void confirmar();
    // Solo al volver de Stripe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId]);

  useEffect(() => () => { if (diploma?.vista) URL.revokeObjectURL(diploma.vista); }, [diploma]);

  const agotado = cupo && cupo.restantes <= 0;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim());
  const requerido = (v, msg) => (String(v).trim().length < 2 ? msg : '');
  const errores = {
    modalidad: !modalidad ? 'Elige presencial o virtual.' : (modalidad === 'presencial' && agotado ? 'Los lugares presenciales se agotaron.' : ''),
    nombre: datos.nombre.trim().length < 5 ? 'Escribe tu nombre completo como aparece en tu diploma.' : '',
    email: !emailValido ? 'Escribe un correo válido: ahí te llegará tu enlace de pago.' : '',
    telefono: datos.telefono.replace(/\D/g, '').length < 8 ? 'Escribe tu teléfono o WhatsApp con lada.' : '',
    ciudad: requerido(datos.ciudad, 'Escribe tu ciudad.'),
    pais: requerido(datos.pais, 'Escribe tu país.'),
    hospital: requerido(datos.hospital, 'Escribe tu hospital o institución.'),
    especialidad: requerido(datos.especialidad, 'Escribe tu especialidad.'),
    diploma: !diploma ? 'Sube la foto o copia de tu diploma de Step 1.' : '',
    acepta: !acepta ? 'Acepta el aviso de privacidad para continuar.' : '',
  };
  const NOMBRES = { modalidad: 'modalidad', nombre: 'nombre', email: 'correo', telefono: 'teléfono', ciudad: 'ciudad', pais: 'país', hospital: 'hospital', especialidad: 'especialidad', diploma: 'diploma', acepta: 'aceptar el aviso' };
  const listo = Object.values(errores).every((e) => !e);
  const ocupado = estado !== 'idle';

  const irAlFormulario = () => formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const elegir = (m) => {
    if (m === 'presencial' && agotado) return;
    setModalidad(m);
    setTocado((t) => ({ ...t, modalidad: true }));
  };

  const recibirArchivo = async (archivo) => {
    if (ocupadoRef.current) return;
    setError('');
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) {
      setError('El diploma debe ser una foto (JPG, PNG o WEBP) o un PDF.');
      return;
    }
    setEstado('preparando');
    ocupadoRef.current = true;
    try {
      const { blob, tipo } = await prepararArchivo(archivo);
      setDiploma({ nombre: archivo.name, tipo, blob, vista: tipo === 'application/pdf' ? null : URL.createObjectURL(blob) });
      setTocado((t) => ({ ...t, diploma: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEstado('idle');
      ocupadoRef.current = false;
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    setTocado(Object.fromEntries(Object.keys(errores).map((k) => [k, true])));
    if (!listo) {
      requestAnimationFrame(() => (formularioRef.current?.querySelector('[aria-invalid="true"]') || formularioRef.current?.querySelector('.ap-chips button'))?.focus());
      return;
    }
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setError('');
    setEstado('enviando');
    try {
      const base64 = await aBase64(diploma.blob);
      const resultado = await llamar({ accion: 'solicitar', solicitudClave, ...datos, modalidad, grabaciones, acepta, diploma: { tipo: diploma.tipo, base64 } });
      setAcuseEnviado(resultado.acuseEnviado ?? null);
      setEnviada(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setEstado('idle');
      ocupadoRef.current = false;
    }
  };

  const campo = (nombre, etiqueta, props = {}) => (
    <label className={`ap-campo${tocado[nombre] && errores[nombre] ? ' ap-campo--error' : ''}`}>
      <span>{etiqueta}</span>
      <input
        name={nombre}
        maxLength={nombre === 'email' || nombre === 'hospital' ? 160 : nombre === 'telefono' ? 40 : nombre === 'ciudad' || nombre === 'pais' ? 80 : 120}
        required
        value={datos[nombre]}
        onChange={(ev) => setDatos({ ...datos, [nombre]: ev.target.value })}
        onBlur={() => setTocado((t) => ({ ...t, [nombre]: true }))}
        aria-invalid={!!(tocado[nombre] && errores[nombre])}
        aria-describedby={tocado[nombre] && errores[nombre] ? `ap-error-${nombre}` : undefined}
        {...props}
      />
      {tocado[nombre] && errores[nombre] && <small id={`ap-error-${nombre}`}>{errores[nombre]}</small>}
    </label>
  );

  // Regreso de Stripe.
  if (status === 'success') {
    return (
      <div className="ap-pagina">
        <Navbar />
        {pase ? <PaseConfirmado pase={pase} /> : (
          <section className="ap-seccion ap-centro">
            {confirmando ? (
              <p className="ap-cargando"><Loader2 size={20} className="ap-girando" /> Confirmando tu pago…</p>
            ) : errorConfirmar || !sessionId ? (
              <div className="ap-aviso ap-aviso--error" role="alert">
                <p>{errorConfirmar || 'Falta la referencia del pago. Abre tu enlace personal para consultar tu pase o contacta al equipo si ya pagaste.'}</p>
                {sessionId ? <button type="button" className="ap-cta ap-cta--chico" onClick={confirmar}>Reintentar confirmación</button> : <a className="ap-cta ap-cta--chico" href="/alumni-pass-step1">Volver a Alumni Pass</a>}
              </div>
            ) : null}
          </section>
        )}
        <Footer />
      </div>
    );
  }

  // Enlace de pago personal.
  if (token) {
    return (
      <div className="ap-pagina">
        <Navbar />
        <PaginaPago key={token} token={token} cancelado={status === 'cancel'} />
        <Footer />
      </div>
    );
  }

  if (enviada) {
    return (
      <div className="ap-pagina">
        <Navbar />
        <section className="ap-seccion ap-confirmado">
          <div className="ap-ticket ap-ticket--pase">
            <div className="ap-ticket-talon" aria-hidden="true"><span>SOLICITUD</span></div>
            <div className="ap-ticket-cuerpo">
              <p className="ap-kicker"><MailCheck size={16} /> Solicitud recibida</p>
              <h1>¡Gracias, {datos.nombre.split(/\s+/)[0]}!<span>Recibimos tu solicitud</span></h1>
              <p className="ap-nota">
                Nuestro equipo validará tu diploma de Step 1. En cuanto quede aprobado te enviaremos a
                <strong> {datos.email}</strong> tu enlace de pago personal para asegurar tu lugar.
              </p>
              <p className="ap-nota">{acuseEnviado === false ? 'Tu solicitud sí quedó guardada, pero no pudimos enviar el acuse por correo. No necesitas registrarte otra vez.' : 'Revisa también tu carpeta de spam o promociones.'}</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ap-pagina">
      <Navbar />
      {status === 'cancel' && (
        <div className="ap-aviso ap-aviso--info ap-banda" role="status">
          Regresaste del pago. Si ya pagaste, espera tu confirmación antes de repetirlo.
          <button type="button" aria-label="Cerrar aviso" onClick={() => { params.delete('status'); setParams(params, { replace: true }); }}><X size={16} /></button>
        </div>
      )}

      <Encabezado onInscribirme={irAlFormulario} />

      <section className="ap-seccion ap-intro">
        <h2>¡Atención, exalumnos del Diploma Internacional de París en ECMO!</h2>
        <p>
          En el sector salud, mantenerse a la vanguardia no es una opción: es un compromiso constante. Por eso te
          invitamos de forma exclusiva a revivir y actualizar tu formación en el Step 1 los próximos 28 y 29 de octubre.
        </p>
        <p>
          Acompáñanos a refrescar conceptos clave, conocer las investigaciones más recientes e interactuar directamente
          con la facultad de París.
        </p>
      </section>

      <section className="ap-seccion">
        <h2 className="ap-titulo-seccion">Elige tu modalidad</h2>
        {errorCupo && <p className="ap-nota" role="status">No pudimos consultar los lugares disponibles. El cupo se verificará al preparar tu pago; enviar la solicitud no aparta un lugar.</p>}
        <div className="ap-modalidades" role="radiogroup" aria-label="Modalidad">
          <button
            type="button" role="radio" aria-checked={modalidad === 'presencial'} disabled={ocupado || agotado}
            className={`ap-tarjeta${modalidad === 'presencial' ? ' activa' : ''}${agotado ? ' agotada' : ''}`}
            onClick={() => elegir('presencial')}
          >
            <span className="ap-tarjeta-icono"><Users size={22} /></span>
            <span className="ap-tarjeta-nombre">Presencial</span>
            <span className="ap-precio">{dinero(PRECIOS.presencial, 'mxn')}</span>
            <ul>
              <li><Check size={15} /> Vive la experiencia en vivo, cara a cara.</li>
              <li><Check size={15} /> Interacción directa y networking con ponentes y colegas.</li>
              <li><Check size={15} /> 30 lugares limitados.</li>
            </ul>
            <span className={`ap-cupo${agotado ? ' agotado' : ''}`}>
              {!cupo ? '30 lugares' : agotado ? 'Agotado' : `Quedan ${cupo.restantes} de ${cupo.total} lugares`}
            </span>
          </button>
          <button
            type="button" role="radio" aria-checked={modalidad === 'virtual'} disabled={ocupado}
            className={`ap-tarjeta${modalidad === 'virtual' ? ' activa' : ''}`}
            onClick={() => elegir('virtual')}
          >
            <span className="ap-tarjeta-icono"><MonitorPlay size={22} /></span>
            <span className="ap-tarjeta-nombre">Virtual · streaming en vivo</span>
            <span className="ap-precio">{dinero(PRECIOS.virtual, 'mxn')}</span>
            <ul>
              <li><Check size={15} /> Transmisión en tiempo real.</li>
              <li><Check size={15} /> Espacio de preguntas e interacción con los profesores de París.</li>
            </ul>
          </button>
        </div>

        <label className={`ap-extra${grabaciones ? ' activa' : ''}`}>
          <input type="checkbox" checked={grabaciones} disabled={ocupado} onChange={(e) => setGrabaciones(e.target.checked)} />
          <span className="ap-tarjeta-icono"><PlayCircle size={22} /></span>
          <span>
            <strong>Agrega las grabaciones · +{dinero(GRABACIONES, 'mxn')}</strong>
            Acceso a las grabaciones de las ponencias por 1 mes en nuestro campus virtual.
          </span>
        </label>
      </section>

      <section className="ap-seccion ap-requisito">
        <ShieldCheck size={28} aria-hidden="true" />
        <div>
          <h2>¿Cómo funciona?</h2>
          <ol className="ap-pasos">
            <li>Envía tu solicitud con tus datos y la foto o copia de tu <strong>Diploma del Step 1 firmado por los profesores de París</strong>.</li>
            <li>Nuestro equipo valida tu diploma.</li>
            <li>Si es aprobado, te llega por correo tu <strong>enlace de pago personal</strong> para asegurar tu lugar.</li>
          </ol>
        </div>
      </section>

      <section className="ap-seccion" ref={formularioRef} id="inscripcion">
        <h2 className="ap-titulo-seccion"><Ticket size={22} /> Solicita tu Alumni Pass</h2>
        <form className="ap-formulario" onSubmit={enviar} noValidate aria-busy={ocupado}>
          <fieldset className="ap-controles" disabled={ocupado}>
          <div className="ap-campo-grupo">
            <span className="ap-etiqueta">Modalidad que te interesa *</span>
            <div className="ap-chips">
              {['presencial', 'virtual'].map((m) => (
                <button key={m} type="button" disabled={m === 'presencial' && agotado}
                  className={modalidad === m ? 'activa' : ''} aria-pressed={modalidad === m} onClick={() => elegir(m)}>
                  {m === 'presencial' ? `Presencial${agotado ? ' (agotado)' : ''}` : 'Virtual'}
                </button>
              ))}
            </div>
            {tocado.modalidad && errores.modalidad && <small className="ap-error-texto">{errores.modalidad}</small>}
          </div>

          <div className="ap-rejilla">
            {campo('nombre', 'Nombre completo *', { autoComplete: 'name', placeholder: 'Como aparece en tu diploma' })}
            {campo('email', 'Correo electrónico *', { type: 'email', autoComplete: 'email', placeholder: 'tucorreo@ejemplo.com' })}
            {campo('telefono', 'Teléfono / WhatsApp *', { type: 'tel', autoComplete: 'tel', placeholder: 'Con lada' })}
            {campo('especialidad', 'Especialidad *', { placeholder: 'Ej. Medicina crítica, Perfusión' })}
            {campo('hospital', 'Hospital o institución *', { autoComplete: 'organization' })}
            {campo('ciudad', 'Ciudad *', { autoComplete: 'address-level2' })}
            {campo('pais', 'País *', { autoComplete: 'country-name' })}
          </div>

          <div className="ap-campo-grupo">
            <span className="ap-etiqueta">Diploma de Step 1 *</span>
            <label
              className={`ap-zona${arrastrando ? ' arrastrando' : ''}${diploma ? ' con-archivo' : ''}${tocado.diploma && errores.diploma ? ' ap-zona--error' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastrando(false); void recibirArchivo(e.dataTransfer.files?.[0]); }}
            >
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-label="Subir diploma de Step 1"
                aria-invalid={!!(tocado.diploma && errores.diploma)}
                onChange={(e) => { void recibirArchivo(e.target.files?.[0]); e.target.value = ''; }} />
              {estado === 'preparando' ? (
                <span className="ap-cargando"><Loader2 size={18} className="ap-girando" /> Preparando archivo…</span>
              ) : diploma ? (
                <span className="ap-archivo">
                  {diploma.vista ? <img src={diploma.vista} alt="Vista previa del diploma" /> : <FileUp size={28} />}
                  <span><strong>{diploma.nombre}</strong> Listo · toca para cambiarlo</span>
                </span>
              ) : (
                <span className="ap-zona-texto">
                  <FileUp size={28} />
                  <strong>Arrastra aquí la foto de tu diploma o toca para elegirla</strong>
                  JPG, PNG, WEBP o PDF. Desde el celular puedes tomarle foto.
                </span>
              )}
            </label>
            {tocado.diploma && errores.diploma && <small className="ap-error-texto">{errores.diploma}</small>}
          </div>

          <label className={`ap-check${tocado.acepta && errores.acepta ? ' ap-campo--error' : ''}`}>
            <input type="checkbox" checked={acepta} aria-invalid={!!(tocado.acepta && errores.acepta)} onChange={(e) => setAcepta(e.target.checked)} />
            <span>
              Acepto el <a href="/aviso-de-privacidad" target="_blank" rel="noreferrer">aviso de privacidad</a> y que HCE
              valide mi diploma para aprobar mi solicitud.
            </span>
          </label>

          {error && <p className="ap-aviso ap-aviso--error" role="alert">{error}</p>}

          <button type="submit" className="ap-cta ap-cta--ancho" disabled={ocupado}>
            {estado === 'enviando' ? 'Enviando tu solicitud…' : 'Enviar mi solicitud'}
          </button>
          {!listo && Object.keys(tocado).length > 0 && (
            <p className="ap-faltan">Falta: {Object.entries(errores).filter(([, v]) => v).map(([k]) => NOMBRES[k]).join(', ')}.</p>
          )}
          <p className="ap-legal">Aún no pagas nada: el enlace de pago te llega por correo cuando tu solicitud es aprobada.</p>
          </fieldset>
        </form>
      </section>

      <Footer />
    </div>
  );
}
