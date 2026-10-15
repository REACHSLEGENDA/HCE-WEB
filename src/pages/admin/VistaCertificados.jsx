// Vista de administración: certificates. Estado y operaciones permanecen en AdminDashboard.
export default function VistaCertificados({ contexto }) {
  const {
    certificates,
    downloadCertificateFile,
    loadingCertificates,
  } = contexto;
  return (
<div className="certificates-view">
              <div className="section-title-row">
                <h2>Certificados Emitidos</h2>
              </div>

              <div className="sub-section-block" style={{ marginTop: '20px' }}>
                <h3>Certificados Emitidos Recientemente</h3>
                <div className="table-responsive-container" style={{ marginTop: '15px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Alumno</th>
                        <th>Curso</th>
                        <th>Calificación</th>
                        <th>Fecha de Emisión</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingCertificates ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--primary-cyan)', fontWeight: 'bold' }}>
                            Cargando certificados...
                          </td>
                        </tr>
                      ) : certificates.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No hay certificados emitidos en este momento.
                          </td>
                        </tr>
                      ) : (
                        certificates.map(cert => {
                          const studentName = cert.profiles?.nombre_completo || cert.profiles?.email || 'Alumno';
                          const courseTitle = cert.courses?.title || 'Curso Académico';
                          return (
                            <tr key={cert.id}>
                              <td><strong>#{cert.folio}</strong></td>
                              <td>{studentName}</td>
                              <td>{courseTitle}</td>
                              <td>{cert.score}%</td>
                              <td>{new Date(cert.created_at).toLocaleDateString()}</td>
                              <td>
                                <button
                                  onClick={() => downloadCertificateFile(cert.pdf_url, `Certificado_${cert.folio}.png`)}
                                  className="btn-crm-action solid mini"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', cursor: 'pointer' }}
                                >
                                  Descargar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
  );
}
