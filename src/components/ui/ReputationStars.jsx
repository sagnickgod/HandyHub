export default function ReputationStars({ score, size = 'sm' }) {
  const stars = []
  const rounded = Math.round((score || 0) * 2) / 2

  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars.push(<span key={i} className="text-accent">★</span>)
    } else if (i - 0.5 === rounded) {
      stars.push(<span key={i} className="text-accent opacity-60">★</span>)
    } else {
      stars.push(<span key={i} className="text-text-muted/30">★</span>)
    }
  }

  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }

  return (
    <span className={`inline-flex items-center gap-0.5 ${sizes[size]}`}>
      {stars}
      {score > 0 && <span className="text-text-muted text-xs ml-1">({Number(score).toFixed(1)})</span>}
    </span>
  )
}
