export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-dark-200 border border-dark-400 rounded-lg ${className}`}>
      {children}
    </div>
  )
}
