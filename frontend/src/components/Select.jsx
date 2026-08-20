export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs uppercase tracking-wider text-gray-200">{label}</label>
      )}
      <select
        className={`
          bg-dark-300 border text-gray-100 text-sm rounded px-3 py-2.5
          outline-none transition-colors cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-bright' : 'border-dark-400 focus:border-red'}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-bright">{error}</span>}
    </div>
  )
}
