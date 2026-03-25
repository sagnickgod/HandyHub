import { useEffect, useState } from 'react'

export default function PointsDisplay({ amount, size = 'md', animated = false }) {
  const [displayed, setDisplayed] = useState(animated ? 0 : amount)

  useEffect(() => {
    if (!animated || amount === 0) { setDisplayed(amount); return }
    let start = 0
    const duration = 800
    const increment = amount / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= amount) {
        setDisplayed(amount)
        clearInterval(timer)
      } else {
        setDisplayed(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [amount, animated])

  const sizes = {
    sm: 'text-sm font-semibold',
    md: 'text-xl font-bold',
    lg: 'text-4xl font-black'
  }

  return (
    <span className={`${sizes[size]} text-accent inline-flex items-center gap-1`}>
      🪙 {displayed.toLocaleString()}
    </span>
  )
}
