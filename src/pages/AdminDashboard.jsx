import VistaConfiguracion from './admin/VistaConfiguracion';
import VistaAdministradores from './admin/VistaAdministradores';
import VistaReportes from './admin/VistaReportes';
import VistaMetricas from './admin/VistaMetricas';
import VistaNotificaciones from './admin/VistaNotificaciones';
import VistaAyuda from './admin/VistaAyuda';
import VistaDivisiones from './admin/VistaDivisiones';
import VistaGrupos from './admin/VistaGrupos';
import VistaTareas from './admin/VistaTareas';
import VistaWebinars from './admin/VistaWebinars';
import VistaCategorias from './admin/VistaCategorias';
import VistaCertificados from './admin/VistaCertificados';
import VistaAlumnos from './admin/VistaAlumnos';
import VistaCursos from './admin/VistaCursos';
import VistaFacturacion from './admin/VistaFacturacion';
import VistaAlumni from './admin/VistaAlumni';
import VistaErrores from './admin/VistaErrores';
import VistaPagos from './admin/VistaPagos';
import VistaInicio from './admin/VistaInicio';
import ErroresAdmin from '../components/admin/ErroresAdmin';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  GraduationCap,
  Award,
  FolderOpen,
  BarChart2,
  Users,
  Settings,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Eye,
  EyeOff,
  Monitor,
  Sun,
  Moon,
  UserPlus,
  Lock,
  Unlock,
  Mail,
  Shield,
  ExternalLink,
  Download,
  FileSpreadsheet,
  Clock,
  FileText,
  CalendarDays,
  CreditCard,
  DollarSign,
  Upload,
  Send,
  Receipt,
  RefreshCw,
  TrendingUp,
  ClipboardList,
  UsersRound,
  BellRing,
  MessagesSquare,
  Copy,
  Building2,
  Image as ImageIcon
} from 'lucide-react';
import './AdminDashboard.css';
import GuiaUso from '../components/GuiaUso';
import PosicionadorConstancia from '../components/PosicionadorConstancia';
import InformesAdmin from '../components/admin/InformesAdmin';
import EditorLecciones from '../components/admin/EditorLecciones';
import BibliotecaCurso from '../components/admin/BibliotecaCurso';
import ReglasCurso from '../components/admin/ReglasCurso';
import SolicitudesInscripcion from '../components/admin/SolicitudesInscripcion';
import ReporteAlumno from '../components/admin/ReporteAlumno';
import NotificacionesAdmin from '../components/admin/NotificacionesAdmin';
import MensajesAdmin from '../components/admin/MensajesAdmin';
import GamificacionAdmin from '../components/admin/GamificacionAdmin';
import DivisionesAdmin from '../components/admin/DivisionesAdmin';
import RevisionTareas from '../components/admin/RevisionTareas';
import GruposAdmin from '../components/admin/GruposAdmin';
import CuentasPorActivar from '../components/admin/CuentasPorActivar';
import { BotonVerComoAlumno } from '../components/CambioVista';
import InscritosCurso from '../components/admin/InscritosCurso';
import EditorCursoPestanas, { BarraGuardarCurso } from '../components/admin/EditorCursoPestanas';
import ChecklistPublicar from '../components/admin/ChecklistPublicar';
import PendientesHoy from '../components/admin/PendientesHoy';
import AlumniPassAdmin from '../components/admin/AlumniPassAdmin';
import { PESTANAS_CURSO, esPestanaFormulario, pestanaInicialCurso, recordarPestanaCurso, validarCurso, firmaCurso } from '../components/admin/editorCurso';
import { llamarInscripcion, llamarCuenta, llamarClonar, esTablaFaltante, formatoPrecio } from '../lib/cursos';
import { traerTodo } from '../lib/traerTodo';
import { tasaFinalizacion } from '../lib/informes';
import { llamarCertificado } from '../lib/certificados';
import { useNotification } from '../context/NotificationContext';

import { ABANDONMENT_INACTIVE_DAYS, LISTA_WEBINARS_BREVO, esMiniaturaYoutube, textoVigencia, escaparHtml, descargarCsv, extraerZoomId, FORM_LABELS } from './admin/utilidades';

