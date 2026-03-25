import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import ReputationStars from '../ui/ReputationStars'

export default function SelectHelperModal({ isOpen, onClose, application, task, onSelected }) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const a = application?.applicant

  const handleConfirm = async () => {
    setLoading(true)

    // Update task
    await supabase.from('tasks').update({
      state: 'in_progress',
      selected_helper_id: application.applicant_id
    }).eq('id', task.id)

    // Update application status
    await supabase.from('applications').update({ status: 'selected' }).eq('id', application.id)

    // Reject other applications
    await supabase.from('applications').update({ status: 'rejected' })
      .eq('task_id', task.id)
      .neq('id', application.id)

    // Notify selected helper
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
            className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Confirm Selection</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>

            <div className="glass-card p-4 mb-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-2">
                {a?.full_name?.[0]}
              </div>
              <p className="font-semibold text-text">{a?.full_name}</p>
              <ReputationStars score={a?.reputation_score} />
              <p className="text-xs text-text-muted mt-1">{Number(a?.completion_rate || 0).toFixed(0)}% completion rate</p>
            </div>

            <p className="text-sm text-text-muted text-center mb-4">
              Select <strong className="text-text">{a?.full_name}</strong> as the helper? Other applicants will be rejected.
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-surface-2 text-text py-2.5 rounded-xl font-medium btn-press">Cancel</button>
              <button onClick={handleConfirm} disabled={loading} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold btn-press disabled:opacity-50">
                {loading ? 'Selecting...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
