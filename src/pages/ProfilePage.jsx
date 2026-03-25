import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Edit3, Save, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile, useUserBadges } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import PointsDisplay from '../components/ui/PointsDisplay'
import ReputationStars from '../components/ui/ReputationStars'
import StreakCounter from '../components/ui/StreakCounter'
import CategoryChip from '../components/ui/CategoryChip'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const { addToast } = useToast()

  const isOwn = !id || id === user?.id
  const targetId = isOwn ? user?.id : id
  const { profile, loading, refetch } = useProfile(targetId)
  const { badges } = useUserBadges(targetId)

  const [tab, setTab] = useState('helped')
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState([])
  const [availability, setAvailability] = useState('anytime')
  const [tasks, setTasks] = useState([])
  const [ratings, setRatings] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '')
      setSkills(profile.skills || [])
      setAvailability(profile.availability || 'anytime')
    }
  }, [profile])

  useEffect(() => {
    if (!targetId) return
    if (tab === 'helped') {
      supabase.from('tasks').select('id, title, state, points_offered, completed_at, category')
        .eq('selected_helper_id', targetId).eq('state', 'completed')
        .order('completed_at', { ascending: false }).limit(20)
        .then(({ data }) => setTasks(data || []))
    } else if (tab === 'posted') {
      supabase.from('tasks').select('id, title, state, points_offered, created_at, category')
        .eq('poster_id', targetId)
        .order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setTasks(data || []))
    } else if (tab === 'reviews') {
      supabase.from('ratings').select('*, rater:profiles!rater_id(full_name)')
        .eq('ratee_id', targetId)
        .order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setRatings(data || []))
    } else if (tab === 'saved' && isOwn) {
      const saved = JSON.parse(localStorage.getItem('handyhub-bookmarks') || '[]')
      setBookmarks(saved)
    }
  }, [targetId, tab, isOwn])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ bio, skills, availability }).eq('id', user.id)
    await refreshProfile()
    setEditing(false)
    addToast('Profile updated!', 'success')
    setSaving(false)
    refetch()
  }

  const toggleSkill = (s) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // Online presence
  const isOnline = profile?.last_active_date === new Date().toISOString().split('T')[0]

  if (loading) return <LoadingSpinner text="Loading profile..." />
  if (!profile) return <EmptyState title="Profile not found" />

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero */}
          <div className="glass-card overflow-hidden mb-6">
            <div className="h-24 bg-gradient-to-r from-primary/30 to-accent/20" />
            <div className="px-6 pb-6 -mt-8">
              <div className="flex items-end gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl border-4 border-surface">
                    {profile.full_name?.[0]}
                  </div>
                  {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-2 border-2 border-surface" />}
                </div>
                <div className="flex-1">
                  <h1 className="font-heading text-xl font-bold">{profile.full_name}</h1>
                  <p className="text-sm text-text-muted">@{profile.username} · {profile.course || ''} {profile.year ? `Y${profile.year}` : ''}</p>
                </div>
                {isOwn && !editing && (
                  <button onClick={() => setEditing(true)} className="text-text-muted hover:text-primary transition-colors">
                    <Edit3 size={18} />
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-text-muted mb-1 block">Bio ({bio.length}/160)</label>
                    <textarea value={bio} onChange={e => e.target.value.length <= 160 && setBio(e.target.value)} rows={2} className="resize-none" />
                  </div>
                  <div>
                    <label className="text-sm text-text-muted mb-1 block">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {['coding','study','tech','physical','event','creative'].map(s => (
                        <CategoryChip key={s} category={s} selected={skills.includes(s)} onClick={() => toggleSkill(s)} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {['morning','evening','anytime'].map(a => (
                      <button key={a} onClick={() => setAvailability(a)}
                        className={`flex-1 py-2 rounded-lg text-sm capitalize ${availability === a ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditing(false)} className="flex-1 bg-surface-2 text-text py-2 rounded-lg btn-press"><X size={16} className="inline mr-1" />Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-white py-2 rounded-lg btn-press"><Save size={16} className="inline mr-1" />Save</button>
                  </div>
                </div>
              ) : (
                <>
                  {profile.bio && <p className="text-sm text-text-muted mb-3">{profile.bio}</p>}
                  {profile.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {profile.skills.map(s => <CategoryChip key={s} category={s} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Points', value: <PointsDisplay amount={profile.points_balance} size="sm" /> },
              { label: 'Reputation', value: <ReputationStars score={profile.reputation_score} /> },
              { label: 'Completion', value: <span className="text-accent-2 font-bold">{Number(profile.completion_rate || 0).toFixed(0)}%</span> },
              { label: 'Streak', value: <StreakCounter count={profile.streak_count || 0} longest={profile.longest_streak || 0} /> },
            ].map(s => (
              <div key={s.label} className="glass-card p-3 text-center">
                <p className="text-xs text-text-muted mb-1">{s.label}</p>
                {s.value}
              </div>
            ))}
          </div>

          {/* Badge shelf */}
          {badges.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-2">Badges</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {badges.map(ub => (
                  <div key={ub.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="text-2xl">{ub.badges?.icon}</span>
                    <span className="text-xs text-text-muted text-center">{ub.badges?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-4">
            {[
              { key: 'helped', label: 'Helped' },
              { key: 'posted', label: 'Posted' },
              { key: 'reviews', label: 'Reviews' },
              ...(isOwn ? [{ key: 'saved', label: 'Saved' }] : [])
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-primary text-white' : 'text-text-muted'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {(tab === 'helped' || tab === 'posted') && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-8">No tasks yet</p>
              ) : tasks.map(t => (
                <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="glass-card p-3 flex items-center gap-3 cursor-pointer card-hover">
                  <CategoryChip category={t.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <span className={`text-xs ${t.state === 'completed' ? 'text-accent-2' : 'text-text-muted'}`}>{t.state}</span>
                  </div>
                  <PointsDisplay amount={t.points_offered} size="sm" />
                </div>
              ))}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-3">
              {ratings.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-8">No reviews yet</p>
              ) : ratings.map(r => (
                <div key={r.id} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ReputationStars score={r.score} />
                    <span className="text-xs text-text-muted">by {r.rater?.full_name}</span>
                  </div>
                  {r.comment && <p className="text-sm text-text-muted">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 'saved' && (
            <p className="text-center text-text-muted text-sm py-8">Bookmarks saved locally. {bookmarks.length} saved.</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
