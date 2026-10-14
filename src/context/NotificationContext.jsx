import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Notification.css';

const NotificationContext = createContext(null);

// El hook y su proveedor comparten intencionalmente el contexto.
// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const modalRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'alert'|'confirm', title, message, resolve }

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const showAlert = useCallback((message, title = 'Aviso') => {
    return new Promise((resolve) => {
      setModal({
        type: 'alert',
        title,
        message,
        resolve: (val) => {
          setModal(null);
          resolve(val);
        }
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Confirmar') => {
    return new Promise((resolve) => {
      setModal({
        type: 'confirm',
        title,
        message,
        resolve: (val) => {
          setModal(null);
          resolve(val);
        }
      });
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!modal) return undefined;
    const previo = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (modalRef.current?.querySelector('button') || modalRef.current)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (document.contains(previo)) previo?.focus();
    };
  }, [modal]);

  const teclaModal = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); modal.resolve(false); }
    if (e.key !== 'Tab') return;
    const lista = [...(modalRef.current?.querySelectorAll('button') || [])];
    const primero = lista[0]; const ultimo = lista[lista.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="hce-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`hce-toast hce-toast--${toast.type}`}>
            <span className="hce-toast-icon">
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </span>
            <div className="hce-toast-message">{toast.message}</div>
            <button className="hce-toast-close" onClick={() => removeToast(toast.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal Container */}
      {modal && (
        <div className="hce-modal-overlay" onClick={() => modal.resolve(false)}>
          <div ref={modalRef} className="hce-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="hce-modal-titulo" aria-describedby="hce-modal-mensaje" tabIndex={-1} onKeyDown={teclaModal} onClick={(e) => e.stopPropagation()}>
            <div className="hce-modal-header">
              <span className={`hce-modal-header-icon hce-modal-header-icon--${modal.type}`}>
                {modal.type === 'confirm' ? <Info size={24} /> : <AlertCircle size={24} />}
              </span>
              <h3 className="hce-modal-title" id="hce-modal-titulo">{modal.title}</h3>
            </div>
            <div className="hce-modal-body">
              <p id="hce-modal-mensaje">{modal.message}</p>
            </div>
            <div className="hce-modal-footer">
              {modal.type === 'confirm' && (
                <button 
                  className="hce-modal-btn hce-modal-btn--secondary" 
                  onClick={() => modal.resolve(false)}
                >
                  Cancelar
                </button>
              )}
              <button 
                className="hce-modal-btn hce-modal-btn--primary" 
                onClick={() => modal.resolve(true)}
              >
                {modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
