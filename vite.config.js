import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Con el code splitting por ruta el chunk mas grande baja muy por debajo
    // del limite; dejamos el aviso en 600 kB para que vuelva a saltar si
    // alguna pagina se descontrola.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Vendors separados: cambian mucho menos que el codigo de la app, asi
        // que conviene que tengan su propio hash y su propia entrada de cache.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-intersection-observer')) return 'vendor-observer'
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
  },
})
