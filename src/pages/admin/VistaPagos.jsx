import ReporteVentas from '../../components/admin/ReporteVentas';

// Vista de administración: payments. Estado y operaciones permanecen en AdminDashboard.
export default function VistaPagos({ contexto }) {
  const {
    AlertCircle,
    BarChart2,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    Eye,
    FileSpreadsheet,
    Mail,
    Search,
    Send,
    Upload,
    X,
    activePaymentsSubTab,
    fetchRealFormSubmissions,
    fetchRealStripePayments,
    formFilterType,
    formSearch,
    formSortOrder,
    formSubmissions,
    formatDate,
    handleImportForms,
    handleImportPayments,
    loadingForms,
    loadingPayments,
    paymentsError,
    selectedFormEntry,
    setActivePaymentsSubTab,
    setFormFilterType,
    setFormSearch,
    setFormSortOrder,
    setSelectedFormEntry,
    setShowFormModal,
    showConfirm,
    showFormModal,
    showToast,
    stripePayments,
    seguimientoCobros,
    supabase,
  } = contexto;
  return (
(() => {
            // Filter form submissions based on search and filters
            const filteredForms = formSubmissions.filter(entry => {
              const matchesSearch = entry.senderName.toLowerCase().includes(formSearch.toLowerCase()) ||
                                    entry.senderEmail.toLowerCase().includes(formSearch.toLowerCase()) ||
                                    JSON.stringify(entry.payload).toLowerCase().includes(formSearch.toLowerCase());
              const matchesType = formFilterType === 'all' || entry.formId === formFilterType;
              return matchesSearch && matchesType;
            });

            // Sort forms dynamically (de arriba a abajo / de abajo a arriba)
            const sortedForms = [...filteredForms].sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return formSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });

            const handleExportForms = () => {
              const headers = ['ID Formulario', 'Tipo Formulario', 'Remitente', 'Email', 'Fecha', 'Datos'];
              const csvRows = [headers.join(',')];

              filteredForms.forEach(entry => {
                const row = [
                  entry.id,
                  `"${entry.formName}"`,
                  `"${entry.senderName}"`,
                  entry.senderEmail,
                  entry.date,
                  `"${JSON.stringify(entry.payload).replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
              });

              const csvString = csvRows.join('\n');
              const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `reporte_formularios_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

            const handleResendToFormspree = async (entry) => {
              if (entry.formId === 'xdeapenv') {
                const id = Number(entry.payload?.registro_alumni_id);
                if (!Number.isSafeInteger(id) || id <= 0) {
                  showToast('Este registro no tiene una solicitud de Alumni Pass asociada.', 'error');
                  return;
                }
                const ok = await showConfirm('Se reintentarán solo los registros pendientes. Si Formspree no confirmó una recepción anterior, revisa su buzón antes de continuar para evitar duplicados.', 'Reintentar registros');
                if (!ok) return;
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await fetch('/.netlify/functions/alumni-pass', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
                    body: JSON.stringify({ accion: 'sincronizar-registros', id }),
                  });
                  const respuesta = await res.json();
                  if (!res.ok) throw new Error(respuesta.error || 'No se pudieron reintentar los registros.');
                  showToast(respuesta.avisoRegistros || 'Registros confirmados en Formularios, Formspree y Brevo.', respuesta.avisoRegistros ? 'error' : 'success');
                  await fetchRealFormSubmissions();
                } catch (err) { showToast(err.message, 'error'); }
                return;
              }
              if (!entry.formId) {
                showToast('No se puede reenviar: ID de formulario desconocido.', 'error');
                return;
              }

              if (window.confirm('¿Estás seguro de que deseas reenviar este registro a Formspree?')) {
                try {
                  const formspreeUrl = `https://formspree.io/f/${entry.formId}`;
                  const response = await fetch(formspreeUrl, {
                    method: 'POST',
                    headers: {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      ...entry.payload,
                      _resent_from_dashboard: true,
                      _original_date: entry.date
                    })
                  });

                  if (response.ok) {
                    showToast('Datos reenviados a Formspree exitosamente.', 'success');
                  } else {
                    showToast('Error al reenviar a Formspree.', 'error');
                  }
                } catch (err) {
                  console.error('Error resending to Formspree:', err);
                  showToast('Error de conexión al reenviar a Formspree.', 'error');
                }
              }
            };

            return (
              <div className="payments-view">

                {/* SUBTAB BAR & REFRESH BUTTON */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div className="tab-menu-container" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    <button
                      className={`tab-btn ${activePaymentsSubTab === 'stripe' ? 'active' : ''}`}
                      onClick={() => setActivePaymentsSubTab('stripe')}
                    >
                      <CreditCard size={16} /> Pasarelas Stripe
                    </button>
                    <button
                      className={`tab-btn ${activePaymentsSubTab === 'formspree' ? 'active' : ''}`}
                      onClick={() => setActivePaymentsSubTab('formspree')}
                    >
                      <Mail size={16} /> Formularios
                    </button>
                  </div>

                  {activePaymentsSubTab === 'formspree' && (
                    <button
                      className="icon-action-btn secondary"
                      onClick={fetchRealFormSubmissions}
                      disabled={loadingForms}
                      style={{ height: '38px', gap: '6px', cursor: 'pointer' }}
                    >
                      <Clock size={14} className={loadingForms ? 'spin-animation' : ''} />
                      {loadingForms ? 'Sincronizando...' : 'Sincronizar Formularios'}
                    </button>
                  )}
                </div>

                {activePaymentsSubTab === 'stripe' && (
                  <ReporteVentas
                    pagos={stripePayments}
                    seguimiento={seguimientoCobros}
                    cargando={loadingPayments}
                    error={paymentsError}
                    onSincronizar={fetchRealStripePayments}
                    onImportar={handleImportPayments}
                    formatDate={formatDate}
                    notificar={showToast}
                  />
                )}

                {/* FORMULARIOS */}
                {activePaymentsSubTab !== 'stripe' && (
                  <div className="sub-section-block">
                    <div className="table-actions-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                        <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                          <Search size={16} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="admin-input-field"
                            style={{ paddingLeft: '38px', height: '40px', width: '100%' }}
                            placeholder="Buscar en datos de formularios..."
                            value={formSearch}
                            onChange={(e) => setFormSearch(e.target.value)}
                          />
                        </div>

                        <select
                          className="admin-input-field"
                          style={{ height: '40px', maxWidth: '240px' }}
                          value={formFilterType}
                          onChange={(e) => setFormFilterType(e.target.value)}
                        >
                          <option value="all">Todos los Formularios</option>
                          <option value="mnjlvbpw">Paris International Diploma in ECMO</option>
                          <option value="xpqenabk">ECMO Nursing Care Course</option>
                          <option value="xredqyol">ECMO SIM: Realidad Clinica</option>
                          <option value="mreroozv">Solicitud de Facturación</option>
                          <option value="xnjlvzdq">Retroalimentación y Dudas</option>
                          <option value="xdeapenv">Alumni Pass · Solicitudes</option>
                        </select>

                        <button
                          className="btn-crm-action outlined mini"
                          style={{ height: '40px', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => setFormSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          title={formSortOrder === 'desc' ? 'Ver de más antiguos a más recientes' : 'Ver de más recientes a más antiguos'}
                        >
                          {formSortOrder === 'desc' ? 'Orden: De arriba a abajo' : 'Orden: De abajo a arriba'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label className="btn-crm-action outlined mini" style={{ cursor: 'pointer', margin: 0, height: '40px' }}>
                          <Upload size={14} /> Importar JSON/CSV
                          <input type="file" accept=".json,.csv" onChange={handleImportForms} style={{ display: 'none' }} />
                        </label>
                        <button className="btn-crm-action outlined mini" style={{ height: '40px' }} onClick={handleExportForms}>
                          <FileSpreadsheet size={14} /> Exportar Excel/CSV
                        </button>
                      </div>
                    </div>

                    {/* FORMSPREE SUBMISSIONS TABLE */}
                    <div className="table-responsive-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Formulario</th>
                            <th>Remitente</th>
                            <th>Fecha de Envío</th>
                            <th>Estado</th>
                            <th>Detalles</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedForms.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                                No se encontraron envíos de formularios.
                              </td>
                            </tr>
                          ) : (
                            sortedForms.map((entry) => (
                              <tr key={entry.id}>
                                <td>
                                  <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{entry.formName}</div>
                                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>ID: {entry.formId}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{entry.senderName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.senderEmail}</div>
                                </td>
                                <td>{formatDate(entry.date)} {new Date(entry.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td>
                                  <span className="status-badge active" style={{ padding: '4px 8px', borderRadius: '100px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <CheckCircle size={10} /> {entry.formId === 'xdeapenv' ? 'Solicitud guardada' : 'Enviado API'}
                                  </span>
                                  {entry.formId === 'xdeapenv' && <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>
                                    Formspree: {entry.payload?._integraciones?.formspree || 'pendiente'}<br />
                                    Contacto Brevo: {entry.payload?._integraciones?.brevo || 'pendiente'}
                                  </small>}
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                                    {Object.entries(entry.payload).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                    <button
                                      className="icon-action-btn edit"
                                      title="Ver JSON Completo"
                                      onClick={() => { setSelectedFormEntry(entry); setShowFormModal(true); }}
                                      style={{ padding: '6px' }}
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      className="icon-action-btn delete"
                                      title="Reenviar a Formspree"
                                      onClick={() => handleResendToFormspree(entry)}
                                      style={{ padding: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                                    >
                                      <Send size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL: VIEW FORM SUBMISSION JSON PAYLOAD */}
                {showFormModal && selectedFormEntry && (
                  <div className="admin-modal-overlay">
                    <div className="admin-modal-container" style={{ maxWidth: '600px', width: '100%' }}>
                      <div className="modal-header-row">
                        <h3>Detalle de Registro</h3>
                        <button className="modal-close-btn" onClick={() => { setShowFormModal(false); setSelectedFormEntry(null); }}>
                          <X size={20} />
                        </button>
                      </div>

                      <div className="modal-body-content" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formulario</span>
                            <h4 style={{ margin: '4px 0 0 0', color: 'var(--text-dark)' }}>{selectedFormEntry.formName}</h4>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID</span>
                            <h4 style={{ margin: '4px 0 0 0', fontFamily: 'monospace', color: 'var(--text-dark)', fontSize: '0.85rem' }}>{selectedFormEntry.formId}</h4>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alumno</span>
                            <h4 style={{ margin: '4px 0 0 0', color: 'var(--text-dark)' }}>{selectedFormEntry.senderName}</h4>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</span>
                            <h4 style={{ margin: '4px 0 0 0', color: 'var(--text-dark)', wordBreak: 'break-all' }}>{selectedFormEntry.senderEmail}</h4>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px', fontWeight: 600 }}>Datos del Registro</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                          {(() => {
                            const p = selectedFormEntry.payload || {};
                            const FIELD_LABELS = {
                              nombres: 'Nombre(s)', apellidos: 'Apellidos', email: 'Email',
                              telefono: 'Teléfono', pais: 'País', estado: 'Estado/Ciudad',
                              grado: 'Grado Académico', especialidad: 'Especialidad',
                              institucion: 'Institución', cargo: 'Cargo',
                              perfil: 'Perfil', extras: 'Extras', moneda: 'Moneda',
                              total_mxn: 'Total MXN', tag: 'Programa', promoCode: 'Cupón',
                            };
                            const SKIP = new Set(['lada', '_wpcf7', '__redirect']);
                            const PRIORITY = ['nombres','apellidos','email','telefono','pais','estado','grado','especialidad','institucion','cargo','perfil','extras','moneda','total_mxn','tag','promoCode'];
                            const shown = new Set();
                            const items = [];
                            for (const key of PRIORITY) {
                              if (p[key] !== undefined && p[key] !== '') { items.push([key, p[key]]); shown.add(key); }
                            }
                            for (const [k, v] of Object.entries(p)) {
                              if (!shown.has(k) && !SKIP.has(k) && String(v).trim() !== '') items.push([k, v]);
                            }
                            return items.map(([k, v]) => (
                              <div key={k} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                                  {FIELD_LABELS[k] || k}
                                </div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-dark)', wordBreak: 'break-word' }}>
                                  {k === 'total_mxn' ? `$${Number(v).toLocaleString('es-MX')} MXN` : String(v)}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        <details style={{ marginTop: '8px' }}>
                          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>Ver JSON completo</summary>
                          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
                            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(selectedFormEntry.payload, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>

                      <div className="modal-footer-row" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="admin-cancel-btn" onClick={() => { setShowFormModal(false); setSelectedFormEntry(null); }}>
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
  );
}
