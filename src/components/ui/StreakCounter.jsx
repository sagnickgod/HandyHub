import { Flame } from 'lucide-react'

export default function StreakCounter({ count, longest }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 ${count >= 7 ? 'text-accent animate-pulse' : count > 0 ? 'text-accent' : 'text-text-muted'}`}>
        <Flame size={18} />
        <span className="font-bold">{count}</span>
      </div>
      {longest > 0 && (
        <span className="text-xs text-text-muted">Best: {longest}</span>
      )}
    </div>
  )
}
