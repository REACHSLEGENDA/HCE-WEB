// Vista de administración: divisiones. Estado y operaciones permanecen en AdminDashboard.
export default function VistaDivisiones({ contexto }) {
  const {
    DivisionesAdmin,
    courses,
    fetchProfiles,
    profiles,
    showConfirm,
    showToast,
  } = contexto;
  return (
<div className="divisiones-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Divisiones</h2>
              </div>
              <DivisionesAdmin perfiles={profiles} cursos={courses} onPerfilesCambiados={fetchProfiles} notificar={showToast} confirmar={showConfirm} />
            </div>
  );
}
