import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Shield, Users, BarChart3, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePoints } from '../hooks/usePoints'
import { useToast } from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function AdminPage() {
  const { profile } = useAuth()
  const { releaseEscrow, refundEscrow } = usePoints()
  const { addToast } = useToast()

  const [tab, setTab] = useState('disputes')
  const [disputes, setDisputes] = useState([])
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    fetchDisputes()
    fetchStats()
  }, [])

  const fetchDisputes = async () => {
    const { data } = await supabase
      .from('disputes')
      .select('*, task:tasks(id, title, points_offered, poster_id, selected_helper_id), raiser:profiles!raised_by(full_name)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
    setDisputes(data || [])
    setLoading(false)
  }

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const [{ count: totalUsers }, { count: todayTasks }, { count: completedToday }, { count: activeDisputes }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('state', 'completed').gte('completed_at', today),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).is('resolved_at', null),
    ])

    const { data: escrowData } = await supabase.from('profiles').select('escrow_balance')
    const totalEscrow = (escrowData || []).reduce((s, p) => s + (p.escrow_balance || 0), 0)

    setStats({ totalUsers, todayTasks, completedToday, activeDisputes, totalEscrow })
  }

  const searchUsers = async () => {
    if (!userSearch.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${userSearch}%,college_email.ilike.%${userSearch}%,username.ilike.%${userSearch}%`)
      .limit(10)
    setUsers(data || [])
  }

  const handleRuling = async (dispute, forHelper) => {
    setActionLoading(dispute.id)
    const task = dispute.task

    if (forHelper) {
      await releaseEscrow(task.poster_id, task.selected_helper_id, task.points_offered, task.id)
      await supabase.from('tasks').update({ state: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)
      await supabase.from('disputes').update({
        admin_ruling: 'Ruled in favor of helper',
        resolved_by: profile.id,
        resolved_at: new Date().toISOString()
      }).eq('id', dispute.id)
    } else {
      await refundEscrow(task.poster_id, task.points_offered, task.id, 0)
      await supabase.from('tasks').update({ state: 'cancelled' }).eq('id', task.id)
      await supabase.from('disputes').update({
        admin_ruling: 'Ruled in favor of poster',
        resolved_by: profile.id,
        resolved_at: new Date().toISOString()
      }).eq('id', dispute.id)
    }

    addToast(`Dispute resolved. ${forHelper ? 'Helper paid.' : 'Poster refunded.'}`, 'success')
    fetchDisputes()
    fetchStats()
    setActionLoading('')
  }

  const toggleSuspend = async (userId, isSuspended) => {
    await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId)
    addToast(isSuspended ? 'User unsuspended' : 'User suspended', 'info')
    searchUsers()
  }

  if (!profile?.is_admin) return <div className="p-8 text-center text-text-muted">Admin access required</div>

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2"><Shield size={24} className="text-primary" /> Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Users', value: stats.totalUsers || 0, icon: Users },
            { label: 'Tasks Today', value: stats.todayTasks || 0, icon: BarChart3 },
            { label: 'Completed Today', value: stats.completedToday || 0, icon: BarChart3 },
            { label: 'Active Disputes', value: stats.activeDisputes || 0, icon: AlertTriangle },
            { label: 'Escrow Pool', value: `🪙 ${stats.totalEscrow || 0}`, icon: Shield },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon size={18} className="text-primary mx-auto mb-1" />
              <p className="font-heading text-xl font-bold">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['disputes', 'users'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${tab === t ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'disputes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? <LoadingSpinner /> : disputes.length === 0 ? (
              <div className="text-center py-8 text-text-muted">No active disputes 🎉</div>
            ) : (
              <div className="space-y-4">
                {disputes.map(d => (
                  <div key={d.id} className="glass-card p-5">
                    <h3 className="font-semibold mb-1">{d.task?.title}</h3>
                    <p className="text-sm text-text-muted mb-2">Raised by: {d.raiser?.full_name}</p>
                    <p className="text-sm text-text-muted mb-2">Reason: {d.reason}</p>
                    {d.helper_response && <p className="text-sm text-text-muted mb-2">Helper response: {d.helper_response}</p>}
                    <p className="text-sm text-accent mb-3">🪙 {d.task?.points_offered} at stake</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleRuling(d, true)} disabled={actionLoading === d.id}
                        className="flex-1 bg-accent-2 text-white py-2 rounded-lg font-medium btn-press disabled:opacity-50">
                        Rule for Helper
                      </button>
                      <button onClick={() => handleRuling(d, false)} disabled={actionLoading === d.id}
                        className="flex-1 bg-danger text-white py-2 rounded-lg font-medium btn-press disabled:opacity-50">
                        Rule for Poster
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-2 mb-4">
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email..." onKeyDown={e => e.key === 'Enter' && searchUsers()} />
              <button onClick={searchUsers} className="bg-primary text-white px-4 rounded-lg btn-press"><Search size={18} /></button>
            </div>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {u.full_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{u.full_name} <span className="text-text-muted font-normal">@{u.username}</span></p>
                    <p className="text-xs text-text-muted">{u.college_email} · {u.total_tasks_helped || 0} helped</p>
                  </div>
                  <button onClick={() => toggleSuspend(u.id, u.is_suspended)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg btn-press ${u.is_suspended ? 'bg-accent-2/10 text-accent-2' : 'bg-danger/10 text-danger'}`}>
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
