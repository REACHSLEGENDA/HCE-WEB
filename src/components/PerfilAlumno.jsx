import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Award, BookOpen, Camera, Check, FileText, Loader2, TrendingUp, User as UserIcon, Briefcase, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/avatar';
import { COUNTRIES, getFlagUrl } from '../data/countries';
import {
  GRADOS, REGIMENES, USOS_CFDI, TODOS_LOS_CAMPOS, valoresIniciales, normalizar, validarPerfil, guardarPerfil, esMexico,
} from '../lib/perfilAlumno';
import './PerfilAlumno.css';

// Pestaña "Mi perfil" del alumno: foto, datos personales y profesionales,
// cédula y datos de facturación, en un solo formulario siempre editable.
// Valida al escribir, avisa de cambios sin guardar y dice "Guardado ✓".

const NOMBRE_CAMPO = {
  cedula_profesional: 'cédula profesional', rfc: 'RFC', razon_social: 'razón social',
  regimen_fiscal: 'régimen fiscal', codigo_postal_fiscal: 'código postal fiscal', uso_cfdi: 'uso de CFDI',
};

function Campo({ id, etiqueta, ayuda, error, opcional, children }) {
  return (
    <div className={`pf-campo${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}{opcional && <span className="pf-opcional"> (opcional)</span>}</label>
      {children}
      {error ? <p className="pf-error" id={`${id}-error`} role="alert"><AlertCircle size={13} aria-hidden="true" /> {error}</p>
        : ayuda ? <p className="pf-ayuda" id={`${id}-ayuda`}>{ayuda}</p> : null}
    </div>
  );
}

export default function PerfilAlumno({
  user, profile, updateProfile, updateUserMetadata, notificar, avatarUrl,
  resumen = { cursos: 0, avance: 0, certificados: 0 }, miembroDesde, onSucio,
}) {
  const [base, setBase] = useState(() => valoresIniciales(profile, user));
  const [form, setForm] = useState(base);
  const [tocados, setTocados] = useState({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [estado, setEstado] = useState('listo'); // listo | guardando | guardado
  const [errorGuardar, setErrorGuardar] = useState('');
  const [aviso, setAviso] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const archivoRef = useRef(null);
  const formRef = useRef(null);
  const guardandoRef = useRef(false);

  const sucio = useMemo(() => TODOS_LOS_CAMPOS.some((c) => (form[c] || '') !== (base[c] || '')), [form, base]);
  const errores = useMemo(() => validarPerfil(form), [form]);
  const hayErrores = Object.keys(errores).length > 0;

  // El portal pregunta antes de cambiar de sección con cambios sin guardar.
  useEffect(() => { onSucio?.(sucio); }, [sucio, onSucio]);
  useEffect(() => () => onSucio?.(false), [onSucio]);
  useEffect(() => {
    if (!sucio) return undefined;
    const antesDeSalir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', antesDeSalir);
    return () => window.removeEventListener('beforeunload', antesDeSalir);
  }, [sucio]);

  // "Guardado ✓" se queda un momento y vuelve a "Guardar cambios".
  useEffect(() => {
    if (estado !== 'guardado') return undefined;
    const t = setTimeout(() => setEstado('listo'), 2600);
    return () => clearTimeout(t);
  }, [estado]);

  const cambiar = (campo) => (e) => {
    const valor = normalizar(campo, e.target.value);
    setForm((f) => ({ ...f, [campo]: valor }));
    if (estado === 'guardado') setEstado('listo');
    setErrorGuardar('');
  };
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }));
  // El error se muestra al salir del campo o al intentar guardar; mientras se
  // corrige, desaparece en cuanto queda bien.
  const errorDe = (campo) => ((tocados[campo] || intentoGuardar) ? errores[campo] : '');
  const props = (campo) => ({
    id: `pf-${campo}`,
    value: form[campo],
    onChange: cambiar(campo),
    onBlur: tocar(campo),
    'aria-invalid': errorDe(campo) ? true : undefined,
    'aria-describedby': errorDe(campo) ? `pf-${campo}-error` : undefined,
  });

  const guardar = async (e) => {
    e.preventDefault();
    if (guardandoRef.current) return;
    setIntentoGuardar(true);
    setAviso('');
    if (hayErrores) {
      const primero = TODOS_LOS_CAMPOS.find((c) => errores[c]);
      formRef.current?.querySelector(`#pf-${primero}`)?.focus();
      setErrorGuardar('Revisa los campos marcados en rojo.');
      return;
    }
    guardandoRef.current = true;
    setEstado('guardando');
    setErrorGuardar('');
    try {
      const { pendientes } = await guardarPerfil({ valores: form, updateProfile, updateUserMetadata });
      if (pendientes.length) {
        // Lo que no se pudo guardar sigue como cambio pendiente.
        setBase({ ...form, ...Object.fromEntries(pendientes.map((c) => [c, base[c]])) });
        setAviso(`Guardamos tus datos, pero ${pendientes.map((c) => NOMBRE_CAMPO[c] || c).join(', ')} todavía no se pueden guardar: el portal se está actualizando. Inténtalo más tarde.`);
        setEstado('listo');
      } else {
        setBase(form);
        setEstado('guardado');
      }
      setIntentoGuardar(false);
      setTocados({});
    } catch (err) {
      setEstado('listo');
      setErrorGuardar(err.message || 'No se pudo guardar tu perfil. Revisa tu conexión e intenta de nuevo.');
    } finally {
      guardandoRef.current = false;
    }
  };

  const descartar = () => {
    setForm(base);
    setTocados({});
    setIntentoGuardar(false);
    setErrorGuardar('');
  };

  const subirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) { notificar('Elige una imagen (JPG o PNG).', 'error'); return; }
    if (archivo.size > 2 * 1024 * 1024) { notificar('La foto debe pesar menos de 2 MB.', 'error'); return; }
    setSubiendoFoto(true);
    try {
      const url = await uploadAvatar(supabase, user?.id, archivo);
      await updateProfile({ avatar_url: url });
      // Las versiones viejas guardaban la imagen completa en la sesión.
      if (user?.user_metadata && Object.prototype.hasOwnProperty.call(user.user_metadata, 'avatar_url')) {
        await updateUserMetadata({ avatar_url: null });
      }
      notificar('Foto actualizada.', 'success');
    } catch (err) {
      notificar(err.message || 'No se pudo subir la foto. Intenta de nuevo.', 'error');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const bandera = getFlagUrl(form.pais);
  const inicial = (form.nombre_completo || profile?.nombre_completo || 'U').trim().charAt(0).toUpperCase();
  const textoBoton = estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? 'Guardado ✓' : 'Guardar cambios';

  return (
    <div className="pf">
      <aside className="pf-tarjeta">
        <button
          type="button"
          className="pf-foto"
          onClick={() => archivoRef.current?.click()}
          disabled={subiendoFoto}
          aria-label={avatarUrl ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="pf-inicial" aria-hidden="true">{inicial}</span>}
          <span className="pf-foto-accion" aria-hidden="true">
            {subiendoFoto ? <Loader2 size={16} className="pf-girando" /> : <Camera size={16} />}
          </span>
        </button>
        <input ref={archivoRef} type="file" accept="image/*" hidden onChange={subirFoto} />
        <button type="button" className="pf-enlace" onClick={() => archivoRef.current?.click()} disabled={subiendoFoto}>
          {subiendoFoto ? 'Subiendo foto…' : avatarUrl ? 'Cambiar foto' : 'Subir foto'}
        </button>
        <h3>{profile?.nombre_completo || 'Tu nombre'}</h3>
        <p className="pf-correo">{user?.email}</p>
        {miembroDesde && <p className="pf-miembro">Alumno desde {miembroDesde}</p>}

        <ul className="pf-resumen" aria-label="Resumen académico">
          <li><BookOpen size={15} aria-hidden="true" /><strong>{resumen.cursos}</strong><span>{resumen.cursos === 1 ? 'curso' : 'cursos'}</span></li>
          <li><TrendingUp size={15} aria-hidden="true" /><strong>{resumen.avance}%</strong><span>avance</span></li>
          <li><Award size={15} aria-hidden="true" /><strong>{resumen.certificados}</strong><span>{resumen.certificados === 1 ? 'certificado' : 'certificados'}</span></li>
        </ul>
        <p className="pf-nota">Tu nombre aparece así en tus certificados. Revisa que esté completo y con acentos.</p>
      </aside>

      <form ref={formRef} className="pf-form" onSubmit={guardar} noValidate>
        <section className="pf-seccion" aria-labelledby="pf-sec-personal">
          <h3 id="pf-sec-personal"><UserIcon size={17} aria-hidden="true" /> Datos personales</h3>
          <div className="pf-rejilla">
            <Campo id="pf-nombre_completo" etiqueta="Nombre completo" error={errorDe('nombre_completo')} ayuda="Como quieres que aparezca en tus certificados.">
              <input type="text" autoComplete="name" {...props('nombre_completo')} />
            </Campo>
            <Campo id="pf-telefono" etiqueta="Teléfono (con lada)" error={errorDe('telefono')}>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+52 55 1234 5678" {...props('telefono')} />
            </Campo>
            <Campo id="pf-pais" etiqueta="País">
              <div className="pf-con-bandera">
                <input type="text" list="pf-paises" autoComplete="country-name" placeholder="Escribe tu país" {...props('pais')} />
                {bandera && <img src={bandera} alt="" aria-hidden="true" />}
              </div>
              <datalist id="pf-paises">{COUNTRIES.map((c) => <option key={c.code} value={c.name} />)}</datalist>
            </Campo>
            <Campo id="pf-estado" etiqueta="Estado / Ciudad">
              <input type="text" autoComplete="address-level1" {...props('estado')} />
            </Campo>
          </div>
        </section>

        <section className="pf-seccion" aria-labelledby="pf-sec-profesional">
          <h3 id="pf-sec-profesional"><Briefcase size={17} aria-hidden="true" /> Datos profesionales</h3>
          <div className="pf-rejilla">
            <Campo id="pf-grado" etiqueta="Profesión">
              <select {...props('grado')}>
                <option value="">Selecciona…</option>
                {GRADOS.map((g) => <option key={g}>{g}</option>)}
                {form.grado && !GRADOS.includes(form.grado) && <option>{form.grado}</option>}
              </select>
            </Campo>
            <Campo id="pf-especialidad" etiqueta="Especialidad">
              <input type="text" {...props('especialidad')} />
            </Campo>
            <Campo id="pf-institucion" etiqueta="Institución / Hospital">
              <input type="text" autoComplete="organization" {...props('institucion')} />
            </Campo>
            <Campo id="pf-cargo" etiqueta="Cargo / Puesto">
              <input type="text" autoComplete="organization-title" {...props('cargo')} />
            </Campo>
            <Campo
              id="pf-cedula_profesional"
              etiqueta="Cédula profesional"
              opcional
              error={errorDe('cedula_profesional')}
              ayuda={esMexico(form.pais) ? '7 u 8 dígitos, como aparece en el Registro Nacional de Profesionistas.' : 'Número de tu licencia o registro profesional.'}
            >
              <input type="text" inputMode={esMexico(form.pais) ? 'numeric' : 'text'} {...props('cedula_profesional')} />
            </Campo>
          </div>
        </section>

        <section className="pf-seccion" aria-labelledby="pf-sec-factura">
          <h3 id="pf-sec-factura"><Receipt size={17} aria-hidden="true" /> Datos de facturación <span className="pf-opcional">(opcional)</span></h3>
          <p className="pf-seccion-nota"><FileText size={14} aria-hidden="true" /> Solo si necesitas factura (CFDI) de tus pagos en México. Copia los datos de tu Constancia de Situación Fiscal.</p>
          <div className="pf-rejilla">
            <Campo id="pf-rfc" etiqueta="RFC" error={errorDe('rfc')} ayuda="12 caracteres si es empresa, 13 si es persona física.">
              <input type="text" autoCapitalize="characters" spellCheck={false} placeholder="GOMC800101AB1" {...props('rfc')} />
            </Campo>
            <Campo id="pf-razon_social" etiqueta="Nombre o razón social" error={errorDe('razon_social')} ayuda="Sin «S.A. de C.V.» ni régimen de capital.">
              <input type="text" {...props('razon_social')} />
            </Campo>
            <Campo id="pf-regimen_fiscal" etiqueta="Régimen fiscal" error={errorDe('regimen_fiscal')}>
              <select {...props('regimen_fiscal')}>
                <option value="">Selecciona…</option>
                {REGIMENES.map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
                {form.regimen_fiscal && !REGIMENES.some(([id]) => id === form.regimen_fiscal) && <option value={form.regimen_fiscal}>{form.regimen_fiscal}</option>}
              </select>
            </Campo>
            <Campo id="pf-codigo_postal_fiscal" etiqueta="Código postal fiscal" error={errorDe('codigo_postal_fiscal')}>
              <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="06600" {...props('codigo_postal_fiscal')} />
            </Campo>
            <Campo id="pf-uso_cfdi" etiqueta="Uso del CFDI" error={errorDe('uso_cfdi')}>
              <select {...props('uso_cfdi')}>
                <option value="">Selecciona…</option>
                {USOS_CFDI.map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
                {form.uso_cfdi && !USOS_CFDI.some(([id]) => id === form.uso_cfdi) && <option value={form.uso_cfdi}>{form.uso_cfdi}</option>}
              </select>
            </Campo>
          </div>
        </section>

        {aviso && <p className="pf-aviso" role="status"><AlertCircle size={15} aria-hidden="true" /> {aviso}</p>}

        <div className={`pf-barra${sucio ? ' sucio' : ''}`}>
          <span className="pf-estado" role="status">
            {errorGuardar ? <span className="pf-estado-error"><AlertCircle size={14} aria-hidden="true" /> {errorGuardar}</span>
              : estado === 'guardado' ? <span className="pf-estado-ok"><Check size={14} aria-hidden="true" /> Cambios guardados</span>
                : sucio ? <span className="pf-estado-sucio">Cambios sin guardar</span>
                  : <span>Todo está guardado</span>}
          </span>
          <div className="pf-barra-botones">
            {sucio && estado !== 'guardando' && (
              <button type="button" className="pf-btn pf-btn--contorno" onClick={descartar}>Descartar</button>
            )}
            <button type="submit" className={`pf-btn pf-btn--principal${estado === 'guardado' ? ' ok' : ''}`} disabled={estado === 'guardando' || (!sucio && estado !== 'guardado')}>
              {textoBoton}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
