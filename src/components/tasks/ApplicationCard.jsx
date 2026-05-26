import { Clock, Star, TrendingUp, CheckCircle2, Award } from 'lucide-react'
import ReputationStars from '../ui/ReputationStars'

function formatEstTime(timeStr) {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  const h = parseInt(parts[0])
  const m = parseInt(parts[1])
  if (h === 0 && m === 0) return null
  let formatted = ''
  if (h > 0) formatted += `${h}h `
  if (m > 0) formatted += `${m}m`
  return formatted.trim()
}

export default function ApplicationCard({ application, onSelect, isPoster, isRecommended }) {
  const a = application.applicant
  const estTime = formatEstTime(application.estimated_time)
  const rating = Number(a?.reputation_score || 0)
  const completionRate = Number(a?.completion_rate || 0)
  const tasksHelped = a?.total_tasks_helped || 0

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 space-y-3"
      style={{
        background: isRecommended
          ? 'linear-gradient(135deg, #17171D, #161422)'
          : 'linear-gradient(135deg, #17171D, #14141A)',
        border: isRecommended
          ? '1px solid rgba(251,191,36,0.2)'
          : '1px solid rgba(255,255,255,0.06)',
      }}>

      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Award size={10} className="text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Recommended</span>
        </div>
      )}

      {/* Top row: avatar + name + action */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
          {a?.avatar_url
            ? <img src={a.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
            : a?.full_name?.[0] || '?'
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{a?.full_name}</p>
          <div className="flex items-center gap-2">
            <ReputationStars score={a?.reputation_score} size="sm" />
            <span className="text-xs text-white/30">@{a?.username}</span>
          </div>
        </div>
        {isPoster && application.status === 'pending' && (
          <button
            onClick={() => onSelect(application)}
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', color: '#fff', boxShadow: '0 4px 12px rgba(124,111,247,0.3)' }}
          >
            Select
          </button>
        )}
        {application.status === 'selected' && (
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
            Selected ✓
          </span>
        )}
        {application.status === 'rejected' && (
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
            Rejected
          </span>
        )}
      </div>

      {/* Stats row - visible to poster */}
      {isPoster && (
        <div className="flex flex-wrap gap-3 text-[11px]">
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Star size={10} className="text-amber-400" />
            <span className="text-white/50">Rating:</span>
            <span className="font-bold text-amber-400">{rating.toFixed(1)}/5</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span className="text-white/50">Completion:</span>
            <span className="font-bold text-emerald-400">{completionRate.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <TrendingUp size={10} className="text-violet-400" />
            <span className="text-white/50">Helped:</span>
            <span className="font-bold text-violet-400">{tasksHelped} tasks</span>
          </div>
        </div>
      )}

      {/* Pitch */}
      {application.pitch && (
        <div className="pl-3 border-l-2 border-violet-500/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-1">Pitch</p>
          <p className="text-sm text-white/60 leading-relaxed">{application.pitch}</p>
        </div>
      )}

      {/* Estimated time */}
      {estTime && (
        <div className="flex items-center gap-1.5 text-xs">
          <Clock size={12} className="text-amber-400" />
          <span className="text-white/50">Est. time:</span>
          <span className="font-bold text-amber-400">{estTime}</span>
        </div>
      )}
    </div>
  )
}
