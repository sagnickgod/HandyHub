import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Star, TrendingUp, CheckCircle2, Zap, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
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

export default function SelectHelperModal({ isOpen, onClose, application, task, onSelected }) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const a = application?.applicant

  const handleConfirm = async () => {
    setLoading(true)

    await supabase.from('tasks').update({
      state: 'in_progress',
      selected_helper_id: application.applicant_id
    }).eq('id', task.id)

    await supabase.from('applications').update({ status: 'selected' }).eq('id', application.id)

    await supabase.from('applications').update({ status: 'rejected' })
      .eq('task_id', task.id)
      .neq('id', application.id)

    await supabase.from('notifications').insert({
      user_id: application.applicant_id,
      type: 'selected',
      title: `You've been selected for "${task.title}"!`,
      body: 'Start working on the task and submit proof when done.',
      link: `/tasks/${task.id}`
    })

    addToast('Helper selected!', 'success')
    onSelected?.()
    onClose()
    setLoading(false)
  }

  const estTime = formatEstTime(application?.estimated_time)
  const rating = Number(a?.reputation_score || 0)
  const completionRate = Number(a?.completion_rate || 0)
  const tasksHelped = a?.total_tasks_helped || 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Confirm Selection</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>

            {/* Applicant Info */}
            <div className="p-4 rounded-2xl mb-4 text-center"
              style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.15)' }}>
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-2">
                {a?.avatar_url
                  ? <img src={a.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                  : a?.full_name?.[0]
                }
              </div>
              <p className="font-semibold text-text">{a?.full_name}</p>
              <p className="text-xs text-text-muted">@{a?.username}</p>
              <div className="mt-1">
                <ReputationStars score={a?.reputation_score} />
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex flex-col items-center p-3 rounded-xl"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
                <Star size={14} className="text-amber-400 mb-1" />
                <span className="text-sm font-black text-amber-400">{rating.toFixed(1)}</span>
                <span className="text-[9px] text-white/30 font-bold uppercase">Rating</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}>
                <CheckCircle2 size={14} className="text-emerald-400 mb-1" />
                <span className="text-sm font-black text-emerald-400">{completionRate.toFixed(0)}%</span>
                <span className="text-[9px] text-white/30 font-bold uppercase">Completion</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl"
                style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.12)' }}>
                <TrendingUp size={14} className="text-violet-400 mb-1" />
                <span className="text-sm font-black text-violet-400">{tasksHelped}</span>
                <span className="text-[9px] text-white/30 font-bold uppercase">Tasks Done</span>
              </div>
            </div>

            {/* Pitch & Time Display */}
            {(application?.pitch || estTime) && (
              <div className="p-4 rounded-2xl mb-4 space-y-3"
                style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}>
                {application?.pitch && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-1">Their Pitch</p>
                    <p className="text-sm text-white/60 leading-relaxed">{application.pitch}</p>
                  </div>
                )}
                {estTime && (
                  <div className="flex items-center gap-1.5 text-xs pt-2 border-t border-white/5">
                    <Clock size={12} className="text-amber-400" />
                    <span className="text-white/50">Estimated time:</span>
                    <span className="font-bold text-amber-400">{estTime}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-text-muted text-center mb-4">
              Select <strong className="text-text">{a?.full_name}</strong> as the helper? Other applicants will be rejected.
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-medium btn-press"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-semibold btn-press disabled:opacity-50 text-white"
                style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
                {loading ? 'Selecting...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
