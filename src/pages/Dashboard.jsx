import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { getSafeAvatarUrl } from '../lib/avatar';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  User as UserIcon,
  Settings,
  LifeBuoy,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Phone,
  CheckCircle,
  AlertCircle,
  Save,
  Clock,
  PlayCircle,
  TrendingUp,
  CheckSquare,
  AlertCircle as AlertIcon,
  Inbox,
  Sparkles,
  Eye,
  EyeOff,
  Heart,
  Stethoscope,
  HeartPulse,
  Gamepad2,
  ArrowRight,
  Compass,
  MessageSquare,
  Star,
  Send,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Video,
  Lock,
  Download,
  Search,
  ShieldCheck,
  Link as LinkIcon,
  X
} from 'lucide-react';
import './Dashboard.css';
import GuiaUso from '../components/GuiaUso';
import '../components/Experiences.css';
import { generarConstancia, descargarConstancia } from '../lib/constancia';
import { descargarCertificadoAlumno, hayPdf, rutaVerificacion, copiarEnlaceVerificacion } from '../lib/certificadoAlumno';
import CampanitaAvisos from '../components/CampanitaAvisos';
import PerfilAlumno from '../components/PerfilAlumno';
import { traerTodo } from '../lib/traerTodo';
import LogrosAlumno from '../components/LogrosAlumno';
import Mensajes from '../components/Mensajes';
import { contarNoLeidos } from '../lib/mensajes';
import CalendarioAlumno from '../components/CalendarioAlumno';
import { ZONAS, zonaDelEquipo, recordarZona, fechaEnZona, formatearFechaHora } from '../lib/zonaHoraria';
import { FranjaVistaAlumno } from '../components/CambioVista';
import { cargarReglasCursos, cargarLugaresOcupados, cargarMisSolicitudes, cargarMiApertura, reglasDe } from '../lib/reglas';
import { leerVistaAlumno } from '../lib/vista';
import InicioAlumno, { TarjetaMiCurso } from '../components/InicioAlumno';
import NavegacionMovil from '../components/NavegacionMovil';
import {
  cargarMisInscripciones,
  llamarInscripcion,
  esCursoDePago,
  esTablaFaltante,
  formatoPrecio,
} from '../lib/cursos';

const NurseCap = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="m0 8.853 2.886 10.115c2.738-.403 5.899-.633 9.113-.633s6.375.23 9.467.675l-.353-.042 2.886-10.115c-9.502-4.225-15.141-4.448-23.999 0zm14.918 4.276h-2.071v2.071h-1.686v-2.071h-2.071v-1.686h2.071v-2.072h1.686v2.072h2.071z" />
  </svg>
);


/* ---------------------------------------------------------------------------
 * Menú del portal, agrupado por lo que el alumno viene a hacer. En celular los
 * destinos de ORDEN_MOVIL van en la barra inferior y el resto en "Más".
 * ------------------------------------------------------------------------ */
const MENU_ALUMNO = [
  { titulo: 'Aprender', items: [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'courses', label: 'Mis cursos', corto: 'Cursos', icon: BookOpen },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'calificaciones', label: 'Mis calificaciones', icon: CheckSquare },
    { id: 'certificates', label: 'Certificados', icon: Award },
  ] },
  { titulo: 'Descubrir', items: [
    { id: 'explore', label: 'Catálogo', icon: Compass },
    { id: 'webinars', label: 'Webinars', icon: Video },
  ] },
  { titulo: 'Comunicación', items: [
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
  ] },
  { titulo: 'Mi cuenta', items: [
    { id: 'profile', label: 'Mi perfil', icon: UserIcon },
    { id: 'settings', label: 'Configuración', icon: Settings },
    { id: 'ayuda', label: 'Ayuda', icon: LifeBuoy },
  ] },
];
const PESTANAS_ALUMNO = MENU_ALUMNO.flatMap((g) => g.items.map((i) => i.id));
// Orden de la barra inferior: Inicio, Cursos, Catálogo, Calendario, Mensajes.
const ORDEN_MOVIL = ['dashboard', 'courses', 'explore', 'calendario', 'mensajes'];

/** Título de cada sección: etiqueta pequeña ("— MIS CURSOS"), título y nota. */
const TituloSeccion = ({ etiqueta, titulo, descripcion }) => (
  <div className="section-title-row pa-titulo">
    {etiqueta && <span className="pa-etiqueta">{etiqueta}</span>}
    <h2>{titulo}</h2>
    {descripcion && <p>{descripcion}</p>}
  </div>
);

const leerPestana = () => {
  try {
    const guardada = localStorage.getItem('studentActiveTab');
    return PESTANAS_ALUMNO.includes(guardada) ? guardada : 'dashboard';
  } catch {
    return 'dashboard';
  }
};

/* ---------------------------------------------------------------------------
 * Enlace al aula.
 *
 * En el navegador el aula se abre en pestaña nueva, que es deliberado: el
 * alumno no pierde el panel mientras ve la clase.
 *
 * Pero en la app instalada eso la rompe. `target="_blank"` saca la navegación
 * del contexto standalone y Chrome la abre en una Custom Tab —con su barra de
 * direcciones encima—, así que el alumno siente que se salió de la app.
 *
 * Dentro de la app se navega con <Link>, sin salir del scope del manifest; en
 * el navegador se conserva la pestaña nueva de siempre.
 * ------------------------------------------------------------------------ */
const enAppInstalada = () =>
  ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
    .some((modo) => window.matchMedia?.(`(display-mode: ${modo})`).matches) ||
  window.navigator.standalone === true;

