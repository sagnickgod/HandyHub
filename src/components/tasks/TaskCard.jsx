import { useNavigate } from 'react-router-dom'
import CategoryChip from '../ui/CategoryChip'
import UrgencyBadge from '../ui/UrgencyBadge'
import PointsDisplay from '../ui/PointsDisplay'
import { formatDistanceToNow } from 'date-fns'
import { Calendar, User } from 'lucide-react'

export default function TaskCard({ task, currentUserId, applied }) {
  const navigate = useNavigate()
  const isOwner = task.poster_id === currentUserId

  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
  const deadlineStr = task.deadline
    ? formatDistanceToNow(new Date(task.deadline), { addSuffix: true })
    : null

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="glass-card card-hover p-5 cursor-pointer group relative"
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <CategoryChip category={task.category} />
        <UrgencyBadge urgency={task.urgency} />
      </div>

      {/* Title */}
      <h3 className="font-heading text-base font-semibold text-text line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-muted line-clamp-3 mb-4">
        {task.description || 'No description provided'}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <PointsDisplay amount={task.points_offered} size="sm" />

        <div className="flex items-center gap-3 text-xs text-text-muted">
          {deadlineStr && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {deadlineStr}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User size={12} />
            {task.poster?.full_name || 'Anonymous'}
          </span>
        </div>
      </div>

      {/* Status chips */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {isOwner && (
          <span className="bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
            Your Task
          </span>
        )}
        {applied && (
          <span className="bg-accent-2/15 text-accent-2 text-xs font-semibold px-2 py-0.5 rounded-full">
            Applied ✓
          </span>
        )}
      </div>

      {/* Team task indicator */}
      {task.is_team_task && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-text-muted">👥 Team task · {task.team_size} helpers needed</span>
        </div>
      )}
    </div>
  )
}
