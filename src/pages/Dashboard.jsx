import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Heart,
  Stethoscope,
  HeartPulse,
  Gamepad2,
  ArrowRight,
  Compass
} from 'lucide-react';
import './Dashboard.css';
import '../components/Experiences.css';

const Dashboard = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to admin portal if role is admin
  useEffect(() => {
    if (profile && profile.rol === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [profile, navigate]);
  
  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Course player states
  const [selectedCourse, setSelectedCourse] = useState(() => {
    const saved = localStorage.getItem('studentSelectedCourse');
    return saved ? JSON.parse(saved) : null;
  });
  const [watchPercent, setWatchPercent] = useState(() => {
    const saved = localStorage.getItem('studentWatchPercent');
    return saved ? parseInt(saved) : 0;
  });
  const [showExam, setShowExam] = useState(() => {
    return localStorage.getItem('studentShowExam') === 'true';
  });
  const [examAnswers, setExamAnswers] = useState(() => {
    const saved = localStorage.getItem('studentExamAnswers');
    return saved ? JSON.parse(saved) : {};
  });
  const [examScore, setExamScore] = useState(() => {
    const saved = localStorage.getItem('studentExamScore');
    return saved && saved !== 'null' ? parseInt(saved) : null;
  });
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [generatedCertUrl, setGeneratedCertUrl] = useState('');
  const [myCertificates, setMyCertificates] = useState([]);
  
  // Dashboard Tabs: 'dashboard' | 'courses' | 'certificates' | 'profile' | 'settings'
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('studentActiveTab') || 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('studentActiveTab', tab);
  };
  
  // Settings Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      navigate('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
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

  const initYoutubePlayer = useCallback((videoId) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // Extract Video ID if full URL is provided
    let cleanVideoId = videoId;
    if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = videoId.match(regExp);
      if (match && match[2].length === 11) {
        cleanVideoId = match[2];
      }
    }

    try {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: cleanVideoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          controls: 1
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTrackingProgress();
            } else {
              stopTrackingProgress();
            }
          }
        }
      });
    } catch (err) {
      console.error('Error initializing YouTube Player:', err);
    }
  }, []);

  // YouTube Player progress tracking logic
  useEffect(() => {
    let checkYoutubeAPI;
    if (selectedCourse && selectedCourse.youtube_video_id) {
      checkYoutubeAPI = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initYoutubePlayer(selectedCourse.youtube_video_id);
          clearInterval(checkYoutubeAPI);
        }
      }, 500);
    }
    return () => {
      if (checkYoutubeAPI) clearInterval(checkYoutubeAPI);
      stopTrackingProgress();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [selectedCourse, initYoutubePlayer]);

  useEffect(() => {
    if (selectedCourse) {
      localStorage.setItem('studentSelectedCourse', JSON.stringify(selectedCourse));
    } else {
      localStorage.removeItem('studentSelectedCourse');
    }
  }, [selectedCourse]);

  useEffect(() => {
    localStorage.setItem('studentWatchPercent', watchPercent);
  }, [watchPercent]);

  useEffect(() => {
    localStorage.setItem('studentShowExam', showExam);
  }, [showExam]);

  useEffect(() => {
    localStorage.setItem('studentExamAnswers', JSON.stringify(examAnswers));
  }, [examAnswers]);

  useEffect(() => {
    if (examScore !== null) {
      localStorage.setItem('studentExamScore', examScore);
    } else {
      localStorage.removeItem('studentExamScore');
    }
  }, [examScore]);

  const startTrackingProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        if (duration > 0) {
          const percent = Math.floor((currentTime / duration) * 100);
          setWatchPercent(prev => Math.max(prev, percent));
        }
      }
    }, 1000);
  };

  const stopTrackingProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const closeCoursePlayer = () => {
    stopTrackingProgress();
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setSelectedCourse(null);
    setWatchPercent(0);
    setShowExam(false);
    setExamAnswers({});
    setExamScore(null);
    setGeneratedCertUrl('');
  };

  const handleOpenCoursePlayer = (course) => {
    setSelectedCourse(course);
    setWatchPercent(0);
    setShowExam(false);
    setExamAnswers({});
    setExamScore(null);
    setGeneratedCertUrl('');
  };

  const handleEvaluateExam = () => {
    if (!selectedCourse) return;
    const questions = selectedCourse.questions || [];
    let correctCount = 0;
    
    questions.forEach((q, index) => {
      if (examAnswers[index] === q.correct_option_index) {
        correctCount += 1;
      }
    });
    
    const score = questions.length > 0 ? Math.floor((correctCount / questions.length) * 100) : 100;
    setExamScore(score);
    
    const passingScore = selectedCourse.minAprobacion || selectedCourse.min_aprobacion || 80;
    if (score >= passingScore) {
      generateCertificate(score);
    } else {
      alert(`Tu calificación fue de ${score}%. Necesitas un mínimo de ${passingScore}% para aprobar. Vuelve a intentarlo.`);
      setExamAnswers({});
    }
  };

  const generateCertificate = async (scoreToUse = 100) => {
    if (!selectedCourse || !user) return;
    setIsGeneratingCert(true);
    try {
      const templateSrc = selectedCourse.certificado_template_url || 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png';
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = templateSrc;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar la plantilla del certificado.'));
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const x = selectedCourse.certificado_x || (canvas.width / 2);
      const y = selectedCourse.certificado_y || (canvas.height / 2);
      const fontSize = selectedCourse.certificado_font_size || 40;
      
      ctx.font = `bold ${fontSize}px Georgia, serif`;
      ctx.fillStyle = '#1B2B3C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const studentName = profile?.nombre_completo || user.user_metadata?.nombre_completo || user.email;
      ctx.fillText(studentName, x, y);
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      const folio = `FOL-${Math.floor(100000 + Math.random() * 900000)}`;
      const filePath = `${user.id}/${selectedCourse.id}_${folio}.png`;
      const dataUrl = canvas.toDataURL('image/png');
      
      let finalCertUrl = dataUrl;

      try {
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, blob, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('certificates')
          .getPublicUrl(filePath);
          
        finalCertUrl = publicUrl;

        const { error: dbError } = await supabase
          .from('certificates')
          .insert([{
            user_id: user.id,
            course_id: selectedCourse.id,
            pdf_url: publicUrl,
            folio: folio,
            score: scoreToUse
          }]);
          
        if (dbError) throw dbError;
        alert('¡Certificado generado y guardado en tu perfil con éxito!');
      } catch (uploadErr) {
        console.warn('Storage upload or DB insert failed. Falling back to local Base64 URL. Error:', uploadErr.message);
        alert('Aviso: No se pudo guardar el certificado en el servidor (asegúrate de crear el bucket "certificates" en Supabase). Podrás descargarlo directamente en tu navegador.');
      }
      
      setGeneratedCertUrl(finalCertUrl);
      try {
        await fetchMyCertificates();
      } catch (fErr) {
        console.warn('Could not fetch certificates from Supabase:', fErr.message);
      }
    } catch (err) {
      console.error('Error generating certificate:', err.message);
      alert('Error al generar certificado: ' + err.message);
    } finally {
      setIsGeneratingCert(false);
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
      case 'dashboard': return 'Dashboard';
      case 'explore': return 'Explorar Cursos';
      case 'courses': return 'Mis Cursos';
      case 'certificates': return 'Certificados';
      case 'profile': return 'Mi Perfil';
      case 'settings': return 'Configuración';
      default: return 'Portal HCE';
    }
  };

  const freeCourses = [];

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

  return (
    <div className="crm-layout">
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
              <div className="user-avatar-circle">
                {profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'}
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
              <div className="welcome-banner-card">
                <div className="welcome-avatar-wrapper">
                  <div className="welcome-avatar">
                    {profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'}
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
                    <h3 className="kpi-value">0</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper green">
                    <CheckSquare size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos Completados</span>
                    <h3 className="kpi-value">0</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper cyan">
                    <Award size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Certificados Obtenidos</span>
                    <h3 className="kpi-value">0</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper orange">
                    <TrendingUp size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos en Progreso</span>
                    <h3 className="kpi-value">0</h3>
                  </div>
                </div>
              </div>

              {/* Continue Learning - Empty State */}
              <div className="continue-learning-section">
                <h2>Continuar Aprendiendo</h2>
                <div className="crm-empty-state-card">
                  <Inbox size={48} className="empty-state-icon" />
                  <h3>Sin cursos activos</h3>
                  <p>Actualmente no tienes ninguna materia o diplomado inscrito en progreso.</p>
                  <button className="btn-crm-action solid btn-empty-state" onClick={() => setActiveTab('explore')}>
                    Explorar Cursos
                  </button>
                </div>
              </div>

              {/* Content Grid (Certificates, Recommendations, Activity) */}
              <div className="dashboard-grid" style={{ marginTop: '40px' }}>
                
                {/* Left Area */}
                <div className="dashboard-left-panel">
                  
                  {/* Recent Certificates - Empty State */}
                  <div className="sub-section-block">
                    <h2>Certificados Recientes</h2>
                    <div className="crm-empty-state-card mini">
                      <Award size={32} className="empty-state-icon" />
                      <h4>Sin certificados emitidos</h4>
                      <p>Tus diplomas se generarán una vez que completes y apruebes tus cursos.</p>
                    </div>
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
                  {catalogCourses.slice(0, 4).map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    const isDynamicCourse = !!course.youtube_video_id;
                    const CardElement = isDynamicCourse ? 'div' : Link;
                    const linkProps = isDynamicCourse ? {
                      onClick: () => handleOpenCoursePlayer(course),
                      style: { textDecoration: 'none', cursor: 'pointer' }
                    } : {
                      to: course.link,
                      style: { textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }
                    };
                    return (
                      <CardElement
                        key={course.id}
                        className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                        {...linkProps}
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
                              <span>{isComingSoon ? 'Próximamente' : isDynamicCourse ? 'Iniciar Curso' : 'Ver programa'}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </CardElement>
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
                <h3 className="catalog-subtitle">Matrículas Activas (0)</h3>
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
                <div className="free-courses-list">
                  {freeCourses.length === 0 ? (
                    <div className="crm-empty-state-card mini">
                      <PlayCircle size={32} className="empty-state-icon" />
                      <h4>Próximamente</h4>
                      <p>Estamos preparando contenido gratuito para ti. ¡Vuelve pronto!</p>
                    </div>
                  ) : freeCourses.map(fc => (
                    <a
                      key={fc.id}
                      href={fc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="free-course-row"
                    >
                      <div className="free-course-icon-wrap">
                        <PlayCircle size={22} />
                      </div>
                      <div className="free-course-info">
                        <h4>{fc.title}</h4>
                        <p>{fc.description}</p>
                      </div>
                      <div className="free-course-meta-right">
                        <span className="free-tag">GRATIS</span>
                        <span className="free-duration"><Clock size={13} /> {fc.duracion}</span>
                        <span className="free-tipo">{fc.tipo}</span>
                      </div>
                      <ArrowRight size={18} className="free-arrow" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Programas Premium */}
              <div className="catalog-courses-section-wrapper">
                <h3 className="catalog-subtitle">Programas de Alta Especialidad</h3>
                <div className="dash-exp-grid">
                  {catalogCourses.map(course => {
                    const Icon = typeof course.icon === 'function' ? course.icon : BookOpen;
                    const isComingSoon = course.badge?.toUpperCase() === 'PRÓXIMAMENTE';
                    const isDynamicCourse = !!course.youtube_video_id;
                    const CardElement = isDynamicCourse ? 'div' : Link;
                    const linkProps = isDynamicCourse ? {
                      onClick: () => handleOpenCoursePlayer(course),
                      style: { textDecoration: 'none', cursor: 'pointer' }
                    } : {
                      to: course.link,
                      style: { textDecoration: 'none', pointerEvents: isComingSoon ? 'none' : 'auto' }
                    };
                    return (
                      <CardElement
                        key={course.id}
                        className={`exp-premium-card${isComingSoon ? ' disabled-card' : ''}`}
                        {...linkProps}
                      >
                        <div className="card-glass-glow"></div>
                        <div className={`exp-img-container ${course.containerClass || ''}`}>
                          {course.badge && (
                            <div className={`status-badge ${course.badgeClass || ''}`}>{course.badge}</div>
                          )}
                          <img src={course.image} alt={course.title} className={`exp-main-img ${course.imgClass || ''}`} />
                          <div className="img-overlay-gradient"></div>
                          {Icon && (
                            <div className="card-floating-icon"><Icon size={24} /></div>
                          )}
                        </div>
                        <div className="exp-content-body">
                          <h3 className="exp-title-premium">{course.title}</h3>
                          <p className="exp-desc-premium">{course.description}</p>
                          <div className="exp-footer-premium">
                            <span className="exp-link-action">
                              <span>{isComingSoon ? 'Próximamente' : isDynamicCourse ? 'Iniciar Curso' : 'Ver programa'}</span>
                              {!isComingSoon && <ArrowRight size={18} />}
                            </span>
                          </div>
                        </div>
                      </CardElement>
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
                        <th>Expiración (30 días)</th>
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
                          <td>
                            <span style={{ color: '#EF4444', fontWeight: '500' }}>
                              {new Date(cert.expires_at).toLocaleDateString()}
                            </span>
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
                              <a 
                                href={cert.pdf_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-crm-action solid mini"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                              >
                                Descargar
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <div className="profile-big-avatar">
                      {profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <h3>{profile?.nombre_completo || 'Usuario HCE'}</h3>
                    <span className="user-role-badge">Estudiante</span>
                  </div>

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
                      <span className="info-value">{user?.user_metadata?.pais || 'No registrado'}</span>
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
                </div>

                {/* Academic Status Card */}
                <div className="academic-status-card">
                  <h3>Resumen Académico</h3>
                  <div className="academic-status-grid">
                    <div className="status-metric-box">
                      <span className="status-metric-number">0</span>
                      <span className="status-metric-label">Cursos Inscritos</span>
                    </div>
                    <div className="status-metric-box">
                      <span className="status-metric-number">0%</span>
                      <span className="status-metric-label">Avance Promedio</span>
                    </div>
                    <div className="status-metric-box">
                      <span className="status-metric-number">0</span>
                      <span className="status-metric-label">Certificados</span>
                    </div>
                  </div>
                  
                  <div className="active-enrollments-list" style={{ marginTop: '30px' }}>
                    <h4>Matrículas Activas</h4>
                    <div className="crm-empty-state-card mini">
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tienes matrículas activas en este momento.</p>
                    </div>
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

      {/* Course Player Modal */}
      {selectedCourse && (
        <div className="crm-modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="settings-card" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            padding: '30px',
            backgroundColor: 'var(--bg-white)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <button 
              type="button" 
              className="password-toggle-btn" 
              onClick={closeCoursePlayer}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: '#F1F5F9',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                lineHeight: '1'
              }}
            >
              &times;
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', color: 'var(--primary-cyan)' }}>
              {selectedCourse.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {selectedCourse.description}
            </p>

            {!showExam ? (
              <div>
                {/* VIDEO CONTAINER */}
                <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative', height: '400px' }}>
                  {selectedCourse.youtube_video_id ? (
                    <div id="youtube-player" style={{ width: '100%', height: '100%' }}></div>
                  ) : (
                    <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      Cargando reproductor de video...
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Avance del Video:</span>
                    <strong style={{ marginLeft: '8px', color: 'var(--primary-cyan)' }}>{watchPercent}%</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn-crm-action outlined"
                      onClick={() => {
                        setWatchPercent(100);
                        setShowExam(true);
                      }}
                    >
                      Bypass: Ya lo vi en vivo (Ir a Examen)
                    </button>

                    <button 
                      type="button" 
                      className="btn-crm-action solid"
                      disabled={watchPercent < 90}
                      onClick={() => setShowExam(true)}
                    >
                      Tomar Examen de Validación
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // EXAM CONTAINER
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-cyan)', marginBottom: '15px' }}>
                  Examen de Validación (Aprobación: {selectedCourse.minAprobacion || selectedCourse.min_aprobacion || 80}%)
                </h3>

                {!generatedCertUrl ? (
                  <div>
                    {selectedCourse.questions && selectedCourse.questions.length > 0 ? (
                      <div>
                        {selectedCourse.questions.map((q, qIndex) => (
                          <div key={q.id || qIndex} style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-gray)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <p style={{ fontWeight: '600', marginBottom: '10px' }}>{qIndex + 1}. {q.question_text}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {q.options.map((opt, optIndex) => (
                                <label 
                                  key={optIndex} 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px',
                                    background: 'var(--bg-white)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <input 
                                    type="radio" 
                                    name={`q-${qIndex}`}
                                    checked={examAnswers[qIndex] === optIndex}
                                    onChange={() => setExamAnswers({...examAnswers, [qIndex]: optIndex})}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                        <button 
                          type="button" 
                          className="btn-crm-action solid"
                          style={{ width: '100%', marginTop: '15px' }}
                          onClick={handleEvaluateExam}
                          disabled={isGeneratingCert}
                        >
                          {isGeneratingCert ? 'Evaluando y Generando Certificado...' : 'Enviar Respuestas'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Este curso no tiene examen definido por el administrador. Puedes generar tu certificado directamente.</p>
                        <button 
                          type="button" 
                          className="btn-crm-action solid"
                          style={{ marginTop: '15px' }}
                          onClick={() => generateCertificate(100)}
                          disabled={isGeneratingCert}
                        >
                          {isGeneratingCert ? 'Generando...' : 'Obtener Certificado'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // CERTIFICATE DOWNLOAD CONTAINER
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div style={{ color: '#10B981', fontSize: '3rem', marginBottom: '15px' }}>✓</div>
                    <h3>¡Felicitaciones! Has completado el curso</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>
                      Tu calificación fue de <strong>{examScore}%</strong>. Tu certificado ha sido emitido con éxito. Recuerda que este certificado expira en 30 días de forma automática.
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
                      {generatedCertUrl === 'local-simulated' ? (
                        <button 
                          type="button" 
                          className="btn-crm-action solid"
                          onClick={() => {
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
                            ctx.fillText(`Acreditación de: ${selectedCourse.title}`, 400, 360);
                            
                            const dataUrl = canvas.toDataURL('image/png');
                            const a = document.createElement('a');
                            a.href = dataUrl;
                            a.download = `Certificado_${selectedCourse.title.replace(/\s+/g, '_')}.png`;
                            a.click();
                          }}
                        >
                          Descargar Certificado
                        </button>
                      ) : generatedCertUrl?.startsWith('data:') ? (
                        <a 
                          href={generatedCertUrl} 
                          download={`Certificado_${selectedCourse.title.replace(/\s+/g, '_')}.png`}
                          className="btn-crm-action solid"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          Descargar Certificado
                        </a>
                      ) : (
                        <a 
                          href={generatedCertUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-crm-action solid"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          Descargar Certificado
                        </a>
                      )}

                      <button 
                        type="button" 
                        className="btn-crm-action outlined"
                        onClick={closeCoursePlayer}
                      >
                        Cerrar Aula
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
