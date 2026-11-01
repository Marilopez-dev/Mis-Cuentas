import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from https://<user>.github.io/Mis-Cuentas/
  base: command === 'build' ? '/Mis-Cuentas/' : '/',
}))
