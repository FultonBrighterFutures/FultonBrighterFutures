import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Must match the GitHub Pages project URL path:
  // https://fultonbrighterfutures.github.io/FultonBrighterFutures/
  base: '/FultonBrighterFutures/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
})