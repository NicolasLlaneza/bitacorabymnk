/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Config del cliente vive en tenant.config.json en la raíz del repo. Se lee
// una vez al arrancar Vite para poder sustituir el título en index.html sin
// que cada cliente edite el HTML a mano.
const tenant = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'tenant.config.json'), 'utf-8'))

// Reemplaza %TENANT_TITLE% en index.html por el título del tenant.
function tenantHtmlPlugin() {
  return {
    name: 'tenant-html',
    transformIndexHtml(html) {
      return html.replace(/%TENANT_TITLE%/g, tenant.app?.titulo ?? 'Bitácora')
    },
  }
}

export default defineConfig({
  plugins: [react(), tenantHtmlPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.config.{js,ts}',
        '**/*.test.{js,jsx}',
        'src/main.jsx',
      ],
    },
  },
})
