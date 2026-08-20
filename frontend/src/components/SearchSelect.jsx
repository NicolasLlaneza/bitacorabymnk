import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

/**
 * SearchSelect — input con búsqueda y dropdown
 *
 * Props:
 *   label       → string
 *   options     → [{ value, label }]
 *   value       → string (el value seleccionado)
 *   onChange    → fn(value)
 *   placeholder → string
 *   error       → string
 */
export default function SearchSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Buscar...',
  error,
}) {
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const containerRef            = useRef(null)

  // Texto del item seleccionado
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  // Filtrar opciones según búsqueda
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs uppercase tracking-wider text-gray-200">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Input principal */}
        <div
          className={`
            flex items-center gap-2 bg-dark-300 border rounded px-3 py-2.5 cursor-text
            transition-colors
            ${error ? 'border-red-bright' : open ? 'border-red' : 'border-dark-400'}
          `}
          onClick={() => setOpen(true)}
        >
          <Search size={14} className="text-gray-300 shrink-0" />

          {open ? (
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-gray-100 text-sm outline-none placeholder:text-gray-300"
            />
          ) : (
            <span className={`flex-1 text-sm ${value ? 'text-gray-100' : 'text-gray-300'}`}>
              {value ? selectedLabel : placeholder}
            </span>
          )}

          {value && !open && (
            <button onClick={handleClear} className="text-gray-300 hover:text-gray-100 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-30 w-full mt-1 bg-dark-200 border border-dark-400 rounded shadow-xl max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-300">Sin resultados</p>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${option.value === value
                      ? 'bg-dark-400 text-gray-100'
                      : 'text-gray-200 hover:bg-dark-300 hover:text-gray-100'}
                  `}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-bright">{error}</span>}
    </div>
  )
}
