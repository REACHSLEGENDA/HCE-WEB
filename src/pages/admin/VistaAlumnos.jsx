// Vista de administración: students. Estado y operaciones permanecen en AdminDashboard.
export default function VistaAlumnos({ contexto }) {
  const {
    CuentasPorActivar,
    Download,
    Filter,
    Lock,
    Plus,
    Search,
    SolicitudesInscripcion,
    Trash2,
    Unlock,
    X,
    actionLoading,
    certificates,
    courses,
    cuentasPendientes,
    descargarCsv,
    divisionesLista,
    downloadCertificateFile,
    enrollCourseId,
    especialidades,
    fetchProfiles,
    filteredStudents,
    formatDate,
    handleCloseAddStudentModal,
    handleCreateStudent,
    handleManualEnroll,
    handleQuitarInscripcion,
    handleToggleBlockStudent,
    inscribiendoAlumno,
    inscripcionesAlumno,
    loadingProfiles,
    newStudentForm,
    paises,
    profiles,
    selectedStudent,
    setEnrollCourseId,
    setNewStudentForm,
    setReporteAlumno,
    setSelectedStudent,
    setShowAddStudentModal,
    setStudentCountryFilter,
    setStudentDivisionFilter,
    setStudentSearch,
    setStudentSpecialtyFilter,
    showAddStudentModal,
    showConfirm,
    showToast,
    studentCountryFilter,
    studentDivisionFilter,
    studentSearch,
    studentSpecialtyFilter,
  } = contexto;
  return (
<div className="students-view">
              <div className="section-title-row">
                <h2>Directorio de Alumnos Registrados</h2>
                <button className="btn-crm-action outlined" onClick={() => descargarCsv([['Nombre', 'Correo', 'Especialidad', 'País', 'Registro', 'Estado'], ...filteredStudents.map((p) => [p.nombre_completo, p.email, p.especialidad || p.user_metadata?.especialidad, p.pais || p.user_metadata?.pais, formatDate(p.created_at), p.activo === false ? (p.aprobado === false ? 'Rechazado' : 'Bloqueado') : p.aprobado === false ? 'Por activar' : 'Activo'])], 'Alumnos_filtrados.csv')} disabled={!filteredStudents.length}><Download size={16} /> Exportar CSV</button>
                <button className="btn-crm-action solid" onClick={() => setShowAddStudentModal(true)}>
                  <Plus size={16} />
                  <span>Agregar Alumno</span>
                </button>
              </div>

              <CuentasPorActivar
                pendientes={cuentasPendientes}
                cursos={courses}
                onCambio={fetchProfiles}
                notificar={showToast}
                confirmar={showConfirm}
              />

              <SolicitudesInscripcion perfiles={profiles} cursos={courses} notificar={showToast} />

              {/* Filters toolbar */}
              <div className="filters-toolbar">
                <div className="search-box-wrapper">
                  <Search size={18} className="search-icon-inside" />
                  <input
                    type="text"
                    placeholder="Buscar alumno por nombre, apellido o correo..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <div className="filters-group" style={{ display: 'flex', gap: '12px' }}>
                  <div className="filter-select-wrapper">
                    <Filter size={14} className="filter-icon-inside" />
                    <select value={studentSpecialtyFilter} onChange={(e) => setStudentSpecialtyFilter(e.target.value)}>
                      <option value="">Todas las Especialidades</option>
                      {especialidades.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
                    </select>
                  </div>

                  {divisionesLista.length > 0 && (
                    <div className="filter-select-wrapper">
                      <select value={studentDivisionFilter} onChange={(e) => setStudentDivisionFilter(e.target.value)} aria-label="División">
                        <option value="">Todas las divisiones</option>
                        {divisionesLista.map((d) => <option key={d.id} value={String(d.id)}>{d.nombre}</option>)}
                        <option value="sin">Sin división</option>
                      </select>
                    </div>
                  )}

                  <div className="filter-select-wrapper">
                    <select value={studentCountryFilter} onChange={(e) => setStudentCountryFilter(e.target.value)}>
                      <option value="">Todos los Países</option>
                      {paises.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Add Student Modal */}
              {showAddStudentModal && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-card large">
                    <div className="modal-header">
                      <h3>Registrar Alumno Nuevo</h3>
                      <button className="modal-close-btn" onClick={handleCloseAddStudentModal}>
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateStudent} className="modal-body-form">
                      <div className="form-group-row">
                        <div className="crm-input-group">
                          <label>Nombre(s) *</label>
                          <input type="text" required value={newStudentForm.nombres} onChange={(e) => setNewStudentForm({...newStudentForm, nombres: e.target.value})} placeholder="Christian" />
                        </div>
                        <div className="crm-input-group">
                          <label>Apellido(s) *</label>
                          <input type="text" required value={newStudentForm.apellidos} onChange={(e) => setNewStudentForm({...newStudentForm, apellidos: e.target.value})} placeholder="González" />
                        </div>
                      </div>

                      <div className="form-group-row">
                        <div className="crm-input-group">
                          <label>Correo Electrónico *</label>
                          <input type="email" required value={newStudentForm.email} onChange={(e) => setNewStudentForm({...newStudentForm, email: e.target.value})} placeholder="correo@ejemplo.com" />
                        </div>
                        <div className="crm-input-group">
                          <label>Contraseña Temporal *</label>
                          <input type="password" required minLength={8} value={newStudentForm.password} onChange={(e) => setNewStudentForm({...newStudentForm, password: e.target.value})} placeholder="mín. 8 caracteres" />
                        </div>
                      </div>

                      <div className="form-group-row">
                        <div className="crm-input-group">
                          <label>Teléfono de Contacto</label>
                          <input type="text" value={newStudentForm.telefono} onChange={(e) => setNewStudentForm({...newStudentForm, telefono: e.target.value})} placeholder="+52 55 1234 5678" />
                        </div>
                        <div className="crm-input-group">
                          <label>País</label>
                          <input type="text" value={newStudentForm.pais} onChange={(e) => setNewStudentForm({...newStudentForm, pais: e.target.value})} placeholder="México" />
                        </div>
                      </div>

                      <div className="form-group-row">
                        <div className="crm-input-group">
                          <label>Estado / Ciudad</label>
                          <input type="text" value={newStudentForm.estado} onChange={(e) => setNewStudentForm({...newStudentForm, estado: e.target.value})} placeholder="CDMX" />
                        </div>
                        <div className="crm-input-group">
                          <label>Grado Académico / Profesión</label>
                          <input type="text" value={newStudentForm.grado} onChange={(e) => setNewStudentForm({...newStudentForm, grado: e.target.value})} placeholder="Médico Cirujano" />
                        </div>
                      </div>

                      <div className="form-group-row">
                        <div className="crm-input-group">
                          <label>Especialidad</label>
                          <input type="text" value={newStudentForm.especialidad} onChange={(e) => setNewStudentForm({...newStudentForm, especialidad: e.target.value})} placeholder="Terapia Intensiva" />
                        </div>
                        <div className="crm-input-group">
                          <label>Institución / Hospital</label>
                          <input type="text" value={newStudentForm.institucion} onChange={(e) => setNewStudentForm({...newStudentForm, institucion: e.target.value})} placeholder="Hospital de Especialidades" />
                        </div>
                      </div>

                      <div className="crm-input-group">
                        <label>Cargo / Puesto</label>
                        <input type="text" value={newStudentForm.cargo} onChange={(e) => setNewStudentForm({...newStudentForm, cargo: e.target.value})} placeholder="Jefe de UTI" />
                      </div>

                      <div className="form-action-row" style={{ marginTop: '20px' }}>
                        <button type="submit" className="btn-crm-action solid" disabled={actionLoading}>
                          {actionLoading ? 'Registrando...' : 'Registrar Alumno'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Table of students */}
              <div className="table-responsive-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Ubicación</th>
                      <th>Especialidad</th>
                      <th>Registro</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProfiles ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Cargando directorio de alumnos...</td></tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>No se encontraron alumnos con los criterios de búsqueda.</td></tr>
                    ) : filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar-circle mini" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {student.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt="Avatar"
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                student.nombre_completo ? student.nombre_completo.charAt(0).toUpperCase() : 'U'
                              )}
                            </div>
                            <strong>{student.nombre_completo || 'Usuario HCE'}</strong>
                          </div>
                        </td>
                        <td>{student.email}</td>
                        <td>
                          {(student.pais || student.user_metadata?.pais) ? (
                            <span>{student.pais || student.user_metadata?.pais}, {student.estado || student.user_metadata?.estado}</span>
                          ) : 'No especificado'}
                        </td>
                        <td>{student.especialidad || student.user_metadata?.especialidad || 'No registrado'}</td>
                        <td>{formatDate(student.created_at)}</td>
                        <td>
                          <span className={`status-pill ${student.activo === false ? 'inactivo' : student.aprobado === false ? 'pendiente' : 'disponible'}`}>
                            {student.activo === false ? (student.aprobado === false ? 'Rechazado' : 'Bloqueado') : student.aprobado === false ? 'Por activar' : 'Activo'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-crm-action outlined mini" onClick={() => setSelectedStudent(student)}>
                              Detalle / Matrícula
                            </button>
                            <button className="btn-crm-action outlined mini" onClick={() => setReporteAlumno(student)}>Reporte completo</button>
                            <button className="icon-action-btn edit" onClick={() => handleToggleBlockStudent(student)} title={student.activo !== false ? 'Bloquear' : 'Activar'}>
                              {student.activo !== false ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Student detail drawer */}
              {selectedStudent && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-card">
                    <div className="modal-header">
                      <h3>Expediente del Alumno</h3>
                      <button type="button" className="btn-crm-action outlined mini" style={{ marginLeft: 'auto', marginRight: 8 }} onClick={() => { setReporteAlumno(selectedStudent); setSelectedStudent(null); }}>
                        Reporte completo
                      </button>
                      <button className="modal-close-btn" onClick={() => setSelectedStudent(null)}>
                        <X size={20} />
                      </button>
                    </div>

                    <div className="modal-body-detail">
                      <div className="profile-card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                        <div className="profile-big-avatar" style={{ margin: '0 auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedStudent.avatar_url ? (
                            <img
                              src={selectedStudent.avatar_url}
                              alt="Avatar"
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            selectedStudent.nombre_completo ? selectedStudent.nombre_completo.charAt(0).toUpperCase() : 'U'
                          )}
                        </div>
                        <h3 style={{ marginTop: '15px' }}>{selectedStudent.nombre_completo || 'Alumno HCE'}</h3>
                        <span className="user-role-badge">Estudiante</span>
                      </div>

                      {/* Detailed clinical registration metadata */}
                      <div className="student-metadata-details" style={{ marginTop: '20px' }}>
                        <h4>Datos Clínicos de Registro</h4>
                        <div className="metadata-grid-detail">
                          <div className="detail-item-row">
                            <strong>Correo:</strong>
                            <span>{selectedStudent.email}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Teléfono:</strong>
                            <span>{selectedStudent.telefono || selectedStudent.user_metadata?.telefono || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>País:</strong>
                            <span>{selectedStudent.pais || selectedStudent.user_metadata?.pais || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Estado / Ciudad:</strong>
                            <span>{selectedStudent.estado || selectedStudent.user_metadata?.estado || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Profesión / Grado:</strong>
                            <span>{selectedStudent.grado || selectedStudent.user_metadata?.grado || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Especialidad:</strong>
                            <span>{selectedStudent.especialidad || selectedStudent.user_metadata?.especialidad || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Hospital / Institución:</strong>
                            <span>{selectedStudent.institucion || selectedStudent.user_metadata?.institucion || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Cargo / Puesto:</strong>
                            <span>{selectedStudent.cargo || selectedStudent.user_metadata?.cargo || 'No registrado'}</span>
                          </div>
                          <div className="detail-item-row">
                            <strong>Miembro desde:</strong>
                            <span>{formatDate(selectedStudent.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Enroll Course Action */}
                      <div className="enrollment-management-block" style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h4>Cursos inscritos</h4>
                        {inscripcionesAlumno === null ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Las inscripciones se activan al correr la migración de cursos en Supabase.
                          </p>
                        ) : inscripcionesAlumno.length === 0 ? (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Todavía no está inscrito en ningún curso.
                          </p>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {inscripcionesAlumno.map(ins => {
                              const curso = courses.find(c => c.id === ins.course_id);
                              const origenes = { gratis: 'Se inscribió solo', pago: 'Pagó', admin: 'Inscrito por admin', previo: 'Ya lo estaba tomando' };
                              return (
                                <li key={ins.course_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{curso?.title || `Curso #${ins.course_id}`}</div>
                                    <small style={{ color: 'var(--text-muted)' }}>
                                      {origenes[ins.origen] || ins.origen} · {new Date(ins.created_at).toLocaleDateString()}
                                    </small>
                                  </div>
                                  <button
                                    type="button"
                                    className="icon-action-btn delete"
                                    title="Quitar acceso"
                                    disabled={inscribiendoAlumno}
                                    onClick={() => handleQuitarInscripcion(ins.course_id)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <h4 style={{ marginTop: '22px' }}>Inscribir en un curso</h4>
                        <form onSubmit={handleManualEnroll} style={{ marginTop: '10px' }}>
                          <div className="crm-input-group">
                            <label>Seleccionar Programa</label>
                            <select
                              value={enrollCourseId}
                              onChange={(e) => setEnrollCourseId(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-gray)'
                              }}
                            >
                              <option value="">Selecciona un curso...</option>
                              {courses
                                .filter(c => !(inscripcionesAlumno || []).some(ins => ins.course_id === c.id))
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.title} ({c.tipo === 'pago' ? 'de pago' : 'gratis'})</option>
                                ))}
                            </select>
                          </div>
                          <button type="submit" className="btn-crm-action solid" style={{ marginTop: '15px', width: '100%' }} disabled={inscribiendoAlumno || inscripcionesAlumno === null}>
                            {inscribiendoAlumno ? 'Guardando…' : 'Inscribir alumno'}
                          </button>
                          <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Sirve para becas y casos manuales: da acceso aunque el curso sea de pago.
                          </small>
                        </form>
                      </div>

                      {/* Progress summary */}
                      <div className="student-academic-summary" style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h4>Historial Académico (Certificados)</h4>
                        {certificates.filter(c => c.user_id === selectedStudent.id).length === 0 ? (
                          <div className="crm-empty-state-card mini">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay certificados emitidos para este alumno.</p>
                          </div>
                        ) : (
                          <div className="table-responsive-container" style={{ marginTop: '10px' }}>
                            <table className="admin-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th>Folio</th>
                                  <th>Curso</th>
                                  <th>Calificación</th>
                                  <th>Fecha de Emisión</th>
                                  <th>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {certificates.filter(c => c.user_id === selectedStudent.id).map(cert => (
                                  <tr key={cert.id}>
                                    <td><strong>#{cert.folio}</strong></td>
                                    <td>{cert.courses?.title || 'Curso Académico'}</td>
                                    <td>{cert.score}%</td>
                                    <td>{new Date(cert.created_at).toLocaleDateString()}</td>
                                    <td>
                                      <button
                                        onClick={() => downloadCertificateFile(cert.pdf_url, `Certificado_${cert.folio}.png`)}
                                        className="btn-crm-action solid mini"
                                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                      >
                                        Descargar
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
  );
}
