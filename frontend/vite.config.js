/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Config del cliente vive en tenant.config.json en la raíz del repo. Se lee
// una vez al arrancar Vite para poder sustituir el título en index.html sin
// que cada cliente edite el HTML a mano.
//
// Modo demo comercial (`npm run build:demo`, ver src/lib/demo.js y
// docs/DEMO.md): se usa tenant.demo.json en lugar de tenant.config.json
// (también en tailwind.config.cjs, vía TENANT_CONFIG) y public-demo/ en
// lugar de public/, para no publicar logos de ningún cliente.
const TENANT_REAL = path.resolve(__dirname, '..', 'tenant.config.json')
const TENANT_DEMO = path.resolve(__dirname, '..', 'tenant.demo.json')

// Reemplaza %TENANT_TITLE% en index.html por el título del tenant.
function tenantHtmlPlugin(tenant, demo) {
  return {
    name: 'tenant-html',
    transformIndexHtml(html) {
      html = html.replace(/%TENANT_TITLE%/g, tenant.app?.titulo ?? 'Bitácora')
      if (!demo) return html
      return html
        .replace('<html lang="es">', '<html lang="es" data-demo>')
        .replace(/\s*<link rel="icon"[^>]*>/, '\n    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
    },
  }
}

// En demo, cualquier import de tenant.config.json desde src/ resuelve a
// tenant.demo.json.
function tenantDemoPlugin() {
  return {
    name: 'tenant-demo',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.endsWith('tenant.config.json')) return null
      const resuelto = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resuelto?.id === TENANT_REAL ? TENANT_DEMO : null
    },
  }
}

export default defineConfig(({ mode }) => {
  const demo = loadEnv(mode, process.cwd(), '').VITE_DEMO_MODE === 'true'
  const archivoTenant = demo ? TENANT_DEMO : TENANT_REAL
  process.env.TENANT_CONFIG = archivoTenant
  const tenant = JSON.parse(readFileSync(archivoTenant, 'utf-8'))

  return {
    plugins: [react(), tenantHtmlPlugin(tenant, demo), demo && tenantDemoPlugin()],
    publicDir: demo ? 'public-demo' : 'public',
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
  }
})
