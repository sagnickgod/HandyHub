import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, TrendingUp, Gift, CheckCircle, ArrowUpRight, ArrowDownLeft, Repeat, Zap, Sparkles, Copy, Share2, Users } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { usePoints, useDailyBonuses } from '../hooks/usePoints'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const TYPE_CONFIG = {
  earn:           { icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  sign: '+' },
  spend:          { icon: ArrowUpRight,  color: 'text-red-400',     bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   sign: '-' },
  escrow_lock:    { icon: Lock,          color: 'text-amber-400',   bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  sign: '−' },
  escrow_release: { icon: Repeat,        color: 'text-cyan-400',    bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.2)',  sign: '+' },
  escrow_refund:  { icon: Repeat,        color: 'text-blue-400',    bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  sign: '+' },
  bonus:          { icon: Zap,           color: 'text-violet-400',  bg: 'rgba(124,111,247,0.1)', border: 'rgba(124,111,247,0.2)', sign: '+' },
  penalty:        { icon: ArrowUpRight,  color: 'text-red-400',     bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   sign: '-' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1C1C26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 16px', backdropFilter: 'blur(16px)' }}>
        <p className="text-white/40 text-xs mb-0.5">{label}</p>
        <p className="text-white font-black text-sm">🪙 {payload[0].value} pts</p>
      </div>
    )
  }
  return null
}

export default function WalletPage() {
  const { profile } = useAuth()
  const { transactions, loading, weeklyData, fetchTransactions } = usePoints()
  const { claimLoginBonus, hasCompleted } = useDailyBonuses()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [loginClaimed, setLoginClaimed] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => { if (hasCompleted('login')) setLoginClaimed(true) }, [hasCompleted])
  useEffect(() => { fetchTransactions(filter, page) }, [filter, page, fetchTransactions])

  const handleClaimLogin = async () => {
    const claimed = await claimLoginBonus()
    if (claimed) setLoginClaimed(true)
  }

  const todayTasksCompleted = transactions.filter(t =>
    t.type === 'earn' && new Date(t.created_at).toDateString() === new Date().toDateString()
  ).length

  if (!profile) return <LoadingSpinner />

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #7C6FF7, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Hero Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl mb-5 p-8"
            style={{
              background: 'linear-gradient(135deg, #17171D 0%, #13131A 60%, #0F0F14 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
            }}
          >
            {/* 3D glows */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #7C6FF7, transparent)' }} />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-15"
              style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(124,111,247,0.3), transparent)' }} />

            <p className="text-white/35 text-[10px] uppercase tracking-[0.18em] font-black mb-3">Available Balance</p>
            <div className="flex items-end gap-3 mb-5">
              <motion.span
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="text-4xl leading-none"
              >🪙</motion.span>
              <span className="font-heading text-5xl font-black text-white leading-none">
                {profile.points_balance?.toLocaleString()}
              </span>
              <span className="text-white/25 text-lg mb-1 font-bold">pts</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Lock size={12} className="text-white/30" />
              <span className="text-white/30">In Escrow:</span>
              <span className="text-white/55 font-bold">🪙 {profile.escrow_balance || 0}</span>
            </div>
          </motion.div>

          {/* Chart */}
          {weeklyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl mb-5 p-6"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(124,111,247,0.2), transparent)' }} />
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.2)' }}>
                  <TrendingUp size={14} className="text-violet-400" />
                </div>
                <h3 className="text-white/70 text-xs font-black uppercase tracking-[0.12em]">Earnings Activity (8 weeks)</h3>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C6FF7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C6FF7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="points" stroke="#7C6FF7" fill="url(#gradPts)" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: '#7C6FF7', stroke: '#0A0A0F', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Daily Bonuses */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl mb-5 p-6"
            style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent)' }} />
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Gift size={14} className="text-amber-400" />
              </div>
              <h3 className="text-white/70 text-xs font-black uppercase tracking-[0.12em]">Today's Bonuses</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { id: 'login', label: 'Daily Login', pts: '+10 pts', done: loginClaimed, onClaim: handleClaimLogin },
                { id: 'task1', label: 'Complete 1 Task', pts: '+50 pts', done: todayTasksCompleted >= 1 },
                { id: 'task3', label: 'Complete 3 Tasks', pts: '+120 pts bonus', done: todayTasksCompleted >= 3 },
              ].map(item => (
                <motion.div
                  key={item.id}
                  whileHover={!item.done ? { x: 2 } : {}}
                  className="flex items-center justify-between p-4 rounded-2xl transition-all"
                  style={{
                    background: item.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${item.done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: item.done ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${item.done ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                      {item.done
                        ? <CheckCircle size={15} className="text-emerald-400" />
                        : <div className="w-3 h-3 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.2)' }} />}
                    </div>
                    <span className={`text-sm font-semibold ${item.done ? 'text-white/25 line-through' : 'text-white/65'}`}>
                      {item.label}
                    </span>
                  </div>
                  {item.done ? (
                    <span className="text-emerald-400 text-xs font-black">{item.pts} ✓</span>
                  ) : item.onClaim ? (
                    <motion.button
                      onClick={item.onClaim}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-4 py-1.5 text-white text-xs font-black rounded-xl"
                      style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}
                    >
                      Claim {item.pts}
                    </motion.button>
                  ) : (
                    <span className="text-white/25 text-xs font-bold">{item.pts}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl p-6"
            style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
            <h3 className="text-white/70 text-xs font-black uppercase tracking-[0.12em] mb-5">Transaction History</h3>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
              {['all', 'earned', 'spent', 'bonuses'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setPage(0) }}
                  className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all"
                  style={{
                    background: filter === f ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)' : 'rgba(255,255,255,0.04)',
                    border: filter === f ? '1px solid rgba(124,111,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: filter === f ? '#fff' : 'rgba(255,255,255,0.35)',
                    boxShadow: filter === f ? '0 4px 16px rgba(124,111,247,0.25)' : 'none'
                  }}>
                  {f}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <motion.div key={filter + page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                  {transactions.length === 0 ? (
                    <p className="text-white/25 text-sm text-center py-10">No transactions yet</p>
                  ) : transactions.map((t, i) => {
                    const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.earn
                    const Icon = cfg.icon
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition-all group"
                        style={{ border: '1px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                          <Icon size={14} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/65 text-sm font-semibold truncate">{t.description || t.type}</p>
                          <p className="text-white/20 text-xs mt-0.5">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                        </div>
                        <span className={`font-black text-sm ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount}
                        </span>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="text-xs font-bold transition-colors disabled:opacity-25"
                style={{ color: 'rgba(255,255,255,0.35)' }}>← Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={transactions.length < 20}
                className="text-xs font-bold transition-colors disabled:opacity-25"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Next →</button>
            </div>
          </motion.div>
        </motion.div>

          {/* Referral Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="relative overflow-hidden rounded-3xl mb-5 p-5 cursor-pointer hover:scale-[1.01] transition-transform"
            style={{ background: 'linear-gradient(135deg, #17171D, #1A1526)', border: '1px solid rgba(168,85,247,0.15)' }}
            onClick={() => navigate('/referrals')}
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15"
              style={{ background: 'radial-gradient(circle, #A855F7, transparent)' }} />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                  <Users size={18} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white/90 text-sm font-bold">Referrals Hub</h3>
                  <p className="text-white/40 text-xs mt-0.5">Invite friends, earn 150 pts each</p>
                </div>
              </div>
              <ArrowUpRight size={20} className="text-purple-400/50" />
            </div>
          </motion.div>

      </div>
    </div>
  )
}
