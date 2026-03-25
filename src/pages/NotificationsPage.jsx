import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Bell, Award, MessageSquare, Zap, UserCheck, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '../context/NotificationContext'

const TYPE_CONFIG = {
  application:     { icon: MessageSquare, color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  selected:        { icon: UserCheck,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  approved:        { icon: Award,         color: 'text-primary',     bg: 'bg-primary/10 border-primary/20' },
  rejected:        { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  proof_submitted: { icon: CheckCheck,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  new_task:        { icon: Zap,           color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  bonus:           { icon: Award,         color: 'text-primary',     bg: 'bg-primary/10 border-primary/20' },
  dispute:         { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
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
    <div className="min-h-screen bg-[#0A0A0F] pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-8">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-black text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center w-6 h-6 bg-primary text-white text-xs font-black rounded-full">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary font-bold hover:text-primary/70 transition-colors flex items-center gap-1.5"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-white/20" />
            </div>
            <p className="text-white/40 font-semibold">You're all caught up!</p>
            <p className="text-white/20 text-sm mt-1">Nothing new right now.</p>
          </div>
        ) : (
          <AnimatePresence>
            {Object.entries(groups).map(([label, items]) => {
              if (items.length === 0) return null
              return (
                <motion.div key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
                  <h3 className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3 px-1">{label}</h3>
                  <div className="bg-[#17171D] border border-white/[0.05] rounded-3xl overflow-hidden">
                    {items.map((n, i) => {
                      const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: 'text-white/40', bg: 'bg-white/5 border-white/10' }
                      const Icon = cfg.icon
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleClick(n)}
                          className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-all border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] ${!n.is_read ? 'bg-primary/[0.04]' : ''}`}
                        >
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                            <Icon size={14} className={cfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.is_read ? 'text-white font-semibold' : 'text-white/60 font-medium'}`}>{n.title}</p>
                            {n.body && <p className="text-white/30 text-xs mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>}
                            <p className="text-white/20 text-xs mt-1.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
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
