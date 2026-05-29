import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // Forwards /api/* to the Express backend during dev.
      // No CORS issues and no secrets in the browser.
      '/api': 'http://localhost:3001',
    },
  },
})
