import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Zap, Clock, Star, LayoutGrid, Flame, ArrowRight, Sparkles, Megaphone, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTasks, useUserApplications } from '../hooks/useTasks'
import TaskCard from '../components/tasks/TaskCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import PointsDisplay from '../components/ui/PointsDisplay'
import MyTasksView from '../components/feed/MyTasksView'
import PollCard from '../components/feed/PollCard'

const CATEGORY_COLORS = {
  coding:   { from: '#7C6FF7', to: '#4F46E5', text: 'CODING' },
  study:    { from: '#38BDF8', to: '#0EA5E9', text: 'STUDY' },
  physical: { from: '#FB923C', to: '#EF4444', text: 'PHYSICAL' },
  creative: { from: '#F472B6', to: '#EC4899', text: 'CREATIVE' },
  event:    { from: '#34D399', to: '#10B981', text: 'EVENT' },
  tech:     { from: '#FBBF24', to: '#F59E0B', text: 'TECH' },
}

const URGENCY_CONFIG = {
  high:   { label: 'HIGH URGENCY',   color: 'text-red-400',     bg: 'bg-red-500/[0.08]',   border: 'border-red-500/20',   dot: '#EF4444' },
  medium: { label: 'MED URGENCY',    color: 'text-amber-400',   bg: 'bg-amber-500/[0.08]', border: 'border-amber-500/20', dot: '#F59E0B' },
  low:    { label: 'LOW URGENCY',    color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]',border: 'border-emerald-500/20',dot:'#34D399' },
}

const FILTERS = [
  { id: 'all',        label: 'All',               icon: LayoutGrid },
  { id: 'matches',   label: 'Matches My Skills',  icon: Star },
  { id: 'urgent',    label: 'Urgent',             icon: Flame,    dot: '#EF4444' },
  { id: 'deadline',  label: 'Deadline Soon',      icon: Clock,    dot: '#F59E0B' },
  { id: 'highReward',label: 'High Reward (150+)', icon: Zap,      dot: '#FBBF24' },
]

