import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePoints() {
  const { user, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState([])

  const fetchTransactions = useCallback(async (filter = 'all', page = 0) => {
    if (!user) return
    setLoading(true)
    let query = supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * 20, (page + 1) * 20 - 1)

    if (filter === 'earned') query = query.eq('type', 'earn')
    else if (filter === 'spent') query = query.in('type', ['spend', 'escrow_lock'])
    else if (filter === 'bonuses') query = query.eq('type', 'bonus')

    const { data } = await query
    setTransactions(data || [])
    setLoading(false)
  }, [user])

  const fetchWeeklyData = useCallback(async () => {
    if (!user) return
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const { data } = await supabase
      .from('point_transactions')
      .select('amount, created_at, type')
      .eq('user_id', user.id)
      .in('type', ['earn', 'bonus'])
      .gte('created_at', eightWeeksAgo.toISOString())
      .order('created_at', { ascending: true })

    if (data) {
      const weeks = {}
      data.forEach(t => {
        const d = new Date(t.created_at)
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const key = weekStart.toISOString().split('T')[0]
        weeks[key] = (weeks[key] || 0) + t.amount
      })

      const result = Object.entries(weeks).map(([week, points]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        points
      }))
      setWeeklyData(result)
    }
  }, [user])

  useEffect(() => {
    fetchTransactions()
    fetchWeeklyData()
  }, [fetchTransactions, fetchWeeklyData])

  const lockEscrow = async (amount, taskId, description) => {
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: user.id,
        type: 'escrow_lock',
        amount: -amount,
        description,
        task_id: taskId
      })
    if (txError) return { error: txError }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        points_balance: supabase.rpc ? undefined : undefined,
      })
      .eq('id', user.id)

    await supabase.rpc('lock_escrow', { p_user_id: user.id, p_amount: amount }).catch(() => {
      // Fallback: manual update
      return supabase
        .from('profiles')
        .update({
          points_balance: (user.points_balance || 1000) - amount,
          escrow_balance: (user.escrow_balance || 0) + amount,
        })
        .eq('id', user.id)
    })

    await refreshProfile()
    return { error: null }
  }

  const releaseEscrow = async (posterId, helperId, amount, taskId) => {
    const { error } = await supabase.rpc('release_escrow', {
      p_poster_id: posterId,
      p_helper_id: helperId,
      p_amount: amount,
      p_task_id: taskId
    })

    if (error) {
      console.error('Failed to release escrow', error)
      throw error // Or handle more gracefully depending on usage
    }

    await refreshProfile()
  }

  const refundEscrow = async (userId, amount, taskId, penalty = 0) => {
    const { error } = await supabase.rpc('refund_escrow', {
      p_user_id: userId,
      p_amount: amount,
      p_task_id: taskId,
      p_penalty: penalty
    })
    
    if (error) {
      console.error('Failed to refund escrow', error)
      throw error
    }

    await refreshProfile()
  }

  return {
    transactions,
    loading,
    weeklyData,
    fetchTransactions,
    lockEscrow,
    releaseEscrow,
    refundEscrow
  }
}

export function useDailyBonuses() {
  const { user, refreshProfile } = useAuth()
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('daily_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed_date', today)
      .then(({ data }) => {
        setCompletions(data || [])
        setLoading(false)
      })
  }, [user])

  const claimLoginBonus = async () => {
    if (!user) return false
    const today = new Date().toISOString().split('T')[0]
    const exists = completions.find(c => c.challenge_type === 'login')
    if (exists) return false

    const { error } = await supabase.rpc('claim_login_bonus', { p_user_id: user.id })
    if (error) {
      console.error('Failed to claim bonus:', error)
      return false
    }

    setCompletions(prev => [...prev, { challenge_type: 'login', completed_date: today }])
    await refreshProfile()
    return true
  }

  const hasCompleted = (type) => completions.some(c => c.challenge_type === type)

  return { completions, loading, claimLoginBonus, hasCompleted }
}
