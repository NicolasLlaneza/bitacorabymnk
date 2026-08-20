const variants = {
  primary:   'bg-red text-gray-100 hover:bg-red-bright border-transparent',
  secondary: 'bg-transparent text-gray-100 border-dark-400 hover:border-gray-200',
  ghost:     'bg-transparent text-gray-200 border-transparent hover:text-gray-100',
  danger:    'bg-transparent text-red border-red hover:bg-red hover:text-gray-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold uppercase tracking-wider rounded
        border transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
