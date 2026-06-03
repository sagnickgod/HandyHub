import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Zap, Clock, Star, LayoutGrid, Flame, ArrowRight, Sparkles, Megaphone, X, Eye, Package, Gift, Calendar, AlertTriangle, Briefcase } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
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

const NOTICE_CATEGORIES = [
  { key: 'all', label: 'All', icon: Megaphone, color: '#7C6FF7' },
  { key: 'lost_found', label: 'Lost & Found', icon: Package, color: '#F59E0B' },
  { key: 'free_item', label: 'Free Item', icon: Gift, color: '#34D399' },
  { key: 'event', label: 'Event', icon: Calendar, color: '#38BDF8' },
  { key: 'alert', label: 'Alert', icon: AlertTriangle, color: '#EF4444' },
  { key: 'opportunity', label: 'Opportunity', icon: Briefcase, color: '#A855F7' },
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
  const { addToast } = useToast()
  const [notices, setNotices] = useState([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [noticeFilter, setNoticeFilter] = useState('all')
  const [showCreateNotice, setShowCreateNotice] = useState(false)
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', category: 'event' })
  const [postingNotice, setPostingNotice] = useState(false)

  const fetchNoticesList = useCallback(async () => {
    setNoticesLoading(true)
    let query = supabase
      .from('notices')
      .select('*, poster:profiles!poster_id(id, full_name, avatar_url, username)')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (noticeFilter !== 'all') query = query.eq('category', noticeFilter)

    const { data } = await query
    setNotices(data || [])
    setNoticesLoading(false)
  }, [noticeFilter])

  useEffect(() => {
    if (feedMode === 'notices') {
      fetchNoticesList()
    }
  }, [feedMode, fetchNoticesList])

  const handlePostNotice = async () => {
    if (!noticeForm.title.trim() || !noticeForm.body.trim()) return addToast('Fill in all fields', 'error')
    setPostingNotice(true)
    const { error } = await supabase.from('notices').insert({
      poster_id: user.id,
      title: noticeForm.title.trim(),
      body: noticeForm.body.trim(),
      category: noticeForm.category,
    })
    if (error) { addToast(error.message, 'error') }
    else { 
      addToast('Notice posted! 📢', 'success')
      setShowCreateNotice(false)
      setNoticeForm({ title: '', body: '', category: 'event' })
      fetchNoticesList()
      // Refresh count
      supabase.from('notices').select('id', { count: 'exact', head: true })
        .eq('is_active', true).gt('expires_at', new Date().toISOString())
        .then(({ count }) => setNoticeCount(count || 0))
    }
    setPostingNotice(false)
  }

  const incrementNoticeViews = async (id) => {
    await supabase.rpc('increment_notice_views', { notice_id: id }).catch(() => {
      supabase.from('notices').update({ views: supabase.sql`views + 1` }).eq('id', id).then(() => {})
    })
  }

  function getTimeLeft(expiresAt) {
    const diff = new Date(expiresAt) - new Date()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${mins}m left`
    return `${mins}m left`
  }

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

  // FIX: Wrapped the filters object in a useMemo hook
  // Now it only recalculates if activeFilter, sortBy, or search changes
  const memoizedFilters = useMemo(() => {
    const filtersObj = {}
    if (activeFilter === 'urgent') filtersObj.urgency = 'high'
    if (activeFilter === 'deadline') filtersObj.deadlineSoon = true
    if (activeFilter === 'highReward') filtersObj.minPoints = 150
    if (sortBy === 'points') filtersObj.sortBy = 'points'
    if (sortBy === 'urgency') filtersObj.sortBy = 'urgency'
    if (search) filtersObj.search = search
    filtersObj.state = 'open'
    return filtersObj
  }, [activeFilter, sortBy, search])

  // FIX: Passing the memoized object instead of a fresh one
  const { tasks, loading, hasMore, loadMore, setTasks } = useTasks(memoizedFilters)
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
            onClick={() => setFeedMode('notices')}
          >
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-violet-400" />
              <span className="text-sm text-violet-300 font-bold">📢 {noticeCount} new notices today</span>
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
          <button
            onClick={() => setFeedMode('notices')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden flex items-center gap-1.5"
            style={{
              color: feedMode === 'notices' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: feedMode === 'notices' ? 'linear-gradient(135deg, rgba(124,111,247,0.8), rgba(91,82,229,0.8))' : 'transparent',
              boxShadow: feedMode === 'notices' ? '0 4px 16px rgba(124,111,247,0.3)' : 'none'
            }}
          >
            Notices {noticeCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white font-black">{noticeCount}</span>}
          </button>
        </div>

        {feedMode === 'my_tasks' ? (
          <MyTasksView />
        ) : feedMode === 'notices' ? (
          <div className="space-y-6">
            {/* Notices feed header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-heading text-2xl font-black text-white flex items-center gap-2">📢 Notices Feed</h2>
                <p className="text-white/40 text-sm mt-1">Stay updated with active student announcements</p>
              </div>
              <motion.button onClick={() => setShowCreateNotice(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
                <Plus size={16} /> Post Notice
              </motion.button>
            </motion.div>

            {/* Notice Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {NOTICE_CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setNoticeFilter(c.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    background: noticeFilter === c.key ? `${c.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${noticeFilter === c.key ? `${c.color}40` : 'rgba(255,255,255,0.06)'}`,
                    color: noticeFilter === c.key ? c.color : 'rgba(255,255,255,0.4)',
                  }}>
                  <c.icon size={13} /> {c.label}
                </button>
              ))}
            </div>

            {/* Notices Grid */}
            {noticesLoading ? (
              <LoadingSpinner text="Loading announcements..." />
            ) : notices.length === 0 ? (
              <EmptyState title="No notices yet" description="Be the first to post a campus update!" />
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {notices.map((n, i) => {
                  const cat = NOTICE_CATEGORIES.find(c => c.key === n.category) || NOTICE_CATEGORIES[0]
                  return (
                    <motion.div key={n.id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => incrementNoticeViews(n.id)}
                      className="p-5 rounded-2xl cursor-pointer group transition-all"
                      style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}
                      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                            style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}25` }}>
                            {cat.label}
                          </span>
                           <span className="text-[10px] text-white/25 flex items-center gap-1">
                             <Clock size={10} /> {getTimeLeft(n.expires_at)}
                           </span>
                        </div>
                        <span className="text-[10px] text-white/20 flex items-center gap-1"><Eye size={10} />{n.views}</span>
                      </div>
                      <h3 className="text-white/85 font-bold text-sm mb-1.5 group-hover:text-white transition-colors">{n.title}</h3>
                      <p className="text-white/40 text-xs leading-relaxed mb-4">{n.body}</p>
                      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.03]">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white/60"
                          style={{ background: 'rgba(124,111,247,0.2)' }}>
                          {n.poster?.avatar_url
                            ? <img src={n.poster.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                            : n.poster?.full_name?.[0] || '?'}
                        </div>
                        <span className="text-[10px] text-white/35 font-semibold">@{n.poster?.username || n.poster?.full_name || 'student'}</span>
                        <span className="text-[10px] text-white/20 ml-auto">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </div>
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
        onClick={() => feedMode === 'notices' ? setShowCreateNotice(true) : navigate('/post-task')}
        className="fixed bottom-24 lg:bottom-8 right-6 flex items-center gap-2 px-5 py-3.5 font-black text-sm text-white rounded-2xl z-30"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        style={{
          background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)',
          boxShadow: '0 8px 32px rgba(124,111,247,0.4)'
        }}
      >
        <Plus size={17} />
        {feedMode === 'notices' ? 'Post Notice' : 'Post Task'}
      </motion.button>

      {/* Create Notice Modal */}
      <AnimatePresence>
        {showCreateNotice && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateNotice(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-lg rounded-3xl p-6 z-10 text-white"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">📢 Post a Notice</h2>
                <button onClick={() => setShowCreateNotice(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Title</label>
                  <input value={noticeForm.title} onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))}
                    maxLength={100} placeholder="e.g. Lost my blue hoodie near canteen"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl text-sm text-white outline-none focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Details</label>
                  <textarea value={noticeForm.body} onChange={e => setNoticeForm(p => ({ ...p, body: e.target.value }))}
                    rows={3} placeholder="Describe the notice..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl text-sm text-white outline-none resize-none focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {NOTICE_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <button key={c.key} type="button" onClick={() => setNoticeForm(p => ({ ...p, category: c.key }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: noticeForm.category === c.key ? `${c.color}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${noticeForm.category === c.key ? `${c.color}40` : 'rgba(255,255,255,0.07)'}`,
                          color: noticeForm.category === c.key ? c.color : 'rgba(255,255,255,0.3)',
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button onClick={handlePostNotice} disabled={postingNotice} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 8px 24px rgba(124,111,247,0.3)' }}>
                  {postingNotice ? 'Posting...' : 'Post Notice 📢'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
