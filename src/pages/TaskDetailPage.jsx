import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Paperclip, CheckCircle, XCircle, AlertTriangle, Users, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useTask, useApplications } from '../hooks/useTasks'
import { usePoints } from '../hooks/usePoints'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import CategoryChip from '../components/ui/CategoryChip'
import UrgencyBadge from '../components/ui/UrgencyBadge'
import PointsDisplay from '../components/ui/PointsDisplay'
import ReputationStars from '../components/ui/ReputationStars'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ApplicationCard from '../components/tasks/ApplicationCard'
import ApplyModal from '../components/modals/ApplyModal'
import SelectHelperModal from '../components/modals/SelectHelperModal'
import SubmitProofModal from '../components/modals/SubmitProofModal'
import RatingModal from '../components/modals/RatingModal'

const CATEGORY_COLORS = {
  coding: '#7C6FF7', study: '#38BDF8', tech: '#FBBF24',
  physical: '#FB923C', event: '#34D399', creative: '#F472B6', other: '#94A3B8'
}

const STATE_CONFIG = {
  open:           { color: '#7C6FF7', bg: 'rgba(124,111,247,0.12)', border: 'rgba(124,111,247,0.3)', label: 'Open' },
  in_progress:    { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)',   label: 'In Progress' },
  pending_review: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)',   label: 'Under Review' },
  completed:      { color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)',   label: 'Completed' },
  disputed:       { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', label: 'Disputed' },
  cancelled:      { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', label: 'Cancelled' },
  expired:        { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  label: 'Expired' },
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { task, loading, refetch } = useTask(id)
  const { applications, refetch: refetchApps } = useApplications(id)
  const { releaseEscrow, refundEscrow } = usePoints()
  const { addToast } = useToast()

  const [showApply, setShowApply] = useState(false)
  const [showSelect, setShowSelect] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showProof, setShowProof] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  if (loading) return <LoadingSpinner text="Loading task..." />
  if (!task) return <div className="p-8 text-center text-white/30">Task not found</div>

  const isPoster = task.poster_id === user?.id
  const isHelper = task.selected_helper_id === user?.id
  const hasApplied = applications?.some(a => a.applicant_id === user?.id)
  const hasRated = task.ratings?.some(r => r.rater_id === user?.id)

  const catColor = CATEGORY_COLORS[task.category] || '#7C6FF7'
  const stateConfig = STATE_CONFIG[task.state] || STATE_CONFIG.open

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await releaseEscrow(task.poster_id, task.selected_helper_id, task.points_offered, task.id)
      await supabase.from('tasks').update({ state: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)
      const { data: helperProfile } = await supabase.from('profiles').select('total_tasks_helped, streak_count, longest_streak, last_active_date').eq('id', task.selected_helper_id).single()
      if (helperProfile) {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        let newStreak = 1
        if (helperProfile.last_active_date === yesterday) newStreak = (helperProfile.streak_count || 0) + 1
        else if (helperProfile.last_active_date === today) newStreak = helperProfile.streak_count || 1
        await supabase.from('profiles').update({ last_active_date: today, streak_count: newStreak, longest_streak: Math.max(newStreak, helperProfile.longest_streak || 0) }).eq('id', task.selected_helper_id)
      }
      const { data: pp } = await supabase.from('profiles').select('total_tasks_posted').eq('id', task.poster_id).single()
      await supabase.from('profiles').update({ total_tasks_posted: (pp?.total_tasks_posted || 0) + 1 }).eq('id', task.poster_id)
      await supabase.from('notifications').insert({ user_id: task.selected_helper_id, type: 'approved', title: `Task "${task.title}" approved! 🎉`, body: `You earned ${task.points_offered} points!`, link: `/tasks/${task.id}` })
      addToast('Task approved! Points transferred.', 'success')
      setShowRating(true); refetch()
    } catch (err) {
      console.error('Approval failed:', err)
      addToast('Something went wrong during approval.', 'error')
    } finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    setActionLoading(true)
    await supabase.from('tasks').update({ state: 'disputed' }).eq('id', task.id)
    await supabase.from('disputes').insert({ task_id: task.id, raised_by: task.poster_id, reason: 'Proof rejected by task owner' })
    await supabase.from('notifications').insert({ user_id: task.selected_helper_id, type: 'rejected', title: `Proof rejected for "${task.title}"`, body: 'The task owner has raised a dispute.', link: `/tasks/${task.id}` })
    addToast('Dispute raised.', 'warning'); refetch(); setActionLoading(false)
  }

  const handleCancel = async () => {
    setActionLoading(true)
    const hasApps = applications && applications.length > 0
    const penalty = hasApps ? 10 : 0
    await refundEscrow(task.poster_id, task.points_offered, task.id, penalty)
    await supabase.from('tasks').update({ state: 'cancelled' }).eq('id', task.id)
    addToast(penalty > 0 ? `Task cancelled. ${penalty}pt penalty applied.` : 'Task cancelled. Points refunded.', 'info')
    refetch(); setActionLoading(false)
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-64 opacity-20"
          style={{ background: `linear-gradient(180deg, ${catColor}12, transparent)` }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        {/* Back */}
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 mb-6 text-sm font-semibold transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <ArrowLeft size={16} /> Back
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Main task card */}
          <div className="relative overflow-hidden rounded-3xl mb-5 p-7"
            style={{ background: 'linear-gradient(135deg, #17171D, #13131A)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-15"
              style={{ background: `radial-gradient(circle, ${catColor}, transparent)` }} />
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${catColor}40, transparent)` }} />

            {/* Tags row */}
            <div className="flex items-center gap-2 mb-5 flex-wrap relative z-10">
              <CategoryChip category={task.category} size="md" />
              <UrgencyBadge urgency={task.urgency} />
              <span className="ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{ background: stateConfig.bg, border: `1px solid ${stateConfig.border}`, color: stateConfig.color }}>
                {stateConfig.label}
              </span>
            </div>

            <h1 className="font-heading text-2xl md:text-3xl font-black text-white mb-4 relative z-10">{task.title}</h1>

            <div className="mb-5 relative z-10">
              <PointsDisplay amount={task.points_offered} size="lg" />
              <div className="mt-3 pl-3 border-l-2 border-white/10 space-y-1">
                <p className="text-xs font-semibold text-white/60">
                  Worker receives: <span className="text-white/90">{task.worker_reward || Math.ceil(task.points_offered * 0.7)} coins</span>
                </p>
                <p className="text-[11px] text-white/35">
                  Platform fee: {task.platform_fee !== undefined ? task.platform_fee : task.points_offered - Math.ceil(task.points_offered * 0.7)} coins
                </p>
              </div>
            </div>

            <p className="text-white/45 leading-relaxed mb-6 text-sm relative z-10">{task.description || 'No description'}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span className="flex items-center gap-1.5">
                <Clock size={12} />{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </span>
              {task.deadline && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />Due {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Poster */}
          <motion.div
            onClick={() => navigate(`/profile/${task.poster_id}`)}
            whileHover={{ y: -2 }}
            className="flex items-center gap-3.5 p-4 rounded-2xl cursor-pointer mb-5 transition-all"
            style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1C1C26'}
            onMouseLeave={e => e.currentTarget.style.background = '#17171D'}
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black text-white"
              style={{ background: `${catColor}20`, border: `1px solid ${catColor}30` }}>
              {task.poster?.avatar_url
                ? <img src={task.poster.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                : task.poster?.full_name?.[0] || '?'
              }
            </div>
            <div className="flex-1">
              <p className="text-white/75 text-sm font-bold">{task.poster?.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <ReputationStars score={task.poster?.reputation_score} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{Number(task.poster?.completion_rate || 0).toFixed(0)}% completion</span>
              </div>
            </div>
            <ArrowLeft size={14} className="text-white/20 rotate-180" />
          </motion.div>

          {/* Attachments */}
          {task.task_attachments?.length > 0 && (
            <div className="mb-5 p-4 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {task.task_attachments.map(a => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                  >
                    <Paperclip size={12} />{a.file_name || 'File'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 mb-8">
            {task.state === 'open' && !isPoster && !hasApplied && (
              <motion.button
                onClick={() => setShowApply(true)}
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-black text-white text-base"
                style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 8px 32px rgba(124,111,247,0.35)' }}
              >
                Apply for This Task
              </motion.button>
            )}

            {task.state === 'open' && !isPoster && hasApplied && (
              <div className="py-4 rounded-2xl text-center font-bold text-sm"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34D399' }}>
                ✓ Application Submitted
              </div>
            )}

            {task.state === 'open' && isPoster && (
              <motion.button onClick={handleCancel} disabled={actionLoading} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-40"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
                {actionLoading ? 'Cancelling...' : 'Cancel Task'}
              </motion.button>
            )}

            {task.state === 'in_progress' && isHelper && (
              <div className="space-y-3">
                <motion.button onClick={() => setShowProof(true)} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl font-black text-white text-base"
                  style={{ background: 'linear-gradient(135deg, #34D399, #10B981)', boxShadow: '0 8px 32px rgba(52,211,153,0.3)' }}>
                  Mark as Done — Submit Proof
                </motion.button>
                <motion.button onClick={() => navigate(`/chat/${task.id}`)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.25)', color: '#7C6FF7' }}>
                  <MessageSquare size={16} />Message Task Owner
                </motion.button>
              </div>
            )}

            {task.state === 'in_progress' && isPoster && (
              <div className="space-y-3">
                <div className="py-4 rounded-2xl text-center text-sm font-semibold"
                  style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: 'rgba(56,189,248,0.7)' }}>
                  ⏳ Waiting for helper to submit proof...
                </div>
                <motion.button onClick={() => navigate(`/chat/${task.id}`)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.25)', color: '#7C6FF7' }}>
                  <MessageSquare size={16} />Message Helper
                </motion.button>
              </div>
            )}

            {task.state === 'pending_review' && isPoster && (
              <div className="space-y-4">
                {/* Review Header */}
                <div className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <AlertTriangle size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-400 text-sm">Review Submitted Work</p>
                    <p className="text-white/35 text-xs mt-0.5">Carefully review the summary and files below before approving or rejecting.</p>
                  </div>
                </div>

                {task.proofs?.[0] && (
                  <div className="p-5 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Helper info */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                        {task.proofs[0].helper?.avatar_url
                          ? <img src={task.proofs[0].helper.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                          : task.proofs[0].helper?.full_name?.[0] || '?'
                        }
                      </div>
                      <div>
                        <h3 className="text-white/70 font-bold text-sm">Proof by {task.proofs[0].helper?.full_name || 'Helper'}</h3>
                        <p className="text-white/25 text-[10px]">Submitted for your review</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="pl-3 border-l-2 border-emerald-500/30 mb-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-1.5">📝 Work Summary</p>
                      <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{task.proofs[0].text_summary || 'No summary provided.'}</p>
                    </div>

                    {/* Proof Files */}
                    {task.proofs[0].file_urls?.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/30">📎 Proof Files ({task.proofs[0].file_urls.length})</p>

                        {/* Image previews - larger for better review */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {task.proofs[0].file_urls.map((url, i) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)
                            if (isImage) {
                              return (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                  className="block rounded-xl overflow-hidden border border-white/10 hover:border-emerald-500/40 transition-all group">
                                  <img src={url} alt={`Proof ${i + 1}`} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="px-3 py-2 text-[10px] text-white/30 font-bold uppercase tracking-wider bg-[#13131A]">
                                    Click to view full — Image {i + 1}
                                  </div>
                                </a>
                              )
                            }
                            return (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                                style={{ background: 'rgba(124,111,247,0.08)', border: '1px solid rgba(124,111,247,0.2)', color: '#7C6FF7' }}>
                                <Paperclip size={14} />
                                <span className="truncate flex-1">Download File {i + 1}</span>
                                <span className="text-[10px] text-white/25">↗</span>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* No files case */}
                    {(!task.proofs[0].file_urls || task.proofs[0].file_urls.length === 0) && (
                      <p className="text-white/25 text-xs italic">No files attached to this proof.</p>
                    )}
                  </div>
                )}

                {/* No proof case */}
                {!task.proofs?.[0] && (
                  <div className="p-4 rounded-2xl text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-white/30 text-sm">No proof submitted yet.</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <motion.button onClick={handleApprove} disabled={actionLoading} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #34D399, #10B981)', boxShadow: '0 4px 16px rgba(52,211,153,0.25)' }}>
                    <CheckCircle size={16} />Approve & Pay
                  </motion.button>
                  <motion.button onClick={handleReject} disabled={actionLoading} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
                    <XCircle size={16} />Reject & Dispute
                  </motion.button>
                </div>
              </div>
            )}

            {task.state === 'pending_review' && isHelper && (
              <div className="py-4 rounded-2xl text-center font-semibold text-sm"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.8)' }}>
                📋 Proof submitted. Awaiting owner review...
              </div>
            )}

            {task.state === 'completed' && (
              <div className="p-6 rounded-3xl text-center"
                style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(52,211,153,0.2)' }}>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
                </motion.div>
                <p className="font-heading font-black text-emerald-400 text-lg">Task Completed!</p>
                <p className="text-white/35 text-sm mt-1">🪙 {task.points_offered} points transferred successfully</p>
                {(isPoster || isHelper) && !hasRated && (
                  <div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.2)' }}>
                    <p className="text-white/55 text-sm mb-3">Rate your experience to help the community</p>
                    <motion.button onClick={() => setShowRating(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-6 py-2.5 rounded-xl font-black text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
                      Rate {isPoster ? 'Helper' : 'Task Owner'}
                    </motion.button>
                  </div>
                )}
                {(isPoster || isHelper) && hasRated && (
                  <p className="text-violet-400 text-sm mt-3 font-semibold">✨ You have rated this experience</p>
                )}
              </div>
            )}

            {task.state === 'disputed' && (
              <div className="p-5 rounded-2xl flex items-start gap-3"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-400 text-sm">Dispute Active</p>
                  <p className="text-white/35 text-xs mt-1">An admin will review and resolve this dispute.</p>
                </div>
              </div>
            )}

            {task.state === 'expired' && (
              <div className="p-6 rounded-3xl text-center"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <Clock size={28} className="text-orange-400 mx-auto mb-3" />
                <p className="font-heading font-black text-orange-400 text-lg">Task Expired</p>
                <p className="text-white/35 text-sm mt-1">
                  The deadline passed without completion. 🪙 {task.points_offered} coins have been fully refunded.
                </p>
              </div>
            )}
          </div>

          {/* Applications panel */}
          {task.state === 'open' && isPoster && applications && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-white/40" />
                <h2 className="font-heading font-black text-white/70 text-sm uppercase tracking-wider">
                  Applications ({applications.length})
                </h2>
              </div>
              {applications.length === 0 ? (
                <p className="text-white/25 text-sm py-4">No applications yet. Hang tight!</p>
              ) : (() => {
                // Compute recommendation score for each applicant
                const scored = applications.map(app => {
                  const a = app.applicant
                  const rating = Number(a?.reputation_score || 0) / 5 // normalized 0-1
                  const completion = Number(a?.completion_rate || 0) / 100 // normalized 0-1
                  const helped = Math.min((a?.total_tasks_helped || 0) / 20, 1) // normalize, cap at 20
                  const score = rating * 0.5 + completion * 0.3 + helped * 0.2
                  return { ...app, _score: score }
                })
                // Sort by score descending
                scored.sort((a, b) => b._score - a._score)
                const topId = scored[0]?.id

                return (
                  <div className="space-y-3">
                    {scored.map(app => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        isPoster={isPoster}
                        isRecommended={app.id === topId && applications.length > 1 && app._score > 0}
                        onSelect={(a) => { setSelectedApp(a); setShowSelect(true) }}
                      />
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Ratings */}
          {task.ratings?.length > 0 && (
            <div>
              <h2 className="font-heading font-black text-white/70 text-sm uppercase tracking-wider mb-4">Ratings</h2>
              <div className="space-y-3">
                {task.ratings.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ReputationStars score={r.score} />
                    {r.comment && <p className="text-white/40 text-sm mt-2 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <ApplyModal isOpen={showApply} onClose={() => setShowApply(false)} task={task} onApplied={() => { refetch(); refetchApps() }} />
      <SelectHelperModal isOpen={showSelect} onClose={() => setShowSelect(false)} application={selectedApp} task={task} onSelected={() => { refetch(); refetchApps() }} />
      <SubmitProofModal isOpen={showProof} onClose={() => setShowProof(false)} task={task} onSubmitted={refetch} />
      <RatingModal isOpen={showRating} onClose={() => setShowRating(false)} task={task} rateeId={isPoster ? task.selected_helper_id : task.poster_id} onRated={refetch} />
    </div>
  )
}
