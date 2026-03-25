import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Paperclip, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
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
  if (!task) return <div className="p-8 text-center text-text-muted">Task not found</div>

  const isPoster = task.poster_id === user?.id
  const isHelper = task.selected_helper_id === user?.id
  const hasApplied = applications?.some(a => a.applicant_id === user?.id)

  const handleApprove = async () => {
    setActionLoading(true)
    await releaseEscrow(task.poster_id, task.selected_helper_id, task.points_offered, task.id)
    await supabase.from('tasks').update({ state: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)

    // Update helper stats
    const { data: helperProfile } = await supabase.from('profiles').select('total_tasks_helped, streak_count, longest_streak, last_active_date').eq('id', task.selected_helper_id).single()
    if (helperProfile) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      let newStreak = 1
      if (helperProfile.last_active_date === yesterday) newStreak = (helperProfile.streak_count || 0) + 1
      else if (helperProfile.last_active_date === today) newStreak = helperProfile.streak_count || 1

      await supabase.from('profiles').update({
        last_active_date: today,
        streak_count: newStreak,
        longest_streak: Math.max(newStreak, helperProfile.longest_streak || 0)
      }).eq('id', task.selected_helper_id)
    }

    // Update poster stats
    const { data: pp } = await supabase.from('profiles').select('total_tasks_posted').eq('id', task.poster_id).single()
    await supabase.from('profiles').update({ total_tasks_posted: (pp?.total_tasks_posted || 0) + 1 }).eq('id', task.poster_id)

    await supabase.from('notifications').insert({
      user_id: task.selected_helper_id,
      type: 'approved',
      title: `Task "${task.title}" approved! 🎉`,
      body: `You earned ${task.points_offered} points!`,
      link: `/tasks/${task.id}`
    })

    addToast('Task approved! Points transferred.', 'success')
    setShowRating(true)
    refetch()
    setActionLoading(false)
  }

  const handleReject = async () => {
    setActionLoading(true)
    await supabase.from('tasks').update({ state: 'disputed' }).eq('id', task.id)
    await supabase.from('disputes').insert({
      task_id: task.id,
      raised_by: task.poster_id,
      reason: 'Proof rejected by task owner'
    })
    await supabase.from('notifications').insert({
      user_id: task.selected_helper_id,
      type: 'rejected',
      title: `Proof rejected for "${task.title}"`,
      body: 'The task owner has raised a dispute.',
      link: `/tasks/${task.id}`
    })
    addToast('Dispute raised.', 'warning')
    refetch()
    setActionLoading(false)
  }

  const handleCancel = async () => {
    setActionLoading(true)
    const hasApps = applications && applications.length > 0
    const penalty = hasApps ? 10 : 0
    await refundEscrow(task.poster_id, task.points_offered, task.id, penalty)
    await supabase.from('tasks').update({ state: 'cancelled' }).eq('id', task.id)
    addToast(penalty > 0 ? `Task cancelled. ${penalty}pt penalty applied.` : 'Task cancelled. Points refunded.', 'info')
    refetch()
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-text mb-6 transition-colors">
          <ArrowLeft size={20} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <CategoryChip category={task.category} size="md" />
              <UrgencyBadge urgency={task.urgency} />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold
              ${task.state === 'completed' ? 'bg-accent-2/15 text-accent-2' :
                task.state === 'disputed' ? 'bg-danger/15 text-danger' :
                task.state === 'cancelled' ? 'bg-text-muted/15 text-text-muted' :
                'bg-primary/15 text-primary'}`}>
              {task.state.replace('_', ' ')}
            </span>
          </div>

          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-4">{task.title}</h1>

          <div className="mb-6">
            <PointsDisplay amount={task.points_offered} size="lg" />
          </div>

          <p className="text-text-muted leading-relaxed mb-6">{task.description || 'No description'}</p>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted mb-6">
            <span className="flex items-center gap-1"><Clock size={14} /> {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
            {task.deadline && <span className="flex items-center gap-1"><Calendar size={14} /> Due {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}</span>}
          </div>

          {/* Poster card */}
          <div
            className="glass-card p-4 flex items-center gap-3 mb-6 cursor-pointer card-hover"
            onClick={() => navigate(`/profile/${task.poster_id}`)}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {task.poster?.full_name?.[0] || '?'}
            </div>
            <div>
              <p className="font-semibold text-text text-sm">{task.poster?.full_name}</p>
              <div className="flex items-center gap-2">
                <ReputationStars score={task.poster?.reputation_score} />
                <span className="text-xs text-text-muted">{Number(task.poster?.completion_rate || 0).toFixed(0)}% done</span>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {task.task_attachments?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {task.task_attachments.map(a => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-surface-2 text-text-muted text-sm px-3 py-1.5 rounded-lg hover:text-text transition-colors">
                    <Paperclip size={14} /> {a.file_name || 'File'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* State-based actions */}
          <div className="space-y-4">
            {/* Open + not poster + not applied */}
            {task.state === 'open' && !isPoster && !hasApplied && (
              <button onClick={() => setShowApply(true)} className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover btn-press">
                Apply for This Task
              </button>
            )}

            {/* Open + already applied */}
            {task.state === 'open' && !isPoster && hasApplied && (
              <div className="bg-accent-2/10 text-accent-2 py-3 rounded-xl text-center font-semibold">
                Application Submitted ✓
              </div>
            )}

            {/* Open + is poster: cancel button */}
            {task.state === 'open' && isPoster && (
              <button onClick={handleCancel} disabled={actionLoading} className="w-full bg-danger/10 text-danger py-3 rounded-xl font-semibold btn-press disabled:opacity-50">
                {actionLoading ? 'Cancelling...' : 'Cancel Task'}
              </button>
            )}

            {/* In progress + is helper */}
            {task.state === 'in_progress' && isHelper && (
              <button onClick={() => setShowProof(true)} className="w-full bg-accent-2 text-white py-3 rounded-xl font-semibold btn-press">
                Mark as Done — Submit Proof
              </button>
            )}

            {/* In progress + is poster */}
            {task.state === 'in_progress' && isPoster && (
              <div className="glass-card p-4 text-center">
                <p className="text-text-muted">⏳ Waiting for helper to submit proof...</p>
              </div>
            )}

            {/* Pending review + is poster */}
            {task.state === 'pending_review' && isPoster && (
              <div className="space-y-4">
                {task.proofs?.[0] && (
                  <div className="glass-card p-4">
                    <h3 className="font-semibold mb-2">Proof Submitted</h3>
                    <p className="text-sm text-text-muted">{task.proofs[0].text_summary}</p>
                    {task.proofs[0].file_urls?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {task.proofs[0].file_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">Attachment {i+1}</a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleApprove} disabled={actionLoading} className="flex-1 bg-accent-2 text-white py-3 rounded-xl font-semibold btn-press disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-danger text-white py-3 rounded-xl font-semibold btn-press disabled:opacity-50 flex items-center justify-center gap-2">
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* Pending review + is helper */}
            {task.state === 'pending_review' && isHelper && (
              <div className="glass-card p-4 text-center">
                <p className="text-text-muted">📋 Proof submitted. Awaiting owner review...</p>
              </div>
            )}

            {/* Completed */}
            {task.state === 'completed' && (
              <div className="glass-card p-6 text-center">
                <CheckCircle size={32} className="text-accent-2 mx-auto mb-2" />
                <p className="font-heading font-bold text-accent-2">Task Completed!</p>
                <p className="text-sm text-text-muted mt-1">🪙 {task.points_offered} points transferred</p>
                {(isPoster || isHelper) && (
                  <button onClick={() => setShowRating(true)} className="mt-3 bg-primary/10 text-primary px-6 py-2 rounded-xl font-medium btn-press text-sm">
                    Rate Experience
                  </button>
                )}
              </div>
            )}

            {/* Disputed */}
            {task.state === 'disputed' && (
              <div className="glass-card p-4 border-danger/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-danger" />
                  <span className="font-semibold text-danger">Dispute Active</span>
                </div>
                <p className="text-sm text-text-muted">An admin will review and resolve this dispute.</p>
              </div>
            )}
          </div>

          {/* Applicants panel (poster only, state=open) */}
          {task.state === 'open' && isPoster && applications && (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-bold mb-4">Applications ({applications.length})</h2>
              {applications.length === 0 ? (
                <p className="text-text-muted text-sm">No applications yet. Hang tight!</p>
              ) : (
                <div className="space-y-3">
                  {applications.map(app => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      isPoster={isPoster}
                      onSelect={(a) => { setSelectedApp(a); setShowSelect(true) }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ratings */}
          {task.ratings?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-bold mb-4">Ratings</h2>
              <div className="space-y-3">
                {task.ratings.map(r => (
                  <div key={r.id} className="glass-card p-4">
                    <ReputationStars score={r.score} />
                    {r.comment && <p className="text-sm text-text-muted mt-1">{r.comment}</p>}
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
