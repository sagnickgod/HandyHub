import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Zap, Clock, Star, LayoutGrid, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTasks, useUserApplications } from '../hooks/useTasks'
import TaskCard from '../components/tasks/TaskCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import PointsDisplay from '../components/ui/PointsDisplay'

const CATEGORY_COLORS = {
  coding: 'from-violet-500 to-indigo-600',
  study: 'from-blue-500 to-cyan-600',
  physical: 'from-orange-500 to-red-600',
  creative: 'from-pink-500 to-rose-600',
  event: 'from-emerald-500 to-teal-600',
  tech: 'from-amber-500 to-yellow-600',
}

const URGENCY_CONFIG = {
  high: { label: 'HIGH URGENCY', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  medium: { label: 'MED URGENCY', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  low: { label: 'LOW URGENCY', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

const FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'matches', label: 'Matches My Skills', icon: Star },
  { id: 'urgent', label: 'Urgent', icon: Flame, dot: 'bg-red-500' },
  { id: 'deadline', label: 'Deadline Soon', icon: Clock, dot: 'bg-amber-500' },
  { id: 'highReward', label: 'High Reward (150+)', icon: Zap, dot: 'bg-amber-400' },
]

function FeaturedTaskCard({ task, applied, currentUserId }) {
  const navigate = useNavigate()
  const gradClass = CATEGORY_COLORS[task.category] || 'from-violet-500 to-indigo-600'

  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-[#17171D] cursor-pointer group col-span-1 md:col-span-2 row-span-2"
      onClick={() => navigate(`/tasks/${task.id}`)}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background gradient blob */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradClass} opacity-20 blur-3xl`} />
      
      <div className="relative z-10 p-8 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 bg-white/10 border border-white/10 text-white/80 text-xs font-bold rounded-full uppercase tracking-widest">
            Featured Task
          </span>
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-full uppercase tracking-widest">
            Premium Reward
          </span>
        </div>

        <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
          {task.title}
        </h2>
        <p className="text-white/50 text-base leading-relaxed mb-8 flex-1">
          {task.description?.slice(0, 160)}...
        </p>

        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Reward</p>
            <PointsDisplay amount={task.points_reward} size="lg" />
          </div>
          {task.duration && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Duration</p>
              <p className="text-white font-bold">{task.duration}</p>
            </div>
          )}
          {task.experience && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Experience</p>
              <p className="text-primary font-bold">{task.experience}</p>
            </div>
          )}
        </div>

        <button className="w-fit px-8 py-3.5 bg-white text-[#0A0A0F] font-black rounded-2xl hover:bg-white/90 transition-all shadow-lg text-sm tracking-wide">
          {applied ? '✓ Applied' : 'Apply for Task'}
        </button>
      </div>
    </motion.div>
  )
}

function MiniTaskCard({ task, applied, currentUserId, index }) {
  const navigate = useNavigate()
  const urgency = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.low
  const catLabel = task.category?.charAt(0).toUpperCase() + task.category?.slice(1) || 'Task'

  return (
    <motion.div
      className="group relative bg-[#17171D] hover:bg-[#1C1C24] rounded-2xl p-5 cursor-pointer transition-all duration-200 border border-white/[0.04] hover:border-white/[0.08] hover:shadow-lg hover:shadow-primary/5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => navigate(`/tasks/${task.id}`)}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-md">
          {catLabel}
        </span>
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md border ${urgency.color}`}>
          {urgency.label}
        </span>
        <div className="ml-auto">
          <PointsDisplay amount={task.points_reward} size="sm" />
        </div>
      </div>

      <h3 className="font-heading text-white font-bold text-base leading-snug mb-2 group-hover:text-primary/90 transition-colors line-clamp-2">
        {task.title}
      </h3>
      <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-4">
        {task.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
            {task.profiles?.full_name?.[0] || '?'}
          </div>
          <div>
            <p className="text-white/60 text-[11px] font-semibold leading-none">{task.profiles?.full_name || 'Anonymous'}</p>
            {task.deadline && (
              <p className="text-white/30 text-[10px] mt-0.5">
                {(() => {
                  const d = new Date(task.deadline)
                  const diff = Math.ceil((d - Date.now()) / 86400000)
                  return diff <= 0 ? 'Due today' : `${diff}d left`
                })()}
              </p>
            )}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
          <svg className="w-3.5 h-3.5 text-white/40 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </motion.div>
  )
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const filters = {}
  if (activeFilter === 'urgent') filters.urgency = 'high'
  if (activeFilter === 'deadline') filters.deadlineSoon = true
  if (activeFilter === 'highReward') filters.minPoints = 150
  if (sortBy === 'points') filters.sortBy = 'points'
  if (sortBy === 'urgency') filters.sortBy = 'urgency'
  if (search) filters.search = search
  filters.state = 'open'

  const { tasks, loading, hasMore, loadMore, setTasks } = useTasks(filters)
  const appliedTaskIds = useUserApplications(user?.id)

  let displayedTasks = tasks
  if (activeFilter === 'matches' && profile?.skills?.length > 0) {
    displayedTasks = tasks.filter(t => profile.skills.includes(t.category))
  }

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('feed-tasks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [setTasks])

  const featuredTask = displayedTasks.find(t => t.points_reward >= 500) || displayedTasks[0]
  const gridTasks = displayedTasks.filter(t => t !== featuredTask)

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Search bar */}
        <motion.div
          className={`relative mb-8 transition-all duration-300 ${searchFocused ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}
          layout
        >
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search tasks, skills, or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-white/5 border border-white/[0.07] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-white/25 focus:border-primary/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/10 outline-none transition-all"
          />
        </motion.div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {FILTERS.map(filter => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.id
            return (
              <motion.button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                    : 'bg-white/5 text-white/50 border-white/[0.06] hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {filter.dot && <span className={`w-1.5 h-1.5 rounded-full ${filter.dot}`} />}
                {!filter.dot && <Icon size={13} />}
                {filter.label}
              </motion.button>
            )
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading && displayedTasks.length === 0 ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingSpinner text="Loading tasks..." />
            </motion.div>
          ) : displayedTasks.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                title="No tasks found"
                description="Be the first to post one! Your campus needs you."
                action={
                  <button onClick={() => navigate('/post-task')} className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all">
                    Post a Task
                  </button>
                }
              />
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Top grid: Featured (large) + 2 mini cards */}
              {featuredTask && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 auto-rows-auto">
                  <FeaturedTaskCard
                    task={featuredTask}
                    applied={appliedTaskIds.has(featuredTask.id)}
                    currentUserId={user?.id}
                  />
                  <div className="flex flex-col gap-4">
                    {gridTasks.slice(0, 2).map((task, i) => (
                      <MiniTaskCard
                        key={task.id}
                        task={task}
                        applied={appliedTaskIds.has(task.id)}
                        currentUserId={user?.id}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(featuredTask ? gridTasks.slice(2) : displayedTasks).map((task, i) => (
                  <MiniTaskCard
                    key={task.id}
                    task={task}
                    applied={appliedTaskIds.has(task.id)}
                    currentUserId={user?.id}
                    index={i}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/[0.06] rounded-2xl text-sm font-semibold transition-all disabled:opacity-40"
                  >
                    {loading ? 'Loading...' : 'Load More Tasks'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => navigate('/post-task')}
        className="fixed bottom-24 lg:bottom-8 right-6 flex items-center gap-2.5 px-5 py-3.5 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 font-bold text-sm hover:bg-primary/90 transition-all z-30"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Plus size={18} />
        Post Task
      </motion.button>
    </div>
  )
}
