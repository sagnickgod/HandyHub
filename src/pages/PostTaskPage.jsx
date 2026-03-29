import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, FileText, X, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import CategoryChip from '../components/ui/CategoryChip'
import PointsDisplay from '../components/ui/PointsDisplay'

const templates = {
  coding: [
    { title: 'Debug My Code', desc: 'I have a bug in my code that I need help fixing. The language is [X] and the issue is [Y].' },
    { title: 'Assignment Help', desc: 'Need help understanding and completing a programming assignment for [course]. Due by [date].' },
    { title: 'Project Collaboration', desc: 'Looking for someone to collaborate on a [type] project using [tech stack].' },
  ],
  study: [
    { title: 'Notes Summary', desc: 'Need someone to explain/summarize notes for [subject] before the upcoming exam.' },
    { title: 'Study Partner', desc: 'Looking for a study partner for [subject]. We can meet at the library.' },
    { title: 'Tutoring Session', desc: 'Need a tutor for [subject]. I struggle with [topic] and need 1-on-1 help.' },
  ],
  tech: [
    { title: 'Fix My Laptop', desc: 'Having issues with my laptop: [describe problem]. Need someone tech-savvy to help.' },
    { title: 'Software Install', desc: 'Need help installing and setting up [software] on my [OS] computer.' },
    { title: 'Network Setup', desc: 'Need help setting up [WiFi/Printer/etc] in my dorm room.' },
  ],
  physical: [
    { title: 'Carry My Luggage', desc: 'Moving between hostels and need help carrying boxes/luggage from [A] to [B].' },
    { title: 'Pick Up Delivery', desc: 'Need someone to pick up a package from [location] and deliver to [location].' },
    { title: 'Room Setup', desc: 'Need help moving furniture and setting up my room in [hostel/building].' },
  ],
  event: [
    { title: 'Event Setup Help', desc: 'Need volunteers to help set up for [event name] at [venue] on [date].' },
    { title: 'Poster Distribution', desc: 'Need someone to distribute event posters across campus buildings.' },
    { title: 'Registration Desk', desc: 'Need someone to manage the registration desk at [event] from [time] to [time].' },
  ],
  creative: [
    { title: 'Design a Poster', desc: 'Need a creative poster designed for [event/club]. Theme: [X]. Size: [A3/A4/Digital].' },
    { title: 'Video Editing', desc: 'Have raw footage from [event] that needs editing. Duration: ~[X] minutes.' },
    { title: 'Logo Design', desc: 'Need a logo designed for [club/project]. Style: [modern/minimal/fun].' },
  ],
}