// Menú lateral agrupado. `titulo` es el texto del tooltip con el menú colapsado.
const SECCIONES_MENU = [
  { id: 'inicio', titulo: null, items: [
    { id: 'dashboard', etiqueta: 'Dashboard', icono: Home, titulo: 'Panel inicial' },
  ] },
  { id: 'escuela', titulo: 'Escuela', items: [
    { id: 'courses', etiqueta: 'Cursos', icono: BookOpen, titulo: 'Gestión de cursos' },
    { id: 'grupos', etiqueta: 'Grupos', icono: UsersRound, titulo: 'Grupos e inscripción masiva' },
    { id: 'tareas', etiqueta: 'Tareas', icono: ClipboardList, titulo: 'Tareas por revisar' },
    { id: 'certificates', etiqueta: 'Certificados', icono: Award, titulo: 'Certificados' },
    { id: 'categories', etiqueta: 'Categorías', icono: FolderOpen, titulo: 'Categorías' },
    { id: 'webinars', etiqueta: 'Webinars', icono: CalendarDays, titulo: 'Webinars' },
  ] },
  { id: 'personas', titulo: 'Personas', items: [
    { id: 'students', etiqueta: 'Alumnos', icono: GraduationCap, titulo: 'Alumnos' },
    { id: 'divisiones', etiqueta: 'Divisiones', icono: Building2, titulo: 'Divisiones (otras asociaciones)' },
    { id: 'admins', etiqueta: 'Administradores', icono: Users, titulo: 'Administradores' },
  ] },
  { id: 'comunicacion', titulo: 'Comunicación', items: [
    { id: 'mensajes', etiqueta: 'Mensajes', icono: MessagesSquare, titulo: 'Mensajes y comunicados' },
    { id: 'notificaciones', etiqueta: 'Notificaciones', icono: BellRing, titulo: 'Notificaciones automáticas por correo' },
  ] },
  { id: 'reportes', titulo: 'Reportes', items: [
    { id: 'metricas', etiqueta: 'Métricas', icono: TrendingUp, titulo: 'Métricas de cursos' },
    { id: 'reports', etiqueta: 'Reportes', icono: BarChart2, titulo: 'Reportes' },
  ] },
  { id: 'ventas', titulo: 'Ventas', items: [
    { id: 'payments', etiqueta: 'Pagos y Formularios', icono: CreditCard, titulo: 'Pagos y Formularios' },
    { id: 'facturacion', etiqueta: 'Facturación', icono: Receipt, titulo: 'Facturación' },
    { id: 'alumni', etiqueta: 'Alumni Pass', icono: Award, titulo: 'Alumni Pass · Step 1 Refresher' },
  ] },
  { id: 'sistema', titulo: 'Sistema', items: [
    { id: 'errores', etiqueta: 'Errores', icono: AlertCircle, titulo: 'Errores del portal' },
    { id: 'settings', etiqueta: 'Configuración', icono: Settings, titulo: 'Configuración' },
    { id: 'ayuda', etiqueta: 'Ayuda', icono: LifeBuoy, titulo: 'Guía de uso' },
  ] },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast, showAlert, showConfirm } = useNotification();

  // Sidebar state. En móvil el menú se superpone al contenido, así que arranca
  // cerrado; en escritorio se mantiene abierto como siempre.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );

  // Active Tab: 'dashboard' | 'courses' | 'students' | 'certificates' | 'categories' | 'reports' | 'admins' | 'settings'
  const [activeTab, setActiveTabState] = useState(() => {
    const propuesta = new URLSearchParams(window.location.search).get('tab') || localStorage.getItem('adminActiveTab');
    return SECCIONES_MENU.some(seccion => seccion.items.some(item => item.id === propuesta)) ? propuesta : 'dashboard';
  });
  const cambiosCursoRef = useRef({ reglas: false, evaluacion: false, formulario: false });
  const permitirSalidaCurso = () => !Object.values(cambiosCursoRef.current).some(Boolean)
    || window.confirm('Hay cambios sin guardar en el curso (información, reglas o evaluación). ¿Salir y descartarlos?');
  const cambiosReglas = React.useCallback((valor) => { cambiosCursoRef.current.reglas = valor; }, []);
  const cambiosEvaluacion = React.useCallback((valor) => { cambiosCursoRef.current.evaluacion = valor; }, []);

  const setActiveTab = (tab) => {
    if (tab !== activeTab && !permitirSalidaCurso()) return;
    // Si se confirmó salir con el curso a medio editar, los cambios se
    // descartan de verdad (antes quedaban ahí al volver a Cursos).
    if (tab !== activeTab && cambiosCursoRef.current.formulario) cerrarEditorCurso();
    // En el celular el menú tapa el contenido: se cierra al elegir.
    if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsSidebarCollapsed(true);
    setActiveTabState(tab);
    try { localStorage.setItem('adminActiveTab', tab); } catch { /* sin almacenamiento */ }
  };

  const cambiarDesdeAsistente = useRef(setActiveTab);
  useEffect(() => { cambiarDesdeAsistente.current = setActiveTab; });
  useEffect(() => {
    const ir = (ev) => {
      const tab = ev.detail?.tab;
      if (SECCIONES_MENU.some(seccion => seccion.items.some(item => item.id === tab))) cambiarDesdeAsistente.current(tab);
    };
    window.addEventListener('hce:ir', ir);
    return () => window.removeEventListener('hce:ir', ir);
  }, []);

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('adminTheme') || 'light';
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('adminTheme', t);
  };

  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  useEffect(() => { window.dispatchEvent(new CustomEvent('hce:pantalla', { detail: { zona: 'admin', tab: activeTab, theme: effectiveTheme } })); }, [activeTab, effectiveTheme]);

  // Supabase profiles list (both students & admins)
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [errorPerfiles, setErrorPerfiles] = useState('');

  // Supabase certificates list
  const [certificates, setCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  const downloadCertificateFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Fetch download failed, opening in new tab:', err);
      window.open(url, '_blank');
    }
  };

  // Catalog Courses (Local state sync for creation/editing)
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('courses');
    return saved ? JSON.parse(saved) : [];
  });
  // Para no mostrar "Aún no hay cursos" mientras llega la primera consulta.
  const [cursosCargados, setCursosCargados] = useState(false);
  const [errorCursos, setErrorCursos] = useState('');


  // Categories list
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  // Webinars list state
  const [webinars, setWebinars] = useState(() => {
    const saved = localStorage.getItem('webinars');
    return saved ? JSON.parse(saved) : [];
  });
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState(null);
  const [webinarForm, setWebinarForm] = useState({
    title: '',
    date: '',
    time: '',
    image_url: '',
    link: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
    // Registro por el portal, asistencia por Zoom y constancia.
    registro_portal: false,
    zoom_id: '',
    zoom_tipo: 'webinar',
    minutos_minimos: 0,
    constancia_estado: 'bloqueada',
    codigo: '',
    brevo_lista_id: LISTA_WEBINARS_BREVO,
    certificado_template_url: '',
    certificado_x: '',
    certificado_y: '',
    certificado_font_size: ''
  });

  // Listado de registrados de un webinar (se abre desde la tabla).
  const [webinarRegistros, setWebinarRegistros] = useState(null);
  const [sincronizandoWebinar, setSincronizandoWebinar] = useState(false);

  // Student activity and progress surveillance states
  const [studentActivities, setStudentActivities] = useState([]);
  const [studentProgressList, setStudentProgressList] = useState([]);
  const [errorTracking, setErrorTracking] = useState('');
  // Inscripciones de todos los alumnos (dashboard y reportes). `null` = la
  // tabla aún no existe o no se pudo leer.
  const [inscripcionesTodas, setInscripcionesTodas] = useState([]);
  // Lo necesario para saber quién terminó un curso sin certificado: lecciones,
  // lecciones completadas y exámenes finales aprobados.
  const [datosCertificables, setDatosCertificables] = useState(null);
  const [reportsSubTab, setReportsSubTab] = useState('dashboard_general');

  // Facturacion requests
  const [facturacionReqs, setFacturacionReqs] = useState([]);
  const [loadingFacturacion, setLoadingFacturacion] = useState(false);

  // Course management states
  // Always start with form closed (never persist open state)
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    duracion: '',
    modalidad: 'Online',
    requisitos: '',
    image: '',
    link: '',
    minAprobacion: 80,
    activo: true,
    youtube_video_id: '',
    certificado_template_url: '',
    certificado_x: 300,
    certificado_y: 400,
    certificado_font_size: 40,
    category_id: '',
    tipo: 'gratis',
    precio_mxn: '',
    vigencia_meses: '',
    questions: []
  });

  // Editor de cursos por pestañas: pestaña abierta, las ya visitadas (se
  // quedan montadas para no perder lo que se esté editando en ellas), la
  // huella de lo último guardado y el estado del botón de guardar.
  const [pestanaCurso, setPestanaCurso] = useState('info');
  const [pestanasCursoVisitadas, setPestanasCursoVisitadas] = useState(['info']);
  const [firmaCursoGuardada, setFirmaCursoGuardada] = useState('');
  const [estadoGuardadoCurso, setEstadoGuardadoCurso] = useState('idle');
  const [intentoGuardarCurso, setIntentoGuardarCurso] = useState(false);
  const [camposCursoTocados, setCamposCursoTocados] = useState({});
  const [recargaChecklist, setRecargaChecklist] = useState(0);
  const cursoSucio = showCourseForm && firmaCurso(courseForm) !== firmaCursoGuardada;
  useEffect(() => {
    cambiosCursoRef.current.formulario = cursoSucio;
    if (!cursoSucio) return undefined;
    const salir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', salir);
    return () => window.removeEventListener('beforeunload', salir);
  }, [cursoSucio]);

  // Lista de cursos: búsqueda y filtros.
  const [busquedaCursos, setBusquedaCursos] = useState('');
  const [filtroEstadoCursos, setFiltroEstadoCursos] = useState('todos');
  const [filtroAccesoCursos, setFiltroAccesoCursos] = useState('todos');

  // Divisiones, para filtrar el directorio de alumnos.
  const [divisionesLista, setDivisionesLista] = useState([]);
  const [studentDivisionFilter, setStudentDivisionFilter] = useState('');
  useEffect(() => {
    let vigente = true;
    supabase.from('divisiones').select('id, nombre').order('nombre').then(({ data, error }) => {
      if (vigente && !error) setDivisionesLista(data || []);
    });
    return () => { vigente = false; };
  }, []);

  // Curso cuyas métricas se abren desde Gestión de Cursos (objeto nuevo en
  // cada clic, para reabrir el mismo curso).
  const [metricasDeCurso, setMetricasDeCurso] = useState(null);

  // Alumno cuyo reporte completo está abierto.
  const [reporteAlumno, setReporteAlumno] = useState(null);

  // Tareas sin revisar: se muestran como contador en el menú.
  const [tareasPendientes, setTareasPendientes] = useState(0);

  // Solicitudes de inscripción pendientes (insignia de Alumnos). `null` si la
  // tabla aún no existe o no se pudo leer: no se muestra nada.
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(null);

  // Se cuentan al entrar al panel y al cambiar de sección, para que las
  // insignias del menú no se queden con números viejos. Son consultas de
  // solo conteo (head) y fallan en silencio.
  useEffect(() => {
    let vigente = true;
    const contar = (consulta, guardar) => Promise.resolve(consulta)
      .then(({ count, error }) => { if (vigente) guardar(error ? (esTablaFaltante(error) ? 0 : null) : (count || 0)); })
      .catch(() => { if (vigente) guardar(null); });
    contar(
      supabase.from('tarea_entregas').select('id', { count: 'exact', head: true }).eq('estado', 'entregada'),
      (n) => setTareasPendientes(n || 0)
    );
    contar(
      supabase.from('solicitudes_inscripcion').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      setSolicitudesPendientes
    );
    return () => { vigente = false; };
  }, [activeTab]);

  // Student details modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  // Inscripciones reales del alumno abierto en el expediente. `null` = la
  // migración aún no corre y no hay de dónde leerlas.
  const [inscripcionesAlumno, setInscripcionesAlumno] = useState([]);
  const [inscribiendoAlumno, setInscribiendoAlumno] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSpecialtyFilter, setStudentSpecialtyFilter] = useState('');
  const [studentCountryFilter, setStudentCountryFilter] = useState('');

  // Refs to avoid stale closures in interval hooks
  const profilesRef = useRef([]);
  const coursesRef = useRef([]);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);
  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  // Add student manually state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Payments & Forms states
  const [activePaymentsSubTab, setActivePaymentsSubTab] = useState('stripe');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilterCourse, setPaymentFilterCourse] = useState('all');
  const [formSearch, setFormSearch] = useState('');
  const [formFilterType, setFormFilterType] = useState('all');
  const [selectedFormEntry, setSelectedFormEntry] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [paymentTimePeriod, setPaymentTimePeriod] = useState('all');
  const getStandardGatewayCourse = (courseName = '', amount = 0, currency = 'mxn') => {
    const name = (courseName || '').toLowerCase().trim();
    
    // Explicit string matches first
    if (name.includes('nurs') || name.includes('enfermería') || name.includes('enfermeria')) {
      return { id: 'ecmo_nursing', title: 'ECMO Nursing Care Course' };
    }
    if (name.includes('sim') || name.includes('realidad')) {
      return { id: 'ecmo_sim', title: 'ECMO SIM: Realidad Clínica' };
    }
    // Explicit Paris matches (excluding the generic 'inscripcion hce')
    if (name.includes('paris') || name.includes('parís') || name.includes('step 1') || name.includes('diploma internacional')) {
      return { id: 'ecmo_paris', title: 'Paris International Diploma in ECMO' };
    }

    // If it's the generic fallback 'inscripción hce' or similar, rely on amount & currency
    const isUsd = currency.toLowerCase() === 'usd';
    if (amount > 0) {
      if (isUsd) {
        // Nursing USD exact amounts (e.g. $5000 MXN / 17.5 = 285.71, $4250 MXN / 17.5 = 242.86)
        if (Math.abs(amount - 285.71) < 1 || Math.abs(amount - 242.86) < 1 || Math.abs(amount - 286) < 1) {
          return { id: 'ecmo_nursing', title: 'ECMO Nursing Care Course' };
        }
        // Sim USD exact amounts
        if (Math.abs(amount - 250) < 1 || Math.abs(amount - 200) < 1 || Math.abs(amount - 700) < 1) {
          return { id: 'ecmo_sim', title: 'ECMO SIM: Realidad Clínica' };
        }
      } else {
        // MXN logic
        if (amount === 4250 || amount === 4500 || amount === 5000) {
          // It's really hard to tell between ECMO Sim and Nursing for 4250/4500 MXN.
          // But most generic 4250/5000 MXN lately are Nursing because of the group discounts and active campaign.
          // Let's default these exact amounts to Nursing to fix the recent issues.
          return { id: 'ecmo_nursing', title: 'ECMO Nursing Care Course' };
        }
        if (amount < 5000) {
          return { id: 'ecmo_sim', title: 'ECMO SIM: Realidad Clínica' };
        }
        if (amount >= 5000 && amount <= 11000) {
          return { id: 'ecmo_nursing', title: 'ECMO Nursing Care Course' };
        }
        if (amount > 11000) {
          return { id: 'ecmo_paris', title: 'Paris International Diploma in ECMO' };
        }
      }
    }
    
    return { id: 'ecmo_paris', title: 'Paris International Diploma in ECMO' };
  };

  const filterMay2026Onwards = (list) => {
    const limit = new Date('2026-05-01T00:00:00Z').getTime();
    return list.filter(item => {
      const t = new Date(item.date).getTime();
      return !isNaN(t) && t >= limit;
    });
  };

  const mapItemToGatewayCourse = (item, type = 'payment') => {
    if (type === 'form') {
      let formId = item.formId;
      // Ids heredados de cuando el formulario se identificaba por programa.
      if (formId === 'ecmo_nursing') formId = 'xpqenabk';
      else if (formId === 'ecmo_sim') formId = 'xredqyol';
      else if (formId === 'ecmo_paris') formId = 'mnjlvbpw';

      // El nombre guardado en Supabase es el rótulo viejo ("Inscripciones Curso
      // Standard") y no dice de qué curso se trata. Se resuelve aquí para que
      // los registros antiguos también se muestren con el nombre real.
      let formName = FORM_LABELS[formId] || item.formName;

      // mnjlvbpw lo comparten la inscripción completa y la de "Sólo Step 1";
      // el tag del payload es lo único que las separa.
      if (formId === 'mnjlvbpw' && item.payload?.tag === 'ECMOParisStep12026') {
        formName = 'Paris ECMO — Sólo Step 1';
      }

      return {
        ...item,
        formId,
        formName
      };
    }
    // getStandardGatewayCourse adivina el programa por nombre y monto. Ese
    // heurístico solo sabe de los tres programas históricos, así que a los
    // cobros de CNADOT los reclasificaba por precio: $3,500 y $4,000 caían en
    // "ECMO SIM" y $6,000 en "Nursing", inflando esos números.
    //
    // Se filtra por courseId y NO por gateway a propósito: la segunda cuenta
    // también va a recibir los pagos en dólares de las experiencias, y esos sí
    // deben clasificarse como el programa que son. get-stripe-payments ya marca
    // 'cnadot' solo cuando el cobro no lo generó nuestro checkout.
    if (item.courseId === 'cnadot') {
      return item;
    }

    const name = item.courseName;
    const stdCourse = getStandardGatewayCourse(name, item.amount, item.currency);

    let finalTitle = stdCourse.title;
    if (item.extras) {
      const extArr = item.extras.split(',').map(e => e.trim());
      const extLabels = extArr.map(e => {
        if (e === 'ecmo_sim') return 'ECMO SIM';
        if (e === 'ecmo_nursing') return 'Nursing';
        return e;
      }).filter(Boolean).join(' + ');
      if (extLabels) {
        finalTitle += ` (+ ${extLabels})`;
      }
    }

    return {
      ...item,
      courseId: stdCourse.id,
      courseName: finalTitle
    };
  };

  const processAndFilterList = (list, type = 'payment') => {
    return filterMay2026Onwards(list).map(item => mapItemToGatewayCourse(item, type));
  };

  const [stripePayments, setStripePayments] = useState(() => {
    const saved = localStorage.getItem('admin_imported_stripe_payments');
    return saved ? processAndFilterList(JSON.parse(saved), 'payment') : [];
  });
  const [formSubmissions, setFormSubmissions] = useState(() => {
    const saved = localStorage.getItem('admin_imported_form_submissions');
    return saved ? processAndFilterList(JSON.parse(saved), 'form') : [];
  });
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentsError, setPaymentsError] = useState(null);
  const [loadingForms, setLoadingForms] = useState(true);
  const [paymentSortOrder, setPaymentSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [formSortOrder, setFormSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Simple CSV parser that handles double quotes
  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9 ]/g, '') // remove special chars
    );
    
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  };

  const mapCSVToPayments = (rows) => {
    return rows.map((row, index) => {
      const stdCourse = getStandardGatewayCourse(row['curso'] || row['coursename'] || 'Curso Genérico');
      return {
        id: row['id transaccion'] || row['id'] || `imported_stripe_${index}_${Math.random().toString(36).substring(2, 7)}`,
        studentName: row['alumno'] || row['studentname'] || 'Alumno Importado',
        studentEmail: row['email'] || row['studentemail'] || '',
        studentCountry: row['pais'] || row['studentcountry'] || 'Desconocido',
        courseName: stdCourse.title,
        courseId: stdCourse.id,
        amount: parseFloat(row['monto'] || row['amount'] || '0'),
        currency: row['moneda'] || row['currency'] || 'USD',
        status: row['estado'] || row['status'] || 'succeeded',
        date: row['fecha'] || row['date'] || new Date().toISOString(),
        method: row['metodo'] || row['method'] || 'Importado'
      };
    });
  };

  const mapCSVToForms = (rows) => {
    return rows.map((row, index) => {
      let payload = {};
      try {
        const rawPayload = row['datos'] || row['payload'];
        if (rawPayload) {
          payload = JSON.parse(rawPayload.replace(/""/g, '"'));
        }
      } catch (e) {
        console.warn('Could not parse payload JSON:', e);
      }
      return {
        id: row['id'] || `imported_form_${index}_${Math.random().toString(36).substring(2, 7)}`,
        formId: row['id formulario'] || row['formid'] || 'imported',
        formName: row['tipo formulario'] || row['formname'] || 'Formulario Importado',
        senderName: row['remitente'] || row['sendername'] || 'Remitente Importado',
        senderEmail: row['email'] || row['senderemail'] || '',
        date: row['fecha_envio'] || row['fecha'] || row['date'] || new Date().toISOString(),
        status: row['estado'] || row['status'] || 'Enviado',
        payload: Object.keys(payload).length > 0 ? payload : { raw: row['datos'] || '' }
      };
    });
  };

  const handleImportPayments = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let imported = [];
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          imported = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.csv')) {
          const parsedCSV = parseCSV(content);
          imported = mapCSVToPayments(parsedCSV);
        }
        
        const filteredImported = processAndFilterList(imported, 'payment');
        
        if (filteredImported.length > 0) {
          const merged = [...stripePayments];
          filteredImported.forEach(item => {
            if (!merged.some(m => m.id === item.id)) {
              merged.unshift(item);
            }
          });
          const processed = processAndFilterList(merged, 'payment');
          setStripePayments(processed);
          localStorage.setItem('admin_imported_stripe_payments', JSON.stringify(processed));
          showToast(`${filteredImported.length} transacciones importadas correctamente (Posteriores a Mayo 2026)`, 'success');
        } else {
          showToast('No se encontraron transacciones válidas posteriores a Mayo 2026', 'error');
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Error al importar archivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportForms = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let imported = [];
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          imported = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.csv')) {
          const parsedCSV = parseCSV(content);
          imported = mapCSVToForms(parsedCSV);
        }
        
        const filteredImported = processAndFilterList(imported, 'form');
        
        if (filteredImported.length > 0) {
          const merged = [...formSubmissions];
          filteredImported.forEach(item => {
            if (!merged.some(m => m.id === item.id)) {
              merged.unshift(item);
            }
          });
          const processed = processAndFilterList(merged, 'form');
          setFormSubmissions(processed);
          localStorage.setItem('admin_imported_form_submissions', JSON.stringify(processed));
          showToast(`${filteredImported.length} envíos de formularios importados correctamente (Posteriores a Mayo 2026)`, 'success');
        } else {
          showToast('No se encontraron formularios válidos posteriores a Mayo 2026', 'error');
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Error al importar archivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const fetchRealStripePayments = async () => {
    try {
      setLoadingPayments(true);
      // Los pagos solo se entregan a un administrador con sesión.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/get-stripe-payments', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      });
      if (!res.ok) {
        const detalle = await res.json().catch(() => ({}));
        throw new Error(detalle.error || (res.status === 401 || res.status === 403
          ? 'Tu sesión no tiene permiso para ver los pagos. Vuelve a iniciar sesión.'
          : 'No se pudieron cargar los pagos de Stripe.'));
      }
      const data = await res.json();
      const merged = [...stripePayments];
      if (data.payments && data.payments.length > 0) {
        data.payments.forEach(item => {
          const idx = merged.findIndex(m => m.id === item.id);
          if (idx !== -1) {
            // Update existing item with new data from API (in case courseName was corrected)
            merged[idx] = { ...merged[idx], ...item };
          } else {
            merged.unshift(item);
          }
        });
      }
      const processed = processAndFilterList(merged, 'payment');
      setStripePayments(processed);
      localStorage.setItem('admin_imported_stripe_payments', JSON.stringify(processed));
      setPaymentsError(null);
    } catch (err) {
      console.warn('Could not load real Stripe payments:', err.message);
      setPaymentsError(err.message);
      const processed = processAndFilterList(stripePayments, 'payment');
      setStripePayments(processed);
      localStorage.setItem('admin_imported_stripe_payments', JSON.stringify(processed));
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchRealFormSubmissions = async () => {
    try {
      setLoadingForms(true);
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const merged = [...formSubmissions];
      if (data && data.length > 0) {
        data.forEach(dbItem => {
          const item = {
            id: dbItem.id,
            formId: dbItem.form_id,
            formName: dbItem.form_name,
            senderName: dbItem.sender_name,
            senderEmail: dbItem.sender_email,
            date: dbItem.created_at,
            payload: dbItem.payload,
            status: 'procesado'
          };
          const idx = merged.findIndex(m => m.id === item.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...item };
          } else {
            merged.unshift(item);
          }
        });
      }

      const processed = processAndFilterList(merged, 'form');
      setFormSubmissions(processed);
      localStorage.setItem('admin_imported_form_submissions', JSON.stringify(processed));
    } catch (err) {
      console.warn('Could not load real form submissions:', err.message);
      const processed = processAndFilterList(formSubmissions, 'form');
      setFormSubmissions(processed);
      localStorage.setItem('admin_imported_form_submissions', JSON.stringify(processed));
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchRealStripePayments();
      fetchRealFormSubmissions();
    }
    // Refresh only when the tab opens; these functions intentionally use that render's snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const savedPayments = localStorage.getItem('admin_imported_stripe_payments');
    if (savedPayments) {
      const processed = processAndFilterList(JSON.parse(savedPayments), 'payment');
      localStorage.setItem('admin_imported_stripe_payments', JSON.stringify(processed));
    }
    const savedForms = localStorage.getItem('admin_imported_form_submissions');
    if (savedForms) {
      const processed = processAndFilterList(JSON.parse(savedForms), 'form');
      localStorage.setItem('admin_imported_form_submissions', JSON.stringify(processed));
    }
    // One-time cleanup of previously imported local data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El formulario ya no se guarda en localStorage: llevaba la contraseña.
  const [newStudentForm, setNewStudentForm] = useState(() => {
    try {
      localStorage.removeItem('adminNewStudentForm');
      localStorage.removeItem('adminNewAdminForm');
    } catch { /* sin almacenamiento */ }
    return {
      email: '',
      password: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      pais: '',
      estado: '',
      grado: '',
      especialidad: '',
      institucion: '',
      cargo: ''
    };
  });

  // Certificate template states (unused, commented out to avoid lint error)
  /*
  const [certTemplate, setCertTemplate] = useState({
    empresa: 'Healthcare Training Experience (HCE)',
    logoUrl: '/assets/componentes/firma-hce.png',
    firmaNombre1: 'Dr. Christian González',
    firmaCargo1: 'Director Académico HCE',
    firmaNombre2: 'Dra. Sofía Martínez',
    firmaCargo2: 'Coordinadora de Simulación',
    folioInicio: '1001',
    apariencia: 'Clinico Claro'
  });
  */

  // General Portal Settings
  const [portalSettings, setPortalSettings] = useState({
    logo: '/assets/componentes/ghghg-scaled.png',
    nombreEmpresa: 'HCE Latam',
    correoContacto: 'soporte@hce-latam.com',
    redesFacebook: 'https://facebook.com/hce',
    redesLinkedin: 'https://linkedin.com/company/hce',
    redesInstagram: 'https://instagram.com/hce',
    bienvenidaEstudiante: 'En Healthcare Training Experience seguimos redefiniendo la educación médica continua. ¡No esperes más! Ingresa al material que tenemos para ti.'
  });

  // Admin password update states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 800, height: 600 });

  // Statistics summaries
  const [stats, setStats] = useState({
    alumnosRegistrados: 0,
    cursosPublicados: 0,
    certificadosEmitidos: 0,
    cursosActivos: 0
  });

  // Local state for administrative actions
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    email: '',
    password: '',
    nombres: '',
    apellidos: ''
  });

  // Loading state
  const [actionLoading, setActionLoading] = useState(false);

  // Load registered profiles from Supabase profiles table
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      // En tandas: Supabase corta en 1,000 filas por petición.
      const data = await traerTodo(
        'profiles',
        '*',
        (q) => q.order('created_at', { ascending: false }).order('id'),
        { orden: 'id' }
      );
      setProfiles(data || []);
      setErrorPerfiles('');
      
      // Update statistics
      const studentsCount = (data || []).filter(p => p.rol === 'estudiante').length;
      setStats(prev => ({
        ...prev,
        alumnosRegistrados: studentsCount
      }));
    } catch (err) {
      console.error('Error fetching profiles:', err.message);
      setErrorPerfiles(err.message || 'Error de conexión');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchCertificates = async () => {
    setLoadingCertificates(true);
    try {
      const columnas = `
          id,
          folio,
          score,
          created_at,
          pdf_url,
          user_id,
          course_id,
          profiles:user_id (nombre_completo, email),
          courses:course_id (title)
        `;
      const ordenar = (q) => q.order('created_at', { ascending: false }).order('id');
      // vigente_hasta llega con la migración de vigencias; si aún no existe la
      // columna, se pide lo de siempre.
      let data;
      try {
        data = await traerTodo('certificates', `${columnas}, vigente_hasta`, ordenar, { orden: null });
      } catch (errVigencia) {
        if (!/vigente_hasta/i.test(errVigencia?.message || '')) throw errVigencia;
        data = await traerTodo('certificates', columnas, ordenar, { orden: null });
      }
      setCertificates(data || []);
    } catch (err) {
      console.error('Error fetching certificates:', err.message);
    } finally {
      setLoadingCertificates(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      // Las categorías cuentan los cursos recién cargados. Los perfiles y
      // webinars son independientes y no retrasan la lista de cursos.
      await Promise.allSettled([
        fetchProfiles(),
        fetchWebinars(),
        fetchCourses().then(() => fetchCategories()),
      ]);
    };
    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('webinars', JSON.stringify(webinars));
  }, [webinars]);

  useEffect(() => {
    // Alumnos también los necesita: el expediente muestra su historial.
    if (activeTab === 'certificates' || activeTab === 'reports' || activeTab === 'dashboard' || activeTab === 'students') {
      fetchCertificates();
    }
    if (activeTab === 'dashboard' || activeTab === 'reports') {
      fetchInscripcionesTodas();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'reports') return;
    fetchTrackingData();
    fetchDatosCertificables();
    // Solo el monitoreo en vivo se refresca solo, cada 3 minutos y con la
    // pestaña a la vista. Certificados e inscripciones se cargan al entrar:
    // recargarlos cada minuto eran decenas de consultas completas.
    const interval = setInterval(() => {
      if (document.hidden) return;
      void fetchTrackingData();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'facturacion') {
      const fetchFacturacion = async () => {
        setLoadingFacturacion(true);
        try {
          const { data, error } = await supabase
            .from('facturacion_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) setFacturacionReqs(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingFacturacion(false);
        }
      };
      fetchFacturacion();
    }
  }, [activeTab]);

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      certificadosEmitidos: certificates.length
    }));
  }, [certificates]);

  useEffect(() => {
    localStorage.setItem('courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    const activeCount = courses.filter(c => c.activo).length;
    setStats(prev => ({
      ...prev,
      cursosPublicados: activeCount,
      cursosActivos: activeCount
    }));
  }, [courses]);



  // El curso en edición y los formularios de alta ya no se copian a
  // localStorage (llevaban contraseñas y copias viejas de cursos); se limpia
  // lo que haya quedado de antes.
  useEffect(() => {
    try {
      ['adminEditingCourse', 'adminCourseForm', 'adminShowAddStudentModal', 'adminShowAddAdminModal']
        .forEach((clave) => localStorage.removeItem(clave));
    } catch { /* sin almacenamiento */ }
  }, []);


  // Export certificates report as CSV (opens in Excel)
  const handleExportExcel = () => {
    const rows = [
      ['Folio', 'Alumno', 'Correo', 'Curso', 'Calificación (%)', 'Fecha de Emisión', 'Vigente hasta']
    ];
    certificates.forEach(cert => {
      const studentName = cert.profiles?.nombre_completo || cert.profiles?.email || 'Alumno';
      const studentEmail = cert.profiles?.email || '';
      const courseTitle = cert.courses?.title || 'Curso';
      const emitted = new Date(cert.created_at).toLocaleDateString('es-MX');
      rows.push([cert.folio || '', studentName, studentEmail, courseTitle, cert.score ?? '', emitted, textoVigencia(cert)]);
    });
    const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF'; // UTF-8 BOM so Excel shows accents correctly
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_HCE_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export report as PDF using browser print
  // Export report as PDF using browser print
  const handleExportPDF = (data) => {
    const now = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const stats = data || {};
    const studentProfiles = stats.studentProfiles || [];
    const activeCount = stats.activeCount || 0;
    const completedCount = stats.completedCount || 0;
    const approvalRate = stats.approvalRate || 0;
    const retentionRanked = stats.retentionRanked || [];
    const abandonmentRanked = stats.abandonmentRanked || [];
    const liveConnected = stats.liveConnected || [];
    const courseStatsList = stats.courseStatsList || [];
    const certs = stats.certificates || [];
    const webs = stats.webinars || [];
    const countriesDisplay = stats.countriesDisplay || [];
    const alertsList = stats.alertsList || [];
    const studentTrackingList = stats.studentTrackingList || [];
    const formatDuration = stats.formatDuration || ((s) => `${Math.floor(s/3600)}h`);

    // Section 1: Retention & Abandonment
    const retentionRows = retentionRanked.map(c => `
      <tr>
        <td style="font-weight:600">${escaparHtml(c.title)}</td>
        <td style="text-align:center">${c.enrolled}</td>
        <td style="text-align:center">${c.retentionRate}%</td>
        <td style="text-align:center">${c.abandonmentRate}%</td>
        <td style="text-align:right">${formatDuration(c.avgTimeSpent)}</td>
      </tr>
    `).join('');

    const abandonmentRows = abandonmentRanked.map(c => `
      <tr>
        <td style="font-weight:600">${escaparHtml(c.title)}</td>
        <td style="text-align:center">${c.enrolled}</td>
        <td style="text-align:center">${c.abandoned}</td>
        <td style="text-align:center">${c.abandonmentRate}%</td>
        <td style="text-align:center">${c.retentionRate}%</td>
      </tr>
    `).join('');

    // Section 2: Connected Real-time
    const liveConnectedRows = liveConnected.length === 0
      ? '<tr><td colspan="4" style="text-align:center;padding:15px;color:#64748b">No hay alumnos conectados en vivo en este momento.</td></tr>'
      : liveConnected.map(student => `
      <tr>
        <td style="font-weight:600">${escaparHtml(student.nombre_completo || student.email)}</td>
        <td style="text-align:center">${formatDuration(student.activity?.session_duration || 0)}</td>
        <td style="text-align:center">${escaparHtml(student.activity?.current_action || '-')}</td>
        <td style="text-align:center">${escaparHtml(student.pais || '-')}</td>
      </tr>
    `).join('');

    // Section 3: Detailed performance by course
    const courseStatsRows = courseStatsList.map(c => `
      <tr>
        <td style="font-weight:600">${escaparHtml(c.title)}</td>
        <td style="text-align:center">${c.enrolled}</td>
        <td style="text-align:center">${c.active}</td>
        <td style="text-align:center">${c.completed}</td>
        <td style="text-align:center">${c.failed}</td>
        <td style="text-align:center">${c.avgProgress}%</td>
        <td style="text-align:center">${c.retentionRate}%</td>
      </tr>
    `).join('');

    // Section 4: Certificates
    const certRows = certs.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:15px;color:#64748b">Sin certificados emitidos.</td></tr>'
      : certs.map(cert => {
      const name = cert.profiles?.nombre_completo || cert.profiles?.email || 'Alumno';
      const courseTitle = cert.courses?.title || 'Curso';
      const emitted = new Date(cert.created_at).toLocaleDateString('es-MX');
      const expires = textoVigencia(cert);
      const vencido = cert.vigente_hasta && new Date(cert.vigente_hasta) < new Date();
      return `<tr>
        <td>${escaparHtml(cert.folio || '-')}</td>
        <td>${escaparHtml(name)}</td>
        <td>${escaparHtml(courseTitle)}</td>
        <td style="text-align:center">${cert.score ?? 0}%</td>
        <td style="text-align:center">${emitted}</td>
        <td style="text-align:center;${vencido ? 'color:#dc2626' : ''}">${expires}</td>
      </tr>`;
    }).join('');

    // Section 5: Webinars. Solo se listan los datos registrados del webinar.
    // No hay tabla de asistencia en la base de datos, por lo que no se reportan
    // registrados / presentes / ausentes / permanencia / participación.
    const webinarRows = webs.length === 0
      ? '<tr><td colspan="4" style="text-align:center;padding:15px;color:#64748b">No hay webinars registrados.</td></tr>'
      : webs.map(w => `
        <tr>
          <td style="font-weight:600">${escaparHtml(w.title)}</td>
          <td style="text-align:center">${escaparHtml(w.date || 'Sin fecha')}</td>
          <td style="text-align:center">${escaparHtml(w.time || '-')}</td>
          <td style="text-align:right">${w.activo ? 'Activo' : 'Inactivo'}</td>
        </tr>
      `).join('');

    const countryRows = countriesDisplay.length === 0
      ? '<tr><td colspan="3" style="text-align:center;padding:15px;color:#64748b">No hay datos geográficos registrados.</td></tr>'
      : countriesDisplay.map(country => `
      <tr>
        <td style="font-weight:600">${escaparHtml(country.name)}</td>
        <td>${country.count} alumnos</td>
        <td style="text-align:right;font-weight:700;color:#00bcd4">${country.percent}%</td>
      </tr>
    `).join('');

    // Section 7: Alerts
    const alertHtmlItems = alertsList.map(alert => `
      <div class="alert-item ${alert.type || 'info'}">
        <strong>${(alert.type || 'info').toUpperCase()}:</strong> ${escaparHtml(alert.text)}
      </div>
    `).join('');

    // Section 8: Rankings
    const rankingRows = studentTrackingList.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:15px;color:#64748b">No hay alumnos registrados.</td></tr>'
      : [...studentTrackingList]
      .map(s => {
        const totalTime = s.progressList.reduce((acc, p) => acc + (p.timeSpent || 0), 0);
        const enrolled = s.progressList.filter(p => p.watchPercent > 0).length;
        const completed = s.progressList.filter(p => p.completed).length;
        return { ...s, totalTime, enrolled, completed };
      })
      .sort((a, b) => b.totalTime - a.totalTime)
      .map((student, index) => `
        <tr>
          <td style="font-weight:bold;text-align:center">#${index + 1}</td>
          <td style="font-weight:600">${escaparHtml(student.nombre_completo || student.email)}</td>
          <td>${escaparHtml(student.pais || 'México')}</td>
          <td style="text-align:center">${student.enrolled} cursos</td>
          <td style="text-align:center">${student.completed} completados</td>
          <td style="font-weight:bold;text-align:right;color:#00bcd4">${formatDuration(student.totalTime)}</td>
        </tr>
      `).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte HCE Académico Integrado - ${now}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; font-size:12px; line-height: 1.4; background:#fff; }
    .page-break { page-break-after: always; }
    
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #00bcd4; padding-bottom:16px; margin-bottom:24px; }
    .header h1 { font-size:20px; font-weight:700; color:#0f172a; }
    .header p { font-size:11px; color:#64748b; margin-top:4px; }
    .logo-text { font-size:22px; font-weight:900; color:#00bcd4; letter-spacing:-0.5px; }
    
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 14px 0; }
    
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
    .kpi span { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; }
    .kpi h2 { font-size:24px; color:#00bcd4; font-weight:800; margin-top:4px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    
    table { width:100%; border-collapse:collapse; margin-bottom: 20px; }
    thead { background:#0f172a; color:#fff; }
    th { padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
    td { padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; }
    tr:nth-child(even) td { background:#f8fafc; }
    
    .alert-item { padding: 10px; border-radius: 6px; margin-bottom: 8px; font-size: 11px; border-left: 4px solid #94a3b8; }
    .alert-item.danger { background: #fef2f2; border-left-color: #ef4444; color: #991b1b; }
    .alert-item.warning { background: #fffbeb; border-left-color: #f59e0b; color: #92400e; }
    .alert-item.info { background: #eff6ff; border-left-color: #3b82f6; color: #1e40af; }
    
    .footer { margin-top:32px; text-align:center; font-size:10px; color:#94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <!-- PAGE 1: RESUMEN GENERAL -->
  <div class="page-break">
    <div class="header">
      <div>
        <div class="logo-text">HCE</div>
        <h1>Reporte Académico Integrado</h1>
        <p>Healthcare Training Experience | Generado el ${now}</p>
      </div>
    </div>
    
    <div class="kpi-row">
      <div class="kpi"><span>Alumnos Inscritos</span><h2>${studentProfiles.length}</h2></div>
      <div class="kpi"><span>Alumnos Activos (Semana)</span><h2>${activeCount}</h2></div>
      <div class="kpi"><span>Cursos Completados</span><h2>${completedCount}</h2></div>
      <div class="kpi"><span>Tasa de Finalización</span><h2>${approvalRate}%</h2></div>
    </div>
    
    <div class="grid-2">
      <div>
        <div class="section-title">🏆 Cursos con Mayor Retención</div>
        <table>
          <thead>
            <tr><th>Curso</th><th style="text-align:center">Inscritos</th><th style="text-align:center">Retención</th><th style="text-align:center">Abandono</th><th style="text-align:right">Tiempo Prom.</th></tr>
          </thead>
          <tbody>
            ${retentionRows || '<tr><td colspan="5" style="text-align:center;color:#64748b">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>
      <div>
        <div class="section-title">⚠️ Cursos con Mayor Abandono</div>
        <p style="font-size:9px;color:#64748b;margin:-8px 0 10px 0">Curso iniciado, sin terminar, avance menor a 80% y sin actividad en la plataforma desde hace ${ABANDONMENT_INACTIVE_DAYS}+ días.</p>
        <table>
          <thead>
            <tr><th>Curso</th><th style="text-align:center">Inscritos</th><th style="text-align:center">Abandonos</th><th style="text-align:center">Abandono</th><th style="text-align:center">Retención</th></tr>
          </thead>
          <tbody>
            ${abandonmentRows || '<tr><td colspan="5" style="text-align:center;color:#64748b">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- PAGE 2: MONITOREO EN VIVO & RENDIMIENTO DETALLADO -->
  <div class="page-break">
    <div class="section-title">🟢 Alumnos Conectados en Tiempo Real</div>
    <table>
      <thead>
        <tr><th>Alumno</th><th style="text-align:center">Tiempo acumulado en plataforma</th><th style="text-align:center">Acción Actual</th><th style="text-align:center">País</th></tr>
      </thead>
      <tbody>
        ${liveConnectedRows}
      </tbody>
    </table>

    <div class="section-title">🎓 Rendimiento Detallado por Curso</div>
    <table>
      <thead>
        <tr><th>Curso</th><th style="text-align:center">Inscritos</th><th style="text-align:center">Activos (7d)</th><th style="text-align:center">Completados</th><th style="text-align:center">Casi terminados</th><th style="text-align:center">Avance Prom.</th><th style="text-align:center">Tasa Finalización</th></tr>
      </thead>
      <tbody>
        ${courseStatsRows}
      </tbody>
    </table>
  </div>

  <!-- PAGE 3: CERTIFICACIONES Y WEBINARS -->
  <div class="page-break">
    <div class="section-title">🏆 Registro de Certificados Emitidos</div>
    <table>
      <thead>
        <tr><th>Folio</th><th>Alumno</th><th>Curso</th><th style="text-align:center">Calificación</th><th style="text-align:center">Emisión</th><th style="text-align:center">Vigente hasta</th></tr>
      </thead>
      <tbody>
        ${certRows}
      </tbody>
    </table>

    <div class="section-title">📹 Webinars de Especialización</div>
    <table>
      <thead>
        <tr><th>Webinar</th><th style="text-align:center">Fecha</th><th style="text-align:center">Horario</th><th style="text-align:right">Estado</th></tr>
      </thead>
      <tbody>
        ${webinarRows}
      </tbody>
    </table>
  </div>

  <!-- PAGE 4: USO DE PLATAFORMA & ALERTAS -->
  <div class="page-break">
    <div class="section-title">🌎 Ubicación Geográfica de Alumnos</div>
    <table>
      <thead>
        <tr><th>País</th><th>Número de Alumnos</th><th style="text-align:right">Porcentaje</th></tr>
      </thead>
      <tbody>
        ${countryRows}
      </tbody>
    </table>

    <div class="section-title">🚨 Alertas y Cumplimiento</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${alertHtmlItems}
    </div>
  </div>

  <!-- PAGE 5: RANKINGS Y RENDIMIENTO GLOBAL -->
  <div>
    <div class="section-title">🏆 Ranking de Alumnos por Tiempo de Estudio</div>
    <table>
      <thead>
        <tr><th style="text-align:center">Rank</th><th>Alumno</th><th>País</th><th style="text-align:center">Cursos Inscritos</th><th style="text-align:center">Completados</th><th style="text-align:right">Tiempo Total de Estudio</th></tr>
      </thead>
      <tbody>
        ${rankingRows}
      </tbody>
    </table>
    
    <div class="footer">HCE Portal Académico — Reporte Académico Integrado — Generado automáticamente</div>
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  const handleLogout = async () => {
    if (!permitirSalidaCurso()) return;
    try {
      await logout();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      navigate('/login');
    }
  };

  // El mensaje de bienvenida vive en portal_config para que lo vean todos los
  // alumnos (antes solo quedaba en el navegador del administrador).
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);
  const [faltaPortalConfig, setFaltaPortalConfig] = useState(false);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    let vigente = true;
    supabase
      .from('portal_config')
      .select('valor')
      .eq('clave', 'mensaje_bienvenida')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error) {
          if (esTablaFaltante(error)) setFaltaPortalConfig(true);
          else console.warn('No se pudo leer el mensaje de bienvenida:', error.message);
          return;
        }
        setFaltaPortalConfig(false);
        if (typeof data?.valor?.texto === 'string') {
          setPortalSettings((prev) => ({ ...prev, bienvenidaEstudiante: data.valor.texto }));
        }
      });
    return () => { vigente = false; };
  }, [activeTab]);

  const handleSaveWelcomeMessage = async (e) => {
    e.preventDefault();
    setGuardandoBienvenida(true);
    try {
      const { error } = await supabase
        .from('portal_config')
        .upsert({
          clave: 'mensaje_bienvenida',
          valor: { texto: portalSettings.bienvenidaEstudiante },
          actualizado_en: new Date().toISOString()
        }, { onConflict: 'clave' });
      if (error) {
        if (esTablaFaltante(error)) {
          setFaltaPortalConfig(true);
          throw new Error('Falta correr la migración endurecimiento.sql en Supabase para guardar el mensaje.');
        }
        throw error;
      }
      setFaltaPortalConfig(false);
      showToast('¡Mensaje de bienvenida de estudiantes actualizado con éxito!', 'success');
    } catch (err) {
      showToast(err.message || 'No se pudo guardar el mensaje de bienvenida.', 'error');
    } finally {
      setGuardandoBienvenida(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    setUpdatePasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('¡Contraseña actualizada con éxito!', 'success');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      showToast(err.message || 'Error al actualizar la contraseña.', 'error');
    } finally {
      setUpdatePasswordLoading(false);
    }
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard de Admin';
      case 'courses': return 'Gestión de Cursos';
      case 'students': return 'Directorio de Alumnos';
      case 'certificates': return 'Certificados';
      case 'categories': return 'Categorías';
      case 'webinars': return 'Webinars';
      case 'reports': return 'Reportes Académicos';
      case 'metricas': return 'Métricas de Cursos';
      case 'tareas': return 'Tareas';
      case 'grupos': return 'Grupos';
      case 'notificaciones': return 'Notificaciones';
      case 'mensajes': return 'Mensajes';
      case 'divisiones': return 'Divisiones';
      case 'payments': return 'Pagos y Formularios';
      case 'facturacion': return 'Facturación';
      case 'alumni': return 'Alumni Pass · Step 1 Refresher';
      case 'admins': return 'Administradores';
      case 'settings': return 'Configuración General';
      case 'ayuda': return 'Guía de uso';
      default: return 'Portal HCE Admin';
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: dbCourses, error } = await supabase
        .from('courses')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      
      // Las respuestas correctas ya no son legibles desde el navegador; el
      // administrador las obtiene por una función que verifica su rol. Antes de
      // la migración esa función no existe y se leen como siempre.
      let { data: allQuestions, error: questionsError } = await supabase.rpc('preguntas_admin');
      if (questionsError) {
        ({ data: allQuestions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .order('id', { ascending: true }));
      }
      if (questionsError) throw questionsError;

      const questionsByCourse = (allQuestions || []).reduce((grouped, question) => {
        if (!grouped[question.course_id]) grouped[question.course_id] = [];
        grouped[question.course_id].push(question);
        return grouped;
      }, {});

      // El video vive en su tabla protegida; el administrador la lee completa.
      // Antes de la migración no existe y se usa el campo viejo del curso.
      let videosPorCurso = {};
      const { data: contenidos, error: contenidoError } = await supabase
        .from('curso_contenido')
        .select('course_id, youtube_video_id');
      if (!contenidoError) {
        videosPorCurso = Object.fromEntries((contenidos || []).map(f => [f.course_id, f.youtube_video_id]));
      }

      const coursesWithQuestions = (dbCourses || []).map((c) => {
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          duracion: c.duracion,
          modalidad: c.modalidad,
          requisitos: c.requisitos,
          image: c.image_url,
          link: c.link || '',
          youtube_video_id: videosPorCurso[c.id] || c.youtube_video_id,
          certificado_template_url: c.certificado_template_url,
          certificado_x: c.certificado_x,
          certificado_y: c.certificado_y,
          certificado_font_size: c.certificado_font_size,
          minAprobacion: c.min_aprobacion,
          activo: c.activo,
          category_id: c.category_id,
          tipo: c.tipo || 'gratis',
          precio_mxn: c.precio_mxn,
          vigencia_meses: c.vigencia_meses ?? null,
          questions: questionsByCourse[c.id] || []
        };
      });
      setErrorCursos('');
      if (dbCourses && dbCourses.length > 0) {
        setCourses(coursesWithQuestions);
        localStorage.setItem('courses', JSON.stringify(coursesWithQuestions));
      } else {
        const saved = localStorage.getItem('courses');
        setCourses(saved ? JSON.parse(saved) : []);
      }
    } catch (err) {
      console.error('Error fetching courses from Supabase:', err.message);
      setErrorCursos(err.message || 'Error de conexión');
      const saved = localStorage.getItem('courses');
      setCourses(saved ? JSON.parse(saved) : []);
    } finally {
      setCursosCargados(true);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: dbCats, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      
      // Calculate link count for each category in-memory using latest courses
      const savedCourses = localStorage.getItem('courses');
      const latestCourses = savedCourses ? JSON.parse(savedCourses) : [];
      const catsWithCounts = (dbCats || []).map(cat => {
        const count = latestCourses.filter(c => c.category_id === cat.id).length;
        return {
          id: cat.id,
          name: cat.name,
          count: count
        };
      });

      setCategories(catsWithCounts);
      localStorage.setItem('categories', JSON.stringify(catsWithCounts));
    } catch (err) {
      console.warn('Error fetching categories from Supabase:', err.message);
      const saved = localStorage.getItem('categories');
      setCategories(saved ? JSON.parse(saved) : []);
    }
  };

  // Lleva el editor a la vista (arriba de la sección de cursos).
  const courseFormRef = useRef(null);
  const mostrarFormularioCurso = () => {
    setTimeout(() => courseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Deja el editor listo con un formulario y su huella "guardada".
  const prepararEditorCurso = (curso, formulario, pestana) => {
    const inicial = pestana || pestanaInicialCurso(!!curso);
    setEditingCourse(curso);
    setCourseForm(formulario);
    setFirmaCursoGuardada(firmaCurso(formulario));
    setPestanaCurso(inicial);
    setPestanasCursoVisitadas([inicial]);
    setEstadoGuardadoCurso('idle');
    setIntentoGuardarCurso(false);
    setCamposCursoTocados({});
    setShowCourseForm(true);
    mostrarFormularioCurso();
  };

  const formularioCursoNuevo = () => ({
    title: '',
    description: '',
    duracion: '',
    modalidad: 'Online',
    requisitos: '',
    image: '',
    link: '',
    minAprobacion: 80,
    // Un curso nuevo nace como borrador: los alumnos no lo ven hasta activarlo.
    activo: false,
    youtube_video_id: '',
    certificado_template_url: '',
    certificado_x: 300,
    certificado_y: 400,
    certificado_font_size: 40,
    category_id: '',
    tipo: 'gratis',
    precio_mxn: '',
    vigencia_meses: '',
    questions: []
  });

  const handleOpenCourseCreate = () => {
    if (!permitirSalidaCurso()) return;
    prepararEditorCurso(null, formularioCursoNuevo());
  };

  const abrirCursoEnEditor = (course, pestana) => {
    prepararEditorCurso(course, {
      title: course.title,
      description: course.description,
      duracion: course.duracion,
      modalidad: course.modalidad,
      requisitos: course.requisitos,
      image: course.image,
      link: course.link || '',
      minAprobacion: course.minAprobacion ?? 80,
      activo: course.activo !== false,
      youtube_video_id: course.youtube_video_id || '',
      certificado_template_url: course.certificado_template_url || '',
      certificado_x: course.certificado_x ?? 300,
      certificado_y: course.certificado_y ?? 400,
      certificado_font_size: course.certificado_font_size ?? 40,
      category_id: course.category_id || '',
      tipo: course.tipo || 'gratis',
      precio_mxn: course.precio_mxn ?? '',
      vigencia_meses: course.vigencia_meses ?? '',
      // Copia profunda: editar una pregunta no debe tocar la lista de cursos
      // hasta que se guarde.
      questions: (course.questions || []).map(q => ({ ...q, options: [...(q.options || [])] }))
    }, pestana);
  };

  const handleOpenCourseEdit = (course) => {
    if (!permitirSalidaCurso()) return;
    abrirCursoEnEditor(course);
  };

  // Cierra el editor sin preguntar (quien llama ya confirmó si hacía falta).
  const cerrarEditorCurso = () => {
    setShowCourseForm(false);
    setEditingCourse(null);
    const limpio = { ...formularioCursoNuevo(), activo: true };
    setCourseForm(limpio);
    setFirmaCursoGuardada(firmaCurso(limpio));
    cambiosCursoRef.current.formulario = false;
    setEstadoGuardadoCurso('idle');
    setIntentoGuardarCurso(false);
    setCamposCursoTocados({});
    try {
      localStorage.removeItem('adminShowCourseForm');
      localStorage.removeItem('adminEditingCourse');
      localStorage.removeItem('adminCourseForm');
    } catch { /* sin almacenamiento */ }
  };

  const handleCloseCourseForm = () => {
    if (!permitirSalidaCurso()) return;
    cerrarEditorCurso();
  };

  // Cambia de pestaña dentro del editor. Las de contenido (lecciones, reglas…)
  // necesitan que el curso ya exista.
  const cambiarPestanaCurso = (id) => {
    const pestana = PESTANAS_CURSO.find((p) => p.id === id);
    if (!pestana) return;
    if (pestana.requiereGuardado && !(editingCourse?.id && !isNaN(Number(editingCourse.id)))) return;
    setPestanaCurso(id);
    setPestanasCursoVisitadas((prev) => (prev.includes(id) ? prev : [...prev, id]));
    recordarPestanaCurso(id);
    // Al volver de Lecciones o Reglas el checklist se actualiza (no en cada pestaña).
    if (['lecciones', 'reglas'].includes(pestanaCurso)) setRecargaChecklist((n) => n + 1);
  };

  // Desde el panel inicial: abre un curso directo en una pestaña.
  const abrirCursoDesdePanel = (courseId, pestana) => {
    const course = courses.find((c) => Number(c.id) === Number(courseId));
    if (!course) { setActiveTab('courses'); return; }
    if (!permitirSalidaCurso()) return;
    setActiveTabState('courses');
    try { localStorage.setItem('adminActiveTab', 'courses'); } catch { /* sin almacenamiento */ }
    abrirCursoEnEditor(course, pestana);
  };

  const handleCloseAddStudentModal = () => {
    setShowAddStudentModal(false);
    setNewStudentForm({
      email: '',
      password: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      pais: '',
      estado: '',
      grado: '',
      especialidad: '',
      institucion: '',
      cargo: ''
    });
    localStorage.removeItem('adminShowAddStudentModal');
    localStorage.removeItem('adminNewStudentForm');
  };

  const handleCloseAddAdminModal = () => {
    setShowAddAdminModal(false);
    setNewAdminForm({
      email: '',
      password: '',
      nombres: '',
      apellidos: ''
    });
    localStorage.removeItem('adminShowAddAdminModal');
    localStorage.removeItem('adminNewAdminForm');
  };

  const handleCertificateTemplateChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setActionLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      setCourseForm(prev => ({
        ...prev,
        certificado_template_url: publicUrl
      }));
      showToast('Plantilla de certificado subida correctamente.', 'success');
    } catch (err) {
      showToast(`No se pudo subir la plantilla: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Portada propia del curso. Obligatoria en los de pago (ver handleSaveCourse).
  const handleCoursePortadaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('La portada tiene que ser una imagen (PNG, JPG o WebP).', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('La portada supera los 3 MB permitidos.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const extension = file.name.split('.').pop();
      const ruta = `cursos/portadas/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('certificates').upload(ruta, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(ruta);
      setCourseForm(prev => ({ ...prev, image: publicUrl }));
      showToast('Portada subida.', 'success');
    } catch (err) {
      showToast(`No se pudo subir la portada: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    const esDePago = courseForm.tipo === 'pago';
    const precio = Number(courseForm.precio_mxn);

    if (esDePago && !(precio > 0)) {
      showToast('Un curso de pago necesita un precio mayor a cero.', 'error');
      return;
    }

    const minAprobacion = Number(courseForm.minAprobacion);
    if (!Number.isFinite(minAprobacion) || minAprobacion < 0 || minAprobacion > 100) {
      showToast('El porcentaje mínimo de aprobación debe estar entre 0 y 100.', 'error');
      return;
    }
    const preguntaInvalida = (courseForm.questions || []).find((q) => !q.question_text?.trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.some((o) => !String(o).trim()) || !Number.isInteger(Number(q.correct_option_index)) || Number(q.correct_option_index) < 0 || Number(q.correct_option_index) >= q.options.length);
    if (preguntaInvalida) { showToast('Revisa las preguntas: necesitan texto, opciones completas y una respuesta correcta válida.', 'error'); return; }

    // La miniatura de YouTube lleva el ID del video en su dirección, y la
    // portada es pública: con ella cualquiera vería el curso sin pagar.
    if (esDePago && esMiniaturaYoutube(courseForm.image)) {
      showToast('Los cursos de pago necesitan una portada propia: la miniatura de YouTube deja ver el video sin pagar. Sube una imagen.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const dbData = {
        title: courseForm.title,
        description: courseForm.description,
        duracion: courseForm.duracion,
        modalidad: courseForm.modalidad,
        requisitos: courseForm.requisitos,
        image_url: courseForm.image || '',
        link: courseForm.link || '',
        certificado_template_url: courseForm.certificado_template_url || '',
        // `??` y no `||`: una posición 0 es válida.
        certificado_x: courseForm.certificado_x ?? 300,
        certificado_y: courseForm.certificado_y ?? 400,
        certificado_font_size: courseForm.certificado_font_size ?? 40,
        min_aprobacion: minAprobacion,
        category_id: courseForm.category_id || null
      };

      const isMockId = !editingCourse || isNaN(Number(editingCourse.id));

      // Activo/Inactivo se cambia desde la tabla; al editar no se toca. Un
      // curso nuevo se crea inactivo (borrador).
      const escribirCurso = async (payload) => {
        if (editingCourse && !isMockId) {
          const { data, error } = await supabase
            .from('courses')
            .update(payload)
            .eq('id', Number(editingCourse.id))
            .select();
          if (error) throw error;
          if (data && data.length > 0) return data[0].id;
          throw new Error('No se actualizó ningún curso: puede que ya no exista o que tu sesión no tenga permiso.');
        }
        const { data, error } = await supabase
          .from('courses')
          .insert([{ ...payload, activo: false }])
          .select();
        if (error) throw error;
        return data[0].id;
      };

      // Los campos se agregaron en dos migraciones distintas (acceso y precio
      // primero, vigencia después). Se intenta con todo y, si Supabase no
      // conoce alguna columna, se va quitando solo lo que falta: así un curso
      // de pago no pierde su precio porque aún no exista la vigencia.
      const acceso = { tipo: esDePago ? 'pago' : 'gratis', precio_mxn: esDePago ? precio : null };
      const vigencia = { vigencia_meses: Number(courseForm.vigencia_meses) > 0 ? Number(courseForm.vigencia_meses) : null };
      const columnaFaltante = (err) => /could not find the '.*' column|column .* does not exist/i.test(err?.message || '');

      let courseId = null;
      for (const intento of [{ ...dbData, ...acceso, ...vigencia }, { ...dbData, ...acceso }, dbData]) {
        try {
          if (intento === dbData && esDePago) throw new Error('Falta la migración cursos-inscripciones.sql para guardar el precio y acceso del curso de pago.');
          courseId = await escribirCurso(intento);
          break;
        } catch (err) {
          if (Number(courseForm.vigencia_meses) > 0 && /vigencia_meses/i.test(err?.message || '')) throw new Error('Falta la migración lms-estructura.sql para guardar la vigencia del certificado.');
          if (!columnaFaltante(err) || intento === dbData) throw err;
        }
      }

      // Si el curso nuevo ya existe y algo de abajo falla, reintentar debe
      // editarlo y no crear un duplicado.
      if (!editingCourse && courseId) {
        setEditingCourse({ ...courseForm, activo: false, id: courseId });
      }

      if (courseId) {
        // Primero se guardan todas las preguntas. Borrar antes de insertar
        // dejaba el examen vacío si fallaba una petición.
        const existentes = await traerTodo('questions', 'id', (q) => q.eq('course_id', courseId));
        const idsExistentes = new Set(existentes.map((q) => q.id));
        const idsGuardados = [];
        for (const [indice, q] of (courseForm.questions || []).entries()) {
          const pregunta = {
            course_id: courseId,
            question_text: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index
          };
          const { data, error } = idsExistentes.has(q.id)
            ? await supabase.from('questions').update(pregunta).eq('id', q.id).eq('course_id', courseId).select('id').single()
            : await supabase.from('questions').insert([pregunta]).select('id').single();
          if (error) throw new Error(`El curso se guardó, pero el examen quedó pendiente: ${error.message}. Conservamos las preguntas anteriores; vuelve a guardar para terminar.`);
          idsGuardados.push(data.id);
          // El reintento actualiza lo ya insertado y no lo duplica.
          setCourseForm((actual) => ({ ...actual, questions: actual.questions.map((item, i) => i === indice ? { ...item, id: data.id } : item) }));
        }
        const eliminar = existentes.map((q) => q.id).filter((id) => !idsGuardados.includes(id));
        if (eliminar.length) {
          const { error } = await supabase.from('questions').delete().eq('course_id', courseId).in('id', eliminar);
          if (error) throw new Error(`Las preguntas se guardaron, pero no se quitaron las anteriores: ${error.message}`);
        }
      }

      await fetchCourses();
      if (!editingCourse && courseId) {
        setCourseForm(prev => ({ ...prev, activo: false }));
        showToast('Curso creado como borrador. Ya puedes agregarle lecciones, reglas y archivos en sus pestañas.', 'success');
        return true;
      }
      // El editor se queda abierto (por pestañas): se sigue trabajando en el
      // mismo curso sin tener que volver a buscarlo.
      showToast('Curso actualizado correctamente', 'success');
      return true;
    } catch (err) {
      // Sin guardado "local": se muestra el error real y el formulario queda
      // abierto con lo que se escribió para poder reintentar.
      console.error('Error saving course:', err.message);
      showAlert(`No se pudo guardar el curso: ${err.message}`, 'Error al guardar');
    } finally {
      setActionLoading(false);
    }
  };

  // Copia el curso con sus lecciones, exámenes, reglas y biblioteca; queda
  // inactivo para revisarlo antes de publicarlo.
  const handleClonarCourse = async (course) => {
    if (!(await showConfirm(`¿Clonar "${course.title}"? Se crea una copia inactiva con sus lecciones, exámenes, reglas y archivos (sin alumnos).`, 'Clonar curso'))) return;
    try {
      const r = await llamarClonar('clonar', { courseId: course.id });
      await fetchCourses();
      showToast(`Curso clonado con ${r.lecciones} lecciones. Quedó inactivo como "${course.title} (copia)".`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Cuenta filas de una tabla para un curso. `null` si la tabla aún no existe.
  const contarDeCurso = async (tabla, courseId) => {
    const { count, error } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (error) {
      if (esTablaFaltante(error)) return null;
      throw error;
    }
    return count || 0;
  };

  // Un curso con alumnos o certificados no se borra: se perdería su historial.
  // Para esos casos está Inactivar.
  const handleDeleteCourse = async (courseId) => {
    const course = courses.find(c => c.id === courseId);
    const titulo = course?.title || 'este curso';
    let inscritos;
    let emitidos;
    try {
      [inscritos, emitidos] = await Promise.all([
        contarDeCurso('inscripciones', courseId),
        contarDeCurso('certificates', courseId)
      ]);
    } catch (err) {
      showToast(`No se pudo revisar si el curso tiene alumnos: ${err.message}`, 'error');
      return;
    }

    if ((inscritos || 0) > 0 || (emitidos || 0) > 0) {
      const partes = [];
      if (inscritos > 0) partes.push(`${inscritos} ${inscritos === 1 ? 'alumno inscrito' : 'alumnos inscritos'}`);
      if (emitidos > 0) partes.push(`${emitidos} ${emitidos === 1 ? 'certificado emitido' : 'certificados emitidos'}`);
      showAlert(
        `"${titulo}" tiene ${partes.join(' y ')}. Si lo eliminas se pierde ese historial. ${course?.activo ? 'Usa "Activo" en la tabla para inactivarlo: deja de verse en el catálogo y se conserva todo.' : 'Ya está inactivo, así que los alumnos nuevos no lo ven.'}`,
        'No se puede eliminar'
      );
      return;
    }

    const detalle = `Se eliminará "${titulo}" con sus lecciones, preguntas del examen, reglas y archivos. No tiene alumnos inscritos ni certificados. Esta acción no se puede deshacer.`;
    if (!(await showConfirm(detalle, 'Eliminar Curso'))) return;
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
      if (editingCourse && Number(editingCourse.id) === Number(courseId)) handleCloseCourseForm();
      await fetchCourses();
      showToast('Curso eliminado con éxito', 'success');
    } catch (err) {
      console.error('Error deleting course:', err.message);
      showToast(`No se pudo eliminar el curso: ${err.message}`, 'error');
    }
  };

  const handleToggleCourseStatus = async (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const nextStatus = !course.activo;

    let mensaje;
    if (nextStatus) {
      mensaje = `¿Activar "${course.title}"? Aparecerá en el catálogo y los alumnos podrán inscribirse${course.tipo === 'pago' ? ' y pagarlo' : ''}.`;
    } else {
      let inscritos = null;
      try {
        inscritos = await contarDeCurso('inscripciones', courseId);
      } catch (err) {
        showToast(`No se pudieron contar los inscritos: ${err.message}`, 'error');
        return;
      }
      mensaje = `¿Inactivar "${course.title}"? Deja de verse en el catálogo`
        + (inscritos > 0
          ? ` y ${inscritos} ${inscritos === 1 ? 'alumno inscrito dejará' : 'alumnos inscritos dejarán'} de verlo en su portal.`
          : inscritos === 0 ? '. No tiene alumnos inscritos.' : '.')
        + ' Se conservan sus inscripciones, avances y certificados.';
    }
    if (!(await showConfirm(mensaje, nextStatus ? 'Activar curso' : 'Inactivar curso'))) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .update({ activo: nextStatus })
        .eq('id', courseId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No se actualizó el curso: revisa que tu sesión de administrador siga activa.');
      await fetchCourses();
      showToast(nextStatus ? 'Curso activado.' : 'Curso inactivado.', 'success');
    } catch (err) {
      console.error('Error toggling course status:', err.message);
      showToast(`No se pudo cambiar el estado: ${err.message}`, 'error');
    }
  };

  // Alumnos handlers
  // Antes este botón solo mostraba el mensaje de éxito sin guardar nada.
  const fetchInscripcionesAlumno = async (studentId) => {
    if (!studentId) return;
    const { data, error } = await supabase
      .from('inscripciones')
      .select('course_id, origen, created_at')
      .eq('user_id', studentId);
    if (error) {
      setInscripcionesAlumno(esTablaFaltante(error) ? null : []);
      return;
    }
    setInscripcionesAlumno(data || []);
  };

  useEffect(() => {
    if (selectedStudent?.id) void fetchInscripcionesAlumno(selectedStudent.id);
  }, [selectedStudent?.id]);

  const handleManualEnroll = async (e) => {
    e.preventDefault();
    if (!enrollCourseId || !selectedStudent) return;
    const course = courses.find(c => c.id === parseInt(enrollCourseId));
    if (!course) return;

    setInscribiendoAlumno(true);
    try {
      await llamarInscripcion('admin-inscribir', { userId: selectedStudent.id, courseId: course.id });
      await fetchInscripcionesAlumno(selectedStudent.id);
      showToast(`${selectedStudent.nombre_completo || selectedStudent.email} quedó inscrito en "${course.title}".`, 'success');
      setEnrollCourseId('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setInscribiendoAlumno(false);
    }
  };

  const handleQuitarInscripcion = async (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!selectedStudent || !(await showConfirm(`¿Quitar el acceso a "${course?.title || 'este curso'}"? El alumno ya no podrá entrar al aula.`, 'Quitar inscripción'))) return;

    setInscribiendoAlumno(true);
    try {
      await llamarInscripcion('admin-quitar', { userId: selectedStudent.id, courseId });
      await fetchInscripcionesAlumno(selectedStudent.id);
      showToast('Inscripción eliminada.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setInscribiendoAlumno(false);
    }
  };

  // Bloquear suspende la cuenta: no entra al portal ni ve sus cursos.
  const handleToggleBlockStudent = async (student) => {
    const isBlocked = student.activo === false;
    const mensaje = isBlocked
      ? `¿Reactivar la cuenta de ${student.nombre_completo || student.email}? Volverá a entrar al portal.`
      : `¿Bloquear la cuenta de ${student.nombre_completo || student.email}? No podrá entrar al portal ni a sus cursos.`;
    if (!(await showConfirm(mensaje, 'Administrar Cuenta'))) return;
    try {
      await llamarCuenta(isBlocked ? 'activar' : 'bloquear', { userId: student.id });
      await fetchProfiles();
      showToast(`Cuenta ${isBlocked ? 'reactivada' : 'bloqueada'}.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Alta de cuentas desde el servidor: signUp desde el navegador dejaba la
  // cuenta pendiente y podía cambiar la sesión del administrador.
  const llamarUsuarioCrear = async (cuerpo) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/.netlify/functions/usuario-crear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(cuerpo)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404) throw new Error('La función para crear cuentas todavía no está publicada.');
      throw new Error(data.error || 'No se pudo crear la cuenta.');
    }
    return data;
  };

  // Create Student manually
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const nombreCompleto = `${newStudentForm.nombres} ${newStudentForm.apellidos}`.trim();
      // La cuenta que crea un administrador ya nace aprobada y con acceso.
      await llamarUsuarioCrear({
        tipo: 'alumno',
        email: newStudentForm.email.trim(),
        password: newStudentForm.password,
        nombre_completo: nombreCompleto,
        telefono: newStudentForm.telefono,
        pais: newStudentForm.pais,
        estado: newStudentForm.estado,
        grado: newStudentForm.grado,
        especialidad: newStudentForm.especialidad,
        institucion: newStudentForm.institucion,
        cargo: newStudentForm.cargo
      });

      showToast(`¡Alumno ${nombreCompleto} registrado correctamente!`, 'success');
      handleCloseAddStudentModal();
      fetchProfiles();
    } catch (err) {
      // Se conserva lo escrito para que el administrador corrija y reintente.
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Admin manually
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const nombreCompleto = `${newAdminForm.nombres} ${newAdminForm.apellidos}`.trim();
      await llamarUsuarioCrear({
        tipo: 'admin',
        email: newAdminForm.email.trim(),
        password: newAdminForm.password,
        nombre_completo: nombreCompleto
      });
      showToast(`Administrador ${nombreCompleto} creado correctamente.`, 'success');
      handleCloseAddAdminModal();
      fetchProfiles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add categories
  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }]);
      if (error) throw error;
      setNewCategoryName('');
      showToast('Categoría creada con éxito', 'success');
      await fetchCategories();
    } catch (err) {
      console.warn('Error inserting category into Supabase:', err.message);
      // Fallback local
      const nextId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
      const updated = [...categories, { id: nextId, name: newCategoryName.trim(), count: 0 }];
      setCategories(updated);
      localStorage.setItem('categories', JSON.stringify(updated));
      setNewCategoryName('');
      showAlert('Se creó la categoría de forma local temporalmente. Ejecuta el SQL de Categorías en tu consola de Supabase para guardarla en la nube.', 'Desarrollo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!(await showConfirm('¿Seguro que deseas eliminar esta categoría?', 'Eliminar Categoría'))) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId);
      if (error) throw error;
      showToast('Categoría eliminada con éxito', 'success');
      await fetchCategories();
    } catch (err) {
      console.warn('Error deleting category from Supabase:', err.message);
      // Fallback local
      const updated = categories.filter(c => c.id !== catId);
      setCategories(updated);
      localStorage.setItem('categories', JSON.stringify(updated));
    } finally {
      setActionLoading(false);
    }
  };

  const fetchInscripcionesTodas = async () => {
    try {
      const filas = await traerTodo('inscripciones', 'user_id, course_id, created_at');
      setInscripcionesTodas(filas);
    } catch (err) {
      console.warn('No se pudieron leer las inscripciones:', err.message);
      setInscripcionesTodas(null);
    }
  };

  // Quién terminó un curso (lecciones obligatorias completas) o aprobó el
  // examen final, para listar los certificados pendientes.
  const fetchDatosCertificables = async () => {
    try {
      const [lecciones, completadas, examenes] = await Promise.all([
        traerTodo('curso_lecciones', 'id, course_id, tipo, obligatoria'),
        traerTodo('leccion_progreso', 'user_id, leccion_id, course_id', (q) => q.eq('completada', true).order('user_id').order('leccion_id'), { orden: null }),
        traerTodo('curso_eventos', 'user_id, course_id, datos', (q) => q.eq('tipo', 'examen_enviado'))
      ]);
      setDatosCertificables({ lecciones, completadas, examenes });
    } catch (err) {
      console.warn('No se pudieron leer los avances para certificados pendientes:', err.message);
      setDatosCertificables({ lecciones: [], completadas: [], examenes: [] });
    }
  };

  const fetchTrackingData = async () => {
    let acts = null;
    let prog = null;

    try {
      // 1. Fetch activities
      acts = await traerTodo(
        'student_activity',
        '*',
        (q) => q.order('last_active_at', { ascending: false, nullsFirst: false }).order('user_id'),
        { orden: 'user_id' }
      );
    } catch (err) {
      console.warn('student_activity fetch failed:', err.message);
    }

    try {
      // 2. Fetch progress
      prog = await traerTodo(
        'student_progress',
        '*',
        (q) => q.order('updated_at', { ascending: false, nullsFirst: false }).order('user_id').order('course_id'),
        { orden: ['user_id', 'course_id'] }
      );
    } catch (err) {
      console.warn('student_progress fetch failed:', err.message);
    }

    const errores = [];
    if (acts === null) errores.push('actividad');
    else setStudentActivities(acts);
    if (prog === null) errores.push('avance');
    else setStudentProgressList(prog);
    setErrorTracking(errores.length ? `No se pudo actualizar ${errores.join(' y ')}. Se muestran los últimos datos recibidos.` : '');
  };

  // El certificado lo emite el servidor (folio único, vigencia del curso y
  // registro de la acción). La imagen la genera el portal del alumno al abrirlo.
  const handleIssueCertificate = async (userId, courseId) => {
    const alumno = profiles.find(p => p.id === userId);
    const curso = courses.find(c => Number(c.id) === Number(courseId));
    const nombre = alumno?.nombre_completo || alumno?.email || 'este alumno';
    if (!(await showConfirm(`¿Emitir el certificado de "${curso?.title || 'este curso'}" a ${nombre}? Queda registrado con calificación de 100.`, 'Emitir certificado'))) return;
    try {
      setActionLoading(true);
      const { nuevo, certificado } = await llamarCertificado('emitir', { courseId: Number(courseId), userId });
      showToast(nuevo === false
        ? `Ya tenía certificado (folio ${certificado?.folio || '—'}).`
        : `Certificado emitido (folio ${certificado?.folio || '—'}).`, 'success');
      await fetchCertificates();
    } catch (err) {
      showToast(err.status === 404
        ? 'La función de certificados todavía no está publicada.'
        : err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchWebinars = async () => {
    try {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setWebinars(data || []);
      localStorage.setItem('webinars', JSON.stringify(data || []));
    } catch (err) {
      console.warn('Error fetching webinars from Supabase:', err.message);
      const saved = localStorage.getItem('webinars');
      if (saved) {
        setWebinars(JSON.parse(saved));
      } else {
        const defaultWebinars = [
          {
            id: 1,
            title: 'Trasplante pulmonar en Latinoamérica',
            date: '28 de Abril, 2026',
            time: '5:00 PM (MEX/CR) | 8:00 PM (ARG/CHI)',
            image_url: 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/WhatsApp%20Image%202026-04-21%20at%2011.18.02%20AM.jpeg',
            link: 'https://bit.ly/LATICE-Trasplante-Pulmonar',
            fecha_inicio: '2026-04-28T17:00',
            fecha_fin: '2026-04-28T19:00',
            activo: true,
            created_at: new Date().toISOString()
          }
        ];
        setWebinars(defaultWebinars);
        localStorage.setItem('webinars', JSON.stringify(defaultWebinars));
      }
    }
  };

  const handleWebinarImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('El archivo supera los 2 MB permitidos', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `webinars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      setWebinarForm(prev => ({
        ...prev,
        image_url: publicUrl
      }));
      showToast('Imagen subida correctamente.', 'success');
    } catch (err) {
      console.warn('Error uploading webinar image to storage, falling back to local Base64:', err.message);
      const reader = new FileReader();
      reader.onload = (event) => {
        setWebinarForm(prev => ({
          ...prev,
          image_url: event.target.result
        }));
        showToast('Imagen cargada localmente con éxito (Base64)', 'info');
      };
      reader.readAsDataURL(file);
    } finally {
      setActionLoading(false);
    }
  };


  // La plantilla de la constancia se puede pegar como URL o subir como archivo.
  // Aquí no hay respaldo en Base64 a propósito: una plantilla pesa megas y
  // guardarla incrustada en la fila del webinar reventaría la tabla.
  const handlePlantillaConstanciaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('La plantilla tiene que ser una imagen (PNG o JPG).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('La plantilla supera los 5 MB permitidos.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const extension = file.name.split('.').pop();
      const ruta = `webinars/plantillas/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(ruta, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(ruta);

      setWebinarForm(prev => ({ ...prev, certificado_template_url: publicUrl }));
      showToast('Plantilla subida. Ya puedes colocar el nombre encima.', 'success');
    } catch (err) {
      console.error('Error subiendo la plantilla:', err.message);
      showToast(`No se pudo subir la plantilla: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  const isWebinarLive = (webinar) => {
    if (webinar.fecha_inicio && webinar.fecha_fin) {
      const now = new Date();
      const start = new Date(webinar.fecha_inicio);
      const end = new Date(webinar.fecha_fin);
      return now >= start && now <= end;
    }
    return !!webinar.en_vivo;
  };

  const handleSaveWebinar = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      // Los campos numéricos vacíos van como null, no como cadena, o Postgres
      // rechaza el guardado entero.
      const numeroONulo = (valor) =>
        valor === '' || valor === null || valor === undefined ? null : Number(valor);

      const payload = {
        title: webinarForm.title,
        date: webinarForm.date,
        time: webinarForm.time,
        image_url: webinarForm.image_url,
        link: webinarForm.link,
        fecha_inicio: webinarForm.fecha_inicio || null,
        fecha_fin: webinarForm.fecha_fin || null,
        activo: webinarForm.activo,
        registro_portal: webinarForm.registro_portal,
        zoom_id: webinarForm.zoom_id ? String(webinarForm.zoom_id).replace(/\s/g, '') : null,
        zoom_tipo: webinarForm.zoom_tipo || 'webinar',
        minutos_minimos: numeroONulo(webinarForm.minutos_minimos) ?? 0,
        constancia_estado: webinarForm.constancia_estado || 'bloqueada',
        brevo_lista_id: numeroONulo(webinarForm.brevo_lista_id),
        certificado_template_url: webinarForm.certificado_template_url || null,
        certificado_x: numeroONulo(webinarForm.certificado_x),
        certificado_y: numeroONulo(webinarForm.certificado_y),
        certificado_font_size: numeroONulo(webinarForm.certificado_font_size)
      };

      let webinarId = editingWebinar?.id;

      if (editingWebinar) {
        const { error } = await supabase
          .from('webinars')
          .update(payload)
          .eq('id', editingWebinar.id);
        if (error) throw error;
        showToast('Webinar actualizado correctamente', 'success');
      } else {
        const { data, error } = await supabase
          .from('webinars')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        webinarId = data?.id;
        showToast('Webinar creado correctamente', 'success');
      }

      // El código de asistencia se guarda aparte: su tabla no es accesible
      // desde el navegador para que nadie pueda leerlo y bajarse la constancia
      // sin haber entrado a la clase.
      if (webinarId) {
        try {
          await llamarWebinarAdmin('guardar-codigo', { webinarId, codigo: webinarForm.codigo });
        } catch (err) {
          showToast(`El webinar se guardó, pero el código no: ${err.message}`, 'warning');
        }
      }

      await fetchWebinars();
      setShowWebinarForm(false);
      setEditingWebinar(null);
      setWebinarForm({
        title: '',
        date: '',
        time: '',
        image_url: '',
        link: '',
        fecha_inicio: '',
        fecha_fin: '',
        activo: true,
        registro_portal: false,
        zoom_id: '',
        zoom_tipo: 'webinar',
        minutos_minimos: 0,
        constancia_estado: 'bloqueada',
        codigo: '',
        brevo_lista_id: LISTA_WEBINARS_BREVO,
        certificado_template_url: '',
        certificado_x: '',
        certificado_y: '',
        certificado_font_size: ''
      });
    } catch (err) {
      console.error('Error saving webinar in Supabase:', err);
      showToast(`Error al guardar en la base de datos: ${err.message || err}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWebinar = async (webinarId) => {
    if (await showConfirm('¿Estás seguro de eliminar este webinar?', 'Eliminar Webinar')) {
      setActionLoading(true);
      try {
        const { error } = await supabase
          .from('webinars')
          .delete()
          .eq('id', webinarId);
        if (error) throw error;
        showToast('Webinar eliminado con éxito', 'success');
        await fetchWebinars();
      } catch (err) {
        console.error('Error deleting webinar from Supabase:', err);
        showToast(`Error al eliminar de la base de datos: ${err.message || err}`, 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleEditWebinar = async (webinar) => {
    setEditingWebinar(webinar);
    setWebinarForm({
      title: webinar.title,
      date: webinar.date,
      time: webinar.time,
      image_url: webinar.image_url,
      link: webinar.link,
      fecha_inicio: webinar.fecha_inicio || '',
      fecha_fin: webinar.fecha_fin || '',
      activo: !!webinar.activo,
      registro_portal: !!webinar.registro_portal,
      zoom_id: webinar.zoom_id || '',
      zoom_tipo: webinar.zoom_tipo || 'webinar',
      minutos_minimos: webinar.minutos_minimos ?? 0,
      constancia_estado: webinar.constancia_estado || 'bloqueada',
      codigo: '',
      brevo_lista_id: webinar.brevo_lista_id ?? LISTA_WEBINARS_BREVO,
      certificado_template_url: webinar.certificado_template_url || '',
      certificado_x: webinar.certificado_x ?? '',
      certificado_y: webinar.certificado_y ?? '',
      certificado_font_size: webinar.certificado_font_size ?? ''
    });
    setShowWebinarForm(true);

    // El código vive en una tabla que el navegador no puede leer, así que se
    // pide a la función y se rellena cuando llega.
    try {
      const { codigo } = await llamarWebinarAdmin('leer-codigo', { webinarId: webinar.id });
      setWebinarForm((prev) => ({ ...prev, codigo: codigo || '' }));
    } catch (err) {
      console.warn('No se pudo leer el código del webinar:', err.message);
    }
  };

  // Puente con la función de Netlify que gestiona lo que el navegador no puede
  // tocar: el código de asistencia y la sincronización con Zoom.
  const llamarWebinarAdmin = async (accion, cuerpo = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/.netlify/functions/webinar-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({ accion, ...cuerpo })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  };

  const fetchWebinarRegistros = async (webinar) => {
    setWebinarRegistros({ webinar, filas: null });
    try {
      const { data, error } = await supabase
        .from('webinar_registros')
        .select('*')
        .eq('webinar_id', webinar.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setWebinarRegistros({ webinar, filas: data || [] });
    } catch (err) {
      console.error('Error cargando registrados:', err.message);
      showToast(`No se pudo cargar el listado: ${err.message}`, 'error');
      setWebinarRegistros({ webinar, filas: [] });
    }
  };

  const handleSincronizarWebinar = async (webinar) => {
    setSincronizandoWebinar(true);
    try {
      const data = await llamarWebinarAdmin('sincronizar', { webinarId: webinar.id });
      if (!data.ok) {
        showToast(data.mensaje, 'warning');
      } else {
        showToast(
          `Zoom reportó ${data.participantes} participantes. Se actualizaron ${data.actualizados} registros.`,
          'success'
        );
      }
      await fetchWebinarRegistros(webinar);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSincronizandoWebinar(false);
    }
  };

  // Exporta el listado tal cual se ve, para pasarlo a quien lleve el control.
  const exportarRegistrosWebinar = () => {
    if (!webinarRegistros?.filas?.length) return;

    const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const encabezado = ['Nombre', 'Correo', 'Asistió', 'Minutos', 'Verificado por', 'Constancia', 'Registro'];
    const cuerpo = webinarRegistros.filas.map((r) => [
      r.nombre_completo || '',
      r.email,
      r.asistio ? 'Sí' : 'No',
      r.minutos ?? 0,
      r.metodo || '',
      r.certificado_url ? 'Descargada' : '',
      new Date(r.created_at).toLocaleString()
    ].map(escapar).join(','));

    // El BOM hace que Excel abra los acentos bien en Windows.
    const csv = '﻿' + [encabezado.map(escapar).join(','), ...cuerpo].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registrados_${(webinarRegistros.webinar.title || 'webinar').replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtering students
  const filteredStudents = profiles
    .filter(p => p.rol === 'estudiante')
    .filter(p => {
      const matchSearch = (p.nombre_completo?.toLowerCase() || '').includes(studentSearch.toLowerCase()) || 
                          (p.email || '').toLowerCase().includes(studentSearch.toLowerCase());
      
      const specialtyVal = p.especialidad || p.user_metadata?.especialidad || '';
      const matchSpecialty = !studentSpecialtyFilter || specialtyVal.toLowerCase() === studentSpecialtyFilter.toLowerCase();
      
      const countryVal = p.pais || p.user_metadata?.pais || '';
      const matchCountry = !studentCountryFilter || countryVal.toLowerCase() === studentCountryFilter.toLowerCase();
      
      const matchDivision = !studentDivisionFilter
        || (studentDivisionFilter === 'sin' ? !p.division_id : String(p.division_id) === studentDivisionFilter);

      return matchSearch && matchSpecialty && matchCountry && matchDivision;
    });
  const especialidades = useMemo(() => [...new Set(profiles.filter((p) => p.rol === 'estudiante').map((p) => p.especialidad || p.user_metadata?.especialidad).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [profiles]);
  const paises = useMemo(() => [...new Set(profiles.filter((p) => p.rol === 'estudiante').map((p) => p.pais || p.user_metadata?.pais).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [profiles]);
  const perfilesPorId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const actividadPorAlumno = useMemo(() => new Map(studentActivities.map((a) => [a.user_id, a])), [studentActivities]);
  const progresoPorCurso = useMemo(() => new Map(studentProgressList.map((p) => [`${p.user_id}_${p.course_id}`, p])), [studentProgressList]);
  const certificadosPorCurso = useMemo(() => new Set(certificates.map((c) => `${c.user_id}_${c.course_id}`)), [certificates]);
  const resumenDashboard = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const delMes = (lista) => lista.filter((p) => new Date(p.created_at) >= inicioMes && new Date(p.created_at) <= ahora).length;
    const alumnos = profiles.filter((p) => p.rol === 'estudiante');
    const inscripciones = inscripcionesTodas || [];
    const conteos = new Map();
    inscripciones.forEach((i) => conteos.set(Number(i.course_id), (conteos.get(Number(i.course_id)) || 0) + 1));
    const porCurso = new Map(courses.map((c) => [Number(c.id), c]));
    const actividades = [
      ...alumnos.map((p) => ({ id: `perfil-${p.id}`, fecha: p.created_at, etiqueta: 'Nuevo alumno registrado', detalle: p.nombre_completo || p.email })),
      ...inscripciones.map((i) => ({ id: `inscripcion-${i.user_id}-${i.course_id}`, fecha: i.created_at, etiqueta: 'Inscripción', detalle: `${perfilesPorId.get(i.user_id)?.nombre_completo || perfilesPorId.get(i.user_id)?.email || 'Alumno'} · ${porCurso.get(Number(i.course_id))?.title || 'Curso'}` })),
      ...certificates.map((c) => ({ id: `certificado-${c.id}`, fecha: c.created_at, etiqueta: 'Certificado emitido', detalle: `${c.profiles?.nombre_completo || c.profiles?.email || 'Alumno'} · ${c.courses?.title || 'Curso'}` })),
    ].filter((a) => a.fecha).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
    return { alumnosMes: delMes(alumnos), certificadosMes: delMes(certificates), finalizacion: Math.round(tasaFinalizacion(certificates, inscripciones)), populares: [...courses].sort((a, b) => (conteos.get(Number(b.id)) || 0) - (conteos.get(Number(a.id)) || 0)).slice(0, 3), conteos, actividades };
  }, [profiles, courses, certificates, inscripcionesTodas, perfilesPorId]);

  const pendientesCertificables = useMemo(() => {
    if (!datosCertificables) return [];
    const obligatorias = new Map();
    datosCertificables.lecciones.filter((l) => l.tipo !== 'seccion' && l.obligatoria !== false).forEach((l) => {
      const id = Number(l.course_id);
      if (!obligatorias.has(id)) obligatorias.set(id, []);
      obligatorias.get(id).push(l.id);
    });
    const avances = new Map();
    datosCertificables.completadas.forEach((p) => {
      const llave = `${p.user_id}_${p.course_id}`;
      if (!avances.has(llave)) avances.set(llave, new Set());
      avances.get(llave).add(p.leccion_id);
    });
    const aprobados = new Set(datosCertificables.examenes.filter((e) => e.datos?.aprobado === true && e.datos?.origen === 'servidor').map((e) => `${e.user_id}_${e.course_id}`));
    const cursosPorId = new Map(courses.map((c) => [Number(c.id), c]));
    return (inscripcionesTodas || []).filter((i) => {
      const llave = `${i.user_id}_${i.course_id}`;
      const lecciones = obligatorias.get(Number(i.course_id)) || [];
      return !certificadosPorCurso.has(llave) && (aprobados.has(llave) || (lecciones.length > 0 && lecciones.every((id) => avances.get(llave)?.has(id))));
    }).map((i) => ({ studentId: i.user_id, studentName: perfilesPorId.get(i.user_id)?.nombre_completo || perfilesPorId.get(i.user_id)?.email || 'Alumno', studentEmail: perfilesPorId.get(i.user_id)?.email || '', courseId: Number(i.course_id), courseTitle: cursosPorId.get(Number(i.course_id))?.title || 'Curso', watchPercent: 100 }));
  }, [datosCertificables, inscripcionesTodas, courses, certificadosPorCurso, perfilesPorId]);

  const adminUsers = profiles.filter(p => p.rol === 'admin');

  // Registradas pero todavía sin acceso a sus cursos.
  const cuentasPendientes = profiles.filter(p => p.rol === 'estudiante' && p.aprobado === false && p.activo !== false);

  // Insignias del menú lateral.
  const insigniasMenu = {
    students: {
      total: cuentasPendientes.length + (solicitudesPendientes || 0),
      titulo: [
        cuentasPendientes.length > 0 && `${cuentasPendientes.length} ${cuentasPendientes.length === 1 ? 'cuenta por activar' : 'cuentas por activar'}`,
        solicitudesPendientes > 0 && `${solicitudesPendientes} ${solicitudesPendientes === 1 ? 'solicitud de inscripción' : 'solicitudes de inscripción'}`,
      ].filter(Boolean).join(' · '),
    },
    tareas: {
      total: tareasPendientes,
      titulo: `${tareasPendientes} ${tareasPendientes === 1 ? 'tarea por revisar' : 'tareas por revisar'}`,
    },
  };

  // Lista de cursos con búsqueda y filtros.
  const textoBusquedaCursos = busquedaCursos.trim().toLowerCase();
  const cursosFiltrados = courses.filter((c) => {
    if (filtroEstadoCursos === 'activos' && !c.activo) return false;
    if (filtroEstadoCursos === 'borradores' && c.activo) return false;
    const dePago = c.tipo === 'pago';
    if (filtroAccesoCursos === 'gratis' && dePago) return false;
    if (filtroAccesoCursos === 'pago' && !dePago) return false;
    if (!textoBusquedaCursos) return true;
    return [c.title, c.requisitos, c.modalidad, `#${c.id}`, String(c.id)]
      .some((v) => String(v || '').toLowerCase().includes(textoBusquedaCursos));
  });
  const conteoCursos = {
    activos: courses.filter((c) => c.activo).length,
    borradores: courses.filter((c) => !c.activo).length,
    gratis: courses.filter((c) => c.tipo !== 'pago').length,
    pago: courses.filter((c) => c.tipo === 'pago').length,
  };
  const hayFiltrosCursos = !!textoBusquedaCursos || filtroEstadoCursos !== 'todos' || filtroAccesoCursos !== 'todos';
  const limpiarFiltrosCursos = () => { setBusquedaCursos(''); setFiltroEstadoCursos('todos'); setFiltroAccesoCursos('todos'); };

  // Editor de curso: curso guardado (si existe), estado y errores por campo.
  const idCursoEditado = editingCourse?.id && !isNaN(Number(editingCourse.id)) ? Number(editingCourse.id) : null;
  const cursoEditadoGuardado = idCursoEditado ? courses.find((c) => Number(c.id) === idCursoEditado) : null;
  const erroresCurso = showCourseForm ? validarCurso(courseForm, { esMiniaturaYoutube }) : [];
  const errorCampoCurso = (campo) => {
    if (!intentoGuardarCurso && !camposCursoTocados[campo]) return null;
    return erroresCurso.find((e) => e.campo === campo)?.mensaje || null;
  };
  const tocarCampoCurso = (campo) => setCamposCursoTocados((prev) => (prev[campo] ? prev : { ...prev, [campo]: true }));
  const pestanasConErrorCurso = intentoGuardarCurso
    ? [...new Set(erroresCurso.map((e) => e.pestana))]
    : [...new Set(erroresCurso.filter((e) => camposCursoTocados[e.campo]).map((e) => e.pestana))];
  // Propiedades de accesibilidad y aviso de error para un campo del formulario.
  const propsCampoCurso = (campo) => {
    const error = errorCampoCurso(campo);
    return {
      id: `curso-${campo}`,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `curso-${campo}-error` : undefined,
      className: error ? 'campo-con-error' : undefined,
      onBlur: () => tocarCampoCurso(campo),
    };
  };
  const avisoCampoCurso = (campo) => {
    const error = errorCampoCurso(campo);
    return error ? <small id={`curso-${campo}-error`} className="campo-error-texto" role="alert">{error}</small> : null;
  };

  // Guardar desde la barra fija: valida todo y, si falta algo, salta a la
  // pestaña del primer error y lo enfoca (nada de `required` escondidos en
  // otras pestañas que bloqueen el envío sin decir por qué).
  const guardarCurso = async (e) => {
    e?.preventDefault?.();
    if (estadoGuardadoCurso === 'guardando') return;
    setIntentoGuardarCurso(true);
    if (erroresCurso.length) {
      const primero = erroresCurso[0];
      if (pestanaCurso !== primero.pestana) cambiarPestanaCurso(primero.pestana);
      setTimeout(() => {
        const campo = document.getElementById(primero.foco);
        campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        campo?.focus({ preventScroll: true });
      }, 80);
      showToast(erroresCurso.length === 1 ? primero.mensaje : `${primero.mensaje} (y ${erroresCurso.length - 1} más por corregir)`, 'error');
      return;
    }
    const firma = firmaCurso(courseForm);
    setEstadoGuardadoCurso('guardando');
    const ok = await handleSaveCourse({ preventDefault() {} });
    if (ok) {
      setFirmaCursoGuardada(firma);
      setEstadoGuardadoCurso('guardado');
      setIntentoGuardarCurso(false);
      setCamposCursoTocados({});
      setRecargaChecklist((n) => n + 1);
    } else {
      setEstadoGuardadoCurso('idle');
    }
  };

  const actualizarCurso = (cambios) => setCourseForm((prev) => ({ ...prev, ...cambios }));

  // Helper formatting dates
  const formatDate = (isoString) => {
    if (!isoString) return 'Desconocido';
    return new Date(isoString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-layout" data-theme={effectiveTheme}>
      {/* Fondo oscuro para cerrar el cajón tocando fuera. Solo visible en móvil. */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
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
              src={isSidebarCollapsed ? "/assets/componentes/firma-hce.png" : portalSettings.logo} 
              alt="HCE Admin Logo" 
              className="sidebar-logo" 
            />
          </div>
        </div>

        <nav className="sidebar-menu" aria-label="Secciones del panel">
          {SECCIONES_MENU.map((seccion) => (
            <div key={seccion.id} className="menu-seccion" role="group" aria-label={seccion.titulo || 'Inicio'}>
              {seccion.titulo && (
                <div className="menu-seccion-titulo" aria-hidden="true">
                  <span>{seccion.titulo}</span>
                </div>
              )}
              {seccion.items.map((item) => {
                const Icono = item.icono;
                const insignia = insigniasMenu[item.id];
                const activo = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`menu-item ${activo ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    title={insignia?.total > 0 ? `${item.titulo} — ${insignia.titulo}` : item.titulo}
                    aria-current={activo ? 'page' : undefined}
                  >
                    <Icono size={20} className="menu-icon" />
                    <span className="menu-label">{item.etiqueta}</span>
                    {insignia?.total > 0 && (
                      <span className="menu-contador" aria-label={insignia.titulo}>{insignia.total > 99 ? '99+' : insignia.total}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="sidebar-separator"></div>

          <button 
            className="menu-item logout-item"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <LogOut size={20} className="menu-icon" />
            <span className="menu-label">Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-container">
        
        {/* Top Header */}
        <header className="admin-top-header">
          <div className="top-header-left">
            <button className="sidebar-toggle-btn-header" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Toggle Sidebar">
              <Menu size={20} />
            </button>
            <span className="breadcrumb-main">Admin Portal</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-sub">{getBreadcrumbTitle()}</span>
          </div>

          <div className="top-header-right">
            <BotonVerComoAlumno />
            <div className="user-profile-summary">
              <span className="user-greeting">Hola, <strong>Admin</strong></span>
              <div className="user-avatar-circle">A</div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner views */}
        <main className="admin-content-area">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && <VistaInicio contexto={{ Award, BarChart2, BookOpen, GraduationCap, PendientesHoy, Plus, Users, abrirCursoDesdePanel, cerrarEditorCurso, certificates, courses, cuentasPendientes, cursosCargados, errorCursos, errorPerfiles, formatDate, handleOpenCourseCreate, inscripcionesTodas, loadingProfiles, permitirSalidaCurso, resumenDashboard, setActiveTab, setActiveTabState, setBusquedaCursos, setFiltroAccesoCursos, setFiltroEstadoCursos, setShowAddStudentModal, showCourseForm, solicitudesPendientes, stats, tareasPendientes }} />}

          {/* VIEW: PAYMENTS & FORMS */}
          {activeTab === 'payments' && <VistaPagos contexto={{ AlertCircle, BarChart2, CheckCircle, Clock, CreditCard, DollarSign, Eye, FileSpreadsheet, Mail, Search, Send, Upload, X, activePaymentsSubTab, fetchRealFormSubmissions, fetchRealStripePayments, formFilterType, formSearch, formSortOrder, formSubmissions, formatDate, handleImportForms, handleImportPayments, loadingForms, loadingPayments, paymentFilterCourse, paymentSearch, paymentSortOrder, paymentTimePeriod, paymentsError, selectedFormEntry, setActivePaymentsSubTab, setFormFilterType, setFormSearch, setFormSortOrder, setPaymentFilterCourse, setPaymentSearch, setPaymentSortOrder, setPaymentTimePeriod, setSelectedFormEntry, setShowFormModal, showConfirm, showFormModal, showToast, stripePayments, supabase }} />}

          {activeTab === 'errores' && <VistaErrores contexto={{ ErroresAdmin, showToast }} />}

          {activeTab === 'alumni' && <VistaAlumni contexto={{ AlumniPassAdmin, showConfirm, showToast }} />}

          {activeTab === 'facturacion' && <VistaFacturacion contexto={{ CheckCircle, Receipt, Trash2, facturacionReqs, loadingFacturacion, setFacturacionReqs, setLoadingFacturacion, supabase }} />}

          {/* VIEW: CURSOS (CRUD) */}
          {activeTab === 'courses' && <VistaCursos contexto={{ BarraGuardarCurso, BibliotecaCurso, BookOpen, ChecklistPublicar, Copy, Edit, EditorCursoPestanas, EditorLecciones, ExternalLink, ImageIcon, InscritosCurso, Plus, RefreshCw, ReglasCurso, Search, Trash2, TrendingUp, Upload, actionLoading, actualizarCurso, avisoCampoCurso, busquedaCursos, cambiarPestanaCurso, cambiosEvaluacion, cambiosReglas, categories, conteoCursos, courseForm, courseFormRef, courses, cursoEditadoGuardado, cursoSucio, cursosCargados, cursosFiltrados, errorCursos, erroresCurso, esPestanaFormulario, estadoGuardadoCurso, fetchCourses, filtroAccesoCursos, filtroEstadoCursos, formatoPrecio, guardarCurso, handleCertificateTemplateChange, handleClonarCourse, handleCloseCourseForm, handleCoursePortadaUpload, handleDeleteCourse, handleOpenCourseCreate, handleOpenCourseEdit, handleToggleCourseStatus, hayFiltrosCursos, idCursoEditado, intentoGuardarCurso, limpiarFiltrosCursos, naturalDimensions, pestanaCurso, pestanasConErrorCurso, pestanasCursoVisitadas, profiles, propsCampoCurso, recargaChecklist, setActiveTab, setBusquedaCursos, setFiltroAccesoCursos, setFiltroEstadoCursos, setMetricasDeCurso, setNaturalDimensions, setRecargaChecklist, showConfirm, showCourseForm, showToast, tocarCampoCurso }} />}

          {/* VIEW: ALUMNOS (Students Directory & Detail/Enrollment) */}
          {reporteAlumno && (
            <ReporteAlumno
              alumno={reporteAlumno}
              cursos={courses}
              notificar={showToast}
              confirmar={showConfirm}
              onCerrar={() => setReporteAlumno(null)}
            />
          )}

          {activeTab === 'students' && <VistaAlumnos contexto={{ CuentasPorActivar, Download, Filter, Lock, Plus, Search, SolicitudesInscripcion, Trash2, Unlock, X, actionLoading, certificates, courses, cuentasPendientes, descargarCsv, divisionesLista, downloadCertificateFile, enrollCourseId, especialidades, fetchProfiles, filteredStudents, formatDate, handleCloseAddStudentModal, handleCreateStudent, handleManualEnroll, handleQuitarInscripcion, handleToggleBlockStudent, inscribiendoAlumno, inscripcionesAlumno, loadingProfiles, newStudentForm, paises, profiles, selectedStudent, setEnrollCourseId, setNewStudentForm, setReporteAlumno, setSelectedStudent, setShowAddStudentModal, setStudentCountryFilter, setStudentDivisionFilter, setStudentSearch, setStudentSpecialtyFilter, showAddStudentModal, showConfirm, showToast, studentCountryFilter, studentDivisionFilter, studentSearch, studentSpecialtyFilter }} />}

          {/* VIEW: CERTIFICADOS */}
          {activeTab === 'certificates' && <VistaCertificados contexto={{ certificates, downloadCertificateFile, loadingCertificates }} />}

          {/* VIEW: CATEGORÍAS */}
          {activeTab === 'categories' && <VistaCategorias contexto={{ Plus, Trash2, categories, handleAddCategory, handleDeleteCategory, newCategoryName, setNewCategoryName }} />}

          {/* VIEW: WEBINARS */}
          {activeTab === 'webinars' && <VistaWebinars contexto={{ Download, Edit, LISTA_WEBINARS_BREVO, Plus, PosicionadorConstancia, RefreshCw, Trash2, Upload, Users, X, editingWebinar, exportarRegistrosWebinar, extraerZoomId, fetchWebinarRegistros, handleDeleteWebinar, handleEditWebinar, handlePlantillaConstanciaUpload, handleSaveWebinar, handleSincronizarWebinar, handleWebinarImageUpload, isWebinarLive, setEditingWebinar, setShowWebinarForm, setWebinarForm, setWebinarRegistros, showWebinarForm, sincronizandoWebinar, webinarForm, webinarRegistros, webinars }} />}

          {/* VIEW: TAREAS */}
          {activeTab === 'tareas' && <VistaTareas contexto={{ RevisionTareas, courses, profiles, setTareasPendientes, showToast }} />}

          {/* VIEW: GRUPOS */}
          {activeTab === 'grupos' && <VistaGrupos contexto={{ GruposAdmin, courses, profiles, showConfirm, showToast }} />}

          {activeTab === 'divisiones' && <VistaDivisiones contexto={{ DivisionesAdmin, courses, fetchProfiles, profiles, showConfirm, showToast }} />}

          {activeTab === 'ayuda' && <VistaAyuda contexto={{ GuiaUso, setActiveTab }} />}

          {activeTab === 'notificaciones' && <VistaNotificaciones contexto={{ NotificacionesAdmin, courses, showConfirm, showToast }} />}

          {activeTab === 'mensajes' && user?.id && (
            <div className="mensajes-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Mensajes y comunicados</h2>
              </div>
              <MensajesAdmin userId={user.id} perfiles={profiles} cursos={courses} notificar={showToast} confirmar={showConfirm} />
            </div>
          )}

          {/* VIEW: MÉTRICAS DE CURSOS */}
          {activeTab === 'metricas' && <VistaMetricas contexto={{ InformesAdmin, courses, metricasDeCurso, profiles, showConfirm, showToast }} />}

          {/* VIEW: REPORTES */}
          {activeTab === 'reports' && <VistaReportes contexto={{ ABANDONMENT_INACTIVE_DAYS, AlertCircle, Award, BarChart2, CheckCircle, Clock, FileSpreadsheet, FileText, GraduationCap, Monitor, Users, actionLoading, actividadPorAlumno, certificadosPorCurso, certificates, courses, errorTracking, handleExportExcel, handleExportPDF, handleIssueCertificate, inscripcionesTodas, pendientesCertificables, profiles, progresoPorCurso, reportsSubTab, setReportsSubTab, tasaFinalizacion, webinars }} />}

          {/* VIEW: ADMINISTRADORES (Staff lists and creations) */}
          {activeTab === 'admins' && <VistaAdministradores contexto={{ Lock, UserPlus, X, actionLoading, adminUsers, formatDate, handleCloseAddAdminModal, handleCreateAdmin, newAdminForm, setNewAdminForm, setShowAddAdminModal, showAddAdminModal, showAlert, user }} />}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && <VistaConfiguracion contexto={{ Eye, EyeOff, GamificacionAdmin, Monitor, Moon, React, Sun, confirmNewPassword, faltaPortalConfig, guardandoBienvenida, handleSaveWelcomeMessage, handleUpdatePassword, newPassword, portalSettings, setConfirmNewPassword, setNewPassword, setPortalSettings, setShowConfirmNewPassword, setShowNewPassword, setTheme, showConfirmNewPassword, showNewPassword, showToast, theme, updatePasswordLoading }} />}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
