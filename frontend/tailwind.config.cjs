// Los colores primarios se leen de tenant.config.json en la raíz del repo.
// El resto de la paleta (dark, grises, tokens semánticos) es común a todos
// los tenants — no la exponemos como configuración porque cambiar la paleta
// entera es un rebranding profundo, no una personalización menor.
const tenant = require('../tenant.config.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: tenant.colores.primario,
          bright:  tenant.colores.primarioBright,
        },
        // Tokens semánticos — matchear con COLORS en src/lib/colors.js
        success: '#16a34a',
        warning: '#d97706',
        neutral: '#666666',
        muted:   '#555555',
        dark: {
          DEFAULT: '#0d0d0d',
          50: '#161616',
          100: '#111111',
          200: '#1a1a1a',
          300: '#1e1e1e',
          400: '#2a2a2a',
        },
        gray: {
          100: '#f5f5f5',   // texto principal (blanco suave, cómodo en OLED)
          200: '#b8b8b8',   // texto secundario, labels
          300: '#7a7a7a',   // placeholders, hints, texto terciario
          400: '#3a3a3a',   // bordes y separadores
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
