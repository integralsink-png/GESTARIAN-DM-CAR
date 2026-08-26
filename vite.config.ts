import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  // 'npm run dev'          -> http://localhost:5173 (escritorio, igual que siempre)
  // 'npm run dev:mobile'   -> https://192.168.x.x:5174 (HTTPS autofirmado para el
  //                            móvil: solo así el navegador permite el micrófono)
  const mobileHttps = mode === 'mobile'
  const port = mobileHttps ? 5174 : 5173
  return {
    plugins: [
      react(),
      ...(mobileHttps ? [basicSsl()] : []),
    ],
    server: {
      host: true,
      port,
      strictPort: false,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
    preview: {
      host: true,
      port,
      strictPort: true,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'framer-motion'],
            db: ['@supabase/supabase-js'],
            utils: ['jspdf', 'html2canvas']
          }
        }
      }
    }
  }
})
