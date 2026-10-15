import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { instalarReporteErrores, reportarError } from './lib/reporteErrores'

// Errores del navegador (window.onerror y promesas sin atender) -> aviso a los
// administradores. Ver src/lib/reporteErrores.js.
instalarReporteErrores()

createRoot(document.getElementById('root'), {
  // Un error al dibujar fuera de cualquier ErrorBoundary deja la página en
  // blanco: se reporta con la pila de componentes para saber dónde fue.
  onUncaughtError(error, info) {
    console.error('Error sin atender al dibujar:', error, info?.componentStack)
    reportarError(error, { origen: 'render', componente: info?.componentStack || '' })
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
