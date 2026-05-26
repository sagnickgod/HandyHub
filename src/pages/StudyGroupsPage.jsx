import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Search, X, Users, Clock, ExternalLink, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { LevelBadge } from '../lib/levels'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function StudyGroupsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open') // open | full | mine
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', description: '', max_members: 6, meeting_time: '', meet_link: '' })
  const [posting, setPosting] = useState(false)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('study_groups')
      .select('*, creator:profiles!creator_id(id, full_name, avatar_url, level), members:study_group_members(id, user_id)')
      .order('created_at', { ascending: false })

    let filtered = data || []
    if (filter === 'open') filtered = filtered.filter(g => g.is_open && (g.members?.length || 0) < g.max_members)
    else if (filter === 'full') filtered = filtered.filter(g => !g.is_open || (g.members?.length || 0) >= g.max_members)
    else if (filter === 'mine') filtered = filtered.filter(g => g.creator_id === user?.id || g.members?.some(m => m.user_id === user?.id))

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(g => g.subject.toLowerCase().includes(q) || g.name.toLowerCase().includes(q))
    }

    setGroups(filtered)
    setLoading(false)
  }, [filter, search, user])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subject.trim()) return addToast('Name and subject required', 'error')
    setPosting(true)
    const { error } = await supabase.from('study_groups').insert({
      creator_id: user.id, name: form.name.trim(), subject: form.subject.trim(),
      description: form.description.trim(), max_members: form.max_members,
      meeting_time: form.meeting_time.trim(), meet_link: form.meet_link.trim(),
    })
    if (error) addToast(error.message, 'error')
    else {
      // Auto-join as creator
      const { data: newGroup } = await supabase.from('study_groups').select('id').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      if (newGroup) await supabase.from('study_group_members').insert({ group_id: newGroup.id, user_id: user.id })
      addToast('Study group created! 📖', 'success')
      setShowCreate(false); setForm({ name: '', subject: '', description: '', max_members: 6, meeting_time: '', meet_link: '' })
      fetchGroups()
    }
    setPosting(false)
  }

  const handleJoin = async (groupId) => {
    const { error } = await supabase.from('study_group_members').insert({ group_id: groupId, user_id: user.id })
    if (error) addToast(error.message === 'duplicate key value violates unique constraint "study_group_members_group_id_user_id_key"' ? 'Already a member!' : error.message, 'error')
    else { addToast('Joined group! 🎉', 'success'); fetchGroups() }
  }

  const handleLeave = async (groupId) => {
    await supabase.from('study_group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    addToast('Left group', 'success'); fetchGroups()
  }

  const FILTERS = [
    { key: 'open', label: 'Open' },
    { key: 'full', label: 'Full' },
    { key: 'mine', label: 'My Groups' },
  ]

  const inputStyle = {
    width: '100%', padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-30"
          style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.08), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-black text-white flex items-center gap-2">📖 Study Groups</h1>
            <p className="text-white/40 text-sm mt-1">Find study partners before exams</p>
          </div>
          <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)', boxShadow: '0 4px 16px rgba(56,189,248,0.3)' }}>
            <Plus size={16} /> Create Group
          </motion.button>
        </motion.div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject..."
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filter === f.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filter === f.key ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: filter === f.key ? '#38BDF8' : 'rgba(255,255,255,0.4)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Groups List */}
        {loading ? <LoadingSpinner text="Loading groups..." /> : groups.length === 0 ? (
          <EmptyState title="No study groups found" description="Create one and invite your classmates!" />
        ) : (
          <div className="space-y-3">
            {groups.map((g, i) => {
              const memberCount = g.members?.length || 0
              const isMember = g.members?.some(m => m.user_id === user?.id)
              const isFull = memberCount >= g.max_members
              return (
                <motion.div key={g.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl transition-all"
                  style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        {g.subject}
                      </span>
                      <h3 className="text-white/85 font-bold text-sm mt-2">{g.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: isFull ? '#EF4444' : '#34D399' }}>
                      <Users size={12} /> {memberCount}/{g.max_members}
                    </div>
                  </div>
                  {g.description && <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">{g.description}</p>}
                  <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-white/30">
                    {g.meeting_time && <span className="flex items-center gap-1"><Clock size={10} />{g.meeting_time}</span>}
                    {g.meet_link && <a href={g.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-400 hover:text-sky-300"><ExternalLink size={10} />Meet Link</a>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white/60"
                        style={{ background: 'rgba(56,189,248,0.15)' }}>
                        {g.creator?.avatar_url ? <img src={g.creator.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : g.creator?.full_name?.[0]}
                      </div>
                      <span className="text-[10px] text-white/30">{g.creator?.full_name}</span>
                      {g.creator?.level > 1 && <LevelBadge level={g.creator.level} size="xs" />}
                    </div>
                    {isMember ? (
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleLeave(g.id); }} className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-red-400 hover:bg-red-400/10 transition-colors">
                          Leave
                        </button>
                        <motion.button onClick={() => navigate(`/groups/${g.id}`)} whileTap={{ scale: 0.95 }}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold"
                          style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)', color: '#fff', boxShadow: '0 4px 12px rgba(56,189,248,0.2)' }}>
                          Open Chat
                        </motion.button>
                      </div>
                    ) : !isFull ? (
                      <motion.button onClick={() => handleJoin(g.id)} whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold"
                        style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}>
                        Join Group
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

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-lg rounded-3xl p-6 z-10 max-h-[85vh] overflow-y-auto"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">📖 Create Study Group</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Group Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={80} placeholder="e.g. DSA Grind Squad" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Data Structures & Algorithms" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What's the study plan?" style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Max Members (2–6)</label>
                    <input type="number" min={2} max={6} value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: parseInt(e.target.value) || 6 }))} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Meeting Time</label>
                    <input value={form.meeting_time} onChange={e => setForm(p => ({ ...p, meeting_time: e.target.value }))} placeholder="e.g. Sundays 4 PM" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Meet Link (optional)</label>
                  <input value={form.meet_link} onChange={e => setForm(p => ({ ...p, meet_link: e.target.value }))} placeholder="Google Meet or Zoom link" style={inputStyle} />
                </div>
                <motion.button onClick={handleCreate} disabled={posting} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)', boxShadow: '0 8px 24px rgba(56,189,248,0.3)' }}>
                  {posting ? 'Creating...' : 'Create Group 📖'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
