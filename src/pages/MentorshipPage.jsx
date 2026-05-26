import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Plus, X, Clock, Lock, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { LevelBadge, getLevelInfo } from '../lib/levels'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const TOPICS = ['All', 'DSA', 'Placement Prep', 'Resume Review', 'Interview Practice', 'Projects', 'Soft Skills', 'Other']

export default function MentorshipPage() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [topicFilter, setTopicFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [showBook, setShowBook] = useState(null)
  const [bookMsg, setBookMsg] = useState('')
  const [form, setForm] = useState({ topic: 'DSA', description: '', available_times: '', max_students: 3 })
  const [posting, setPosting] = useState(false)

  const userLevel = getLevelInfo(profile?.points_earned || 0).level

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('mentorship_slots')
      .select('*, mentor:profiles!mentor_id(id, full_name, avatar_url, level, course, year), bookings:mentorship_bookings(id, mentee_id, status)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const { data } = await query
    let filtered = data || []
    if (topicFilter !== 'All') filtered = filtered.filter(s => s.topic === topicFilter)
    setSlots(filtered)
    setLoading(false)
  }, [topicFilter])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const handleCreateSlot = async () => {
    if (!form.topic.trim() || !form.available_times.trim()) return addToast('Topic and available times required', 'error')
    setPosting(true)
    const { error } = await supabase.from('mentorship_slots').insert({
      mentor_id: user.id, topic: form.topic.trim(), description: form.description.trim(),
      available_times: form.available_times.trim(), max_students: form.max_students,
    })
    if (error) addToast(error.message, 'error')
    else { addToast('Mentor slot created! 🎓', 'success'); setShowCreate(false); fetchSlots() }
    setPosting(false)
  }

  const handleBook = async (slotId) => {
    setPosting(true)
    const { error } = await supabase.from('mentorship_bookings').insert({ slot_id: slotId, mentee_id: user.id, message: bookMsg.trim() })
    if (error) addToast(error.message, 'error')
    else { addToast('Session booked! Mentor will confirm soon.', 'success'); setShowBook(null); setBookMsg(''); fetchSlots() }
    setPosting(false)
  }

  const handleBookingAction = async (bookingId, status) => {
    await supabase.from('mentorship_bookings').update({ status }).eq('id', bookingId)
    addToast(`Booking ${status}!`, 'success')
    fetchSlots()
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-30"
          style={{ background: 'linear-gradient(180deg, rgba(168,85,247,0.08), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-black text-white flex items-center gap-2">🎓 Mentors</h1>
            <p className="text-white/40 text-sm mt-1">Book free sessions with senior students</p>
          </div>
          {userLevel >= 4 ? (
            <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 4px 16px rgba(168,85,247,0.3)' }}>
              <Plus size={16} /> Offer Mentoring
            </motion.button>
          ) : (
            <div className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
              <Lock size={12} /> Unlock at Level 4
            </div>
          )}
        </motion.div>

        {/* Topic Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {TOPICS.map(t => (
            <button key={t} onClick={() => setTopicFilter(t)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
              style={{
                background: topicFilter === t ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${topicFilter === t ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: topicFilter === t ? '#A855F7' : 'rgba(255,255,255,0.4)',
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Slots */}
        {loading ? <LoadingSpinner text="Loading mentors..." /> : slots.length === 0 ? (
          <EmptyState title="No mentor slots yet" description={userLevel >= 4 ? 'Be the first to offer mentorship!' : 'Check back soon!'} />
        ) : (
          <div className="space-y-3">
            {slots.map((s, i) => {
              const confirmedCount = s.bookings?.filter(b => b.status === 'confirmed' || b.status === 'done').length || 0
              const hasBooked = s.bookings?.some(b => b.mentee_id === user?.id)
              const isMentor = s.mentor_id === user?.id
              const pendingBookings = isMentor ? s.bookings?.filter(b => b.status === 'pending') : []
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white/60 flex-shrink-0"
                      style={{ background: 'rgba(168,85,247,0.15)' }}>
                      {s.mentor?.avatar_url ? <img src={s.mentor.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : s.mentor?.full_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white/80 font-bold text-sm">{s.mentor?.full_name}</span>
                        {s.mentor?.level > 1 && <LevelBadge level={s.mentor.level} size="xs" />}
                      </div>
                      <p className="text-white/30 text-[10px]">{s.mentor?.course} {s.mentor?.year ? `• Y${s.mentor.year}` : ''}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex-shrink-0"
                      style={{ background: 'rgba(168,85,247,0.1)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.2)' }}>
                      {s.topic}
                    </span>
                  </div>
                  {s.description && <p className="text-white/40 text-xs leading-relaxed mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span className="flex items-center gap-1"><Clock size={10} />{s.available_times}</span>
                      <span>{confirmedCount}/{s.max_students} booked</span>
                    </div>
                    {isMentor ? (
                      pendingBookings?.length > 0 && (
                        <div className="flex gap-1">
                          {pendingBookings.map(b => (
                            <div key={b.id} className="flex gap-1">
                              <button onClick={() => handleBookingAction(b.id, 'confirmed')} className="p-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)' }}>
                                <CheckCircle size={14} className="text-emerald-400" />
                              </button>
                              <button onClick={() => handleBookingAction(b.id, 'cancelled')} className="p-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                                <XCircle size={14} className="text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    ) : hasBooked ? (
                      <span className="text-[10px] text-emerald-400 font-bold">✓ Booked</span>
                    ) : confirmedCount < s.max_students ? (
                      <motion.button onClick={() => setShowBook(s.id)} whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold"
                        style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}>
                        Book Session
                      </motion.button>
                    ) : (
                      <span className="text-[10px] text-white/20">Full</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Book Session Modal */}
      <AnimatePresence>
        {showBook && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBook(null)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-md rounded-3xl p-6 z-10"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-4">📝 Book a Session</h2>
              <textarea value={bookMsg} onChange={e => setBookMsg(e.target.value)} rows={3}
                placeholder="What do you need help with?" style={{ ...inputStyle, resize: 'none' }} />
              <motion.button onClick={() => handleBook(showBook)} disabled={posting} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white mt-4"
                style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                {posting ? 'Booking...' : 'Submit Request'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Slot Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-lg rounded-3xl p-6 z-10"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">🎓 Offer Mentoring</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Topic</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.filter(t => t !== 'All').map(t => (
                      <button key={t} onClick={() => setForm(p => ({ ...p, topic: t }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: form.topic === t ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${form.topic === t ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                          color: form.topic === t ? '#A855F7' : 'rgba(255,255,255,0.3)',
                        }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What will you cover?" style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Available Times</label>
                  <input value={form.available_times} onChange={e => setForm(p => ({ ...p, available_times: e.target.value }))} placeholder="e.g. Saturdays 3-5 PM" style={inputStyle} />
                </div>
                <motion.button onClick={handleCreateSlot} disabled={posting} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                  {posting ? 'Creating...' : 'Create Mentor Slot 🎓'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
