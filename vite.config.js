import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['tween'],
    },
  },
  optimizeDeps: {
    exclude: ['tween']
  },
  resolve: {
    alias: {
      'tween': 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js'
    }
  }
})
