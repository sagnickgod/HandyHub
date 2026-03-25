import ReputationStars from '../ui/ReputationStars'

export default function ApplicationCard({ application, onSelect, isPoster }) {
  const a = application.applicant

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
          {a?.full_name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text text-sm truncate">{a?.full_name}</p>
          <div className="flex items-center gap-2">
            <ReputationStars score={a?.reputation_score} size="sm" />
            <span className="text-xs text-text-muted">{Number(a?.completion_rate || 0).toFixed(0)}% done</span>
          </div>
        </div>
        {isPoster && application.status === 'pending' && (
          <button
            onClick={() => onSelect(application)}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors btn-press"
          >
            Select
          </button>
        )}
        {application.status === 'selected' && (
          <span className="bg-accent-2/15 text-accent-2 text-xs font-semibold px-3 py-1 rounded-full">
            Selected ✓
          </span>
        )}
        {application.status === 'rejected' && (
          <span className="bg-danger/15 text-danger text-xs font-semibold px-3 py-1 rounded-full">
            Rejected
          </span>
        )}
      </div>

      {application.pitch && (
        <p className="text-sm text-text-muted">{application.pitch}</p>
      )}
      {application.estimated_time && (
        <p className="text-xs text-text-muted">⏱️ Est. time: {application.estimated_time}</p>
      )}
    </div>
  )
}
