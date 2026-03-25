import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className={`${sizes[size]} text-primary animate-spin`} />
      {text && <p className="text-text-muted text-sm">{text}</p>}
    </div>
  )
}
