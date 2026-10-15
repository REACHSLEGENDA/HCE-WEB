// Vista de administración: notificaciones. Estado y operaciones permanecen en AdminDashboard.
export default function VistaNotificaciones({ contexto }) {
  const {
    NotificacionesAdmin,
    courses,
    showConfirm,
    showToast,
  } = contexto;
  return (
<div className="notificaciones-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Notificaciones</h2>
              </div>
              <NotificacionesAdmin cursos={courses} notificar={showToast} confirmar={showConfirm} />
            </div>
  );
}
