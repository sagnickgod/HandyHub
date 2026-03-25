import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useUserBadges, useAllBadges } from '../hooks/useProfile'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const CATEGORY_META = {
  skill:    { label: 'Skill Mastery',  emoji: '🛠️', color: 'from-violet-500 to-indigo-500' },
  activity: { label: 'Activity',       emoji: '⚡', color: 'from-amber-500 to-orange-500' },
  trust:    { label: 'Trust & Rep',    emoji: '🛡️', color: 'from-cyan-500 to-blue-500' },
  elite:    { label: 'Elite',          emoji: '👑', color: 'from-yellow-400 to-amber-500' },
}

export default function BadgesPage() {
  const { user } = useAuth()
  const { badges: userBadges, loading } = useUserBadges(user?.id)
  const allBadges = useAllBadges()

  const earnedIds = new Set(userBadges.map(ub => ub.badge_id))
  const earned = allBadges.filter(b => earnedIds.has(b.id))
  const locked = allBadges.filter(b => !earnedIds.has(b.id))
  const categories = ['skill', 'activity', 'trust', 'elite']

  if (loading) return <LoadingSpinner text="Loading badges..." />

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Stats header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-8"
        >
          {[
            { label: 'Earned', value: earned.length, color: 'text-primary' },
            { label: 'Locked', value: locked.length, color: 'text-white/30' },
            { label: 'Total', value: allBadges.length, color: 'text-white/60' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-[#17171D] border border-white/[0.05] rounded-2xl p-4 text-center">
              <p className={`font-heading text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Earned section */}
        <section className="mb-10">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Earned Badges</h2>
          {earned.length === 0 ? (
            <div className="bg-[#17171D] border border-white/[0.05] rounded-3xl p-10 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-white/30 text-sm">Complete tasks to earn badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {earned.map((b, i) => {
                const ub = userBadges.find(u => u.badge_id === b.id)
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="relative overflow-hidden bg-[#17171D] border border-white/[0.05] rounded-2xl p-5 text-center"
                  >
                    <div
                      className="absolute inset-0 opacity-10 rounded-2xl"
                      style={{ background: `radial-gradient(circle at 50% 0%, ${b.color || '#7C6FF7'}, transparent 70%)` }}
                    />
                    <span
                      className="text-4xl block mb-3 relative z-10"
                      style={{ filter: `drop-shadow(0 0 10px ${b.color || '#7C6FF7'})` }}
                    >
                      {b.icon}
                    </span>
                    <p className="font-heading font-bold text-white text-sm relative z-10">{b.name}</p>
                    <p className="text-white/40 text-xs mt-1 relative z-10">{b.description}</p>
                    {ub && (
                      <p className="text-white/20 text-[10px] mt-2 relative z-10">
                        {new Date(ub.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* Locked by category */}
        <section>
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Locked Badges</h2>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat]
            const catBadges = locked.filter(b => b.category === cat)
            if (catBadges.length === 0) return null
            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{meta.emoji}</span>
                  <span className="text-white/40 text-xs font-bold uppercase tracking-wider">{meta.label}</span>
                  <span className="text-white/20 text-xs">({catBadges.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {catBadges.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-[#17171D] border border-white/[0.04] rounded-2xl p-5 text-center"
                    >
                      <span className="text-3xl block mb-3 grayscale opacity-40">{b.icon}</span>
                      <p className="font-heading font-bold text-white/30 text-sm">{b.name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <span className="text-white/20 text-xs">🔒</span>
                        <p className="text-white/20 text-xs truncate">{b.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