const Dashboard = () => {
  // En la app instalada el aula se abre sin salir; en el navegador, en pestaña nueva.
  const [appInstalada] = useState(enAppInstalada);

  const { user, profile, logout, updateUserMetadata, updateProfile } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Un administrador va a su panel, salvo que haya elegido la vista de alumno.
  const esAdmin = profile?.rol === 'admin';
  useEffect(() => {
    if (esAdmin && !leerVistaAlumno()) {
      navigate('/admin', { replace: true });
    }
  }, [esAdmin, navigate]);
  
  // Sidebar states. En móvil el menú es un cajón que se superpone al contenido,
  // así que debe arrancar cerrado; en escritorio sigue abierto como siempre.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );

  const [myCertificates, setMyCertificates] = useState([]);
  const [certificadosListos, setCertificadosListos] = useState(false);
  const [errorCertificados, setErrorCertificados] = useState('');
  const [certificadoOcupado, setCertificadoOcupado] = useState(null);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [inscritoEn, setInscritoEn] = useState({});
  const [confirmacionError, setConfirmacionError] = useState('');
  const [confirmandoPago, setConfirmandoPago] = useState(false);
  useEffect(() => {
    if (!user?.id) return undefined;
    let vigente = true;
    supabase.from('portal_config').select('valor').eq('clave', 'mensaje_bienvenida').maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error && !esTablaFaltante(error)) console.warn('No se pudo leer la bienvenida:', error.message);
        setMensajeBienvenida(error ? '' : String(data?.valor?.texto || '').trim());
      }).catch(() => { if (vigente) setMensajeBienvenida(''); });
    return () => { vigente = false; };
  }, [user?.id]);
  
  // Dashboard Tabs: 'dashboard' | 'courses' | 'certificates' | 'profile' | 'settings'
  const [activeTab, setActiveTabState] = useState(leerPestana);
  const [menuMasAbierto, setMenuMasAbierto] = useState(false);
  const cerrarMenuMas = useCallback(() => setMenuMasAbierto(false), []);

  // "Mi perfil" avisa si hay cambios sin guardar; antes de salir se pregunta.
  const perfilSucioRef = useRef(false);
  const marcarPerfilSucio = useCallback((sucio) => { perfilSucioRef.current = sucio; }, []);

  const setActiveTab = (tab) => {
    if (!PESTANAS_ALUMNO.includes(tab)) return;
    if (perfilSucioRef.current && tab !== 'profile'
      && !window.confirm('Tienes cambios sin guardar en tu perfil. ¿Salir sin guardarlos?')) return;
    if (tab !== 'profile') perfilSucioRef.current = false;
    setActiveTabState(tab);
    try { localStorage.setItem('studentActiveTab', tab); } catch { /* sin almacenamiento: no se recuerda */ }
    if (window.innerWidth <= 768) setIsSidebarCollapsed(true);
    setMenuMasAbierto(false);
    // Cada sección empieza arriba: ya no es una sola pantalla larga.
    window.scrollTo({ top: 0 });
  };

  // C6: el asistente cambia de sección sin recargar con
  // window.dispatchEvent(new CustomEvent('hce:ir', { detail: { tab } })).
  const setActiveTabRef = useRef(setActiveTab);
  useEffect(() => { setActiveTabRef.current = setActiveTab; });
  useEffect(() => {
    const alIr = (e) => {
      const tab = e?.detail?.tab;
      if (PESTANAS_ALUMNO.includes(tab)) setActiveTabRef.current(tab);
    };
    window.addEventListener('hce:ir', alIr);
    return () => window.removeEventListener('hce:ir', alIr);
  }, []);

  // En celular la barra inferior tapa la esquina donde flotan el chat y la
  // invitación a instalar la app; esta clase los sube (ver Dashboard.css).
  useEffect(() => {
    document.body.classList.add('portal-barra-inferior');
    return () => document.body.classList.remove('portal-barra-inferior');
  }, []);

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('studentTheme') || 'light';
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('studentTheme', t);
  };

  // Resolve effective theme (system → OS preference)
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  useEffect(() => { window.dispatchEvent(new CustomEvent('hce:pantalla', { detail: { zona: 'alumno', tab: activeTab, theme: effectiveTheme } })); }, [activeTab, effectiveTheme]);

  const bannerRef = useRef(null);
  useEffect(() => {
    if (!bannerRef.current) return;
    bannerRef.current.style.setProperty('background-color', effectiveTheme === 'dark' ? '#1A2535' : '#F0F9FB', 'important');
    bannerRef.current.style.setProperty('border-color', effectiveTheme === 'dark' ? '#2A3B50' : 'rgba(0,188,212,0.15)', 'important');
  }, [effectiveTheme]);

  // Settings Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Real registration timestamp or placeholder
  const getMemberSinceDate = () => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'Reciente';
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setFormLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMsg('¡Contraseña actualizada con éxito!');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      navigate('/login');
    }
  };

  // YouTube API Script Loading
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Fetch student certificates
  const fetchMyCertificates = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*, courses(title, certificado_template_url, certificado_x, certificado_y, certificado_font_size)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyCertificates(data || []);
      setErrorCertificados('');
    } catch (err) {
      console.error('Error fetching certificates:', err.message);
      setErrorCertificados(err.message || 'No se pudieron cargar tus certificados.');
    } finally {
      setCertificadosListos(true);
    }
  }, [user?.id]);

  // Expired-certificate cleanup is a privileged server/cron task. Students only read their list.
  useEffect(() => {
    if (user?.id) {
      void fetchMyCertificates();
    }
  }, [user?.id, fetchMyCertificates]);


  // ---- Inscripciones a cursos ---------------------------------------------
  //
  // `null` significa que la migración aún no corre: en ese caso los cursos se
  // comportan como siempre (abiertos) y "inscrito" se deduce del avance.
  const [misInscripciones, setMisInscripciones] = useState(new Set());
  const [progresoCursos, setProgresoCursos] = useState({});

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_progress')
      .select('course_id, watch_percent')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.warn('No se pudo cargar el avance de los cursos:', error.message);
          return;
        }
        setProgresoCursos(Object.fromEntries((data || []).map((f) => [Number(f.course_id), f.watch_percent || 0])));
      });
  }, [user?.id]);
  const [cursoOcupado, setCursoOcupado] = useState(null);

  // Mientras llega la primera carga, el inicio muestra "Cargando…" en vez de
  // "Aún no tienes cursos".
  const [cargandoInscripciones, setCargandoInscripciones] = useState(true);
  const fetchMisInscripciones = useCallback(async () => {
    if (!user?.id) return;
    try {
      const ids = await cargarMisInscripciones(user.id);
      setMisInscripciones(ids);
      if (ids !== null) {
        const { data, error } = await supabase.from('inscripciones').select('course_id, created_at').eq('user_id', user.id);
        if (error) throw error;
        setInscritoEn(Object.fromEntries((data || []).map((fila) => [Number(fila.course_id), fila.created_at])));
      }
    } catch (err) {
      console.error('Error cargando inscripciones:', err.message);
    } finally {
      setCargandoInscripciones(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchMisInscripciones();
  }, [fetchMisInscripciones]);

  // Mensajes sin leer: contador del menú. Se revisa al entrar y cada 2 minutos.
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  useEffect(() => {
    if (!user?.id) return undefined;
    let vigente = true;
    const revisar = () => contarNoLeidos(user.id).then((n) => { if (vigente) setMensajesNoLeidos(n); });
    void revisar();
    const t = setInterval(revisar, 120000);
    return () => { vigente = false; clearInterval(t); };
  }, [user?.id]);

  // Reglas de los cursos (catálogo, cupo, prerrequisitos, solicitud).
  const [reglasCursos, setReglasCursos] = useState({});
  const [lugaresOcupados, setLugaresOcupados] = useState({});
  const [misSolicitudes, setMisSolicitudes] = useState({});
  const [reglasListas, setReglasListas] = useState(false);
  useEffect(() => {
    if (!user?.id) return undefined;
    let vigente = true;
    Promise.all([cargarReglasCursos(), cargarLugaresOcupados(), cargarMisSolicitudes(user.id)])
      .then(([reglas, lugares, solicitudes]) => {
        if (!vigente) return;
        setReglasCursos(reglas);
        setLugaresOcupados(lugares);
        setMisSolicitudes(solicitudes);
      })
      .catch((err) => console.warn('No se pudieron cargar las reglas de los cursos:', err.message))
      .finally(() => { if (vigente) setReglasListas(true); });
    return () => { vigente = false; };
  }, [user?.id]);

  // Cursos por generación en los que está inscrito: si ya abrieron o cuándo.
  const [aperturas, setAperturas] = useState({});
  // Clave de los cursos por grupo ya consultados: hasta que coincide, el Inicio
  // no da por abierto ningún curso (antes mostraba un momento cursos cerrados).
  const [aperturasDe, setAperturasDe] = useState(null);
  const clavePorGrupo = useMemo(() => (profile?.rol === 'admin' ? '' : Object.entries(reglasCursos)
    .filter(([id, r]) => r.modo_acceso === 'grupo' && misInscripciones?.has(Number(id)))
    .map(([id]) => Number(id)).sort((a, b) => a - b).join(',')), [reglasCursos, misInscripciones, profile?.rol]);
  const aperturasListas = !clavePorGrupo || aperturasDe === clavePorGrupo;
  useEffect(() => {
    if (!user?.id || !clavePorGrupo) return undefined;
    const porGrupo = clavePorGrupo.split(',').map(Number);
    let vigente = true;
    Promise.all(porGrupo.map((id) => cargarMiApertura(id).then((a) => [id, a])))
      .then((lista) => { if (vigente) setAperturas(Object.fromEntries(lista)); })
      .catch(() => {})
      .finally(() => { if (vigente) setAperturasDe(clavePorGrupo); });
    return () => { vigente = false; };
  }, [user?.id, clavePorGrupo]);

  const abrirAula = (courseId, leccionId = null) => {
    // Dentro de la app instalada la clase se abre sin salir; en el navegador,
    // en pestaña nueva, igual que el resto de accesos al aula. Con `leccionId`
    // el aula abre directo esa lección (una tarea pendiente, una sesión).
    const ruta = `/classroom/${courseId}${leccionId ? `?leccion=${encodeURIComponent(leccionId)}` : ''}`;
    if (appInstalada) navigate(ruta);
    else window.open(ruta, '_blank', 'noopener');
  };

  // Un solo punto de entrada para cualquier tarjeta de curso: si ya está
  // inscrito entra; si es gratis lo inscribe y entra; si es de pago, a Stripe.
  const handleAbrirCurso = async (course, inscrito) => {
    if (inscrito || misInscripciones === null) {
      abrirAula(course.id);
      return;
    }

    setCursoOcupado(course.id);
    try {
      if (esCursoDePago(course)) {
        const { url } = await llamarInscripcion('checkout', { courseId: course.id });
        window.location.href = url;
        return;
      }

      const respuesta = await llamarInscripcion('gratis', { courseId: course.id });
      if (respuesta?.estado === 'solicitud-enviada') {
        setMisSolicitudes((prev) => ({ ...prev, [Number(course.id)]: 'pendiente' }));
        showToast('Enviamos tu solicitud. Te avisaremos cuando un administrador la apruebe.', 'success');
        return;
      }
      await fetchMisInscripciones();
      showToast(`Te inscribiste a ${course.title}.`, 'success');
      // Después de esperar al servidor el navegador ya no permite abrir una
      // pestaña nueva sin que la bloquee, así que se entra en la misma.
      navigate(`/classroom/${course.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCursoOcupado(null);
    }
  };

  // Regreso desde Stripe. El webhook inscribe aunque el alumno cierre la
  // pestaña; esto solo adelanta la confirmación para que vea su curso ya.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get('curso_pago');
    if (!resultado) return;

    const limpiarUrl = () => window.history.replaceState({}, '', '/dashboard');

    if (resultado === 'cancelado') {
      showToast('El pago se canceló. No se hizo ningún cargo.', 'info');
      limpiarUrl();
      return;
    }

    const sessionId = params.get('session_id');
    if (resultado !== 'ok' || !sessionId) return;

    void confirmarPago();
    // Conserva el resultado en la URL hasta que el servidor confirme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const confirmarPago = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId || confirmandoPago) return;
    setConfirmandoPago(true);
    setConfirmacionError('');
    try {
      await llamarInscripcion('confirmar', { sessionId, moneda: params.get('m') || 'mxn' });
      await fetchMisInscripciones();
      setActiveTab('courses');
      showToast('¡Pago confirmado! Tu curso ya está en Mis Cursos.', 'success');
      ['curso_pago', 'session_id', 'm'].forEach((clave) => params.delete(clave));
      window.history.replaceState({}, '', window.location.pathname + (params.size ? '?' + params.toString() : ''));
    } catch (err) {
      setConfirmacionError(err.message || 'No se pudo confirmar tu pago.');
      showToast(err.message, err.estado === 'pendiente' ? 'info' : 'error');
    } finally {
      setConfirmandoPago(false);
    }
  };

  // ---- Webinars con registro en el portal ---------------------------------
  //
  // El alumno se registra aquí, recibe su enlace de Zoom y, al terminar la
  // sesión, desbloquea su constancia. La asistencia la confirma Zoom sola; el
  // código que dio el ponente al cierre es solo el respaldo para quien entró
  // con otro correo.

  const [webinarsPortal, setWebinarsPortal] = useState([]);
  const [misRegistrosWebinar, setMisRegistrosWebinar] = useState([]);
  const [webinarOcupado, setWebinarOcupado] = useState(null);
  const [modalCodigo, setModalCodigo] = useState(null);

  const llamarFuncionWebinar = useCallback(async (ruta, cuerpo) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/.netlify/functions/${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(cuerpo),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'No pudimos completar la operación. Intenta de nuevo.');
      error.estado = data.estado;
      throw error;
    }
    return data;
  }, []);

  const fetchWebinarsPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .eq('registro_portal', true)
        .eq('activo', true)
        .order('id', { ascending: false });
      if (error) throw error;
      setWebinarsPortal(data || []);
    } catch (err) {
      console.error('Error cargando webinars del portal:', err.message);
      setWebinarsPortal([]);
    }
  }, []);

  const fetchMisRegistrosWebinar = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('webinar_registros')
        // El título viaja con el registro para listar la constancia en
        // Certificados aunque el webinar ya no esté activo.
        .select('*, webinars(title)')
        .eq('user_id', user.id);
      if (error) throw error;
      setMisRegistrosWebinar(data || []);
    } catch (err) {
      console.error('Error cargando registros de webinar:', err.message);
      setMisRegistrosWebinar([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchWebinarsPortal();
  }, [fetchWebinarsPortal]);

  useEffect(() => {
    if (user?.id) void fetchMisRegistrosWebinar();
  }, [user?.id, fetchMisRegistrosWebinar]);

  // Quien llega desde la landing con ?webinar=12, o desde el asistente con
  // ?tab=webinars, cae directo en la sección en vez de tener que buscarla.
  // El aula también manda aquí con ?tab=certificates al terminar un curso.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('webinar') || params.get('tab') === 'webinars') {
      setActiveTab('webinars');
    } else if (PESTANAS_ALUMNO.includes(params.get('tab'))) {
      setActiveTab(params.get('tab'));
    }
  }, []);

  const constanciasWebinar = misRegistrosWebinar.filter((r) => r.certificado_url);

  const registroDeWebinar = (webinarId) =>
    misRegistrosWebinar.find((r) => String(r.webinar_id) === String(webinarId)) || null;

  const handleRegistrarWebinar = async (webinar) => {
    setWebinarOcupado(webinar.id);
    try {
      const data = await llamarFuncionWebinar('webinar-register', { webinarId: webinar.id });
      await fetchMisRegistrosWebinar();
      showToast(
        data.yaRegistrado
          ? 'Ya estabas registrado en este webinar.'
          : 'Listo, quedaste registrado. También te mandamos el acceso a tu correo.',
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setWebinarOcupado(null);
    }
  };

  // Dibuja la constancia, la sube al portal y devuelve la URL final. Si el
  // almacenamiento falla, el alumno igual se queda con su archivo local.
  const emitirConstanciaWebinar = async (webinar, plantilla, folio) => {
    const nombre =
      profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email || 'Alumno';

    const { blob, dataUrl } = await generarConstancia({
      nombre,
      templateUrl: plantilla?.url,
      x: plantilla?.x,
      y: plantilla?.y,
      fontSize: plantilla?.fontSize,
    });

    try {
      const ruta = `${user.id}/webinar_${webinar.id}_${folio}.png`;
      const { error } = await supabase.storage
        .from('certificates')
        .upload(ruta, blob, { upsert: true });
      if (error) throw error;

      const { data: publico } = supabase.storage.from('certificates').getPublicUrl(ruta);

      await llamarFuncionWebinar('webinar-unlock', {
        webinarId: webinar.id,
        accion: 'certificado',
        certificadoUrl: publico.publicUrl,
        folio,
      });

      await fetchMisRegistrosWebinar();
      return publico.publicUrl;
    } catch (err) {
      console.warn('No se pudo guardar la constancia en el portal:', err.message);
      showToast('Generamos tu constancia, pero no quedó guardada en el portal. Descárgala ahora.', 'warning');
      return dataUrl;
    }
  };

  const handleDesbloquearWebinar = async (webinar, codigo = '') => {
    setWebinarOcupado(webinar.id);
    try {
      const data = await llamarFuncionWebinar('webinar-unlock', {
        webinarId: webinar.id,
        codigo,
      });

      const archivo = `Constancia_${(webinar.title || 'Webinar').replace(/\s+/g, '_')}.png`;
      const url = data.certificadoUrl
        ? data.certificadoUrl
        : await emitirConstanciaWebinar(webinar, data.plantilla, data.folio);

      setModalCodigo(null);
      await descargarConstancia(url, archivo);
      await fetchMisRegistrosWebinar();

      showToast(
        data.via === 'zoom'
          ? `Zoom confirmó tu asistencia (${data.minutos} min). Aquí está tu constancia.`
          : '¡Listo! Tu constancia se descargó y quedó guardada en el portal.',
        'success'
      );
    } catch (err) {
      // Cuando Zoom no lo reconoce se le pide el código en lugar de dejarlo
      // con un error seco: casi siempre entró con un correo distinto.
      if (err.estado === 'requiere-codigo' || err.estado === 'codigo-invalido') {
        setModalCodigo({
          webinar,
          valor: codigo,
          mensaje: err.message,
          esError: err.estado === 'codigo-invalido',
        });
      } else {
        setModalCodigo(null);
        showToast(err.message, 'error');
      }
    } finally {
      setWebinarOcupado(null);
    }
  };


  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getFirstName = () => {
    if (!profile?.nombre_completo) return 'Alumno';
    return profile.nombre_completo.split(' ')[0];
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Mi aprendizaje';
      case 'explore': return 'Catálogo';
      case 'courses': return 'Mis Cursos';
      case 'calificaciones': return 'Mis calificaciones';
      case 'webinars': return 'Webinars';
      case 'certificates': return 'Certificados';
      case 'mensajes': return 'Mensajes';
      case 'calendario': return 'Calendario';
      case 'profile': return 'Mi Perfil';
      case 'settings': return 'Configuración';
      case 'ayuda': return 'Guía de uso';
      default: return 'Portal HCE';
    }
  };

  const premiumSponsorCourses = [
    {
      id: 2,
      title: 'ECMO Nursing Care Course',
      description: 'El primer entrenamiento diseñado por y para enfermería. Lidera con seguridad y criterio clínico el cuidado integral del paciente crítico en soporte ECMO.',
      image: '/assets/componentes/expnur.webp',
      link: '/ecmo-nursing-care',
      badge: 'INSCRIPCIONES ABIERTAS',
      badgeClass: 'badge-danger',
      icon: NurseCap,
      startDate: 'Próximamente: 3.ª Edición'
    },
    {
      id: 3,
      title: 'Paris International Diploma in ECMO',
      description: 'Certifícate en el programa de mayor prestigio global en ECMO, liderado por los profesores Alain Combes (ex Presidente de EuroELSO) y Matthieu Schmidt (Presidente de EuroELSO actual), máximos referentes globales e investigadores de ECMO del Hospital la Pitié-Salpêtrière. Accede a la experiencia del centro ECMO más grande del mundo, directo de París a Latinoamérica.',
      image: '/assets/componentes/expparis.webp',
      link: '/paris-diploma-ecmo',
      badge: 'INSCRIPCIONES ABIERTAS',
      badgeClass: 'badge-danger',
      icon: Award,
      startDate: 'Inicio: 28 de Octubre, 2026'
    },
    {
      id: 4,
      title: 'ECMO SIM: Realidad Clínica',
      description: 'Sumérgete en una experiencia de alta fidelidad. Toma decisiones críticas y domina el soporte ECMO V-V y V-A en un entorno virtual interactivo, intuitivo y seguro, diseñado para acelerar tu curva de aprendizaje y el de tu equipo multidisciplinario.',
      image: '/assets/componentes/expsim.webp',
      link: '/simulador-ecmo-sim',
      badge: 'SIMULADOR',
      badgeClass: 'badge-warning',
      // El simulador no es un programa con fechas: se contrata y se usa.
      cta: 'Obtener simulador',
      icon: Gamepad2
    },
  ];

  const premiumCoursesOnly = premiumSponsorCourses.filter(course => course.badge !== 'SIMULADOR');
  const simulatorCoursesOnly = premiumSponsorCourses.filter(course => course.badge === 'SIMULADOR');

  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  // Filtro del catálogo: 'todos' | 'gratis' | 'pago' | 'programas'.
  const [filtroCatalogo, setFiltroCatalogo] = useState('todos');
  // Filtro de Mis cursos: 'todos' | 'progreso' | 'nuevos' | 'completos'.
  const [filtroMisCursos, setFiltroMisCursos] = useState('todos');
  const [calificaciones, setCalificaciones] = useState(null);
  const [errorCalificaciones, setErrorCalificaciones] = useState('');
  const [intentoCalificaciones, setIntentoCalificaciones] = useState(0);
  useEffect(() => {
    if (activeTab !== 'calificaciones' || !user?.id) return undefined;
    let vigente = true;
    setErrorCalificaciones('');
    setCalificaciones(null);
    Promise.all([
      traerTodo('evaluacion_intentos', 'course_id, leccion_id, calificacion, aprobado, numero, curso_lecciones(titulo, tipo)', q => q.eq('user_id', user.id)),
      traerTodo('tarea_entregas', 'course_id, leccion_id, estado, comentario, creada_en, curso_lecciones(titulo)', q => q.eq('user_id', user.id)),
    ]).then(([evaluaciones, tareas]) => {
      if (!vigente) return;
      const porLeccion = new Map();
      evaluaciones.forEach((fila) => {
        const previo = porLeccion.get(fila.leccion_id);
        const notas = [previo?.mejor, fila.calificacion].filter(n => n != null).map(Number);
        porLeccion.set(fila.leccion_id, { ...fila, intentos: (previo?.intentos || 0) + 1,
          mejor: notas.length ? Math.max(...notas) : null, aprobado: !!(previo?.aprobado || fila.aprobado) });
      });
      const ultimasTareas = new Map();
      tareas.forEach((fila) => {
        const previo = ultimasTareas.get(fila.leccion_id);
        if (!previo || new Date(fila.creada_en) > new Date(previo.creada_en)) ultimasTareas.set(fila.leccion_id, fila);
      });
      setCalificaciones({ evaluaciones: [...porLeccion.values()], tareas: [...ultimasTareas.values()] });
    }).catch(err => { if (vigente) setErrorCalificaciones(err.message || 'No se pudieron cargar tus calificaciones.'); });
    return () => { vigente = false; };
  }, [activeTab, user?.id, intentoCalificaciones]);

  const [catalogCourses, setCatalogCourses] = useState(() => {
    const saved = localStorage.getItem('courses');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchCourses = async () => {
    try {
      const { data: dbCourses, error } = await supabase
        .from('courses')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      
      const cursosCatalogo = (dbCourses || []).map((c) => {
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          duracion: c.duracion,
          modalidad: c.modalidad,
          requisitos: c.requisitos,
          image: c.image_url,
          link: c.link || '',
          youtube_video_id: c.youtube_video_id,
          certificado_template_url: c.certificado_template_url,
          certificado_x: c.certificado_x,
          certificado_y: c.certificado_y,
          certificado_font_size: c.certificado_font_size,
          minAprobacion: c.min_aprobacion,
          activo: c.activo,
          category_id: c.category_id,
          tipo: c.tipo || 'gratis',
          precio_mxn: c.precio_mxn,
          // Desde la migración el ID del video ya no viaja en el catálogo; este
          // indicador dice si el curso se toma en el aula.
          tiene_video: !!(c.tiene_video || c.youtube_video_id)
        };
      });
      
      const activeCourses = cursosCatalogo.filter(c => c.activo !== false);

      setCatalogCourses(activeCourses);
      localStorage.setItem('courses', JSON.stringify(activeCourses));
    } catch (err) {
      console.error('Error fetching courses from Supabase:', err.message);
      const saved = localStorage.getItem('courses');
      setCatalogCourses(saved ? JSON.parse(saved) : []);
    }
  };

  useEffect(() => {
    const loadCourses = () => {
      const saved = localStorage.getItem('courses');
      setCatalogCourses(saved ? JSON.parse(saved) : []);
    };
    loadCourses();
    fetchCourses();
    window.addEventListener('storage', loadCourses);
    return () => window.removeEventListener('storage', loadCourses);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    
    const getActionText = () => {
      switch(activeTab) {
        case 'dashboard': return 'Explorando: Panel de Control';
        case 'explore': return 'Explorando: Catálogo de Cursos';
        case 'courses': return 'Navegando: Mis Cursos';
        case 'certificates': return 'Revisando: Certificados';
        case 'mensajes': return 'Leyendo: Mensajes';
        case 'profile': return 'Editando: Mi Perfil';
        case 'settings': return 'Ajustando: Configuración';
        case 'ayuda': return 'Leyendo: Guía de uso';
        default: return 'Activo en el Portal';
      }
    };

    const sendConnectionState = async (isOnline) => {
      const action = isOnline ? getActionText() : 'Desconectado';
      const lastActive = isOnline ? new Date().toISOString() : new Date(Date.now() - 15 * 60 * 1000).toISOString();

      // Local storage
      try {
        const allKey = 'backup_all_student_activities';
        const savedAll = localStorage.getItem(allKey);
        const allActivities = savedAll ? JSON.parse(savedAll) : {};
        
        allActivities[user.id] = {
          user_id: user.id,
          session_duration: (allActivities[user.id]?.session_duration || 0) + (isOnline ? 10 : 0),
          last_active_at: lastActive,
          current_action: action,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(allKey, JSON.stringify(allActivities));
      } catch (err) {
        console.warn('Error saving local activity:', err);
      }

      // Supabase
      try {
        const { error } = await supabase
          .from('student_activity')
          .upsert({
            user_id: user.id,
            last_active_at: lastActive,
            current_action: action,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (error) throw error;
      } catch (err) {
        console.warn('No se pudo actualizar el estado de conexión:', err.message);
      }
    };

    // Connect immediately
    sendConnectionState(true);

    const handleBeforeUnload = () => {
      sendConnectionState(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      sendConnectionState(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, activeTab]);

  // Botón principal: PDF con QR de verificación (si ya existe en la librería
  // de certificados); "Imagen PNG" queda como opción secundaria.
  const descargarCertificado = async (certificado, formato = 'pdf') => {
    if (certificadoOcupado) return;
    setCertificadoOcupado(`${certificado.id}:${formato}`);
    try {
      const actualizado = await descargarCertificadoAlumno({
        certificado,
        curso: certificado.courses,
        nombre: profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email,
        formato,
      });
      if (actualizado && actualizado !== certificado) {
        setMyCertificates((lista) => lista.map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c)));
      }
    } catch (err) {
      showToast('No se pudo descargar el certificado: ' + err.message, 'error');
    } finally { setCertificadoOcupado(null); }
  };

  const copiarVerificacion = async (folio) => {
    const ok = await copiarEnlaceVerificacion(folio);
    showToast(ok ? 'Enlace de verificación copiado. Compártelo con quien necesite validar tu certificado.' : 'No se pudo copiar el enlace. Ábrelo con "Ver verificación" y cópialo desde la barra del navegador.', ok ? 'success' : 'error');
  };

  // Calculate course states dynamically
  const getCourseProgress = (courseId) => {
    // Check if they have a certificate
    const hasCert = myCertificates.some(cert => Number(cert.course_id) === Number(courseId));
    if (hasCert) return 100;

    // El avance vive en la base; antes solo se leía de este navegador, y en
    // otro dispositivo el curso aparecía en 0 y salía de "en progreso". Se
    // toma el mayor de los dos para no perder lo de antes.
    const prefix = user?.id ? `${user.id}_` : '';
    const local = parseInt(localStorage.getItem(`watchPercent_${prefix}${courseId}`) || '0', 10) || 0;
    return Math.min(100, Math.max(local, progresoCursos[Number(courseId)] || 0));
  };

  const processedCourses = catalogCourses.map(course => {
    const progress = getCourseProgress(course.id);
    const completed = myCertificates.some(cert => Number(cert.course_id) === Number(course.id));
    const inProgress = progress > 0 && !completed;
    // Con inscripciones reales manda la tabla; antes de la migración se sigue
    // deduciendo del avance, como siempre.
    const inscrito = misInscripciones ? misInscripciones.has(Number(course.id)) : false;
    const enrolled = inscrito || completed || inProgress;

    const reglas = reglasDe(reglasCursos, course.id);
    const fechaInscripcion = inscritoEn[Number(course.id)];
    const vence = reglas.dias_acceso && fechaInscripcion
      ? new Date(new Date(fechaInscripcion).getTime() + Number(reglas.dias_acceso) * 86400000) : null;
    const accesoVencido = !!(vence && vence < new Date() && !(reglas.conservar_acceso && completed));
    const enRevision = profile?.rol !== 'admin' && profile?.aprobado === false;
    // Curso por generación aún cerrado: lugar apartado hasta que inicie su grupo.
    const apertura = aperturas[Number(course.id)];
    const esperandoGrupo = !enRevision && !completed && !!apertura && !apertura.abierto;
    const textoApertura = esperandoGrupo
      ? (apertura.abreEn ? `Abre el ${apertura.abreEn.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : 'Lugar apartado')
      : null;
    const estadoCurso = enRevision ? 'En revisión' : textoApertura || (accesoVencido ? 'Acceso vencido' : completed ? 'Completado' : progress === 0 ? 'Sin empezar' : 'En progreso');
    const ocupados = lugaresOcupados[Number(course.id)] ?? 0;
    const lugaresRestantes = reglas.cupo ? Math.max(0, reglas.cupo - ocupados) : null;
    const certificados = new Set(myCertificates.map((c) => Number(c.course_id)));
    const faltanPrerrequisitos = (reglas.prerrequisitos || [])
      .map(Number)
      .filter((id) => id !== Number(course.id) && !certificados.has(id))
      .map((id) => catalogCourses.find((c) => Number(c.id) === id)?.title)
      .filter(Boolean);
    return {
      ...course,
      progress,
      estadoCurso,
      accesoVencido,
      enRevision,
      esperandoGrupo,
      completed,
      inProgress,
      enrolled,
      oculto: reglas.oculto_catalogo,
      porGrupo: reglas.modo_acceso === 'grupo',
      requiereSolicitud: reglas.requiere_solicitud && !esCursoDePago(course),
      solicitud: misSolicitudes[Number(course.id)] || null,
      lugaresRestantes,
      faltanPrerrequisitos,
    };
  });

  const enrolledCourses = processedCourses.filter(c => c.enrolled);
  const inProgressCourses = processedCourses.filter(c => c.inProgress && !c.enRevision && !c.accesoVencido && !c.esperandoGrupo);

  // Catálogo separado por tipo. Lo gratuito que se sugiere como primer paso
  // tiene que ser de verdad gratuito y tomarse en el aula.
  const visibles = processedCourses.filter(c => !c.oculto || c.enrolled);
  const nombreBuscado = busquedaCatalogo.trim().toLocaleLowerCase('es-MX');
  const coincide = (c) => !nombreBuscado
    || `${c.title || ''} ${c.description || ''}`.toLocaleLowerCase('es-MX').includes(nombreBuscado);
  const cursosBuscados = visibles.filter(coincide);
  const cursosGratis = filtroCatalogo === 'todos' || filtroCatalogo === 'gratis' ? cursosBuscados.filter(c => !esCursoDePago(c)) : [];
  const cursosDePago = filtroCatalogo === 'todos' || filtroCatalogo === 'pago' ? cursosBuscados.filter(c => esCursoDePago(c)) : [];
  const verProgramas = filtroCatalogo === 'todos' || filtroCatalogo === 'programas';
  const programasBuscados = verProgramas ? premiumCoursesOnly.filter(coincide) : [];
  const simuladoresBuscados = verProgramas ? simulatorCoursesOnly.filter(coincide) : [];
  const totalCatalogo = cursosGratis.length + cursosDePago.length + programasBuscados.length + simuladoresBuscados.length;
  const cursoSugerido = visibles.find(c => !esCursoDePago(c) && c.tiene_video) || null;

  // Tarjeta de un curso del catálogo del portal. Toda la tarjeta es la acción:
  // entrar, inscribirse gratis o comprar, según el caso.
  const renderTarjetaCurso = (course) => {
    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';

    // Curso sin aula (enlace externo): se conserva el comportamiento de siempre.
    if (!course.tiene_video) {
      return (
        <Link
          key={course.id}
          to={course.link || `/classroom/${course.id}`}
          target="_blank"
          className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
          style={{ textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }}
        >
          <div className="card-glass-glow"></div>
          <div className="exp-img-container" style={{ aspectRatio: '16/9', height: 'auto', backgroundColor: '#0f172a' }}>
            <img src={course.image} alt={course.title} className="exp-main-img" style={{ objectFit: 'cover' }} />
            <div className="img-overlay-gradient"></div>
          </div>
          <div className="exp-content-body">
            <h3 className="exp-title-premium">{course.title}</h3>
          </div>
        </Link>
      );
    }

    const dePago = esCursoDePago(course);
    const ocupado = cursoOcupado === course.id;
    // Lo que impide inscribirse, en orden: prerrequisitos, cupo y solicitud.
    const bloqueo = course.enrolled ? null
      : course.faltanPrerrequisitos.length ? `Primero termina: ${course.faltanPrerrequisitos.join(', ')}`
        : course.lugaresRestantes === 0 ? 'Cupo lleno'
          : course.solicitud === 'pendiente' ? 'Solicitud enviada · en revisión'
            : course.solicitud === 'rechazada' ? 'Solicitud no aprobada'
              : null;
    const accion = course.enrolled
      ? 'Entrar al curso'
      : bloqueo || (dePago ? 'Comprar curso' : course.requiereSolicitud ? 'Solicitar inscripción' : 'Inscribirme gratis');
    const activar = () => { if (!ocupado && !bloqueo) handleAbrirCurso(course, course.enrolled); };
    // Estado visible de la tarjeta: lo primero que el alumno necesita saber.
    const [claveEstado, textoEstado] = course.enrolled
      ? (course.enRevision ? ['revision', 'En revisión']
        : course.esperandoGrupo ? ['apartado', course.estadoCurso === 'Lugar apartado' ? 'Lugar apartado' : `Lugar apartado · ${course.estadoCurso}`]
          : course.completed ? ['completo', 'Completado']
            : course.accesoVencido ? ['vencido', 'Acceso vencido']
              : ['inscrito', course.progress > 0 ? `Inscrito · ${course.progress}%` : 'Inscrito'])
      : course.lugaresRestantes === 0 ? ['lleno', 'Cupo lleno']
        : course.solicitud === 'pendiente' ? ['solicitud', 'Solicitud enviada']
          : course.solicitud === 'rechazada' ? ['lleno', 'Solicitud no aprobada']
            : course.faltanPrerrequisitos.length ? ['requisito', 'Requiere otro curso']
              : course.requiereSolicitud ? ['solicitud', 'Requiere solicitud']
                : [null, null];

    return (
      <div
        key={course.id}
        role="button"
        tabIndex={0}
        aria-busy={ocupado}
        aria-disabled={!!bloqueo}
        className={`exp-premium-card curso-tarjeta${ocupado ? ' curso-tarjeta--ocupada' : ''}${bloqueo ? ' curso-tarjeta--bloqueada' : ''}`}
        onClick={activar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(); }
        }}
      >
        <div className="card-glass-glow"></div>
        <div className="exp-img-container" style={{ aspectRatio: '16/9', height: 'auto', backgroundColor: '#0f172a' }}>
          {/* Inscrito ya lo dice la etiqueta de estado; aquí solo el precio. */}
          {!course.enrolled && (
            <span className={`curso-precio-chip ${dePago ? 'pago' : 'gratis'}`}>
              {dePago ? formatoPrecio(course.precio_mxn) : 'Gratis'}
            </span>
          )}
          <img src={course.image} alt={course.title} className="exp-main-img" style={{ objectFit: 'cover' }} />
          <div className="img-overlay-gradient"></div>
        </div>
        <div className="exp-content-body">
          {claveEstado && <span className={`curso-estado curso-estado--${claveEstado}`}>{textoEstado}</span>}
          <h3 className="exp-title-premium">{course.title}</h3>
          {course.enrolled && course.progress > 0 && !course.completed && (
            <div className="curso-estado-avance" aria-hidden="true"><span style={{ width: `${course.progress}%` }} /></div>
          )}
          {!course.enrolled && course.porGrupo && (
            <span className="curso-generacion">Por generación: al inscribirte apartas tu lugar y el curso se abre en la fecha de inicio de tu grupo.</span>
          )}
          {!course.enrolled && course.lugaresRestantes > 0 && course.lugaresRestantes <= 10 && (
            <span className="curso-lugares">{course.lugaresRestantes === 1 ? 'Queda 1 lugar' : `Quedan ${course.lugaresRestantes} lugares`}</span>
          )}
          <div className="exp-footer-premium">
            <span className="exp-link-action">
              <span>{ocupado ? 'Un momento…' : accion}</span>
              {!ocupado && !bloqueo && <ArrowRight size={18} />}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const numEnrolled = enrolledCourses.length;
  const numCertificates = myCertificates.length;

  // Average progress
  const avgProgress = numEnrolled > 0
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / numEnrolled)
    : 0;
  const avatarUrl = getSafeAvatarUrl(profile?.avatar_url, user?.user_metadata?.avatar_url);

  // Navegación en celular: barra inferior y hoja "Más".
  const itemsMenu = MENU_ALUMNO.flatMap((g) => g.items);
  const principalesMovil = ORDEN_MOVIL
    .map((id) => itemsMenu.find((i) => i.id === id))
    .map((i) => ({ ...i, contador: i.id === 'mensajes' ? mensajesNoLeidos : 0 }));
  const secundariosMovil = [
    ...itemsMenu.filter((i) => !ORDEN_MOVIL.includes(i.id)),
    { id: 'salir', label: 'Cerrar sesión', icon: LogOut, peligro: true, accion: handleLogout },
  ];

  // Webinars de la semana para "Próximas clases en vivo" del inicio.
  const webinarsInicio = webinarsPortal.map((w) => ({
    id: w.id,
    title: w.title,
    inicio: fechaEnZona(w.fecha_inicio),
    registrado: !!registroDeWebinar(w.id),
  }));

  // Avisos calculados del estado real del alumno (certificado listo, curso a
  // medias, curso sin empezar). La campanita los junta con los del servidor y
  // no repite los que ya avisó el servidor para el mismo curso.
  const avisosDerivados = [
    ...myCertificates.slice(0, 3).map((cert) => ({
      id: `cert-${cert.id}`,
      tipo: 'certificado',
      courseId: String(cert.course_id),
      texto: `Tu certificado de ${cert.courses?.title || 'tu programa'} está listo para descargar.`,
      destino: { tab: 'certificates' },
    })),
    ...inProgressCourses.slice(0, 3).map((course) => ({
      id: `prog-${course.id}`,
      tipo: 'progreso',
      courseId: String(course.id),
      texto: `Llevas ${course.progress}% de ${course.title}. Continúa donde te quedaste.`,
      destino: { courseId: course.id },
    })),
    ...enrolledCourses
      .filter((course) => course.progress === 0 && !course.completed && !course.enRevision && !course.accesoVencido && !course.esperandoGrupo)
      .slice(0, 2)
      .map((course) => ({
        id: `nuevo-${course.id}`,
        tipo: 'nuevo',
        courseId: String(course.id),
        texto: `Aún no empiezas ${course.title}. Tu acceso ya está activo.`,
        destino: { courseId: course.id },
      })),
  ];

  return (
    <div className="crm-layout" data-theme={effectiveTheme}>
      {esAdmin && <FranjaVistaAlumno />}
      {/* Fondo oscuro para cerrar el cajón tocando fuera. Solo visible en móvil. */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`crm-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-close-btn"
          onClick={() => setIsSidebarCollapsed(true)}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
        <div className="sidebar-header">
          <div className="logo-container">
            <img 
              src={isSidebarCollapsed ? "/assets/componentes/firma-hce.png" : "/assets/componentes/ghghg-scaled.png"} 
              alt="HCE Logo" 
              className="sidebar-logo" 
            />
          </div>
        </div>

        <nav className="sidebar-menu" aria-label="Menú del portal">
          {MENU_ALUMNO.map((grupo) => (
            <div key={grupo.titulo} className="menu-grupo" role="group" aria-label={grupo.titulo}>
              <span className="menu-grupo-titulo" aria-hidden="true">{grupo.titulo}</span>
              {grupo.items.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`menu-item ${activeTab === id ? 'active' : ''}`}
                  aria-current={activeTab === id ? 'page' : undefined}
                  onClick={() => setActiveTab(id)}
                  title={label}
                >
                  {React.createElement(icon, { size: 20, className: 'menu-icon' })}
                  <span className="menu-label">{label}</span>
                  {id === 'mensajes' && mensajesNoLeidos > 0 && <span className="menu-contador" aria-label={`${mensajesNoLeidos} sin leer`}>{mensajesNoLeidos}</span>}
                </button>
              ))}
            </div>
          ))}

          <div className="sidebar-separator"></div>

          <button
            type="button"
            className="menu-item logout-item"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <LogOut size={20} className="menu-icon" />
            <span className="menu-label">Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="crm-main-container">
        
        {/* Top Header */}
        <header className="crm-top-header">
          <div className="top-header-left">
            <button type="button" className="sidebar-toggle-btn-header" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"} aria-label={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}>
              <Menu size={20} />
            </button>
            <span className="breadcrumb-main">HCE Portal</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-sub">{getBreadcrumbTitle()}</span>
          </div>

          <div className="top-header-right">
            {/* Campanita: avisos del servidor + los calculados del avance */}
            <CampanitaAvisos
              userId={user?.id}
              derivados={avisosDerivados}
              onIr={setActiveTab}
              onAbrirAula={abrirAula}
            />

            <div className="user-profile-summary">
              <span className="user-greeting">Hola, <strong>{getFirstName()}</strong></span>
              <div className="user-avatar-circle" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="crm-content-area">
          {/* Los comunicados viven en "Avisos" del inicio (InicioAlumno). */}

          {/* Cuenta nueva: entra al portal, pero sus cursos se abren hasta que la activen. */}
          {confirmacionError && <div className="cuenta-revision-banner" role="alert">
            <p>{confirmacionError}</p>
            <button type="button" className="btn-crm-action solid" disabled={confirmandoPago} onClick={confirmarPago}>
              {confirmandoPago ? 'Confirmando…' : 'Reintentar confirmación'}
            </button>
          </div>}
          {profile?.rol !== 'admin' && profile?.aprobado === false && profile?.activo !== false && (
            <div className="cuenta-revision-aviso" role="status">
              <Clock size={18} />
              <div>
                <strong>Tu cuenta está en revisión.</strong>
                <span> Puedes explorar el portal e inscribirte a cursos; se abrirán cuando un administrador te dé acceso y te asigne tu grupo.</span>
              </div>
            </div>
          )}
          
          {/* VIEW: INICIO ("Mi aprendizaje"): lo que sigue, pendientes y cursos */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-view">
              <InicioAlumno
                userId={user?.id}
                nombre={getFirstName()}
                mensajeBienvenida={mensajeBienvenida}
                cursos={processedCourses}
                cursoSugerido={cursoSugerido}
                cursoOcupado={cursoOcupado}
                webinars={webinarsInicio}
                numCertificados={numCertificates}
                onAbrirAula={abrirAula}
                onAbrirCurso={(curso) => handleAbrirCurso(curso, curso.enrolled)}
                onIr={setActiveTab}
                cargandoCursos={cargandoInscripciones || !reglasListas || !certificadosListos || !aperturasListas}
                extra={(
                  <>
                    <LogrosAlumno userId={user?.id} />
                    {/* Programas de alta especialidad: invitación al final del inicio */}
                    <div className="sub-section-block">
                      <h2>Programas de alta especialidad</h2>
                      <div className="dash-exp-grid" style={{ marginTop: '20px' }}>
                        {premiumCoursesOnly.map(course => {
                          const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                          return (
                            <Link
                              key={course.id}
                              to={course.link || `/classroom/${course.id}`}
                              target="_blank"
                              className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                              style={{ textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }}
                            >
                              <div className="card-glass-glow"></div>
                              <div className={`exp-img-container ${course.containerClass || ''}`}>
                                <img src={course.image} alt={course.title} className={`exp-main-img ${course.imgClass || ''}`} />
                                <div className="img-overlay-gradient"></div>
                              </div>
                              <div className="exp-content-body">
                                {course.startDate && (
                                  <div className="exp-start-date">
                                    <Calendar size={14} className="calendar-icon" />
                                    <span>{course.startDate}</span>
                                  </div>
                                )}
                                <h3 className="exp-title-premium">{course.title}</h3>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              />
            </div>
          )}

          {/* VIEW: MIS CURSOS: tarjetas con avance y estado, con filtro rápido */}
          {activeTab === 'courses' && (() => {
            const filtros = [
              ['todos', 'Todos', enrolledCourses],
              ['progreso', 'En progreso', enrolledCourses.filter((c) => c.inProgress && !c.completed && !c.accesoVencido)],
              ['nuevos', 'Sin empezar', enrolledCourses.filter((c) => !c.completed && c.progress === 0 && !c.enRevision && !c.esperandoGrupo && !c.accesoVencido)],
              ['completos', 'Completados', enrolledCourses.filter((c) => c.completed)],
            ];
            const lista = (filtros.find(([id]) => id === filtroMisCursos) || filtros[0])[2];
            return (
              <div className="courses-view">
                <TituloSeccion etiqueta="Aprender" titulo="Mis cursos" descripcion="Tu avance en cada curso y el acceso directo a su aula." />

                {enrolledCourses.length === 0 ? (
                  <div className="crm-empty-state-card">
                    <Inbox size={40} className="empty-state-icon" />
                    <h3>Todavía no tienes cursos</h3>
                    <p>Inscríbete a un curso del catálogo y aparecerá aquí con tu avance.</p>
                    <button
                      type="button"
                      className="btn-crm-action solid btn-empty-state"
                      onClick={() => setActiveTab('explore')}
                      style={{ marginTop: '15px' }}
                    >
                      Explora el catálogo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="filtro-chips" role="tablist" aria-label="Filtrar mis cursos">
                      {filtros.map(([id, texto, cursos]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={filtroMisCursos === id}
                          className={`filtro-chip${filtroMisCursos === id ? ' activo' : ''}`}
                          onClick={() => setFiltroMisCursos(id)}
                        >
                          {texto} <span className="filtro-chip-num">{cursos.length}</span>
                        </button>
                      ))}
                    </div>
                    {lista.length === 0 ? (
                      <p className="filtro-vacio" role="status">No tienes cursos en esta categoría.</p>
                    ) : (
                      <div className="ia-cursos mis-cursos-rejilla">
                        {lista.map((course) => (
                          <TarjetaMiCurso
                            key={course.id}
                            curso={course}
                            onAbrir={() => abrirAula(course.id)}
                            onVerCertificado={() => setActiveTab('certificates')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {activeTab === 'calificaciones' && <div className="calificaciones-view">
            <TituloSeccion etiqueta="Aprender" titulo="Mis calificaciones" descripcion="Tus exámenes, tareas y calificación final de cada curso." />
            {errorCalificaciones ? <div className="pa-alerta" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>No pudimos cargar tus calificaciones. {errorCalificaciones}</span><button type="button" className="btn-crm-action outlined" onClick={() => setIntentoCalificaciones(n => n + 1)}>Reintentar</button></div>
              : !calificaciones ? <p className="pa-cargando" role="status">Cargando calificaciones…</p>
              : enrolledCourses.length === 0 ? (
                <div className="crm-empty-state-card">
                  <CheckSquare size={40} className="empty-state-icon" />
                  <h3>Aún no hay calificaciones</h3>
                  <p>Tus exámenes y tareas aparecerán aquí cuando te inscribas a un curso y los presentes.</p>
                  <div className="pa-acciones-centro"><button type="button" className="btn-crm-action solid" onClick={() => setActiveTab('explore')}>Explorar el catálogo</button></div>
                </div>
              )
              : enrolledCourses.map(curso => {
                const evaluaciones = calificaciones.evaluaciones.filter(e => Number(e.course_id) === Number(curso.id));
                const tareas = calificaciones.tareas.filter(e => Number(e.course_id) === Number(curso.id));
                const certificado = myCertificates.find(c => Number(c.course_id) === Number(curso.id));
                return <section className="sub-section-block" key={curso.id}>
                  <h3>{curso.title}</h3>
                  <p className="calif-final">Calificación final: {certificado?.score != null ? <strong>{certificado.score}%</strong> : <span>se asigna al emitir tu certificado</span>}</p>
                  {!evaluaciones.length && !tareas.length ? (
                    <p className="calif-vacio">Aún no presentas exámenes ni entregas tareas. <button type="button" className="pa-enlace" onClick={() => abrirAula(curso.id)}>Ir al curso</button></p>
                  ) : <div className="table-responsive-container">
                    <table className="admin-table"><thead><tr><th>Actividad</th><th>Mejor calificación</th><th>Intentos</th><th>Estado</th></tr></thead>
                      <tbody>{evaluaciones.map(e => <tr key={'e-' + e.leccion_id}>
                        <td>{e.curso_lecciones?.titulo || (e.calificacion == null ? 'Encuesta' : 'Examen')}</td>
                        <td>{e.mejor == null ? 'Sin calificación (encuesta)' : e.mejor + '%'}</td><td>{e.intentos}</td>
                        <td>{e.mejor == null ? 'Enviada' : e.aprobado ? 'Aprobado' : 'Por aprobar'}</td>
                      </tr>)}{tareas.map(t => <tr key={'t-' + t.leccion_id}>
                        <td>{t.curso_lecciones?.titulo || 'Tarea'}{t.comentario && <p>{t.comentario}</p>}</td><td>—</td><td>—</td>
                        <td>{t.estado === 'aprobada' ? 'Aprobada' : t.estado === 'rechazada' ? 'Por corregir' : 'En revisión'}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>}
                </section>;
              })}
          </div>}

          {/* VIEW: CATÁLOGO: buscador, filtros y tarjetas con su estado */}
          {activeTab === 'explore' && (
            <div className="explore-view">
              <TituloSeccion etiqueta="Descubrir" titulo="Catálogo" descripcion="Cursos gratuitos, cursos en línea y programas de alta especialidad de HCE." />

              <div className="catalogo-herramientas">
                <label className="catalogo-buscar" htmlFor="buscar-catalogo">
                  <span className="sr-only">Buscar un curso</span>
                  <Search size={17} aria-hidden="true" />
                  <input id="buscar-catalogo" type="search" value={busquedaCatalogo} onChange={e => setBusquedaCatalogo(e.target.value)} placeholder="Buscar por nombre o tema" />
                  {busquedaCatalogo && (
                    <button type="button" className="catalogo-limpiar" onClick={() => setBusquedaCatalogo('')} aria-label="Borrar búsqueda"><X size={15} /></button>
                  )}
                </label>
                <div className="filtro-chips" role="tablist" aria-label="Filtrar el catálogo">
                  {[['todos', 'Todos'], ['gratis', 'Gratis'], ['pago', 'De pago'], ['programas', 'Programas']].map(([id, texto]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={filtroCatalogo === id}
                      className={`filtro-chip${filtroCatalogo === id ? ' activo' : ''}`}
                      onClick={() => setFiltroCatalogo(id)}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
              <p className="catalogo-conteo" role="status">
                {totalCatalogo === 0
                  ? (nombreBuscado ? `No encontramos cursos con «${busquedaCatalogo.trim()}».` : 'No hay cursos en esta categoría por ahora.')
                  : `${totalCatalogo} ${totalCatalogo === 1 ? 'resultado' : 'resultados'}${nombreBuscado ? ` para «${busquedaCatalogo.trim()}»` : ''}`}
                {(nombreBuscado || filtroCatalogo !== 'todos') && (
                  <button type="button" className="catalogo-quitar-filtros" onClick={() => { setBusquedaCatalogo(''); setFiltroCatalogo('todos'); }}>
                    Ver todo
                  </button>
                )}
              </p>

              {/* Cursos gratuitos */}
              {(filtroCatalogo === 'todos' || filtroCatalogo === 'gratis') && (cursosGratis.length > 0 || !nombreBuscado) && (
                <div className="catalog-courses-section-wrapper catalogo-seccion">
                  <h3 className="catalog-subtitle">
                    <span className="free-badge-title">GRATIS</span>
                    Cursos gratuitos
                  </h3>
                  <p className="catalogo-seccion-nota">Accede sin costo a contenido educativo de HCE.</p>
                  <div className="dash-exp-grid">
                    {cursosGratis.length === 0 ? (
                      <div className="crm-empty-state-card mini" style={{ gridColumn: '1 / -1' }}>
                        <PlayCircle size={32} className="empty-state-icon" />
                        <h4>Próximamente</h4>
                        <p>Estamos preparando contenido gratuito para ti. ¡Vuelve pronto!</p>
                      </div>
                    ) : cursosGratis.map(renderTarjetaCurso)}
                  </div>
                </div>
              )}

              {/* Cursos de pago del portal: solo aparece la sección si hay alguno */}
              {cursosDePago.length > 0 && (
                <div className="catalog-courses-section-wrapper catalogo-seccion">
                  <h3 className="catalog-subtitle">Cursos en línea</h3>
                  <p className="catalogo-seccion-nota">Pagas una vez y el curso queda en tu portal, con su certificado al aprobar.</p>
                  <div className="dash-exp-grid">
                    {cursosDePago.map(renderTarjetaCurso)}
                  </div>
                </div>
              )}

              {/* Programas de alta especialidad */}
              {programasBuscados.length > 0 && (
                <div className="catalog-courses-section-wrapper catalogo-seccion">
                  <h3 className="catalog-subtitle">Programas de alta especialidad</h3>
                  <div className="dash-exp-grid">
                  {programasBuscados.map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link || `/classroom/${course.id}`}
                        className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                        style={{ textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }}
                      >
                        <div className="card-glass-glow"></div>
                        <div className={`exp-img-container ${course.containerClass || ''}`}>
                          {course.badge && (
                            <div className={`status-badge ${course.badgeClass || ''}`}>{course.badge}</div>
                          )}
                          <img src={course.image} alt={course.title} className={`exp-main-img ${course.imgClass || ''}`} />
                          <div className="img-overlay-gradient"></div>
                          {Icon && <div className="card-floating-icon"><Icon size={24} /></div>}
                        </div>
                        <div className="exp-content-body">
                          {course.startDate && (
                            <div className="exp-start-date">
                              <Calendar size={14} className="calendar-icon" />
                              <span>{course.startDate}</span>
                            </div>
                          )}
                          <h3 className="exp-title-premium">{course.title}</h3>
                          <p className="exp-desc-premium">{course.description}</p>
                          <div className="exp-footer-premium">
                            <span className="exp-link-action">
                              <span>{isComingSoon ? 'Próximamente' : (course.cta || 'Ver programa')}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Simuladores */}
              {simuladoresBuscados.length > 0 && (
                <div className="catalog-courses-section-wrapper catalogo-seccion">
                  <h3 className="catalog-subtitle">Simuladores</h3>
                  <div className="dash-exp-grid">
                  {simuladoresBuscados.map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link || `/classroom/${course.id}`}
                        className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                        style={{ textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }}
                      >
                        <div className="card-glass-glow"></div>
                        <div className={`exp-img-container ${course.containerClass || ''}`}>
                          {course.badge && (
                            <div className={`status-badge ${course.badgeClass || ''}`}>{course.badge}</div>
                          )}
                          <img src={course.image} alt={course.title} className={`exp-main-img ${course.imgClass || ''}`} />
                          <div className="img-overlay-gradient"></div>
                          {Icon && <div className="card-floating-icon"><Icon size={24} /></div>}
                        </div>
                        <div className="exp-content-body">
                          <h3 className="exp-title-premium">{course.title}</h3>
                          <p className="exp-desc-premium">{course.description}</p>
                          <div className="exp-footer-premium">
                            <span className="exp-link-action">
                              <span>{isComingSoon ? 'Próximamente' : (course.cta || 'Ver programa')}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: WEBINARS (registro, acceso a Zoom y constancia) */}
          {activeTab === 'calendario' && (
            <div className="dashboard-view">
              <CalendarioAlumno
                cursosInscritos={misInscripciones || new Set()}
                cursos={catalogCourses}
                onAbrirEvento={(e) => (e.tipo === 'sesion' && e.courseId ? abrirAula(e.courseId) : setActiveTab('webinars'))}
              />
            </div>
          )}

          {activeTab === 'mensajes' && user?.id && (
            <div className="dashboard-view">
              <Mensajes
                userId={user.id}
                notificar={showToast}
                onLeidos={() => contarNoLeidos(user.id).then(setMensajesNoLeidos)}
              />
            </div>
          )}

          {activeTab === 'webinars' && (
            <div className="webinars-portal-view">
              <TituloSeccion etiqueta="Descubrir" titulo="Webinars gratuitos" descripcion="Regístrate, entra por Zoom y descarga tu constancia al terminar. Todo desde aquí." />

              {webinarsPortal.length === 0 ? (
                <div className="crm-empty-state-card">
                  <Video size={48} className="empty-state-icon" />
                  <h3>No hay webinars abiertos</h3>
                  <p>En cuanto se programe el siguiente lo verás aquí y te avisaremos a tu correo.</p>
                </div>
              ) : (
                <div className="webinar-portal-grid">
                  {webinarsPortal.map((webinar) => {
                    const registro = registroDeWebinar(webinar.id);
                    const ocupado = webinarOcupado === webinar.id;
                    const estado = webinar.constancia_estado || 'bloqueada';

                    return (
                      <article key={webinar.id} className="webinar-portal-card">
                        {webinar.image_url && (
                          <div className="webinar-portal-media">
                            <img src={webinar.image_url} alt="" loading="lazy" />
                          </div>
                        )}

                        <div className="webinar-portal-body">
                          <h3>{webinar.title}</h3>
                          <p className="webinar-portal-fecha">
                            <Calendar size={14} />
                            <span>
                              {fechaEnZona(webinar.fecha_inicio)
                                ? formatearFechaHora(fechaEnZona(webinar.fecha_inicio))
                                : `${webinar.date || ''}${webinar.time ? ` · ${webinar.time} (hora del centro de México)` : ''}`}
                            </span>
                          </p>

                          {!registro ? (
                            <button
                              className="btn-crm-action solid webinar-portal-btn"
                              disabled={ocupado}
                              onClick={() => handleRegistrarWebinar(webinar)}
                            >
                              {ocupado ? 'Registrando…' : 'Registrar mi asistencia'}
                            </button>
                          ) : (
                            <>
                              <div className="webinar-portal-acceso">
                                <span className="webinar-portal-chip">
                                  <CheckCircle size={13} /> Registrado
                                </span>
                                {registro.join_url && (
                                  <a
                                    className="btn-crm-action outlined webinar-portal-btn"
                                    href={registro.join_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <PlayCircle size={15} /> Entrar al Zoom
                                  </a>
                                )}
                              </div>

                              <div className="webinar-portal-constancia">
                                {registro.asistio ? (
                                  <>
                                    <p className="webinar-portal-constancia-titulo">
                                      <Award size={15} /> Constancia disponible
                                    </p>
                                    <p className="webinar-portal-nota">
                                      {registro.metodo === 'zoom'
                                        ? `Zoom confirmó ${registro.minutos} minutos de asistencia.`
                                        : 'Tu asistencia quedó confirmada.'}
                                    </p>
                                    <button
                                      className="btn-crm-action solid webinar-portal-btn"
                                      disabled={ocupado}
                                      onClick={() => handleDesbloquearWebinar(webinar)}
                                    >
                                      <Download size={15} />
                                      {ocupado
                                        ? 'Preparando…'
                                        : registro.certificado_url
                                          ? 'Descargar constancia'
                                          : 'Generar y descargar'}
                                    </button>
                                  </>
                                ) : estado === 'bloqueada' ? (
                                  <>
                                    <p className="webinar-portal-constancia-titulo bloqueada">
                                      <Lock size={15} /> Constancia bloqueada
                                    </p>
                                    <p className="webinar-portal-nota">
                                      Se libera cuando termine el webinar. Si no alcanzas a asistir,
                                      espera: próximamente publicaremos la grabación de forma abierta.
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="webinar-portal-constancia-titulo">
                                      <Lock size={15} /> Constancia por desbloquear
                                    </p>
                                    <p className="webinar-portal-nota">
                                      Zoom verifica tu asistencia solo. Si no te reconoce, te pedimos
                                      el código que dio el ponente al cerrar la clase.
                                    </p>
                                    <button
                                      className="btn-crm-action solid webinar-portal-btn"
                                      disabled={ocupado}
                                      onClick={() => handleDesbloquearWebinar(webinar)}
                                    >
                                      {ocupado ? 'Verificando…' : 'Desbloquear constancia'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {modalCodigo && (
                <div
                  className="webinar-modal-backdrop"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Desbloquear constancia"
                  onClick={() => setModalCodigo(null)}
                >
                  <div className="webinar-modal" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="webinar-modal-cerrar"
                      onClick={() => setModalCodigo(null)}
                      aria-label="Cerrar"
                    >
                      <X size={18} />
                    </button>

                    <h3>¿Asististe a «{modalCodigo.webinar.title}»?</h3>
                    <p className={modalCodigo.esError ? 'webinar-modal-error' : 'webinar-modal-nota'}>
                      {modalCodigo.mensaje}
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleDesbloquearWebinar(modalCodigo.webinar, modalCodigo.valor);
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={modalCodigo.valor}
                        onChange={(e) =>
                          setModalCodigo({ ...modalCodigo, valor: e.target.value, esError: false })
                        }
                        placeholder="Código de la clase"
                        className="webinar-modal-input"
                      />

                      <div className="webinar-modal-acciones">
                        <button
                          type="button"
                          className="btn-crm-action outlined"
                          onClick={() => setModalCodigo(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn-crm-action solid"
                          disabled={
                            !modalCodigo.valor.trim() ||
                            webinarOcupado === modalCodigo.webinar.id
                          }
                        >
                          {webinarOcupado === modalCodigo.webinar.id ? 'Validando…' : 'Desbloquear'}
                        </button>
                      </div>
                    </form>

                    <p className="webinar-modal-pie">
                      ¿No pudiste asistir? Próximamente liberaremos la grabación de forma abierta.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: CERTIFICADOS: cada certificado con descarga y verificación */}
          {activeTab === 'certificates' && (
            <div className="certificates-view">
              <TituloSeccion
                etiqueta="Certificados"
                titulo="Mis certificados"
                descripcion="Descarga tus certificados y comparte el enlace para que cualquiera pueda verificarlos."
              />

              {errorCertificados && (
                <div className="pa-alerta" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>No pudimos cargar tus certificados. {errorCertificados}</span>
                  <button type="button" className="btn-crm-action outlined" onClick={() => { setErrorCertificados(''); void fetchMyCertificates(); }}>Reintentar</button>
                </div>
              )}

              {!certificadosListos ? (
                <p className="pa-cargando" role="status">Cargando tus certificados…</p>
              ) : myCertificates.length === 0 && constanciasWebinar.length === 0 ? (
                !errorCertificados && (
                  <div className="crm-empty-state-card">
                    <Award size={44} className="empty-state-icon" />
                    <h3>Aún no tienes certificados</h3>
                    <p>Tu certificado aparece aquí en cuanto terminas y apruebas un curso. Las constancias de los webinars también se guardan aquí.</p>
                    <div className="pa-acciones-centro">
                      <button type="button" className="btn-crm-action solid" onClick={() => setActiveTab(numEnrolled ? 'courses' : 'explore')}>
                        {numEnrolled ? 'Continuar mis cursos' : 'Explorar el catálogo'}
                      </button>
                    </div>
                  </div>
                )
              ) : myCertificates.length === 0 ? null : (
                <ul className="cert-lista">
                  {myCertificates.map((cert) => {
                    const vigencia = (() => {
                      // Sin fecha es permanente; con fecha vence, y 30 días antes
                      // se sugiere recertificarse.
                      if (!cert.vigente_hasta) return { clave: 'ok', texto: 'Permanente' };
                      const vence = new Date(cert.vigente_hasta);
                      const dias = Math.ceil((vence - Date.now()) / 86400000);
                      return {
                        clave: dias < 0 ? 'vencido' : dias <= 30 ? 'pronto' : 'ok',
                        texto: dias < 0 ? `Venció el ${vence.toLocaleDateString('es-MX')}` : `Vigente hasta ${vence.toLocaleDateString('es-MX')}`,
                      };
                    })();
                    const ocupadoPdf = certificadoOcupado === `${cert.id}:pdf`;
                    const ocupadoPng = certificadoOcupado === `${cert.id}:png`;
                    const conPdf = hayPdf();
                    return (
                      <li key={cert.id} className="cert-tarjeta">
                        <div className="cert-icono" aria-hidden="true"><Award size={22} /></div>
                        <div className="cert-cuerpo">
                          <span className="pa-etiqueta">Folio {cert.folio}</span>
                          <h3>{cert.courses?.title || 'Curso'}</h3>
                          <ul className="cert-datos">
                            <li>Emitido el {new Date(cert.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                            {cert.score != null && <li>Calificación <strong>{cert.score}%</strong></li>}
                            <li><span className={`cert-vigencia cert-vigencia--${vigencia.clave}`}>{vigencia.texto}</span></li>
                          </ul>
                          <div className="cert-acciones">
                            <button
                              type="button"
                              className="btn-crm-action solid"
                              onClick={() => descargarCertificado(cert, 'pdf')}
                              disabled={certificadoOcupado !== null}
                            >
                              <Download size={15} aria-hidden="true" /> {ocupadoPdf ? 'Preparando…' : conPdf ? 'Descargar PDF' : 'Descargar certificado'}
                            </button>
                            {conPdf && (
                              <button
                                type="button"
                                className="btn-crm-action outlined"
                                onClick={() => descargarCertificado(cert, 'png')}
                                disabled={certificadoOcupado !== null}
                              >
                                {ocupadoPng ? 'Preparando…' : 'Imagen PNG'}
                              </button>
                            )}
                            {cert.folio && (
                              <>
                                <a className="btn-crm-action outlined" href={rutaVerificacion(cert.folio)} target="_blank" rel="noreferrer">
                                  <ShieldCheck size={15} aria-hidden="true" /> Ver verificación
                                </a>
                                <button type="button" className="btn-crm-action outlined" onClick={() => copiarVerificacion(cert.folio)}>
                                  <LinkIcon size={15} aria-hidden="true" /> Copiar enlace de verificación
                                </button>
                              </>
                            )}
                            {vigencia.clave !== 'ok' && (
                              <button type="button" className="btn-crm-action outlined" onClick={() => abrirAula(cert.course_id)}>
                                Recertificarme
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Constancias de asistencia a webinars: antes solo se veían en
                  la pestaña Webinars, y el alumno las buscaba aquí. */}
              {constanciasWebinar.length > 0 && (
                <div className="cert-webinars">
                  <h3 className="catalog-subtitle">Constancias de webinars</h3>
                  <ul className="cert-lista">
                    {constanciasWebinar.map((r) => {
                      const titulo = r.webinars?.title || 'Webinar';
                      return (
                        <li key={r.id} className="cert-tarjeta cert-tarjeta--webinar">
                          <div className="cert-icono" aria-hidden="true"><Video size={20} /></div>
                          <div className="cert-cuerpo">
                            {r.folio && <span className="pa-etiqueta">Folio {r.folio}</span>}
                            <h3>{titulo}</h3>
                            {r.certificado_en && <ul className="cert-datos"><li>Emitida el {new Date(r.certificado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</li></ul>}
                            <div className="cert-acciones">
                              <button
                                type="button"
                                className="btn-crm-action solid"
                                onClick={() => descargarConstancia(r.certificado_url, `Constancia_${titulo.replace(/\s+/g, '_')}.png`)}
                              >
                                <Download size={15} aria-hidden="true" /> Descargar constancia
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* VIEW: MI PERFIL: foto, datos, cédula y facturación */}
          {activeTab === 'profile' && (
            <div className="profile-view">
              <TituloSeccion
                etiqueta="Mi cuenta"
                titulo="Mi perfil"
                descripcion="Tus datos personales, profesionales y de facturación. Tu nombre aparece así en tus certificados."
              />
              <PerfilAlumno
                key={user?.id}
                user={user}
                profile={profile}
                updateProfile={updateProfile}
                updateUserMetadata={updateUserMetadata}
                notificar={showToast}
                avatarUrl={avatarUrl}
                miembroDesde={profile?.created_at ? getMemberSinceDate() : ''}
                resumen={{ cursos: numEnrolled, avance: avgProgress, certificados: numCertificates }}
                onSucio={marcarPerfilSucio}
              />
            </div>
          )}

          {activeTab === 'ayuda' && <GuiaUso rol="alumno" onIr={setActiveTab} />}

          {/* VIEW: CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <div className="settings-view">
              <TituloSeccion etiqueta="Mi cuenta" titulo="Configuración" descripcion="Zona horaria, apariencia del portal y tu contraseña." />

              {successMsg && (
                <div className="auth-alert alert-success">
                  <CheckCircle size={18} />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="auth-alert alert-error">
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="settings-card" style={{ marginBottom: '20px' }}>
                <div className="settings-card-header">
                  <h3>Zona horaria</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Las sesiones en vivo, los webinars y tu calendario se muestran en esta hora.</p>
                </div>
                <select
                  className="zona-select"
                  value={profile?.zona_horaria || ''}
                  onChange={async (e) => {
                    const zona = e.target.value || null;
                    try {
                      await updateProfile({ zona_horaria: zona });
                      recordarZona(zona);
                      showToast('Zona horaria guardada.', 'success');
                    } catch (err) {
                      showToast(/zona_horaria/.test(err.message) ? 'La zona horaria se activa al actualizar el portal. Intenta más tarde.' : err.message, 'error');
                    }
                  }}
                >
                  <option value="">Automática (la de este equipo: {zonaDelEquipo()})</option>
                  {ZONAS.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                </select>
              </div>

              {/* Theme Selector */}
              <div className="settings-card" style={{ marginBottom: '20px' }}>
                <div className="settings-card-header">
                  <h3>Apariencia</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Elige el tema visual del portal.</p>
                </div>
                <div className="theme-selector-row">
                  {[
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'dark',  label: 'Oscuro', icon: Moon },
                    { value: 'system', label: 'Sistema', icon: Monitor },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`theme-option-btn${theme === value ? ' active' : ''}`}
                      onClick={() => setTheme(value)}
                    >
                      {React.createElement(icon, { size: 20 })}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <form onSubmit={handleUpdatePassword} className="crm-settings-form">
                  <div className="form-group-row">
                    <div className="crm-input-group">
                      <label>Nueva Contraseña (mín. 6 caracteres)</label>
                      <div className="input-wrapper" style={{ position: 'relative' }}>
                        <input 
                          type={showNewPassword ? 'text' : 'password'} 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          placeholder="••••••••"
                          minLength={6}
                          required
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex="-1"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="crm-input-group">
                      <label>Confirmar Nueva Contraseña</label>
                      <div className="input-wrapper" style={{ position: 'relative' }}>
                        <input 
                          type={showConfirmNewPassword ? 'text' : 'password'} 
                          value={confirmNewPassword} 
                          onChange={(e) => setConfirmNewPassword(e.target.value)} 
                          placeholder="••••••••"
                          minLength={6}
                          required
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          tabIndex="-1"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-action-row">
                    <button type="submit" className="btn-crm-action solid" disabled={formLoading}>
                      <Save size={16} />
                      {formLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      <NavegacionMovil
        principales={principalesMovil}
        secundarios={secundariosMovil}
        activo={activeTab}
        onIr={setActiveTab}
        abierta={menuMasAbierto}
        onAbrir={() => setMenuMasAbierto(true)}
        onCerrar={cerrarMenuMas}
      />
    </div>
  );
};

export default Dashboard;
