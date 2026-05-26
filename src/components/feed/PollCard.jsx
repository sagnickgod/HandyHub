import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

function getTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h left`
  return `${mins}m left`
}

export default function PollCard({ poll, onVote }) {
  const { user } = useAuth()
  const [votes, setVotes] = useState([])
  const [myVote, setMyVote] = useState(null)
  const [loading, setLoading] = useState(false)

  const isExpired = new Date(poll.expires_at) < new Date()
  const options = poll.options || []
  const totalVotes = votes.length

  useEffect(() => {
    const fetchVotes = async () => {
      const { data } = await supabase.from('poll_votes').select('*').eq('poll_id', poll.id)
      setVotes(data || [])
      const mine = data?.find(v => v.user_id === user?.id)
      if (mine) setMyVote(mine.option_index)
    }
    fetchVotes()
  }, [poll.id, user])

  const handleVote = async (index) => {
    if (myVote !== null || isExpired || loading) return
    setLoading(true)
    const { error } = await supabase.from('poll_votes').insert({ poll_id: poll.id, user_id: user.id, option_index: index })
    if (!error) {
      setMyVote(index)
      setVotes(prev => [...prev, { poll_id: poll.id, user_id: user.id, option_index: index }])
    }
    setLoading(false)
  }

  const getVoteCount = (index) => votes.filter(v => v.option_index === index).length
  const getPercent = (index) => totalVotes === 0 ? 0 : Math.round((getVoteCount(index) / totalVotes) * 100)

  const hasVoted = myVote !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1A1A26, #17171D)', border: '1px solid rgba(124,111,247,0.15)' }}>

      {/* Poll indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-violet-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-violet-400">Campus Poll</span>
        </div>
        <span className="text-[10px] text-white/25 flex items-center gap-1">
          <Clock size={10} /> {isExpired ? 'Ended' : getTimeLeft(poll.expires_at)}
        </span>
      </div>

      {/* Question */}
      <h3 className="text-white/90 font-bold text-sm mb-4">{poll.question}</h3>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => {
          const pct = getPercent(i)
          const isSelected = myVote === i
          return (
            <motion.button
              key={i}
              onClick={() => handleVote(i)}
              disabled={hasVoted || isExpired}
              whileTap={!hasVoted && !isExpired ? { scale: 0.98 } : {}}
              className="w-full py-3 px-4 rounded-xl text-left text-sm font-semibold relative overflow-hidden transition-all"
              style={{
                background: isSelected ? 'rgba(124,111,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? 'rgba(124,111,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: isSelected ? '#A78BFA' : hasVoted ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)',
                cursor: hasVoted || isExpired ? 'default' : 'pointer',
              }}>
              {(hasVoted || isExpired) && (
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute left-0 top-0 bottom-0 rounded-xl"
                  style={{ background: isSelected ? 'rgba(124,111,247,0.15)' : 'rgba(255,255,255,0.03)' }} />
              )}
              <div className="relative flex items-center justify-between">
                <span>{opt}</span>
                {(hasVoted || isExpired) && (
                  <span className="text-xs font-black ml-2" style={{ color: isSelected ? '#7C6FF7' : 'rgba(255,255,255,0.3)' }}>
                    {pct}%
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-white/20">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        <span className="text-[10px] text-white/15">{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
      </div>
    </motion.div>
  )
}
