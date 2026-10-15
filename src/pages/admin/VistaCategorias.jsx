// Vista de administración: categories. Estado y operaciones permanecen en AdminDashboard.
export default function VistaCategorias({ contexto }) {
  const {
    Plus,
    Trash2,
    categories,
    handleAddCategory,
    handleDeleteCategory,
    newCategoryName,
    setNewCategoryName,
  } = contexto;
  return (
<div className="categories-view">
              <div className="section-title-row">
                <h2>Gestión de Categorías del Catálogo</h2>
              </div>

              <div className="settings-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
                <div className="settings-card">
                  <h3>Crear Categoría</h3>
                  <form onSubmit={handleAddCategory} className="crm-settings-form" style={{ marginTop: '20px' }}>
                    <div className="crm-input-group">
                      <label>Nombre de la Categoría *</label>
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Ej. Simulación Avanzada"
                      />
                    </div>
                    <button type="submit" className="btn-crm-action solid">
                      <Plus size={16} /> Crear Categoría
                    </button>
                  </form>
                </div>

                <div className="settings-card">
                  <h3>Categorías Registradas</h3>
                  <div className="table-responsive-container" style={{ marginTop: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre</th>
                          <th>Cursos Vinculados</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map(cat => (
                          <tr key={cat.id}>
                            <td><strong>#{cat.id}</strong></td>
                            <td><strong>{cat.name}</strong></td>
                            <td>{cat.count} programas</td>
                            <td>
                              <button className="icon-action-btn delete" onClick={() => handleDeleteCategory(cat.id)}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
  );
}
