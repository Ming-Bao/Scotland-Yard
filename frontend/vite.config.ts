import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8999',
      '/ws': { target: 'http://localhost:8999', ws: true },
      '/test-map.json': 'http://localhost:8999',
    }
  }
})
