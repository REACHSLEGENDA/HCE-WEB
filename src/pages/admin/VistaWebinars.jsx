// Vista de administración: webinars. Estado y operaciones permanecen en AdminDashboard.
export default function VistaWebinars({ contexto }) {
  const {
    Download,
    Edit,
    LISTA_WEBINARS_BREVO,
    Plus,
    PosicionadorConstancia,
    RefreshCw,
    Trash2,
    Upload,
    Users,
    X,
    editingWebinar,
    exportarRegistrosWebinar,
    extraerZoomId,
    fetchWebinarRegistros,
    handleDeleteWebinar,
    handleEditWebinar,
    handlePlantillaConstanciaUpload,
    handleSaveWebinar,
    handleSincronizarWebinar,
    handleWebinarImageUpload,
    isWebinarLive,
    setEditingWebinar,
    setShowWebinarForm,
    setWebinarForm,
    setWebinarRegistros,
    showWebinarForm,
    sincronizandoWebinar,
    webinarForm,
    webinarRegistros,
    webinars,
  } = contexto;
  return (
<div className="webinars-view">
              <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Gestión de Webinars Gratuitos</h2>
                {!showWebinarForm && (
                  <button
                    className="btn-crm-action solid"
                    onClick={() => {
                      setEditingWebinar(null);
                      setWebinarForm({
                        title: '',
                        date: '',
                        time: '',
                        image_url: '',
                        link: '',
                        fecha_inicio: '',
                        fecha_fin: '',
                        activo: true,
                        registro_portal: false,
                        zoom_id: '',
                        zoom_tipo: 'webinar',
                        minutos_minimos: 0,
                        constancia_estado: 'bloqueada',
                        codigo: '',
                        brevo_lista_id: LISTA_WEBINARS_BREVO,
                        certificado_template_url: '',
                        certificado_x: '',
                        certificado_y: '',
                        certificado_font_size: ''
                      });
                      setShowWebinarForm(true);
                    }}
                  >
                    <Plus size={16} /> Crear Webinar
                  </button>
                )}
              </div>

              {showWebinarForm ? (
                <div className="settings-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <h3>{editingWebinar ? 'Editar Webinar' : 'Crear Nuevo Webinar'}</h3>
                  <form onSubmit={handleSaveWebinar} className="crm-settings-form" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="crm-input-group">
                      <label>Título del Webinar *</label>
                      <input
                        type="text"
                        required
                        value={webinarForm.title}
                        onChange={(e) => setWebinarForm({ ...webinarForm, title: e.target.value })}
                        placeholder="Ej. Trasplante pulmonar en Latinoamérica"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="crm-input-group">
                        <label>Fecha (Texto descriptivo) *</label>
                        <input
                          type="text"
                          required
                          value={webinarForm.date}
                          onChange={(e) => setWebinarForm({ ...webinarForm, date: e.target.value })}
                          placeholder="Ej. 28 de Abril, 2026"
                        />
                      </div>
                      <div className="crm-input-group">
                        <label>Horarios (Texto descriptivo) *</label>
                        <input
                          type="text"
                          required
                          value={webinarForm.time}
                          onChange={(e) => setWebinarForm({ ...webinarForm, time: e.target.value })}
                          placeholder="Ej. 5:00 PM (MEX) | 8:00 PM (ARG)"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="crm-input-group">
                        <label>Fecha de Inicio (En Vivo) *</label>
                        <input
                          type="datetime-local"
                          required
                          value={webinarForm.fecha_inicio}
                          onChange={(e) => setWebinarForm({ ...webinarForm, fecha_inicio: e.target.value })}
                        />
                      </div>
                      <div className="crm-input-group">
                        <label>Fecha de Fin (En Vivo) *</label>
                        <input
                          type="datetime-local"
                          required
                          value={webinarForm.fecha_fin}
                          onChange={(e) => setWebinarForm({ ...webinarForm, fecha_fin: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="crm-input-group">
                      <label>Imagen del Webinar (URL o subir archivo ligero Máx. 2MB) *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                        <input
                          type="text"
                          required
                          value={webinarForm.image_url}
                          onChange={(e) => setWebinarForm({ ...webinarForm, image_url: e.target.value })}
                          placeholder="Pegar URL de la imagen..."
                        />
                        <input
                          type="file"
                          accept="image/*"
                          id="webinar-image-upload"
                          style={{ display: 'none' }}
                          onChange={handleWebinarImageUpload}
                        />
                        <label
                          htmlFor="webinar-image-upload"
                          className="btn-crm-action outlined"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', padding: '10px 18px', margin: 0, borderRadius: '8px', justifyContent: 'center' }}
                        >
                          Subir Archivo
                        </label>
                      </div>
                    </div>

                    <div className="crm-input-group">
                      <label>Enlace de Registro (Zoom, Google Meet, etc.) *</label>
                      <input
                        type="text"
                        required
                        value={webinarForm.link}
                        onChange={(e) => setWebinarForm({ ...webinarForm, link: e.target.value })}
                        placeholder="Ej. https://bit.ly/..."
                      />
                    </div>

                    {/* ---- Registro por el portal, asistencia y constancia ---- */}
                    <div className="wz-panel">
                      <label className="wz-switch">
                        <input
                          type="checkbox"
                          checked={webinarForm.registro_portal}
                          onChange={(e) => setWebinarForm({ ...webinarForm, registro_portal: e.target.checked })}
                        />
                        <span>
                          <strong>Registro por el portal</strong>
                          <span className="wz-switch-desc">
                            El botón de la landing deja de mandar al enlace externo: la persona entra al
                            portal, se registra ahí y ahí mismo recibe su acceso de Zoom y, al terminar,
                            su constancia. Apagado, el webinar se comporta como siempre.
                          </span>
                        </span>
                      </label>

                      {webinarForm.registro_portal && (
                        <>
                          {/* 1 · Zoom */}
                          <section className="wz-paso">
                            <h4><span className="wz-num">1</span> Conexión con Zoom</h4>

                            <div className="crm-input-group">
                              <label>Enlace o ID del seminario</label>
                              <input
                                type="text"
                                value={webinarForm.zoom_id}
                                onChange={(e) => setWebinarForm({ ...webinarForm, zoom_id: e.target.value })}
                                onBlur={(e) => setWebinarForm({ ...webinarForm, zoom_id: extraerZoomId(e.target.value) })}
                                placeholder="Pega aquí la URL del seminario de Zoom"
                              />
                              <small>
                                Pega la liga completa y yo saco el ID solo. Sin esto, Zoom no manda el
                                enlace personal ni confirma la asistencia.
                              </small>
                            </div>

                            <div className="wz-fila">
                              <div className="crm-input-group">
                                <label>Tipo en Zoom</label>
                                <select
                                  value={webinarForm.zoom_tipo}
                                  onChange={(e) => setWebinarForm({ ...webinarForm, zoom_tipo: e.target.value })}
                                >
                                  <option value="webinar">Seminario web</option>
                                  <option value="meeting">Reunión normal</option>
                                </select>
                              </div>

                              <div className="crm-input-group">
                                <label>Minutos mínimos para acreditar</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={webinarForm.minutos_minimos}
                                  onChange={(e) => setWebinarForm({ ...webinarForm, minutos_minimos: e.target.value })}
                                  placeholder="0"
                                />
                                <small>En 0 basta con aparecer en el reporte.</small>
                              </div>
                            </div>

                            <p className="wz-aviso">
                              En Zoom, dentro de las opciones del seminario, deja activado
                              <strong> “Requerir registro”</strong>. Si no, Zoom rechaza las altas y todos
                              acaban con el enlace genérico.
                            </p>
                          </section>

                          {/* 2 · Correo */}
                          <section className="wz-paso">
                            <h4><span className="wz-num">2</span> Correo de confirmación</h4>

                            <div className="crm-input-group">
                              <label>Lista de Brevo</label>
                              <input
                                type="number"
                                value={webinarForm.brevo_lista_id}
                                onChange={(e) => setWebinarForm({ ...webinarForm, brevo_lista_id: e.target.value })}
                                placeholder="Ej. 16"
                              />
                              <small>
                                Ya viene puesta la lista de webinars. Entrar a ella dispara el correo;
                                en la plantilla de Brevo usa
                                <code> {'{{ contact.WEBINAR_LINK }}'} </code> para insertar el enlace
                                personal de Zoom de cada quien.
                              </small>
                            </div>
                          </section>

                          {/* 3 · Constancia */}
                          <section className="wz-paso">
                            <h4><span className="wz-num">3</span> Constancia</h4>

                            <div className="wz-fila">
                              <div className="crm-input-group">
                                <label>¿Quién puede descargarla?</label>
                                <select
                                  value={webinarForm.constancia_estado}
                                  onChange={(e) => setWebinarForm({ ...webinarForm, constancia_estado: e.target.value })}
                                >
                                  <option value="bloqueada">Nadie todavía</option>
                                  <option value="codigo">Solo quien asistió</option>
                                  <option value="libre">Todo el que se registró</option>
                                </select>
                                <small>
                                  {webinarForm.constancia_estado === 'bloqueada'
                                    ? 'El alumno ve la constancia bloqueada. Déjalo así hasta que termine la sesión.'
                                    : webinarForm.constancia_estado === 'libre'
                                      ? 'Se abre para todos los registrados, hayan asistido o no. Útil al liberar la grabación.'
                                      : 'Zoom confirma la asistencia solo. A quien no aparezca en el reporte se le pide el código.'}
                                </small>
                              </div>

                              {webinarForm.constancia_estado === 'codigo' && (
                                <div className="crm-input-group">
                                  <label>Código que dice el ponente al cerrar</label>
                                  <input
                                    type="text"
                                    value={webinarForm.codigo}
                                    onChange={(e) => setWebinarForm({ ...webinarForm, codigo: e.target.value })}
                                    placeholder="Ej. ECMO2026"
                                  />
                                  <small>Solo se usa cuando Zoom no reconoce a la persona. Vacío lo quita.</small>
                                </div>
                              )}
                            </div>

                            <div className="crm-input-group">
                              <label>Plantilla de la constancia</label>
                              <div className="wz-archivo">
                                <input
                                  type="text"
                                  value={webinarForm.certificado_template_url}
                                  onChange={(e) => setWebinarForm({ ...webinarForm, certificado_template_url: e.target.value })}
                                  placeholder="Pega la URL de la imagen, o súbela con el botón"
                                />
                                <input
                                  type="file"
                                  id="plantilla-constancia-archivo"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={handlePlantillaConstanciaUpload}
                                />
                                <label htmlFor="plantilla-constancia-archivo" className="btn-crm-action outlined">
                                  <Upload size={15} /> Subir imagen
                                </label>
                                {webinarForm.certificado_template_url && (
                                  <button
                                    type="button"
                                    className="btn-crm-action outlined"
                                    onClick={() => setWebinarForm({ ...webinarForm, certificado_template_url: '' })}
                                  >
                                    Quitar
                                  </button>
                                )}
                              </div>
                              <small>Vacío usa la plantilla por defecto de HCE. Máximo 5 MB.</small>
                            </div>

                            <PosicionadorConstancia
                              templateUrl={webinarForm.certificado_template_url}
                              x={webinarForm.certificado_x}
                              y={webinarForm.certificado_y}
                              fontSize={webinarForm.certificado_font_size || 40}
                              nombreEjemplo="Nombre del Alumno"
                              onChange={({ x, y, fontSize }) =>
                                setWebinarForm((prev) => ({
                                  ...prev,
                                  certificado_x: x,
                                  certificado_y: y,
                                  certificado_font_size: fontSize,
                                }))
                              }
                            />
                          </section>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '30px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        💡 El webinar se marcará como <strong>🔴 EN VIVO</strong> automáticamente durante las fechas de inicio y fin configuradas.
                      </span>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={webinarForm.activo}
                          onChange={(e) => setWebinarForm({ ...webinarForm, activo: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        🟢 Activo (Visible en Landing)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-crm-action outlined"
                        onClick={() => {
                          setShowWebinarForm(false);
                          setEditingWebinar(null);
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn-crm-action solid">
                        {editingWebinar ? 'Guardar Cambios' : 'Crear Webinar'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="settings-card">
                  <h3>Webinars Programados</h3>
                  <div className="table-responsive-container" style={{ marginTop: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Webinar</th>
                          <th>Fecha y Hora</th>
                          <th>Enlace</th>
                          <th>En Vivo</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webinars.map(webinar => (
                          <tr key={webinar.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <img
                                  src={webinar.image_url}
                                  alt=""
                                  style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                                <strong>{webinar.title}</strong>
                              </div>
                            </td>
                            <td>
                              <div>{webinar.date}</div>
                              <small style={{ color: 'var(--text-muted)' }}>{webinar.time}</small>
                            </td>
                            <td>
                              <a
                                href={webinar.link}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--cyan-bright)', textDecoration: 'underline', fontSize: '0.85rem' }}
                              >
                                Abrir Enlace
                              </a>
                            </td>
                            <td>
                              {isWebinarLive(webinar) ? (
                                <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700 }}>
                                  🔴 EN VIVO
                                </span>
                              ) : (
                                <span className="status-pill" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                                  Programado
                                </span>
                              )}
                            </td>
                            <td>
                              {webinar.activo ? (
                                <span className="status-pill disponible">Activo</span>
                              ) : (
                                <span className="status-pill suspendido">Inactivo</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {webinar.registro_portal && (
                                  <button
                                    className="icon-action-btn"
                                    title="Ver registrados y asistencia"
                                    onClick={() => fetchWebinarRegistros(webinar)}
                                  >
                                    <Users size={16} />
                                  </button>
                                )}
                                <button className="icon-action-btn edit" onClick={() => handleEditWebinar(webinar)}>
                                  <Edit size={16} />
                                </button>
                                <button className="icon-action-btn delete" onClick={() => handleDeleteWebinar(webinar.id)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {webinars.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                              No hay webinars registrados. Haz clic en "Crear Webinar" para agregar uno.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---- Registrados y asistencia de un webinar ---- */}
              {webinarRegistros && (
                <div className="settings-card" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Registrados — {webinarRegistros.webinar.title}</h3>
                      <small style={{ color: 'var(--text-muted)' }}>
                        {webinarRegistros.webinar.sincronizado_en
                          ? `Última consulta a Zoom: ${new Date(webinarRegistros.webinar.sincronizado_en).toLocaleString()}`
                          : 'Todavía no se ha consultado el reporte de Zoom.'}
                      </small>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-crm-action outlined"
                        disabled={sincronizandoWebinar}
                        onClick={() => handleSincronizarWebinar(webinarRegistros.webinar)}
                      >
                        <RefreshCw size={15} /> {sincronizandoWebinar ? 'Consultando…' : 'Sincronizar con Zoom'}
                      </button>
                      <button
                        className="btn-crm-action outlined"
                        disabled={!webinarRegistros.filas?.length}
                        onClick={exportarRegistrosWebinar}
                      >
                        <Download size={15} /> Exportar
                      </button>
                      <button className="btn-crm-action outlined" onClick={() => setWebinarRegistros(null)}>
                        <X size={15} /> Cerrar
                      </button>
                    </div>
                  </div>

                  {webinarRegistros.filas === null ? (
                    <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Cargando…</p>
                  ) : webinarRegistros.filas.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>
                      Todavía nadie se ha registrado a este webinar desde el portal.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', margin: '18px 0 4px', fontSize: '0.85rem' }}>
                        <span><strong>{webinarRegistros.filas.length}</strong> registrados</span>
                        <span style={{ color: 'var(--accent-green, #43A047)' }}>
                          <strong>{webinarRegistros.filas.filter(r => r.asistio).length}</strong> con asistencia confirmada
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <strong>{webinarRegistros.filas.filter(r => r.certificado_url).length}</strong> constancias descargadas
                        </span>
                      </div>

                      <div className="table-responsive-container" style={{ marginTop: '12px' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Participante</th>
                              <th>Asistencia</th>
                              <th>Minutos</th>
                              <th>Verificado por</th>
                              <th>Constancia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {webinarRegistros.filas.map(fila => (
                              <tr key={fila.id}>
                                <td>
                                  <strong>{fila.nombre_completo || '—'}</strong>
                                  <small style={{ display: 'block', color: 'var(--text-muted)' }}>{fila.email}</small>
                                </td>
                                <td>
                                  {fila.asistio ? (
                                    <span className="status-pill disponible">Asistió</span>
                                  ) : (
                                    <span className="status-pill suspendido">Sin confirmar</span>
                                  )}
                                </td>
                                <td>{fila.minutos || 0}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  {fila.metodo === 'zoom' ? 'Reporte de Zoom'
                                    : fila.metodo === 'codigo' ? 'Código de la clase'
                                    : fila.metodo === 'libre' ? 'Acceso abierto'
                                    : '—'}
                                </td>
                                <td>
                                  {fila.certificado_url ? (
                                    <a
                                      href={fila.certificado_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: 'var(--cyan-bright)', textDecoration: 'underline', fontSize: '0.85rem' }}
                                    >
                                      {fila.folio || 'Ver'}
                                    </a>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
  );
}
