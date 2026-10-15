// Vista de administración: errores. Estado y operaciones permanecen en AdminDashboard.
export default function VistaErrores({ contexto }) {
  const {
    ErroresAdmin,
    showToast,
  } = contexto;
  return (
<div className="tab-pane animate-fade-in"><div className="section-header"><h2>Errores del portal</h2></div><ErroresAdmin notificar={showToast} /></div>
  );
}
