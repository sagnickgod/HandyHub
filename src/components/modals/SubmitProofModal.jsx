import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

export default function SubmitProofModal({ isOpen, onClose, task, onSubmitted }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3)
    setFiles(selected)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (summary.length < 50) { addToast('Summary must be at least 50 characters', 'warning'); return }
    setLoading(true)

    let fileUrls = []
    if (files.length > 0) {
      setUploading(true)
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${task.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('task-proofs').upload(path, file)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(path)
          fileUrls.push(publicUrl)
        }
      }
      setUploading(false)
    }

    const { error } = await supabase.from('proofs').insert({
      task_id: task.id,
      helper_id: user.id,
      text_summary: summary.trim(),
      file_urls: fileUrls
    })

    if (!error) {
      await supabase.from('tasks').update({ state: 'pending_review' }).eq('id', task.id)
      await supabase.from('notifications').insert({
        user_id: task.poster_id,
        type: 'proof_submitted',
        title: `Proof submitted for "${task.title}"`,
        body: 'Review the proof and approve or reject.',
        link: `/tasks/${task.id}`
      })
      addToast('Proof submitted!', 'success')
      onSubmitted?.()
      onClose()
    } else {
      addToast(error.message, 'error')
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            onClick={e => e.stopPropagation()}
            className="w-full lg:max-w-md bg-surface border border-border rounded-t-2xl lg:rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold">Submit Proof</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Summary <span className="text-text-muted/60">({summary.length}/500, min 50)</span>
                </label>
                <textarea
                  value={summary}
                  onChange={e => e.target.value.length <= 500 && setSummary(e.target.value)}
                  placeholder="Describe what you did..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Attachments (optional)</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
                  <Upload size={24} className="text-text-muted mb-2" />
                  <span className="text-sm text-text-muted">Click to upload (max 3 files, 10MB each)</span>
                  <input type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*,.pdf" />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-text-muted">
                        <FileText size={14} /> {f.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors btn-press disabled:opacity-50"
              >
                {uploading ? 'Uploading files...' : loading ? 'Submitting...' : 'Submit Proof'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
