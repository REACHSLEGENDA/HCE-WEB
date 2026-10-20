// Marca de la división (como las "Divisiones" de TalentLMS): cuando alguien
// entra por la dirección de una institución (hospitalx.healthcareexp.com o su
// dominio propio), por su enlace (/login?division=hospitalx) o tiene sesión y
// pertenece a una división, el portal muestra su nombre, logo y color.
// Sin migración (supabase/divisiones-marca.sql) siempre es la marca de HCE.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const HOSTS_HCE = /^(localhost|127\.0\.0\.1|(www\.)?healthcareexp\.com|.*\.netlify\.app)$/i;
const CLAVE = 'hce-division-slug';

const leer = () => { try { return sessionStorage.getItem(CLAVE) || ''; } catch { return ''; } };
const guardar = (v) => { try { if (v) sessionStorage.setItem(CLAVE, v); else sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };

/** Dirección de una división (o '' si es la de HCE). */
// eslint-disable-next-line react-refresh/only-export-components
export const hostDeDivision = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return HOSTS_HCE.test(host) ? '' : host;
};

const MarcaContext = createContext({ marca: null, slugRegistro: '' });

export function MarcaProvider({ children }) {
  const { profile } = useAuth() || {};
  const [publica, setPublica] = useState(null);
  const [deCuenta, setDeCuenta] = useState(null);

  // En la dirección de una división no se indexa nada: es su portal privado,
  // no una copia del sitio de HCE para los buscadores.
  useEffect(() => {
    if (!hostDeDivision()) return undefined;
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  // Por dirección o por enlace (antes de iniciar sesión).
  useEffect(() => {
    const desdeUrl = new URLSearchParams(window.location.search).get('division') || '';
    if (desdeUrl) guardar(desdeUrl.toLowerCase());
    const host = hostDeDivision();
    const slug = desdeUrl || leer();
    if (!host && !slug) return undefined;
    let vigente = true;
    supabase.rpc('division_publica', { p_host: host || null, p_slug: slug || null }).then(({ data, error }) => {
      if (!vigente || error) return;
      const d = Array.isArray(data) ? data[0] : data;
      setPublica(d || null);
      if (!d && slug) guardar('');
    });
    return () => { vigente = false; };
  }, []);

  // Con sesión: la división del alumno.
  const divisionId = profile?.division_id || null;
  useEffect(() => {
    if (!divisionId) return undefined;
    let vigente = true;
    supabase.from('divisiones').select('id, nombre, slug, logo_url, color, bienvenida').eq('id', divisionId).maybeSingle()
      .then(({ data, error }) => { if (vigente && !error) setDeCuenta(data || null); });
    return () => { vigente = false; };
  }, [divisionId]);

  const valor = useMemo(() => {
    // Con sesión manda la división de la cuenta (un alumno de HCE ve HCE aunque
    // haya abierto el enlace de otra); sin sesión, la de la dirección o el enlace.
    const marca = profile ? (divisionId ? deCuenta : null) : publica;
    return {
      marca: marca && (marca.logo_url || marca.nombre) ? marca : null,
      // Para el registro: solo si la división acepta registros.
      slugRegistro: publica?.registro_abierto ? publica.slug || '' : '',
    };
  }, [profile, divisionId, deCuenta, publica]);

  return <MarcaContext.Provider value={valor}>{children}</MarcaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMarca = () => useContext(MarcaContext);

/** Estilo con el color de la marca para el contenedor de una pantalla. */
// eslint-disable-next-line react-refresh/only-export-components
export const estiloMarca = (marca, variables) => (marca?.color
  ? Object.fromEntries(variables.map((v) => [v, marca.color]))
  : undefined);
