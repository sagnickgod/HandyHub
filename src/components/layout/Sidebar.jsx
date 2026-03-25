import { NavLink, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, Wallet, Trophy, Award, User, Bell, Shield, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { to: '/feed', icon: Home, label: 'Feed' },
  { to: '/post-task', icon: PlusCircle, label: 'Post Task' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/badges', icon: Award, label: 'Badges' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
]

export default function Sidebar() {
  const { isAdmin } = useAuth()
  const { unreadCount } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface/50 backdrop-blur-2xl border-r border-border z-40 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <div
        className="flex items-center gap-3 px-6 py-5 cursor-pointer"
        onClick={() => navigate('/feed')}
      >
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
          H
        </div>
        <span className="font-heading text-xl font-bold text-text">HandyHub</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group
              ${isActive
                ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-2 border-primary'
                : 'text-text-muted hover:bg-white/5 hover:text-text border-l-2 border-transparent'}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.badge && unreadCount > 0 && (
              <span className="ml-auto bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group mt-4
              ${isActive
                ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-2 border-primary'
                : 'text-text-muted hover:bg-white/5 hover:text-text border-l-2 border-transparent'}`
            }
          >
            <Shield size={20} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-text transition-all w-full"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  )
}
