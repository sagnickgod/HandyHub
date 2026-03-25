import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import PointsDisplay from '../ui/PointsDisplay'

export default function Topbar() {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const { profile } = useAuth()
  
  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border w-full h-16 flex-shrink-0">
      <div className="flex items-center justify-between px-4 lg:px-8 h-full">
        {/* Left Side: Mobile Logo / Desktop empty or breadcrumbs */}
        <div className="flex items-center gap-3 lg:hidden">
          <div 
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm cursor-pointer" 
            onClick={() => navigate('/feed')}
          >
            H
          </div>
          <span className="font-heading text-lg font-bold text-text">HandyHub</span>
        </div>
        <div className="hidden lg:block bg-surface-2/50 px-3 py-1 rounded-full text-xs font-semibold text-text-muted border border-border">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
        </div>

        {/* Right Side: Points & Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Point Bar */}
          <button
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-2 bg-surface hover:bg-surface-2 transition-colors px-3 py-1.5 rounded-full border border-primary/30 shadow-[0_0_15px_rgba(124,111,247,0.15)] btn-press"
          >
            <PointsDisplay amount={profile?.points_balance || 0} size="sm" animated />
          </button>
          
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 w-10 h-10 rounded-full bg-surface hover:bg-surface-2 text-text-muted transition-colors relative border border-border flex items-center justify-center lg:hidden"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar (Desktop) */}
          <button 
            onClick={() => navigate('/profile')} 
            className="w-9 h-9 rounded-full overflow-hidden border border-border hidden lg:block hover:ring-2 ring-primary transition-all btn-press shadow-sm bg-surface-2"
          >
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'default'}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  )
}
