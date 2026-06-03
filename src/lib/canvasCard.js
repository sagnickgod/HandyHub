/**
 * Generates an 800x450px achievement card using HTML5 Canvas API
 *
 * @param {Object} options
 * @param {string} options.username - The user's name or username
 * @param {'task'|'badge'|'level'} options.type - Type of achievement
 * @param {string} options.emoji - Large icon emoji to render
 * @param {string} options.title - The title of the achievement (e.g. "Task Completed ✅")
 * @param {string} options.subtitle - Description (e.g. "Helped debug React code")
 * @param {string} [options.pointsText] - Points text (e.g. "+150 coins earned")
 * @returns {HTMLCanvasElement} Ready to export canvas
 */
export function drawAchievementCard({ username, type, emoji, title, subtitle, pointsText }) {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 450
  const ctx = canvas.getContext('2d')

  // Theme Colors
  const colors = {
    task: '#7C6FF7',   // Indigo
    badge: '#F59E0B',  // Gold
    level: '#EF4444',  // Red-orange
  }
  const themeColor = colors[type] || '#7C6FF7'

  // 1. Dark Background (#0F0F13)
  ctx.fillStyle = '#0F0F13'
  ctx.fillRect(0, 0, 800, 450)

  // 2. Ambient background gradients
  const glowGrad = ctx.createRadialGradient(400, 225, 50, 400, 225, 300)
  glowGrad.addColorStop(0, `${themeColor}15`)
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, 800, 450)

  // 3. Dot Grid Pattern in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  const dotSpacing = 30
  for (let x = 15; x < 800; x += dotSpacing) {
    for (let y = 15; y < 450; y += dotSpacing) {
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 4. Subtle Particle Dots (30-40 circles)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  for (let i = 0; i < 35; i++) {
    // Deterministic random particles based on string lengths to avoid changing every frame
    const randX = Math.abs(Math.sin(i * 123.45)) * 800
    const randY = Math.abs(Math.cos(i * 678.90)) * 450
    const randR = 1.5 + (Math.sin(i) + 1) * 2
    ctx.beginPath()
    ctx.arc(randX, randY, randR, 0, Math.PI * 2)
    ctx.fill()
  }

  // 5. Glowing Rectangular Border
  // Outer blur glow shadow
  ctx.save()
  ctx.shadowColor = themeColor
  ctx.shadowBlur = 24
  ctx.strokeStyle = themeColor
  ctx.lineWidth = 4
  ctx.strokeRect(30, 30, 740, 390)
  ctx.restore()

  // Inner thin border for crisp finish
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.strokeRect(34, 34, 732, 382)

  // 6. Top Left: "HandyHub" Logo Text
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 24px "Space Grotesk", sans-serif'
  ctx.fillText('HandyHub', 60, 80)

  // "Campus Economy" badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.font = '700 12px "Space Grotesk", sans-serif'
  ctx.fillText('CAMPUS INFRASTRUCTURE', 180, 77)

  // 7. Center: Large Emoji Icon
  ctx.font = '80px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji || '🏆', 400, 180)

  // 8. Below Icon: Title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 32px "Space Grotesk", sans-serif'
  ctx.fillText(title, 400, 270)

  // 9. Subtext: subtitle + pointsText
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '600 16px "DM Sans", sans-serif'
  ctx.fillText(subtitle, 400, 310)

  if (pointsText) {
    ctx.fillStyle = '#F59E0B' // Golden color
    ctx.font = '800 18px "Space Grotesk", sans-serif'
    ctx.fillText(pointsText, 400, 345)
  }

  // 10. Bottom: Username + Date + Domain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.font = '700 13px "Space Grotesk", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`@${username.toLowerCase()}`, 60, 385)

  ctx.textAlign = 'right'
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  ctx.fillText(dateStr, 740, 385)

  // Website watermark in center-bottom
  ctx.fillStyle = `${themeColor}A0`
  ctx.font = '700 12px "Space Grotesk", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('handyhub.vercel.app', 400, 385)

  return canvas
}

/**
 * Downloads a canvas achievement card as a PNG image
 */
export function downloadCanvasCard(canvas, filename = 'achievement.png') {
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (err) {
    console.error('[canvasCard] Failed to download card:', err)
    return false
  }
}

/**
 * Shares achievement details natively on mobile
 */
export async function shareCanvasCard(canvas, { title, text }) {
  try {
    if (navigator.share) {
      // Try to convert canvas to a blob for direct sharing if supported
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], 'achievement.png', { type: 'image/png' })

      const shareData = {
        title,
        text,
        url: window.location.origin,
      }

      // Check if file sharing is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file]
      }

      await navigator.share(shareData)
      return true
    }
    return false
  } catch (err) {
    console.error('[canvasCard] Web Share failed:', err)
    return false
  }
}
