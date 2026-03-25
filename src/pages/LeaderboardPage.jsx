import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Shield, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const tabs = [
  { key: 'weekly', label: 'Weekly', icon: Trophy },
  { key: 'monthly', label: 'Monthly', icon: Crown },
  { key: 'trusted', label: 'Most Trusted', icon: Shield },
  { key: 'streak', label: 'Streak Kings', icon: Flame },
]

const MEDAL_STYLES = [
  { emoji: '🥇', glow: 'shadow-amber-500/20', border: 'border-amber-500/30 ring-2 ring-amber-500/30', accent: 'text-amber-400', bg: 'bg-amber-500/10' },
  { emoji: '🥈', glow: 'shadow-slate-400/20', border: 'border-slate-400/30', accent: 'text-slate-400', bg: 'bg-slate-500/10' },
  { emoji: '🥉', glow: 'shadow-amber-700/20', border: 'border-amber-700/30', accent: 'text-amber-600', bg: 'bg-amber-700/10' },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('weekly')
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      let query = supabase.from('profiles').select('id, full_name, username, avatar_url, reputation_score, points_balance, streak_count, total_tasks_helped')

      if (tab === 'weekly' || tab === 'monthly') {
        query = query.order('total_tasks_helped', { ascending: false }).limit(20)
      } else if (tab === 'trusted') {
        query = query.order('reputation_score', { ascending: false }).limit(20)
      } else {
        query = query.order('streak_count', { ascending: false }).limit(20)
      }

      const { data } = await query
      setLeaders(data || [])
      setLoading(false)
    }
    fetchLeaderboard()
  }, [tab, user])

  const getStatValue = (p) => {
    if (tab === 'weekly' || tab === 'monthly') return `${p.total_tasks_helped || 0} tasks`
    if (tab === 'trusted') return `⭐ ${Number(p.reputation_score || 0).toFixed(1)}`
    return `🔥 ${p.streak_count || 0}d`
  }

  const top3 = [leaders[1], leaders[0], leaders[2]].filter(Boolean)
  const rest = leaders.slice(3)

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                  isActive ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' : 'bg-white/5 text-white/40 border-white/[0.06] hover:text-white/70'
                }`}>
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingSpinner text="Loading leaderboard..." />
          ) : (
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

              {/* Podium Top 3 */}
              {leaders.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-10">
                  {top3.map((p, podiumIdx) => {
                    const actualRank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2
                    const style = MEDAL_STYLES[actualRank]
                    const isFirst = actualRank === 0
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: podiumIdx * 0.1 }}
                        onClick={() => navigate(`/profile/${p.id}`)}
                        className={`flex flex-col items-center cursor-pointer group ${isFirst ? 'mb-6' : ''}`}
                      >
                        <span className="text-3xl mb-2">{style.emoji}</span>
                        <div className={`relative w-16 h-16 rounded-full ${style.bg} border ${style.border} flex items-center justify-center text-2xl font-black text-white mb-3 shadow-lg ${style.glow} group-hover:scale-105 transition-transform`}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                            : <span>{p.full_name?.[0] || '?'}</span>
                          }
                          {isFirst && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
                          )}
                        </div>
                        <p className="font-bold text-white text-sm truncate max-w-[80px] text-center">{p.full_name}</p>
                        <p className={`text-xs font-black mt-1 ${style.accent}`}>{getStatValue(p)}</p>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Rest of list */}
              <div className="bg-[#17171D] border border-white/[0.05] rounded-3xl overflow-hidden">
                {rest.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.04] transition-all border-b border-white/[0.04] last:border-0 ${p.id === user?.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <span className="w-8 text-center text-sm font-black text-white/30">{i + 4}</span>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {p.avatar_url
                        ? <img src={p.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                        : <span>{p.full_name?.[0] || '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-semibold truncate">{p.full_name}</p>
                      <p className="text-white/30 text-xs">@{p.username}</p>
                    </div>
                    <span className="text-amber-400 text-sm font-black">{getStatValue(p)}</span>
                  </motion.div>
                ))}
              </div>

              {user && !leaders.find(l => l.id === user.id) && (
                <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                  <p className="text-white/50 text-sm">You're not in the top 20 yet.</p>
                  <p className="text-primary text-xs mt-1 font-semibold">Complete more tasks to climb! 🚀</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
