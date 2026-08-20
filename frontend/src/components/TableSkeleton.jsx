// Skeleton para mostrar mientras se cargan los datos de una tabla.
//
// Reemplaza el "Cargando..." plano por barras animadas con la forma
// aproximada del contenido. La percepción de velocidad mejora aunque
// la latencia real sea la misma — el usuario ve estructura desde el
// primer frame y no siente que la app está congelada.

export default function TableSkeleton({
  columns = 5,
  rows    = 6,
  minWidth = 640,
}) {
  return (
    <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
      <table
        className="w-full text-sm"
        style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}
      >
        <thead>
          <tr className="border-b border-dark-400">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left px-4 py-3">
                <div className="h-3 bg-dark-400 rounded animate-pulse" style={{ width: '60%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-dark-400 last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3.5">
                  <div
                    className="h-3 bg-dark-300 rounded animate-pulse"
                    // Anchos variables para que no parezca una grilla perfecta.
                    style={{ width: `${45 + ((r + c) * 13) % 45}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
