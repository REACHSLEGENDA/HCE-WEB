import React from 'react';
import { ChevronRight, ArrowUpRight, Mail } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <div className="premium-footer">
      {/* Background Blobs */}
      <div className="footer-blob blob-1"></div>
      <div className="footer-blob blob-2"></div>

      <div class="footer-container">
        {/* Main Content Grid */}
        <div className="f-main-grid">

          {/* Brand Side */}
          <div className="f-brand">
            <a href="https://healthcareexp.com/">
              <img src="https://healthcareexp.com/wp-content/uploads/2024/09/logo-hce-blanco--768x488.png" alt="HCE - Healthcare Training Experience" />
            </a>
            <p>
              Redefiniendo el estándar de la educación médica continua. Fusionamos ciencia, tecnología de simulación avanzada y excelencia académica para empoderar a los líderes del futuro en salud.
            </p>
          </div>

          {/* 1. Navegación */}
          <div className="f-col">
            <h4>Navegación</h4>
            <ul className="f-nav">
              <li><a href="#"><ChevronRight size={12} /> Términos</a></li>
              <li><a href="https://healthcareexp.com/privacy-policy/" target="_blank" rel="noreferrer"><ChevronRight size={12} /> Privacidad</a></li>
              <li><a href="#"><ChevronRight size={12} /> FAQ</a></li>
            </ul>
          </div>

          {/* 2. Facturación */}
          <div className="f-col">
            <h4>Facturación</h4>
            <div className="billing-content">
              <p>¿Necesitas factura?</p>
              <a href="https://healthcareexp.com/facturacion/" target="_blank" rel="noreferrer" className="btn-premium" style={{ width: 'fit-content', padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '8px' }}>
                Solicitar <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          {/* 3. Contacto */}
          <div className="f-col">
            <h4>Contacto</h4>
            <div className="f-contact-wrap">
              <div className="f-contact-item">
                <div className="f-contact-icon" style={{ color: '#25D366', background: 'rgba(37, 211, 102, 0.1)', borderColor: 'rgba(37, 211, 102, 0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="f-contact-info">
                  <span>WhatsApp</span>
                  <a href="https://wa.me/525659271906" target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem' }}>+52 56 5927 1906</a>
                </div>
              </div>

              <div className="f-contact-item">
                <div className="f-contact-icon">
                  <Mail size={18} />
                </div>
                <div className="f-contact-info">
                  <span>Email</span>
                  <a href="mailto:info@healthcareexp.com" style={{ fontSize: '0.85rem' }}>info@healthcareexp.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Síguenos & Comunidad */}
          <div className="f-col">
            <h4>Síguenos</h4>
            <div className="f-socials">
              <a href="https://www.facebook.com/hce.training/" target="_blank" rel="noreferrer" className="fb" title="Facebook" aria-label="Visitar Facebook de HCE">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://www.instagram.com/hce.training/" target="_blank" rel="noreferrer" className="ig" title="Instagram" aria-label="Visitar Instagram de HCE">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://www.youtube.com/@HealthcareTrainingExperience" target="_blank" rel="noreferrer" className="yt" title="YouTube" aria-label="Visitar canal de YouTube de HCE">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
              <a href="https://www.tiktok.com/@hcetraining" target="_blank" rel="noreferrer" className="tk" title="TikTok" aria-label="Visitar TikTok de HCE">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px', height:'16px'}}>
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                </svg>
              </a>

              <div className="f-comu-title">Comunidad</div>
              <a href="https://chat.whatsapp.com/BqDMW8tpmOJJu0b3uAEEhu" target="_blank" rel="noreferrer" className="wa" title="Comunidad WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
              <a href="https://t.me/healthcareexp" target="_blank" rel="noreferrer" className="tg" title="Telegram">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path d="M11.944 0C5.352 0 0 5.352 0 11.944c0 6.591 5.352 11.944 11.944 11.944 6.591 0 11.944-5.353 11.944-11.944C23.888 5.352 18.535 0 11.944 0zm5.503 8.356c-.161 1.706-1.109 7.284-1.588 9.846-.202 1.085-.609 1.448-.996 1.484-.842.077-1.48-.558-2.296-1.093-1.277-.84-1.998-1.362-3.238-2.181-1.433-.944-.505-1.463.313-2.31.214-.222 3.935-3.605 4.007-3.914.009-.039.017-.183-.051-.243-.068-.06-.17-.04-.243-.023-.103.023-1.745 1.108-4.925 3.26-.466.32-.888.477-1.265.468-.415-.01-1.216-.236-1.81-.43-.729-.238-1.309-.364-1.259-.768.026-.211.317-.428.873-.652 3.41-1.488 5.683-2.47 6.819-2.947 3.243-1.361 3.916-1.597 4.357-1.605.097-.002.313.022.453.136.118.096.151.226.166.318.015.093.033.32.019.53z" />
                </svg>
              </a>

              <div className="f-comu-title">Podcast</div>
              {/* Spotify */}
              <a href="https://open.spotify.com/show/3roFIQy2ugQBy7L6wSKv7D" target="_blank" rel="noreferrer" className="sp" title="Spotify">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.302c-.223.367-.7.485-1.07.261-2.993-1.828-6.76-2.247-11.205-1.233-.42.095-.845-.176-.94-.597-.096-.421.176-.846.597-.941 4.882-1.114 9.034-.64 12.357 1.39.37.224.488.7.261 1.07zm1.47-3.253c-.28.457-.878.605-1.334.325-3.42-2.103-8.624-2.712-12.664-1.484-.51.155-1.054-.136-1.209-.646-.153-.51.135-1.054.646-1.209 4.606-1.4 10.336-.718 14.236 1.68.457.28.606.877.325 1.334zm.127-3.39c-4.1-2.435-10.864-2.66-14.81-1.464-.63.192-1.302-.163-1.494-.793-.191-.63.163-1.302.793-1.494 4.524-1.373 11.996-1.11 16.716 1.69.566.335.753 1.063.418 1.629-.335.567-1.063.754-1.629.418z" />
                </svg>
              </a>
              {/* Apple Podcasts */}
              <a href="https://podcasts.apple.com/mx/podcast/hce-podcast/id1774307506" target="_blank" rel="noreferrer" className="ap" title="Apple Podcasts">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.59.12 2.2.007 2.864a8.506 8.506 0 01-3.24 5.296c-.608.46-2.096 1.261-2.336 1.261-.088 0-.096-.091-.056-.46.072-.592.144-.715.48-.856.536-.224 1.448-.874 2.008-1.435a7.644 7.644 0 002.008-3.536c.208-.824.184-2.656-.048-3.504-.728-2.696-2.928-4.792-5.624-5.352-.784-.16-2.208-.16-3 0-2.728.56-4.984 2.76-5.672 5.528-.184.752-.184 2.584 0 3.336.456 1.832 1.64 3.512 3.192 4.512.304.2.672.408.824.472.336.144.408.264.472.856.04.36.03.464-.056.464-.056 0-.464-.176-.896-.384l-.04-.03c-2.472-1.216-4.056-3.274-4.632-6.012-.144-.706-.168-2.392-.03-3.04.36-1.74 1.048-3.1 2.192-4.304 1.648-1.737 3.768-2.656 6.128-2.656zm.134 2.81c.409.004.803.04 1.106.106 2.784.62 4.76 3.408 4.376 6.174-.152 1.114-.536 2.03-1.216 2.88-.336.43-1.152 1.15-1.296 1.15-.023 0-.048-.272-.048-.603v-.605l.416-.496c1.568-1.878 1.456-4.502-.256-6.224-.664-.67-1.432-1.064-2.424-1.246-.64-.118-.776-.118-1.448-.008-1.02.167-1.81.562-2.512 1.256-1.72 1.704-1.832 4.342-.264 6.222l.413.496v.608c0 .336-.027.608-.06.608-.03 0-.264-.16-.512-.36l-.034-.011c-.832-.664-1.568-1.842-1.872-2.997-.184-.698-.184-2.024.008-2.72.504-1.878 1.888-3.335 3.808-4.019.41-.145 1.133-.22 1.814-.211zm-.13 2.99c.31 0 .62.06.844.178.488.253.888.745 1.04 1.259.464 1.578-1.208 2.96-2.72 2.254h-.015c-.712-.331-1.096-.956-1.104-1.77 0-.733.408-1.371 1.112-1.745.224-.117.534-.176.844-.176zm-.011 4.728c.988-.004 1.706.349 1.97.97.198.464.124 1.932-.218 4.302-.232 1.656-.36 2.074-.68 2.356-.44.39-1.064.498-1.656.288h-.003c-.716-.257-.87-.605-1.164-2.644-.341-2.37-.416-3.838-.218-4.302.262-.616.974-.966 1.97-.97z" />
                </svg>
              </a>
              {/* Pocket Casts */}
              <a href="https://pca.st/r46k2fuf" target="_blank" rel="noreferrer" className="pc" title="Pocket Casts">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M12,0C5.372,0,0,5.372,0,12c0,6.628,5.372,12,12,12c6.628,0,12-5.373,12-12 C24,5.372,18.628,0,12,0z M15.564,12c0-1.968-1.596-3.564-3.564-3.564c-1.968,0-3.564,1.595-3.564,3.564 c0,1.968,1.595,3.564,3.564,3.564V17.6c-3.093,0-5.6-2.507-5.6-5.6c0-3.093,2.507-5.6,5.6-5.6c3.093,0,5.6,2.507,5.6,5.6H15.564z M19,12c0-3.866-3.134-7-7-7c-3.866,0-7,3.134-7,7c0,3.866,3.134,7,7,7v2.333c-5.155,0-9.333-4.179-9.333-9.333 c0-5.155,4.179-9.333,9.333-9.333c5.155,0,9.333,4.179,9.333,9.333H19z" />
                </svg>
              </a>
              {/* iHeartRadio */}
              <a href="https://www.iheart.com/podcast/269-hce-podcast-227965225/" target="_blank" rel="noreferrer" className="ih" title="iHeartRadio">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M4.403 21.983c.597 0 1.023-.306 1.023-.817v-.012c0-.489-.375-.784-1.017-.784H3.182v1.613zm-1.67-1.8c0-.125.102-.228.221-.228h1.489c.488 0 .88.148 1.13.398.193.193.307.472.307.784v.011c0 .654-.443 1.034-1.062 1.154l.988 1.272c.046.051.074.102.074.164 0 .12-.114.222-.227.222-.091 0-.16-.05-.21-.12l-1.12-1.453H3.183v1.346a.228.228 0 01-.228.227.227.227 0 01-.221-.227v-3.55m6.674 2.29l-.914-2.035-.915 2.034zm-2.812 1.164l1.614-3.528c.056-.125.142-.2.284-.2h.022c.137 0 .228.075.279.2l1.613 3.522a.31.31 0 01.029.113c0 .12-.097.216-.216.216-.108 0-.182-.074-.222-.165l-.415-.914H7.402l-.415.926c-.04.097-.113.153-.216.153a.204.204 0 01-.204-.204.26.26 0 01.028-.12m6.078-.118c1.005 0 1.647-.682 1.647-1.563v-.011c0-.88-.642-1.574-1.647-1.574h-.932v3.148zm-1.38-3.335c0-.125.102-.228.221-.228h1.16c1.249 0 2.112.858 2.112 1.977v.012c0 1.119-.863 1.988-2.113 1.988h-1.159a.226.226 0 01-.221-.227v-3.522m4.481-.029c0-.124.103-.227.222-.227.125 0 .227.103.227.227v3.579a.228.228 0 01-.227.227.227.227 0 01-.222-.227v-3.579m5.027 1.801v-.011c0-.904-.659-1.642-1.568-1.642s-1.556.727-1.556 1.63v.012c0 .903.659 1.642 1.567 1.642.91 0 1.557-.728 1.557-1.631zm-3.59 0v-.011c0-1.097.824-2.057 2.033-2.057 1.21 0 2.023.949 2.023 2.045v.012c0 1.096-.824 2.056-2.034 2.056s-2.022-.949-2.022-2.045m2.03-17.192c0 1.397-.754 2.773-2.242 4.092a.345.345 0 01-.458-.517c1.333-1.182 2.01-2.385 2.01-3.575v-.016c0-.966-.606-2.103-1.38-2.588a.345.345 0 11.367-.586c.97.61 1.703 1.974 1.703 3.174zM14.76 7.677a.345.345 0 11-.337-.602c.799-.448 1.336-1.318 1.339-2.167a2.096 2.096 0 00-1.124-1.855.345.345 0 11.321-.611 2.785 2.785 0 011.493 2.46v.011c-.004 1.09-.683 2.199-1.692 2.764zm-2.772-1.015a1.498 1.498 0 11.001-2.997 1.498 1.498 0 01-.001 2.997zm-2.303.882a.345.345 0 01-.47.133c-1.009-.565-1.688-1.674-1.692-2.764v-.01a2.785 2.785 0 011.493-2.461.346.346 0 01.321.611 2.096 2.096 0 00-1.124 1.855c.003.849.54 1.719 1.34 2.166a.345.345 0 01.132.47zM7.464 8.825a.344.344 0 01-.488.03C5.49 7.536 4.734 6.16 4.734 4.763v-.016c0-1.2.732-2.564 1.703-3.174a.346.346 0 01.367.586c-.774.485-1.38 1.622-1.38 2.588v.016c0 1.19.677 2.393 2.01 3.575a.345.345 0 01.03.487zM16.152 0c-1.727 0-3.27.915-4.164 2.252C11.094.915 9.55 0 7.823 0A4.982 4.982 0 002.84 4.983c0 1.746 1.106 3.005 2.261 4.17l4.518 4.272a.371.371 0 00.626-.27V9.827c0-.963.78-1.743 1.743-1.745a1.745 1.745 0 011.742 1.745v3.328c0 .326.39.493.626.27l4.518-4.272c1.155-1.165 2.261-2.424 2.261-4.17A4.982 4.982 0 0016.152 0" />
                </svg>
              </a>
              {/* Amazon Music */}
              <a href="https://music.amazon.com.mx/podcasts/ccff03e6-e512-4b96-9786-1474e62d88f4/hce-podcast" target="_blank" rel="noreferrer" className="am" title="Amazon Music">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                  <circle cx="24" cy="24" r="21.5" />
                  <path d="M32.28 29.7c1.11-.45 3.09-1.05 3.69-.33.64.78-.17 2.48-.92 3.8" />
                  <path d="M11.8 30.22c1.76 1.4 6.95 3.54 12.49 3.54 5.51 0 10.17-3.08 10.17-3.08" />
                  <path d="M20.4 20.13v3.3a2 2 0 004 0v-3.3" />
                  <line x1="24.4" y1="23.43" x2="24.4" y2="25.43" />
                  <path d="M10.4 22.23a2 2 0 014 0v3.2" />
                  <line x1="10.4" y1="20.23" x2="10.4" y2="25.43" />
                  <path d="M14.4 22.23a2 2 0 014 0v3.2" />
                  <circle cx="31.88" cy="17.68" r="1.5" fill="currentColor" />
                  <line x1="31.88" y1="20.13" x2="31.88" y2="25.43" />
                  <path d="M26.54 24.97a2.25 2.25 0 001.65.45h.45a1.32 1.32 0 001.32-1.33 1.32 1.32 0 00-1.32-1.32h-.9a1.32 1.32 0 01-1.32-1.33 1.32 1.32 0 011.32-1.32h.45a2.25 2.25 0 011.65.45" />
                  <path d="M37.6 24.42a2 2 0 01-1.74 1.01h0a2 2 0 01-2-2v-1.3a2 2 0 014 0" />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Strip */}
      <div className="f-bottom-strip">
        <div className="footer-container f-bottom-flex">
          <div className="f-copyright">
            &copy; 2025 Healthcare Training Experience. <span style={{ marginLeft: '8px', opacity: 0.5 }}>Ingeniería Educativa para la Salud.</span>
          </div>

          <div className="f-socials" style={{ display: 'none' }}>
            {/* Redundant social links removed, moved to main grid */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
