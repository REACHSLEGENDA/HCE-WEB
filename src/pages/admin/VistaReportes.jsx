// Vista de administración: reports. Estado y operaciones permanecen en AdminDashboard.
export default function VistaReportes({ contexto }) {
  const {
    ABANDONMENT_INACTIVE_DAYS,
    AlertCircle,
    Award,
    BarChart2,
    CheckCircle,
    Clock,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Monitor,
    Users,
    actionLoading,
    actividadPorAlumno,
    certificadosPorCurso,
    certificates,
    courses,
    errorTracking,
    handleExportExcel,
    handleExportPDF,
    handleIssueCertificate,
    inscripcionesTodas,
    pendientesCertificables,
    profiles,
    progresoPorCurso,
    reportsSubTab,
    setReportsSubTab,
    tasaFinalizacion,
    webinars,
  } = contexto;
  return (
(() => {
            // Scope variables
            const studentProfiles = profiles.filter(p => p.rol === 'estudiante');

            // Map student tracking data
            const studentTrackingList = studentProfiles.map(student => {
              const activity = actividadPorAlumno.get(student.id) || {
                session_duration: 0,
                current_action: 'Ninguna',
                last_active_at: null
              };

              const progressList = courses.map(c => {
                const progKey = `${student.id}_${c.id}`;
                const pItem = progresoPorCurso.get(progKey);
                const pct = pItem ? pItem.watch_percent : 0;
                const timeSpent = pItem ? pItem.time_spent : 0;
                const completed = certificadosPorCurso.has(progKey);
                return {
                  courseId: c.id,
                  courseTitle: c.title,
                  watchPercent: completed ? 100 : pct,
                  timeSpent: timeSpent,
                  completed
                };
              });

              return {
                ...student,
                activity,
                progressList
              };
            });

            // Global stats
            const totalEnrollments = (inscripcionesTodas || []).length;
            const activeCount = studentTrackingList.filter(s => {
              if (!s.activity.last_active_at) return false;
              const diff = new Date() - new Date(s.activity.last_active_at);
              return diff < 7 * 24 * 60 * 60 * 1000;
            }).length;
            const completedCount = certificates.length;

            // Sin inscripciones no hay tasa que reportar: 0, no 100.
            const approvalRate = totalEnrollments > 0
              ? Math.round(tasaFinalizacion(certificates, inscripcionesTodas || []))
              : 0;

            // Inactive students breakdown
            const nowTime = new Date();
            const inactive7d = [];
            const inactive15d = [];
            const inactive30d = [];

            studentTrackingList.forEach(s => {
              if (!s.activity.last_active_at) {
                inactive30d.push(s);
                return;
              }
              const diffDays = Math.floor((nowTime - new Date(s.activity.last_active_at)) / (24 * 60 * 60 * 1000));
              if (diffDays >= 30) {
                inactive30d.push(s);
              } else if (diffDays >= 15) {
                inactive15d.push(s);
              } else if (diffDays >= 7) {
                inactive7d.push(s);
              }
            });

            // Alerts consolidated
            const alertsList = [];
            if (inactive30d.length > 0) {
              alertsList.push({
                type: 'danger',
                text: `${inactive30d.length} alumno(s) sin actividad por más de 30 días`
              });
            }

            const lowAvanceCount = studentTrackingList.reduce((sum, s) => {
              return sum + s.progressList.filter(p => p.watchPercent > 0 && p.watchPercent < 20).length;
            }, 0);
            if (lowAvanceCount > 0) {
              alertsList.push({
                type: 'warning',
                text: `${lowAvanceCount} alumno(s) con avance menor al 20% en curso iniciado`
              });
            }

            const pendingCertificates = pendientesCertificables;

            if (pendingCertificates.length > 0) {
              alertsList.push({
                type: 'warning',
                text: `${pendingCertificates.length} certificado(s) pendiente(s) de emisión`
              });
            }

            // Webinar starts soon check
            const upcomingWebinars = webinars.filter(w => {
              if (!w.fecha_inicio || !w.activo) return false;
              const diff = new Date(w.fecha_inicio) - nowTime;
              return diff > 0 && diff < 24 * 60 * 60 * 1000;
            });
            upcomingWebinars.forEach(w => {
              alertsList.push({
                type: 'info',
                text: `El webinar "${w.title}" inicia en menos de 24 horas`
              });
            });

            // If empty, add standard HCE warnings to make it look professional
            if (alertsList.length === 0) {
              alertsList.push({ type: 'info', text: 'No hay alertas críticas en este momento.' });
            }

            // Real-time connected students: active in last 15 minutes and not explicitly disconnected
            const liveConnected = studentTrackingList.filter(s => {
              if (!s.activity.last_active_at) return false;
              const diffMs = nowTime - new Date(s.activity.last_active_at);
              return s.activity.current_action !== 'Desconectado' && diffMs < 15 * 60 * 1000;
            });

            // Last accesses: sorted by last_active_at descending
            const lastAccesses = [...studentTrackingList]
              .filter(s => s.activity.last_active_at)
              .sort((a, b) => new Date(b.activity.last_active_at) - new Date(a.activity.last_active_at));

            // Course statistics
            const courseStatsList = courses.map(c => {
              const inscritosIds = new Set((inscripcionesTodas || []).filter((i) => Number(i.course_id) === Number(c.id)).map((i) => i.user_id));
              const enrolledForCourse = studentTrackingList.filter(s => inscritosIds.has(s.id));
                            const numEnrolled = enrolledForCourse.length;
              const numCompleted = certificates.filter((cert) => Number(cert.course_id) === Number(c.id)).length;

              // Fails: count of students with watchPercent > 80 who did exam and did not pass yet.
              const numFailed = enrolledForCourse.filter(s => {
                const prog = s.progressList.find(p => p.courseId === c.id);
                return prog && prog.watchPercent > 80 && !prog.completed;
              }).length;

              const totalCourseSeconds = enrolledForCourse.reduce((acc, s) => {
                const prog = s.progressList.find(p => p.courseId === c.id);
                return acc + (prog ? prog.timeSpent : 0);
              }, 0);
              const avgTimeSpent = numEnrolled > 0 ? Math.round(totalCourseSeconds / numEnrolled) : 0;

              const avgProgress = numEnrolled > 0
                ? Math.round(enrolledForCourse.reduce((acc, s) => {
                    const prog = s.progressList.find(p => p.courseId === c.id);
                    return acc + (prog ? prog.watchPercent : 0);
                  }, 0) / numEnrolled)
                : 0;

              const rateRetencion = numEnrolled > 0 ? Math.min(100, Math.round((numCompleted / numEnrolled) * 100)) : 0;

              // Abandonment measured from real data: student started the course (watchPercent > 0),
              // never finished it, is below 80% progress, and has had no platform activity for 15+ days
              // (no last_active_at at all counts as inactive). Inactivity is platform-wide, not per course,
              // because student_activity only stores a single last_active_at per user.
              const abandonoThresholdMs = ABANDONMENT_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
              const numAbandoned = enrolledForCourse.filter(s => {
                const prog = s.progressList.find(p => p.courseId === c.id);
                if (!prog || prog.completed || prog.watchPercent >= 80) return false;
                if (!s.activity.last_active_at) return true;
                return (nowTime - new Date(s.activity.last_active_at)) >= abandonoThresholdMs;
              }).length;
              const abandonoRate = numEnrolled > 0 ? Math.round((numAbandoned / numEnrolled) * 100) : 0;

              return {
                id: c.id,
                title: c.title,
                enrolled: numEnrolled,
                active: enrolledForCourse.filter(s => s.activity.last_active_at && (nowTime - new Date(s.activity.last_active_at)) < 7 * 24 * 60 * 60 * 1000).length,
                completed: numCompleted,
                failed: numFailed,
                avgProgress,
                avgTimeSpent,
                retentionRate: rateRetencion,
                abandoned: numAbandoned,
                abandonmentRate: abandonoRate
              };
            });

            // Sort courseStatsList for different categories
            const retentionRanked = [...courseStatsList].sort((a, b) => b.retentionRate - a.retentionRate);
            const abandonmentRanked = [...courseStatsList].sort((a, b) => b.abandonmentRate - a.abandonmentRate);

            // Countries analysis. No se analizan dispositivos ni navegadores: la tabla
            // student_activity no registra esa información, así que no hay dato real que mostrar.
            const countryCounts = {};

            studentTrackingList.forEach(s => {
              const country = s.pais || 'No especificado';
              countryCounts[country] = (countryCounts[country] || 0) + 1;
            });

            // Ensure countries display has some keys
            const countriesDisplay = Object.entries(countryCounts).map(([name, count]) => ({
              name,
              count,
              percent: studentProfiles.length > 0 ? Math.round((count / studentProfiles.length) * 100) : 0
            })).sort((a, b) => b.count - a.count);

            const formatDuration = (totalSec) => {
              const hrs = Math.floor(totalSec / 3600);
              const mins = Math.floor((totalSec % 3600) / 60);
              const secs = totalSec % 60;
              return `${hrs}h ${mins}m ${secs}s`;
            };

            const subTabs = [
              { id: 'dashboard_general', label: 'Dashboard General', icon: BarChart2 },
              { id: 'monitoreo_vivo', label: 'Monitoreo en Vivo', icon: Users },
              { id: 'rendimiento', label: 'Rendimiento Académico', icon: GraduationCap },
              { id: 'certificaciones', label: 'Certificaciones', icon: Award },
              { id: 'uso_plataforma', label: 'Uso de Plataforma', icon: Monitor },
              { id: 'alertas', label: 'Alertas y Cumplimiento', icon: AlertCircle },
              { id: 'rankings', label: 'Rankings y Retención', icon: Clock }
            ];

            return (
              <div className="reports-view" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                {errorTracking && <p className="lms-aviso lms-aviso--error" role="alert">{errorTracking}</p>}
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  .reports-subtab-btn:hover {
                    background-color: var(--bg-active-item) !important;
                    color: var(--primary-cyan) !important;
                  }
                  .reports-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 20px;
                    margin-bottom: 25px;
                  }
                  .kpi-hce-card {
                    background-color: var(--bg-main);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    box-shadow: var(--shadow-card);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                  }
                  .kpi-hce-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                  }
                  .table-hce-container {
                    background-color: var(--bg-main);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: var(--shadow-card);
                    margin-bottom: 25px;
                    overflow: hidden;
                  }
                  .table-hce-title {
                    font-family: 'Sora', sans-serif;
                    font-weight: 700;
                    font-size: 1.15rem;
                    margin-bottom: 15px;
                    color: var(--text-dark);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  }
                  .table-hce {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                  }
                  .table-hce th {
                    padding: 14px 16px;
                    font-weight: 600;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    border-bottom: 2px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  .table-hce td {
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--border-color);
                    color: var(--text-dark);
                    font-size: 0.9rem;
                    vertical-align: middle;
                  }
                  .table-hce tr:last-child td {
                    border-bottom: none;
                  }
                  .table-hce tr:hover td {
                    background-color: var(--bg-gray);
                  }
                  .badge-hce {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: inline-block;
                  }
                  .badge-hce.green {
                    background-color: rgba(16, 185, 129, 0.1);
                    color: #10B981;
                  }
                  .badge-hce.orange {
                    background-color: rgba(245, 158, 11, 0.1);
                    color: #F59E0B;
                  }
                  .badge-hce.red {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #EF4444;
                  }
                  .badge-hce.blue {
                    background-color: rgba(59, 130, 246, 0.1);
                    color: #3B82F6;
                  }
                  .alert-hce-item {
                    background-color: var(--bg-main);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: var(--shadow-card);
                    transition: transform 0.2s ease;
                  }
                  .alert-hce-item:hover {
                    transform: translateX(4px);
                  }
                  .alert-hce-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                  }
                  .alert-hce-icon.danger {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #EF4444;
                  }
                  .alert-hce-icon.warning {
                    background-color: rgba(245, 158, 11, 0.1);
                    color: #F59E0B;
                  }
                  .alert-hce-icon.info {
                    background-color: rgba(0, 188, 212, 0.1);
                    color: var(--primary-cyan);
                  }
                  .progress-hce-bar {
                    height: 8px;
                    background-color: var(--border-color);
                    border-radius: 4px;
                    overflow: hidden;
                    flex: 1;
                  }
                  .progress-hce-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.4s ease;
                  }
                  .reports-subtabs {
                    scrollbar-width: thin;
                    scrollbar-color: var(--primary-cyan) rgba(0, 0, 0, 0.05);
                    padding-bottom: 6px;
                  }
                  .reports-subtabs::-webkit-scrollbar {
                    height: 6px;
                  }
                  .reports-subtabs::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 10px;
                  }
                  .reports-subtabs::-webkit-scrollbar-thumb {
                    background: var(--primary-cyan);
                    border-radius: 10px;
                  }
                  .reports-subtabs::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-cyan-hover);
                  }
                `}</style>

                <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>Reportes Académicos y de Actividad</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-crm-action outlined" onClick={handleExportExcel} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 18px', fontWeight: 600 }}>
                      <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button className="btn-crm-action solid" onClick={() => handleExportPDF({
                      studentProfiles,
                      activeCount,
                      completedCount,
                      approvalRate,
                      retentionRanked,
                      abandonmentRanked,
                      liveConnected,
                      courseStatsList,
                      certificates,
                      webinars,
                      countriesDisplay,
                      alertsList,
                      studentTrackingList,
                      formatDuration
                    })} style={{ borderRadius: '8px', padding: '10px 18px', fontWeight: 600 }}>
                      <FileText size={16} /> PDF
                    </button>
                  </div>
                </div>

                {/* Sub-tab navigation bar */}
                <div className="reports-subtabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                  {subTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = reportsSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        className="reports-subtab-btn"
                        onClick={() => setReportsSubTab(tab.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          borderRadius: '20px',
                          border: '2px solid ' + (isActive ? 'var(--primary-cyan)' : 'transparent'),
                          backgroundColor: isActive ? 'var(--bg-active-item)' : 'transparent',
                          color: isActive ? 'var(--primary-cyan)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUBTAB CONTENT: 1. DASHBOARD GENERAL */}
                {reportsSubTab === 'dashboard_general' && (
                  <div>
                    {/* KPI Cards Row */}
                    <div className="reports-card-grid">
                      <div className="kpi-hce-card" style={{ borderLeft: '4px solid var(--primary-cyan)' }}>
                        <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(0,188,212,0.1)', color: 'var(--primary-cyan)' }}>
                          <GraduationCap size={24} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Alumnos Inscritos</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{studentProfiles.length}</div>
                        </div>
                      </div>

                      <div className="kpi-hce-card" style={{ borderLeft: '4px solid #10B981' }}>
                        <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                          <Users size={24} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Alumnos Activos (Semana)</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{activeCount}</div>
                        </div>
                      </div>

                      <div className="kpi-hce-card" style={{ borderLeft: '4px solid #3B82F6' }}>
                        <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                          <CheckCircle size={24} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cursos Completados</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{completedCount}</div>
                        </div>
                      </div>

                      <div className="kpi-hce-card" style={{ borderLeft: '4px solid #EF4444' }}>
                        <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tasa de Finalización</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{approvalRate}%</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginBottom: '25px' }}>
                      {/* Left Block: Cursos con Mayor Retención */}
                      <div className="table-hce-container">
                        <div className="table-hce-title">
                          <span>🏆 Cursos con Mayor Retención</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Basado en finalizados / inscritos</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {retentionRanked.slice(0, 4).map((c) => (
                            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-gray)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{c.title}</span>
                                <span className="badge-hce green">{c.retentionRate}% Retención</span>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                <span>Inscritos: <strong>{c.enrolled}</strong></span>
                                <span>•</span>
                                <span>Tiempo Prom.: <strong>{formatDuration(c.avgTimeSpent)}</strong></span>
                                <span>•</span>
                                <span>Tasa Abandono: <strong>{c.abandonmentRate}%</strong></span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                <div className="progress-hce-bar">
                                  <div className="progress-hce-fill" style={{ width: `${c.retentionRate}%`, backgroundColor: '#10B981' }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Block: Cursos con Mayor Abandono */}
                      <div className="table-hce-container">
                        <div className="table-hce-title">
                          <span>⚠️ Cursos con Mayor Abandono</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Curso iniciado, sin terminar, avance menor a 80% y sin actividad en la plataforma desde hace {ABANDONMENT_INACTIVE_DAYS}+ días</span>
                        </div>
                        <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                          <table className="table-hce">
                            <thead>
                              <tr>
                                <th>Curso</th>
                                <th>Inscritos</th>
                                <th style={{ textAlign: 'center' }}>Abandonos</th>
                                <th style={{ textAlign: 'right' }}>% Abandono</th>
                              </tr>
                            </thead>
                            <tbody>
                              {abandonmentRanked.slice(0, 4).map(c => (
                                <tr key={c.id}>
                                  <td style={{ fontWeight: 600 }}>{c.title}</td>
                                  <td>{c.enrolled} alumnos</td>
                                  <td style={{ textAlign: 'center' }}>{c.abandoned}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#EF4444' }}>{c.abandonmentRate}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* General course progression */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>📊 Progreso General de Cursos</span>
                      </div>
                      {(() => {
                        const totalUnits = studentTrackingList.reduce((sum, s) => sum + s.progressList.length, 0) || 1;
                        const noIniciados = studentTrackingList.reduce((sum, s) => sum + s.progressList.filter(p => p.watchPercent === 0).length, 0);
                        const enProgreso = studentTrackingList.reduce((sum, s) => sum + s.progressList.filter(p => p.watchPercent > 0 && p.watchPercent < 100).length, 0);
                        const completados = studentTrackingList.reduce((sum, s) => sum + s.progressList.filter(p => p.completed).length, 0);

                        const pctNoIniciados = Math.round((noIniciados / totalUnits) * 100);
                        const pctEnProgreso = Math.round((enProgreso / totalUnits) * 100);
                        const pctCompletados = Math.round((completados / totalUnits) * 100);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--border-color)', margin: '10px 0' }}>
                              <div style={{ width: `${pctCompletados}%`, backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }} title={`Completados: ${pctCompletados}%`}>
                                {pctCompletados > 10 && `${pctCompletados}%`}
                              </div>
                              <div style={{ width: `${pctEnProgreso}%`, backgroundColor: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }} title={`En Progreso: ${pctEnProgreso}%`}>
                                {pctEnProgreso > 10 && `${pctEnProgreso}%`}
                              </div>
                              <div style={{ width: `${pctNoIniciados}%`, backgroundColor: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }} title={`No Iniciados: ${pctNoIniciados}%`}>
                                {pctNoIniciados > 10 && `${pctNoIniciados}%`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>Completados: <strong>{completados}</strong> ({pctCompletados}%)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary-cyan)' }}></div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>En Progreso: <strong>{enProgreso}</strong> ({pctEnProgreso}%)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }}></div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No Iniciados: <strong>{noIniciados}</strong> ({pctNoIniciados}%)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* SUBTAB CONTENT: 2. MONITOREO EN VIVO */}
                {reportsSubTab === 'monitoreo_vivo' && (
                  <div>
                    {/* Connected Real-time block */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>🟢 Alumnos Conectados en Tiempo Real ({liveConnected.length})</span>
                        <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>Vigilancia en Vivo</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Alumno</th>
                              <th>Tiempo acumulado en plataforma</th>
                              <th>Acción Actual</th>
                              <th>País</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveConnected.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                  No hay alumnos conectados en vivo en este momento.
                                </td>
                              </tr>
                            ) : (
                              liveConnected.map(student => (
                                <tr key={student.id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(0,188,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary-cyan)', fontSize: '0.8rem' }}>
                                        {student.avatar_url ? (
                                          <img src={student.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          (student.nombre_completo || 'U').charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600 }}>{student.nombre_completo || student.email}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.grado || 'Grado no registrado'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td><strong>{formatDuration(student.activity.session_duration)}</strong></td>
                                  <td>{student.activity.current_action || 'Sin registro'}</td>
                                  <td>{student.pais || 'No especificado'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Alumnos Inactivos Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                      <div className="table-hce-container" style={{ borderTop: '4px solid #F59E0B' }}>
                        <div className="table-hce-title" style={{ fontSize: '1rem' }}>
                          <span>⚠️ Alumnos Inactivos (7 días)</span>
                          <span className="badge-hce orange">{inactive7d.length}</span>
                        </div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {inactive7d.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ninguno</div>
                          ) : (
                            inactive7d.map(s => (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-gray)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.nombre_completo || s.email}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hace {Math.floor((nowTime - new Date(s.activity.last_active_at)) / (24 * 60 * 60 * 1000))}d</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="table-hce-container" style={{ borderTop: '4px solid #EF4444' }}>
                        <div className="table-hce-title" style={{ fontSize: '1rem' }}>
                          <span>🚨 Alumnos Inactivos (15+ días)</span>
                          <span className="badge-hce red">{inactive15d.length}</span>
                        </div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {inactive15d.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ninguno</div>
                          ) : (
                            inactive15d.map(s => (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-gray)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.nombre_completo || s.email}</span>
                                <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>Hace {Math.floor((nowTime - new Date(s.activity.last_active_at)) / (24 * 60 * 60 * 1000))}d</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="table-hce-container" style={{ borderTop: '4px solid #7F1D1D' }}>
                        <div className="table-hce-title" style={{ fontSize: '1rem' }}>
                          <span>❌ Alumnos Inactivos (30+ días)</span>
                          <span className="badge-hce red" style={{ backgroundColor: 'rgba(127,29,29,0.2)', color: '#7F1D1D' }}>{inactive30d.length}</span>
                        </div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {inactive30d.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ninguno</div>
                          ) : (
                            inactive30d.map(s => (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-gray)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.nombre_completo || s.email}</span>
                                <span style={{ fontSize: '0.75rem', color: '#7F1D1D', fontWeight: 700 }}>Crítico ({s.activity.last_active_at ? `${Math.floor((nowTime - new Date(s.activity.last_active_at)) / (24 * 60 * 60 * 1000))}d` : 'Nunca'})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Últimos Accesos */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>📅 Últimos Accesos a la Plataforma</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Alumno</th>
                              <th>Última Conexión</th>
                              <th>Hora</th>
                              <th>Acción Realizada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lastAccesses.slice(0, 10).map(s => {
                              const d = new Date(s.activity.last_active_at);
                              return (
                                <tr key={s.id}>
                                  <td><strong>{s.nombre_completo || s.email}</strong></td>
                                  <td>{d.toLocaleDateString('es-MX')}</td>
                                  <td>{d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                                  <td>{s.activity.current_action}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB CONTENT: 3. RENDIMIENTO ACADÉMICO */}
                {reportsSubTab === 'rendimiento' && (
                  <div>
                    {/* Rendimiento por Curso Table */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>🎓 Rendimiento Detallado por Curso</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Curso</th>
                              <th>Inscritos</th>
                              <th>Activos (7d)</th>
                              <th>Completados</th>
                              <th>Casi terminados</th>
                              <th>Avance Promedio</th>
                              <th>Tasa Finalización</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseStatsList.map(c => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600 }}>{c.title}</td>
                                <td>{c.enrolled} alumnos</td>
                                <td>{c.active}</td>
                                <td><span className="badge-hce green">{c.completed}</span></td>
                                <td><span className="badge-hce orange">{c.failed}</span></td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="progress-hce-bar" style={{ width: '60px' }}>
                                      <div className="progress-hce-fill" style={{ width: `${c.avgProgress}%`, backgroundColor: 'var(--primary-cyan)' }}></div>
                                    </div>
                                    <span>{c.avgProgress}%</span>
                                  </div>
                                </td>
                                <td><strong>{c.retentionRate}%</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Seguimiento Clínico de Capacitación */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>🩺 Seguimiento Clínico de Capacitación Médica</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: 600 }}>Exclusivo HCE</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Programa Médico</th>
                              <th style={{ textAlign: 'center' }}>Inscritos</th>
                              <th style={{ textAlign: 'center' }}>Activos</th>
                              <th style={{ textAlign: 'center' }}>Completados</th>
                              <th style={{ textAlign: 'center' }}>Certificados</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseStatsList.map(c => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 700 }}>{c.title}</td>
                                <td style={{ textAlign: 'center' }}>{c.enrolled}</td>
                                <td style={{ textAlign: 'center' }}>{c.active}</td>
                                <td style={{ textAlign: 'center' }}>{c.completed}</td>
                                <td style={{ textAlign: 'center' }}><span className="badge-hce green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>{c.completed} Cert.</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB CONTENT: 4. CERTIFICACIONES */}
                {reportsSubTab === 'certificaciones' && (
                  <div>
                    {/* Period comparison */}
                    <div className="reports-card-grid">
                      {(() => {
                        const getCertsInPeriod = (days) => {
                          const limit = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
                          if (days === 7) limit.setDate(limit.getDate() - (limit.getDay() + 6) % 7);
                          if (days === 30) limit.setDate(1);
                          if (days === 365) limit.setMonth(0, 1);
                          return certificates.filter(c => new Date(c.created_at) >= limit && new Date(c.created_at) <= nowTime).length;
                        };
                        return (
                          <>
                            <div className="kpi-hce-card" style={{ borderLeft: '4px solid #10B981' }}>
                              <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                                <Award size={24} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Emitidos Hoy</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getCertsInPeriod(1)}</div>
                              </div>
                            </div>
                            <div className="kpi-hce-card" style={{ borderLeft: '4px solid var(--primary-cyan)' }}>
                              <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(0,188,212,0.1)', color: 'var(--primary-cyan)' }}>
                                <Award size={24} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Esta Semana</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getCertsInPeriod(7)}</div>
                              </div>
                            </div>
                            <div className="kpi-hce-card" style={{ borderLeft: '4px solid #3B82F6' }}>
                              <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                                <Award size={24} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Este Mes</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getCertsInPeriod(30)}</div>
                              </div>
                            </div>
                            <div className="kpi-hce-card" style={{ borderLeft: '4px solid #F59E0B' }}>
                              <div style={{ marginRight: '15px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                                <Award size={24} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Este Año</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getCertsInPeriod(365)}</div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Certificados por Curso */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>📜 Certificaciones por Curso</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Curso Académico</th>
                              <th style={{ textAlign: 'right' }}>Certificados Emitidos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseStatsList.map(c => (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600 }}>{c.title}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-cyan)', fontSize: '1.05rem' }}>{c.completed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Certificaciones Pendientes */}
                    <div className="table-hce-container" style={{ borderTop: '4px solid #F59E0B' }}>
                      <div className="table-hce-title">
                        <span>⌛ Certificaciones Pendientes de Emisión</span>
                        <span className="badge-hce orange">{pendingCertificates.length} alumnos</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Alumno</th>
                              <th>Curso</th>
                              <th>Progreso</th>
                              <th style={{ textAlign: 'right' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingCertificates.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                  No hay alumnos con certificados pendientes.
                                </td>
                              </tr>
                            ) : (
                              pendingCertificates.map((pending, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <strong>{pending.studentName}</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pending.studentEmail}</div>
                                  </td>
                                  <td>{pending.courseTitle}</td>
                                  <td><span className="badge-hce green">Lecciones completas o examen aprobado</span></td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button
                                      className="btn-crm-action solid"
                                      disabled={actionLoading}
                                      onClick={() => handleIssueCertificate(pending.studentId, pending.courseId)}
                                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                                    >
                                      Emitir Certificado
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Certificaciones Recientes */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>📜 Certificaciones Emitidas Recientemente</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>Alumno</th>
                              <th>Curso</th>
                              <th>Folio</th>
                              <th>Calificación</th>
                              <th>Fecha</th>
                              <th style={{ textAlign: 'right' }}>Certificado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {certificates.slice(0, 10).map(cert => {
                              const sName = cert.profiles?.nombre_completo || cert.profiles?.email || 'Alumno';
                              const cTitle = cert.courses?.title || 'Curso Académico';
                              return (
                                <tr key={cert.id}>
                                  <td><strong>{sName}</strong></td>
                                  <td>{cTitle}</td>
                                  <td><code style={{ fontSize: '0.85rem' }}>{cert.folio}</code></td>
                                  <td><strong>{cert.score}%</strong></td>
                                  <td>{new Date(cert.created_at).toLocaleDateString()}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    {cert.pdf_url ? (
                                      <a href={cert.pdf_url} target="_blank" rel="noreferrer" className="badge-hce green" style={{ textDecoration: 'none', cursor: 'pointer' }}>Ver PNG</a>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No disponible</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}


                {/* SUBTAB CONTENT: 6. USO DE PLATAFORMA */}
                {reportsSubTab === 'uso_plataforma' && (
                  <div>
                    {/* Geographics countries list */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>🌎 Ubicación Geográfica de Alumnos</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th>País</th>
                              <th>Número de Alumnos</th>
                              <th style={{ textAlign: 'right' }}>Porcentaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {countriesDisplay.length === 0 ? (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                  No hay datos geográficos registrados.
                                </td>
                              </tr>
                            ) : (
                              countriesDisplay.map((country, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{country.name}</td>
                                  <td>{country.count} alumno(s)</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-cyan)' }}>{country.percent}%</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB CONTENT: 7. ALERTAS Y CUMPLIMIENTO */}
                {reportsSubTab === 'alertas' && (
                  <div>
                    <div className="table-hce-container">
                      <div className="table-hce-title" style={{ marginBottom: '20px' }}>
                        <span>🚨 Centro de Alertas Académicas y de Cumplimiento</span>
                        <span className="badge-hce red" style={{ fontWeight: 700 }}>Alerta de Supervisión HCE</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {alertsList.map((alert, idx) => (
                          <div key={idx} className="alert-hce-item">
                            <div className={`alert-hce-icon ${alert.type}`}>
                              <AlertCircle size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{alert.text}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{alert.type === 'danger' ? 'Revisar y contactar al alumno.' : alert.type === 'warning' ? 'Dar seguimiento académico.' : 'Información de la plataforma.'}</div>
                            </div>
                            <span className={`badge-hce ${alert.type === 'danger' ? 'red' : alert.type === 'warning' ? 'orange' : 'blue'}`} style={{ fontSize: '0.7rem' }}>{alert.type === 'danger' ? 'ALTA' : alert.type === 'warning' ? 'ATENCIÓN' : 'INFORMATIVA'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB CONTENT: 8. RANKINGS Y RETENCIÓN */}
                {reportsSubTab === 'rankings' && (
                  <div>
                    {/* Overall students ranking by study hours */}
                    <div className="table-hce-container">
                      <div className="table-hce-title">
                        <span>🏆 Ranking de Alumnos por Tiempo de Estudio</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: 600 }}>Monitoreo General de Cumplimiento</span>
                      </div>
                      <div className="crm-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="table-hce">
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>Rank</th>
                              <th>Alumno</th>
                              <th>País</th>
                              <th>Cursos Inscritos</th>
                              <th>Completados</th>
                              <th style={{ textAlign: 'right' }}>Tiempo Total de Estudio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...studentTrackingList]
                              .map(s => {
                                const totalTime = s.progressList.reduce((acc, p) => acc + (p.timeSpent || 0), 0);
                                const enrolled = s.progressList.filter(p => p.watchPercent > 0).length;
                                const completed = s.progressList.filter(p => p.completed).length;
                                return { ...s, totalTime, enrolled, completed };
                              })
                              .sort((a, b) => b.totalTime - a.totalTime)
                              .map((student, index) => (
                                <tr key={student.id}>
                                  <td style={{ fontWeight: 800, color: index === 0 ? '#FFB300' : 'var(--text-muted)', fontSize: '1.1rem' }}>
                                    #{index + 1}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(0,188,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary-cyan)', fontSize: '0.75rem' }}>
                                        {student.avatar_url ? (
                                          <img src={student.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          (student.nombre_completo || 'U').charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <strong>{student.nombre_completo || student.email}</strong>
                                    </div>
                                  </td>
                                  <td>{student.pais || 'No especificado'}</td>
                                  <td>{student.enrolled} cursos</td>
                                  <td><span className="badge-hce green">{student.completed} completados</span></td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-cyan)', fontSize: '0.95rem' }}>
                                    {formatDuration(student.totalTime)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
  );
}
