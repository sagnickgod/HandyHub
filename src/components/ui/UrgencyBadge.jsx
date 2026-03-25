export default function UrgencyBadge({ urgency }) {
  const config = {
    high: { bg: 'bg-danger/15', text: 'text-danger', label: '🔴 Urgent', pulse: true },
    medium: { bg: 'bg-accent/15', text: 'text-accent', label: 'Medium' },
    low: { bg: 'bg-text-muted/15', text: 'text-text-muted', label: 'Low' }
  }

  const c = config[urgency] || config.medium

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text} ${c.pulse ? 'animate-pulse' : ''}`}>
      {c.label}
    </span>
  )
}
