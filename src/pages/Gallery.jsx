import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Image as ImageIcon, ArrowRight, ArrowLeft, X, Eye, RefreshCw, Calendar, MapPin, Grid, FolderOpen } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import galleryData from '../data/galleryData.json';
import { useSEO } from '../hooks/useSEO';
import './Gallery.css';

const Gallery = () => {
  useSEO({
    title: 'Galería de Experiencias HCE',
    description: 'Explora las galerías fotográficas de nuestros bootcamps, simulación clínica avanzada y entregas de diplomas en México, Chile y Ecuador.',
    keywords: 'Galería, HCE, simulación médica, fotos ECMO, diplomado París ECMO, INC, INER, Guayaquil, Santiago de Chile'
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');

  const [activeTab, setActiveTab] = useState(galleryData[0]?.id || '');
  const [activeSubfolder, setActiveSubfolder] = useState('diploma'); // defaults to diploma for INER
  const [visibleCount, setVisibleCount] = useState(24); // load 24 images initially for performance
  const [lightboxIndex, setLightboxIndex] = useState(null); // active image index for lightbox

  const { ref: headerRef, inView: headerInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: contentRef, inView: inViewContent } = useInView({ triggerOnce: true, threshold: 0.05 });

  // Sync state with URL search param
  useEffect(() => {
    if (tabParam && galleryData.some(g => g.id === tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam && galleryData[0]) {
      setActiveTab(galleryData[0].id);
    }
  }, [tabParam]);

  // Sync subfolder state with URL search param
  useEffect(() => {
    if (subParam && ['diploma', 'simulacion'].includes(subParam)) {
      setActiveSubfolder(subParam);
    } else {
      setActiveSubfolder('diploma');
    }
  }, [subParam, activeTab]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    const target = galleryData.find(g => g.id === id);
    if (target && target.hasSubfolders) {
      setSearchParams({ tab: id, sub: 'diploma' });
    } else {
      setSearchParams({ tab: id });
    }
  };

  const handleSubfolderChange = (subKey) => {
    setActiveSubfolder(subKey);
    setSearchParams({ tab: activeTab, sub: subKey });
  };

  // Get active gallery object
  const activeGallery = galleryData.find(g => g.id === activeTab) || galleryData[0];

  // Resolve list of active images
  const activeImages = activeGallery.hasSubfolders
    ? activeGallery.subfolders[activeSubfolder]?.images || []
    : activeGallery.images || [];

  // Reset page size when switching galleries or subfolders
  useEffect(() => {
    setVisibleCount(24);
    setLightboxIndex(null);
  }, [activeTab, activeSubfolder]);

  // Handle keyboard events in lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, activeImages]);

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 24, activeImages.length));
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const handleNextImage = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev + 1) % activeImages.length);
  };

  const handlePrevImage = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev - 1 + activeImages.length) % activeImages.length);
  };

  // Extract meta info based on active tab ID
  const getGalleryMeta = (id) => {
    switch (id) {
      case 'cdmx-inc-2024':
        return { date: 'Septiembre 2024', location: 'INC, Ciudad de México', type: 'Diploma & Simulación' };
      case 'cdmx-iner-2025':
        return { date: 'Marzo 2025', location: 'INER, Ciudad de México', type: 'Simulación & Diploma' };
      case 'ecuador-2024':
        return { date: 'Agosto 2024', location: 'Guayaquil, Ecuador', type: 'ECMO Nursing Course' };
      case 'santiago-chile-2025':
        return { date: 'Octubre 2025', location: 'Santiago, Chile', type: 'Simulación & Bootcamps' };
      default:
        return { date: '', location: '', type: '' };
    }
  };

  const activeMeta = getGalleryMeta(activeTab);

  return (
    <div className="gallery-page">
      <Navbar />

      {/* ── HERO HEADER ── */}
      <section className="gallery-hero">
        <div className="gallery-hero-bg"></div>
        <div className="gallery-hero-overlay"></div>
        <div className="hce-container">
          <div ref={headerRef} className={`gallery-hero-content au-reveal ${headerInView ? 'active' : ''}`}>
            <div className="section-badge">
              <Sparkles size={16} />
              GALERÍA HCE
            </div>
            <h1 className="gallery-h1">
              Nuestras <span className="gallery-gradient-text">Experiencias</span> en Imágenes
            </h1>
            <p className="gallery-hero-desc">
              Momentos capturados de nuestros entrenamientos clínicos inmersivos, bootcamps de simulación y entregas de diplomas a través de Latinoamérica.
            </p>
          </div>
        </div>
      </section>

      {/* ── TABS SELECTOR ── */}
      <section className="gallery-tabs-section">
        <div className="hce-container">
          <div className="tabs-container">
            {galleryData.map(g => (
              <button
                key={g.id}
                className={`tab-btn ${activeTab === g.id ? 'active' : ''}`}
                onClick={() => handleTabChange(g.id)}
              >
                <Grid size={16} className="tab-icon" />
                <span>{g.shortTitle}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVE GALLERY CONTENT ── */}
      <section className="gallery-grid-section" ref={contentRef}>
        <div className="hce-container">
          
          {/* Gallery Info Panel */}
          {activeGallery && (
            <div className={`gallery-info-card au-reveal ${inViewContent ? 'active' : ''}`}>
              <div className="gallery-info-main">
                <h2>{activeGallery.title}</h2>
                <p className="gallery-info-desc">
                  {activeGallery.hasSubfolders 
                    ? activeGallery.subfolders[activeSubfolder]?.description || activeGallery.description
                    : activeGallery.description}
                </p>
                <div className="gallery-meta-tags">
                  <span className="meta-tag">
                    <Calendar size={14} />
                    {activeMeta.date}
                  </span>
                  <span className="meta-tag">
                    <MapPin size={14} />
                    {activeMeta.location}
                  </span>
                  <span className="meta-tag">
                    <ImageIcon size={14} />
                    {activeImages.length} Imágenes ({activeGallery.imagesCount} Total)
                  </span>
                </div>
              </div>

              {/* Subfolder Toggle Pills (For galleries like INER with 2 subfolders) */}
              {activeGallery.hasSubfolders && (
                <div className="subfolder-toggle-container">
                  <span className="subfolder-label">
                    <FolderOpen size={16} /> Selecciona Sección:
                  </span>
                  <div className="subfolder-pills">
                    <button
                      className={`pill-btn ${activeSubfolder === 'diploma' ? 'active' : ''}`}
                      onClick={() => handleSubfolderChange('diploma')}
                    >
                      Diploma ({activeGallery.subfolders.diploma.images.length})
                    </button>
                    <button
                      className={`pill-btn ${activeSubfolder === 'simulacion' ? 'active' : ''}`}
                      onClick={() => handleSubfolderChange('simulacion')}
                    >
                      Simulación ({activeGallery.subfolders.simulacion.images.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Images Grid */}
          {activeImages.length > 0 ? (
            <>
              <div className="gallery-grid">
                {activeImages.slice(0, visibleCount).map((imgUrl, index) => (
                  <div
                    key={index}
                    className="gallery-item-card"
                    onClick={() => openLightbox(index)}
                  >
                    <div className="gallery-img-wrapper">
                      <img
                        src={imgUrl}
                        alt={`${activeGallery.title} - ${activeSubfolder} - Imagen ${index + 1}`}
                        loading="lazy"
                        className="gallery-thumbnail"
                      />
                      <div className="gallery-item-hover">
                        <div className="hover-icon-circle">
                          <Eye size={20} />
                        </div>
                        <span>Ampliar</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {visibleCount < activeImages.length && (
                <div className="load-more-container">
                  <button className="load-more-btn" onClick={loadMore}>
                    <RefreshCw size={18} /> Cargar Más Fotos
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-gallery">
              <ImageIcon size={48} />
              <p>No se encontraron fotos en esta sección.</p>
            </div>
          )}

        </div>
      </section>

      {/* ── LIGHTBOX MODAL ── */}
      {lightboxIndex !== null && activeImages.length > 0 && (
        <div className="lightbox-modal" onClick={closeLightbox}>
          <div className="lightbox-close" onClick={closeLightbox} title="Cerrar (Esc)">
            <X size={28} />
          </div>

          <button
            className="lightbox-nav-btn prev"
            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
            title="Anterior (Flecha Izquierda)"
          >
            <ArrowLeft size={32} />
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeImages[lightboxIndex]}
              alt={`${activeGallery.title} - Foto ${lightboxIndex + 1}`}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              <h4>{activeGallery.title} {activeGallery.hasSubfolders ? `· ${activeGallery.subfolders[activeSubfolder]?.title}` : ''}</h4>
              <p>Foto {lightboxIndex + 1} de {activeImages.length}</p>
            </div>
          </div>

          <button
            className="lightbox-nav-btn next"
            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
            title="Siguiente (Flecha Derecha)"
          >
            <ArrowRight size={32} />
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Gallery;
