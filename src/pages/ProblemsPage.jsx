import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, CheckCircle2, ChevronDown, ChevronUp, Plus, ThumbsUp, Sparkles, MessageCircle, Info, ShieldAlert, Award } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { logHighlight } from '../lib/activityLogger'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const CATEGORIES = ['academic', 'infrastructure', 'social', 'skill_gap', 'event', 'other']

export default function ProblemsPage() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()

  const [problems, setProblems] = useState([])
  const [upvotedProblemIds, setUpvotedProblemIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upvotes') // upvotes, newest, solved
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [departments, setDepartments] = useState([])

  const [showPostModal, setShowPostModal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'academic', tags: [] })

  const [showSolveModal, setShowSolveModal] = useState(null) // problem object
  const [solving, setSolving] = useState(false)
  const [solutionSummary, setSolutionSummary] = useState('')

  const [expandedIds, setExpandedIds] = useState(new Set())

  // Fetch departments
  useEffect(() => {
    supabase.from('departments').select('*')
      .then(({ data }) => setDepartments(data || []))
  }, [])

  // Fetch problems & user's upvotes
  const fetchProblems = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch user upvotes
      if (user?.id) {
        const { data: votes } = await supabase
          .from('problem_upvotes')
          .select('problem_id')
          .eq('user_id', user.id)
        setUpvotedProblemIds(new Set((votes || []).map(v => v.problem_id)))
      }

      // 2. Fetch problems (joined with posters and solvers)
      let query = supabase
        .from('campus_problems')
        .select(`
          *,
          poster:profiles!posted_by(id, full_name, username, avatar_url, department),
          solver:profiles!solver_id(id, full_name, username, avatar_url)
        `)

      if (tab === 'solved') {
        query = query.eq('status', 'solved')
      } else {
        query = query.neq('status', 'solved')
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      if (deptFilter !== 'all') {
        query = query.contains('department_tags', [deptFilter])
      }

      // Sorting
      if (tab === 'upvotes') {
        query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
      } else if (tab === 'newest' || tab === 'solved') {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error

      setProblems(data || [])
    } catch (err) {
      console.error('[Problems] Fetch error:', err)
      addToast('Failed to load campus problems', 'error')
    } finally {
      setLoading(false)
    }
  }, [user?.id, tab, categoryFilter, deptFilter, addToast])

  useEffect(() => {
    fetchProblems()
  }, [fetchProblems])

  // Handle Upvote
  const handleUpvote = async (problemId, currentUpvotes) => {
    if (!user) return addToast('Log in to upvote problems', 'warning')
    const isUpvoted = upvotedProblemIds.has(problemId)

    try {
      if (isUpvoted) {
        // Remove upvote
        await supabase.from('problem_upvotes').delete().eq('user_id', user.id).eq('problem_id', problemId)
        const nextUpvotes = Math.max(0, currentUpvotes - 1)
        await supabase.from('campus_problems').update({ upvotes: nextUpvotes }).eq('id', problemId)
        
        setUpvotedProblemIds(prev => {
          const next = new Set(prev)
          next.delete(problemId)
          return next
        })
        setProblems(prev => prev.map(p => p.id === problemId ? { ...p, upvotes: nextUpvotes } : p))
      } else {
        // Add upvote
        const { error: insertErr } = await supabase.from('problem_upvotes').insert({ user_id: user.id, problem_id: problemId })
        if (insertErr) throw insertErr

        const nextUpvotes = currentUpvotes + 1
        await supabase.from('campus_problems').update({ upvotes: nextUpvotes }).eq('id', problemId)

        // Award points milestones to the poster on client-side triggers
        const targetProblem = problems.find(p => p.id === problemId)
        if (targetProblem && targetProblem.posted_by !== user.id) {
          if (nextUpvotes === 10) {
            // Award 50 pts
            await awardPoints(targetProblem.posted_by, 50, `10 upvotes milestone: ${targetProblem.title}`)
            await logHighlight(targetProblem.posted_by, 'level_reached', 'Milestone Reached! 🚀', `Raised problem "${targetProblem.title}" which received 10+ upvotes.`)
          } else if (nextUpvotes === 50) {
            // Award 200 pts
            await awardPoints(targetProblem.posted_by, 200, `50 upvotes milestone: ${targetProblem.title}`)
            await logHighlight(targetProblem.posted_by, 'level_reached', 'Mega Contribution! 🌟', `Raised problem "${targetProblem.title}" which received 50+ upvotes.`)
          }
        }

        setUpvotedProblemIds(prev => {
          const next = new Set(prev)
          next.add(problemId)
          return next
        })
        setProblems(prev => prev.map(p => p.id === problemId ? { ...p, upvotes: nextUpvotes } : p))
        addToast('Problem upvoted!', 'success')
      }
    } catch (err) {
      console.error('[Problems] Upvote error:', err)
      addToast('Error saving upvote', 'error')
    }
  }

  // Soft Claim Problem
  const handleClaim = async (problemId) => {
    if (!user) return addToast('Log in to claim problems', 'warning')
    try {
      const { error } = await supabase
        .from('campus_problems')
        .update({ solver_id: user.id, status: 'in_progress' })
        .eq('id', problemId)

      if (error) throw error
      addToast("You've claimed this problem! Soft commitment registered. ✅", 'success')
      fetchProblems()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // Submit Solution
  const handleSolveSubmit = async (e) => {
    e.preventDefault()
    if (!solutionSummary.trim()) return addToast('Please explain how you solved this', 'warning')
    setSolving(true)

    try {
      // 1. Update problem to solved
      const { error } = await supabase
        .from('campus_problems')
        .update({ 
          status: 'solved', 
          solution_summary: solutionSummary.trim() 
        })
        .eq('id', showSolveModal.id)

      if (error) throw error

      // 2. Award 500 points to solver + points transaction
      await awardPoints(showSolveModal.solver_id, 500, `Solved campus problem: ${showSolveModal.title}`)

      // 3. Award "problem_solver" badge to user
      await supabase.from('user_badges').insert({ user_id: showSolveModal.solver_id, badge_id: 'problem_solver' }).catch(() => {})

      // 4. Log highlight
      await logHighlight(showSolveModal.solver_id, 'project_completed', 'Solved Campus Problem 🏆', `Admin confirmed solution for: ${showSolveModal.title}. (+500 pts)`)

      addToast('Problem solved! 500 points and Solver Badge awarded! 🏆', 'success')
      setShowSolveModal(null)
      setSolutionSummary('')
      fetchProblems()
    } catch (err) {
      console.error('[Problems] Solve error:', err)
      addToast('Error submitting solution', 'error')
    } finally {
      setSolving(false)
    }
  }

  // Post Problem
  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return addToast('Fill in all fields', 'warning')
    setPosting(true)

    try {
      // Spam prevention: Check if posted in last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('campus_problems')
        .select('id', { count: 'exact', head: true })
        .eq('posted_by', user.id)
        .gt('created_at', oneDayAgo)

      if (count > 0) {
        addToast('Spam prevention: You can post 1 problem per 24 hours.', 'error')
        setPosting(false)
        return
      }

      const { error } = await supabase.from('campus_problems').insert({
        posted_by: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        department_tags: form.tags
      })

      if (error) throw error

      addToast('Problem posted successfully! Let\'s upvote it.', 'success')
      setShowPostModal(false)
      setForm({ title: '', description: '', category: 'academic', tags: [] })
      fetchProblems()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  // Helper point transactional reward
  const awardPoints = async (targetUserId, amount, description) => {
    try {
      // Fetch target balance
      const { data: targetProfile } = await supabase.from('profiles').select('points_balance, lifetime_points_earned').eq('id', targetUserId).single()
      if (targetProfile) {
        const nextBalance = targetProfile.points_balance + amount
        const nextLifetime = (targetProfile.lifetime_points_earned || 0) + amount
        
        // Log transaction
        await supabase.from('point_transactions').insert({
          user_id: targetUserId,
          type: 'bonus',
          amount,
          description
        })

        // Update profile
        await supabase.from('profiles').update({
          points_balance: nextBalance,
          lifetime_points_earned: nextLifetime
        }).eq('id', targetUserId)
      }
    } catch (err) {
      console.error('[Problems] awardPoints error:', err)
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
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-6 lg:pt-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-black text-white flex items-center gap-2">
              <Flame className="text-amber-500 fill-amber-500" /> Campus Problems Board
            </h1>
            <p className="text-white/40 text-sm mt-1">Real issues. Peer collaboration. College infrastructure upgrades.</p>
          </div>
          {user && (
            <button onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7C6FF7, #5B52E5)', boxShadow: '0 4px 16px rgba(124,111,247,0.3)' }}>
              <Plus size={16} /> Post a Problem
            </button>
          )}
        </div>

        {/* Tab & Filters grid */}
        <div className="p-4 rounded-3xl mb-6 space-y-4" style={{ background: '#17171D', border: '1px solid rgba(255,255,255,0.03)' }}>
          
          {/* Main tabs */}
          <div className="flex border-b border-white/5 pb-2">
            {[
              { id: 'upvotes', label: '🔥 Most Upvoted' },
              { id: 'newest', label: '🕐 Newest' },
              { id: 'solved', label: '✅ Recently Solved' }
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-4 py-2 font-heading font-black text-sm relative transition-colors capitalize"
                style={{ color: tab === t.id ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }}>
                {t.label}
                {tab === t.id && (
                  <motion.div layoutId="probActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Categorisation chips */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Categories */}
            <div className="flex-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-wider mr-1">Category:</span>
              <button onClick={() => setCategoryFilter('all')}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all border"
                style={{ 
                  background: categoryFilter === 'all' ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderColor: categoryFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: categoryFilter === 'all' ? '#FFF' : 'rgba(255,255,255,0.4)'
                }}>
                All
              </button>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all border capitalize"
                  style={{ 
                    background: categoryFilter === cat ? 'rgba(255,255,255,0.06)' : 'transparent',
                    borderColor: categoryFilter === cat ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: categoryFilter === cat ? '#FFF' : 'rgba(255,255,255,0.4)'
                  }}>
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Department tags */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Dept:</span>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A0A0F] border border-white/10 outline-none text-white transition-all">
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.icon} {dept.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Problems feed */}
        {loading ? (
          <LoadingSpinner text="Searching campus problems..." />
        ) : problems.length === 0 ? (
          <EmptyState 
            title="No problems found" 
            description="Be the first to raise a campus issue and rally your peers to solve it!" 
            icon={<ShieldAlert size={32} className="text-white/20" />}
          />
        ) : (
          <div className="space-y-4">
            {problems.map(prob => {
              const isUpvoted = upvotedProblemIds.has(prob.id)
              const isExpanded = expandedIds.has(prob.id)
              const postedDate = new Date(prob.created_at).toLocaleDateString()
              
              return (
                <motion.div key={prob.id} layout
                  className="p-6 rounded-3xl relative overflow-hidden transition-all border"
                  style={{ 
                    background: prob.is_featured ? 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(23,23,29,1))' : '#17171D',
                    borderColor: prob.is_featured ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.04)',
                    boxShadow: prob.is_featured ? '0 8px 32px rgba(245,158,11,0.06)' : 'none'
                  }}>
                  
                  {/* Pinned Featured tag */}
                  {prob.is_featured && (
                    <span className="absolute top-0 right-0 px-3.5 py-1 text-[8px] font-black uppercase tracking-widest bg-amber-400 text-black rounded-bl-2xl flex items-center gap-1">
                      <Sparkles size={10} /> Pinned / Featured
                    </span>
                  )}

                  <div className="flex gap-5 items-start">
                    
                    {/* Left Column: Upvote Container */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleUpvote(prob.id, prob.upvotes)}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95"
                        style={{ 
                          background: isUpvoted ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                          borderColor: isUpvoted ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)',
                          color: isUpvoted ? '#F59E0B' : 'rgba(255,255,255,0.3)'
                        }}>
                        <ThumbsUp size={20} className={isUpvoted ? 'fill-amber-500' : ''} />
                      </button>
                      <span className="font-heading font-black text-sm" style={{ color: isUpvoted ? '#F59E0B' : '#FFF' }}>
                        {prob.upvotes}
                      </span>
                    </div>

                    {/* Right Column: Problem Data */}
                    <div className="flex-1 space-y-3">
                      <div>
                        {/* Title & Metadata chips */}
                        <h2 className="font-heading text-lg font-black text-white hover:text-primary transition-colors cursor-pointer"
                          onClick={() => toggleExpand(prob.id)}>
                          {prob.title}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-white/5 text-white/40 tracking-wider">
                            {prob.category.replace('_', ' ')}
                          </span>
                          {prob.department_tags?.map(deptId => {
                            const d = departments.find(x => x.id === deptId)
                            return (
                              <span key={deptId} className="px-2 py-0.5 rounded-lg text-[9px] font-black text-white/60 border border-white/5"
                                style={{ background: `${d?.color}15`, borderColor: `${d?.color}20` }}>
                                {d?.icon} {d?.name || deptId}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {/* Expandable description */}
                      <p className={`text-xs text-white/50 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {prob.description}
                      </p>

                      {/* Expand toggle */}
                      <button onClick={() => toggleExpand(prob.id)}
                        className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                        {isExpanded ? <>Collapse details <ChevronUp size={12} /></> : <>Expand details <ChevronDown size={12} /></>}
                      </button>

                      {/* Solution Summary if Solved */}
                      {prob.status === 'solved' && prob.solution_summary && (
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2 mt-3">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 size={14} /> Solved by @{prob.solver?.username || 'solver'}
                          </div>
                          <p className="text-white/60 text-xs leading-relaxed italic">
                            "{prob.solution_summary}"
                          </p>
                        </div>
                      )}

                      {/* Bottom Footer Info */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden">
                            {prob.poster?.avatar_url ? (
                              <img src={prob.poster.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white/30">
                                {prob.poster?.full_name?.[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-white/40">
                            Raised by @{prob.poster?.username || 'user'} · {postedDate}
                          </span>
                        </div>

                        {/* Status claiming buttons */}
                        <div className="flex items-center gap-2">
                          {prob.status === 'open' && (
                            <button onClick={() => handleClaim(prob.id)}
                              className="px-4 py-1.5 rounded-xl font-bold text-[10px] text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                              🙋‍♂️ I'll work on this
                            </button>
                          )}
                          {prob.status === 'in_progress' && (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                ⚙️ In Progress
                              </span>
                              {prob.solver_id === user?.id && (
                                <button onClick={() => setShowSolveModal(prob)}
                                  className="px-4 py-1.5 rounded-xl font-bold text-[10px] text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                                  Mark as Solved
                                </button>
                              )}
                            </div>
                          )}
                          {prob.status === 'solved' && (
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <Award size={10} /> Solver Rep Earned
                            </span>
                          )}
                        </div>

                      </div>

                    </div>

                  </div>

                </motion.div>
              )
            })}
          </div>
        )}

      </div>

      {/* 1. POST PROBLEM MODAL */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPostModal(false)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg p-6 rounded-3xl shadow-2xl border bg-[#17171D] border-white/10 text-white z-10 space-y-6">
              
              <div>
                <h3 className="font-heading text-xl font-black flex items-center gap-2">
                  <Flame size={20} className="text-amber-500 fill-amber-500" /> Raise a Campus Problem
                </h3>
                <p className="text-white/40 text-xs mt-1">Post a genuine issue and get point rewards when upvoted or solved.</p>
              </div>

              <form onSubmit={handlePostSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Problem Title (max 120 chars)</label>
                  <input type="text" maxLength={120} required
                    value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Broken water purifier near library lobby"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Detailed Description</label>
                  <textarea rows={4} required
                    value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Explain the problem clearly, where it is, and who it affects..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white resize-none focus:border-primary transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Category</label>
                    <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white focus:border-primary transition-colors capitalize">
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Relevant Departments</label>
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
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowPostModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={posting}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors">
                    {posting ? 'Posting...' : 'Post Problem'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SOLVE SUBMISSION MODAL */}
      <AnimatePresence>
        {showSolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSolveModal(null)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 rounded-3xl shadow-2xl border bg-[#17171D] border-white/10 text-white z-10 space-y-6">
              
              <div>
                <h3 className="font-heading text-xl font-black flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-400" /> Submit Solution
                </h3>
                <p className="text-white/40 text-xs mt-1">Provide a brief summary of how this issue was resolved to unlock your point reward.</p>
              </div>

              <form onSubmit={handleSolveSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Solution Summary</label>
                  <textarea rows={4} required
                    value={solutionSummary} onChange={e => setSolutionSummary(e.target.value)}
                    placeholder="Describe how the problem was resolved (e.g. Contacted electrician, fixed loose wiring behind panel)..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-white/5 rounded-xl outline-none text-sm text-white resize-none focus:border-primary transition-colors" />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-400/5 border border-amber-400/10 flex gap-2 text-[10px] text-amber-400/80 leading-relaxed font-semibold">
                  <Info size={18} className="flex-shrink-0" />
                  <span>On submission, you will automatically be credited 🪙 500 Coins and receive the official Solver Badge 🏆 on your portfolio!</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowSolveModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={solving}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors">
                    {solving ? 'Submitting...' : 'Confirm Solution'}
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
