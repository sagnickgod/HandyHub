import { useNavigate } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { useState } from 'react'

export default function Navbar({ onSearch }) {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch?.(query.trim())
      setSearchOpen(false)
    }
  }

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/feed')}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            H
          </div>
          <span className="font-heading text-lg font-bold text-text">HandyHub</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted transition-colors"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={handleSearch} className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search tasks..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full text-sm"
          />
        </form>
      )}
    </header>
  )
}
