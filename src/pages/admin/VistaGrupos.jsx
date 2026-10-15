// Vista de administración: grupos. Estado y operaciones permanecen en AdminDashboard.
export default function VistaGrupos({ contexto }) {
  const {
    GruposAdmin,
    courses,
    profiles,
    showConfirm,
    showToast,
  } = contexto;
  return (
<div className="grupos-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Grupos e inscripción masiva</h2>
              </div>
              <GruposAdmin cursos={courses} perfiles={profiles} notificar={showToast} confirmar={showConfirm} />
            </div>
  );
}
