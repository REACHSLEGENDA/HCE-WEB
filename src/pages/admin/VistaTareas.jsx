// Vista de administración: tareas. Estado y operaciones permanecen en AdminDashboard.
export default function VistaTareas({ contexto }) {
  const {
    RevisionTareas,
    courses,
    profiles,
    setTareasPendientes,
    showToast,
  } = contexto;
  return (
<div className="tareas-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Tareas</h2>
                <p style={{ color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Lo que entregan los alumnos en las lecciones de tipo tarea. Aprobar la da por completa; pedir corrección la reabre.
                </p>
              </div>
              <div className="settings-card">
                <RevisionTareas cursos={courses} perfiles={profiles} notificar={showToast} onPendientes={setTareasPendientes} />
              </div>
            </div>
  );
}
