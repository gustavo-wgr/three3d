import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['tween'],
    },
  },
  optimizeDeps: {
    exclude: ['tween']
  }
})
