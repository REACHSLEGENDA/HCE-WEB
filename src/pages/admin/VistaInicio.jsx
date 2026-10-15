// Vista de administración: dashboard. Estado y operaciones permanecen en AdminDashboard.
export default function VistaInicio({ contexto }) {
  const {
    Award,
    BarChart2,
    BookOpen,
    GraduationCap,
    PendientesHoy,
    Plus,
    Users,
    abrirCursoDesdePanel,
    cerrarEditorCurso,
    certificates,
    courses,
    cuentasPendientes,
    cursosCargados,
    errorCursos,
    errorPerfiles,
    formatDate,
    handleOpenCourseCreate,
    inscripcionesTodas,
    loadingProfiles,
    permitirSalidaCurso,
    resumenDashboard,
    setActiveTab,
    setActiveTabState,
    setBusquedaCursos,
    setFiltroAccesoCursos,
    setFiltroEstadoCursos,
    setShowAddStudentModal,
    showCourseForm,
    solicitudesPendientes,
    stats,
    tareasPendientes,
  } = contexto;
  return (
<div className="dashboard-view">

              <div className="welcome-banner-card">
                <div className="welcome-avatar-wrapper">
                  <div className="welcome-avatar">A</div>
                </div>
                <div className="welcome-text-details">
                  <h2>Panel de Control HCE</h2>
                  <p>Bienvenido. Monitorea y administra el flujo académico, alumnos y contenidos educativos del portal médico.</p>
                </div>
              </div>

              <PendientesHoy
                cuentas={errorPerfiles ? null : cuentasPendientes.length}
                cargando={loadingProfiles || !cursosCargados}
                solicitudes={solicitudesPendientes}
                tareas={tareasPendientes}
                borradores={errorCursos ? null : courses.filter((c) => !c.activo).length}
                cursos={courses}
                onIr={(tab, opciones) => {
                  if (tab === 'courses' && opciones?.filtro) {
                    // Lleva a la lista ya filtrada (cierra el editor si estaba abierto).
                    if (!permitirSalidaCurso()) return;
                    if (showCourseForm) cerrarEditorCurso();
                    setFiltroEstadoCursos(opciones.filtro);
                    setFiltroAccesoCursos('todos');
                    setBusquedaCursos('');
                    setActiveTabState('courses');
                    try { localStorage.setItem('adminActiveTab', 'courses'); } catch { /* sin almacenamiento */ }
                    return;
                  }
                  setActiveTab(tab);
                }}
                onAbrirCurso={abrirCursoDesdePanel}
              />

              {/* KPI Cards row */}
              <div className="kpi-row">
                <div className="kpi-card">
                  <div className="kpi-icon-wrapper blue">
                    <GraduationCap size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Alumnos Registrados</span>
                    <h3 className="kpi-value">{stats.alumnosRegistrados}</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper green">
                    <BookOpen size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Cursos Publicados</span>
                    <h3 className="kpi-value">{stats.cursosPublicados}</h3>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrapper cyan">
                    <Award size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Certificados Emitidos</span>
                    <h3 className="kpi-value">{stats.certificadosEmitidos}</h3>
                  </div>
                </div>

                {/* Antes era "Cursos Activos", que salía del mismo número que
                    "Cursos Publicados": dos tarjetas diciendo lo mismo. */}
                <div className="kpi-card">
                  <div className="kpi-icon-wrapper orange">
                    <Users size={20} />
                  </div>
                  <div className="kpi-details">
                    <span className="kpi-label">Inscripciones</span>
                    <h3 className="kpi-value">{inscripcionesTodas ? inscripcionesTodas.length : '—'}</h3>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="quick-actions-section" style={{ marginTop: '30px' }}>
                <h3>Acciones Rápidas</h3>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => { setActiveTab('courses'); handleOpenCourseCreate(); }}>
                    <Plus size={16} />
                    <span>Crear Curso</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => { setActiveTab('students'); setShowAddStudentModal(true); }}>
                    <GraduationCap size={16} />
                    <span>Agregar Alumno</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('certificates')}>
                    <Award size={16} />
                    <span>Ver Certificados</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('reports')}>
                    <BarChart2 size={16} />
                    <span>Ver Reportes</span>
                  </button>
                </div>
              </div>

              {/* Activity & Stats Grid */}
              <div className="dashboard-grid" style={{ marginTop: '30px' }}>
                <div className="dashboard-left-panel">
                  {/* Estadísticas visuales */}
                  <div className="sub-section-block">
                    <h3>Estadísticas Clave</h3>

                    <div className="stats-metric-wrapper">
                      <div className="stats-metric-item">
                        <div className="metric-header-row">
                          <span>Alumnos nuevos este mes</span>
                          <strong>{resumenDashboard.alumnosMes}</strong>
                        </div>
                        <div className="custom-progress-bar">
                          <div className="progress-fill" style={{ width: `${stats.alumnosRegistrados ? resumenDashboard.alumnosMes / stats.alumnosRegistrados * 100 : 0}%` }}></div>
                        </div>
                      </div>

                      <div className="stats-metric-item" style={{ marginTop: '18px' }}>
                        <div className="metric-header-row">
                          <span>Certificados emitidos este mes</span>
                          <strong>{resumenDashboard.certificadosMes}</strong>
                        </div>
                        <div className="custom-progress-bar">
                          <div className="progress-fill" style={{ width: `${certificates.length ? resumenDashboard.certificadosMes / certificates.length * 100 : 0}%`, backgroundColor: 'var(--primary-cyan)' }}></div>
                        </div>
                      </div>

                      <div className="stats-metric-item" style={{ marginTop: '18px' }}>
                        <div className="metric-header-row">
                          <span>Tasa de finalización de cursos</span>
                          <strong>{resumenDashboard.finalizacion}%</strong>
                        </div>
                        <div className="custom-progress-bar">
                          <div className="progress-fill" style={{ width: `${resumenDashboard.finalizacion}%`, backgroundColor: '#10B981' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cursos populares */}
                  <div className="sub-section-block" style={{ marginTop: '30px' }}>
                    <h3>Cursos más Populares</h3>
                    <div className="popular-courses-list">
                      {resumenDashboard.populares.map((course, idx) => {
                        const graduatesCount = resumenDashboard.conteos.get(Number(course.id)) || 0;
                        return (
                          <div key={course.id} className="popular-course-row" style={idx > 0 ? { marginTop: '12px' } : {}}>
                            <span className="course-rank">{idx + 1}</span>
                            <div className="popular-course-info">
                              <h4>{course.title}</h4>
                              <p>{course.duracion} • {course.modalidad}</p>
                            </div>
                            <span className="popular-count">{graduatesCount} {graduatesCount === 1 ? 'alumno' : 'alumnos'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right panel: Recent Activity */}
                <div className="dashboard-activity-section">
                  <h3>Actividad Reciente</h3>
                  <div className="activity-feed">
                    {resumenDashboard.actividades.length === 0 ? (
                      <div className="crm-empty-state-card mini" style={{ boxShadow: 'none', border: 'none', padding: '10px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin actividad reciente en el portal.</p>
                      </div>
                    ) : (
                      resumenDashboard.actividades.map(actividad => (
                        <div key={actividad.id} className="activity-item">
                          <div className="activity-icon-bullet blue"></div>
                          <div className="activity-details">
                            <p><strong>{actividad.etiqueta}:</strong> {actividad.detalle}</p>
                            <span className="activity-time">{formatDate(actividad.fecha)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
  );
}
