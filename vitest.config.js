// Pruebas automáticas (vitest + jsdom + @testing-library/react). Ver tests/LEEME.md.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    // Supabase apunta a un dominio falso: todo lo responde el fetch simulado.
    env: {
      VITE_SUPABASE_URL: 'https://prueba.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'llave-anonima-de-prueba',
      // Netlify sí tiene llaves reales: las pruebas tampoco deben heredarlas.
      SUPABASE_URL: 'https://prueba.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: '',
      BREVO_API_KEY: '',
      AVISO_ERRORES_PARA: '',
      AVISO_REGISTROS_PARA: '',
    },
    css: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default'],
  },
});
