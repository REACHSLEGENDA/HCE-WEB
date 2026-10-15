// Vista de administración: alumni. Estado y operaciones permanecen en AdminDashboard.
export default function VistaAlumni({ contexto }) {
  const {
    AlumniPassAdmin,
    showConfirm,
    showToast,
  } = contexto;
  return (
<div className="tab-pane animate-fade-in">
              <div className="section-header">
                <h2>Alumni Pass · Step 1 Refresher</h2>
                <a className="btn-crm-action outlined" href="/alumni-pass-step1" target="_blank" rel="noreferrer">Ver la página</a>
              </div>
              <AlumniPassAdmin notificar={showToast} confirmar={showConfirm} />
            </div>
  );
}
