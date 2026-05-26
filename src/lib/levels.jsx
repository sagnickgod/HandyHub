export const LEVELS = [
  { level: 1,  title: 'Newcomer',    minPoints: 0,     color: '#6B7280', gradient: 'from-gray-500 to-gray-600' },
  { level: 2,  title: 'Helper',      minPoints: 500,   color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
  { level: 3,  title: 'Contributor', minPoints: 1500,  color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600' },
  { level: 4,  title: 'Reliable',    minPoints: 3000,  color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600' },
  { level: 5,  title: 'Trusted',     minPoints: 6000,  color: '#7C6FF7', gradient: 'from-violet-500 to-purple-600' },
  { level: 6,  title: 'Expert',      minPoints: 10000, color: '#A855F7', gradient: 'from-purple-500 to-fuchsia-600' },
  { level: 7,  title: 'Mentor',      minPoints: 16000, color: '#EC4899', gradient: 'from-pink-500 to-rose-600' },
  { level: 8,  title: 'Champion',    minPoints: 25000, color: '#F59E0B', gradient: 'from-amber-400 to-amber-600' },
  { level: 9,  title: 'Legend',      minPoints: 40000, color: '#F97316', gradient: 'from-orange-400 to-red-500' },
  { level: 10, title: 'Campus God',  minPoints: 60000, color: '#EAB308', gradient: 'from-yellow-400 to-amber-500' },
]

export function getLevelInfo(totalPointsEarned) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (totalPointsEarned >= lvl.minPoints) current = lvl
    else break
  }
  return current
}

export function getNextLevel(totalPointsEarned) {
  const current = getLevelInfo(totalPointsEarned)
  const next = LEVELS.find(l => l.level === current.level + 1)
  return next || null
}

export function getLevelProgress(totalPointsEarned) {
  const current = getLevelInfo(totalPointsEarned)
  const next = getNextLevel(totalPointsEarned)
  if (!next) return { current, next: null, progress: 100, pointsInLevel: 0, pointsNeeded: 0 }

  const pointsInLevel = totalPointsEarned - current.minPoints
  const pointsNeeded = next.minPoints - current.minPoints
  const progress = Math.min((pointsInLevel / pointsNeeded) * 100, 100)

  return { current, next, progress, pointsInLevel, pointsNeeded, totalPointsEarned }
}

export function LevelBadge({ level, size = 'sm' }) {
  const info = LEVELS.find(l => l.level === level) || LEVELS[0]
  const sizes = {
    xs: { w: 18, h: 18, font: '8px' },
    sm: { w: 24, h: 24, font: '10px' },
    md: { w: 32, h: 32, font: '13px' },
    lg: { w: 44, h: 44, font: '16px' },
  }
  const s = sizes[size] || sizes.sm

  return (
    <div
      style={{
        width: s.w, height: s.h,
        background: `${info.color}25`,
        border: `2px solid ${info.color}60`,
        color: info.color,
        fontSize: s.font,
        fontWeight: 900,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
        flexShrink: 0,
      }}
      title={`Level ${info.level} — ${info.title}`}
    >
      {info.level}
    </div>
  )
}
