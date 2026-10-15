// Vista de administración: courses. Estado y operaciones permanecen en AdminDashboard.
export default function VistaCursos({ contexto }) {
  const {
    BarraGuardarCurso,
    BibliotecaCurso,
    BookOpen,
    ChecklistPublicar,
    Copy,
    Edit,
    EditorCursoPestanas,
    EditorLecciones,
    ExternalLink,
    ImageIcon,
    InscritosCurso,
    Plus,
    RefreshCw,
    ReglasCurso,
    Search,
    Trash2,
    TrendingUp,
    Upload,
    actionLoading,
    actualizarCurso,
    avisoCampoCurso,
    busquedaCursos,
    cambiarPestanaCurso,
    cambiosEvaluacion,
    cambiosReglas,
    categories,
    conteoCursos,
    courseForm,
    courseFormRef,
    courses,
    cursoEditadoGuardado,
    cursoSucio,
    cursosCargados,
    cursosFiltrados,
    errorCursos,
    erroresCurso,
    esPestanaFormulario,
    estadoGuardadoCurso,
    fetchCourses,
    filtroAccesoCursos,
    filtroEstadoCursos,
    formatoPrecio,
    guardarCurso,
    handleCertificateTemplateChange,
    handleClonarCourse,
    handleCloseCourseForm,
    handleCoursePortadaUpload,
    handleDeleteCourse,
    handleOpenCourseCreate,
    handleOpenCourseEdit,
    handleToggleCourseStatus,
    hayFiltrosCursos,
    idCursoEditado,
    intentoGuardarCurso,
    limpiarFiltrosCursos,
    naturalDimensions,
    pestanaCurso,
    pestanasConErrorCurso,
    pestanasCursoVisitadas,
    profiles,
    propsCampoCurso,
    recargaChecklist,
    setActiveTab,
    setBusquedaCursos,
    setFiltroAccesoCursos,
    setFiltroEstadoCursos,
    setMetricasDeCurso,
    setNaturalDimensions,
    setRecargaChecklist,
    showConfirm,
    showCourseForm,
    showToast,
    tocarCampoCurso,
  } = contexto;
  return (
<div className="courses-view" ref={courseFormRef}>
              {showCourseForm ? (
                <EditorCursoPestanas
                  titulo={courseForm.title}
                  courseId={idCursoEditado}
                  activo={!!cursoEditadoGuardado?.activo}
                  pestana={pestanaCurso}
                  onPestana={cambiarPestanaCurso}
                  pestanasConError={pestanasConErrorCurso}
                  onCerrar={handleCloseCourseForm}
                  lateral={idCursoEditado ? (
                    <ChecklistPublicar
                      key={idCursoEditado}
                      courseId={idCursoEditado}
                      form={courseForm}
                      activo={!!cursoEditadoGuardado?.activo}
                      sucio={cursoSucio}
                      recarga={recargaChecklist}
                      onIr={cambiarPestanaCurso}
                      onIrGrupos={() => setActiveTab('grupos')}
                      onActivar={() => handleToggleCourseStatus(cursoEditadoGuardado?.id ?? idCursoEditado)}
                    />
                  ) : (
                    <div className="cp-tarjeta cp-nuevo">
                      <p className="cp-titulo">Revisión antes de publicar</p>
                      <p>Guarda el borrador y aquí verás qué le falta al curso para activarlo: lecciones, examen, certificado…</p>
                    </div>
                  )}
                >
                  {esPestanaFormulario(pestanaCurso) && (
                    <form id="form-curso" onSubmit={guardarCurso} noValidate className="crm-settings-form ec-formulario">
                      <fieldset disabled={actionLoading} className="course-editor-fields">

                        {pestanaCurso === 'info' && (
                          <div className="ec-seccion">
                            <div className="ec-seccion-cabeza">
                              <h3>Información del curso</h3>
                              <p>Lo que ven los alumnos en el catálogo y en la página del curso.</p>
                            </div>
                            <div className="form-group-row">
                              <div className="crm-input-group">
                                <label htmlFor="curso-titulo">Título del curso *</label>
                                <input
                                  type="text"
                                  {...propsCampoCurso('titulo')}
                                  value={courseForm.title || ''}
                                  onChange={(e) => { tocarCampoCurso('titulo'); actualizarCurso({ title: e.target.value }); }}
                                  placeholder="Ej. Diplomado Avanzado en ECMO"
                                />
                                {avisoCampoCurso('titulo')}
                              </div>
                              <div className="crm-input-group">
                                <label htmlFor="curso-duracion">Duración *</label>
                                <input
                                  type="text"
                                  {...propsCampoCurso('duracion')}
                                  value={courseForm.duracion || ''}
                                  onChange={(e) => { tocarCampoCurso('duracion'); actualizarCurso({ duracion: e.target.value }); }}
                                  placeholder="Ej. 40 horas"
                                />
                                {avisoCampoCurso('duracion')}
                              </div>
                            </div>

                            <div className="form-group-row">
                              <div className="crm-input-group">
                                <label htmlFor="curso-modalidad">Modalidad</label>
                                <select id="curso-modalidad" value={courseForm.modalidad || 'Online'} onChange={(e) => actualizarCurso({ modalidad: e.target.value })}>
                                  <option value="Online">Online</option>
                                  <option value="Híbrido">Híbrido</option>
                                  <option value="Presencial">Presencial</option>
                                  <option value="Simulado">Simulado</option>
                                </select>
                              </div>
                              <div className="crm-input-group">
                                <label htmlFor="curso-categoria">Categoría del catálogo</label>
                                <select
                                  id="curso-categoria"
                                  value={courseForm.category_id || ''}
                                  onChange={(e) => actualizarCurso({ category_id: e.target.value ? parseInt(e.target.value) : '' })}
                                >
                                  <option value="">Sin categoría</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="crm-input-group">
                              <label htmlFor="curso-descripcion">Descripción breve *</label>
                              <textarea
                                rows="4"
                                {...propsCampoCurso('descripcion')}
                                value={courseForm.description || ''}
                                onChange={(e) => { tocarCampoCurso('descripcion'); actualizarCurso({ description: e.target.value }); }}
                                placeholder="Escribe una pequeña síntesis del entrenamiento…"
                              />
                              <div className="ec-ayuda-fila">
                                {avisoCampoCurso('descripcion') || <small>Una o dos frases: aparece en la tarjeta del catálogo.</small>}
                                <small className="ec-contador">{(courseForm.description || '').length} caracteres</small>
                              </div>
                            </div>

                            <div className="crm-input-group">
                              <label htmlFor="curso-requisitos">Requisitos académicos</label>
                              <input
                                id="curso-requisitos"
                                type="text"
                                value={courseForm.requisitos || ''}
                                onChange={(e) => actualizarCurso({ requisitos: e.target.value })}
                                placeholder="Ej. Licenciatura Médica"
                              />
                            </div>

                            <div className="crm-input-group">
                              <label htmlFor="curso-portada">Portada del curso</label>
                              <div className="ec-portada">
                                <div className="ec-portada-vista" aria-hidden="true">
                                  {courseForm.image
                                    ? <img src={courseForm.image} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} onLoad={(e) => { e.currentTarget.style.visibility = 'visible'; }} />
                                    : <ImageIcon size={26} />}
                                </div>
                                <div className="ec-portada-campos">
                                  <div className="wz-archivo">
                                    <input
                                      type="text"
                                      {...propsCampoCurso('portada')}
                                      value={courseForm.image || ''}
                                      onChange={(e) => { tocarCampoCurso('portada'); actualizarCurso({ image: e.target.value }); }}
                                      placeholder="URL de la imagen, o súbela"
                                    />
                                    <input
                                      type="file"
                                      id="curso-portada-archivo"
                                      accept="image/*"
                                      className="ec-oculto"
                                      onChange={handleCoursePortadaUpload}
                                    />
                                    <label htmlFor="curso-portada-archivo" className="btn-crm-action outlined">
                                      <Upload size={15} /> Subir
                                    </label>
                                  </div>
                                  {avisoCampoCurso('portada') || (
                                    <small>PNG, JPG o WebP de hasta 3 MB. {courseForm.tipo === 'pago' ? 'En cursos de pago no uses la miniatura de YouTube.' : ''}</small>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {pestanaCurso === 'precio' && (
                          <div className="ec-seccion">
                            <div className="ec-seccion-cabeza">
                              <h3>Precio y acceso</h3>
                              <p>Cómo se inscribe el alumno a este curso.</p>
                            </div>
                            <div className="ec-opciones" role="radiogroup" aria-label="Acceso al curso">
                              <label className={`ec-opcion${courseForm.tipo !== 'pago' ? ' elegida' : ''}`}>
                                <input type="radio" name="curso-tipo" value="gratis" checked={courseForm.tipo !== 'pago'} onChange={() => actualizarCurso({ tipo: 'gratis' })} />
                                <span>
                                  <strong>Gratis</strong>
                                  <small>El alumno se inscribe solo, sin pagar.</small>
                                </span>
                              </label>
                              <label className={`ec-opcion${courseForm.tipo === 'pago' ? ' elegida' : ''}`}>
                                <input type="radio" name="curso-tipo" value="pago" checked={courseForm.tipo === 'pago'} onChange={() => actualizarCurso({ tipo: 'pago' })} />
                                <span>
                                  <strong>De pago</strong>
                                  <small>Se inscribe al pagar con tarjeta.</small>
                                </span>
                              </label>
                            </div>

                            {courseForm.tipo === 'pago' && (
                              <div className="crm-input-group ec-precio">
                                <label htmlFor="curso-precio">Precio (MXN) *</label>
                                <input
                                  type="number"
                                  min="1"
                                  inputMode="decimal"
                                  {...propsCampoCurso('precio')}
                                  value={courseForm.precio_mxn ?? ''}
                                  onChange={(e) => { tocarCampoCurso('precio'); actualizarCurso({ precio_mxn: e.target.value }); }}
                                  placeholder="Ej. 1500"
                                />
                                {avisoCampoCurso('precio') || (
                                  <small>
                                    {Number(courseForm.precio_mxn) > 0
                                      ? `${formatoPrecio(Number(courseForm.precio_mxn))}. Desde el extranjero se cobra en dólares a 17.5 por dólar (≈ US$${(Number(courseForm.precio_mxn) / 17.5).toFixed(2)}).`
                                      : 'Quien paga desde el extranjero lo ve en dólares a 17.5 por dólar.'}
                                  </small>
                                )}
                              </div>
                            )}

                            <div className="ec-nota">
                              <p>
                                <strong>¿Cupo, solicitud de inscripción, prerrequisitos o acceso por grupo?</strong>{' '}
                                Eso se configura en la pestaña Reglas.
                              </p>
                              <button
                                type="button"
                                className="btn-crm-action outlined mini"
                                onClick={() => cambiarPestanaCurso('reglas')}
                                disabled={!idCursoEditado}
                                title={idCursoEditado ? undefined : 'Guarda el curso primero'}
                              >
                                Ir a Reglas
                              </button>
                            </div>
                          </div>
                        )}

                        {pestanaCurso === 'certificado' && (
                          <div className="ec-seccion">
                            <div className="ec-seccion-cabeza">
                              <h3>Certificado</h3>
                              <p>La plantilla sobre la que se escribe el nombre del alumno al terminar el curso.</p>
                            </div>
                            <div className="form-group-row">
                              <div className="crm-input-group">
                                <label htmlFor="curso-plantilla-archivo">Subir plantilla (JPG/PNG)</label>
                                <input id="curso-plantilla-archivo" type="file" accept="image/*" onChange={handleCertificateTemplateChange} />
                              </div>
                              <div className="crm-input-group">
                                <label htmlFor="curso-plantilla">o pega la URL de la plantilla</label>
                                <input
                                  id="curso-plantilla"
                                  type="text"
                                  value={courseForm.certificado_template_url || ''}
                                  onChange={(e) => actualizarCurso({ certificado_template_url: e.target.value })}
                                  placeholder="https://…"
                                />
                              </div>
                            </div>
                            {!courseForm.certificado_template_url && (
                              <p className="ec-aviso-suave">Sin plantilla propia: la vista previa usa una de ejemplo y el curso no genera su certificado.</p>
                            )}

                            <div className="crm-input-group ec-vigencia">
                              <label htmlFor="curso-vigencia">Vigencia del certificado (meses)</label>
                              <input
                                type="number"
                                min="1"
                                {...propsCampoCurso('vigencia')}
                                value={courseForm.vigencia_meses ?? ''}
                                onChange={(e) => { tocarCampoCurso('vigencia'); actualizarCurso({ vigencia_meses: e.target.value }); }}
                                placeholder="Vacío = no vence"
                              />
                              {avisoCampoCurso('vigencia') || (
                                <small>Si vence, al alumno se le avisa 30 días antes para que vuelva a presentar el examen.</small>
                              )}
                            </div>

                            <div className="ec-certificado">
                              <h4>Posición del nombre</h4>
                              <p>Mueve los controles y mira en la vista previa cómo queda el nombre del alumno.</p>
                              <div className="ec-deslizadores">
                                <label>
                                  <span>Horizontal (X)</span>
                                  <input type="range" min="0" max={naturalDimensions.width} value={courseForm.certificado_x ?? 300} onChange={(e) => actualizarCurso({ certificado_x: parseInt(e.target.value) || 0 })} />
                                  <input type="number" aria-label="Posición X en píxeles" value={courseForm.certificado_x ?? 300} onChange={(e) => actualizarCurso({ certificado_x: parseInt(e.target.value) || 0 })} />
                                </label>
                                <label>
                                  <span>Vertical (Y)</span>
                                  <input type="range" min="0" max={naturalDimensions.height} value={courseForm.certificado_y ?? 400} onChange={(e) => actualizarCurso({ certificado_y: parseInt(e.target.value) || 0 })} />
                                  <input type="number" aria-label="Posición Y en píxeles" value={courseForm.certificado_y ?? 400} onChange={(e) => actualizarCurso({ certificado_y: parseInt(e.target.value) || 0 })} />
                                </label>
                                <label>
                                  <span>Tamaño de letra</span>
                                  <input type="range" min="10" max="150" value={courseForm.certificado_font_size || 40} onChange={(e) => actualizarCurso({ certificado_font_size: parseInt(e.target.value) || 0 })} />
                                  <input type="number" aria-label="Tamaño de letra en píxeles" value={courseForm.certificado_font_size || 40} onChange={(e) => actualizarCurso({ certificado_font_size: parseInt(e.target.value) || 0 })} />
                                </label>
                              </div>

                              <div className="ec-certificado-vista">
                                <img
                                  src={courseForm.certificado_template_url || 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png'}
                                  alt="Vista previa del certificado"
                                  onLoad={(e) => {
                                    setNaturalDimensions({
                                      width: e.target.naturalWidth || 800,
                                      height: e.target.naturalHeight || 600
                                    });
                                  }}
                                />
                                <div
                                  className="ec-certificado-nombre"
                                  style={{
                                    left: `${((courseForm.certificado_x ?? 300) / naturalDimensions.width) * 100}%`,
                                    top: `${((courseForm.certificado_y ?? 400) / naturalDimensions.height) * 100}%`,
                                    fontSize: `${((courseForm.certificado_font_size || 40) / naturalDimensions.height) * 350}px`
                                  }}
                                >
                                  Nombre del Alumno
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {pestanaCurso === 'examen' && (
                          <div className="ec-seccion">
                            <div className="ec-seccion-cabeza">
                              <h3>Examen final</h3>
                              <p>Si la regla de finalización del curso es “examen final”, el alumno debe aprobar estas preguntas para terminar y recibir su certificado.</p>
                            </div>

                            <div className="crm-input-group ec-minimo">
                              <label htmlFor="curso-min-aprobacion">Calificación mínima para aprobar (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                {...propsCampoCurso('min-aprobacion')}
                                value={Number.isFinite(courseForm.minAprobacion) ? courseForm.minAprobacion : ''}
                                onChange={(e) => { tocarCampoCurso('min-aprobacion'); actualizarCurso({ minAprobacion: parseInt(e.target.value) }); }}
                              />
                              {avisoCampoCurso('min-aprobacion')}
                            </div>

                            {(courseForm.questions || []).length === 0 ? (
                              <div className="ec-vacio">
                                <p><strong>Este curso todavía no tiene preguntas.</strong></p>
                                <p>Agrega al menos una si el curso se termina con examen final.</p>
                              </div>
                            ) : (
                              <ol className="ec-preguntas">
                                {courseForm.questions.map((q, qIndex) => (
                                  <li key={qIndex} className="ec-pregunta">
                                    <div className="ec-pregunta-cabeza">
                                      <span className="ec-pregunta-num">Pregunta {qIndex + 1}</span>
                                      <button
                                        type="button"
                                        className="ec-quitar"
                                        onClick={() => actualizarCurso({ questions: courseForm.questions.filter((_, idx) => idx !== qIndex) })}
                                        aria-label={`Eliminar la pregunta ${qIndex + 1}`}
                                      >
                                        <Trash2 size={14} /> Eliminar
                                      </button>
                                    </div>
                                    <div className="crm-input-group">
                                      <label htmlFor={`curso-pregunta-${qIndex}-texto`}>Texto de la pregunta *</label>
                                      <input
                                        type="text"
                                        {...propsCampoCurso(`pregunta-${qIndex}-texto`)}
                                        value={q.question_text || ''}
                                        onChange={(e) => {
                                          tocarCampoCurso(`pregunta-${qIndex}-texto`);
                                          actualizarCurso({ questions: courseForm.questions.map((pq, i) => i === qIndex ? { ...pq, question_text: e.target.value } : pq) });
                                        }}
                                        placeholder="Ej. ¿Qué significa ECMO?"
                                      />
                                      {avisoCampoCurso(`pregunta-${qIndex}-texto`)}
                                    </div>
                                    <div
                                      className="ec-opciones-pregunta"
                                      id={`curso-pregunta-${qIndex}-correcta`}
                                      tabIndex={-1}
                                      role="radiogroup"
                                      aria-label={`Opciones de la pregunta ${qIndex + 1}; marca la correcta`}
                                    >
                                      {(q.options || []).map((opt, optIndex) => {
                                        const correcta = Number(q.correct_option_index) === optIndex;
                                        const campo = `pregunta-${qIndex}-op-${optIndex}`;
                                        return (
                                          <div key={optIndex} className={`ec-opcion-pregunta${correcta ? ' correcta' : ''}`}>
                                            <label className="ec-marca-correcta" title="Marcar como respuesta correcta">
                                              <input
                                                type="radio"
                                                name={`curso-correcta-${qIndex}`}
                                                checked={correcta}
                                                onChange={() => actualizarCurso({ questions: courseForm.questions.map((pq, i) => i === qIndex ? { ...pq, correct_option_index: optIndex } : pq) })}
                                                aria-label={`La opción ${optIndex + 1} es la correcta`}
                                              />
                                              <span>{correcta ? 'Correcta' : `Opción ${optIndex + 1}`}</span>
                                            </label>
                                            <input
                                              type="text"
                                              {...propsCampoCurso(campo)}
                                              aria-label={`Texto de la opción ${optIndex + 1}`}
                                              value={opt}
                                              onChange={(e) => {
                                                tocarCampoCurso(campo);
                                                actualizarCurso({
                                                  questions: courseForm.questions.map((pq, i) => i === qIndex
                                                    ? { ...pq, options: pq.options.map((o, oi) => oi === optIndex ? e.target.value : o) }
                                                    : pq)
                                                });
                                              }}
                                              placeholder={`Opción ${optIndex + 1}`}
                                            />
                                            {avisoCampoCurso(campo)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {avisoCampoCurso(`pregunta-${qIndex}-correcta`)}
                                  </li>
                                ))}
                              </ol>
                            )}

                            <div>
                              <button
                                type="button"
                                className="btn-crm-action outlined"
                                onClick={() => {
                                  const nueva = { question_text: '', options: ['', '', '', ''], correct_option_index: 0 };
                                  const indice = (courseForm.questions || []).length;
                                  actualizarCurso({ questions: [...(courseForm.questions || []), nueva] });
                                  setTimeout(() => document.getElementById(`curso-pregunta-${indice}-texto`)?.focus(), 60);
                                }}
                              >
                                <Plus size={15} /> Agregar pregunta
                              </button>
                            </div>
                          </div>
                        )}
                      </fieldset>
                    </form>
                  )}

                  {/* Las pestañas de contenido van fuera del formulario del curso a
                      propósito: tienen sus propios formularios. Una vez abiertas se
                      quedan montadas (ocultas) para no perder lo que se edita. */}
                  {idCursoEditado && pestanasCursoVisitadas.includes('lecciones') && (
                    <div className="ec-seccion" hidden={pestanaCurso !== 'lecciones'}>
                      <div className="ec-seccion-cabeza">
                        <h3>Lecciones</h3>
                        <p>El temario del curso: videos, lecturas, tareas, evaluaciones y sesiones en vivo.</p>
                      </div>
                      <EditorLecciones
                        key={idCursoEditado}
                        onCambios={cambiosEvaluacion}
                        courseId={idCursoEditado}
                        cursos={courses}
                        onCambio={() => { fetchCourses(); setRecargaChecklist((n) => n + 1); }}
                        notificar={showToast}
                        confirmar={showConfirm}
                      />
                    </div>
                  )}

                  {idCursoEditado && pestanasCursoVisitadas.includes('reglas') && (
                    <div className="ec-seccion" hidden={pestanaCurso !== 'reglas'}>
                      <div className="ec-seccion-cabeza">
                        <h3>Reglas</h3>
                        <p>Quién puede entrar, por cuánto tiempo y cuándo se da por terminado.</p>
                      </div>
                      <ReglasCurso key={idCursoEditado} courseId={idCursoEditado} cursos={courses} tipoCurso={courseForm.tipo} notificar={showToast} confirmar={showConfirm} onCambios={cambiosReglas} onGuardado={() => setRecargaChecklist((n) => n + 1)} />
                    </div>
                  )}

                  {idCursoEditado && pestanasCursoVisitadas.includes('biblioteca') && (
                    <div className="ec-seccion" hidden={pestanaCurso !== 'biblioteca'}>
                      <div className="ec-seccion-cabeza">
                        <h3>Biblioteca de archivos</h3>
                        <p>Artículos, manuales, programas… Liga cada archivo a una clase para que aparezca dentro de esa lección, o déjalo en la biblioteca general del curso.</p>
                      </div>
                      <BibliotecaCurso key={idCursoEditado} courseId={idCursoEditado} notificar={showToast} confirmar={showConfirm} />
                    </div>
                  )}

                  {idCursoEditado && pestanasCursoVisitadas.includes('alumnos') && (
                    <div className="ec-seccion" hidden={pestanaCurso !== 'alumnos'}>
                      <div className="ec-seccion-cabeza">
                        <h3>Alumnos inscritos</h3>
                        <p>Quién está en el curso y cómo va.</p>
                      </div>
                      <InscritosCurso key={idCursoEditado} courseId={idCursoEditado} cursos={courses} perfiles={profiles} notificar={showToast} confirmar={showConfirm} />
                    </div>
                  )}
                  {(esPestanaFormulario(pestanaCurso) || cursoSucio) && (
                    <BarraGuardarCurso
                      sucio={cursoSucio}
                      estado={estadoGuardadoCurso}
                      nuevo={!idCursoEditado}
                      deshabilitado={actionLoading && estadoGuardadoCurso !== 'guardando'}
                      errores={intentoGuardarCurso ? erroresCurso.length : 0}
                      onGuardar={guardarCurso}
                    />
                  )}
                </EditorCursoPestanas>
              ) : (
                <>
                  <div className="section-title-row">
                    <h2>Cursos</h2>
                    <button className="btn-crm-action solid" onClick={handleOpenCourseCreate}>
                      <Plus size={16} />
                      <span>Crear curso</span>
                    </button>
                  </div>

                  <div className="cl-barra">
                    <div className="search-box-wrapper cl-buscar">
                      <Search size={16} className="search-icon-inside" aria-hidden="true" />
                      <input
                        type="search"
                        value={busquedaCursos}
                        onChange={(e) => setBusquedaCursos(e.target.value)}
                        placeholder="Buscar por nombre, requisitos o #ID"
                        aria-label="Buscar cursos"
                      />
                    </div>
                    <div className="cl-filtros">
                      <div className="cl-segmento" role="group" aria-label="Filtrar por estado">
                        {[
                          ['todos', `Todos (${courses.length})`],
                          ['activos', `Activos (${conteoCursos.activos})`],
                          ['borradores', `Borradores (${conteoCursos.borradores})`],
                        ].map(([valor, texto]) => (
                          <button key={valor} type="button" className={filtroEstadoCursos === valor ? 'activo' : ''} aria-pressed={filtroEstadoCursos === valor} onClick={() => setFiltroEstadoCursos(valor)}>
                            {texto}
                          </button>
                        ))}
                      </div>
                      <div className="cl-segmento" role="group" aria-label="Filtrar por acceso">
                        {[
                          ['todos', 'Todo acceso'],
                          ['gratis', `Gratis (${conteoCursos.gratis})`],
                          ['pago', `De pago (${conteoCursos.pago})`],
                        ].map(([valor, texto]) => (
                          <button key={valor} type="button" className={filtroAccesoCursos === valor ? 'activo' : ''} aria-pressed={filtroAccesoCursos === valor} onClick={() => setFiltroAccesoCursos(valor)}>
                            {texto}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {errorCursos && (
                    <div className="cl-error" role="alert">
                      <span>No se pudo actualizar la lista de cursos{courses.length ? ' (se muestra la última copia guardada)' : ''}: {errorCursos}</span>
                      <button type="button" className="btn-crm-action outlined mini" onClick={() => { void fetchCourses(); }}>
                        <RefreshCw size={13} /> Reintentar
                      </button>
                    </div>
                  )}

                  {courses.length === 0 && !cursosCargados ? (
                    <p className="cl-cargando" role="status">Cargando cursos…</p>
                  ) : courses.length === 0 && errorCursos ? null : courses.length === 0 ? (
                    <div className="cl-vacio">
                      <BookOpen size={28} aria-hidden="true" />
                      <h3>Aún no hay cursos</h3>
                      <p>Crea el primero: nace como borrador y lo activas cuando esté listo.</p>
                      <button type="button" className="btn-crm-action solid" onClick={handleOpenCourseCreate}><Plus size={16} /> Crear curso</button>
                    </div>
                  ) : cursosFiltrados.length === 0 ? (
                    <div className="cl-vacio">
                      <Search size={28} aria-hidden="true" />
                      <h3>Ningún curso coincide</h3>
                      <p>Prueba con otra búsqueda o quita los filtros.</p>
                      <button type="button" className="btn-crm-action outlined" onClick={limpiarFiltrosCursos}>Limpiar filtros</button>
                    </div>
                  ) : (
                    <>
                      {hayFiltrosCursos && (
                        <p className="cl-resumen" aria-live="polite">
                          {cursosFiltrados.length} de {courses.length} cursos ·{' '}
                          <button type="button" onClick={limpiarFiltrosCursos}>Limpiar filtros</button>
                        </p>
                      )}
                      <div className="table-responsive-container cl-tabla">
                        <table className="admin-table courses-table">
                          <thead>
                            <tr>
                              <th>Curso</th>
                              <th>Aprobación</th>
                              <th>Acceso</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cursosFiltrados.map(course => (
                              <tr key={course.id}>
                                <td className="cl-curso" data-label="Curso">
                                  <div className="cl-curso-info">
                                    {course.image
                                      ? <img src={course.image} alt="" className="cl-miniatura" />
                                      : <span className="cl-miniatura cl-sin-imagen" aria-hidden="true"><BookOpen size={16} /></span>}
                                    <div>
                                      <div className="cl-curso-titulo">{course.title}</div>
                                      {/* Duración y modalidad van aquí y no en columnas propias:
                                          con siete columnas la tabla se salía de una laptop de
                                          1280 px y las acciones quedaban cortadas. */}
                                      <span className="cl-curso-sub">
                                        {[course.duracion, course.modalidad, `#${course.id}`].filter(Boolean).join(' · ')}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td data-label="Aprobación">{course.minAprobacion ?? 80}%</td>
                                <td data-label="Acceso">
                                  {course.tipo === 'pago' && course.precio_mxn
                                    ? <span className="status-pill disponible">{formatoPrecio(course.precio_mxn)}</span>
                                    : <span className="status-pill cl-gratis">Gratis</span>}
                                </td>
                                <td data-label="Estado">
                                  <button
                                    type="button"
                                    className={`status-pill ${course.activo ? 'disponible' : 'inactivo'} cl-estado`}
                                    onClick={() => handleToggleCourseStatus(course.id)}
                                    title={course.activo ? 'Activo: los alumnos lo ven. Clic para inactivar.' : 'Borrador: los alumnos no lo ven. Clic para activar.'}
                                  >
                                    {course.activo ? 'Activo' : 'Borrador'}
                                  </button>
                                </td>
                                <td className="cl-acciones" data-label="Acciones">
                                  <div className="cl-acciones-fila">
                                    {/* Editar es lo que se usa casi siempre: lleva texto, no solo ícono. */}
                                    <button className="cl-btn-editar" onClick={() => handleOpenCourseEdit(course)} aria-label={`Editar ${course.title}`}>
                                      <Edit size={15} /> Editar
                                    </button>
                                    {!isNaN(Number(course.id)) && (
                                      <button
                                        className="icon-action-btn"
                                        onClick={() => { setMetricasDeCurso({ id: Number(course.id) }); setActiveTab('metricas'); }}
                                        title="Métricas del curso: alumnos, avance y calificaciones"
                                        aria-label={`Métricas de ${course.title}`}
                                      >
                                        <TrendingUp size={16} />
                                      </button>
                                    )}
                                    <a className="icon-action-btn" href={`/classroom/${course.id}`} target="_blank" rel="noopener noreferrer" title="Ver aula" aria-label={`Ver aula de ${course.title}`}><ExternalLink size={16} /></a>
                                    {!isNaN(Number(course.id)) && (
                                      <button className="icon-action-btn" onClick={() => handleClonarCourse(course)} title="Clonar curso" aria-label={`Clonar ${course.title}`}>
                                        <Copy size={16} />
                                      </button>
                                    )}
                                    <button className="icon-action-btn delete" onClick={() => handleDeleteCourse(course.id)} title="Eliminar" aria-label={`Eliminar ${course.title}`}>
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
  );
}
