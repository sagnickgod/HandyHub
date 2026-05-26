import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CheckCircle, XCircle, Clock, Inbox, Send, Plus, Search, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function SkillSwapsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('incoming') // incoming | outgoing | completed
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [swapForm, setSwapForm] = useState({ offers: '', wants: '', message: '' })
  const [proposing, setProposing] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchSwaps = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('skill_swaps')
        .select('*, requester:profiles!requester_id(id, full_name, avatar_url), receiver:profiles!receiver_id(id, full_name, avatar_url)')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      let filtered = data || []
      if (tab === 'incoming') filtered = filtered.filter(s => s.receiver_id === user.id && s.status === 'pending')
      else if (tab === 'outgoing') filtered = filtered.filter(s => s.requester_id === user.id && s.status !== 'completed')
      else if (tab === 'completed') filtered = filtered.filter(s => s.status === 'completed')

      setSwaps(filtered)
      setLoading(false)
    }
    fetchSwaps()
  }, [user, tab])

  const handleAction = async (swapId, status) => {
    const { error } = await supabase.from('skill_swaps').update({ status }).eq('id', swapId)
    if (error) return addToast(error.message, 'error')

    if (status === 'completed') {
      // Award +30 bonus points to both parties
      const swap = swaps.find(s => s.id === swapId)
      if (swap) {
        await supabase.from('point_transactions').insert([
          { user_id: swap.requester_id, type: 'bonus', amount: 30, description: 'Skill Swap Reward' },
          { user_id: swap.receiver_id, type: 'bonus', amount: 30, description: 'Skill Swap Reward' },
        ])
      }
    }

    addToast(`Swap ${status}!`, 'success')
    // Re-fetch by toggling tab
    setTab(t => t)
    window.location.reload() // Simple re-fetch
  }

  // --- Propose Swap Logic ---
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, reputation_score')
        .ilike('full_name', `%${searchQuery}%`)
        .neq('id', user.id)
        .limit(5)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, user?.id])

  const handlePropose = async () => {
    if (!selectedUser) return addToast('Please select a user', 'error')
    if (!swapForm.offers.trim() || !swapForm.wants.trim()) return addToast('Please fill out offers and wants', 'error')

    setProposing(true)
    const { error } = await supabase.from('skill_swaps').insert({
      requester_id: user.id,
      receiver_id: selectedUser.id,
      requester_offers: swapForm.offers.trim(),
      requester_wants: swapForm.wants.trim(),
      message: swapForm.message.trim(),
      status: 'pending'
    })

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Swap proposed! 🎉', 'success')
      setShowProposeModal(false)
      setSelectedUser(null)
      setSwapForm({ offers: '', wants: '', message: '' })
      setSearchQuery('')
      setTab('outgoing')
      window.location.reload()
    }
    setProposing(false)
  }


  const STATUS_COLORS = {
    pending: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
    accepted: { bg: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: 'rgba(56,189,248,0.2)' },
    completed: { bg: 'rgba(52,211,153,0.1)', color: '#34D399', border: 'rgba(52,211,153,0.2)' },
    declined: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
  }

  const TABS = [
    { key: 'incoming', label: 'Incoming', icon: Inbox },
    { key: 'outgoing', label: 'Outgoing', icon: Send },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-30"
          style={{ background: 'linear-gradient(180deg, rgba(236,72,153,0.08), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="font-heading text-2xl font-black text-white flex items-center gap-2">🔄 Skill Swaps</h1>
            <p className="text-white/40 text-sm mt-1">Trade skills with peers — no points needed</p>
          </div>
          <motion.button onClick={() => setShowProposeModal(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }}>
            <Plus size={16} /> Propose Swap
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{
                background: tab === t.key ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)',
                boxShadow: tab === t.key ? '0 4px 12px rgba(236,72,153,0.25)' : 'none',
              }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Swaps List */}
        {loading ? <LoadingSpinner text="Loading swaps..." /> : swaps.length === 0 ? (
          <EmptyState title={`No ${tab} swaps`} description={tab === 'incoming' ? "No swap proposals yet — visit someone's profile to start one!" : 'Your swaps will appear here.'} />
        ) : (
          <div className="space-y-3">
            {swaps.map((s, i) => {
              const isIncoming = s.receiver_id === user?.id
              const otherUser = isIncoming ? s.requester : s.receiver
              const sc = STATUS_COLORS[s.status] || STATUS_COLORS.pending
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/60"
                      style={{ background: 'rgba(236,72,153,0.15)' }}>
                      {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : otherUser?.full_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <span className="text-white/80 font-bold text-sm">{otherUser?.full_name}</span>
                      <span className="text-white/20 text-[10px] ml-2">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
                      Offers: {s.requester_offers}
                    </span>
                    <ArrowLeftRight size={14} className="text-white/20" />
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                      Wants: {s.requester_wants}
                    </span>
                  </div>

                  {s.message && <p className="text-white/35 text-xs mb-3 italic">"{s.message}"</p>}

                  {isIncoming && s.status === 'pending' && (
                    <div className="flex gap-2">
                      <motion.button onClick={() => handleAction(s.id, 'accepted')} whileTap={{ scale: 0.95 }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                        <CheckCircle size={13} /> Accept
                      </motion.button>
                      <motion.button onClick={() => handleAction(s.id, 'declined')} whileTap={{ scale: 0.95 }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <XCircle size={13} /> Decline
                      </motion.button>
                    </div>
                  )}

                  {s.status === 'accepted' && (
                    <motion.button onClick={() => navigate(`/swap-chat/${s.id}`)} whileTap={{ scale: 0.95 }}
                      className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}>
                      <MessageSquare size={13} /> Open Chat
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
      {/* Propose Swap Modal */}
      <AnimatePresence>
        {showProposeModal && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProposeModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-md rounded-3xl p-6 z-10 max-h-[85vh] overflow-y-auto"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">🔄 Propose Swap</h2>
                <button onClick={() => setShowProposeModal(false)} className="text-white/40 hover:text-white"><XCircle size={20} /></button>
              </div>

              <div className="space-y-4">
                {/* User Search */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Select Peer</label>
                  {!selectedUser ? (
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Search by name..." 
                        className="w-full pl-10 pr-4 py-3 text-sm text-white outline-none rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} 
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {searchResults.map(r => (
                            <button key={r.id} onClick={() => { setSelectedUser(r); setSearchQuery(''); setSearchResults([]) }}
                              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                              <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold">
                                {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : r.full_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white/80">{r.full_name}</p>
                                <p className="text-xs text-white/40">⭐ {r.reputation_score?.toFixed(1) || '0.0'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold">
                          {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : selectedUser.full_name[0]}
                        </div>
                        <span className="text-sm font-bold text-white">{selectedUser.full_name}</span>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="text-pink-400 hover:text-pink-300 text-xs font-bold px-2 py-1 bg-pink-400/10 rounded-lg">Change</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400/80 block mb-2">I Offer (What I'll teach/do)</label>
                  <input 
                    value={swapForm.offers} 
                    onChange={e => setSwapForm(p => ({ ...p, offers: e.target.value }))} 
                    placeholder="e.g. 1hr React setup" 
                    className="w-full px-4 py-3 text-sm text-white outline-none rounded-xl focus:border-emerald-500/50 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-400/80 block mb-2">I Want (What I need help with)</label>
                  <input 
                    value={swapForm.wants} 
                    onChange={e => setSwapForm(p => ({ ...p, wants: e.target.value }))} 
                    placeholder="e.g. Calculus tutoring" 
                    className="w-full px-4 py-3 text-sm text-white outline-none rounded-xl focus:border-sky-500/50 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Message (Optional)</label>
                  <textarea 
                    value={swapForm.message} 
                    onChange={e => setSwapForm(p => ({ ...p, message: e.target.value }))} 
                    placeholder="Hey, I saw you're good at math..." 
                    rows={2}
                    className="w-full px-4 py-3 text-sm text-white outline-none rounded-xl resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} 
                  />
                </div>

                <motion.button onClick={handlePropose} disabled={proposing || !selectedUser} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-50 mt-4"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', boxShadow: '0 8px 24px rgba(236,72,153,0.3)' }}>
                  {proposing ? 'Sending...' : 'Send Proposal'}
                </motion.button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
