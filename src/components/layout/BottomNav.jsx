import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, Wallet, Trophy, User } from 'lucide-react'

const items = [
  { to: '/feed', icon: Home, label: 'Feed' },
  { to: '/post-task', icon: PlusCircle, label: 'Post' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/leaderboard', icon: Trophy, label: 'Board' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg/80 backdrop-blur-xl border-t border-white/5 z-50 safe-area-bottom pb-env-bottom shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around py-2">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all
              ${isActive ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(124,111,247,0.5)]' : 'text-text-muted hover:text-white'}`
            }
          >
            <item.icon size={22} strokeWidth={isActive => isActive ? 2.5 : 1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
