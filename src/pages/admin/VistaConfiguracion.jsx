// Vista de administración: settings. Estado y operaciones permanecen en AdminDashboard.
export default function VistaConfiguracion({ contexto }) {
  const {
    Eye,
    EyeOff,
    GamificacionAdmin,
    Monitor,
    Moon,
    React,
    Sun,
    confirmNewPassword,
    faltaPortalConfig,
    guardandoBienvenida,
    handleSaveWelcomeMessage,
    handleUpdatePassword,
    newPassword,
    portalSettings,
    setConfirmNewPassword,
    setNewPassword,
    setPortalSettings,
    setShowConfirmNewPassword,
    setShowNewPassword,
    setTheme,
    showConfirmNewPassword,
    showNewPassword,
    showToast,
    theme,
    updatePasswordLoading,
  } = contexto;
  return (
<div className="settings-view">
              <div className="section-title-row">
                <h2>Configuración del Portal</h2>
              </div>

              <div className="settings-card" style={{ marginBottom: '30px' }}>
                <div className="settings-card-header">
                  <h3>Gamificación</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Puntos, niveles, insignias y recompensas de los alumnos.</p>
                </div>
                <GamificacionAdmin notificar={showToast} />
              </div>

              {/* Theme Selector */}
              <div className="settings-card" style={{ marginBottom: '30px' }}>
                <div className="settings-card-header">
                  <h3>Apariencia</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Elige el tema visual del panel.</p>
                </div>
                <div className="theme-selector-row">
                  {[
                    { value: 'light',  label: 'Claro', icon: Sun },
                    { value: 'dark',   label: 'Oscuro', icon: Moon },
                    { value: 'system', label: 'Sistema', icon: Monitor },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`theme-option-btn${theme === value ? ' active' : ''}`}
                      onClick={() => setTheme(value)}
                    >
                      {React.createElement(icon, { size: 20 })}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Welcome Message Configuration Card */}
                <div className="settings-card">
                  <h3>Mensaje de Bienvenida (Estudiantes)</h3>
                  <form className="crm-settings-form" style={{ marginTop: '20px' }} onSubmit={handleSaveWelcomeMessage}>
                    <div className="crm-input-group">
                      <label>Texto del Mensaje de Bienvenida</label>
                      <textarea
                        required
                        rows="3"
                        value={portalSettings.bienvenidaEstudiante}
                        onChange={(e) => setPortalSettings({...portalSettings, bienvenidaEstudiante: e.target.value})}
                        placeholder="Escribe el mensaje de bienvenida..."
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-gray)',
                          fontFamily: 'inherit',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    {faltaPortalConfig && (
                      <small style={{ display: 'block', color: 'var(--accent-orange)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                        Falta correr la migración endurecimiento.sql: hasta entonces el mensaje no se puede guardar.
                      </small>
                    )}

                    <button type="submit" className="btn-crm-action solid" style={{ marginTop: '10px' }} disabled={guardandoBienvenida}>
                      {guardandoBienvenida ? 'Guardando…' : 'Guardar Mensaje'}
                    </button>
                  </form>
                </div>

                {/* Password Change Configuration Card */}
                <div className="settings-card">
                  <h3>Cambiar Contraseña Administrativa</h3>
                  <form className="crm-settings-form" style={{ marginTop: '20px' }} onSubmit={handleUpdatePassword}>
                    <div className="crm-input-group">
                      <label>Nueva Contraseña (mín. 6 caracteres)</label>
                      <div className="input-wrapper" style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          required
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex="-1"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="crm-input-group">
                      <label>Confirmar Nueva Contraseña</label>
                      <div className="input-wrapper" style={{ position: 'relative' }}>
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          required
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          tabIndex="-1"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn-crm-action solid" style={{ marginTop: '10px' }} disabled={updatePasswordLoading}>
                      {updatePasswordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
  );
}
