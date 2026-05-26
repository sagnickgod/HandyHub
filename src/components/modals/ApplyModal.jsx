import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import ReputationStars from '../ui/ReputationStars'

function TimePickerField({ hours, minutes, onChangeHours, onChangeMinutes }) {
  const selectStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center',
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">
        <Clock size={13} className="inline mr-1.5 align-[-2px]" />
        Estimated Time
      </label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <select value={hours} onChange={e => onChangeHours(e.target.value)} style={selectStyle}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, '0')} style={{ background: '#1a1a24' }}>
                {String(i).padStart(2, '0')}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-white/30 text-center mt-1">Hours</p>
        </div>
        <span className="text-white/40 font-bold text-lg pb-4">:</span>
        <div className="flex-1">
          <select value={minutes} onChange={e => onChangeMinutes(e.target.value)} style={selectStyle}>
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
              <option key={m} value={String(m).padStart(2, '0')} style={{ background: '#1a1a24' }}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-white/30 text-center mt-1">Minutes</p>
        </div>
      </div>
    </div>
  )
}

export default function ApplyModal({ isOpen, onClose, task, onApplied }) {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const [pitch, setPitch] = useState('')
  const [hours, setHours] = useState('01')
  const [minutes, setMinutes] = useState('00')
  const [loading, setLoading] = useState(false)

  const formatTime = () => `${hours}:${minutes}:00`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pitch.trim()) { addToast('Please add a pitch', 'warning'); return }
    if (hours === '00' && minutes === '00') { addToast('Please set an estimated time', 'warning'); return }
    setLoading(true)

    const { error } = await supabase.from('applications').insert({
      task_id: task.id,
      applicant_id: profile.id,
      pitch: pitch.trim(),
      estimated_time: formatTime()
    })

    if (error) {
      addToast(error.message.includes('duplicate') ? 'You already applied' : error.message, 'error')
    } else {
      await supabase.from('notifications').insert({
        user_id: task.poster_id,
        type: 'application',
        title: `New application on "${task.title}"`,
        body: `${profile.full_name} applied for your task`,
        link: `/tasks/${task.id}`
      })
      addToast('Application submitted!', 'success')
      onApplied?.()
      onClose()
      setPitch('')
      setHours('01')
      setMinutes('00')
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onClick={e => e.stopPropagation()}
            className="w-full lg:max-w-md bg-surface border border-border rounded-t-2xl lg:rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold">Apply for Task</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>

            {/* Context */}
            <div className="glass-card p-3 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {profile?.full_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{profile?.full_name}</p>
                <ReputationStars score={profile?.reputation_score} size="sm" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Your Pitch <span className="text-text-muted/60">({pitch.length}/200)</span>
                </label>
                <textarea
                  value={pitch}
                  onChange={e => e.target.value.length <= 200 && setPitch(e.target.value)}
                  placeholder="Why should you be selected?"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <TimePickerField
                hours={hours}
                minutes={minutes}
                onChangeHours={setHours}
                onChangeMinutes={setMinutes}
              />

              <p className="text-xs text-white/30 -mt-2">
                Estimated: <strong className="text-white/60">{parseInt(hours)}h {parseInt(minutes)}m</strong>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors btn-press disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
