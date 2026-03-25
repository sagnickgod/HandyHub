import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

export default function RatingModal({ isOpen, onClose, task, rateeId, onRated }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (score === 0) { addToast('Please select a rating', 'warning'); return }
    setLoading(true)

    const { error } = await supabase.from('ratings').insert({
      task_id: task.id,
      rater_id: user.id,
      ratee_id: rateeId,
      score,
      comment: comment.trim() || null
    })

    if (!error) {
      // Recalculate reputation
      const { data: ratings } = await supabase
        .from('ratings')
        .select('score')
        .eq('ratee_id', rateeId)

      if (ratings) {
        const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length
        await supabase.from('profiles').update({ reputation_score: avg.toFixed(2) }).eq('id', rateeId)
      }

      addToast('Rating submitted!', 'success')
      onRated?.()
      onClose()
    } else {
      addToast(error.message.includes('duplicate') ? 'You already rated this task' : error.message, 'error')
    }
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
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 text-center"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text"><X size={20} /></button>

            <h3 className="font-heading text-lg font-bold mb-2">Rate Your Experience</h3>
            <p className="text-sm text-text-muted mb-6">How was working on this task?</p>

            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setScore(s)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={`${(hover || score) >= s ? 'text-accent fill-accent' : 'text-text-muted/30'} transition-colors`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Optional comment..."
              rows={2}
              className="mb-4 resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover btn-press disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
