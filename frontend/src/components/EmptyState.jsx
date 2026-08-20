// Estado vacío para listados sin datos.
//
// Reemplaza los "No hay X registrados" planos que se repetían en las
// páginas de CRUD. Da una experiencia más cuidada y opcionalmente ofrece
// una acción directa para resolver el vacío (crear el primero).

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="bg-dark-200 border border-dashed border-dark-400 rounded-lg p-10 text-center">
      {Icon && (
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-dark-300 flex items-center justify-center">
          <Icon size={22} className="text-gray-300" />
        </div>
      )}
      {title && (
        <p className="text-gray-100 text-sm font-semibold uppercase tracking-wider mb-1">
          {title}
        </p>
      )}
      {message && (
        <p className="text-gray-300 text-sm max-w-sm mx-auto">
          {message}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
