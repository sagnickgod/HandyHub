import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ChatPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [task, setTask] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch task + determine the other user
  useEffect(() => {
    if (!taskId || !user) return
    const fetchTask = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, poster_id, selected_helper_id, poster:profiles!poster_id(id, full_name, avatar_url), helper:profiles!selected_helper_id(id, full_name, avatar_url)')
        .eq('id', taskId)
        .single()

      if (!data) { navigate('/feed'); return }

      // Access control: only poster or helper
      if (data.poster_id !== user.id && data.selected_helper_id !== user.id) {
        navigate('/feed')
        return
      }

      setTask(data)
      const other = data.poster_id === user.id ? data.helper : data.poster
      setOtherUser(other)
    }
    fetchTask()
  }, [taskId, user, navigate])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!taskId || !user) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoading(false)
  }, [taskId, user])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return
    const channel = supabase
      .channel(`chat-${taskId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `task_id=eq.${taskId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [taskId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMsg.trim() || sending || !task || !otherUser) return
    setSending(true)

    const receiverId = task.poster_id === user.id ? task.selected_helper_id : task.poster_id

    await supabase.from('messages').insert({
      task_id: taskId,
      sender_id: user.id,
      receiver_id: receiverId,
      message: newMsg.trim()
    })

    setNewMsg('')
    setSending(false)
    inputRef.current?.focus()
  }

  if (loading || !task) return <LoadingSpinner text="Loading chat..." />

  if (!task.selected_helper_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: '#0A0A0F' }}>
        <Shield size={40} className="text-white/20 mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Chat Unavailable</h2>
        <p className="text-white/40 text-sm text-center max-w-sm">Chat is only available after a helper has been selected for this task.</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)' }}>Go Back</button>
      </div>
    )
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (ts) => {
    const d = new Date(ts)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = formatDate(msg.created_at)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(msg)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5" style={{ background: '#111116' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-white/50" />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, rgba(124,111,247,0.3), rgba(99,102,241,0.2))', border: '1px solid rgba(124,111,247,0.3)' }}>
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
            : otherUser?.full_name?.[0] || '?'
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{otherUser?.full_name}</p>
          <p className="text-white/30 text-xs truncate">{task.title}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,111,247,0.08)', border: '1px solid rgba(124,111,247,0.15)' }}>
              <Send size={24} className="text-violet-400/50" />
            </div>
            <p className="text-white/50 font-semibold text-sm">No messages yet</p>
            <p className="text-white/25 text-xs mt-1">Say hi to get started!</p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <span className="text-[10px] font-bold text-white/25 px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {date}
              </span>
            </div>
            {msgs.map((msg, i) => {
              const isMine = msg.sender_id === user.id
              const showAvatar = i === 0 || msgs[i - 1].sender_id !== msg.sender_id
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                >
                  {!isMine && showAvatar && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white mr-2 flex-shrink-0 mt-auto"
                      style={{ background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.25)' }}>
                      {otherUser?.full_name?.[0]}
                    </div>
                  )}
                  {!isMine && !showAvatar && <div className="w-7 mr-2 flex-shrink-0" />}
                  <div
                    className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      borderRadius: isMine
                        ? (showAvatar ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                        : (showAvatar ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                      background: isMine
                        ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)'
                        : 'rgba(255,255,255,0.06)',
                      color: isMine ? '#fff' : 'rgba(255,255,255,0.75)',
                      boxShadow: isMine ? '0 2px 8px rgba(124,111,247,0.2)' : 'none',
                      border: isMine ? 'none' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    {msg.message}
                    <span className={`block text-[10px] mt-1 ${isMine ? 'text-white/50 text-right' : 'text-white/30'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-white/5" style={{ background: '#111116' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16
            }}
            autoComplete="off"
          />
          <motion.button
            type="submit"
            disabled={!newMsg.trim() || sending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all disabled:opacity-30"
            style={{
              background: newMsg.trim() ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)' : 'rgba(255,255,255,0.05)',
              boxShadow: newMsg.trim() ? '0 4px 12px rgba(124,111,247,0.3)' : 'none'
            }}
          >
            <Send size={16} className={newMsg.trim() ? 'text-white' : 'text-white/30'} />
          </motion.button>
        </div>
      </form>
    </div>
  )
}
