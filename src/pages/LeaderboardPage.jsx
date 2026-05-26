import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Shield, Crown, Star as StarIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LevelBadge } from '../lib/levels'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const tabs = [
  { key: 'weekly',  label: 'Weekly',       icon: Trophy },
  { key: 'monthly', label: 'Monthly',      icon: Crown  },
  { key: 'trusted', label: 'Most Trusted', icon: Shield },
  { key: 'streak',  label: 'Streak Kings', icon: Flame  },
  { key: 'fame',    label: 'Hall of Fame', icon: StarIcon },
]

const MEDAL = [
  { emoji: '🥇', color: '#FBBF24', glow: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.4)', rank: '#F59E0B' },
  { emoji: '🥈', color: '#94A3B8', glow: 'rgba(148,163,184,0.25)', border: 'rgba(148,163,184,0.3)', rank: '#94A3B8' },
  { emoji: '🥉', color: '#CA8A04', glow: 'rgba(202,138,4,0.25)', border: 'rgba(202,138,4,0.3)', rank: '#B45309' },
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
      let query = supabase.from('profiles').select('id, full_name, username, avatar_url, reputation_score, points_balance, streak_count, total_tasks_helped, level, level_title')
      if (tab === 'weekly' || tab === 'monthly') {
        query = query.order('total_tasks_helped', { ascending: false }).limit(20)
      } else if (tab === 'trusted') {
        query = query.order('reputation_score', { ascending: false }).limit(20)
      } else if (tab === 'fame') {
        query = query.gte('level', 8).order('level', { ascending: false }).order('points_balance', { ascending: false }).limit(50)
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
    if (tab === 'fame') return `Lvl ${p.level || 1} · ${p.level_title || 'Newcomer'}`
    return `🔥 ${p.streak_count || 0}d`
  }

  const top3 = [leaders[1], leaders[0], leaders[2]].filter(Boolean)
  const rest = leaders.slice(3)

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #FBBF24, transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {tabs.map((t, i) => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <motion.button
                key={t.key} onClick={() => setTab(t.key)}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid rgba(124,111,247,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  boxShadow: isActive ? '0 4px 20px rgba(124,111,247,0.3)' : 'none'
                }}
              >
                <Icon size={12} />{t.label}
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingSpinner text="Loading leaderboard..." />
          ) : (
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

              {/* Podium Top 3 */}
              {leaders.length >= 3 && (
                <div className="flex items-end justify-center gap-5 mb-10">
                  {top3.map((p, podiumIdx) => {
                    const actualRank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2
                    const medal = MEDAL[actualRank]
                    const isFirst = actualRank === 0
                    const heights = ['h-28', 'h-36', 'h-24']

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: podiumIdx * 0.12, type: 'spring', stiffness: 150 }}
                        onClick={() => navigate(`/profile/${p.id}`)}
                        whileHover={{ y: -5, scale: 1.04 }}
                        className="flex flex-col items-center cursor-pointer group"
                      >
                        <motion.span
                          className="text-3xl block mb-2"
                          animate={isFirst ? { rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                          {medal.emoji}
                        </motion.span>
                        <div
                          className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3 overflow-hidden transition-all"
                          style={{
                            background: `radial-gradient(circle, ${medal.color}25, rgba(255,255,255,0.05))`,
                            border: `2px solid ${medal.border}`,
                            boxShadow: `0 8px 32px ${medal.glow}`
                          }}
                        >
                          {p.avatar_url
                            ? <img src={p.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                            : <span style={{ color: medal.color }}>{p.full_name?.[0] || '?'}</span>
                          }
                          {isFirst && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl leading-none pointer-events-none">👑</div>
                          )}
                        </div>
                        <p className="font-bold text-white text-xs truncate max-w-[80px] text-center">{p.full_name}</p>
                        <p className="text-[11px] font-black mt-1" style={{ color: medal.rank }}>{getStatValue(p)}</p>

                        {/* Podium block */}
                        <div className={`${heights[podiumIdx]} w-20 mt-3 rounded-t-xl flex items-center justify-center`}
                          style={{
                            background: `linear-gradient(180deg, ${medal.color}20, ${medal.color}08)`,
                            border: `1px solid ${medal.color}15`,
                            borderBottom: 'none'
                          }}>
                          <span className="text-2xl font-black" style={{ color: `${medal.color}40` }}>#{actualRank + 1}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Rest */}
              <div className="overflow-hidden rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                {rest.map((p, i) => {
                  const isMe = p.id === user?.id
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/profile/${p.id}`)}
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isMe ? 'rgba(124,111,247,0.05)' : 'transparent',
                        borderLeft: isMe ? '2px solid rgba(124,111,247,0.5)' : '2px solid transparent'
                      }}
                      onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(124,111,247,0.05)' : 'transparent' }}
                    >
                      <span className="w-8 text-center text-sm font-black text-white/20">#{i + 4}</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                          : <span>{p.full_name?.[0] || '?'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white/75 text-sm font-bold truncate">{p.full_name}</p>
                          {p.level > 1 && <LevelBadge level={p.level} size="xs" />}
                        </div>
                        <p className="text-white/25 text-xs">@{p.username}</p>
                      </div>
                      <span className="text-sm font-black" style={{ color: '#FBBF24' }}>{getStatValue(p)}</span>
                    </motion.div>
                  )
                })}
              </div>

              {user && !leaders.find(l => l.id === user.id) && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-5 rounded-2xl p-5 text-center"
                  style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.15)' }}
                >
                  <p className="text-white/45 text-sm">You're not in the top 20 yet.</p>
                  <p className="text-violet-400 text-xs mt-1 font-bold">Complete more tasks to climb! 🚀</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
