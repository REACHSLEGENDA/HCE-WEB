import React from 'react';

// Si una pantalla falla al dibujarse, se muestra este aviso en lugar de dejar
// la página en blanco. `resetKey` (por ejemplo, la ruta) limpia el error al
// navegar a otra pantalla.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la pantalla:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '70vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px 16px',
          background: '#f4f6f9',
          fontFamily: 'Outfit, Montserrat, sans-serif',
        }}
      >
        <section
          style={{
            width: 'min(460px, 100%)',
            padding: '28px 22px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 18px 40px rgba(15, 23, 42, .08)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <h1 style={{ margin: '0 0 10px', fontSize: '1.3rem', color: '#0f172a' }}>Algo salió mal</h1>
          <p style={{ margin: '0 0 22px', color: '#475569', lineHeight: 1.55 }}>
            Esta pantalla no se pudo mostrar. Recarga la página; si vuelve a pasar, escríbenos.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: '11px 20px', border: 0, borderRadius: '999px', background: '#00bcd4', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Recargar
            </button>
            <a
              href="/dashboard"
              style={{ padding: '11px 20px', borderRadius: '999px', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}
            >
              Ir al portal
            </a>
          </div>
        </section>
      </div>
    );
  }
}

export default ErrorBoundary;
