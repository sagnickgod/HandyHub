import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Save, X, MapPin, GraduationCap, Clock, Star, Camera, ArrowLeftRight, CheckCircle, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile, useUserBadges } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { LevelBadge, getLevelProgress, getLevelInfo } from '../lib/levels'
import { calculateProfileScore, PROFILE_SCORE_ITEMS } from '../lib/profileCompletion'
import { logHighlight } from '../lib/activityLogger'
import PointsDisplay from '../components/ui/PointsDisplay'
import ReputationStars from '../components/ui/ReputationStars'
import StreakCounter from '../components/ui/StreakCounter'
import CategoryChip from '../components/ui/CategoryChip'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const CATEGORY_COLORS = {
  coding:   '#7C6FF7', study: '#38BDF8', tech: '#FBBF24',
  physical: '#FB923C', event: '#34D399', creative: '#F472B6', other: '#94A3B8'
}

const inputStyle = {
  width: '100%', padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, transition: 'all 0.2s'
}

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const { addToast } = useToast()

  const isOwn = !id || id === user?.id
  const targetId = isOwn ? user?.id : id
  const { profile, loading, refetch } = useProfile(targetId)
  const { badges } = useUserBadges(targetId)

  const [tab, setTab] = useState('highlights')
  const [highlights, setHighlights] = useState([])
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState([])
  const [availability, setAvailability] = useState('anytime')
  const [tasks, setTasks] = useState([])
  const [ratings, setRatings] = useState([])
  const [ratingStats, setRatingStats] = useState({ avg: 0, total: 0 })
  const [bookmarks, setBookmarks] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [totalPointsEarned, setTotalPointsEarned] = useState(0)
  const [verifiedSkills, setVerifiedSkills] = useState([])
  const [completedSwaps, setCompletedSwaps] = useState([])
  const [profileStats, setProfileStats] = useState({ tasksPosted: 0, tasksHelped: 0, ratingsReceived: 0 })
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapForm, setSwapForm] = useState({ offers: '', wants: '', message: '' })
  const [showVouchModal, setShowVouchModal] = useState(null)
  const fileInputRef = useRef(null)

  const levelProgress = getLevelProgress(totalPointsEarned)
  const myLevel = getLevelInfo(myProfile?.points_earned || totalPointsEarned)
  const profileScore = isOwn ? calculateProfileScore(profile, { ...profileStats, skillsVerified: verifiedSkills.length }) : null
  const isSkillVerified = (skill) => verifiedSkills.some(v => v.skill === skill)
  const canVouch = !isOwn && myLevel.level >= 5
  const isOnline = profile?.last_active_date === new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (profile) { setBio(profile.bio || ''); setSkills(profile.skills || []); setAvailability(profile.availability || 'anytime') }
  }, [profile])

  // Fetch rating stats
  useEffect(() => {
    if (!targetId) return
    supabase.from('ratings').select('score').eq('ratee_id', targetId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((s, r) => s + r.score, 0) / data.length
          setRatingStats({ avg: avg.toFixed(1), total: data.length })
          setProfileStats(prev => ({ ...prev, ratingsReceived: data.length }))
        } else {
          setRatingStats({ avg: 0, total: 0 })
        }
      })
  }, [targetId])

  // Fetch total lifetime points earned
  useEffect(() => {
    if (!targetId) return
    supabase.from('point_transactions').select('amount').eq('user_id', targetId).in('type', ['earn', 'bonus'])
      .then(({ data }) => {
        const total = (data || []).reduce((s, t) => s + t.amount, 0)
        setTotalPointsEarned(total)
      })
  }, [targetId])

  // Fetch verified skills
  useEffect(() => {
    if (!targetId) return
    supabase.from('skill_verifications').select('skill, verified_by').eq('user_id', targetId)
      .then(({ data }) => setVerifiedSkills(data || []))
  }, [targetId])

  // Fetch completed swaps
  useEffect(() => {
    if (!targetId) return
    supabase.from('skill_swaps').select('requester_offers, requester_wants')
      .or(`requester_id.eq.${targetId},receiver_id.eq.${targetId}`)
      .eq('status', 'completed')
      .then(({ data }) => setCompletedSwaps(data || []))
  }, [targetId])

  // Fetch profile completion stats
  useEffect(() => {
    if (!targetId || !isOwn) return
    Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('poster_id', targetId),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('selected_helper_id', targetId).eq('state', 'completed'),
    ]).then(([posted, helped]) => {
      setProfileStats(prev => ({ ...prev, tasksPosted: posted.count || 0, tasksHelped: helped.count || 0 }))
    })
  }, [targetId, isOwn])

  useEffect(() => {
    if (!targetId) return
    if (tab === 'highlights') {
      supabase.from('activity_highlights').select('*').eq('user_id', targetId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
        .then(({ data }) => setHighlights(data || []))
    } else if (tab === 'helped') {
      supabase.from('tasks').select('id, title, state, points_offered, completed_at, category')
        .eq('selected_helper_id', targetId).eq('state', 'completed')
        .order('completed_at', { ascending: false }).limit(20)
        .then(({ data }) => setTasks(data || []))
    } else if (tab === 'posted') {
      supabase.from('tasks').select('id, title, state, points_offered, created_at, category')
        .eq('poster_id', targetId).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setTasks(data || []))
    } else if (tab === 'reviews') {
      supabase.from('ratings').select('*, rater:profiles!rater_id(full_name), task:tasks!task_id(title)')
        .eq('ratee_id', targetId).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setRatings(data || []))
    } else if (tab === 'saved' && isOwn) {
      const saved = JSON.parse(localStorage.getItem('handyhub-bookmarks') || '[]')
      setBookmarks(saved)
    }
  }, [targetId, tab, isOwn])

  // Handle Profile Completion Check and rewards trigger
  useEffect(() => {
    if (isOwn && profileScore && profileScore.isComplete) {
      const rewarded = localStorage.getItem('handyhub-perfect-profile-rewarded')
      if (!rewarded) {
        const claimReward = async () => {
          await awardPoints(user.id, 100, 'Bonus: 100% Profile Completion Perfect Profile! ✨')
          await supabase.from('user_badges').insert({ user_id: user.id, badge_id: 'perfect_profile' }).catch(() => {})
          await logHighlight(user.id, 'badge_earned', 'Perfect Profile unlocked! ✨', 'Completed co-curricular activity record setup 100%. (+100 pts)')
          
          localStorage.setItem('handyhub-perfect-profile-rewarded', 'true')
          addToast('🎉 Perfect Profile achieved! 100 Coins & Perfect Profile Badge unlocked!', 'success')
          refreshProfile()
        }
        claimReward()
      }
    }
  }, [isOwn, profileScore, user?.id])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ bio, skills, availability }).eq('id', user.id)
    await refreshProfile()
    setEditing(false)
    addToast('Profile updated!', 'success')
    setSaving(false); refetch()
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return addToast('Max 5MB', 'error')
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { addToast(uploadError.message, 'error'); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    await refreshProfile()
    refetch()
    addToast('Profile photo updated!', 'success')
    setUploadingAvatar(false)
  }

  const awardPoints = async (targetUserId, amount, description) => {
    try {
      const { data: targetProfile } = await supabase.from('profiles').select('points_balance, lifetime_points_earned').eq('id', targetUserId).single()
      if (targetProfile) {
        const nextBalance = targetProfile.points_balance + amount
        const nextLifetime = (targetProfile.lifetime_points_earned || 0) + amount
        
        await supabase.from('point_transactions').insert({
          user_id: targetUserId,
          type: 'bonus',
          amount,
          description
        })

        await supabase.from('profiles').update({
          points_balance: nextBalance,
          lifetime_points_earned: nextLifetime
        }).eq('id', targetUserId)
      }
    } catch (err) {
      console.error('[ProfilePage] awardPoints error:', err)
    }
  }

  const togglePin = async (highId, currentPin) => {
    if (currentPin) {
      await supabase.from('activity_highlights').update({ is_pinned: false }).eq('id', highId)
      addToast('Highlight unpinned! 📌', 'success')
    } else {
      const pinnedCount = highlights.filter(h => h.is_pinned).length
      if (pinnedCount >= 3) {
        addToast('Maximum 3 pinned highlights allowed!', 'error')
        return
      }
      await supabase.from('activity_highlights').update({ is_pinned: true }).eq('id', highId)
      addToast('Highlight pinned to top! 📌', 'success')
    }
    const { data } = await supabase.from('activity_highlights').select('*').eq('user_id', targetId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    setHighlights(data || [])
  }

  const handleVouch = async (skill) => {
    const { error } = await supabase.from('skill_verifications').insert({ user_id: targetId, skill, verified_by: user.id })
    if (error) {
      if (error.message.includes('duplicate')) addToast('Already vouched for this skill!', 'error')
      else addToast(error.message, 'error')
    } else {
      addToast(`Vouched for ${skill}! ✅`, 'success')
      // Log co-curricular record highlight
      await logHighlight(targetId, 'skill_verified', `Skill Endorsed: ${skill}`, `Vouched by peer @${myProfile?.username || 'user'}.`, user.id)
      // Send notification
      await supabase.from('notifications').insert({ user_id: targetId, type: 'vouch', message: `🎉 ${myProfile?.full_name} vouched for your ${skill} skill!`, link: `/profile/${user.id}` }).catch(() => {})
      setVerifiedSkills(prev => [...prev, { skill, verified_by: user.id }])
    }
  }

  const handleProposeSwap = async () => {
    if (!swapForm.offers.trim() || !swapForm.wants.trim()) return addToast('Fill in what you offer and want', 'error')
    const { error } = await supabase.from('skill_swaps').insert({
      requester_id: user.id, receiver_id: targetId,
      requester_offers: swapForm.offers.trim(), requester_wants: swapForm.wants.trim(),
      message: swapForm.message.trim(),
    })
    if (error) addToast(error.message, 'error')
    else { addToast('Swap proposed! 🔄', 'success'); setShowSwapModal(false); setSwapForm({ offers: '', wants: '', message: '' }) }
  }

  const toggleSkill = (s) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  if (loading) return <LoadingSpinner text="Loading profile..." />
  if (!profile) return <EmptyState title="Profile not found" />

  const STATS = [
    { label: 'Balance',    content: <PointsDisplay amount={profile.points_balance} size="sm" /> },
    { label: 'Rating',     content: (
      <div className="flex items-center gap-1">
        <Star size={13} className="text-amber-400 fill-amber-400" />
        <span className="text-amber-400 font-black text-sm">{ratingStats.avg > 0 ? ratingStats.avg : '—'}</span>
        <span className="text-white/25 text-[10px]">({ratingStats.total})</span>
      </div>
    )},
    { label: 'Done',       content: <span className="text-emerald-400 font-black text-sm">{Number(profile.completion_rate || 0).toFixed(0)}%</span> },
    { label: 'Streak',     content: <StreakCounter count={profile.streak_count || 0} longest={profile.longest_streak || 0} /> },
  ]

  const TABS = [
    { key: 'highlights', label: 'Activity Record' },
    { key: 'helped', label: 'Helped' },
    { key: 'posted', label: 'Posted' },
    { key: 'reviews', label: 'Reviews' },
    ...(isOwn ? [{ key: 'saved', label: 'Saved' }] : [])
  ]

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-48 opacity-30"
          style={{ background: 'linear-gradient(180deg, rgba(124,111,247,0.08), transparent)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-6 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Profile Completion Score (own profile only) */}
          {isOwn && profileScore && !profileScore.isComplete && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-5 rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(124,111,247,0.15)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/70 font-bold text-sm">Your profile is {profileScore.score}% complete</span>
                <span className="text-xs font-black" style={{ color: '#7C6FF7' }}>{profileScore.score}%</span>
              </div>
              <div className="w-full h-2 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${profileScore.score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: `linear-gradient(90deg, #7C6FF7, ${profileScore.score > 60 ? '#34D399' : '#38BDF8'})` }} />
              </div>
              <div className="space-y-1.5">
                {profileScore.incomplete.slice(0, 3).map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-xs text-white/35">
                    <span className="w-1 h-1 rounded-full bg-violet-400/50" />
                    {item.label}
                    <span className="text-violet-400/50 ml-auto text-[10px]">+{item.points}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Hero card */}
          <div className="relative overflow-hidden rounded-3xl mb-5"
            style={{ background: 'linear-gradient(135deg, #17171D, #13131A)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Banner */}
            <div className="h-28 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(124,111,247,0.25), rgba(99,102,241,0.15), rgba(56,189,248,0.1))' }}>
              <div className="absolute inset-0 backdrop-blur-sm" />
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0px, transparent 1px, transparent 32px)' }} />
            </div>

            <div className="px-6 pb-6 -mt-10 relative">
              <div className="flex items-end gap-4 mb-5">
                {/* Avatar with upload */}
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white border-4 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(124,111,247,0.3), rgba(99,102,241,0.2))',
                      borderColor: '#13131A',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{profile.full_name?.[0]}</span>
                    }
                  </div>
                  {isOwn && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.5)' }}>
                      {uploadingAvatar ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Camera size={20} className="text-white/80" />}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  {isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ background: '#10B981', borderColor: '#13131A', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                  )}
                </div>

                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-xl font-black text-white">{profile.full_name}</h1>
                    <LevelBadge level={levelProgress.current.level} size="sm" />
                  </div>
                  <p className="text-white/40 text-sm">@{profile.username}</p>
                  <p className="text-xs mt-0.5" style={{ color: levelProgress.current.color }}>
                    {levelProgress.current.title}
                  </p>
                </div>

                {isOwn && !editing ? (
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => {
                        const publicLink = `${window.location.origin}/u/${profile.username}`
                        navigator.clipboard.writeText(publicLink)
                        addToast('Portfolio link copied to clipboard! 📋', 'success')
                      }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-[#34D399] flex items-center gap-1.5"
                      style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
                    >
                      Share Link
                    </motion.button>
                    <motion.button
                      onClick={() => navigate(`/u/${profile.username}`)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 flex items-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      Preview
                    </motion.button>
                    <motion.button
                      onClick={() => setEditing(true)}
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                      className="p-2.5 rounded-xl transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Edit3 size={15} className="text-white/45" />
                    </motion.button>
                  </div>
                ) : !isOwn && (
                  <motion.button
                    onClick={() => setShowSwapModal(true)}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899', border: '1px solid rgba(236,72,153,0.25)' }}>
                    <ArrowLeftRight size={13} /> Propose Swap
                  </motion.button>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 mb-4">
                {profile.course && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <GraduationCap size={12} />
                    {profile.course} {profile.year ? `• Y${profile.year}` : ''}
                  </div>
                )}
                {profile.availability && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Clock size={12} />
                    Available {profile.availability}
                  </div>
                )}
              </div>

              {/* XP Progress Bar */}
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-white/40">Level {levelProgress.current.level} — {levelProgress.current.title}</span>
                  {levelProgress.next && (
                    <span className="text-white/25">{totalPointsEarned} / {levelProgress.next.minPoints} pts</span>
                  )}
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${levelProgress.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ background: `linear-gradient(90deg, ${levelProgress.current.color}, ${levelProgress.next?.color || levelProgress.current.color})` }} />
                </div>
                {levelProgress.next && (
                  <p className="text-[10px] text-white/20 mt-1">Next: {levelProgress.next.title}</p>
                )}
              </div>

              {/* Edit form or bio+skills view */}
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Bio ({bio.length}/160)</label>
                      <textarea value={bio} onChange={e => e.target.value.length <= 160 && setBio(e.target.value)} rows={2}
                        style={{ ...inputStyle, resize: 'none' }}
                        onFocus={e => { e.target.style.border = '1px solid rgba(124,111,247,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,111,247,0.08)' }}
                        onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {['coding','study','tech','physical','event','creative'].map(s => (
                          <button key={s} type="button" onClick={() => toggleSkill(s)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all capitalize"
                            style={{
                              background: skills.includes(s) ? `${CATEGORY_COLORS[s] || '#7C6FF7'}20` : 'rgba(255,255,255,0.04)',
                              border: skills.includes(s) ? `1px solid ${CATEGORY_COLORS[s] || '#7C6FF7'}40` : '1px solid rgba(255,255,255,0.07)',
                              color: skills.includes(s) ? CATEGORY_COLORS[s] || '#7C6FF7' : 'rgba(255,255,255,0.3)'
                            }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {['morning','evening','anytime'].map(a => (
                        <button key={a} onClick={() => setAvailability(a)} type="button"
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all"
                          style={{
                            background: availability === a ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.04)',
                            border: availability === a ? '1px solid rgba(124,111,247,0.4)' : '1px solid rgba(255,255,255,0.07)',
                            color: availability === a ? '#7C6FF7' : 'rgba(255,255,255,0.35)'
                          }}>{a}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <motion.button onClick={() => setEditing(false)} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <X size={14} />Cancel
                      </motion.button>
                      <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
                        <Save size={14} />{saving ? 'Saving...' : 'Save'}
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {profile.bio && <p className="text-white/45 text-sm mb-3 leading-relaxed">{profile.bio}</p>}
                    {profile.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map(s => (
                          <div key={s} className="flex items-center gap-1">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider capitalize flex items-center gap-1"
                              style={{ background: `${CATEGORY_COLORS[s] || '#7C6FF7'}15`, border: `1px solid ${CATEGORY_COLORS[s] || '#7C6FF7'}25`, color: CATEGORY_COLORS[s] || '#7C6FF7' }}>
                              {isSkillVerified(s) && <CheckCircle size={10} className="text-emerald-400" />}
                              {s}
                            </span>
                            {canVouch && !isSkillVerified(s) && (
                              <button onClick={() => handleVouch(s)}
                                className="text-[9px] text-emerald-400/60 hover:text-emerald-400 transition-colors font-bold">
                                Vouch ✅
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="text-center p-3.5 rounded-2xl"
                style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-white/25 text-[9px] uppercase tracking-[0.12em] mb-1.5">{s.label}</p>
                {s.content}
              </motion.div>
            ))}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mb-5 p-5 rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3">Badges</h3>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {badges.map(ub => (
                  <div key={ub.id} className="flex flex-col items-center gap-1.5 min-w-[56px] group">
                    <span className="text-2xl transition-transform group-hover:scale-125"
                      style={{ filter: `drop-shadow(0 0 8px ${ub.badges?.color || '#7C6FF7'}80)` }}>
                      {ub.badges?.icon}
                    </span>
                    <span className="text-[10px] text-white/30 text-center leading-tight">{ub.badges?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Swaps */}
          {completedSwaps.length > 0 && (
            <div className="mb-5 p-5 rounded-3xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3">🔄 Skill Swaps ({completedSwaps.length})</h3>
              <div className="flex flex-wrap gap-2">
                {completedSwaps.map((sw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899', border: '1px solid rgba(236,72,153,0.2)' }}>
                    {sw.requester_offers} ↔ {sw.requester_wants}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: tab === t.key ? 'linear-gradient(135deg, #7C6FF7, #5B52E5)' : 'transparent',
                  color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)',
                  boxShadow: tab === t.key ? '0 4px 12px rgba(124,111,247,0.25)' : 'none'
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {tab === 'highlights' && (
              <motion.div key="highlights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white">Your Campus Activity Record</h4>
                    <p className="text-[10px] text-white/45 mt-0.5">Verified chronological portfolio shareable as a public link.</p>
                  </div>
                  {isOwn && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => {
                        const link = `${window.location.origin}/u/${profile.username}`
                        navigator.clipboard.writeText(link)
                        addToast('Link copied! 📋', 'success')
                      }} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 transition-all active:scale-95">
                        Share Link
                      </button>
                      <button onClick={() => navigate(`/u/${profile.username}`)}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-white/50 bg-white/5 border border-white/10 transition-all active:scale-95">
                        Preview
                      </button>
                    </div>
                  )}
                </div>

                {highlights.length === 0 ? (
                  <p className="text-center text-white/25 text-sm py-10">No highlights registered on this record yet.</p>
                ) : (
                  <div className="space-y-3">
                    {highlights.map(high => (
                      <div key={high.id} className="p-4 rounded-2xl flex items-center justify-between gap-4 border"
                        style={{ 
                          background: high.is_pinned ? 'linear-gradient(135deg, rgba(245,158,11,0.03), rgba(23,23,29,1))' : '#17171D',
                          borderColor: high.is_pinned ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'
                        }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/45">
                              {high.type.replace('_', ' ')}
                            </span>
                            {high.is_pinned && <span className="text-[9px] text-amber-400 font-bold">📌 Pinned</span>}
                          </div>
                          <p className="text-white/80 font-bold text-sm mt-1 leading-snug">{high.title}</p>
                           {high.description && <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{high.description}</p>}
                        </div>
                        {isOwn && (
                          <button onClick={() => togglePin(high.id, high.is_pinned)}
                            className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-colors"
                            style={{ 
                              background: high.is_pinned ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                              color: high.is_pinned ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                              border: `1px solid ${high.is_pinned ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`
                            }}>
                            {high.is_pinned ? 'Unpin' : 'Pin Highlight'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {(tab === 'helped' || tab === 'posted') && (
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-center text-white/25 text-sm py-10">No tasks yet</p>
                ) : tasks.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all group"
                    style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1C1C26'}
                    onMouseLeave={e => e.currentTarget.style.background = '#17171D'}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: CATEGORY_COLORS[t.category] || '#7C6FF7' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/75 text-sm font-semibold truncate">{t.title}</p>
                      <span className="text-xs capitalize" style={{ color: t.state === 'completed' ? '#34D399' : 'rgba(255,255,255,0.3)' }}>{t.state}</span>
                    </div>
                    <PointsDisplay amount={t.points_offered} size="sm" />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === 'reviews' && (
              <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {ratings.length === 0 ? (
                  <p className="text-center text-white/25 text-sm py-10">No reviews yet</p>
                ) : ratings.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-2xl" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12} className={s <= r.score ? 'text-amber-400 fill-amber-400' : 'text-white/15'} />
                        ))}
                      </div>
                      <span className="text-xs text-white/30">by {r.rater?.full_name}</span>
                    </div>
                    {r.task?.title && (
                      <p className="text-[10px] text-violet-400/60 mb-1">📋 {r.task.title}</p>
                    )}
                    {r.comment && <p className="text-sm text-white/45 leading-relaxed">{r.comment}</p>}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-center text-white/25 text-sm py-10">
                  {bookmarks.length} task{bookmarks.length !== 1 ? 's' : ''} bookmarked locally.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Skill Swap Proposal Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSwapModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-md rounded-3xl p-6 z-10"
              style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">🔄 Propose Skill Swap</h2>
                <button onClick={() => setShowSwapModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">I'll offer</label>
                  <input value={swapForm.offers} onChange={e => setSwapForm(p => ({ ...p, offers: e.target.value }))}
                    placeholder="e.g. Python tutoring" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">In exchange for</label>
                  <input value={swapForm.wants} onChange={e => setSwapForm(p => ({ ...p, wants: e.target.value }))}
                    placeholder="e.g. Canva design help" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 block mb-2">Message (optional)</label>
                  <textarea value={swapForm.message} onChange={e => setSwapForm(p => ({ ...p, message: e.target.value }))}
                    rows={2} placeholder="Hey, I noticed you're great at..." style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <motion.button onClick={handleProposeSwap} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                  Send Swap Proposal 🔄
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
