// Vista de administración: admins. Estado y operaciones permanecen en AdminDashboard.
export default function VistaAdministradores({ contexto }) {
  const {
    Lock,
    UserPlus,
    X,
    actionLoading,
    adminUsers,
    formatDate,
    handleCloseAddAdminModal,
    handleCreateAdmin,
    newAdminForm,
    setNewAdminForm,
    setShowAddAdminModal,
    showAddAdminModal,
    showAlert,
    user,
  } = contexto;
  return (
<div className="admins-view">
              <div className="section-title-row">
                <h2>Gestión de Usuarios Administrativos</h2>
                <button className="btn-crm-action solid" onClick={() => setShowAddAdminModal(true)}>
                  <UserPlus size={16} />
                  <span>Crear Administrador</span>
                </button>
              </div>

              {/* Add admin modal */}
              {showAddAdminModal && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-card">
                    <div className="modal-header">
                      <h3>Crear Nuevo Administrador</h3>
                      <button className="modal-close-btn" onClick={handleCloseAddAdminModal}>
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateAdmin} className="modal-body-form">
                      <div className="crm-input-group">
                        <label>Nombre(s) *</label>
                        <input type="text" required value={newAdminForm.nombres} onChange={(e) => setNewAdminForm({...newAdminForm, nombres: e.target.value})} placeholder="Nombre" />
                      </div>
                      <div className="crm-input-group">
                        <label>Apellido(s) *</label>
                        <input type="text" required value={newAdminForm.apellidos} onChange={(e) => setNewAdminForm({...newAdminForm, apellidos: e.target.value})} placeholder="Apellido" />
                      </div>
                      <div className="crm-input-group">
                        <label>Correo Electrónico *</label>
                        <input type="email" required value={newAdminForm.email} onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})} placeholder="admin@hce.com" />
                      </div>
                      <div className="crm-input-group">
                        <label>Contraseña *</label>
                        <input type="password" required minLength={8} value={newAdminForm.password} onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})} placeholder="mín. 8 caracteres" />
                      </div>

                      <div className="form-action-row" style={{ marginTop: '20px' }}>
                        <button type="submit" className="btn-crm-action solid" disabled={actionLoading}>
                          {actionLoading ? 'Guardando...' : 'Crear Admin'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Admins Table */}
              <div className="table-responsive-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Fecha de Creación</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.length === 0 ? (
                      <tr>
                        {/* Always render current admin if DB is empty */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar-circle mini">A</div>
                            <strong>Administrador Principal</strong>
                          </div>
                        </td>
                        <td>{user?.email || 'admin@hce-latam.com'}</td>
                        <td><span className="status-pill disponible">Jefe de UTI (Admin)</span></td>
                        <td>{formatDate(new Date().toISOString())}</td>
                        <td><span className="status-pill disponible">Activo</span></td>
                        <td>-</td>
                      </tr>
                    ) : adminUsers.map(admin => (
                      <tr key={admin.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar-circle mini">
                              {admin.nombre_completo ? admin.nombre_completo.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <strong>{admin.nombre_completo || 'Admin HCE'}</strong>
                          </div>
                        </td>
                        <td>{admin.email}</td>
                        <td><span className="status-pill disponible">Administrador</span></td>
                        <td>{formatDate(admin.created_at)}</td>
                        <td><span className="status-pill disponible">Activo</span></td>
                        <td>
                          {admin.email !== user?.email ? (
                            <button className="icon-action-btn delete" onClick={() => showAlert('La revocación de permisos requiere panel de control de Supabase Auth.', 'Revocación de Permisos')}>
                              <Lock size={16} />
                            </button>
                          ) : 'Actual'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
  );
}
