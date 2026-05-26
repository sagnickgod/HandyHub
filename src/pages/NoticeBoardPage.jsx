import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, X, Eye, Clock, Package, Gift, Calendar, AlertTriangle, Briefcase } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Megaphone, color: '#7C6FF7' },
  { key: 'lost_found', label: 'Lost & Found', icon: Package, color: '#F59E0B' },
  { key: 'free_item', label: 'Free Item', icon: Gift, color: '#34D399' },
  { key: 'event', label: 'Event', icon: Calendar, color: '#38BDF8' },
  { key: 'alert', label: 'Alert', icon: AlertTriangle, color: '#EF4444' },
  { key: 'opportunity', label: 'Opportunity', icon: Briefcase, color: '#A855F7' },
]

function getTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

export default function NoticeBoardPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'event' })
  const [posting, setPosting] = useState(false)

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('notices')
      .select('*, poster:profiles!poster_id(id, full_name, avatar_url)')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('category', filter)

    const { data } = await query
    setNotices(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return addToast('Fill in all fields', 'error')
    setPosting(true)
    const { error } = await supabase.from('notices').insert({
      poster_id: user.id,
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
    })
    if (error) { addToast(error.message, 'error') }
    else { addToast('Notice posted! 📢', 'success'); setShowCreate(false); setForm({ title: '', body: '', category: 'event' }); fetchNotices() }
    setPosting(false)
  }

  const incrementViews = async (id) => {
    await supabase.rpc('increment_notice_views', { notice_id: id }).catch(() => {
      // Fallback: direct update
      supabase.from('notices').update({ views: supabase.sql`views + 1` }).eq('id', id).then(() => {})
    })
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-30"
          style={{ background: 'linear-gradient(180deg, rgba(124,111,247,0.08), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-black text-white flex items-center gap-2">📢 Notice Board</h1>
            <p className="text-white/40 text-sm mt-1">Campus updates that matter — auto-expires in 48h</p>
          </div>
          <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
            <Plus size={16} /> Post Notice
          </motion.button>
        </motion.div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
              style={{
                background: filter === c.key ? `${c.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filter === c.key ? `${c.color}40` : 'rgba(255,255,255,0.06)'}`,
                color: filter === c.key ? c.color : 'rgba(255,255,255,0.4)',
              }}>
              <c.icon size={13} /> {c.label}
            </button>
          ))}
        </div>

        {/* Notices Grid */}
        {loading ? <LoadingSpinner text="Loading notices..." /> : notices.length === 0 ? (
          <EmptyState title="No notices yet" description="Be the first to post a campus update!" />
        ) : (
          <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {notices.map((n, i) => {
              const cat = CATEGORIES.find(c => c.key === n.category) || CATEGORIES[0]
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => incrementViews(n.id)}
                  className="p-5 rounded-2xl cursor-pointer group transition-all"
                  style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}
                  whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                        style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}25` }}>
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-white/25 flex items-center gap-1">
                        <Clock size={10} /> {getTimeLeft(n.expires_at)}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/20 flex items-center gap-1"><Eye size={10} />{n.views}</span>
                  </div>
                  <h3 className="text-white/85 font-bold text-sm mb-1.5 group-hover:text-white transition-colors">{n.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-3">{n.body}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white/60"
                      style={{ background: 'rgba(124,111,247,0.2)' }}>
                      {n.poster?.avatar_url
                        ? <img src={n.poster.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        : n.poster?.full_name?.[0] || '?'}
                    </div>
                    <span className="text-[10px] text-white/30">{n.poster?.full_name}</span>
                    <span className="text-[10px] text-white/15 ml-auto">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Create Notice Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-lg rounded-3xl p-6 z-10"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">📢 Post a Notice</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Title</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    maxLength={100} placeholder="e.g. Lost my blue hoodie near canteen"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Details</label>
                  <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                    rows={3} placeholder="Describe the notice..."
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <button key={c.key} onClick={() => setForm(p => ({ ...p, category: c.key }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: form.category === c.key ? `${c.color}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${form.category === c.key ? `${c.color}40` : 'rgba(255,255,255,0.07)'}`,
                          color: form.category === c.key ? c.color : 'rgba(255,255,255,0.3)',
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button onClick={handlePost} disabled={posting} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 8px 24px rgba(124,111,247,0.3)' }}>
                  {posting ? 'Posting...' : 'Post Notice 📢'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
