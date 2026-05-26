import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Link2, X, Share2 } from 'lucide-react'
import { useToast } from '../components/ui/Toast'

const CATEGORY_COLORS = {
  coding: '#7C6FF7', study: '#38BDF8', tech: '#FBBF24',
  physical: '#FB923C', event: '#34D399', creative: '#F472B6', other: '#94A3B8'
}

export default function CertificateModal({ task, helperName, pointsEarned, onClose }) {
  const canvasRef = useRef(null)
  const { addToast } = useToast()
  const [imageUrl, setImageUrl] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 800, H = 450
    canvas.width = W
    canvas.height = H

    // Background
    ctx.fillStyle = '#0F0F13'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Glowing border
    const catColor = CATEGORY_COLORS[task.category] || '#7C6FF7'
    ctx.strokeStyle = catColor + '60'
    ctx.lineWidth = 3
    ctx.shadowColor = catColor
    ctx.shadowBlur = 20
    const r = 20
    ctx.beginPath()
    ctx.moveTo(r + 8, 8)
    ctx.lineTo(W - r - 8, 8)
    ctx.quadraticCurveTo(W - 8, 8, W - 8, r + 8)
    ctx.lineTo(W - 8, H - r - 8)
    ctx.quadraticCurveTo(W - 8, H - 8, W - r - 8, H - 8)
    ctx.lineTo(r + 8, H - 8)
    ctx.quadraticCurveTo(8, H - 8, 8, H - r - 8)
    ctx.lineTo(8, r + 8)
    ctx.quadraticCurveTo(8, 8, r + 8, 8)
    ctx.stroke()
    ctx.shadowBlur = 0

    // HandyHub Logo
    ctx.font = 'bold 24px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#7C6FF7'
    ctx.fillText('🤝 HandyHub', 40, 55)
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('Campus Task Economy', 40, 75)

    // Certificate badge
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.textAlign = 'right'
    ctx.fillText('ACHIEVEMENT CERTIFICATE', W - 40, 50)
    ctx.textAlign = 'left'

    // Category chip
    const chipText = (task.category || 'other').toUpperCase()
    ctx.font = 'bold 11px Inter, system-ui, sans-serif'
    const chipW = ctx.measureText(chipText).width + 24
    ctx.fillStyle = catColor + '25'
    const chipX = 40, chipY = 130
    ctx.beginPath()
    ctx.roundRect(chipX, chipY, chipW, 26, 8)
    ctx.fill()
    ctx.fillStyle = catColor
    ctx.fillText(chipText, chipX + 12, chipY + 17)

    // Task title
    ctx.font = 'bold 26px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    // Word wrap
    const words = (task.title || 'Task Completed').split(' ')
    let line = '', y = 195
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > W - 80 && line) {
        ctx.fillText(line.trim(), 40, y)
        line = word + ' '
        y += 36
      } else {
        line = test
      }
    }
    ctx.fillText(line.trim(), 40, y)

    // Divider
    const divY = y + 40
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(40, divY); ctx.lineTo(W - 40, divY); ctx.stroke()

    // Bottom info
    const bottomY = divY + 40
    ctx.font = '14px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(`Helped by`, 40, bottomY)
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(helperName, 40 + ctx.measureText('Helped by ').width + 5, bottomY)

    // Points
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#FBBF24'
    const ptsText = `🪙 ${pointsEarned} pts`
    ctx.fillText(ptsText, 40, bottomY + 30)

    // Date
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    const dateStr = new Date(task.completed_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    ctx.textAlign = 'right'
    ctx.fillText(dateStr, W - 40, bottomY + 30)
    ctx.textAlign = 'left'

    setImageUrl(canvas.toDataURL('image/png'))
  }, [task, helperName, pointsEarned])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.download = `handyhub-certificate-${task.id?.slice(0, 8) || 'cert'}.png`
    link.href = imageUrl
    link.click()
    addToast('Image downloaded!', 'success')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`)
    addToast('Link copied!', 'success')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const blob = await (await fetch(imageUrl)).blob()
        const file = new File([blob], 'handyhub-certificate.png', { type: 'image/png' })
        await navigator.share({ title: 'HandyHub Achievement', text: `Just earned ${pointsEarned} pts on HandyHub! 🔥`, files: [file] })
      } catch { /* User cancelled */ }
    } else {
      handleCopyLink()
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-2xl rounded-3xl p-6 z-10"
          style={{ background: '#17171D', border: '1px solid rgba(124,111,247,0.15)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">🏆 Your Achievement</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
          </div>

          {/* Canvas Preview */}
          <div className="rounded-2xl overflow-hidden border border-white/10 mb-5">
            <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '800/450' }} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button onClick={handleDownload} whileTap={{ scale: 0.95 }}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)' }}>
              <Download size={16} /> Download Image
            </motion.button>
            <motion.button onClick={handleShare} whileTap={{ scale: 0.95 }}
              className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Share2 size={16} /> Share
            </motion.button>
            <motion.button onClick={handleCopyLink} whileTap={{ scale: 0.95 }}
              className="py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Link2 size={16} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
