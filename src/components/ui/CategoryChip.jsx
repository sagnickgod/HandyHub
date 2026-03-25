const categories = {
  coding: { label: 'Coding', emoji: '💻', color: 'bg-coding/15 text-coding' },
  study: { label: 'Study', emoji: '📚', color: 'bg-study/15 text-study' },
  tech: { label: 'Tech', emoji: '🔧', color: 'bg-tech/15 text-tech' },
  physical: { label: 'Physical', emoji: '🏃', color: 'bg-physical/15 text-physical' },
  event: { label: 'Event', emoji: '🎉', color: 'bg-event/15 text-event' },
  creative: { label: 'Creative', emoji: '🎨', color: 'bg-creative/15 text-creative' },
  other: { label: 'Other', emoji: '📦', color: 'bg-text-muted/15 text-text-muted' }
}

export default function CategoryChip({ category, size = 'sm', selected, onClick }) {
  const c = categories[category] || categories.other

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all btn-press
        ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'}
        ${selected ? 'ring-2 ring-primary bg-primary/20 text-primary' : c.color}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <span>{c.emoji}</span>
      <span>{c.label}</span>
    </button>
  )
}

export { categories }
