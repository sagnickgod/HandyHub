import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, Award, Calendar, ExternalLink, ShieldCheck, Heart, Sparkles, Trophy, Users, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LevelBadge, getLevelInfo } from '../lib/levels'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

// Categories for mapping visual markers
const HIGHLIGHT_META = {
  task_helped: { icon: Heart, bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Peer Help' },
  badge_earned: { icon: Trophy, bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Badge Earned' },
  level_reached: { icon: Sparkles, bg: 'rgba(168,85,247,0.1)', color: '#A855F7', label: 'Level Up' },
  group_created: { icon: BookOpen, bg: 'rgba(56,189,248,0.1)', color: '#38BDF8', label: 'Study Lead' },
  mentor_session: { icon: Users, bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'Mentoring' },
  skill_verified: { icon: ShieldCheck, bg: 'rgba(6,182,212,0.1)', color: '#06B6D4', label: 'Skill Vouch' },
  project_completed: { icon: Trophy, bg: 'rgba(236,72,153,0.1)', color: '#EC4899', label: 'Project Built' },
}

export default function PublicProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [badges, setBadges] = useState([])
  const [verifications, setVerifications] = useState([])
  const [deptInfo, setDeptInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalPointsEarned, setTotalPointsEarned] = useState(0)

  useEffect(() => {
    if (!username) return

    const fetchPublicData = async () => {
      setLoading(true)
      try {
        // 1. Fetch profile by username
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle()

        if (profErr || !prof) {
          console.error('[PublicProfile] Profile fetch error:', profErr)
          setLoading(false)
          return
        }
        setProfile(prof)

        // Set page metadata dynamically
        document.title = `${prof.full_name} (@${prof.username}) — Campus Activity Record | HandyHub`

        // 2. Fetch department metadata
        if (prof.department) {
          const { data: dept } = await supabase
            .from('departments')
            .select('*')
            .eq('id', prof.department)
            .maybeSingle()
          setDeptInfo(dept)
        }

        // 3. Fetch highlights (including pinned ones)
        const { data: high } = await supabase
          .from('activity_highlights')
          .select('*')
          .eq('user_id', prof.id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
        setHighlights(high || [])

        // 4. Fetch badges
        const { data: bdg } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', prof.id)
        setBadges(bdg || [])

        // 5. Fetch skill verifications
        const { data: vrf } = await supabase
          .from('skill_verifications')
          .select('*')
          .eq('user_id', prof.id)
        setVerifications(vrf || [])

        // 6. Fetch total lifetime points
        const { data: txs } = await supabase
          .from('point_transactions')
          .select('amount')
          .eq('user_id', prof.id)
          .in('type', ['earn', 'bonus'])
        const total = (txs || []).reduce((sum, t) => sum + t.amount, 0)
        setTotalPointsEarned(total)

      } catch (err) {
        console.error('[PublicProfile] Exception fetching:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPublicData()
  }, [username])

  if (loading) return <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center"><LoadingSpinner text="Connecting to Activity Record..." /></div>
  if (!profile) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <EmptyState 
        title="Student portfolio not found" 
        description={`We couldn't find a HandyHub activity record registered under @${username}.`} 
      />
    </div>
  )

  const myLevel = getLevelInfo(totalPointsEarned)
  const verifiedSkillsList = profile.skills?.filter(s => verifications.some(v => v.skill === s)) || []
  const normalSkillsList = profile.skills?.filter(s => !verifications.some(v => v.skill === s)) || []
  const pinnedHighlights = highlights.filter(h => h.is_pinned)
  const regularHighlights = highlights.filter(h => !h.is_pinned)

  return (
    <div className="min-h-screen pb-16 relative overflow-x-hidden" style={{ background: '#0A0A0F' }}>
      
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${deptInfo?.color || '#7C6FF7'}, transparent)` }} />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-12">
        
        {/* Banner/Badge Header */}
        <div className="flex justify-end mb-4">
          <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck size={12} /> Verified Co-Curricular Portfolio
          </span>
        </div>

        {/* Profile Card */}
        <div className="p-8 rounded-3xl mb-8 relative overflow-hidden shadow-2xl border"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', borderColor: 'rgba(255,255,255,0.06)' }}>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            
            {/* Avatar & Level */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-purple-500/10 border-2" style={{ borderColor: deptInfo?.color || 'rgba(124,111,247,0.3)' }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-4xl text-white/30 bg-white/5">
                    {(profile.full_name || 'U')[0]}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-3 -right-3 shadow-lg">
                <LevelBadge level={myLevel.level} size="md" />
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="font-heading text-3xl font-black text-white flex flex-col md:flex-row md:items-center gap-2.5 justify-center md:justify-start">
                  {profile.full_name}
                  <span className="text-sm font-medium text-white/40 font-mono">@{profile.username}</span>
                </h1>
                <p className="text-sm font-semibold mt-1" style={{ color: deptInfo?.color || '#8B8BA7' }}>
                  {myLevel.title} · Level {myLevel.level} Campus Champion
                </p>
              </div>

              {/* Institution details */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-white/50 font-medium">
                {deptInfo && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                    <span>{deptInfo.icon}</span> {deptInfo.name}
                  </span>
                )}
                {profile.course && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                    <GraduationCap size={14} /> {profile.course}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                  <Calendar size={14} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                </span>
              </div>

              {profile.bio && (
                <p className="text-sm text-white/60 leading-relaxed max-w-2xl bg-white/[0.01] p-4 rounded-2xl border border-white/[0.03]">
                  {profile.bio}
                </p>
              )}
            </div>

          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/[0.05]">
            <div className="text-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.02]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Reputation Score</span>
              <span className="text-xl font-black text-white">⭐ {Number(profile.reputation_score || 5.0).toFixed(1)}</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.02]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Tasks Completed</span>
              <span className="text-xl font-black text-emerald-400">+{Number(profile.tasks_completed || 0)} helped</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.02]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Contribution Coins</span>
              <span className="text-xl font-black text-amber-400">🪙 {profile.points_balance} pts</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.02]">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Badges Earned</span>
              <span className="text-xl font-black text-purple-400">🏅 {badges.length} awards</span>
            </div>
          </div>

        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-heading text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-400" /> Verified Skills & Endorsements
            </h2>
            
            <div className="p-6 rounded-3xl border space-y-4"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
              
              {verifiedSkillsList.length === 0 && normalSkillsList.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">No skills listed yet.</p>
              ) : (
                <div className="space-y-4">
                  {/* Verified skills */}
                  {verifiedSkillsList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">Peer-Verified Achievements</h4>
                      <div className="flex flex-wrap gap-2">
                        {verifiedSkillsList.map(skill => {
                          const vouches = verifications.filter(v => v.skill === skill).length
                          const isWidelyVerified = vouches >= 3
                          return (
                            <div key={skill} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm"
                              style={{ 
                                background: isWidelyVerified ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(124,111,247,0.05))' : 'rgba(16,185,129,0.08)', 
                                borderColor: isWidelyVerified ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)',
                                color: isWidelyVerified ? '#FBBF24' : '#34D399'
                              }}>
                              <span>✅ {skill}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                {vouches} vouch{vouches > 1 ? 'es' : ''}
                              </span>
                              {isWidelyVerified && <span title="Widely Verified Champion">🏆</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Standard skills */}
                  {normalSkillsList.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/30">Claimed Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {normalSkillsList.map(skill => (
                          <span key={skill} className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/60 bg-white/5 border border-white/10">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Badges Section */}
          <div className="space-y-6">
            <h2 className="font-heading text-xl font-black text-white flex items-center gap-2">
              <Award size={22} className="text-purple-400" /> Badges Earned
            </h2>
            
            <div className="p-6 rounded-3xl border grid grid-cols-3 gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
              
              {badges.length === 0 ? (
                <div className="col-span-3 text-center py-6">
                  <p className="text-xs text-white/30">No badges earned yet.</p>
                </div>
              ) : (
                badges.map(b => (
                  <div key={b.id} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center group cursor-help transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: `${b.badges?.color || '#7C6FF7'}30` }}
                    title={`${b.badges?.name}: ${b.badges?.description}`}>
                    <span className="text-2xl mb-1">{b.badges?.icon || '🏅'}</span>
                    <span className="text-[9px] font-bold text-white/70 truncate w-full">{b.badges?.name}</span>
                  </div>
                ))
              )}

            </div>
          </div>

        </div>

        {/* Pinned Achievements */}
        {pinnedHighlights.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2 className="font-heading text-lg font-black text-white flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" /> Featured Contributions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pinnedHighlights.map(high => {
                const Meta = HIGHLIGHT_META[high.type] || HIGHLIGHT_META.task_helped
                const IconComp = Meta.icon
                return (
                  <div key={high.id} className="p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between"
                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(255,255,255,0.01))', borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="absolute top-2 right-2 text-xs">📌</div>
                    <div>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: Meta.bg, color: Meta.color }}>
                        <IconComp size={16} />
                      </div>
                      <h4 className="text-white font-bold text-sm leading-snug">{high.title}</h4>
                      {high.description && <p className="text-white/50 text-xs mt-1 leading-relaxed">{high.description}</p>}
                    </div>
                    <div className="text-[9px] text-white/20 font-mono mt-4">
                      {new Date(high.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Full Activity Timeline */}
        <div className="space-y-6">
          <h2 className="font-heading text-xl font-black text-white flex items-center gap-2">
            <GraduationCap size={22} className="text-violet-400" /> Campus Contribution Timeline
          </h2>

          {regularHighlights.length === 0 && pinnedHighlights.length === 0 ? (
            <div className="p-12 rounded-3xl border text-center"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-sm text-white/30">No highlights registered on this record yet.</p>
            </div>
          ) : (
            <div className="relative border-l border-white/5 ml-3 pl-6 space-y-6">
              {regularHighlights.map(high => {
                const Meta = HIGHLIGHT_META[high.type] || HIGHLIGHT_META.task_helped
                const IconComp = Meta.icon
                return (
                  <div key={high.id} className="relative group">
                    
                    {/* Bullet marker */}
                    <div className="absolute -left-[35px] top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#0A0A0F]"
                      style={{ background: Meta.color, boxShadow: `0 0 10px ${Meta.color}40` }}>
                      <IconComp size={8} className="text-white" />
                    </div>

                    <div className="p-5 rounded-2xl border transition-all hover:bg-white/[0.02]"
                      style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider w-fit"
                          style={{ background: Meta.bg, color: Meta.color }}>
                          {Meta.label}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          {new Date(high.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-2 leading-relaxed">{high.title}</h3>
                      {high.description && <p className="text-xs text-white/50 mt-1 leading-relaxed">{high.description}</p>}
                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </div>

        {/* Shareable Footer CTA */}
        <div className="mt-16 text-center p-8 rounded-3xl border relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,111,247,0.06), rgba(0,0,0,0.5))', borderColor: 'rgba(124,111,247,0.15)' }}>
          <div className="relative z-10 space-y-4">
            <h3 className="font-heading text-xl font-black text-white">Want to build your own verified Campus Activity Record?</h3>
            <p className="text-sm text-white/50 max-w-lg mx-auto">
              Join HandyHub to complete tasks, gain peer endorsements, co-found study groups, and earn permanent recognition.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/auth" className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover transition-all shadow-lg hover:shadow-primary/20">
                Register on HandyHub <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
