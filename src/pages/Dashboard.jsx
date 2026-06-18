import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Award,
  User as UserIcon,
  Settings,
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
  Sun,
  Moon,
  Monitor,
  Heart,
  Stethoscope,
  HeartPulse,
  Gamepad2,
  ArrowRight,
  Compass,
  MessageSquare,
  Star,
  Send,
  Trash2
} from 'lucide-react';
import './Dashboard.css';
import '../components/Experiences.css';

const NurseCap = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 19c2-2 5-3 10-3s8 1 10 3" />
    <path d="M3 18c0-5 3-7 9-7s9 2 9 7" />
    <path d="M5 10c0-3 3-5 7-5s7 2 7 5" />
    <path d="M12 6v4" />
    <path d="M10 8h4" />
  </svg>
);

import { COUNTRIES as ALL_COUNTRIES, getFlagUrl } from '../data/countries';

const Dashboard = () => {
  const { user, profile, logout, updateUserMetadata, updateProfile } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Redirect to admin portal if role is admin
  useEffect(() => {
    if (profile && profile.rol === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [profile, navigate]);
  
  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [myCertificates, setMyCertificates] = useState([]);
  
  // Dashboard Tabs: 'dashboard' | 'courses' | 'certificates' | 'profile' | 'settings'
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('studentActiveTab') || 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('studentActiveTab', tab);
  };

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

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);



  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('La foto de perfil debe ser menor a 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        // 1. Update auth metadata
        await updateUserMetadata({ avatar_url: base64String });
        // 2. Try to update profiles table
        try {
          await updateProfile({ avatar_url: base64String });
        } catch (dbErr) {
          console.warn('Could not update avatar_url in profiles table:', dbErr.message);
        }
        showToast('Foto de perfil actualizada correctamente', 'success');
        setUploadingAvatar(false);
      };
      reader.onerror = () => {
        showToast('Error al leer el archivo de imagen', 'error');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error updating profile picture:', err);
      showToast('Error al actualizar la foto de perfil', 'error');
      setUploadingAvatar(false);
    }
  };

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nombre_completo: '',
    telefono: '',
    pais: '',
    estado: '',
    grado: '',
    especialidad: '',
    institucion: '',
    cargo: ''
  });
  const [showProfileCountrySuggestions, setShowProfileCountrySuggestions] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const startEditingProfile = () => {
    setProfileForm({
      nombre_completo: profile?.nombre_completo || '',
      telefono: profile?.telefono || '',
      pais: user?.user_metadata?.pais || '',
      estado: user?.user_metadata?.estado || '',
      grado: user?.user_metadata?.grado || '',
      especialidad: user?.user_metadata?.especialidad || '',
      institucion: user?.user_metadata?.institucion || '',
      cargo: user?.user_metadata?.cargo || ''
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // 1. Update profiles table (with fallback if columns do not exist in database yet)
      try {
        await updateProfile({
          nombre_completo: profileForm.nombre_completo,
          telefono: profileForm.telefono,
          pais: profileForm.pais,
          estado: profileForm.estado,
          grado: profileForm.grado,
          especialidad: profileForm.especialidad,
          institucion: profileForm.institucion,
          cargo: profileForm.cargo
        });
      } catch (dbErr) {
        console.warn('Could not update extended columns in profiles table, falling back to basic.', dbErr.message);
        await updateProfile({
          nombre_completo: profileForm.nombre_completo,
          telefono: profileForm.telefono
        });
      }

      // 2. Update auth metadata
      await updateUserMetadata({
        pais: profileForm.pais,
        estado: profileForm.estado,
        grado: profileForm.grado,
        especialidad: profileForm.especialidad,
        institucion: profileForm.institucion,
        cargo: profileForm.cargo
      });

      showToast('Perfil actualizado correctamente', 'success');
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Error al actualizar el perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, text: "Bienvenido a HCE. Tu cuenta ha sido creada con éxito.", read: false }
  ]);

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
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*, courses(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyCertificates(data || []);
    } catch (err) {
      console.error('Error fetching certificates:', err.message);
      setMyCertificates([]);
    }
  }, [user]);

  // Run cleanup and load certificates on mount
  useEffect(() => {
    const runCleanupAndFetch = async () => {
      try {
        await supabase.rpc('clean_expired_certificates');
      } catch (err) {
        console.warn('RPC clean_expired_certificates not available:', err.message);
      }
      await fetchMyCertificates();
    };
    if (user) {
      runCleanupAndFetch();
    }
  }, [user, fetchMyCertificates]);



  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getFirstName = () => {
    if (!profile?.nombre_completo) return 'Alumno';
    return profile.nombre_completo.split(' ')[0];
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'explore': return 'Explorar Cursos';
      case 'courses': return 'Mis Cursos';
      case 'certificates': return 'Certificados';
      case 'profile': return 'Mi Perfil';
      case 'settings': return 'Configuración';
      default: return 'Portal HCE';
    }
  };

  const premiumSponsorCourses = [
    {
      id: 1,
      title: 'Manejo de avanzada en insuficiencia cardiaca',
      description: 'Domina los criterios de selección para asistencia ventricular y trasplante con simulación HARVI de alta precisión.',
      image: '/assets/componentes/exopins.png',
      link: '/insuficiencia-cardiaca',
      badge: 'PRÓXIMAMENTE',
      badgeClass: 'badge-info',
      icon: Heart
    },
    {
      id: 2,
      title: 'ECMO Nursing Care Course',
      description: 'El primer entrenamiento 100% enfermería para enfermería. Lidera el cuidado crítico del paciente en soporte extracorpóreo.',
      image: '/assets/componentes/expnur.png',
      link: '/ecmo-nursing-care',
      icon: NurseCap
    },
    {
      id: 3,
      title: 'Paris International Diploma in ECMO',
      description: 'La especialización de mayor prestigio global en ECMO. Desarrolla competencias críticas para liderar equipos de soporte extracorpóreo al más alto nivel clínico.',
      image: '/assets/componentes/expparis.png',
      link: '/paris-diploma-ecmo',
      icon: Award
    },
    {
      id: 4,
      title: 'ECMO SIM: Realidad Clínica',
      description: 'Simulación de alta fidelidad con tecnología inmersiva de vanguardia. Domina el manejo de escenarios críticos en un entorno clínico interactivo y seguro.',
      image: '/assets/componentes/expsim.png',
      link: '/simulador-ecmo-sim',
      badge: 'SIMULADOR',
      badgeClass: 'badge-warning',
      icon: Gamepad2
    },
  ];

  const premiumCoursesOnly = premiumSponsorCourses.filter(course => course.badge !== 'SIMULADOR');
  const simulatorCoursesOnly = premiumSponsorCourses.filter(course => course.badge === 'SIMULADOR');

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
      
      const coursesWithQuestions = await Promise.all((dbCourses || []).map(async (c) => {
        const { data: dbQuestions } = await supabase
          .from('questions')
          .select('*')
          .eq('course_id', c.id)
          .order('id', { ascending: true });
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
          questions: dbQuestions || []
        };
      }));
      
      const activeCourses = coursesWithQuestions.filter(c => c.activo !== false);

      if (dbCourses && dbCourses.length > 0) {
        setCatalogCourses(activeCourses);
        localStorage.setItem('courses', JSON.stringify(activeCourses));
      } else {
        const saved = localStorage.getItem('courses');
        setCatalogCourses(saved ? JSON.parse(saved) : []);
      }
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
        case 'profile': return 'Editando: Mi Perfil';
        case 'settings': return 'Ajustando: Configuración';
        default: return 'Activo en el Portal';
      }
    };

    const getBrowserAndOS = () => {
      const ua = navigator.userAgent;
      let browser = 'Chrome';
      let device = 'Windows';

      if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
      else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung Browser';
      else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
      else if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) browser = 'Edge';
      else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') > -1) browser = 'Safari';

      if (ua.indexOf('Windows NT') > -1) device = 'Windows';
      else if (ua.indexOf('Macintosh') > -1) device = 'Mac';
      else if (ua.indexOf('Android') > -1) device = 'Android';
      else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) device = 'iPhone';
      else if (ua.indexOf('Linux') > -1) device = 'Linux';

      return { browser, device };
    };

    const getMockIP = (uid) => {
      if (!uid) return '189.143.12.45';
      let hash = 0;
      for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
      }
      const part3 = Math.abs((hash >> 8) & 255);
      const part4 = Math.abs(hash & 255);
      return `189.143.${part3}.${part4}`;
    };

    const sendConnectionState = async (isOnline) => {
      const action = isOnline ? getActionText() : 'Desconectado';
      const lastActive = isOnline ? new Date().toISOString() : new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { browser, device } = getBrowserAndOS();
      const ip = getMockIP(user.id);

      // Local storage
      try {
        const allKey = 'backup_all_student_activities';
        const savedAll = localStorage.getItem(allKey);
        const allActivities = savedAll ? JSON.parse(savedAll) : {};
        
        allActivities[user.id] = {
          user_id: user.id,
          session_duration: (allActivities[user.id]?.session_duration || 300) + (isOnline ? 10 : 0),
          last_active_at: lastActive,
          current_action: action,
          browser,
          device,
          ip_address: ip,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(allKey, JSON.stringify(allActivities));
      } catch (err) {
        console.warn('Error saving local activity:', err);
      }

      // Supabase
      try {
        await supabase
          .from('student_activity')
          .upsert({
            user_id: user.id,
            last_active_at: lastActive,
            current_action: action,
            browser,
            device,
            ip_address: ip,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        // Fail silently
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

  // Calculate course states dynamically
  const getCourseProgress = (courseId) => {
    // Check if they have a certificate
    const hasCert = myCertificates.some(cert => cert.course_id === courseId);
    if (hasCert) return 100;
    
    // Check watch percent from localStorage
    const prefix = user?.id ? `${user.id}_` : '';
    const pct = parseInt(localStorage.getItem(`watchPercent_${prefix}${courseId}`) || '0');
    return pct;
  };

  const processedCourses = catalogCourses.map(course => {
    const progress = getCourseProgress(course.id);
    const completed = myCertificates.some(cert => cert.course_id === course.id);
    const inProgress = progress > 0 && !completed;
    const enrolled = completed || inProgress;
    return {
      ...course,
      progress,
      completed,
      inProgress,
      enrolled
    };
  });

  const enrolledCourses = processedCourses.filter(c => c.enrolled);
  const completedCourses = processedCourses.filter(c => c.completed);
  const inProgressCourses = processedCourses.filter(c => c.inProgress);

  const numEnrolled = enrolledCourses.length;
  const numCompleted = completedCourses.length;
  const numCertificates = myCertificates.length;
  const numInProgress = inProgressCourses.length;

  // Average progress
  const avgProgress = numEnrolled > 0 
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / numEnrolled)
    : 0;

  return (
    <div className="crm-layout" data-theme={effectiveTheme}>
      {/* Sidebar Navigation */}
      <aside className={`crm-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img 
              src={isSidebarCollapsed ? "/assets/componentes/firma-hce.png" : "/assets/componentes/ghghg-scaled.png"} 
              alt="HCE Logo" 
              className="sidebar-logo" 
            />
          </div>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard"
          >
            <Home size={20} className="menu-icon" />
            <span className="menu-label">Dashboard</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
            title="Explorar Cursos"
          >
            <Compass size={20} className="menu-icon" />
            <span className="menu-label">Explorar Cursos</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
            title="Mis Cursos"
          >
            <BookOpen size={20} className="menu-icon" />
            <span className="menu-label">Mis Cursos</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'certificates' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificates')}
            title="Certificados"
          >
            <Award size={20} className="menu-icon" />
            <span className="menu-label">Certificados</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Mi Perfil"
          >
            <UserIcon size={20} className="menu-icon" />
            <span className="menu-label">Mi Perfil</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Configuración"
          >
            <Settings size={20} className="menu-icon" />
            <span className="menu-label">Configuración</span>
          </button>

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

      {/* Main Container */}
      <div className="crm-main-container">
        
        {/* Top Header */}
        <header className="crm-top-header">
          <div className="top-header-left">
            <button className="sidebar-toggle-btn-header" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expandir" : "Colapsar"}>
              <Menu size={20} />
            </button>
            <span className="breadcrumb-main">HCE Portal</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-sub">{getBreadcrumbTitle()}</span>
          </div>

          <div className="top-header-right">
            {/* Notification Bell */}
            <div className="notification-wrapper">
              <button 
                className="notification-trigger" 
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notificaciones"
              >
                <Bell size={20} />
                <span className="notification-badge-dot"></span>
              </button>
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="dropdown-header">Notificaciones</div>
                  <div className="dropdown-body">
                    {notifications.map(n => (
                      <div key={n.id} className="notification-item">
                        <p>{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile-summary">
              <span className="user-greeting">Hola, <strong>{getFirstName()}</strong></span>
              <div className="user-avatar-circle" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="crm-content-area">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-view">
              
              {/* Welcome Section */}
              <div ref={bannerRef} className="welcome-banner-card">
                <div className="welcome-avatar-wrapper">
                  <div className="welcome-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                </div>
                <div className="welcome-text-details">
                  <h2>¡Bienvenido de vuelta, {profile?.nombre_completo || 'Alumno'}!</h2>
                  <p>{localStorage.getItem('welcomeMessage') || 'Sigue redefiniendo el estándar de la educación médica continua a través de simulación clínica avanzada y ECMO.'}</p>
                </div>
              </div>

              {/* Overview / Stat Cards (Clean empty values) */}
              <div className="kpi-row">
                <div className="kpi-card">
                  <div className="kpi-icon-wrapper blue">
                    <BookOpen size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos Inscritos</span>
                    <h3 className="kpi-value">{numEnrolled}</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper green">
                    <CheckSquare size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos Completados</span>
                    <h3 className="kpi-value">{numCompleted}</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper cyan">
                    <Award size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Certificados Obtenidos</span>
                    <h3 className="kpi-value">{numCertificates}</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper orange">
                    <TrendingUp size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos en Progreso</span>
                    <h3 className="kpi-value">{numInProgress}</h3>
                  </div>
                </div>
              </div>

              {/* Continue Learning */}
              <div className="continue-learning-section">
                <h2>Continuar Aprendiendo</h2>
                {inProgressCourses.length === 0 ? (
                  <div className="crm-empty-state-card">
                    <Inbox size={48} className="empty-state-icon" />
                    <h3>Sin cursos activos</h3>
                    <p>Actualmente no tienes ninguna materia o diplomado inscrito en progreso.</p>
                    <button className="btn-crm-action solid btn-empty-state" onClick={() => setActiveTab('explore')}>
                      Explorar Cursos
                    </button>
                  </div>
                ) : (
                  <div className="dash-exp-grid">
                    {inProgressCourses.map(course => {
                      const progress = course.progress;
                      return (
                        <div key={course.id} className="exp-premium-card" style={{ display: 'flex', flexDirection: 'column' }}>
                          <div className="exp-img-container" style={{ aspectRatio: '16/9', height: 'auto', backgroundColor: '#0f172a' }}>
                            <img src={course.image} alt={course.title} className="exp-main-img" style={{ objectFit: 'cover' }} />
                            <div className="img-overlay-gradient"></div>
                          </div>
                          <div className="exp-content-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                              <h3 className="exp-title-premium" style={{ fontSize: '1rem', marginBottom: '8px' }}>{course.title}</h3>
                              <div className="progress-bar-row" style={{ marginTop: '10px' }}>
                                <div className="progress-track">
                                  <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: 'var(--primary-cyan)', height: '100%' }}></div>
                                </div>
                                <span className="progress-percentage">{progress}%</span>
                              </div>
                            </div>
                            <a
                              href={`/classroom/${course.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-crm-action solid"
                              style={{ textDecoration: 'none', textAlign: 'center' }}
                            >
                              Continuar Aprendiendo
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Content Grid (Certificates, Recommendations, Activity) */}
              <div className="dashboard-grid" style={{ marginTop: '40px' }}>
                
                {/* Left Area */}
                <div className="dashboard-left-panel">
                  
                  {/* Recent Certificates */}
                  <div className="sub-section-block">
                    <h2>Certificados Recientes</h2>
                    {myCertificates.length === 0 ? (
                      <div className="crm-empty-state-card mini">
                        <Award size={32} className="empty-state-icon" />
                        <h4>Sin certificados emitidos</h4>
                        <p>Tus diplomas se generarán una vez que completes y apruebes tus cursos.</p>
                      </div>
                    ) : (
                      <div className="certificates-mini-list">
                        {myCertificates.slice(0, 3).map(cert => (
                          <div key={cert.id} className="certificate-mini-card">
                            <div className="cert-mini-left">
                              <Award size={24} className="cert-icon" />
                              <div>
                                <h4 style={{ fontSize: '0.9rem', margin: 0 }}>{cert.courses?.title || 'Curso Académico'}</h4>
                                <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>Folio: #{cert.folio} • Emitido: {new Date(cert.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div>
                              {cert.pdf_url === 'local-simulated' ? (
                                <button 
                                  onClick={() => {
                                    // Local Canvas Redraw and Download
                                    const canvas = document.createElement('canvas');
                                    canvas.width = 800;
                                    canvas.height = 600;
                                    const ctx = canvas.getContext('2d');
                                    ctx.fillStyle = '#F8FAFC';
                                    ctx.fillRect(0, 0, 800, 600);
                                    ctx.font = 'bold 36px Georgia, serif';
                                    ctx.fillStyle = '#1E293B';
                                    ctx.textAlign = 'center';
                                    ctx.fillText(profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email, 400, 300);
                                    ctx.font = '20px Georgia, serif';
                                    ctx.fillText(`Acreditación de: ${cert.courses?.title || 'Curso Académico'}`, 400, 360);
                                    
                                    const dataUrl = canvas.toDataURL('image/png');
                                    const a = document.createElement('a');
                                    a.href = dataUrl;
                                    a.download = `Certificado_${cert.folio}.png`;
                                    a.click();
                                  }}
                                  className="btn-crm-action solid mini btn-sm-table"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                >
                                  Descargar
                                </button>
                              ) : (
                                <button 
                                  onClick={() => downloadCertificateFile(cert.pdf_url, `Certificado_${cert.folio}.png`)}
                                  className="btn-crm-action solid mini btn-sm-table"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                                >
                                  Descargar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Area: Recent Activity Feed */}
                <div className="dashboard-activity-section">
                  <h2>Actividad Reciente</h2>
                  <div className="activity-feed">
                    <div className="activity-item">
                      <div className="activity-icon-bullet"></div>
                      <div className="activity-details">
                        <p>Creación de tu cuenta en HCE Portal</p>
                        <span className="activity-time">{getMemberSinceDate()}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Programas Premium Disponibles — full width below the grid */}
              <div className="sub-section-block" style={{ marginTop: '40px' }}>
                <h2>Programas Premium Disponibles</h2>
                <div className="dash-exp-grid" style={{ marginTop: '20px' }}>
                  {premiumCoursesOnly.map(course => {
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link}
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
                          <h3 className="exp-title-premium">{course.title}</h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Simuladores */}
              <div className="sub-section-block" style={{ marginTop: '40px' }}>
                <h2>Simuladores</h2>
                <div className="dash-exp-grid" style={{ marginTop: '20px' }}>
                  {simulatorCoursesOnly.map(course => {
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link}
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
                          <h3 className="exp-title-premium">{course.title}</h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MIS CURSOS (Only Enrolled/Active Courses) */}
          {activeTab === 'courses' && (
            <div className="courses-view">
              <div className="section-title-row">
                <h2>Mis Cursos y Programas Académicos</h2>
                <p>Gestiona tu avance e ingresa a tus aulas virtuales activas.</p>
              </div>

              <div className="enrolled-courses-section-wrapper">
                <h3 className="catalog-subtitle">Matrículas Activas ({enrolledCourses.length})</h3>
                {enrolledCourses.length === 0 ? (
                  <div className="crm-empty-state-card">
                    <Inbox size={40} className="empty-state-icon" />
                    <h3>No tienes asignaturas inscritas</h3>
                    <p>Explora y solicita tu registro a través del catálogo de programas disponibles en la sección "Explorar Cursos".</p>
                    <button 
                      className="btn-crm-action solid btn-empty-state" 
                      onClick={() => setActiveTab('explore')}
                      style={{ marginTop: '15px' }}
                    >
                      Explorar Cursos
                    </button>
                  </div>
                ) : (
                  <div className="dash-exp-grid">
                    {enrolledCourses.map(course => {
                      const progress = course.progress;
                      const completed = course.completed;
                      return (
                        <div key={course.id} className="exp-premium-card" style={{ display: 'flex', flexDirection: 'column' }}>
                          <div className="exp-img-container" style={{ aspectRatio: '16/9', height: 'auto', backgroundColor: '#0f172a' }}>
                            <img src={course.image} alt={course.title} className="exp-main-img" style={{ objectFit: 'cover' }} />
                            <div className="img-overlay-gradient"></div>
                            {completed ? (
                              <div className="status-badge badge-success" style={{ backgroundColor: '#10b981', color: '#fff', position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>COMPLETADO</div>
                            ) : (
                              <div className="status-badge badge-info" style={{ backgroundColor: 'var(--primary-cyan)', color: '#fff', position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>EN PROGRESO</div>
                            )}
                          </div>
                          <div className="exp-content-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                              <h3 className="exp-title-premium" style={{ fontSize: '1rem', marginBottom: '8px' }}>{course.title}</h3>
                              <div className="progress-bar-row" style={{ marginTop: '10px' }}>
                                <div className="progress-track">
                                  <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: completed ? '#10b981' : 'var(--primary-cyan)', height: '100%' }}></div>
                                </div>
                                <span className="progress-percentage">{progress}%</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <a
                                href={`/classroom/${course.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-crm-action solid"
                                style={{ textDecoration: 'none', textAlign: 'center', flex: 1 }}
                              >
                                Ir al aula
                              </a>
                              {completed && (
                                <button
                                  onClick={() => setActiveTab('certificates')}
                                  className="btn-crm-action outlined"
                                  style={{ flex: 1, padding: '12px 10px', fontSize: '0.7rem' }}
                                >
                                  Ver Certificado
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: EXPLORAR CURSOS (Program Catalogue) */}
          {activeTab === 'explore' && (
            <div className="explore-view">
              <div className="section-title-row">
                <h2>Catálogo de Programas Académicos</h2>
                <p>Explora y solicita tu registro en los entrenamientos de alta especialidad en simulación y soporte de HCE.</p>
              </div>

              {/* Cursos Gratuitos */}
              <div className="catalog-courses-section-wrapper" style={{ marginBottom: '48px' }}>
                <div className="free-section-header">
                  <h3 className="catalog-subtitle">
                    <span className="free-badge-title">GRATIS</span>
                    Cursos Gratuitos
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Accede sin costo a contenido educativo de HCE.
                  </p>
                </div>
                <div className="dash-exp-grid">
                  {catalogCourses.length === 0 ? (
                    <div className="crm-empty-state-card mini" style={{ gridColumn: '1 / -1' }}>
                      <PlayCircle size={32} className="empty-state-icon" />
                      <h4>Próximamente</h4>
                      <p>Estamos preparando contenido gratuito para ti. ¡Vuelve pronto!</p>
                    </div>
                  ) : catalogCourses.map(course => {
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    const isDynamicCourse = !!course.youtube_video_id;
                    const CardElement = isDynamicCourse ? 'a' : Link;
                    const linkProps = isDynamicCourse ? {
                      href: `/classroom/${course.id}`,
                      target: '_blank',
                      style: { textDecoration: 'none', cursor: 'pointer' }
                    } : {
                      to: course.link,
                      target: '_blank',
                      style: { textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }
                    };
                    return (
                      <CardElement
                        key={course.id}
                        className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                        {...linkProps}
                      >
                        <div className="card-glass-glow"></div>
                        <div className={`exp-img-container ${course.containerClass || ''}`} style={{ aspectRatio: '16/9', height: 'auto', backgroundColor: '#0f172a' }}>
                          <img src={course.image} alt={course.title} className={`exp-main-img ${course.imgClass || ''}`} style={{ objectFit: 'cover' }} />
                          <div className="img-overlay-gradient"></div>
                        </div>
                        <div className="exp-content-body">
                          <h3 className="exp-title-premium">{course.title}</h3>
                        </div>
                      </CardElement>
                    );
                  })}
                </div>
              </div>

              {/* Programas Premium */}
              <div className="catalog-courses-section-wrapper" style={{ marginBottom: '40px' }}>
                <h3 className="catalog-subtitle">Programas de Alta Especialidad</h3>
                <div className="dash-exp-grid">
                  {premiumCoursesOnly.map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link}
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
                              <span>{isComingSoon ? 'Próximamente' : 'Ver programa'}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Simuladores */}
              <div className="catalog-courses-section-wrapper">
                <h3 className="catalog-subtitle">Simuladores</h3>
                <div className="dash-exp-grid">
                  {simulatorCoursesOnly.map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    return (
                      <Link
                        key={course.id}
                        to={course.link}
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
                              <span>{isComingSoon ? 'Próximamente' : 'Ver programa'}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CERTIFICADOS (Clean Empty state) */}
          {activeTab === 'certificates' && (
            <div className="certificates-view">
              <div className="section-title-row">
                <h2>Certificados Acreditados</h2>
                <p>Descarga tus constancias curriculares avaladas una vez que completes y apruebes cada programa.</p>
              </div>

              {myCertificates.length === 0 ? (
                <div className="crm-empty-state-card">
                  <Award size={48} className="empty-state-icon" />
                  <h3>Sin certificados disponibles</h3>
                  <p>Tu constancia oficial aparecerá aquí una vez que apruebes el curso correspondiente.</p>
                </div>
              ) : (
                <div className="table-responsive-container" style={{ marginTop: '20px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Curso</th>
                        <th>Fecha de Emisión</th>
                        <th>Descarga antes de</th>
                        <th>Calificación</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myCertificates.map(cert => (
                        <tr key={cert.id}>
                          <td><strong>#{cert.folio}</strong></td>
                          <td><strong>{cert.courses?.title || 'Curso Académico'}</strong></td>
                          <td>{new Date(cert.created_at).toLocaleDateString()}</td>
                          <td title="El certificado será eliminado del portal en esta fecha. Descárgalo antes para conservarlo.">
                            <span style={{ color: '#EF4444', fontWeight: '600', fontSize: '0.85rem' }}>
                              {cert.expires_at
                                ? new Date(cert.expires_at).toLocaleDateString()
                                : new Date(new Date(cert.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>límite de descarga</span>
                          </td>
                          <td>{cert.score}%</td>
                          <td>
                            {cert.pdf_url === 'local-simulated' ? (
                              <button 
                                onClick={() => {
                                  // Local Canvas Redraw and Download
                                  const canvas = document.createElement('canvas');
                                  canvas.width = 800;
                                  canvas.height = 600;
                                  const ctx = canvas.getContext('2d');
                                  ctx.fillStyle = '#F8FAFC';
                                  ctx.fillRect(0, 0, 800, 600);
                                  ctx.font = 'bold 36px Georgia, serif';
                                  ctx.fillStyle = '#1E293B';
                                  ctx.textAlign = 'center';
                                  ctx.fillText(profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email, 400, 300);
                                  ctx.font = '20px Georgia, serif';
                                  ctx.fillText(`Acreditación de: ${cert.courses?.title || 'Curso Académico'}`, 400, 360);
                                  
                                  const dataUrl = canvas.toDataURL('image/png');
                                  const a = document.createElement('a');
                                  a.href = dataUrl;
                                  a.download = `Certificado_${cert.folio}.png`;
                                  a.click();
                                }}
                                className="btn-crm-action solid mini"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                Descargar
                              </button>
                            ) : (
                              <button 
                                onClick={() => downloadCertificateFile(cert.pdf_url, `Certificado_${cert.folio}.png`)}
                                className="btn-crm-action solid mini"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', cursor: 'pointer' }}
                              >
                                Descargar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#EF4444', fontWeight: '700' }}>⚠</span>
                    La fecha indica el límite para descargar tu constancia. Después de esa fecha el archivo será eliminado del portal. El certificado como tal <strong>no expira</strong> — es permanente una vez descargado.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW: MI PERFIL (Dynamic clean metrics) */}
          {activeTab === 'profile' && (
            <div className="profile-view">
              <div className="section-title-row">
                <h2>Mi Perfil Profesional</h2>
                <p>Detalles curriculares y datos personales registrados en el portal académico.</p>
              </div>

              <div className="profile-details-layout">
                {/* Profile Card */}
                <div className="profile-details-card">
                  <div className="profile-card-header">
                    <div 
                      className="profile-big-avatar"
                      style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                      onClick={() => document.getElementById('profile-avatar-upload').click()}
                      title="Haz clic para cambiar foto de perfil"
                    >
                      {user?.user_metadata?.avatar_url ? (
                        <img 
                          src={user.user_metadata.avatar_url} 
                          alt="Foto de perfil" 
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
                      )}
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.6)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          padding: '4px 0',
                          textAlign: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                        className="avatar-hover-overlay"
                      >
                        Subir Foto
                      </div>
                    </div>
                    <input 
                      type="file"
                      id="profile-avatar-upload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarUpload}
                    />
                    <h3>{profile?.nombre_completo || 'Usuario HCE'}</h3>
                    <span className="user-role-badge">Estudiante</span>
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="profile-edit-form" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div className="crm-input-group">
                          <label>Nombre Completo *</label>
                          <input 
                            type="text" 
                            value={profileForm.nombre_completo} 
                            onChange={(e) => setProfileForm(f => ({ ...f, nombre_completo: e.target.value }))}
                            required 
                          />
                        </div>
                        
                        <div className="crm-input-group">
                          <label>Teléfono *</label>
                          <input 
                            type="text" 
                            value={profileForm.telefono} 
                            onChange={(e) => setProfileForm(f => ({ ...f, telefono: e.target.value }))}
                            required 
                          />
                        </div>

                        <div className="crm-input-group" style={{ position: 'relative' }}>
                          <label>País *</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={profileForm.pais} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setProfileForm(f => ({ ...f, pais: val }));
                                setShowProfileCountrySuggestions(true);
                              }}
                              onFocus={() => setShowProfileCountrySuggestions(true)}
                              onBlur={() => {
                                setTimeout(() => setShowProfileCountrySuggestions(false), 250);
                              }}
                              required 
                              style={{ paddingRight: getFlagUrl(profileForm.pais) ? '45px' : '12px' }}
                              placeholder="Escribe tu país..."
                              autoComplete="off"
                            />
                            {getFlagUrl(profileForm.pais) && (
                              <img 
                                src={getFlagUrl(profileForm.pais)} 
                                alt="Bandera" 
                                style={{ 
                                  position: 'absolute', 
                                  right: '12px', 
                                  height: '16px', 
                                  width: 'auto', 
                                  borderRadius: '2px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                  pointerEvents: 'none'
                                }} 
                              />
                            )}
                          </div>
                          {showProfileCountrySuggestions && profileForm.pais.trim().length > 0 && (
                            <div className="country-autocomplete-dropdown">
                              {ALL_COUNTRIES.filter(c => {
                                const cleanName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const cleanInput = profileForm.pais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                return cleanName.includes(cleanInput);
                              }).slice(0, 5).map(c => (
                                <div 
                                  key={c.code} 
                                  className="country-suggestion-item"
                                  onMouseDown={() => {
                                    setProfileForm(f => ({ ...f, pais: c.name }));
                                    setShowProfileCountrySuggestions(false);
                                  }}
                                >
                                  <img 
                                    src={`https://flagcdn.com/w40/${c.code}.png`} 
                                    alt={c.name} 
                                    className="suggestion-flag" 
                                  />
                                  <span>{c.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="crm-input-group">
                          <label>Estado / Ciudad *</label>
                          <input 
                            type="text" 
                            value={profileForm.estado} 
                            onChange={(e) => setProfileForm(f => ({ ...f, estado: e.target.value }))}
                            required 
                          />
                        </div>

                        <div className="crm-input-group">
                          <label>Grado académico / Profesión *</label>
                          <select 
                            value={profileForm.grado} 
                            onChange={(e) => setProfileForm(f => ({ ...f, grado: e.target.value }))}
                            required
                          >
                            <option value="">Selecciona...</option>
                            <option>Médico Especialista</option>
                            <option>Médico Residente</option>
                            <option>Enfermero/a</option>
                            <option>Terapeuta Respiratorio</option>
                            <option>Fisioterapeuta</option>
                            <option>Estudiante</option>
                            <option>Otro</option>
                          </select>
                        </div>

                        <div className="crm-input-group">
                          <label>Especialidad *</label>
                          <input 
                            type="text" 
                            value={profileForm.especialidad} 
                            onChange={(e) => setProfileForm(f => ({ ...f, especialidad: e.target.value }))}
                            required 
                          />
                        </div>

                        <div className="crm-input-group">
                          <label>Institución / Hospital *</label>
                          <input 
                            type="text" 
                            value={profileForm.institucion} 
                            onChange={(e) => setProfileForm(f => ({ ...f, institucion: e.target.value }))}
                            required 
                          />
                        </div>

                        <div className="crm-input-group">
                          <label>Cargo / Puesto *</label>
                          <input 
                            type="text" 
                            value={profileForm.cargo} 
                            onChange={(e) => setProfileForm(f => ({ ...f, cargo: e.target.value }))}
                            required 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button 
                          type="submit" 
                          className="btn-crm-action solid" 
                          disabled={savingProfile}
                          style={{ flex: 1, padding: '12px', background: 'var(--primary-cyan)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button 
                          type="button" 
                          className="btn-crm-action outline" 
                          onClick={() => setIsEditingProfile(false)}
                          style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dark)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="profile-info-list">
                        <div className="profile-info-item">
                          <span className="info-label">Correo electrónico:</span>
                          <span className="info-value">{user?.email}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Teléfono:</span>
                          <span className="info-value">{profile?.telefono || user?.user_metadata?.telefono || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">País:</span>
                          <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getFlagUrl(user?.user_metadata?.pais) && (
                              <img 
                                src={getFlagUrl(user.user_metadata.pais)} 
                                alt="Bandera" 
                                style={{ height: '14px', width: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} 
                              />
                            )}
                            {user?.user_metadata?.pais || 'No registrado'}
                          </span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Estado / Ciudad:</span>
                          <span className="info-value">{user?.user_metadata?.estado || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Grado académico / Profesión:</span>
                          <span className="info-value">{user?.user_metadata?.grado || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Especialidad:</span>
                          <span className="info-value">{user?.user_metadata?.especialidad || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Institución / Hospital:</span>
                          <span className="info-value">{user?.user_metadata?.institucion || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Cargo / Puesto:</span>
                          <span className="info-value">{user?.user_metadata?.cargo || 'No registrado'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Miembro desde:</span>
                          <span className="info-value">{getMemberSinceDate()}</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="btn-crm-action solid" 
                        onClick={startEditingProfile}
                        style={{ marginTop: '25px', width: '100%', padding: '12px', background: 'var(--primary-cyan)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        Editar Datos de Perfil
                      </button>
                    </>
                  )}
                </div>

                {/* Academic Status Card */}
                <div className="academic-status-card">
                  <h3>Resumen Académico</h3>
                  <div className="academic-status-grid">
                    <div className="status-metric-box">
                      <span className="status-metric-number">{numEnrolled}</span>
                      <span className="status-metric-label">Cursos Inscritos</span>
                    </div>
                    <div className="status-metric-box">
                      <span className="status-metric-number">{avgProgress}%</span>
                      <span className="status-metric-label">Avance Promedio</span>
                    </div>
                    <div className="status-metric-box">
                      <span className="status-metric-number">{numCertificates}</span>
                      <span className="status-metric-label">Certificados</span>
                    </div>
                  </div>
                  
                  <div className="active-enrollments-list" style={{ marginTop: '30px' }}>
                    <h4>Matrículas Activas</h4>
                    {enrolledCourses.length === 0 ? (
                      <div className="crm-empty-state-card mini">
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tienes matrículas activas en este momento.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {enrolledCourses.map(course => (
                          <div key={course.id} className="active-enrollment-item">
                            <div className="enrollment-bullet"></div>
                            <div style={{ flex: 1 }}>
                              <strong>{course.title}</strong>
                              <p>{course.completed ? 'Completado (100%)' : `En Progreso (${course.progress}%)`}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* VIEW: CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <div className="settings-view">
              <div className="section-title-row">
                <h2>Configuración de Cuenta</h2>
                <p>Actualiza tu contraseña de acceso al portal.</p>
              </div>

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
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`theme-option-btn${theme === value ? ' active' : ''}`}
                      onClick={() => setTheme(value)}
                    >
                      <Icon size={20} />
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

    </div>
  );
};

export default Dashboard;
