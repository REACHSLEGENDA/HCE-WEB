import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle, 
  Sparkles,
  MessageSquare,
  CornerDownRight,
  Send,
  Trash2
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Classroom.css';

const Classroom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showToast, showAlert, showConfirm } = useNotification();

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const maxTimeWatchedRef = useRef(0);

  // Event-driven tracking refs to avoid 24/7 database heartbeats
  const initialTimeSpentRef = useRef(0);
  const accumulatedTimeSpentRef = useRef(0);
  const initialSessionDurationRef = useRef(0);
  const accumulatedSessionDurationRef = useRef(0);
  const activeSessionStartRef = useRef(null);

  // States
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogCourses, setCatalogCourses] = useState([]);

  // Classroom Comments/Doubts States
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Player progress & exam states
  const [watchPercent, setWatchPercent] = useState(0);
  const watchPercentRef = useRef(0);
  
  const [showExam, setShowExam] = useState(false);
  const [examAnswers, setExamAnswers] = useState({});
  const [examScore, setExamScore] = useState(null);

  // Load from localStorage when user or course id changes
  useEffect(() => {
    if (!user?.id) return;
    
    const wpKey = `watchPercent_${user.id}_${id}`;
    const seKey = `showExam_${user.id}_${id}`;
    const eaKey = `examAnswers_${user.id}_${id}`;
    const esKey = `examScore_${user.id}_${id}`;
    
    const savedWp = localStorage.getItem(wpKey);
    const initialWp = savedWp ? parseInt(savedWp) : 0;
    setWatchPercent(initialWp);
    watchPercentRef.current = initialWp;
    
    const savedSe = localStorage.getItem(seKey);
    setShowExam(savedSe === 'true');
    
    const savedEa = localStorage.getItem(eaKey);
    setExamAnswers(savedEa ? JSON.parse(savedEa) : {});
    
    const savedEs = localStorage.getItem(esKey);
    setExamScore(savedEs && savedEs !== 'null' ? parseInt(savedEs) : null);
  }, [user?.id, id]);

  useEffect(() => {
    watchPercentRef.current = watchPercent;
  }, [watchPercent]);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [generatedCertUrl, setGeneratedCertUrl] = useState('');

  // Reset maxTimeWatchedRef when course changes
  useEffect(() => {
    maxTimeWatchedRef.current = 0;
  }, [id]);

  // Define tracking callbacks first so they can be safely referenced by players
  const startTrackingProgress = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        if (duration > 0) {
          // Initialize maxTimeWatchedRef if it is 0 but we have saved progress
          if (maxTimeWatchedRef.current === 0 && watchPercentRef.current > 0) {
            maxTimeWatchedRef.current = (watchPercentRef.current / 100) * duration;
          }

          // Anti-cheat: prevent scrubbing past maxTimeWatched + 3s
          if (currentTime > maxTimeWatchedRef.current + 3) {
            playerRef.current.seekTo(maxTimeWatchedRef.current, true);
          } else {
            maxTimeWatchedRef.current = Math.max(maxTimeWatchedRef.current, currentTime);
            const percent = Math.floor((maxTimeWatchedRef.current / duration) * 100);
            setWatchPercent(prev => Math.max(prev, percent));
          }
        }
      }
    }, 1000);
  }, []);

  const stopTrackingProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Fetch course, questions, and all courses for recommendations
  useEffect(() => {
    const loadClassroomData = async () => {
      setLoading(true);
      try {
        // Fetch specific course
        const { data: c, error: cError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', Number(id))
          .single();
        if (cError) throw cError;

        // Fetch questions
        const { data: dbQuestions } = await supabase
          .from('questions')
          .select('*')
          .eq('course_id', c.id)
          .order('id', { ascending: true });

        const courseData = {
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

        setCourse(courseData);
        setQuestions(dbQuestions || []);
      } catch (err) {
        console.warn('Supabase fetch failed, trying local fallback:', err.message);
        const saved = localStorage.getItem('courses');
        if (saved) {
          const coursesList = JSON.parse(saved);
          const found = coursesList.find(c => Number(c.id) === Number(id));
          if (found) {
            setCourse(found);
            setQuestions(found.questions || []);
          }
        }
      }

      // Fetch all courses for recommendations
      try {
        const { data: dbCourses } = await supabase
          .from('courses')
          .select('*')
          .order('id', { ascending: true });
        if (dbCourses) {
          setCatalogCourses(dbCourses.filter(c => c.activo !== false));
        } else {
          const saved = localStorage.getItem('courses');
          setCatalogCourses(saved ? JSON.parse(saved) : []);
        }
      } catch {
        const saved = localStorage.getItem('courses');
        setCatalogCourses(saved ? JSON.parse(saved) : []);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadClassroomData();
    }
  }, [id]);

  // Classroom Comments/Doubts Logic
  const fetchComments = useCallback(async () => {
    if (!course?.id) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('classroom_comments')
        .select(`
          id,
          course_id,
          user_id,
          content,
          parent_id,
          created_at,
          profiles:user_id (
            nombre_completo,
            avatar_url,
            rol,
            grado,
            pais
          )
        `)
        .eq('course_id', course.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
      
      // Save backup
      localStorage.setItem(`backup_classroom_comments_${course.id}`, JSON.stringify(data || []));
    } catch (err) {
      console.warn('Error fetching classroom comments, using fallback:', err.message);
      const backup = localStorage.getItem(`backup_classroom_comments_${course.id}`);
      if (backup) {
        setComments(JSON.parse(backup));
      } else {
        setComments([]);
      }
    } finally {
      setLoadingComments(false);
    }
  }, [course?.id]);

  useEffect(() => {
    if (course?.id) {
      fetchComments();
    }
  }, [course?.id, fetchComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !course) return;
    setSubmittingComment(true);

    const commentData = {
      course_id: course.id,
      user_id: user.id,
      content: newComment,
      parent_id: null
    };

    try {
      const { error } = await supabase
        .from('classroom_comments')
        .insert([commentData]);

      if (error) throw error;
      showToast('Pregunta publicada con éxito', 'success');
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.warn('Failed to insert classroom comment, using local fallback:', err.message);
      
      // Fallback local
      const localComment = {
        id: 'local_' + Date.now(),
        course_id: course.id,
        user_id: user.id,
        content: newComment,
        parent_id: null,
        created_at: new Date().toISOString(),
        profiles: {
          nombre_completo: profile?.nombre_completo || user.user_metadata?.nombre_completo || user.email,
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
          rol: profile?.rol || 'estudiante',
          grado: profile?.grado,
          pais: profile?.pais
        }
      };

      const backup = localStorage.getItem(`backup_classroom_comments_${course.id}`);
      const list = backup ? JSON.parse(backup) : [];
      const updatedList = [...list, localComment];
      localStorage.setItem(`backup_classroom_comments_${course.id}`, JSON.stringify(updatedList));
      setComments(updatedList);
      
      showToast('Pregunta guardada localmente', 'success');
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (e, parentId) => {
    e.preventDefault();
    if (!course || !user) return;
    const replyText = replyTexts[parentId] || '';
    if (!replyText.trim()) return;
    setSubmittingComment(true);

    const replyData = {
      course_id: course.id,
      user_id: user.id,
      content: replyText,
      parent_id: parentId
    };

    try {
      const { error } = await supabase
        .from('classroom_comments')
        .insert([replyData]);

      if (error) throw error;
      showToast('Respuesta publicada con éxito', 'success');
      setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
      setActiveReplyBox(null);
      fetchComments();
    } catch (err) {
      console.warn('Failed to insert reply, using local fallback:', err.message);
      
      // Fallback local
      const localReply = {
        id: 'local_' + Date.now(),
        course_id: course.id,
        user_id: user.id,
        content: replyText,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        profiles: {
          nombre_completo: profile?.nombre_completo || user.user_metadata?.nombre_completo || user.email,
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
          rol: profile?.rol || 'estudiante',
          grado: profile?.grado,
          pais: profile?.pais
        }
      };

      const backup = localStorage.getItem(`backup_classroom_comments_${course.id}`);
      const list = backup ? JSON.parse(backup) : [];
      const updatedList = [...list, localReply];
      localStorage.setItem(`backup_classroom_comments_${course.id}`, JSON.stringify(updatedList));
      setComments(updatedList);
      
      showToast('Respuesta guardada localmente', 'success');
      setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
      setActiveReplyBox(null);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!course) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      const isOwnComment = user && comment.user_id === user.id;
      const isAdmin = profile && profile.rol === 'admin';
      const isWithin5Minutes = comment.created_at ? (new Date().getTime() - new Date(comment.created_at).getTime()) / (1000 * 60) <= 5 : true;
      
      if (!isAdmin && (!isOwnComment || !isWithin5Minutes)) {
        showToast('Solo puedes eliminar comentarios creados en los últimos 5 minutos', 'error');
        return;
      }
    }

    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este comentario?', 'Confirmar Eliminación');
    if (!confirmed) return;

    try {
      if (typeof commentId === 'string' && commentId.startsWith('local_')) {
        const backup = localStorage.getItem(`backup_classroom_comments_${course.id}`);
        if (backup) {
          const list = JSON.parse(backup);
          const updatedList = list.filter(item => item.id !== commentId);
          localStorage.setItem(`backup_classroom_comments_${course.id}`, JSON.stringify(updatedList));
          setComments(updatedList);
        }
        showToast('Comentario eliminado', 'success');
        return;
      }

      const { error } = await supabase
        .from('classroom_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      showToast('Comentario eliminado con éxito', 'success');
      fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('No se pudo eliminar el comentario', 'error');
    }
  };

  // YouTube API Script loading
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const initYoutubePlayer = useCallback((videoId) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    let cleanVideoId = videoId;
    if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = videoId.match(regExp);
      if (match && match[2].length === 11) {
        cleanVideoId = match[2];
      }
    }

    try {
      playerRef.current = new window.YT.Player('youtube-classroom-player', {
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
  }, [startTrackingProgress, stopTrackingProgress]);

  useEffect(() => {
    let checkYoutubeAPI;
    if (course && course.youtube_video_id && !showExam) {
      checkYoutubeAPI = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initYoutubePlayer(course.youtube_video_id);
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
  }, [course, showExam, initYoutubePlayer, stopTrackingProgress]);

  // Persist local player states
  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`watchPercent_${user.id}_${id}`, watchPercent);
  }, [watchPercent, id, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`showExam_${user.id}_${id}`, showExam);
  }, [showExam, id, user?.id]);

  // Sincronizar progreso con Supabase y localStorage para administración
  useEffect(() => {
    if (!user?.id || !course?.id) return;

    const syncProgress = async () => {
      const totalTimeSpent = initialTimeSpentRef.current + accumulatedTimeSpentRef.current;

      try {
        const allKey = 'backup_all_student_progress';
        const savedAll = localStorage.getItem(allKey);
        const allProgress = savedAll ? JSON.parse(savedAll) : {};
        
        const progressKey = `${user.id}_${course.id}`;
        allProgress[progressKey] = {
          user_id: user.id,
          course_id: course.id,
          watch_percent: watchPercent,
          time_spent: totalTimeSpent,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(allKey, JSON.stringify(allProgress));
      } catch (err) {
        console.warn('Error saving local progress:', err);
      }

      try {
        await supabase
          .from('student_progress')
          .upsert({
            user_id: user.id,
            course_id: course.id,
            watch_percent: watchPercent,
            time_spent: totalTimeSpent,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' });
      } catch (err) {
        // Fail silently
      }
    };

    const timer = setTimeout(syncProgress, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, course?.id, watchPercent]);

  // Heartbeat para registrar la actividad de la clase en vivo y acumular tiempo de estudio por curso
  useEffect(() => {
    if (!user?.id || !course?.id || !course?.title) return;

    // Reset session track refs for this course
    activeSessionStartRef.current = Date.now();
    accumulatedTimeSpentRef.current = 0;
    accumulatedSessionDurationRef.current = 0;
    initialTimeSpentRef.current = 0;
    initialSessionDurationRef.current = 0;

    const getActionText = () => {
      if (showExam) {
        return `Realizando examen de: ${course.title}`;
      }
      return `Estudiando curso: ${course.title}`;
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

    const loadInitialDurations = async () => {
      let initTimeSpent = 0;
      try {
        const progressKey = `${user.id}_${course.id}`;
        const allProgKey = 'backup_all_student_progress';
        const savedProg = localStorage.getItem(allProgKey);
        if (savedProg) {
          const allProgress = JSON.parse(savedProg);
          if (allProgress[progressKey]) {
            initTimeSpent = allProgress[progressKey].time_spent || 0;
          }
        }
      } catch (e) {}

      try {
        const { data: dbProg } = await supabase
          .from('student_progress')
          .select('time_spent')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .maybeSingle();
        if (dbProg && dbProg.time_spent > initTimeSpent) {
          initTimeSpent = dbProg.time_spent;
        }
      } catch (e) {}
      initialTimeSpentRef.current = initTimeSpent;

      let initSessionDuration = 0;
      try {
        const allKey = 'backup_all_student_activities';
        const savedAll = localStorage.getItem(allKey);
        if (savedAll) {
          const allActs = JSON.parse(savedAll);
          if (allActs[user.id]) {
            initSessionDuration = allActs[user.id].session_duration || 0;
          }
        }
      } catch (e) {}

      try {
        const { data: dbAct } = await supabase
          .from('student_activity')
          .select('session_duration')
          .eq('user_id', user.id)
          .maybeSingle();
        if (dbAct && dbAct.session_duration > initSessionDuration) {
          initSessionDuration = dbAct.session_duration;
        }
      } catch (e) {}
      initialSessionDurationRef.current = initSessionDuration;
    };

    // Updates student_activity to mark user online (without modifying session duration)
    const saveActiveState = async () => {
      const action = getActionText();
      const { browser, device } = getBrowserAndOS();
      const ip = getMockIP(user.id);

      try {
        const allKey = 'backup_all_student_activities';
        const savedAll = localStorage.getItem(allKey);
        const allActivities = savedAll ? JSON.parse(savedAll) : {};
        
        allActivities[user.id] = {
          ...allActivities[user.id],
          user_id: user.id,
          last_active_at: new Date().toISOString(),
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

      try {
        await supabase
          .from('student_activity')
          .upsert({
            user_id: user.id,
            last_active_at: new Date().toISOString(),
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

    // Calculate elapsed time, add to accumulated totals, and sync both tables to DB
    const syncProgressAndActivity = async (isOnlineState) => {
      let elapsedSeconds = 0;
      if (activeSessionStartRef.current !== null) {
        elapsedSeconds = Math.round((Date.now() - activeSessionStartRef.current) / 1000);
        if (elapsedSeconds > 0) {
          accumulatedTimeSpentRef.current += elapsedSeconds;
          accumulatedSessionDurationRef.current += elapsedSeconds;
        }
        activeSessionStartRef.current = isOnlineState ? Date.now() : null;
      }

      const totalTimeSpent = initialTimeSpentRef.current + accumulatedTimeSpentRef.current;
      const totalSessionDuration = initialSessionDurationRef.current + accumulatedSessionDurationRef.current;
      
      const action = isOnlineState ? getActionText() : 'Desconectado';
      const lastActive = isOnlineState ? new Date().toISOString() : new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { browser, device } = getBrowserAndOS();
      const ip = getMockIP(user.id);

      try {
        const allKey = 'backup_all_student_activities';
        const savedAll = localStorage.getItem(allKey);
        const allActivities = savedAll ? JSON.parse(savedAll) : {};
        
        allActivities[user.id] = {
          user_id: user.id,
          session_duration: totalSessionDuration,
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

      try {
        await supabase
          .from('student_activity')
          .upsert({
            user_id: user.id,
            session_duration: totalSessionDuration,
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

      try {
        const progressKey = `${user.id}_${course.id}`;
        const allProgKey = 'backup_all_student_progress';
        const savedProg = localStorage.getItem(allProgKey);
        const allProgress = savedProg ? JSON.parse(savedProg) : {};
        
        allProgress[progressKey] = {
          user_id: user.id,
          course_id: course.id,
          watch_percent: watchPercentRef.current,
          time_spent: totalTimeSpent,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem(allProgKey, JSON.stringify(allProgress));
      } catch (err) {
        console.warn('Error saving local progress:', err);
      }

      try {
        await supabase
          .from('student_progress')
          .upsert({
            user_id: user.id,
            course_id: course.id,
            watch_percent: watchPercentRef.current,
            time_spent: totalTimeSpent,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' });
      } catch (err) {
        // Fail silently
      }
    };

    // Load initial data and connect immediately
    loadInitialDurations().then(() => {
      saveActiveState();
    });

    const handleBeforeUnload = () => {
      syncProgressAndActivity(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      syncProgressAndActivity(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, course?.id, course?.title, showExam]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`examAnswers_${user.id}_${id}`, JSON.stringify(examAnswers));
  }, [examAnswers, id, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const esKey = `examScore_${user.id}_${id}`;
    if (examScore !== null) {
      localStorage.setItem(esKey, examScore);
    } else {
      localStorage.removeItem(esKey);
    }
  }, [examScore, id, user?.id]);

  const handleEvaluateExam = () => {
    if (!course) return;
    const qList = questions || [];
    let correctCount = 0;
    
    qList.forEach((q, index) => {
      if (examAnswers[index] === q.correct_option_index) {
        correctCount += 1;
      }
    });
    
    const score = qList.length > 0 ? Math.floor((correctCount / qList.length) * 100) : 100;
    setExamScore(score);
    
    const passingScore = course.minAprobacion || course.min_aprobacion || 80;
    if (score >= passingScore) {
      generateCertificate(score);
    } else {
      showAlert(`Tu calificación fue de ${score}%. Necesitas un mínimo de ${passingScore}% para aprobar. Vuelve a intentarlo.`, 'Examen no aprobado');
      setExamAnswers({});
    }
  };

  const generateCertificate = async (scoreToUse = 100) => {
    if (!course || !user) return;
    setIsGeneratingCert(true);
    try {
      const templateSrc = course.certificado_template_url || 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png';
      
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
      
      const x = course.certificado_x || (canvas.width / 2);
      const y = course.certificado_y || (canvas.height / 2);
      const fontSize = course.certificado_font_size || 40;
      
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
      const filePath = `${user.id}/${course.id}_${folio}.png`;
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
            course_id: course.id,
            pdf_url: publicUrl,
            folio: folio,
            score: scoreToUse
          }]);
          
        if (dbError) throw dbError;
        showToast('¡Certificado generado y guardado en tu perfil con éxito!', 'success');
      } catch (uploadErr) {
        console.warn('Storage upload or DB insert failed. Falling back to local Base64 URL. Error:', uploadErr.message);
        showToast('No se pudo guardar el certificado en el servidor. Podrás descargarlo directamente.', 'warning');
      }
      
      setGeneratedCertUrl(finalCertUrl);
    } catch (err) {
      console.error('Error generating certificate:', err.message);
      showAlert('Error al generar certificado: ' + err.message, 'Error');
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!course) return;
    const filename = `Certificado_${course.title.replace(/\s+/g, '_')}.png`;

    if (generatedCertUrl === 'local-simulated') {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 800, 600);
      ctx.font = 'bold 36px Georgia, serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email, 400, 300);
      ctx.font = '20px Georgia, serif';
      ctx.fillText(`Acreditación de: ${course.title}`, 400, 360);
      
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
      return;
    }

    try {
      const response = await fetch(generatedCertUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Fetch download failed, falling back to window.open:', err);
      window.open(generatedCertUrl, '_blank');
    }
  };

  const getFirstName = () => {
    if (!profile?.nombre_completo) return 'Alumno';
    return profile.nombre_completo.split(' ')[0];
  };

  if (loading) {
    return (
      <div className="classroom-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#00bcd4', fontWeight: 'bold', fontSize: '1.2rem' }}>Cargando Aula de Aprendizaje HCE...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="classroom-layout" style={{ justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Curso no encontrado</h2>
        <p style={{ color: '#64748b', marginTop: '10px', marginBottom: '20px' }}>El programa seleccionado no existe o no se encuentra disponible.</p>
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={16} /> Volver al Portal
        </button>
      </div>
    );
  }

  // Filter recommended courses sharing same category ID
  const recommendedCourses = catalogCourses.filter(
    c => c.category_id === course.category_id && c.id !== course.id && c.activo !== false
  );

  return (
    <div className="classroom-layout">
      {/* Navbar Header */}
      <header className="classroom-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <ArrowLeft size={16} /> Volver al Portal
          </button>
          <img src="/assets/componentes/firma-hce.png" alt="HCE Logo" className="header-logo" />
        </div>
        <div className="header-right">
          <div className="classroom-user-profile">
            <span style={{ fontSize: '0.9rem' }}>Estás cursando como <strong>{getFirstName()}</strong></span>
            <div className="classroom-user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user?.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="classroom-container">
        <div className="classroom-grid">
          
          {/* Main Column: Player / Exam / Congratulations */}
          <div className="classroom-player-section">
            
            {!showExam ? (
              // Video player card
              <div className="classroom-video-card">
                <div className="video-container-wrapper">
                  {course.youtube_video_id ? (
                    <div id="youtube-classroom-player" className="video-iframe-target"></div>
                  ) : (
                    <div className="video-loading-placeholder">
                      Cargando reproductor de video...
                    </div>
                  )}
                </div>

                <div className="classroom-player-controls">
                  <div className="classroom-progress-info">
                    <span className="progress-label">Avance del Video:</span>
                    <span className="progress-value">{watchPercent}%</span>
                  </div>

                  <div className="classroom-btn-actions">
                    <button 
                      type="button" 
                      onClick={() => {
                        setWatchPercent(100);
                        setShowExam(true);
                      }}
                      className="back-btn"
                      style={{ background: 'transparent', color: '#64748b', borderColor: '#cbd5e1' }}
                    >
                      Bypass: Ya lo vi en vivo
                    </button>
                    <button 
                      type="button" 
                      disabled={watchPercent < 90}
                      onClick={() => setShowExam(true)}
                      className="back-btn"
                      style={{ 
                        background: watchPercent >= 90 ? '#00bcd4' : '#94a3b8', 
                        color: '#fff', 
                        borderColor: watchPercent >= 90 ? '#00bcd4' : '#94a3b8',
                        cursor: watchPercent >= 90 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Tomar Examen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Exam / Congratulations View
              <div>
                {!generatedCertUrl ? (
                  // Exam sheet card
                  <div className="exam-container-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                      <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: '700', fontFamily: 'Sora, sans-serif' }}>
                        Examen de Acreditación (Mínimo: {course.minAprobacion || course.min_aprobacion || 80}%)
                      </h3>
                      <button onClick={() => setShowExam(false)} className="back-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Volver al Video
                      </button>
                    </div>

                    {questions.length > 0 ? (
                      <div>
                        {questions.map((q, qIndex) => (
                          <div key={q.id || qIndex} className="question-block">
                            <p className="question-text">{qIndex + 1}. {q.question_text}</p>
                            <div className="options-grid">
                              {q.options.map((opt, optIndex) => (
                                <label key={optIndex} className="option-label">
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
                          className="back-btn"
                          style={{ width: '100%', background: '#00bcd4', borderColor: '#00bcd4', color: '#fff', padding: '14px', fontSize: '1rem', justifyContent: 'center' }}
                          onClick={handleEvaluateExam}
                          disabled={isGeneratingCert}
                        >
                          {isGeneratingCert ? 'Evaluando y Generando Certificado...' : 'Enviar Respuestas'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>Este curso no tiene examen definido por el administrador. Puedes generar tu certificado directamente.</p>
                        <button 
                          type="button" 
                          className="back-btn"
                          style={{ background: '#00bcd4', borderColor: '#00bcd4', color: '#fff', padding: '12px 24px' }}
                          onClick={() => generateCertificate(100)}
                          disabled={isGeneratingCert}
                        >
                          {isGeneratingCert ? 'Generando...' : 'Obtener Certificado'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Congratulations & recommended courses card
                  <div className="exam-container-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: '#10b981', fontSize: '3.5rem', marginBottom: '16px' }}>✓</div>
                    <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 10px 0' }}>¡Felicitaciones! Has completado el curso</h3>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 30px auto', lineHeight: '1.5' }}>
                      Tu calificación fue de <strong>{examScore}%</strong>. Tu certificado ha sido emitido con éxito. El certificado expira automáticamente en 30 días.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        className="back-btn"
                        style={{ background: '#00bcd4', borderColor: '#00bcd4', color: '#fff', cursor: 'pointer' }}
                        onClick={handleDownloadCertificate}
                      >
                        Descargar Certificado
                      </button>
                      
                      <button onClick={() => navigate('/dashboard')} className="back-btn">
                        Volver al Dashboard
                      </button>
                    </div>

                    {/* Recommendations in stand-alone classroom */}
                    {recommendedCourses.length > 0 && (
                      <div className="classroom-recs-wrapper" style={{ textAlign: 'left' }}>
                        <h4 style={{ fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Sora, sans-serif', fontWeight: '700', margin: '0 0 16px 0' }}>
                          <Sparkles size={18} style={{ color: '#00bcd4' }} />
                          Sigue aprendiendo: Cursos recomendados para ti
                        </h4>
                        <div className="recs-grid">
                          {recommendedCourses.map(rec => (
                            <Link 
                              key={rec.id}
                              to={`/classroom/${rec.id}`}
                              onClick={() => {
                                // Reset states on click
                                setWatchPercent(0);
                                setShowExam(false);
                                setExamAnswers({});
                                setExamScore(null);
                                setGeneratedCertUrl('');
                                maxTimeWatchedRef.current = 0;
                              }}
                              className="classroom-rec-card"
                            >
                              <img 
                                src={rec.image_url || rec.image || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=300&q=80'} 
                                alt={rec.title} 
                                className="classroom-rec-img" 
                              />
                              <div className="classroom-rec-info">
                                <h5 className="classroom-rec-title">{rec.title}</h5>
                                <span className="classroom-rec-meta">{rec.duracion || 'Sin duración'} • {rec.modalidad || 'Online'}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Classroom Doubts and Feedback Section */}
            <div className="classroom-doubts-card">
              <div className="doubts-header">
                <MessageSquare size={20} className="doubts-icon" style={{ color: '#00bcd4' }} />
                <h3>Dudas y Retroalimentación</h3>
              </div>
              <p className="doubts-intro">
                ¿Tienes alguna pregunta sobre este tema? Escríbela aquí y los docentes u otros alumnos te responderán.
              </p>

              {/* Form to submit a new question */}
              <form onSubmit={handleAddComment} className="doubts-form">
                <textarea
                  rows="3"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe tu pregunta o duda..."
                  required
                ></textarea>
                <div className="doubts-form-footer">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="back-btn doubts-submit-btn"
                  >
                    <Send size={14} />
                    {submittingComment ? 'Publicando...' : 'Hacer Pregunta'}
                  </button>
                </div>
              </form>

              {/* List of comments */}
              {loadingComments ? (
                <div className="doubts-loading">
                  <div className="spinner-mini"></div>
                  <span>Cargando comentarios...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="doubts-empty">
                  <MessageSquare size={32} />
                  <p>No hay preguntas aún. ¡Sé el primero en preguntar!</p>
                </div>
              ) : (
                <div className="doubts-list">
                  {comments
                    .filter(c => c.parent_id === null)
                    .map(q => {
                      const qAuthor = q.profiles || {};
                      const qAuthorName = qAuthor.nombre_completo || 'Usuario HCE';
                      const qAuthorAvatar = qAuthor.avatar_url;
                      const qAuthorRol = qAuthor.rol || 'estudiante';
                      const qAuthorGrado = qAuthor.grado;
                      const qAuthorPais = qAuthor.pais;
                      
                      const isQAuthorAdmin = qAuthorRol === 'admin';
                      const isQAuthorInstructor = qAuthorRol === 'instructor';
                      
                      const isWithin5MinutesQ = q.created_at ? (new Date().getTime() - new Date(q.created_at).getTime()) / (1000 * 60) <= 5 : true;
                      const canDeleteQ = user && ((q.user_id === user.id && isWithin5MinutesQ) || (profile && profile.rol === 'admin'));

                      // Get replies for this comment
                      const qReplies = comments.filter(c => c.parent_id === q.id);

                      return (
                        <div key={q.id} className="doubt-thread">
                          {/* Main Question Card */}
                          <div className="doubt-comment-card main-question">
                            <div className="comment-meta">
                              <div className="comment-avatar">
                                {qAuthorAvatar ? (
                                  <img src={qAuthorAvatar} alt="Avatar" />
                                ) : (
                                  qAuthorName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="comment-author-details">
                                <div className="comment-author-name-row">
                                  <span className="comment-author-name">{qAuthorName}</span>
                                  {isQAuthorAdmin && <span className="comment-role-badge admin">Admin</span>}
                                  {isQAuthorInstructor && <span className="comment-role-badge instructor">Docente</span>}
                                  {qAuthorPais && <span className="comment-country">({qAuthorPais})</span>}
                                </div>
                                <span className="comment-author-subtitle">
                                  {qAuthorGrado || 'Alumno'}
                                </span>
                              </div>
                              
                              {canDeleteQ && (
                                <button 
                                  onClick={() => handleDeleteComment(q.id)} 
                                  className="comment-delete-btn"
                                  title="Eliminar duda"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="comment-content">
                              {q.content}
                            </div>
                            <div className="comment-footer">
                              <span className="comment-date">
                                {new Date(q.created_at).toLocaleDateString('es-MX', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                              <button 
                                onClick={() => setActiveReplyBox(activeReplyBox === q.id ? null : q.id)}
                                className="comment-reply-toggle-btn"
                              >
                                Responder
                              </button>
                            </div>
                          </div>

                          {/* Replies List */}
                          {qReplies.length > 0 && (
                            <div className="replies-container">
                              {qReplies.map(r => {
                                const rAuthor = r.profiles || {};
                                const rAuthorName = rAuthor.nombre_completo || 'Usuario HCE';
                                const rAuthorAvatar = rAuthor.avatar_url;
                                const rAuthorRol = rAuthor.rol || 'estudiante';
                                const rAuthorGrado = rAuthor.grado;
                                const rAuthorPais = rAuthor.pais;
                                
                                const isRAuthorAdmin = rAuthorRol === 'admin';
                                const isRAuthorInstructor = rAuthorRol === 'instructor';
                                
                                const isWithin5MinutesR = r.created_at ? (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60) <= 5 : true;
                                const canDeleteR = user && ((r.user_id === user.id && isWithin5MinutesR) || (profile && profile.rol === 'admin'));

                                return (
                                  <div key={r.id} className="reply-item">
                                    <CornerDownRight className="reply-arrow" size={16} />
                                    <div className="doubt-comment-card reply-card">
                                      <div className="comment-meta">
                                        <div className="comment-avatar mini">
                                          {rAuthorAvatar ? (
                                            <img src={rAuthorAvatar} alt="Avatar" />
                                          ) : (
                                            rAuthorName.charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <div className="comment-author-details">
                                          <div className="comment-author-name-row">
                                            <span className="comment-author-name">{rAuthorName}</span>
                                            {isRAuthorAdmin && <span className="comment-role-badge admin">Admin</span>}
                                            {isRAuthorInstructor && <span className="comment-role-badge instructor">Docente</span>}
                                            {rAuthorPais && <span className="comment-country">({rAuthorPais})</span>}
                                          </div>
                                          <span className="comment-author-subtitle">
                                            {rAuthorGrado || 'Alumno'}
                                          </span>
                                        </div>
                                        
                                        {canDeleteR && (
                                          <button 
                                            onClick={() => handleDeleteComment(r.id)} 
                                            className="comment-delete-btn"
                                            title="Eliminar respuesta"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>
                                      <div className="comment-content">
                                        {r.content}
                                      </div>
                                      <div className="comment-footer">
                                        <span className="comment-date">
                                          {new Date(r.created_at).toLocaleDateString('es-MX', {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Box */}
                          {activeReplyBox === q.id && (
                            <form onSubmit={(e) => handleAddReply(e, q.id)} className="reply-form">
                              <CornerDownRight className="reply-arrow" size={16} />
                              <div className="reply-textarea-wrapper">
                                <textarea
                                  rows="2"
                                  value={replyTexts[q.id] || ''}
                                  onChange={(e) => setReplyTexts({ ...replyTexts, [q.id]: e.target.value })}
                                  placeholder="Escribe tu respuesta..."
                                  required
                                ></textarea>
                                <button
                                  type="submit"
                                  disabled={submittingComment || !(replyTexts[q.id] || '').trim()}
                                  className="back-btn reply-submit-btn"
                                >
                                  <Send size={12} />
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Detailed course information */}
          <div className="classroom-info-sidebar">
            <div className="classroom-card">
              <h1>{course.title}</h1>
              <div className="classroom-description">{course.description}</div>
              
              <div className="classroom-meta-list">
                <div className="classroom-meta-item">
                  <span className="meta-label">Duración</span>
                  <span className="meta-value"><Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {course.duracion}</span>
                </div>
                <div className="classroom-meta-item">
                  <span className="meta-label">Modalidad</span>
                  <span className="meta-value">{course.modalidad}</span>
                </div>
                {course.requisitos && (
                  <div className="classroom-meta-item">
                    <span className="meta-label">Requisitos</span>
                    <span className="meta-value">{course.requisitos}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar recommendations */}
            {recommendedCourses.length > 0 && (
              <div className="classroom-card">
                <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: '#00bcd4' }} />
                  Cursos relacionados
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recommendedCourses.map(rec => (
                    <Link
                      key={rec.id}
                      to={`/classroom/${rec.id}`}
                      onClick={() => {
                        setWatchPercent(0);
                        setShowExam(false);
                        setExamAnswers({});
                        setExamScore(null);
                        setGeneratedCertUrl('');
                        maxTimeWatchedRef.current = 0;
                      }}
                      className="classroom-rec-card"
                      style={{ flexDirection: 'row' }}
                    >
                      <img
                        src={rec.image_url || rec.image || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=300&q=80'}
                        alt={rec.title}
                        className="classroom-rec-img"
                      />
                      <div className="classroom-rec-info">
                        <h5 className="classroom-rec-title">{rec.title}</h5>
                        <span className="classroom-rec-meta">{rec.duracion || 'Sin duración'} • {rec.modalidad || 'Online'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Classroom;
