import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function ChatListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchConversations = async () => {
      // Get all tasks where user is poster or helper AND has a selected helper
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, poster_id, selected_helper_id, poster:profiles!poster_id(id, full_name, avatar_url), helper:profiles!selected_helper_id(id, full_name, avatar_url)')
        .not('selected_helper_id', 'is', null)
        .or(`poster_id.eq.${user.id},selected_helper_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!tasks) { setLoading(false); return }

      // For each task, get the last message
      const convos = await Promise.all(tasks.map(async (task) => {
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('message, created_at, sender_id')
          .eq('task_id', task.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMsg = lastMsgs?.[0] || null
        const otherUser = task.poster_id === user.id ? task.helper : task.poster

        return {
          taskId: task.id,
          taskTitle: task.title,
          otherUser,
          lastMessage: lastMsg?.message || null,
          lastMessageTime: lastMsg?.created_at || null,
          lastSenderIsMe: lastMsg?.sender_id === user.id,
        }
      }))

      // Sort by last message (most recent first), conversations with no messages go to bottom
      convos.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      })

      setConversations(convos)
      setLoading(false)
    }
    fetchConversations()
  }, [user])

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) return <LoadingSpinner text="Loading conversations..." />

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-black text-white mb-2">Messages</h1>
          <p className="text-white/40 text-sm mb-7">Your task conversations</p>

          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description="Conversations appear here after you're matched with someone on a task."
            />
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, i) => (
                <motion.div
                  key={conv.taskId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/chat/${conv.taskId}`)}
                  className="flex items-center gap-3.5 p-4 rounded-2xl cursor-pointer group transition-all"
                  style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1C1C26'}
                  onMouseLeave={e => e.currentTarget.style.background = '#17171D'}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                      style={{ background: 'linear-gradient(135deg, rgba(124,111,247,0.2), rgba(99,102,241,0.15))', border: '1px solid rgba(124,111,247,0.25)' }}>
                      {conv.otherUser?.avatar_url
                        ? <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                        : conv.otherUser?.full_name?.[0] || '?'
                      }
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-white font-bold text-sm truncate">{conv.otherUser?.full_name}</p>
                      {conv.lastMessageTime && (
                        <span className="text-white/25 text-[11px] flex-shrink-0 ml-2">{formatTime(conv.lastMessageTime)}</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs truncate mb-1">
                      📋 {conv.taskTitle}
                    </p>
                    {conv.lastMessage ? (
                      <p className="text-white/45 text-xs truncate">
                        {conv.lastSenderIsMe && <span className="text-white/30">You: </span>}
                        {conv.lastMessage}
                      </p>
                    ) : (
                      <p className="text-white/25 text-xs italic">No messages yet — say hi!</p>
                    )}
                  </div>

                  <ArrowRight size={14} className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
