// Wrapper reutilizable para las tablas de listado.
//
// Encapsula el patrón visual que estaba duplicado en 6 archivos:
//   <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
//     <table className="w-full text-sm min-w-[Npx] whitespace-nowrap">
//       <thead>...columnas del header...</thead>
//       <tbody>{children}</tbody>
//     </table>
//   </div>
//
// Se le pasa la lista de columnas como strings; el resto de las filas
// va como children en el <tbody>. Deja el markup interno accesible por
// si algún caso necesita colspan u otras variaciones (ver /inicio).

export default function DataTable({ columns, minWidth = 640, children }) {
  return (
    <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
      <table
        className="w-full text-sm whitespace-nowrap"
        style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}
      >
        <thead>
          <tr className="border-b border-dark-400">
            {columns.map(col => (
              <th
                key={col}
                className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-200"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
