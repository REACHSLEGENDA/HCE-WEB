import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';
import { useInView } from 'react-intersection-observer';
import { 
  MessageSquare, 
  Quote, 
  Star, 
  CheckCircle, 
  Send, 
  Trash2, 
  LogIn,
  Heart,
  Stethoscope,
  HeartPulse,
  Gamepad2,
  PlayCircle,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { getFlagUrl } from '../data/countries';
import './Comunidad.css';

const DEFAULT_TESTIMONIALS = [];

const FORUM_CATEGORIES = [
  { id: 'Insuficiencia Cardiaca', label: 'Manejo de Avanzada en Insuficiencia Cardíaca', icon: Heart, desc: 'Soporte e insuficiencia cardíaca avanzada' },
  { id: 'ECMO Nursing Care', label: 'ECMO Nursing Care', icon: Stethoscope, desc: 'Cuidado crítico de enfermería en ECMO' },
  { id: 'Paris Diploma ECMO', label: 'Paris International Diploma in ECMO', icon: HeartPulse, desc: 'Diploma internacional de París en ECMO' },
  { id: 'ECMO SIM', label: 'Simulador ECMO SIM', icon: Gamepad2, desc: 'Entrenamiento interactivo y simulador clínico' },
  { id: 'Webinars portal', label: 'Webinars portal', icon: PlayCircle, desc: 'Webinars en vivo y educación continua' },
  { id: 'Entrenamiento Intrahospitalario In Situ', label: 'Entrenamiento Intrahospitalario In Situ', icon: Users, desc: 'Capacitación y simulación in situ en hospitales' }
];

const Comunidad = () => {
  useSEO({
    title: 'Testimonios y Comunidad HCE',
    description: 'Foro de discusión académica. Lee las opiniones y testimonios de nuestros alumnos e instructores sobre los diplomados y simuladores de HCE.',
    keywords: 'testimonios ecmo, foro medico ecmo, comunidad hce, opiniones cursos ecmo'
  });

  const { user, profile } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const [forumCategory, setForumCategory] = useState('Insuficiencia Cardiaca');
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTestimonials = useCallback(async (category) => {
    setTestimonialsLoading(true);
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select(`
          id,
          user_id,
          experience,
          content,
          rating,
          created_at,
          profiles:user_id (
            nombre_completo,
            avatar_url,
            pais,
            grado,
            cargo,
            institucion
          )
        `)
        .eq('experience', category)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter default seed testimonials for this category
      const categoryDefaults = DEFAULT_TESTIMONIALS.filter(t => t.experience === category);
      
      // Combine database results with defaults
      const combined = [...(data || []), ...categoryDefaults];
      setTestimonials(combined);

      // Save local backup
      localStorage.setItem(`backup_testimonials_${category}`, JSON.stringify(data || []));
    } catch (err) {
      console.warn('Error fetching testimonials from database, using fallback:', err.message);
      const backup = localStorage.getItem(`backup_testimonials_${category}`);
      const categoryDefaults = DEFAULT_TESTIMONIALS.filter(t => t.experience === category);
      
      if (backup) {
        setTestimonials([...JSON.parse(backup), ...categoryDefaults]);
      } else {
        setTestimonials(categoryDefaults);
      }
    } finally {
      setTestimonialsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials(forumCategory);
  }, [forumCategory, fetchTestimonials]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);

    const testimonialData = {
      user_id: user?.id,
      experience: forumCategory,
      content: newComment,
      rating: newRating
    };

    try {
      const { error } = await supabase
        .from('testimonials')
        .insert([testimonialData]);

      if (error) throw error;
      
      showToast('Comentario publicado con éxito', 'success');
      setNewComment('');
      setNewRating(5);
      fetchTestimonials(forumCategory);
    } catch (err) {
      console.warn('Failed to insert in database, using local fallback:', err.message);
      
      // Save locally
      const localItem = {
        id: 'local_' + Date.now(),
        user_id: user?.id,
        experience: forumCategory,
        content: newComment,
        rating: newRating,
        created_at: new Date().toISOString(),
        profiles: {
          nombre_completo: profile?.nombre_completo || user?.user_metadata?.nombre_completo || user?.email,
          avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url,
          pais: profile?.pais || user?.user_metadata?.pais,
          grado: profile?.grado || user?.user_metadata?.grado,
          cargo: profile?.cargo || user?.user_metadata?.cargo,
          institucion: profile?.institucion || user?.user_metadata?.institucion
        }
      };

      const backup = localStorage.getItem(`backup_testimonials_${forumCategory}`);
      const list = backup ? JSON.parse(backup) : [];
      const updatedList = [localItem, ...list];
      localStorage.setItem(`backup_testimonials_${forumCategory}`, JSON.stringify(updatedList));
      
      // Combine with defaults to update UI
      const categoryDefaults = DEFAULT_TESTIMONIALS.filter(t => t.experience === forumCategory);
      setTestimonials([...updatedList, ...categoryDefaults]);
      
      showToast('Comentario guardado localmente', 'success');
      setNewComment('');
      setNewRating(5);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const comment = testimonials.find(item => item.id === commentId);
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
        const backup = localStorage.getItem(`backup_testimonials_${forumCategory}`);
        if (backup) {
          const list = JSON.parse(backup);
          const updatedList = list.filter(item => item.id !== commentId);
          localStorage.setItem(`backup_testimonials_${forumCategory}`, JSON.stringify(updatedList));
          
          const categoryDefaults = DEFAULT_TESTIMONIALS.filter(t => t.experience === forumCategory);
          setTestimonials([...updatedList, ...categoryDefaults]);
        }
        showToast('Comentario eliminado', 'success');
        return;
      }

      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      showToast('Comentario eliminado con éxito', 'success');
      fetchTestimonials(forumCategory);
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('No se pudo eliminar el comentario', 'error');
    }
  };

  return (
    <>
      <Navbar />
      <div className="comunidad-page-wrapper">
        <section className="comunidad-forum-section">
          <div className="comunidad-bg-glow"></div>
          
          <div className="hce-container">
            <div ref={ref} className={`comunidad-header reveal ${inView ? 'active' : ''}`}>
              <div className="section-badge-comunidad">
                <MessageSquare size={16} /> Comunidad HCE
              </div>
              <h2 className="comunidad-headline">Foro de <span>Testimonios Académicos</span></h2>
              <p className="comunidad-subheadline">
                Explora el foro de experiencias de nuestros graduados. (Debes iniciar sesión con tu cuenta HCE para comentar).
              </p>
            </div>

            {/* Categorías del foro */}
            <div className="forum-categories-grid">
              {FORUM_CATEGORIES.map(cat => {
                const IconComp = cat.icon;
                const isActive = forumCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    className={`forum-category-card ${isActive ? 'active' : ''}`}
                    onClick={() => setForumCategory(cat.id)}
                  >
                    <div className="forum-category-icon-wrapper">
                      <IconComp size={22} />
                    </div>
                    <div className="forum-category-info">
                      <h4>{cat.label}</h4>
                      <p>{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Layout del foro publico: feed de testimonios y formulario/callout lateral */}
            <div className="forum-main-layout" style={{ marginTop: '50px' }}>
              
              {/* Feed de Comentarios */}
              <div className="forum-feed-section">
                <h3 className="forum-section-title">Comentarios de la Comunidad</h3>

                {testimonialsLoading ? (
                  <div className="forum-loading-state">
                    <div className="spinner"></div>
                    <p>Cargando aportaciones del foro...</p>
                  </div>
                ) : testimonials.length === 0 ? (
                  <div className="crm-empty-state-card mini">
                    <MessageSquare size={32} className="empty-state-icon" />
                    <h4>No hay testimonios aún</h4>
                    <p>Sé el primero en compartir tu experiencia en esta categoría redactando tu comentario.</p>
                  </div>
                ) : (
                  <div className="forum-testimonials-list">
                    {testimonials.map(item => {
                      const author = item.profiles || {};
                      const authorName = author.nombre_completo || 'Usuario HCE';
                      const authorAvatar = author.avatar_url;
                      const authorCountry = author.pais;
                      const authorDegree = author.grado || 'Estudiante';
                      const authorCargo = author.cargo;
                      const authorInst = author.institucion;
                      
                      const flagUrl = getFlagUrl(authorCountry);
                      
                      // Verification for Delete Authorization:
                      // Authors can delete their own comments only within 5 minutes of creation. Admins can delete any comment anytime.
                      const isOwnComment = user && item.user_id === user.id;
                      const isAdmin = profile && profile.rol === 'admin';
                      const isWithin5Minutes = item.created_at ? (new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60) <= 5 : true;
                      const canDelete = (isOwnComment && isWithin5Minutes) || isAdmin;

                      return (
                        <div key={item.id} className="testimonial-forum-card">
                          <div className="forum-card-header">
                            <div className="forum-author-meta">
                              <div className="forum-author-avatar-circle">
                                {authorAvatar ? (
                                  <img src={authorAvatar} alt="Foto de perfil" />
                                ) : (
                                  authorName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="forum-author-details">
                                <div className="forum-author-name-row">
                                  <span className="forum-author-name">{authorName}</span>
                                  {authorCountry && (
                                    <span className="forum-author-country-badge" title={authorCountry}>
                                      {flagUrl && <img src={flagUrl} alt={authorCountry} className="forum-country-flag" />}
                                      <span className="forum-country-text">{authorCountry}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="forum-author-subdetails">
                                  <span className="forum-author-degree">{authorDegree}</span>
                                  {(authorCargo || authorInst) && (
                                    <span className="forum-author-divider">•</span>
                                  )}
                                  <span className="forum-author-role">
                                    {authorCargo ? `${authorCargo}` : ''}
                                    {authorCargo && authorInst ? `, ${authorInst}` : (authorInst || '')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteComment(item.id)}
                                className="forum-delete-comment-btn"
                                title="Eliminar comentario"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="forum-card-body">
                            <div className="testimonial-stars-display">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={13}
                                  className={star <= item.rating ? 'star-filled' : 'star-empty'}
                                />
                              ))}
                            </div>
                            <p className="forum-comment-text">{item.content}</p>
                            <span className="forum-comment-date">
                              {new Date(item.created_at).toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formulario lateral o CTA de inicio de sesión */}
              <div className="forum-form-section">
                {user ? (
                  <div className="forum-form-card">
                    <h3>Comparte tu Experiencia</h3>
                    <p className="form-subtext">Tu testimonio ayudará a futuros estudiantes y enriquecerá la comunidad médica.</p>

                    <form onSubmit={handleAddComment}>
                      <div className="rating-input-group">
                        <label className="rating-label">Tu Calificación:</label>
                        <div className="stars-rating-interactive">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setNewRating(star)}
                              className="star-interactive-btn"
                              title={`Calificar con ${star} estrellas`}
                            >
                              <Star
                                size={26}
                                className={star <= newRating ? 'star-filled' : 'star-empty'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="comment-input-group" style={{ marginTop: '20px' }}>
                        <label htmlFor="forum-comment-textarea" className="comment-label">Comentario o Testimonio:</label>
                        <textarea
                          id="forum-comment-textarea"
                          rows="5"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Cuéntanos qué te pareció el curso, los simuladores, los docentes o las prácticas de simulación..."
                          required
                        ></textarea>
                      </div>

                      <div className="forum-profile-hint">
                        <div className="hint-avatar">
                          {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Mi perfil" />
                          ) : (
                            profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : 'U'
                          )}
                        </div>
                        <div className="hint-text">
                          Publicarás como <strong>{profile?.nombre_completo || 'Usuario HCE'}</strong> de <strong>{profile?.pais || 'País no registrado'}</strong> ({profile?.grado || 'Profesión no registrada'}). 
                          <Link to="/dashboard" className="hint-link"> Editar perfil</Link>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="btn-crm-action solid forum-submit-btn"
                        style={{ marginTop: '20px' }}
                      >
                        <Send size={14} />
                        {submittingComment ? 'Publicando...' : 'Publicar Testimonio'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="forum-form-card cta-login-card">
                    <h3>¿Quieres comentar?</h3>
                    <p className="form-subtext">
                      Para participar en el foro y compartir tu testimonio, es necesario contar con una sesión activa en la plataforma.
                    </p>
                    <Link to="/login" className="btn-crm-action solid forum-login-btn">
                      <LogIn size={16} />
                      Iniciar Sesión / Registrarse
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Comunidad;
