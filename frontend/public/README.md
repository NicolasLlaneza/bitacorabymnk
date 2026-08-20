# Assets del tenant

Antes de deployar por primera vez, poné los siguientes archivos acá con estos
nombres exactos:

- `logo.png` — Logo full-color de la marca (usado en login y consulta pública).
  Tamaño sugerido: 512×512, fondo transparente.
- `favicon.png` — Ícono de pestaña del navegador. 32×32 mínimo, cuadrado.
- `apple-touch-icon.png` — Ícono para iOS (add to home). 180×180.

Si no están, el sitio buildea pero muestra ícono roto en el `<img>` del Logo
y usa el favicon default del browser en la pestaña.

Podés poner el mismo `logo.png` en los 3 tamaños distintos si no tenés
versiones optimizadas, pero pierde nitidez en el favicon.
