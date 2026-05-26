import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Share2, Users, Gift, ArrowUpRight, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function ReferralsPage() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  
  const [code, setCode] = useState(profile?.referral_code || '')
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ total: 0, points: 0 })

  useEffect(() => {
    if (!profile?.id) return

    const fetchReferralData = async () => {
      setLoading(true)
      
      // Ensure code exists
      let currentCode = profile.referral_code
      if (!currentCode) {
        currentCode = profile.username?.toUpperCase().slice(0, 4) + Math.random().toString(36).slice(2, 4).toUpperCase()
        await supabase.from('profiles').update({ referral_code: currentCode }).eq('id', profile.id)
      }
      setCode(currentCode)

      // Fetch referred users (where referred_by = profile.id)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, points_balance, reputation_score')
        .eq('referred_by', profile.id)
        .order('created_at', { ascending: false })

      const refList = data || []
      setReferrals(refList)
      setStats({
        total: refList.length,
        points: refList.length * 150
      })
      setLoading(false)
    }

    fetchReferralData()
  }, [profile])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('Code copied to clipboard', 'success')
  }

  const handleShare = async () => {
    const text = `Join me on HandyHub and get 1,150 bonus points! Use my code: ${code} \u2192 ${window.location.origin}/auth`
    if (navigator.share) {
      try { await navigator.share({ title: 'Join HandyHub!', text }) } catch { /* cancelled */ }
    } else {
      handleCopy()
    }
  }

  if (loading) return <LoadingSpinner text="Loading referrals..." />

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-64 opacity-20"
          style={{ background: 'linear-gradient(180deg, rgba(168,85,247,0.1), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <Gift size={28} className="text-purple-400" />
          </div>
          <h1 className="font-heading text-3xl font-black text-white">Invite & Earn</h1>
          <p className="text-white/40 text-sm mt-2 max-w-sm mx-auto">
            Give your friends a head start with 1,150 coins, and you'll get 150 coins when they sign up!
          </p>
        </motion.div>

        {/* Code Section */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="p-6 rounded-3xl mb-6 relative overflow-hidden text-center"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.05), rgba(168,85,247,0.02))', border: '1px solid rgba(168,85,247,0.15)' }}>
          
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/80 mb-4">Your Referral Code</h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
            <div className="w-full sm:flex-1 py-4 px-6 rounded-2xl font-mono text-2xl font-black tracking-[0.3em] text-white select-all shadow-inner"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.1)' }}>
              {code}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={handleCopy} 
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(168,85,247,0.1)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.2)' }}>
              {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />} 
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button onClick={handleShare} 
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7E22CE)', boxShadow: '0 4px 16px rgba(168,85,247,0.3)' }}>
              <Share2 size={16} /> Share Link
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-2 text-white/40">
              <Users size={16} /> <span className="text-xs font-bold uppercase">Friends Joined</span>
            </div>
            <p className="font-heading text-3xl font-black text-white">{stats.total}</p>
          </div>
          <div className="p-5 rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-2 text-amber-400/60">
              <Gift size={16} /> <span className="text-xs font-bold uppercase">Points Earned</span>
            </div>
            <p className="font-heading text-3xl font-black text-amber-400">+{stats.points}</p>
          </div>
        </motion.div>

        {/* Referral List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-heading text-lg font-black text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-purple-400" /> Your Referrals
          </h2>
          
          {referrals.length === 0 ? (
            <EmptyState 
              title="No referrals yet" 
              description="Share your code with friends to earn bonus points when they sign up."
              icon={<Users size={32} className="text-white/20" />}
            />
          ) : (
            <div className="space-y-3">
              {referrals.map((ref, idx) => (
                <div key={ref.id} className="p-4 rounded-2xl flex items-center gap-4 transition-all"
                  style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
                  
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                    {ref.avatar_url ? <img src={ref.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : (ref.full_name || 'U')[0]}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{ref.full_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/30 mt-1">
                      <span className="flex items-center gap-1"><Clock size={10} /> Joined {ref.created_at ? formatDistanceToNow(new Date(ref.created_at)) : 'a while'} ago</span>
                      <span>•</span>
                      <span className="text-amber-400/80">+{150} pts earned</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wider font-bold">Reputation</div>
                    <div className="text-sm font-black text-white/80">⭐ {ref.reputation_score?.toFixed(1) || '0.0'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