function FeaturedTaskCard({ task, applied }) {
  const navigate = useNavigate()
  const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.coding

  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl cursor-pointer group col-span-1 md:col-span-2 row-span-2"
      onClick={() => navigate(`/tasks/${task.id}`)}
      whileHover={{ scale: 1.01, y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ background: 'linear-gradient(135deg, #17171D 0%, #13131A 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* 3D glow blob */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl opacity-25 transition-all duration-500 group-hover:opacity-40"
        style={{ background: `radial-gradient(circle, ${cat.from}, ${cat.to})` }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-10"
        style={{ background: `radial-gradient(circle, ${cat.to}, transparent)` }} />

      {/* Shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 p-8 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-5 z-20 relative">
          {task.is_featured && (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-lg flex items-center gap-1"
              style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.5)', color: '#FBBF24' }}>
              <Star size={10} fill="currentColor" /> Featured
            </span>
          )}
          {task.is_premium && (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-lg flex items-center gap-1 bg-gradient-to-r from-amber-400 to-violet-500 text-white"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              <Sparkles size={10} /> Premium
            </span>
          )}
        </div>

        <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
          {task.title}
        </h2>
        <p className="text-white/45 text-sm leading-relaxed mb-8 flex-1 line-clamp-3">
          {task.description}
        </p>

        <div className="flex flex-wrap items-center gap-6 mb-8 relative z-20">
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.12em] mb-1.5">Reward</p>
            <PointsDisplay amount={task.points_offered} size="lg" animated={true} />
          </div>
          {task.duration && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-[0.12em] mb-1.5">Duration</p>
              <p className="text-white font-bold text-sm">{task.duration}</p>
            </div>
          )}
          {task.experience && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-[0.12em] mb-1.5">Experience</p>
              <p className="font-bold text-sm" style={{ color: cat.from }}>{task.experience}</p>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="w-fit flex items-center gap-2 px-7 py-3.5 bg-white text-[#0A0A0F] font-black rounded-2xl text-sm tracking-wide shadow-xl"
        >
          {applied ? '✓ Applied' : 'Apply for Task'}
          {!applied && <ArrowRight size={15} />}
        </motion.button>
      </div>
    </motion.div>
  )
}

function MiniTaskCard({ task, applied, index }) {
  const navigate = useNavigate()
  const urgency = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.low
  const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.coding
  const catLabel = cat.text || task.category?.toUpperCase()
  const daysLeft = task.deadline ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const floatAnim = task.is_premium ? { y: [0, -4, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } : {}

  let glowStyle = {}
  if (task.urgency === 'low') glowStyle = { boxShadow: '0 0 20px rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', background: 'linear-gradient(135deg, rgba(34,197,94,0.02) 0%, rgba(20,20,24,1) 100%)' }
  else if (task.urgency === 'medium') glowStyle = { boxShadow: '0 0 20px rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(245,158,11,0.02) 0%, rgba(20,20,24,1) 100%)' }
  else if (task.urgency === 'high') glowStyle = { boxShadow: '0 0 25px rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', background: 'linear-gradient(135deg, rgba(239,68,68,0.02) 0%, rgba(20,20,24,1) 100%)' }
  else glowStyle = { background: 'linear-gradient(135deg, #17171D 0%, #141418 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }

  if (task.is_premium) {
    glowStyle = {
      background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(25,15,35,0.8))',
      boxShadow: '0 8px 32px rgba(168,85,247,0.2), 0 0 20px rgba(234,179,8,0.15)',
      border: '1px solid rgba(168,85,247,0.4)',
    }
  } else if (task.is_featured) {
    glowStyle = { ...glowStyle, borderColor: 'rgba(234,179,8,0.4)', boxShadow: '0 4px 20px rgba(234,179,8,0.1)', background: 'linear-gradient(135deg, rgba(234,179,8,0.05) 0%, rgba(20,20,24,1) 100%)' }
  }

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={task.is_premium ? "float" : { opacity: 1, y: 0 }}
      variants={{ float: floatAnim }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/tasks/${task.id}`)}
      whileHover={{ y: -3, scale: 1.01, zIndex: 10 }}
      style={glowStyle}
      onMouseEnter={e => {
        if (task.urgency === 'high' && !task.is_premium && !task.is_featured) e.currentTarget.style.boxShadow = '0 0 40px rgba(239,68,68,0.3)'
        else if (task.is_premium) e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.4), 0 0 30px rgba(234,179,8,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = glowStyle.boxShadow
      }}
    >
      {/* Badges Overlay Container */}
      <div className="absolute top-0 right-0 p-3 flex gap-1.5 z-20 pointer-events-none">
        {task.is_premium && (
          <span className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-violet-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg">
            <Sparkles size={8} /> Premium
          </span>
        )}
        {task.is_featured && !task.is_premium && (
          <span className="flex items-center gap-1 bg-amber-400 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg">
            <Star size={8} fill="currentColor" /> Featured
          </span>
        )}
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px rgba(124,111,247,0.15), 0 0 40px rgba(124,111,247,0.05)` }} />
      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${cat.from}40, transparent)` }} />

      <div className="p-5">
        {/* Tags row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em]"
            style={{ background: `${cat.from}15`, border: `1px solid ${cat.from}25`, color: cat.from }}>
            {catLabel}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em] ${urgency.color} ${urgency.bg} border ${urgency.border}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: urgency.dot }} />
            {urgency.label}
          </span>
          <div className="ml-auto z-20">
            <PointsDisplay amount={task.points_offered} size="sm" animated={true} />
          </div>
        </div>

        <h3 className="font-heading text-white font-bold text-sm leading-snug mb-2 group-hover:text-white transition-colors line-clamp-2"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {task.title}
        </h3>
        <p className="text-white/35 text-xs leading-relaxed line-clamp-2 mb-4">
          {task.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}>
              {(task.poster?.full_name || task.profiles?.full_name)?.[0] || '?'}
            </div>
            <div>
              <p className="text-white/55 text-[11px] font-semibold leading-none">{(task.poster?.full_name || task.profiles?.full_name) || 'Anonymous'}</p>
              {daysLeft !== null && (
                <p className="text-white/25 text-[10px] mt-0.5">
                  {daysLeft <= 0 ? '⚠ Due today' : `${daysLeft}d left`}
                </p>
              )}
            </div>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={false}
              animate={{ x: 0 }}
              whileHover={{ x: 2 }}
            >
              <ArrowRight size={12} className="text-white/40 group-hover:text-white/80 transition-colors" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('points')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [feedMode, setFeedMode] = useState('explore') // 'explore' | 'my_tasks'
  const [polls, setPolls] = useState([])
  const [noticeCount, setNoticeCount] = useState(0)
  const [showNoticeBanner, setShowNoticeBanner] = useState(true)

  // Fetch active polls
  useEffect(() => {
    supabase.from('polls').select('*').gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setPolls(data || []))
  }, [])

  // Fetch notice count
  useEffect(() => {
    supabase.from('notices').select('id', { count: 'exact', head: true })
      .eq('is_active', true).gt('expires_at', new Date().toISOString())
      .then(({ count }) => setNoticeCount(count || 0))
  }, [])

  // Auto-expire tasks past their deadline and refund poster 100%
  useEffect(() => {
    const expireOverdueTasks = async () => {
      const { data: expired } = await supabase
        .from('tasks')
        .select('id, poster_id, points_offered, title')
        .eq('state', 'open')
        .lt('deadline', new Date().toISOString())
        .not('deadline', 'is', null)
      if (!expired || expired.length === 0) return
      for (const t of expired) {
        await supabase.from('tasks').update({ state: 'expired' }).eq('id', t.id)
        // Refund 100% escrowed coins
        const { data: poster } = await supabase.from('profiles').select('points_balance, escrow_balance').eq('id', t.poster_id).single()
        if (poster) {
          await supabase.from('profiles').update({
            points_balance: (poster.points_balance || 0) + t.points_offered,
            escrow_balance: Math.max(0, (poster.escrow_balance || 0) - t.points_offered)
          }).eq('id', t.poster_id)
          await supabase.from('point_transactions').insert({
            user_id: t.poster_id, type: 'refund', amount: t.points_offered,
            description: `Auto-refund: "${t.title}" expired`, task_id: t.id
          })
          await supabase.from('notifications').insert({
            user_id: t.poster_id, type: 'task_expired',
            title: `Task "${t.title}" expired`,
            body: `Your ${t.points_offered} coins have been fully refunded.`,
            link: `/tasks/${t.id}`
          })
        }
      }
    }
    expireOverdueTasks()
  }, [])

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

  // Custom sort out the fetched tasks to ALWAYS put premium then featured first if mode is explore
  let autoBoostedTasks = [...displayedTasks].sort((a, b) => {
    if (a.is_premium && !b.is_premium) return -1
    if (!a.is_premium && b.is_premium) return 1
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return 0 // Keep relative order (handled by supabase 'points' or 'newest')
  })

  // The featured task hero gets the top premium or featured
  const featuredTask = autoBoostedTasks.find(t => t.is_premium || t.is_featured) || autoBoostedTasks[0]
  const gridTasks = autoBoostedTasks.filter(t => t !== featuredTask)

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #7C6FF7, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-6 lg:pt-8">

        {/* Notices Banner */}
        {showNoticeBanner && noticeCount > 0 && feedMode === 'explore' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 rounded-2xl flex items-center justify-between cursor-pointer group"
            style={{ background: 'rgba(124,111,247,0.08)', border: '1px solid rgba(124,111,247,0.2)' }}
            onClick={() => navigate('/notices')}
          >
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-violet-400" />
              <span className="text-sm text-violet-300 font-bold">📢 {noticeCount} new notice{noticeCount !== 1 ? 's' : ''}</span>
              <span className="text-xs text-white/30">— Tap to view</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowNoticeBanner(false) }} className="text-white/25 hover:text-white/50 p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}

        {/* Top-level mode toggle */}
        <div className="flex gap-2 p-1.5 mb-7 rounded-2xl w-fit mx-auto md:mx-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
          <button
            onClick={() => setFeedMode('explore')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
            style={{
              color: feedMode === 'explore' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: feedMode === 'explore' ? 'linear-gradient(135deg, rgba(124,111,247,0.8), rgba(91,82,229,0.8))' : 'transparent',
              boxShadow: feedMode === 'explore' ? '0 4px 16px rgba(124,111,247,0.3)' : 'none'
            }}
          >
            Marketplace
          </button>
          <button
            onClick={() => setFeedMode('my_tasks')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
            style={{
              color: feedMode === 'my_tasks' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: feedMode === 'my_tasks' ? 'linear-gradient(135deg, rgba(124,111,247,0.8), rgba(91,82,229,0.8))' : 'transparent',
              boxShadow: feedMode === 'my_tasks' ? '0 4px 16px rgba(124,111,247,0.3)' : 'none'
            }}
          >
            My Tasks
          </button>
        </div>

        {feedMode === 'my_tasks' ? (
          <MyTasksView />
        ) : (
          <>
        {/* Search bar */}
        <motion.div
          layout
          className={`relative mb-6 transition-all duration-300 ${searchFocused ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}
        >
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, skills, keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-11 pr-5 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-300"
            style={{
              background: searchFocused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
              border: searchFocused ? '1px solid rgba(124,111,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              boxShadow: searchFocused ? '0 0 0 4px rgba(124,111,247,0.08)' : 'none'
            }}
          />
        </motion.div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-7 scrollbar-hide">
          {FILTERS.map((filter, i) => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.id
            return (
              <motion.button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                whileTap={{ scale: 0.94 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid rgba(124,111,247,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                  boxShadow: isActive ? '0 4px 20px rgba(124,111,247,0.3)' : 'none'
                }}
              >
                {filter.dot ? <span className="w-2 h-2 rounded-full" style={{ background: filter.dot }} /> : <Icon size={12} />}
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
                  <button onClick={() => navigate('/post-task')}
                    className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)' }}>
                    Post a Task
                  </button>
                }
              />
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Top grid */}
              {featuredTask && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <FeaturedTaskCard task={featuredTask} applied={appliedTaskIds.has(featuredTask.id)} currentUserId={user?.id} />
                  <div className="flex flex-col gap-4">
                    {gridTasks.slice(0, 2).map((task, i) => (
                      <MiniTaskCard key={task.id} task={task} applied={appliedTaskIds.has(task.id)} currentUserId={user?.id} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular grid with interleaved polls */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(featuredTask ? gridTasks.slice(2) : displayedTasks).map((task, i) => {
                  const items = []
                  // Interleave a poll card every 4th item
                  if (i > 0 && i % 4 === 0) {
                    const pollIdx = Math.floor(i / 4) - 1
                    if (polls[pollIdx]) {
                      items.push(
                        <div key={`poll-${polls[pollIdx].id}`} className="md:col-span-2 xl:col-span-1">
                          <PollCard poll={polls[pollIdx]} />
                        </div>
                      )
                    }
                  }
                  items.push(
                    <MiniTaskCard key={task.id} task={task} applied={appliedTaskIds.has(task.id)} currentUserId={user?.id} index={i} />
                  )
                  return items
                })}
              </div>

              {hasMore && (
                <div className="text-center mt-10">
                  <motion.button
                    onClick={loadMore}
                    disabled={loading}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-8 py-3 text-sm font-bold transition-all disabled:opacity-40"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      color: 'rgba(255,255,255,0.5)'
                    }}
                  >
                    {loading ? 'Loading...' : 'Load More Tasks'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => navigate('/post-task')}
        className="fixed bottom-24 lg:bottom-8 right-6 flex items-center gap-2 px-5 py-3.5 font-black text-sm text-white rounded-2xl z-30"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        style={{
          background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)',
          boxShadow: '0 8px 32px rgba(124,111,247,0.4)'
        }}
      >
        <Plus size={17} />
        Post Task
      </motion.button>
    </div>
  )
}
