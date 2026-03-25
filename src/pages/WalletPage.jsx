import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, TrendingUp, Gift, CheckCircle, ArrowUpRight, ArrowDownLeft, Repeat, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { usePoints, useDailyBonuses } from '../hooks/usePoints'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const TYPE_CONFIG = {
  earn:           { icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', sign: '+' },
  spend:          { icon: ArrowUpRight,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         sign: '-' },
  escrow_lock:    { icon: Lock,          color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     sign: '−' },
  escrow_release: { icon: Repeat,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',       sign: '+' },
  escrow_refund:  { icon: Repeat,        color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       sign: '+' },
  bonus:          { icon: Zap,           color: 'text-primary',     bg: 'bg-primary/10 border-primary/20',         sign: '+' },
  penalty:        { icon: ArrowUpRight,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         sign: '-' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1C1C24] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-white/40 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">🪙 {payload[0].value} pts</p>
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

  useEffect(() => {
    if (hasCompleted('login')) setLoginClaimed(true)
  }, [hasCompleted])

  useEffect(() => {
    fetchTransactions(filter, page)
  }, [filter, page, fetchTransactions])

  const handleClaimLogin = async () => {
    const claimed = await claimLoginBonus()
    if (claimed) setLoginClaimed(true)
  }

  const todayTasksCompleted = transactions.filter(t =>
    t.type === 'earn' && new Date(t.created_at).toDateString() === new Date().toDateString()
  ).length

  if (!profile) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17171D] to-[#13131A] border border-white/[0.05] p-8 mb-6">
            <div className="absolute top-0 right-0 w-56 h-56 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Available Balance</p>
            <div className="flex items-end gap-3 mb-5">
              <span className="text-amber-400 text-4xl">🪙</span>
              <span className="font-heading text-5xl font-black text-white">{profile.points_balance?.toLocaleString()}</span>
              <span className="text-white/30 text-xl mb-1">pts</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/30">
              <Lock size={13} />
              <span>In Escrow: </span>
              <span className="text-white/50 font-semibold">🪙 {profile.escrow_balance || 0}</span>
            </div>
          </div>

          {/* Points Chart */}
          {weeklyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#17171D] border border-white/[0.05] rounded-3xl p-6 mb-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="font-heading font-bold text-white/80 text-sm uppercase tracking-wider">Points Activity (8 weeks)</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientPts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C6FF7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7C6FF7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="points" stroke="#7C6FF7" fill="url(#gradientPts)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#7C6FF7', stroke: '#0A0A0F', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Daily Bonuses */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#17171D] border border-white/[0.05] rounded-3xl p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Gift size={16} className="text-amber-400" />
              <h3 className="font-heading font-bold text-white/80 text-sm uppercase tracking-wider">Today's Bonuses</h3>
            </div>
            <div className="space-y-3">
              {[
                { id: 'login', label: 'Daily Login', pts: '+10', done: loginClaimed, onClaim: handleClaimLogin },
                { id: 'task1', label: 'Complete 1 Task', pts: '+50', done: todayTasksCompleted >= 1 },
                { id: 'task3', label: 'Complete 3 Tasks', pts: '+120 bonus', done: todayTasksCompleted >= 3 },
              ].map(item => (
                <div key={item.id} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${item.done ? 'bg-white/3' : 'bg-white/5 hover:bg-white/[0.07]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${item.done ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                      {item.done
                        ? <CheckCircle size={14} className="text-emerald-400" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20" />
                      }
                    </div>
                    <span className={`text-sm font-medium ${item.done ? 'text-white/30 line-through' : 'text-white/70'}`}>{item.label}</span>
                  </div>
                  {item.done ? (
                    <span className="text-emerald-400 text-xs font-bold">{item.pts} ✓</span>
                  ) : item.onClaim ? (
                    <button
                      onClick={item.onClaim}
                      className="px-4 py-1.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      Claim {item.pts}
                    </button>
                  ) : (
                    <span className="text-white/30 text-xs font-bold">{item.pts}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#17171D] border border-white/[0.05] rounded-3xl p-6"
          >
            <h3 className="font-heading font-bold text-white/80 text-sm uppercase tracking-wider mb-5">Transaction History</h3>

            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
              {['all', 'earned', 'spent', 'bonuses'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setPage(0) }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
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
                    <p className="text-white/30 text-sm text-center py-8">No transactions yet</p>
                  ) : transactions.map((t, i) => {
                    const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.earn
                    const Icon = cfg.icon
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3.5 px-3 py-3.5 rounded-2xl hover:bg-white/[0.03] transition-all"
                      >
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon size={14} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm font-medium truncate">{t.description || t.type}</p>
                          <p className="text-white/25 text-xs mt-0.5">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
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

            <div className="flex justify-between mt-5 pt-4 border-t border-white/[0.05]">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="text-xs text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors font-semibold">← Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={transactions.length < 20}
                className="text-xs text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors font-semibold">Next →</button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
