import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import CategoryChip from '../ui/CategoryChip'
import UrgencyBadge from '../ui/UrgencyBadge'
import PointsDisplay from '../ui/PointsDisplay'
import { formatDistanceToNow } from 'date-fns'
import { Calendar, User, Star, Sparkles } from 'lucide-react'

export default function TaskCard({ task, currentUserId, applied }) {
  const navigate = useNavigate()
  const isOwner = task.poster_id === currentUserId

  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
  const deadlineStr = task.deadline
    ? formatDistanceToNow(new Date(task.deadline), { addSuffix: true })
    : null

  let glowStyle = {}
  let baseClasses = "p-5 cursor-pointer group relative transition-all rounded-3xl"
  
  // Urgency Glows
  if (task.urgency === 'low') glowStyle = { boxShadow: '0 0 20px rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', background: 'rgba(255,255,255,0.02)' }
  else if (task.urgency === 'medium') glowStyle = { boxShadow: '0 0 20px rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(255,255,255,0.02)' }
  else if (task.urgency === 'high') glowStyle = { boxShadow: '0 0 25px rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(255,255,255,0.02)' }
  else glowStyle = { border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }

  // Overrides for premium/featured
  if (task.is_premium) {
    glowStyle = {
      background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(25,15,35,0.8))',
      boxShadow: '0 8px 32px rgba(168,85,247,0.2), 0 0 20px rgba(234,179,8,0.15)',
      border: '1px solid rgba(168,85,247,0.4)',
      backdropFilter: 'blur(20px)'
    }
  } else if (task.is_featured) {
    glowStyle = {
      ...glowStyle,
      borderColor: 'rgba(234,179,8,0.4)',
      boxShadow: '0 4px 20px rgba(234,179,8,0.1)',
      background: 'rgba(255,255,255,0.03)'
    }
  }

  const floatAnim = task.is_premium ? { y: [0, -4, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } : {}

  return (
    <motion.div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={baseClasses}
      style={glowStyle}
      whileHover={{ scale: 1.03, y: -2, zIndex: 10 }}
      animate={floatAnim}
      onMouseEnter={e => {
        if (task.urgency === 'high' && !task.is_premium && !task.is_featured) e.currentTarget.style.boxShadow = '0 0 40px rgba(239,68,68,0.3)'
        else if (task.is_premium) e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.4), 0 0 30px rgba(234,179,8,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = glowStyle.boxShadow
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <CategoryChip category={task.category} />
        <UrgencyBadge urgency={task.urgency} />
      </div>

      {/* Title */}
      <h3 className="font-heading text-lg font-black text-white line-clamp-2 mb-2 group-hover:text-violet-400 transition-colors relative z-10">
        {task.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-muted line-clamp-3 mb-4">
        {task.description || 'No description provided'}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-auto pt-2 relative z-10">
        <PointsDisplay amount={task.points_offered} size="md" animated={true} />

        <div className="flex items-center gap-3 text-xs text-white/40 font-semibold">
          {deadlineStr && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {deadlineStr}
            </span>
          )}
          <span className="flex items-center gap-1 text-white/60">
            <User size={12} />
            {task.poster?.username || task.poster?.full_name || 'Anonymous'}
          </span>
        </div>
      </div>

      {/* Badges Overlay */}
      <div className="absolute -top-3 -right-2 flex gap-1.5 z-20">
        {task.is_premium && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-violet-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg"
          >
            <Sparkles size={10} /> Premium
          </motion.div>
        )}
        {task.is_featured && !task.is_premium && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 bg-amber-400 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg"
          >
            <Star size={10} fill="currentColor" /> Featured
          </motion.div>
        )}
        {isOwner && (
          <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md">
            Your Task
          </span>
        )}
        {applied && (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md">
            Applied ✓
          </span>
        )}
      </div>

      {/* Team task indicator */}
      {task.is_team_task && (
        <div className="mt-4 pt-3 border-t border-white/5 relative z-10">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">👥 Team task · {task.team_size} helpers needed</span>
        </div>
      )}
    </motion.div>
  )
}
