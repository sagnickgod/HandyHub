import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, XCircle, ArrowRight, Activity, Users, MessageSquare, Star, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function MyTasksView() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('posted') // 'posted' | 'helping'
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({ completed: 0, ongoing: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchMyTasks = async () => {
      setLoading(true)
      const field = tab === 'posted' ? 'poster_id' : 'selected_helper_id'
      const { data } = await supabase
        .from('tasks')
        .select(`
          id, title, description, category, points_offered, state, deadline, created_at, urgency, is_featured, is_premium,
          poster:profiles!poster_id(id, full_name, avatar_url, username),
          helper:profiles!selected_helper_id(id, full_name, avatar_url, username),
          applications(id)
        `)
        .eq(field, user.id)
        .order('created_at', { ascending: false })

      setTasks(data || [])
      
      // Calculate stats based on ALL user history (both helper and poster to be comprehensive)
      // Actually let's just use the current tab's active data for sidebar
      let comp = 0, ong = 0, canc = 0
      ;(data || []).forEach(t => {
        if (t.state === 'completed') comp++
        if (t.state === 'in_progress' || t.state === 'pending_review') ong++
        if (t.state === 'cancelled') canc++
        if (t.state === 'open' && tab === 'posted') ong++ // Open counts as ongoing for poster
      })
      setStats({ completed: comp, ongoing: ong, cancelled: canc })
      setLoading(false)
    }
    fetchMyTasks()
  }, [user, tab])

  const openTasks = tasks.filter(t => t.state === 'open')
  const activeTasks = tasks.filter(t => t.state === 'in_progress' || t.state === 'pending_review')

  const TaskRow = ({ task, isActive }) => {
    const isPosted = tab === 'posted'
    const otherUser = isPosted ? task.helper : task.poster
    const urgencyColor = '#FBBF24' // default
    const isUnderReview = task.state === 'pending_review'

    let glowStyle = {}
    if (task.urgency === 'low') glowStyle = { boxShadow: '0 0 20px rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', background: 'linear-gradient(135deg, rgba(34,197,94,0.02) 0%, rgba(20,20,24,1) 100%)' }
    else if (task.urgency === 'medium') glowStyle = { boxShadow: '0 0 20px rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(245,158,11,0.02) 0%, rgba(20,20,24,1) 100%)' }
    else if (task.urgency === 'high') glowStyle = { boxShadow: '0 0 25px rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', background: 'linear-gradient(135deg, rgba(239,68,68,0.02) 0%, rgba(20,20,24,1) 100%)' }
    else glowStyle = { background: 'linear-gradient(135deg, #17171D 0%, #14141A 100%)', border: '1px solid rgba(255,255,255,0.06)' }

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
        whileHover={{ y: -2, scale: 1.01 }}
        onClick={() => navigate(`/tasks/${task.id}`)}
        className="p-5 rounded-2xl cursor-pointer relative overflow-hidden group transition-all"
        style={glowStyle}
        onMouseEnter={e => {
          if (task.urgency === 'high' && !task.is_premium && !task.is_featured) e.currentTarget.style.boxShadow = '0 0 40px rgba(239,68,68,0.3)'
          else if (task.is_premium) e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.4), 0 0 30px rgba(234,179,8,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = glowStyle.boxShadow
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
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
        
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {!isActive && isPosted && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-400" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                {task.points_offered} pts
              </span>
            )}
            {isActive && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase" style={{ background: isUnderReview ? 'rgba(251,191,36,0.1)' : 'rgba(56,189,248,0.1)', color: isUnderReview ? '#FBBF24' : '#38BDF8', border: isUnderReview ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(56,189,248,0.2)' }}>
                {isUnderReview ? 'Reviewing' : 'Active'}
              </span>
            )}
            {isActive && (
              <h3 className="font-heading font-bold text-white text-base truncate ml-2">{task.title}</h3>
            )}
          </div>
          {isActive ? (
            <div className="text-right">
              <span className="block font-black text-xl text-white/90">{task.points_offered}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Credits held</span>
            </div>
          ) : (
            <h3 className="font-heading font-bold text-white text-base truncate max-w-[200px] text-right">{task.title}</h3>
          )}
        </div>

        {!isActive && (
          <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-4">
            {task.description}
          </p>
        )}

        {isActive && otherUser && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-white/40 text-xs">Assigned to:</span>
            <span className="text-violet-400 text-xs font-bold">@{otherUser.username}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
          {isActive ? (
            <>
              <motion.button whileHover={{ scale: 1.05 }} onClick={e => { e.stopPropagation(); navigate(`/chat/${task.id}`) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(124,111,247,0.1)', color: '#7C6FF7' }}>
                <MessageSquare size={14} /> Message
              </motion.button>
              {isPosted ? (
                <motion.button onClick={e => { e.stopPropagation(); navigate(`/tasks/${task.id}`) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black">
                  <CheckCircle size={14} /> View Progress
                </motion.button>
              ) : (
                <motion.button onClick={e => { e.stopPropagation(); navigate(`/tasks/${task.id}`) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black">
                  <CheckCircle size={14} /> Submit Proof
                </motion.button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-white/40 font-semibold">
                <Users size={14} /> {task.applications?.length || 0} APPLICANTS
              </div>
              <motion.button className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
                View All
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mt-2 text-white">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1">
          <h1 className="font-heading text-4xl font-black mb-2">Task Nexus</h1>
          <p className="text-white/45 text-sm mb-7">Manage your campus contributions and active requests in one streamlined dashboard.</p>

          <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-fit border border-white/5">
            <button
              onClick={() => setTab('posted')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: tab === 'posted' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'posted' ? '#7C6FF7' : 'rgba(255,255,255,0.4)' }}
            >
              Tasks I Posted
            </button>
            <button
              onClick={() => setTab('helping')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: tab === 'helping' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'helping' ? '#7C6FF7' : 'rgba(255,255,255,0.4)' }}
            >
              Tasks I'm Helping With
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <LoadingSpinner key="loading" text="Loading your nexus..." />
            ) : tasks.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Activity size={24} className="text-white/20" />
                </div>
                <h3 className="text-white/60 font-bold mb-1">No tasks here yet</h3>
                <p className="text-white/30 text-sm">When you {tab === 'posted' ? 'post a task' : 'help someone'}, it will show up here.</p>
              </motion.div>
            ) : (
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                
                {tab === 'posted' && openTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full bg-violet-400" style={{ boxShadow: '0 0 10px rgba(124,111,247,0.6)' }} />
                      <h2 className="text-white/90 font-black text-[11px] uppercase tracking-[0.15em]">Open Requests</h2>
                      <span className="ml-auto text-white/30 text-xs font-bold">{openTasks.length} ITEMS</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {openTasks.map((t, i) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <TaskRow task={t} isActive={false} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 10px rgba(251,191,36,0.6)' }} />
                      <h2 className="text-white/90 font-black text-[11px] uppercase tracking-[0.15em]">Currently Active</h2>
                      <span className="ml-auto text-white/30 text-xs font-bold">{activeTasks.length} ITEMS</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {activeTasks.map((t, i) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <TaskRow task={t} isActive={true} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'helping' && tasks.length > 0 && activeTasks.length === 0 && (
                  <div className="py-10 text-center border border-white/5 rounded-2xl bg-white/5 text-white/40 text-sm">
                    You have past completed tasks, but none currently active.
                  </div>
                )}
                
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Activity Pulse */}
          <div className="p-6 rounded-3xl" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-white font-bold text-base mb-5">Activity Pulse</h3>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.2)' }}>
                    <CheckCircle size={14} className="text-violet-400" />
                  </div>
                  <span className="text-white/70 text-sm font-semibold">Completed</span>
                </div>
                <span className="text-white font-black text-lg">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                    </div>
                  </div>
                  <span className="text-white/70 text-sm font-semibold">Ongoing</span>
                </div>
                <span className="text-white font-black text-lg">{stats.ongoing}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle size={14} className="text-red-400" />
                  </div>
                  <span className="text-white/70 text-sm font-semibold">Cancelled</span>
                </div>
                <span className="text-white font-black text-lg">{stats.cancelled}</span>
              </div>
            </div>

            <div className="pt-5 border-t border-white/5">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Total Impact</p>
              <div className="flex items-end justify-between">
                <span className="font-heading font-black text-4xl text-white">{(profile?.total_tasks_helped || 0) + (profile?.total_tasks_posted || 0)}</span>
                <span className="text-violet-400 text-xs font-bold bg-violet-400/10 px-2 py-1 rounded-lg">+12% this week</span>
              </div>
            </div>
          </div>

          {/* Points Prompt ad */}
          <div className="p-6 rounded-3xl relative overflow-hidden group cursor-pointer" style={{ background: 'linear-gradient(135deg, #1A1A24, #121218)', border: '1px solid rgba(124,111,247,0.2)' }} onClick={() => navigate('/wallet')}>
            <div className="absolute -top-10 -right-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity">🚀</div>
            <h3 className="text-violet-400 font-bold text-sm mb-2 relative z-10">Need more points?</h3>
            <p className="text-white/50 text-xs leading-relaxed mb-5 relative z-10">Browse open tasks in the marketplace and start helping your peers.</p>
            <motion.button whileHover={{ scale: 1.02 }} className="w-full py-3 rounded-xl bg-violet-400 text-black font-black text-sm relative z-10">
              Go to Wallet
            </motion.button>
          </div>
        </div>

      </div>
    </div>
  )
}
