import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Paperclip, FileText, Image as ImageIcon, Loader2, ArrowLeftRight, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function SkillSwapChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [swap, setSwap] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user || !id) return

    const fetchSwapData = async () => {
      const { data: swapData, error } = await supabase
        .from('skill_swaps')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, avatar_url),
          receiver:profiles!receiver_id(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single()

      if (error || !swapData) {
        addToast('Swap not found.', 'error')
        navigate('/swaps')
        return
      }

      if (user.id !== swapData.requester_id && user.id !== swapData.receiver_id) {
        addToast('You are not part of this swap.', 'error')
        navigate('/swaps')
        return
      }

      setSwap(swapData)
      setOtherUser(user.id === swapData.requester_id ? swapData.receiver : swapData.requester)

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('skill_swap_messages')
        .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
        .eq('swap_id', id)
        .order('created_at', { ascending: true })

      if (messagesData) setMessages(messagesData)
      setLoading(false)
      scrollToBottom()
    }

    fetchSwapData()

    // Realtime subscription
    const subscription = supabase
      .channel(`skill_swap_${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'skill_swap_messages',
        filter: `swap_id=eq.${id}`
      }, async (payload) => {
        // Fetch sender details for the new message
        const { data: senderData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', payload.new.sender_id)
          .single()
          
        const newMsg = { ...payload.new, sender: senderData }
        setMessages(prev => [...prev, newMsg])
        scrollToBottom()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [id, user, navigate, addToast])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleFileUpload = async (file) => {
    if (!file) return null
    setUploadingFile(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${Date.now()}_${safeName}`
    const filePath = `swaps/${id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('study-notes') // Reusing the same bucket for files
      .upload(filePath, file)

    if (uploadError) {
      addToast(uploadError.message, 'error')
      setUploadingFile(false)
      return null
    }

    const { data } = supabase.storage.from('study-notes').getPublicUrl(filePath)
    setUploadingFile(false)
    return data.publicUrl
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !fileToUpload) return

    setSending(true)
    let fileUrl = null
    if (fileToUpload) {
      fileUrl = await handleFileUpload(fileToUpload)
      if (!fileUrl) {
        setSending(false)
        return
      }
    }

    const { error } = await supabase
      .from('skill_swap_messages')
      .insert({
        swap_id: id,
        sender_id: user.id,
        content: newMessage.trim() || (fileUrl ? 'Shared a file' : ''),
        file_url: fileUrl
      })

    if (error) {
      addToast(error.message, 'error')
    } else {
      setNewMessage('')
      setFileToUpload(null)
      scrollToBottom()
    }
    setSending(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File must be less than 5MB', 'warning')
        return
      }
      setFileToUpload(file)
    }
  }

  const handleCompleteSwap = async () => {
    if (swap.status === 'completed') return
    
    // Optimistic UI update
    setSwap(prev => ({ ...prev, status: 'completed' }))
    addToast('Marking as completed...', 'info')

    // Mark completed
    const { error } = await supabase.from('skill_swaps').update({ status: 'completed' }).eq('id', swap.id)
    
    if (error) {
      addToast(error.message, 'error')
      setSwap(prev => ({ ...prev, status: 'accepted' }))
      return
    }

    // Add points to both users (30 pts each)
    const { data: requester } = await supabase.from('profiles').select('points_balance').eq('id', swap.requester_id).single()
    const { data: receiver } = await supabase.from('profiles').select('points_balance').eq('id', swap.receiver_id).single()
    
    if (requester && receiver) {
      await Promise.all([
        supabase.from('profiles').update({ points_balance: requester.points_balance + 30 }).eq('id', swap.requester_id),
        supabase.from('profiles').update({ points_balance: receiver.points_balance + 30 }).eq('id', swap.receiver_id),
        supabase.from('points_ledger').insert([
          { user_id: swap.requester_id, amount: 30, type: 'earn', description: 'Skill Swap Completed' },
          { user_id: swap.receiver_id, amount: 30, type: 'earn', description: 'Skill Swap Completed' }
        ])
      ])
    }

    addToast('Swap completed! 30 points awarded to both of you.', 'success')
  }

  if (loading) return <LoadingSpinner text="Loading swap..." />
  if (!swap) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex flex-col gap-3 px-4 py-4 border-b"
        style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)' }}>
        
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/swaps')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-white/80" />
          </button>
          
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm">
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : otherUser?.full_name?.[0] || 'U'}
            </div>
            <div>
              <h1 className="font-heading font-black text-white text-base leading-tight">Swap with {otherUser?.full_name}</h1>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                <span className={swap.status === 'completed' ? 'text-emerald-400' : 'text-sky-400'}>{swap.status}</span>
              </div>
            </div>
          </div>

          {swap.status === 'accepted' && (
            <motion.button 
              onClick={handleCompleteSwap}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            >
              <CheckCircle size={14} /> Complete Swap
            </motion.button>
          )}
        </div>

        {/* Swap Info Bar */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-emerald-400/80 font-bold whitespace-nowrap">Offers:</span>
          <span className="text-white/70 truncate flex-1">{user.id === swap.requester_id ? swap.requester_offers : swap.requester_wants}</span>
          <ArrowLeftRight size={12} className="text-white/20 mx-1 flex-shrink-0" />
          <span className="text-sky-400/80 font-bold whitespace-nowrap">Wants:</span>
          <span className="text-white/70 truncate flex-1">{user.id === swap.requester_id ? swap.requester_wants : swap.requester_offers}</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ArrowLeftRight size={28} />
            </div>
            <p className="font-bold text-white/50">Start your skill swap!</p>
            <p className="text-sm mt-2 max-w-xs">Coordinate times, share resources, and help each other learn.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === user.id
            const showAvatar = !isMe && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id)

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white/80 ${isMe ? 'hidden' : ''}`}
                  style={{ background: showAvatar ? 'rgba(236,72,153,0.2)' : 'transparent' }}>
                  {showAvatar && (
                    msg.sender?.avatar_url 
                      ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      : (msg.sender?.full_name || 'U')[0]
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && <span className="text-[10px] text-white/30 mb-1 ml-1">{msg.sender?.full_name}</span>}
                  
                  <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={{ 
                      background: isMe ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'rgba(255,255,255,0.05)',
                      color: isMe ? '#fff' : '#e2e8f0'
                    }}>
                    
                    {/* File Attachment */}
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noreferrer" 
                        className="block mb-2 p-2 rounded-xl flex items-center gap-2 hover:bg-black/20 transition-colors"
                        style={{ background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)' }}>
                        {msg.file_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                          <div className="w-full rounded-lg overflow-hidden">
                            <img src={msg.file_url} alt="attachment" className="max-w-full h-auto max-h-48 object-cover" />
                          </div>
                        ) : (
                          <>
                            <FileText size={20} className={isMe ? 'text-pink-100' : 'text-pink-400 flex-shrink-0'} />
                            <span className="text-sm font-medium underline underline-offset-2 break-all line-clamp-2">
                              {(() => {
                                try {
                                  const name = decodeURIComponent(msg.file_url.split('/').pop().replace(/^\d+_/, ''))
                                  return name || 'View File'
                                } catch {
                                  return 'View File'
                                }
                              })()}
                            </span>
                          </>
                        )}
                      </a>
                    )}
                    
                    {msg.content && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                  </div>
                  
                  <span className="text-[9px] text-white/20 mt-1">{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      {swap.status !== 'completed' && (
        <div className="p-4" style={{ background: 'rgba(10,10,15,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {fileToUpload && (
            <div className="mb-3 px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: 'rgba(236,72,153,0.1)' }}>
              <div className="flex items-center gap-2 text-pink-400 text-sm">
                {fileToUpload.type.includes('image') ? <ImageIcon size={16} /> : <FileText size={16} />}
                <span className="truncate max-w-[200px]">{fileToUpload.name}</span>
              </div>
              <button onClick={() => setFileToUpload(null)} className="text-pink-400 hover:text-white transition-colors">✕</button>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 relative flex items-end">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 bottom-3 text-white/40 hover:text-white transition-colors">
                <Paperclip size={20} />
              </button>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message or share notes..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-white/30 outline-none focus:border-pink-500/50 transition-colors resize-none overflow-hidden"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={(!newMessage.trim() && !fileToUpload) || sending || uploadingFile}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', boxShadow: '0 4px 12px rgba(236,72,153,0.2)' }}>
              {sending || uploadingFile ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
