import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function SubmitProofModal({ isOpen, onClose, task, onSubmitted }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({}) // { fileName: 'uploading' | 'done' | 'error' }
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3)
    // Validate file sizes
    const valid = []
    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        addToast(`"${file.name}" exceeds 10MB limit`, 'warning')
      } else {
        valid.push(file)
      }
    }
    setFiles(valid)
    setUploadProgress({})
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (summary.length < 50) { addToast('Summary must be at least 50 characters', 'warning'); return }
    setLoading(true)

    let fileUrls = []
    if (files.length > 0) {
      for (const file of files) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }))
        try {
          const ext = file.name.split('.').pop()
          const path = `${task.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: uploadError } = await supabase.storage.from('task-proofs').upload(path, file)

          if (uploadError) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }))
            addToast(`Failed to upload "${file.name}": ${uploadError.message}`, 'error')
            continue
          }

          const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(path)
          fileUrls.push(publicUrl)
          setUploadProgress(prev => ({ ...prev, [file.name]: 'done' }))
        } catch (err) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }))
          addToast(`Upload error: ${err.message}`, 'error')
        }
      }
    }

    try {
      const { error } = await supabase.from('proofs').insert({
        task_id: task.id,
        helper_id: user.id,
        text_summary: summary.trim(),
        file_urls: fileUrls
      })

      if (error) throw error

      await supabase.from('tasks').update({ state: 'pending_review' }).eq('id', task.id)
      await supabase.from('notifications').insert({
        user_id: task.poster_id,
        type: 'proof_submitted',
        title: `Proof submitted for "${task.title}"`,
        body: 'Review the proof and approve or reject.',
        link: `/tasks/${task.id}`
      })
      addToast('Proof submitted successfully!', 'success')
      onSubmitted?.()
      onClose()
      setSummary('')
      setFiles([])
      setUploadProgress({})
    } catch (err) {
      addToast(`Failed to submit proof: ${err.message}`, 'error')
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
                <label className="block text-sm font-medium text-text-muted mb-2">Attachments (optional, max 3)</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
                  <Upload size={24} className="text-text-muted mb-2" />
                  <span className="text-sm text-text-muted">Click to upload (max 10MB each)</span>
                  <input type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*,.pdf,.zip,.doc,.docx" />
                </label>

                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => {
                      const status = uploadProgress[f.name]
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {status === 'uploading' ? (
                            <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                          ) : status === 'done' ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : status === 'error' ? (
                            <AlertCircle size={14} className="text-red-400" />
                          ) : (
                            <FileText size={14} className="text-text-muted" />
                          )}
                          <span className="flex-1 text-text-muted truncate">{f.name}</span>
                          <span className="text-[10px] text-white/30">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                          {!loading && (
                            <button type="button" onClick={() => removeFile(i)} className="text-white/30 hover:text-red-400 transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors btn-press disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Proof'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
