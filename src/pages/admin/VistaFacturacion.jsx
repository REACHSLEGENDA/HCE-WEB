// Vista de administración: facturacion. Estado y operaciones permanecen en AdminDashboard.
export default function VistaFacturacion({ contexto }) {
  const {
    CheckCircle,
    Receipt,
    Trash2,
    facturacionReqs,
    loadingFacturacion,
    setFacturacionReqs,
    setLoadingFacturacion,
    supabase,
  } = contexto;
  return (
<div className="tab-pane animate-fade-in">
              <div className="section-header">
                <h2>Solicitudes de Facturación</h2>
                <button className="btn-crm-action outlined" onClick={async () => {
                  setLoadingFacturacion(true);
                  const { data } = await supabase.from('facturacion_requests').select('*').order('created_at', { ascending: false });
                  if(data) setFacturacionReqs(data);
                  setLoadingFacturacion(false);
                }}>
                  Actualizar Lista
                </button>
              </div>

              {loadingFacturacion ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loading-spinner"></div></div>
              ) : facturacionReqs.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={48} opacity={0.5} />
                  <h3>No hay solicitudes</h3>
                  <p>Aún no han llegado solicitudes de facturación.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Razón Social / RFC</th>
                        <th>Contacto</th>
                        <th>Detalles Fiscales</th>
                        <th>Archivos</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturacionReqs.map(req => (
                        <tr key={req.id}>
                          <td>{new Date(req.created_at).toLocaleDateString()}</td>
                          <td>
                            <strong>{req.razon_social}</strong><br/>
                            <span style={{fontSize:'0.85em', color:'#666'}}>{req.rfc}</span>
                          </td>
                          <td>
                            {req.correo}<br/>
                            <span style={{fontSize:'0.85em', color:'#666'}}>{req.telefono}</span>
                          </td>
                          <td style={{fontSize:'0.85em'}}>
                            Uso: {req.uso_cfdi}<br/>
                            Regimen: {req.regimen_fiscal}<br/>
                            CP: {req.cp_fiscal}
                          </td>
                          <td>
                            {req.constancia_url && (
                              <a href={req.constancia_url} target="_blank" rel="noreferrer" style={{display:'block', marginBottom:'4px', color:'var(--primary-color)', fontSize:'0.9em'}}>Constancia Fiscal</a>
                            )}
                            {req.comprobantes_urls && req.comprobantes_urls.length > 0 && req.comprobantes_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{display:'block', marginBottom:'4px', color:'#10b981', fontSize:'0.9em'}}>Comprobante {i+1}</a>
                            ))}
                          </td>
                          <td>
                            <span className={`status-badge ${req.status === 'completado' ? 'status-active' : 'status-inactive'}`}>
                              {req.status === 'completado' ? 'Facturado' : 'Pendiente'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="action-btn edit-btn"
                              title="Marcar como Completado"
                              onClick={async () => {
                                const newStatus = req.status === 'completado' ? 'pendiente' : 'completado';
                                await supabase.from('facturacion_requests').update({ status: newStatus }).eq('id', req.id);
                                setFacturacionReqs(prev => prev.map(p => p.id === req.id ? {...p, status: newStatus} : p));
                              }}
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              title="Eliminar"
                              onClick={async () => {
                                if(window.confirm('¿Seguro que deseas eliminar esta solicitud?')) {
                                  await supabase.from('facturacion_requests').delete().eq('id', req.id);
                                  setFacturacionReqs(prev => prev.filter(p => p.id !== req.id));
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
  );
}
