// Vista de administración: metricas. Estado y operaciones permanecen en AdminDashboard.
export default function VistaMetricas({ contexto }) {
  const {
    InformesAdmin,
    courses,
    metricasDeCurso,
    profiles,
    showConfirm,
    showToast,
  } = contexto;
  return (
<div className="metricas-view">
              <div className="section-title-row" style={{ marginBottom: '20px' }}>
                <h2>Métricas de Cursos</h2>
                <p style={{ color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Visitas, tiempo de estudio, avance en el video y resultados del examen de cada curso y de cada alumno.
                </p>
              </div>
              <InformesAdmin cursos={courses} perfiles={profiles} abrirCurso={metricasDeCurso} notificar={showToast} confirmar={showConfirm} />
            </div>
  );
}
