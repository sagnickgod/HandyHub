import CategoryChip from '../ui/CategoryChip'

const allFilters = [
  { key: 'all', label: 'All' },
  { key: 'matches', label: '✨ Matches My Skills' },
  { key: 'urgent', label: '🔴 Urgent' },
  { key: 'deadline', label: '⏰ Deadline Soon' },
  { key: 'highReward', label: '💰 High Reward' },
]

const sortOptions = [
  { key: 'newest', label: 'Newest' },
  { key: 'points', label: 'Highest Points' },
  { key: 'urgency', label: 'Urgency' },
]

export default function TaskFilters({ activeFilter, onFilterChange, sortBy, onSortChange }) {
  return (
    <div className="space-y-3">
      {/* Filter pills - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {allFilters.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all btn-press
              ${activeFilter === f.key
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-surface-2 text-text-muted hover:text-text hover:bg-surface-2/80'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="flex justify-end">
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="!w-auto text-sm bg-surface-2 border-border rounded-lg px-3 py-1.5"
        >
          {sortOptions.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
