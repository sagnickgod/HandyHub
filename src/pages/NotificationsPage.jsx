import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Bell, Award, MessageSquare, Zap, UserCheck, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '../context/NotificationContext'

const TYPE_CONFIG = {
  application:     { icon: MessageSquare, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  selected:        { icon: UserCheck,     color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
  approved:        { icon: Award,         color: '#7C6FF7', bg: 'rgba(124,111,247,0.1)', border: 'rgba(124,111,247,0.2)' },
  rejected:        { icon: AlertTriangle, color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  proof_submitted: { icon: CheckCheck,    color: '#22D3EE', bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.2)' },
  new_task:        { icon: Zap,           color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)' },
  bonus:           { icon: Award,         color: '#7C6FF7', bg: 'rgba(124,111,247,0.1)', border: 'rgba(124,111,247,0.2)' },
  dispute:         { icon: AlertTriangle, color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications()

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups = { Today: [], Yesterday: [], Earlier: [] }
  notifications.forEach(n => {
    const d = new Date(n.created_at).toDateString()
    if (d === today) groups.Today.push(n)
    else if (d === yesterday) groups.Yesterday.push(n)
    else groups.Earlier.push(n)
  })

  const handleClick = (n) => {
    if (!n.is_read) markAsRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #7C6FF7, transparent)' }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-7"
        >
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-black text-white">Notifications</h1>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="flex items-center justify-center w-6 h-6 text-white text-xs font-black rounded-full"
                  style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)' }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {unreadCount > 0 && (
            <motion.button
              onClick={markAllAsRead}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-xs font-bold transition-colors px-3 py-1.5 rounded-xl"
              style={{ color: '#7C6FF7', background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.2)' }}
            >
              <CheckCheck size={12} />
              Mark all read
            </motion.button>
          )}
        </motion.div>

        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Bell size={28} className="text-white/15" />
            </div>
            <p className="text-white/40 font-bold text-base">You're all caught up!</p>
            <p className="text-white/20 text-sm mt-1">Nothing new right now.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {Object.entries(groups).map(([label, items]) => {
              if (items.length === 0) return null
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5"
                >
                  <p className="text-white/25 text-[10px] font-black uppercase tracking-[0.18em] mb-3 px-1">{label}</p>
                  <div className="overflow-hidden rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {items.map((n, i) => {
                      const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
                      const Icon = cfg.icon
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleClick(n)}
                          className="flex items-start gap-4 px-5 py-4.5 cursor-pointer transition-all relative"
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: !n.is_read ? 'rgba(124,111,247,0.03)' : 'transparent',
                            borderLeft: !n.is_read ? '2px solid rgba(124,111,247,0.4)' : '2px solid transparent'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = !n.is_read ? 'rgba(124,111,247,0.05)' : 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = !n.is_read ? 'rgba(124,111,247,0.03)' : 'transparent'}
                        >
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <Icon size={15} style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0 py-0.5">
                            <p className={`text-sm leading-snug ${!n.is_read ? 'text-white font-semibold' : 'text-white/55 font-medium'}`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-white/25 text-xs mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                            )}
                            <p className="text-white/15 text-[10px] mt-2 font-medium">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.is_read && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                              style={{ background: '#7C6FF7', boxShadow: '0 0 8px rgba(124,111,247,0.6)' }}
                            />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
