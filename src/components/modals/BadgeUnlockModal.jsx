import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function BadgeUnlockModal({ isOpen, badge, onClose }) {
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    if (isOpen) {
      const pieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        color: ['#7C6FF7', '#F59E0B', '#10B981', '#EC4899', '#3B82F6'][Math.floor(Math.random() * 5)],
        size: Math.random() * 8 + 4
      }))
      setConfetti(pieces)
      const timer = setTimeout(() => onClose?.(), 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          {/* Confetti */}
          {confetti.map(p => (
            <div
              key={p.id}
              className="absolute top-0 rounded-full"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                animation: `confetti-fall ${2 + p.delay}s ease-in ${p.delay}s forwards`
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            className="text-center"
          >
            <div
              className="text-7xl mb-4 animate-badge-unlock"
              style={{ filter: `drop-shadow(0 0 20px ${badge.color})` }}
            >
              {badge.icon}
            </div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-heading text-2xl font-bold text-accent mb-2"
            >
              Badge Unlocked!
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg font-bold text-text mb-1"
            >
              {badge.name}
            </motion.p>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-text-muted"
            >
              {badge.description}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
