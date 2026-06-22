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
  Users,
  Award,
  Video,
  Camera
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { getFlagUrl } from '../data/countries';
import './Comunidad.css';

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

const DEFAULT_TESTIMONIALS = [];

const safeNewDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string') {
    const formatted = dateStr.trim().replace(/\s+/, 'T');
    const d = new Date(formatted);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatDateSafe = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = safeNewDate(dateStr);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};

const FORUM_CATEGORIES = [
  { id: 'Insuficiencia Cardiaca', label: 'Manejo de Avanzada en Insuficiencia Cardíaca', icon: Heart, desc: 'Soporte e insuficiencia cardíaca avanzada' },
  { id: 'ECMO Nursing Care', label: 'ECMO Nursing Care', icon: NurseCap, desc: 'Cuidado crítico de enfermería en ECMO' },
  { id: 'Paris Diploma ECMO', label: 'Paris International Diploma in ECMO', icon: Award, desc: 'Diploma internacional de París en ECMO' },
  { id: 'ECMO SIM', label: 'Simulador ECMO SIM', icon: Gamepad2, desc: 'Entrenamiento interactivo y simulador clínico' },
  { id: 'Experiencia Docente', label: 'Comentarios Docentes / Instructores', icon: Award, desc: 'Experiencias de nuestros profesores y facilitadores clínicos' },
  { id: 'Conferencias Virtuales', label: 'Conferencias Virtuales Académicas para Instituciones y Grupos Hospitalarios', icon: Video, desc: 'Ponencias y conferencias virtuales especializadas' },
  { id: 'Webinars portal', label: 'Webinars portal', icon: PlayCircle, desc: 'Webinars en vivo y educación continua' },
  { id: 'Entrenamiento Intrahospitalario In Situ', label: 'Entrenamiento Intrahospitalario In Situ', icon: Users, desc: 'Capacitación y simulación in situ en hospitales' }
];

