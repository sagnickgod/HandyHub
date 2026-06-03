import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Calendar, Plus, Users, UserPlus, Star, ExternalLink, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Github, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { logHighlight } from '../lib/activityLogger'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

export default function ProjectsPage() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()

  const [projects, setProjects] = useState([])
  const [collaborators, setCollaborators] = useState([]) // all project collabs
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('recruiting') // recruiting, active, completed
  const [deptFilter, setDeptFilter] = useState('all')
  const [departments, setDepartments] = useState([])

  const [showPostModal, setShowPostModal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', timeline: '', maxCollaborators: 4, tags: [], skills: '' })

  const [showApplyModal, setShowApplyModal] = useState(null) // project object
  const [applying, setApplying] = useState(false)
  const [applyForm, setApplyForm] = useState({ role: '', reason: '' })

  const [showCompleteModal, setShowCompleteModal] = useState(null) // project object
  const [completing, setCompleting] = useState(false)
  const [outcomeUrl, setOutcomeUrl] = useState('')

  const [expandedIds, setExpandedIds] = useState(new Set())

  // Fetch departments
  useEffect(() => {
    supabase.from('departments').select('*')
      .then(({ data }) => setDepartments(data || []))
  }, [])

  // Fetch projects and collaborators
  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch projects
      let query = supabase
        .from('open_projects')
        .select('*, creator:profiles!creator_id(id, full_name, username, avatar_url, department)')
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (deptFilter !== 'all') {
        query = query.contains('department_tags', [deptFilter])
      }

      const { data: projs, error: projErr } = await query.order('created_at', { ascending: false })
      if (projErr) throw projErr

      // 2. Fetch all collaborators for these projects
      if (projs && projs.length > 0) {
        const projIds = projs.map(p => p.id)
        const { data: collabs, error: collabErr } = await supabase
          .from('project_collaborators')
          .select('*, user:profiles(id, full_name, username, avatar_url, department)')
          .in('project_id', projIds)

        if (collabErr) throw collabErr
        setCollaborators(collabs || [])
      } else {
        setCollaborators([])
      }

      setProjects(projs || [])
    } catch (err) {
      console.error('[Projects] Fetch error:', err)
      addToast('Failed to load projects', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, deptFilter, addToast])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Apply to collaborate
  const handleApplySubmit = async (e) => {
    e.preventDefault()
    if (!applyForm.role.trim() || !applyForm.reason.trim()) return addToast('Fill in all fields', 'warning')
    setApplying(true)

    try {
      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: showApplyModal.id,
          user_id: user.id,
          role: applyForm.role.trim(),
          status: 'pending'
        })

      if (error) {
        if (error.message.includes('duplicate')) addToast('You have already applied to this project!', 'error')
        else throw error
      } else {
        addToast('Application submitted successfully! 🚀', 'success')
        
        // Notify creator
        await supabase.from('notifications').insert({
          user_id: showApplyModal.creator_id,
          type: 'collab_apply',
          message: `👋 @${profile.username} applied to collaborate on: ${showApplyModal.title}`,
          link: `/projects`
        }).catch(() => {})

        setShowApplyModal(null)
        setApplyForm({ role: '', reason: '' })
        fetchProjects()
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setApplying(false)
    }
  }

  // Handle Application Approval/Rejection
  const handleApplicationStatus = async (collabId, newStatus, projectTitle, applicantId) => {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ status: newStatus })
        .eq('id', collabId)

      if (error) throw error
      addToast(`Collaborator ${newStatus}!`, 'success')

      // Notify applicant
      await supabase.from('notifications').insert({
        user_id: applicantId,
        type: 'collab_decision',
        message: newStatus === 'approved' 
          ? `🎉 Your application to collaborate on "${projectTitle}" was APPROVED!`
          : `🤝 Your application to collaborate on "${projectTitle}" was declined.`,
        link: `/projects`
      }).catch(() => {})

      fetchProjects()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // Complete Project
  const handleCompleteSubmit = async (e) => {
    e.preventDefault()
    if (!outcomeUrl.trim()) return addToast('Please provide an outcome link (e.g. GitHub, Google doc)', 'warning')
    setCompleting(true)

    try {
      // 1. Mark project completed
      const { error: updateErr } = await supabase
        .from('open_projects')
        .update({ 
          status: 'completed', 
          outcome_url: outcomeUrl.trim() 
        })
        .eq('id', showCompleteModal.id)

      if (updateErr) throw updateErr

      // 2. Fetch approved collaborators
      const approvedCollabs = collaborators.filter(
        c => c.project_id === showCompleteModal.id && c.status === 'approved'
      )

      // Include creator in reward as well
      const teamUserIds = [showCompleteModal.creator_id, ...approvedCollabs.map(c => c.user_id)]

      // 3. Award +200 points + Project Builder badge + Log co-curricular record for everyone on team
      for (const tUserId of teamUserIds) {
        // Award points
        await awardPoints(tUserId, 200, `Completed collaboration project: ${showCompleteModal.title}`)
        
        // Award badge
        await supabase.from('user_badges').insert({ user_id: tUserId, badge_id: 'project_builder' }).catch(() => {})

        // Log highlight
        await logHighlight(tUserId, 'project_completed', 'Project Completed 🛠️', `Built and completed project "${showCompleteModal.title}" with peers. (+200 pts)`)

        // Notify team
        if (tUserId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: tUserId,
            type: 'project_completed',
            message: `🛠️ Project completed: "${showCompleteModal.title}"! +200 points and Project Builder Badge awarded!`,
            link: `/profile/${tUserId}`
          }).catch(() => {})
        }
      }

      addToast('Project marked as completed! Points and badges distributed! 🛠️🎉', 'success')
      setShowCompleteModal(null)
      setOutcomeUrl('')
      fetchProjects()
    } catch (err) {
      console.error('[Projects] Completion error:', err)
      addToast('Error completing project', 'error')
    } finally {
      setCompleting(false)
    }
  }

  // Post Collaboration Project
  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return addToast('Fill in all required fields', 'warning')
    setPosting(true)

    try {
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean)
      const { error } = await supabase.from('open_projects').insert({
        creator_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        timeline: form.timeline.trim() || 'Not specified',
        max_collaborators: parseInt(form.maxCollaborators) || 4,
        department_tags: form.tags,
        skills_needed: skillsArray
      })

      if (error) throw error

      addToast('Project recruitment board opened! 🚀', 'success')
      setShowPostModal(false)
      setForm({ title: '', description: '', timeline: '', maxCollaborators: 4, tags: [], skills: '' })
      fetchProjects()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  // Helper point transactional reward
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
      console.error('[Projects] awardPoints error:', err)
    }
  }

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-10" style={{ background: '#0A0A0F' }}>
      
      {/* Background accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #7C6FF7, transparent)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-6 lg:pt-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-black text-white flex items-center gap-2">
              <Briefcase className="text-purple-500" /> Open Projects
            </h1>
            <p className="text-white/40 text-sm mt-1">Cross-department product building. Recruit contributors. Build your portfolio.</p>
          </div>
          {user && (
            <button onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
              <Plus size={16} /> Post a Project
            </button>
          )}
        </div>

        {/* Tab & Filters */}
        <div className="p-4 rounded-3xl mb-6 space-y-4" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.03)' }}>
          
          <div className="flex border-b border-white/5 pb-2">
            {[
              { id: 'recruiting', label: '📢 Recruiting' },
              { id: 'active', label: '⚙️ Active Collaboration' },
              { id: 'completed', label: '✅ Completed Projects' }
            ].map(t => (
              <button key={t.id} onClick={() => setStatusFilter(t.id)}
                className="px-4 py-2 font-heading font-black text-sm relative transition-colors"
                style={{ color: statusFilter === t.id ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }}>
                {t.label}
                {statusFilter === t.id && (
                  <motion.div layoutId="projActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C6FF7]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Dept Tag Filter:</span>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A0A0F] border border-white/10 outline-none text-white transition-all">
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.icon} {dept.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Projects Feed */}
        {loading ? (
          <LoadingSpinner text="Searching collaborative projects..." />
        ) : projects.length === 0 ? (
          <EmptyState 
            title="No projects found" 
            description="Start a side-project, gather teammates, and build co-curricular record lines together!" 
            icon={<Briefcase size={32} className="text-white/20" />}
          />
        ) : (
          <div className="space-y-4">
            {projects.map(proj => {
              const isExpanded = expandedIds.has(proj.id)
              const team = collaborators.filter(c => c.project_id === proj.id)
              const approvedTeam = team.filter(c => c.status === 'approved')
              const pendingApps = team.filter(c => c.status === 'pending')

              const isCreator = proj.creator_id === user?.id
              const hasApplied = team.some(c => c.user_id === user?.id)
              const userCollabStatus = team.find(c => c.user_id === user?.id)?.status

              return (
                <motion.div key={proj.id} layout
                  className="p-6 rounded-3xl relative overflow-hidden transition-all border bg-[#17171D] border-white/4">
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    
                    {/* Main Title & Creators */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {proj.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed Outcome
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#7C6FF7]/15 text-[#8B80F9] border border-[#7C6FF7]/20">
                          ⏳ {proj.timeline}
                        </span>
                      </div>
                      
                      <h2 className="font-heading text-xl font-black text-white hover:text-primary transition-colors cursor-pointer"
                        onClick={() => toggleExpand(proj.id)}>
                        {proj.title}
                      </h2>

                      {/* Department Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {proj.department_tags?.map(deptId => {
                          const d = departments.find(x => x.id === deptId)
                          return (
                            <span key={deptId} className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold text-white/50 border border-white/5 bg-white/[0.01]">
                              {d?.icon} {d?.name || deptId}
                            </span>
                          )
                        })}
                      </div>

                    </div>

                    {/* Team Count Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0A0A0F] border border-white/5 w-fit">
                      <Users size={14} className="text-white/40" />
                      <span className="text-xs font-black text-white">
                        {approvedTeam.length + 1} / {proj.max_collaborators + 1}
                      </span>
                      <span className="text-[10px] text-white/30">teammates</span>
                    </div>

                  </div>

                  <p className={`text-xs text-white/50 leading-relaxed mb-4 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {proj.description}
                  </p>

                  {/* Skills Needed Chips */}
                  {proj.skills_needed?.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/30 mr-2">Skills Needed:</span>
                      <div className="inline-flex flex-wrap gap-1">
                        {proj.skills_needed.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expand Toggle */}
                  <button onClick={() => toggleExpand(proj.id)}
                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors mb-4">
                    {isExpanded ? <>Collapse details <ChevronUp size={12} /></> : <>Expand details & collaborators <ChevronDown size={12} /></>}
                  </button>

                  {/* Expanded Sections */}
                  {isExpanded && (
                    <div className="space-y-6 pt-4 border-t border-white/[0.04] mt-4">
                      
                      {/* Current Team list */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3">Project Team</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* Creator card */}
                          <div className="p-3 rounded-2xl bg-[#0A0A0F] border border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden">
                              {proj.creator?.avatar_url ? (
                                <img src={proj.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white/30">
                                  {proj.creator?.full_name?.[0]}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white">{proj.creator?.full_name}</p>
                              <p className="text-[9px] text-[#7C6FF7] font-bold">👑 Creator / Team Lead</p>
                            </div>
                          </div>

                          {/* Approved collaborators */}
                          {approvedTeam.map(collab => (
                            <div key={collab.id} className="p-3 rounded-2xl bg-[#0A0A0F] border border-white/5 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden">
                                {collab.user?.avatar_url ? (
                                  <img src={collab.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white/30">
                                    {collab.user?.full_name?.[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black text-white">{collab.user?.full_name}</p>
                                <p className="text-[9px] text-emerald-400 font-bold">✅ {collab.role}</p>
                              </div>
                            </div>
                          ))}

                        </div>
                      </div>

                      {/* Creator Approval Dashboard (Private to creator) */}
                      {isCreator && proj.status !== 'completed' && pendingApps.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-400">Teammate Applications</h4>
                          <div className="space-y-3">
                            {pendingApps.map(app => (
                              <div key={app.id} className="p-3.5 rounded-xl bg-[#0A0A0F] border border-white/5 space-y-2">
                                <div className="flex justify-between items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white">{app.user?.full_name}</span>
                                    <span className="text-[9px] text-white/30">(@{app.user?.username})</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-purple-500/10 text-purple-400">
                                    Role: {app.role}
                                  </span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed italic">
                                  "{app.reason}"
                                </p>
                                <div className="flex justify-end gap-2 pt-2">
                                  <button onClick={() => handleApplicationStatus(app.id, 'rejected', proj.title, app.user_id)}
                                    className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-red-400 bg-red-400/5 hover:bg-red-400/10 transition-colors">
                                    Decline
                                  </button>
                                  <button onClick={() => handleApplicationStatus(app.id, 'approved', proj.title, app.user_id)}
                                    className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                                    Approve Teammate
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Outcome Details if Completed */}
                      {proj.status === 'completed' && proj.outcome_url && (
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 size={16} /> Completed Co-Curricular Work
                          </div>
                          <a href={proj.outcome_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-400 text-black hover:bg-emerald-300 transition-colors">
                            View Outcome Outcome <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Bottom Footer Info & Action buttons */}
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.04] mt-4">
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden">
                        {proj.creator?.avatar_url ? (
                          <img src={proj.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white/30">
                            {proj.creator?.full_name?.[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-white/40">
                        Lead by @{proj.creator?.username || 'user'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {proj.status === 'recruiting' && !isCreator && !hasApplied && (
                        <button onClick={() => setShowApplyModal(proj)}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl font-bold text-[10px] text-black bg-[#7C6FF7] hover:bg-[#6B5CE6] transition-colors">
                          <UserPlus size={12} /> Apply to Team
                        </button>
                      )}
                      
                      {proj.status === 'recruiting' && hasApplied && (
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                          userCollabStatus === 'pending' ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {userCollabStatus === 'pending' ? '⏳ Application Pending' : 'Declinined'}
                        </span>
                      )}

                      {proj.status === 'active' && isCreator && (
                        <button onClick={() => setShowCompleteModal(proj)}
                          className="px-4 py-1.5 rounded-xl font-bold text-[10px] text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                          Mark as Completed
                        </button>
                      )}

                      {proj.status === 'active' && !isCreator && (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-400">
                          ⚙️ Active Coding
                        </span>
                      )}

                      {proj.status === 'completed' && (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                          <ShieldCheck size={10} /> Verified Record
                        </span>
                      )}
                    </div>

                  </div>

                </motion.div>
              )
            })}
          </div>
        )}

      </div>

      {/* 1. APPLY MODAL */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApplyModal(null)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 rounded-3xl shadow-2xl border bg-[#17171D] border-white/10 text-white z-10 space-y-6">
              
              <div>
                <h3 className="font-heading text-xl font-black flex items-center gap-2">
                  <UserPlus size={20} className="text-[#7C6FF7]" /> Apply to Collaborate
                </h3>
                <p className="text-white/40 text-xs mt-1">Apply to join "{showApplyModal.title}" led by @{showApplyModal.creator?.username}.</p>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Proposed Teammate Role</label>
                  <input type="text" required
                    value={applyForm.role} onChange={e => setApplyForm(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g. UI/UX Designer, React Developer"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Why are you a good fit?</label>
                  <textarea rows={4} required
                    value={applyForm.reason} onChange={e => setApplyForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Briefly state your skills and what you can contribute to the team..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white resize-none focus:border-primary transition-colors" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowApplyModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={applying}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors">
                    {applying ? 'Sending...' : 'Send Application'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. COMPLETE MODAL */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompleteModal(null)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 rounded-3xl shadow-2xl border bg-[#17171D] border-white/10 text-white z-10 space-y-6">
              
              <div>
                <h3 className="font-heading text-xl font-black flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-400" /> Complete Collaboration
                </h3>
                <p className="text-white/40 text-xs mt-1">Submit the final deliverables link to verify and complete "{showCompleteModal.title}".</p>
              </div>

              <form onSubmit={handleCompleteSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Outcome URL (GitHub repository or document link)</label>
                  <input type="url" required
                    value={outcomeUrl} onChange={e => setOutcomeUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                </div>

                <div className="p-3.5 rounded-2xl bg-[#7C6FF7]/5 border border-[#7C6FF7]/15 flex gap-2 text-[10px] text-[#8B80F9] leading-relaxed font-semibold">
                  <Star size={18} className="flex-shrink-0" />
                  <span>On completion, you and all approved teammates will automatically receive 🪙 200 Coins and the co-curricular Project Builder Badge!</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCompleteModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={completing}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors">
                    {completing ? 'Completing...' : 'Mark Completed'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. POST PROJECT MODAL */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPostModal(false)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg p-6 rounded-3xl shadow-2xl border bg-[#17171D] border-white/10 text-white z-10 space-y-6">
              
              <div>
                <h3 className="font-heading text-xl font-black flex items-center gap-2">
                  <Plus size={20} className="text-[#7C6FF7]" /> Post a Collaborative Project
                </h3>
                <p className="text-white/40 text-xs mt-1">Start recruiting a cross-department student squad for your campus product.</p>
              </div>

              <form onSubmit={handlePostSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Project Title (max 100 chars)</label>
                  <input type="text" maxLength={100} required
                    value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Smart Campus Navigation App"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Description & Target</label>
                  <textarea rows={3} required
                    value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What is this project? What are you building? Explain the target outcome..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white resize-none focus:border-primary transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Timeline / Duration</label>
                    <input type="text" required
                      value={form.timeline} onChange={e => setForm(prev => ({ ...prev, timeline: e.target.value }))}
                      placeholder="e.g. 3 weeks, before sem end"
                      className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Max Collaborators</label>
                    <input type="number" min={1} max={10} required
                      value={form.maxCollaborators} onChange={e => setForm(prev => ({ ...prev, maxCollaborators: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Skills Needed (comma separated)</label>
                  <input type="text" required
                    value={form.skills} onChange={e => setForm(prev => ({ ...prev, skills: e.target.value }))}
                    placeholder="e.g. React, UI Design, Marketing, CAD"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Target Departments (chips)</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-xl bg-[#0A0A0F] border border-white/5">
                    {departments.map(dept => {
                      const isSelected = form.tags.includes(dept.id)
                      return (
                        <button key={dept.id} type="button"
                          onClick={() => {
                            setForm(prev => {
                              const nextTags = isSelected ? prev.tags.filter(t => t !== dept.id) : [...prev.tags, dept.id]
                              return { ...prev, tags: nextTags }
                            })
                          }}
                          className="px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-colors"
                          style={{ 
                            background: isSelected ? `${dept.color}25` : 'transparent',
                            borderColor: isSelected ? `${dept.color}60` : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#FFF' : 'rgba(255,255,255,0.3)'
                          }}>
                          {dept.icon} {dept.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPostModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={posting}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors">
                    {posting ? 'Posting...' : 'Open Project'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
