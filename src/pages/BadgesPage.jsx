import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useUserBadges, useAllBadges } from '../hooks/useProfile'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useToast } from '../components/ui/Toast'
import { drawAchievementCard, downloadCanvasCard, shareCanvasCard } from '../lib/canvasCard'

const CATEGORY_META = {
  skill:    { label: 'Skill Mastery', emoji: '🛠️', color: '#7C6FF7', glow: 'rgba(124,111,247,0.3)' },
  activity: { label: 'Activity',      emoji: '⚡', color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' },
  trust:    { label: 'Trust & Rep',   emoji: '🛡️', color: '#38BDF8', glow: 'rgba(56,189,248,0.3)' },
  elite:    { label: 'Elite',         emoji: '👑', color: '#FBBF24', glow: 'rgba(251,191,36,0.3)' },
}

function BadgeCard({ badge, earned, earnedDate, index, onShare }) {
  const color = badge.color || '#7C6FF7'
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
      whileHover={earned ? { y: -6, scale: 1.04 } : {}}
      onClick={() => earned && onShare && onShare(badge)}
      className={`relative overflow-hidden rounded-2xl text-center ${earned ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        background: earned ? 'linear-gradient(135deg, #17171D, #14141A)' : '#111116',
        border: earned ? `1px solid ${color}25` : '1px solid rgba(255,255,255,0.04)',
        boxShadow: earned ? `0 8px 32px ${color}15` : 'none',
        padding: '20px 16px'
      }}
    >
      {/* 3D glow for earned */}
      {earned && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${color}12, transparent 70%)` }} />
      )}
      {earned && (
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      )}

      <span
        className={`text-4xl block mb-3 relative z-10 transition-all ${!earned ? 'grayscale opacity-25' : ''}`}
        style={earned ? { filter: `drop-shadow(0 0 12px ${color}80)` } : {}}
      >
        {badge.icon}
      </span>

      <p className={`font-heading font-bold text-sm relative z-10 ${earned ? 'text-white' : 'text-white/20'}`}>
        {badge.name}
      </p>
      <p className={`text-xs mt-1.5 relative z-10 line-clamp-2 leading-relaxed ${earned ? 'text-white/40' : 'text-white/15'}`}>
        {earned ? badge.description : `🔒 ${badge.description}`}
      </p>

      {earned && earnedDate && (
        <p className="text-[10px] mt-2.5 relative z-10 font-bold uppercase tracking-wider" style={{ color: `${color}70` }}>
          {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </motion.div>
  )
}

export default function BadgesPage() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const { badges: userBadges, loading } = useUserBadges(user?.id)
  const allBadges = useAllBadges()

  const earnedIds = new Set(userBadges.map(ub => ub.badge_id))
  const earned = allBadges.filter(b => earnedIds.has(b.id))
  const locked = allBadges.filter(b => !earnedIds.has(b.id))
  const categories = ['skill', 'activity', 'trust', 'elite']
  const progress = allBadges.length > 0 ? (earned.length / allBadges.length) * 100 : 0

  const handleShareBadge = async (badge) => {
    try {
      const canvas = drawAchievementCard({
        username: profile?.full_name || profile?.username || 'Student',
        type: 'badge',
        emoji: badge.icon || '🏆',
        title: `${badge.name} Unlocked! 🏆`,
        subtitle: badge.description,
        pointsText: 'Elite Badge Earned'
      })
      const shared = await shareCanvasCard(canvas, {
        title: `HandyHub Badge Earned! 🏆`,
        text: `I just unlocked the "${badge.name}" elite badge on HandyHub! 🚀`
      })
      if (!shared) {
        downloadCanvasCard(canvas, `badge-${badge.id}.png`)
        addToast('Achievement card downloaded! 📥', 'success')
      } else {
        addToast('Achievement shared! 🚀', 'success')
      }
    } catch (e) {
      console.error(e)
      addToast('Could not share achievement.', 'error')
    }
  }

  if (loading) return <LoadingSpinner text="Loading badges..." />

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Stats header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #17171D, #13131A)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-15"
            style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.25), transparent)' }} />

          <div className="flex gap-4 mb-5 relative z-10">
            {[
              { label: 'Earned', value: earned.length, color: '#7C6FF7' },
              { label: 'Locked', value: locked.length, color: 'rgba(255,255,255,0.2)' },
              { label: 'Total',  value: allBadges.length, color: 'rgba(255,255,255,0.45)' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="flex-1 text-center p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="font-heading text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-white/25 text-[10px] mt-1 uppercase tracking-[0.12em]">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="relative z-10">
            <div className="flex justify-between mb-1.5">
              <p className="text-white/35 text-xs font-bold">Collection Progress</p>
              <p className="text-white/35 text-xs font-bold">{Math.round(progress)}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #7C6FF7, #FBBF24)' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Earned section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400 text-base">✦</span>
            <h2 className="text-white/50 text-[10px] font-black uppercase tracking-[0.18em]">Earned Badges</h2>
          </div>
          {earned.length === 0 ? (
            <div className="rounded-3xl p-12 text-center" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-white/30 text-sm">Complete tasks to earn your first badge!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {earned.map((b, i) => {
                const ub = userBadges.find(u => u.badge_id === b.id)
                return <BadgeCard key={b.id} badge={b} earned index={i} earnedDate={ub?.earned_at} onShare={handleShareBadge} />
              })}
            </div>
          )}
        </section>

        {/* Locked by category */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-white/20 text-base">🔒</span>
            <h2 className="text-white/30 text-[10px] font-black uppercase tracking-[0.18em]">Locked Badges</h2>
          </div>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat]
            const catBadges = locked.filter(b => b.category === cat)
            if (catBadges.length === 0) return null
            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{meta.emoji}</span>
                  <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.12em]">{meta.label}</span>
                  <span className="text-white/15 text-xs">({catBadges.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {catBadges.map((b, i) => <BadgeCard key={b.id} badge={b} earned={false} index={i} />)}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
