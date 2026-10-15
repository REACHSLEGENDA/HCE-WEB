// Vista de administración: ayuda. Estado y operaciones permanecen en AdminDashboard.
export default function VistaAyuda({ contexto }) {
  const {
    GuiaUso,
    setActiveTab,
  } = contexto;
  return (
<GuiaUso rol="admin" onIr={setActiveTab} />
  );
}