export default function PostTaskPage() {
  const { profile, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [points, setPoints] = useState(100)
  const [urgency, setUrgency] = useState('medium')
  const [deadline, setDeadline] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const applyTemplate = (t) => {
    setTitle(t.title)
    setDescription(t.desc)
    setShowTemplates(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !category) { addToast('Fill in all required fields', 'warning'); return }
    if (points < 50) { addToast('Minimum 50 points', 'warning'); return }
    if (profile.points_balance < points) {
      addToast(`Insufficient balance. You have 🪙 ${profile.points_balance}`, 'error')
      return
    }

    setLoading(true)

    // Insert task (hardcoded is_team_task to false to prevent logic bugs)
    const { data: task, error } = await supabase.from('tasks').insert({
      poster_id: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      points_offered: points,
      urgency,
      deadline: deadline || null,
      is_team_task: false,
      team_size: 1,
    }).select().single()

    if (error) { addToast(error.message, 'error'); setLoading(false); return }

    // Upload attachments
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${task.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('task-attachments').upload(path, file)
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('task-attachments').getPublicUrl(path)
        await supabase.from('task_attachments').insert({
          task_id: task.id,
          file_url: publicUrl,
          file_name: file.name,
          uploaded_by: profile.id
        })
      } else {
        // Added error toast for silent upload failures
        addToast(`Failed to upload ${file.name}`, 'error')
      }
    }

    // Lock escrow
    await supabase.from('point_transactions').insert({
      user_id: profile.id,
      type: 'escrow_lock',
      amount: -points,
      description: `Escrow for: ${title.trim()}`,
      task_id: task.id
    })

    await supabase.from('profiles').update({
      points_balance: profile.points_balance - points,
      escrow_balance: (profile.escrow_balance || 0) + points
    }).eq('id', profile.id)

    // Notify matching users
    const { data: matchingUsers } = await supabase
      .from('profiles')
      .select('id')
      .contains('skills', [category])
      .neq('id', profile.id)
      .eq('is_suspended', false)

    if (matchingUsers) {
      const notifications = matchingUsers.map(u => ({
        user_id: u.id,
        type: 'new_task',
        title: urgency === 'high' ? `🔥 URGENT: ${task.title}` : `New task: ${task.title}`,
        body: `${points} points · ${category}`,
        link: `/tasks/${task.id}`
      }))
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
    }

    await refreshProfile()
    addToast('Task posted! Points locked in escrow.', 'success')
    navigate(`/tasks/${task.id}`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-heading text-2xl font-bold mb-6">Post a Task</h1>

        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-3">Category *</label>
            <div className="flex flex-wrap gap-2">
              {['coding','study','tech','physical','event','creative','other'].map(c => (
                <CategoryChip key={c} category={c} size="md" selected={category === c} onClick={() => { setCategory(c); setShowTemplates(true) }} />
              ))}
            </div>
          </div>

          {/* Templates */}
          {showTemplates && category && templates[category] && (
            <div className="glass-card p-4">
              <p className="text-sm font-medium text-text-muted mb-3">Quick templates:</p>
              <div className="space-y-2">
                {templates[category].map((t, i) => (
                  <button key={i} type="button" onClick={() => applyTemplate(t)} className="w-full text-left bg-surface-2 hover:bg-primary/10 p-3 rounded-lg transition-colors text-sm">
                    <span className="font-medium text-text">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Title * <span className="text-text-muted/60">({title.length}/80)</span></label>
            <input value={title} onChange={e => e.target.value.length <= 80 && setTitle(e.target.value)} placeholder="What do you need help with?" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Description <span className="text-text-muted/60">({description.length}/600)</span></label>
            <textarea value={description} onChange={e => e.target.value.length <= 600 && setDescription(e.target.value)} placeholder="Provide more details..." rows={4} className="resize-none" />
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Points Offered *</label>
            <input type="number" value={points} onChange={e => setPoints(Math.max(0, parseInt(e.target.value) || 0))} min={50} />
            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
              <Lock size={12} />
              <span>These points will be locked in escrow until the task is complete</span>
            </div>
            <p className="text-xs text-text-muted mt-1">Your balance: <PointsDisplay amount={profile?.points_balance || 0} size="sm" /></p>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Urgency</label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map(u => (
                <button key={u} type="button" onClick={() => setUrgency(u)}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm capitalize transition-all btn-press
                    ${urgency === u
                      ? u === 'high' ? 'bg-danger text-white' : u === 'medium' ? 'bg-accent text-black' : 'bg-surface-2 text-text ring-2 ring-border'
                      : 'bg-surface-2 text-text-muted'}`}
                >
                  {u === 'high' ? '🔴 ' : u === 'medium' ? '🟡 ' : '⚪ '}{u}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Deadline (optional)</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Attachments (max 3)</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
              <Upload size={24} className="text-text-muted mb-2" />
              <span className="text-sm text-text-muted">Click to upload (max 10MB each)</span>
              <input type="file" className="hidden" multiple onChange={e => setFiles(Array.from(e.target.files).slice(0, 3))} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-text-muted">
                    <FileText size={14} /> {f.name}
                    <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-primary-hover transition-colors btn-press disabled:opacity-50">
            {loading ? 'Posting...' : 'Post Task & Lock Points'}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
