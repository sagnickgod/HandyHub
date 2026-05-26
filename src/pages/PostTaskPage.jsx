import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Lock, Sparkles, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import CategoryChip from '../components/ui/CategoryChip'
import PointsDisplay from '../components/ui/PointsDisplay'

const CATEGORY_COLORS = {
  coding:   { from: '#7C6FF7', to: '#4F46E5' },
  study:    { from: '#38BDF8', to: '#0EA5E9' },
  tech:     { from: '#FBBF24', to: '#F59E0B' },
  physical: { from: '#FB923C', to: '#EF4444' },
  event:    { from: '#34D399', to: '#10B981' },
  creative: { from: '#F472B6', to: '#EC4899' },
  other:    { from: '#94A3B8', to: '#64748B' },
}

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

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'Low',    emoji: '⚪', color: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.3)',  text: '#34D399', minCoins: 100, suggest: '100-140' },
  { value: 'medium', label: 'Medium', emoji: '🟡', color: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',  text: '#F59E0B', minCoins: 170, suggest: '170-230' },
  { value: 'high',   label: 'Urgent', emoji: '🔴', color: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',   text: '#EF4444', minCoins: 250, suggest: '250-400+' },
]

function FormSection({ title, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {title}
      </label>
      {children}
    </div>
  )
}

export default function PostTaskPage() {
  const { profile, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [points, setPoints] = useState(170)
  const [urgency, setUrgency] = useState('medium')
  const [deadline, setDeadline] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const selectedUrgencyOpt = URGENCY_OPTIONS.find(u => u.value === urgency)
  const minPoints = selectedUrgencyOpt?.minCoins || 100
  const workerReward = Math.ceil(points * 0.7)
  const platformFee = points - workerReward

  const applyTemplate = (t) => { setTitle(t.title); setDescription(t.desc); setShowTemplates(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !category) { addToast('Fill in all required fields', 'warning'); return }
    if (points < minPoints) { addToast(`Minimum coins for ${selectedUrgencyOpt.label.toLowerCase()} urgency is ${minPoints}`, 'warning'); return }
    if (profile.points_balance < points) {
      addToast(`Insufficient balance. You have 🪙 ${profile.points_balance}`, 'error'); return
    }
    setLoading(true)

    const { data: task, error } = await supabase.from('tasks').insert({
      poster_id: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      points_offered: points,
      min_coins: minPoints,
      is_featured: points >= 300,
      is_premium: points >= 600,
      worker_reward: workerReward,
      platform_fee: platformFee,
      urgency,
      deadline: deadline || null,
      is_team_task: false,
      team_size: 1,
    }).select().single()

    if (error) { addToast(error.message, 'error'); setLoading(false); return }

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${task.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('task-attachments').upload(path, file)
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('task-attachments').getPublicUrl(path)
        await supabase.from('task_attachments').insert({ task_id: task.id, file_url: publicUrl, file_name: file.name, uploaded_by: profile.id })
      } else {
        addToast(`Failed to upload ${file.name}: ${uploadErr.message}`, 'error')
      }
    }

    await supabase.from('point_transactions').insert({ user_id: profile.id, type: 'escrow_lock', amount: -points, description: `Escrow for: ${title.trim()}`, task_id: task.id })
    await supabase.from('profiles').update({ points_balance: profile.points_balance - points, escrow_balance: (profile.escrow_balance || 0) + points }).eq('id', profile.id)

    const { data: matchingUsers } = await supabase.from('profiles').select('id').contains('skills', [category]).neq('id', profile.id).eq('is_suspended', false)
    if (matchingUsers) {
      const notifications = matchingUsers.map(u => ({ user_id: u.id, type: 'new_task', title: urgency === 'high' ? `🔥 URGENT: ${task.title}` : `New task: ${task.title}`, body: `${points} points · ${category}`, link: `/tasks/${task.id}` }))
      if (notifications.length > 0) await supabase.from('notifications').insert(notifications)
    }

    await refreshProfile()
    addToast('Task posted! Points locked in escrow.', 'success')
    navigate(`/tasks/${task.id}`)
    setLoading(false)
  }

  const cat = CATEGORY_COLORS[category]
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    padding: '13px 16px',
    transition: 'all 0.2s'
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05]"
          style={{ background: cat ? `radial-gradient(circle, ${cat.from}, transparent)` : 'radial-gradient(circle, #7C6FF7, transparent)' }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="mb-7">
            <h1 className="font-heading text-2xl font-black text-white">Post a Task</h1>
            <p className="text-white/30 text-sm mt-1">Describe what you need help with and set your reward.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Category */}
            <FormSection title="Category *">
              <div className="flex flex-wrap gap-2">
                {['coding', 'study', 'tech', 'physical', 'event', 'creative', 'other'].map(c => {
                  const isSelected = category === c
                  const cc = CATEGORY_COLORS[c]
                  return (
                    <motion.button
                      key={c}
                      type="button"
                      onClick={() => { setCategory(c); setShowTemplates(true) }}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                      className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all capitalize"
                      style={{
                        background: isSelected && cc ? `linear-gradient(135deg, ${cc.from}25, ${cc.to}15)` : 'rgba(255,255,255,0.04)',
                        border: isSelected && cc ? `1px solid ${cc.from}40` : '1px solid rgba(255,255,255,0.07)',
                        color: isSelected && cc ? cc.from : 'rgba(255,255,255,0.4)',
                        boxShadow: isSelected && cc ? `0 4px 16px ${cc.from}15` : 'none'
                      }}
                    >
                      {c}
                    </motion.button>
                  )
                })}
              </div>
            </FormSection>

            {/* Templates */}
            <AnimatePresence>
              {showTemplates && category && templates[category] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3 flex items-center gap-1.5">
                      <Sparkles size={10} className="text-amber-400" />Quick Templates
                    </p>
                    <div className="space-y-2">
                      {templates[category].map((t, i) => (
                        <motion.button
                          key={i} type="button" onClick={() => applyTemplate(t)}
                          whileHover={{ x: 4 }}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all group"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,247,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          <span className="text-white/75 text-sm font-semibold flex-1">{t.title}</span>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-violet-400 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Title */}
            <FormSection title={`Title * (${title.length}/80)`}>
              <input
                value={title}
                onChange={e => e.target.value.length <= 80 && setTitle(e.target.value)}
                placeholder="What do you need help with?"
                style={inputStyle}
                onFocus={e => { e.target.style.border = '1px solid rgba(124,111,247,0.4)'; e.target.style.boxShadow = '0 0 0 4px rgba(124,111,247,0.08)' }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
              />
            </FormSection>

            {/* Description */}
            <FormSection title={`Description (${description.length}/600)`}>
              <textarea
                value={description}
                onChange={e => e.target.value.length <= 600 && setDescription(e.target.value)}
                placeholder="Provide more details about what you need..."
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.target.style.border = '1px solid rgba(124,111,247,0.4)'; e.target.style.boxShadow = '0 0 0 4px rgba(124,111,247,0.08)' }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
              />
            </FormSection>

            {/* Urgency */}
            <FormSection title="Urgency">
              <div className="flex gap-2 mb-4">
                {URGENCY_OPTIONS.map(u => (
                  <motion.button
                    key={u.value} type="button" 
                    onClick={() => {
                      setUrgency(u.value)
                      if (points < u.minCoins) setPoints(u.minCoins)
                    }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm capitalize transition-all"
                    style={{
                      background: urgency === u.value ? u.color : 'rgba(255,255,255,0.04)',
                      border: urgency === u.value ? `1px solid ${u.border}` : '1px solid rgba(255,255,255,0.07)',
                      color: urgency === u.value ? u.text : 'rgba(255,255,255,0.35)',
                      boxShadow: urgency === u.value ? `0 4px 16px ${u.border}` : 'none'
                    }}
                  >
                    {u.emoji} {u.label}
                  </motion.button>
                ))}
              </div>
            </FormSection>

            {/* Points */}
            <FormSection title="Points Offered *">
              <input
                type="number" value={points} min={minPoints}
                onChange={e => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
                onFocus={e => { e.target.style.border = '1px solid rgba(124,111,247,0.4)'; e.target.style.boxShadow = '0 0 0 4px rgba(124,111,247,0.08)' }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
              />
              <div className="mt-2 pl-1 border-l-2 border-white/10 ml-2 space-y-1">
                <p className="text-xs font-semibold text-white/50">
                  Worker receives: <span className="text-white/90">{workerReward} coins (70%)</span>
                </p>
                <p className="text-xs text-white/40">
                  Platform fee: {platformFee} coins (30%)
                </p>
              </div>
              <div className="flex items-center justify-between mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex flex-col">
                  <span className="text-xs text-violet-400 font-semibold mb-0.5">🚀 Higher rewards attract faster completion</span>
                  <span className="text-[10px] text-white/40">Suggested for {selectedUrgencyOpt?.label}: {selectedUrgencyOpt?.suggest}</span>
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Wallet: <PointsDisplay amount={profile?.points_balance || 0} size="sm" />
                </div>
              </div>
            </FormSection>



            {/* Deadline */}
            <FormSection title="Deadline (optional)">
              <input
                type="datetime-local" value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => { e.target.style.border = '1px solid rgba(124,111,247,0.4)'; e.target.style.boxShadow = '0 0 0 4px rgba(124,111,247,0.08)' }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
              />
            </FormSection>

            {/* File Upload */}
            <FormSection title="Attachments (max 3)">
              <label
                className="flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer transition-all group"
                style={{ border: '1.5px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,111,247,0.4)'; e.currentTarget.style.background = 'rgba(124,111,247,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              >
                <Upload size={22} className="text-white/20 mb-2.5 group-hover:text-violet-400 transition-colors" />
                <span className="text-sm font-semibold text-white/30 group-hover:text-white/50 transition-colors">Click to upload</span>
                <span className="text-xs text-white/15 mt-1">Max 10MB per file</span>
                <input type="file" className="hidden" multiple onChange={e => setFiles(Array.from(e.target.files).slice(0, 3))} />
              </label>
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-1.5">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <FileText size={13} className="text-white/30" />
                        <span className="flex-1 text-white/50 truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                          <X size={13} className="text-white/25 hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </FormSection>

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)',
                boxShadow: loading ? 'none' : '0 8px 32px rgba(124,111,247,0.35)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
                  Posting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock size={16} />
                  Post Task & Lock Points
                </span>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