const areRolesRedundant = (degree, cargo) => {
  if (!degree || !cargo) return false;
  
  const normalize = (str) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\/[a-z]/g, "")
      .trim();
  };

  const d = normalize(degree);
  const c = normalize(cargo);

  if (d === c) return true;
  if (d.includes(c) || c.includes(d)) return true;

  const roots = ["enfermer", "medic", "terapeut", "fisioterapeut", "estudiant"];
  for (const root of roots) {
    if (d.includes(root) && c.includes(root)) {
      return true;
    }
  }

  if (d.length >= 5 && c.length >= 5 && d.substring(0, 5) === c.substring(0, 5)) {
    return true;
  }

  return false;
};

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
  const [testimonialImages, setTestimonialImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (testimonialImages.length + files.length > 3) {
      showToast('Puedes subir un máximo de 3 imágenes', 'error');
      return;
    }

    setUploadingImage(true);
    let loadedCount = 0;
    const newImages = [];

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`La imagen "${file.name}" supera el límite de 2MB`, 'error');
        loadedCount++;
        if (loadedCount === files.length) {
          setUploadingImage(false);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result);
        loadedCount++;
        if (loadedCount === files.length) {
          setTestimonialImages(prev => {
            const combined = [...prev, ...newImages].slice(0, 3);
            showToast(
              combined.length === 1 
                ? 'Imagen adjuntada al testimonio' 
                : `${combined.length} imágenes adjuntadas al testimonio`, 
              'success'
            );
            return combined;
          });
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        showToast(`Error al leer el archivo: ${file.name}`, 'error');
        loadedCount++;
        if (loadedCount === files.length) {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

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
          image_url,
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
      rating: newRating,
      image_url: testimonialImages.length > 0 ? JSON.stringify(testimonialImages) : null
    };

    try {
      const { error } = await supabase
        .from('testimonials')
        .insert([testimonialData]);

      if (error) throw error;
      
      showToast('Comentario publicado con éxito', 'success');
      setNewComment('');
      setNewRating(5);
      setTestimonialImages([]);
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
        image_url: testimonialImages.length > 0 ? JSON.stringify(testimonialImages) : null,
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
      setTestimonialImages([]);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const comment = testimonials.find(item => item.id === commentId);
    if (comment) {
      const isOwnComment = user && comment.user_id === user.id;
      const isAdmin = profile && profile.rol === 'admin';
      const isWithin5Minutes = comment.created_at ? (new Date().getTime() - safeNewDate(comment.created_at).getTime()) / (1000 * 60) <= 5 : true;
      
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

            {/* Indicación del foro */}
            <div className="forum-instruction-text">
              👉 Selecciona el foro para dejar tu comentario o ver testimonios:
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
                      
                      const showCargo = authorCargo && !areRolesRedundant(authorDegree, authorCargo);
                      const flagUrl = getFlagUrl(authorCountry);
                      
                      // Verification for Delete Authorization:
                      // Authors can delete their own comments only within 5 minutes of creation. Admins can delete any comment anytime.
                      const isOwnComment = user && item.user_id === user.id;
                      const isAdmin = profile && profile.rol === 'admin';
                      const isWithin5Minutes = item.created_at ? (new Date().getTime() - safeNewDate(item.created_at).getTime()) / (1000 * 60) <= 5 : true;
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
                                  {(showCargo || authorInst) && (
                                    <span className="forum-author-divider">•</span>
                                  )}
                                  <span className="forum-author-role">
                                    {showCargo ? `${authorCargo}` : ''}
                                    {showCargo && authorInst ? `, ${authorInst}` : (authorInst || '')}
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
                            {(() => {
                              if (!item.image_url) return null;
                              let images = [];
                              if (item.image_url.startsWith('[')) {
                                try {
                                  images = JSON.parse(item.image_url);
                                } catch (e) {
                                  images = [item.image_url];
                                }
                              } else {
                                images = [item.image_url];
                              }

                              if (images.length === 0) return null;

                              return (
                                <div className="forum-comment-images-layout" style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '10px',
                                  marginTop: '14px'
                                }}>
                                  {images.map((img, idx) => (
                                    <div key={idx} className="forum-comment-image-wrapper" style={{
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      border: '1px solid #e2e8f0',
                                      background: '#f8fafc',
                                      flex: images.length === 1 ? '1 1 100%' : images.length === 2 ? '1 1 calc(50% - 5px)' : '1 1 calc(33.333% - 7px)',
                                      minWidth: '150px',
                                      maxHeight: images.length === 1 ? '350px' : '200px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <img 
                                        src={img} 
                                        alt={`Evidencia adjunta ${idx + 1}`} 
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          maxHeight: images.length === 1 ? '350px' : '200px',
                                          objectFit: images.length === 1 ? 'contain' : 'cover',
                                          display: 'block',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                          const win = window.open();
                                          if (win) {
                                            win.document.write(`<img src="${img}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                          }
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            <span className="forum-comment-date">
                              {formatDateSafe(item.created_at)}
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
                          placeholder="Cuéntanos tu experiencia con el curso, los simuladores, las prácticas clínicas o comparte tu perspectiva como docente/instructor..."
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

                      <div className="forum-image-upload-zone" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
                        {testimonialImages.length < 3 && (
                          <label className="forum-image-upload-label" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(0, 188, 212, 0.06)',
                            border: '1px dashed rgba(0, 188, 212, 0.3)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#00acc1',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}>
                            <Camera size={15} />
                            {uploadingImage ? 'Cargando...' : 'Adjuntar fotos (máx. 3)'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple
                              onChange={handleImageUpload} 
                              disabled={uploadingImage}
                              style={{ display: 'none' }} 
                            />
                          </label>
                        )}

                        {testimonialImages.length > 0 && (
                          <div className="forum-image-previews-container" style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginTop: '5px'
                          }}>
                            {testimonialImages.map((img, idx) => (
                              <div key={idx} className="forum-image-preview-wrapper" style={{
                                position: 'relative',
                                display: 'inline-block',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                background: '#f8fafc',
                                padding: '4px'
                              }}>
                                <img 
                                  src={img} 
                                  alt={`Vista previa ${idx + 1}`} 
                                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => setTestimonialImages(prev => prev.filter((_, i) => i !== idx))}
                                  style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: 'rgba(239, 68, 68, 0.9)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    padding: '0',
                                    lineHeight: '1'
                                  }}
                                  title="Remover foto"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {testimonialImages.length} de 3 fotos adjuntas
                        </span>
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
