import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trophy, Share2, Download, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getLevelInfo } from '../../lib/levels'
import { drawAchievementCard, downloadCanvasCard, shareCanvasCard } from '../../lib/canvasCard'

export default function LevelUpCelebration() {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)
  const [levelDetails, setLevelDetails] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!profile) return

    // Get calculated level
    const currentPoints = profile.lifetime_points_earned || 0
    const info = getLevelInfo(currentPoints)
    const currentLevel = info.level

    const savedLevelStr = localStorage.getItem('handyhub-known-level')
    if (savedLevelStr === null) {
      // First time loading - initialize known level
      localStorage.setItem('handyhub-known-level', currentLevel.toString())
      return
    }

    const savedLevel = parseInt(savedLevelStr)
    if (currentLevel > savedLevel) {
      // LEVEL UP TRIGGERS!
      setLevelDetails({
        level: currentLevel,
        title: info.title,
        color: info.color,
        gradient: info.gradient || 'from-violet-500 to-purple-600',
        oldLevel: savedLevel
      })
      setShow(true)
      localStorage.setItem('handyhub-known-level', currentLevel.toString())
    } else if (currentLevel < savedLevel) {
      // Sync in case level decreased (e.g. testing)
      localStorage.setItem('handyhub-known-level', currentLevel.toString())
    }

  }, [profile])

  const handleShareCard = async () => {
    if (!profile || !levelDetails) return
    setDownloading(true)
    try {
      const canvas = drawAchievementCard({
        username: profile.username || 'user',
        type: 'level',
        emoji: '🚀',
        title: `Reached Level ${levelDetails.level}! 🎉`,
        subtitle: `New Title unlocked: "${levelDetails.title}"`,
        pointsText: `Reputation: ⭐ ${Number(profile.reputation_score || 5.0).toFixed(1)}`
      })

      const shared = await shareCanvasCard(canvas, {
        title: `I reached Level ${levelDetails.level} on HandyHub!`,
        text: `Level Up! Check out my campus rep portfolio on HandyHub: ${window.location.origin}/u/${profile.username}`
      })

      if (!shared) {
        // Fallback to direct download
        downloadCanvasCard(canvas, `levelup_level_${levelDetails.level}.png`)
      }
    } catch (err) {
      console.error('[LevelUp] Share card failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadOnly = () => {
    if (!profile || !levelDetails) return
    const canvas = drawAchievementCard({
      username: profile.username || 'user',
      type: 'level',
      emoji: '🚀',
      title: `Reached Level ${levelDetails.level}! 🎉`,
      subtitle: `New Title unlocked: "${levelDetails.title}"`,
      pointsText: `Reputation: ⭐ ${Number(profile.reputation_score || 5.0).toFixed(1)}`
    })
    downloadCanvasCard(canvas, `levelup_level_${levelDetails.level}.png`)
  }

  return (
    <AnimatePresence>
      {show && levelDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Blur backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          {/* Celebration Card */}
          <motion.div 
            initial={{ scale: 0.9, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative w-full max-w-md p-8 rounded-3xl text-center border text-white z-10 space-y-6 overflow-hidden shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #17171D, #0A0A0F)', 
              borderColor: `${levelDetails.color}40`,
              boxShadow: `0 20px 50px ${levelDetails.color}25`
            }}
          >
            
            {/* Top Close Button */}
            <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
              <X size={20} />
            </button>

            {/* Glowing background circle */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[60px] opacity-[0.2]"
              style={{ background: levelDetails.color }} />

            {/* Icon */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* Level Hexagon */}
              <div
                style={{
                  width: 60, height: 60,
                  background: `${levelDetails.color}35`,
                  border: `3px solid ${levelDetails.color}`,
                  color: levelDetails.color,
                  fontSize: 24,
                  fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  boxShadow: `0 0 20px ${levelDetails.color}40`
                }}
              >
                {levelDetails.level}
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: levelDetails.color }}>
                🏆 Level Up Celebration
              </span>
              <h2 className="font-heading text-3xl font-black text-white leading-tight">
                Level {levelDetails.level} Reached!
              </h2>
              <p className="text-white/40 text-sm">
                You've advanced from Level {levelDetails.oldLevel}
              </p>
            </div>

            {/* New Title Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Unlocked Title</span>
              <span className="text-lg font-black text-white font-heading tracking-wide">
                "{levelDetails.title}"
              </span>
            </div>

            {/* Level Privileges Info */}
            <div className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
              {levelDetails.level >= 5 ? (
                <span className="text-emerald-400 font-bold">✅ Elite peer vouching unlocked! You can now verify other students' skills.</span>
              ) : levelDetails.level >= 4 ? (
                <span className="text-[#8B80F9] font-bold">🎓 Mentorship privilege unlocked! You can now offer sessions on the Mentors Board.</span>
              ) : (
                <span>Keep contributing and earning lifetime points to unlock exclusive peer verification & mentorship board access.</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4">
              <button onClick={handleShareCard} disabled={downloading}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ 
                  background: `linear-gradient(135deg, ${levelDetails.color}, #FFF)`,
                  boxShadow: `0 8px 24px ${levelDetails.color}25`
                }}>
                <Share2 size={16} /> {downloading ? 'Preparing...' : 'Share Level Up Card'}
              </button>

              <button onClick={handleDownloadOnly}
                className="w-full py-3 rounded-2xl font-bold text-xs text-white/70 bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-1.5">
                <Download size={14} /> Download PNG Only
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
