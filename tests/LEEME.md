# Pruebas de la escuela HCE

`npm run verificar` ejecuta lint, Vitest, regresiones de LMS y Alumni, borradores,
asistente y compilación. Netlify usa el mismo comando para detener una publicación
si falla alguna comprobación. Ejecutarlo localmente no publica nada.

`npm test` monta las páginas reales con React y jsdom, recorre menús del alumno,
administración y editor de cursos, y comprueba el aula, perfil, avisos, verificación
pública y alertas de errores. `npm run test:watch` permite repetirlo al editar.

`setup.js` reemplaza fetch antes de importar Supabase. El cliente usa el dominio
ficticio `prueba.supabase.co` y `simulador.js` aporta cuentas y cursos inventados.
Los tests de alertas reemplazan también el servidor y Brevo: no envían correos,
no hacen pagos y no escriben en Supabase real. No agregar credenciales a las pruebas.

Las capturas a 375/1280 px y la comprobación de PDFs descargados se hicieron aparte
en Chrome con datos simulados; jsdom no comprueba el diseño ni dibuja canvas.
Las migraciones SQL se comprobaron dos veces en PostgreSQL en memoria; siguen
pendientes de aplicación en producción por Christian.
