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
    paymentFilterCourse,
    paymentSearch,
    paymentSortOrder,
    paymentTimePeriod,
    paymentsError,
    selectedFormEntry,
    setActivePaymentsSubTab,
    setFormFilterType,
    setFormSearch,
    setFormSortOrder,
    setPaymentFilterCourse,
    setPaymentSearch,
    setPaymentSortOrder,
    setPaymentTimePeriod,
    setSelectedFormEntry,
    setShowFormModal,
    showConfirm,
    showFormModal,
    showToast,
    stripePayments,
    supabase,
  } = contexto;
  return (
(() => {
            const gatewayCourses = [
              { id: 'ecmo_sim', title: 'ECMO SIM: Realidad Clínica' },
              { id: 'ecmo_nursing', title: 'ECMO Nursing Care Course' },
              { id: 'ecmo_paris', title: 'Paris International Diploma in ECMO' },
              // Segunda cuenta de Stripe. Sus cobros llegan con courseId 'cnadot'
              // desde get-stripe-payments porque nacen de payment links, no de
              // las funciones de checkout de este proyecto.
              { id: 'cnadot', title: 'CNADOT — Donación de Órganos' }
            ];

            // Filter payments based on search and filters
            const filteredPayments = stripePayments.filter(pay => {
              const matchesSearch = pay.studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                                    pay.studentEmail.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                                    pay.id.toLowerCase().includes(paymentSearch.toLowerCase());
              // Match course, filter key matches database courses or gateway courses
              const matchesCourse = paymentFilterCourse === 'all' || pay.courseId === paymentFilterCourse;

              // Date filter
              let matchesPeriod = true;
              if (paymentTimePeriod === 'month') {
                const oneMonthAgo = new Date();
                oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
                matchesPeriod = new Date(pay.date) >= oneMonthAgo;
              } else if (paymentTimePeriod === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                matchesPeriod = new Date(pay.date) >= oneWeekAgo;
              }

              return matchesSearch && matchesCourse && matchesPeriod;
            });

            // Filter form submissions based on search and filters
            const filteredForms = formSubmissions.filter(entry => {
              const matchesSearch = entry.senderName.toLowerCase().includes(formSearch.toLowerCase()) ||
                                    entry.senderEmail.toLowerCase().includes(formSearch.toLowerCase()) ||
                                    JSON.stringify(entry.payload).toLowerCase().includes(formSearch.toLowerCase());
              const matchesType = formFilterType === 'all' || entry.formId === formFilterType;
              return matchesSearch && matchesType;
            });

            // Sort payments dynamically (de arriba a abajo / de abajo a arriba)
            const sortedPayments = [...filteredPayments].sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return paymentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });

            // Sort forms dynamically (de arriba a abajo / de abajo a arriba)
            const sortedForms = [...filteredForms].sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return formSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });

            // Calculate KPIs dynamically.
            //
            // Los cobros llegan en pesos y en dólares (la segunda cuenta de
            // Stripe recibe los pagos del extranjero). Sumarlos como un solo
            // número da un total falso: 200 USD no son 200 pesos, y el importe
            // quedaba subestimado ~17 veces por cada cobro en dólares.
            // Se agrupan por moneda y se muestran por separado, que además no
            // obliga a fijar un tipo de cambio que envejecería mal.
            const totalesPorMoneda = filteredPayments.reduce((acc, p) => {
              const m = (p.currency || 'MXN').toUpperCase();
              acc[m] = (acc[m] || 0) + p.amount;
              return acc;
            }, {});
            // De mayor a menor, para que la moneda principal encabece.
            const monedasOrdenadas = Object.entries(totalesPorMoneda).sort((a, b) => b[1] - a[1]);

            const totalTransactions = filteredPayments.length;
            const totalForms = filteredForms.length;
            const conversionRate = totalTransactions > 0 ? Math.round((totalTransactions / (totalTransactions + totalForms)) * 100) : 0;

            const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            // La moneda con más dinero encabeza el KPI y es la que se grafica.
            const monedaPrincipal = monedasOrdenadas[0]?.[0] || 'MXN';

            // Generate monthly sales — solo de la moneda principal, para que las
            // barras representen una unidad real y no una mezcla.
            const monthlySales = {};
            filteredPayments.forEach(pay => {
              // Mismo criterio que totalesPorMoneda: los importados por CSV
              // pueden traer la moneda en minúsculas.
              if ((pay.currency || 'MXN').toUpperCase() !== monedaPrincipal) return;
              const d = new Date(pay.date);
              if (!isNaN(d.getTime())) {
                const monthName = monthsNames[d.getMonth()];
                monthlySales[monthName] = (monthlySales[monthName] || 0) + pay.amount;
              }
            });

            // Order of months (dynamic last 4 months)
            const getLast4Months = () => {
              const months = [];
              const date = new Date();
              for (let i = 3; i >= 0; i--) {
                const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
                months.push(monthsNames[d.getMonth()]);
              }
              return months;
            };
            const monthOrder = getLast4Months();
            const chartData = monthOrder.map(m => ({
              label: m,
              val: monthlySales[m] || 0
            }));

            // Antes era `filteredPayments[0]?.currency`: la etiqueta del total
            // salía de cuál fue el primer cobro de la lista, no de una unidad real.
            const currencySuffix = monedaPrincipal;

            // Generate sales by course for Donut Chart
            const courseSales = {};
            filteredPayments.forEach(pay => {
              courseSales[pay.courseName] = (courseSales[pay.courseName] || 0) + 1;
            });

            const donutColors = ['#e31837', '#00d2ff', '#0c2340', '#f59e0b', '#10b981'];
            const courseChartData = Object.keys(courseSales).map((name, i) => ({
              name,
              count: courseSales[name],
              color: donutColors[i % donutColors.length]
            }));

            const totalCourseSalesCount = courseChartData.reduce((acc, c) => acc + c.count, 0);

            // Export to CSV helper
            const handleExportPayments = () => {
              const headers = ['ID Transaccion', 'Alumno', 'Email', 'Pais', 'Curso', 'Monto', 'Moneda', 'Estado', 'Fecha', 'Metodo'];
              const csvRows = [headers.join(',')];

              filteredPayments.forEach(pay => {
                const row = [
                  pay.id,
                  `"${pay.studentName}"`,
                  pay.studentEmail,
                  pay.studentCountry,
                  `"${pay.courseName}"`,
                  pay.amount,
                  pay.currency,
                  pay.status,
                  pay.date,
                  `"${pay.method}"`
                ];
                csvRows.push(row.join(','));
              });

              const csvString = csvRows.join('\n');
              const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `reporte_pagos_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

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

                  {activePaymentsSubTab === 'stripe' && (
                    <button
                      className="icon-action-btn secondary"
                      onClick={fetchRealStripePayments}
                      disabled={loadingPayments}
                      style={{ height: '38px', gap: '6px', cursor: 'pointer' }}
                    >
                      <Clock size={14} className={loadingPayments ? 'spin-animation' : ''} />
                      {loadingPayments ? 'Sincronizando...' : 'Sincronizar Stripe'}
                    </button>
                  )}

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

                {paymentsError && activePaymentsSubTab === 'stripe' && (
                  <div className="alert-message warning" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fde047', backgroundColor: '#fef9c3', color: '#854d0e', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>No se pudieron actualizar los pagos: {paymentsError}. Se muestran los últimos registros recibidos o importados.</span>
                  </div>
                )}

                {/* KPI CARDS */}
                <div className="kpi-row" style={{ marginBottom: '30px' }}>
                  <div className="kpi-card">
                    <div className="kpi-icon-wrapper green">
                      <DollarSign size={20} />
                    </div>
                    <div className="kpi-details">
                      <span className="kpi-label">Ingresos Totales</span>
                      {/* Un renglón por moneda: sumarlas daría un número que no
                          corresponde a ninguna cantidad real de dinero. */}
                      {monedasOrdenadas.length === 0 ? (
                        <h3 className="kpi-value">$0</h3>
                      ) : (
                        <>
                          <h3 className="kpi-value">
                            ${monedasOrdenadas[0][1].toLocaleString()} {monedasOrdenadas[0][0]}
                          </h3>
                          {monedasOrdenadas.slice(1).map(([mon, total]) => (
                            <span key={mon} className="kpi-subvalue">
                              + ${total.toLocaleString()} {mon}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrapper blue">
                      <CreditCard size={20} />
                    </div>
                    <div className="kpi-details">
                      <span className="kpi-label">Transacciones Stripe</span>
                      <h3 className="kpi-value">{totalTransactions}</h3>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrapper orange">
                      <Mail size={20} />
                    </div>
                    <div className="kpi-details">
                      <span className="kpi-label">Forms Recibidos (Logs)</span>
                      <h3 className="kpi-value">{totalForms}</h3>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrapper cyan">
                      <BarChart2 size={20} />
                    </div>
                    <div className="kpi-details">
                      <span className="kpi-label">Tasa Conversión (Est.)</span>
                      <h3 className="kpi-value">{conversionRate}%</h3>
                    </div>
                  </div>
                </div>

                {/* CHARTS CONTAINER */}
                <div className="payments-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>

                  {/* CHART 1: BAR CHART (MONTHLY REVENUE) */}
                  <div className="sub-section-block">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                      <h3>Tendencia de Ventas ({currencySuffix})</h3>
                      {/* El +45.2% que estaba aquí era un valor fijo en el JSX:
                          no salía de ningún dato y se mostraba igual con
                          cualquier cifra. Se calcula contra el mes anterior. */}
                      {(() => {
                        const actual = chartData[chartData.length - 1]?.val || 0;
                        const previo = chartData[chartData.length - 2]?.val || 0;
                        if (!previo) return null;
                        const variacion = Math.round(((actual - previo) / previo) * 100);
                        const sube = variacion >= 0;
                        return (
                          <span
                            className={`trend-indicator ${sube ? 'up' : 'down'}`}
                            title="Contra el mes anterior"
                            style={{ fontSize: '0.8rem', color: sube ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                          >
                            {sube ? '+' : ''}{variacion}% {sube ? '↑' : '↓'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="svg-chart-container" style={{ position: 'relative', height: '200px', width: '100%' }}>
                      <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="proBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff3860" />
                            <stop offset="100%" stopColor="#e31837" />
                          </linearGradient>
                          <filter id="barShadow" x="-15%" y="-15%" width="130%" height="130%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#e31837" floodOpacity="0.25" />
                          </filter>
                          <linearGradient id="hoverBgGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(227, 24, 55, 0.08)" />
                            <stop offset="100%" stopColor="rgba(227, 24, 55, 0.0)" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="0" y1="40" x2="400" y2="40" stroke="var(--border-color)" strokeDasharray="4 4" />
                        <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border-color)" strokeDasharray="4 4" />
                        <line x1="0" y1="160" x2="400" y2="160" stroke="var(--border-color)" strokeDasharray="4 4" />

                        {/* Bars */}
                        {chartData.map((d, idx) => {
                          const x = idx === 0 ? 40 : (idx === 1 ? 130 : (idx === 2 ? 220 : 310));
                          const maxVal = Math.max(...chartData.map(c => c.val), 100);
                          const barHeight = (d.val / maxVal) * 120;
                          const y = 160 - barHeight;
                          return (
                            <g key={idx} className="bar-hover-group">
                              {/* Background highlight hover effect */}
                              <rect
                                x={x - 6}
                                y="20"
                                width="62"
                                height="150"
                                rx="8"
                                fill="url(#hoverBgGrad)"
                                className="bar-bg-highlight"
                                style={{ transition: 'opacity 0.3s ease', opacity: 0 }}
                              />
                              {/* Transparent interactive trigger area */}
                              <rect
                                x={x - 6}
                                y="20"
                                width="62"
                                height="150"
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                              />
                              {/* Actual animated bar */}
                              <rect
                                x={x + 5}
                                y={y}
                                width="40"
                                height={barHeight}
                                rx="6"
                                fill="url(#proBarGrad)"
                                filter="url(#barShadow)"
                                className="main-bar"
                                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                              />
                              {/* Value label above bar */}
                              <text x={x + 25} y={y - 8} textAnchor="middle" fill="var(--text-dark)" fontSize="10" fontWeight="bold">
                                ${d.val.toLocaleString()}
                              </text>
                              {/* Month label below bar */}
                              <text x={x + 25} y="180" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500">
                                {d.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* CHART 2: DONUT / PIE CHART (SALES BY COURSE) */}
                  <div className="sub-section-block">
                    <h3>Distribución de Ventas por Curso</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '200px', marginTop: '10px' }}>
                      <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          {courseChartData.length === 0 ? (
                            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="15" />
                          ) : (() => {
                            let accumulatedPercent = 0;
                            return courseChartData.map((c, idx) => {
                              const percent = (c.count / totalCourseSalesCount) * 100;
                              const strokeDashArray = `${percent} ${100 - percent}`;
                              const strokeDashOffset = 100 - accumulatedPercent + 25;
                              accumulatedPercent += percent;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke={c.color}
                                  strokeWidth="12"
                                  strokeDasharray={strokeDashArray}
                                  strokeDashoffset={strokeDashOffset}
                                  pathLength="100"
                                  style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                                />
                              );
                            });
                          })()}
                          <circle cx="50" cy="50" r="28" fill="var(--bg-main)" />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Ventas</span>
                          <strong style={{ fontSize: '1.25rem', color: 'var(--text-dark)' }}>{totalTransactions}</strong>
                        </div>
                      </div>

                      {/* Legends */}
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {courseChartData.map((c, idx) => {
                          const pct = totalCourseSalesCount > 0 ? Math.round((c.count / totalCourseSalesCount) * 100) : 0;
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color }}></div>
                                <span style={{ color: 'var(--text-dark)', fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }} title={c.name}>{c.name}</span>
                              </div>
                              <strong style={{ color: 'var(--text-dark)' }}>{pct}% ({c.count})</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MAIN TABLE VIEWS */}
                {activePaymentsSubTab === 'stripe' ? (
                  <div className="sub-section-block">
                    <div className="table-actions-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                        <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                          <Search size={16} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="admin-input-field"
                            style={{ paddingLeft: '38px', height: '40px', width: '100%' }}
                            placeholder="Buscar por alumno, email o ID..."
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                          />
                        </div>

                        <select
                          className="admin-input-field"
                          style={{ height: '40px', maxWidth: '200px' }}
                          value={paymentFilterCourse}
                          onChange={(e) => setPaymentFilterCourse(e.target.value)}
                        >
                          <option value="all">Todos los Cursos</option>
                          {gatewayCourses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>

                        <select
                          className="admin-input-field"
                          style={{ height: '40px', maxWidth: '160px' }}
                          value={paymentTimePeriod}
                          onChange={(e) => setPaymentTimePeriod(e.target.value)}
                        >
                          <option value="all">Todo el Historial</option>
                          <option value="month">Últimos 30 días</option>
                          <option value="week">Última semana</option>
                        </select>

                        <button
                          className="btn-crm-action outlined mini"
                          style={{ height: '40px', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => setPaymentSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          title={paymentSortOrder === 'desc' ? 'Ver de más antiguos a más recientes' : 'Ver de más recientes a más antiguos'}
                        >
                          {paymentSortOrder === 'desc' ? 'Orden: De arriba a abajo' : 'Orden: De abajo a arriba'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label className="btn-crm-action outlined mini" style={{ cursor: 'pointer', margin: 0, height: '40px' }}>
                          <Upload size={14} /> Importar JSON/CSV
                          <input type="file" accept=".json,.csv" onChange={handleImportPayments} style={{ display: 'none' }} />
                        </label>
                        <button className="btn-crm-action outlined mini" style={{ height: '40px' }} onClick={handleExportPayments}>
                          <FileSpreadsheet size={14} /> Exportar Excel/CSV
                        </button>
                      </div>
                    </div>

                    {/* STRIPE PAYMENTS TABLE */}
                    <div className="table-responsive-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID Transacción</th>
                            <th>Alumno</th>
                            <th>Curso</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPayments.length === 0 ? (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                                No se encontraron transacciones con los filtros seleccionados.
                              </td>
                            </tr>
                          ) : (
                            sortedPayments.map((pay) => (
                              <tr key={pay.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pay.id}</td>
                                <td>
                                  <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{pay.studentName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pay.studentEmail}</div>
                                  {pay.promoCode && (
                                    <span className="status-badge" style={{ marginTop: '4px', fontSize: '0.65rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'inline-flex', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                      Cupón: {pay.promoCode}
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{pay.courseName}</td>
                                <td style={{ fontWeight: '700', color: '#10b981' }}>${pay.amount}.00 {pay.currency}</td>
                                <td style={{ fontSize: '0.85rem' }}>{pay.method}</td>
                                <td>{formatDate(pay.date)}</td>
                                <td>
                                  <span className="status-badge active" style={{ padding: '4px 8px', borderRadius: '100px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={10} /> Éxito
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
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
