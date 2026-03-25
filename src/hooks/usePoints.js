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
    // Deduct from poster escrow
    await supabase
      .from('point_transactions')
      .insert({
        user_id: posterId,
        type: 'escrow_release',
        amount: -amount,
        description: 'Escrow released for completed task',
        task_id: taskId
      })

    // Credit to helper
    await supabase
      .from('point_transactions')
      .insert({
        user_id: helperId,
        type: 'earn',
        amount: amount,
        description: 'Payment for completing task',
        task_id: taskId
      })

    // Update poster escrow
    const { data: posterProfile } = await supabase
      .from('profiles')
      .select('escrow_balance')
      .eq('id', posterId)
      .single()

    await supabase
      .from('profiles')
      .update({ escrow_balance: Math.max(0, (posterProfile?.escrow_balance || 0) - amount) })
      .eq('id', posterId)

    // Update helper balance
    const { data: helperProfile } = await supabase
      .from('profiles')
      .select('points_balance, total_tasks_helped')
      .eq('id', helperId)
      .single()

    await supabase
      .from('profiles')
      .update({
        points_balance: (helperProfile?.points_balance || 0) + amount,
        total_tasks_helped: (helperProfile?.total_tasks_helped || 0) + 1
      })
      .eq('id', helperId)

    await refreshProfile()
  }

  const refundEscrow = async (userId, amount, taskId, penalty = 0) => {
    const refundAmount = amount - penalty

    await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        type: 'escrow_refund',
        amount: refundAmount,
        description: penalty > 0 ? `Escrow refund minus ${penalty}pt penalty` : 'Escrow refund',
        task_id: taskId
      })

    const { data: profile } = await supabase
      .from('profiles')
      .select('points_balance, escrow_balance')
      .eq('id', userId)
      .single()

    await supabase
      .from('profiles')
      .update({
        points_balance: (profile?.points_balance || 0) + refundAmount,
        escrow_balance: Math.max(0, (profile?.escrow_balance || 0) - amount)
      })
      .eq('id', userId)

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
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const exists = completions.find(c => c.challenge_type === 'login')
    if (exists) return false

    await supabase.from('daily_completions').insert({
      user_id: user.id,
      challenge_type: 'login',
      completed_date: today
    })

    await supabase.from('point_transactions').insert({
      user_id: user.id,
      type: 'bonus',
      amount: 10,
      description: 'Daily login bonus'
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ points_balance: (profile?.points_balance || 0) + 10 })
      .eq('id', user.id)

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'bonus',
      title: '🪙 +10 Daily login bonus!',
      body: 'You earned 10 points for logging in today.'
    })

    setCompletions(prev => [...prev, { challenge_type: 'login', completed_date: today }])
    await refreshProfile()
    return true
  }

  const hasCompleted = (type) => completions.some(c => c.challenge_type === type)

  return { completions, loading, claimLoginBonus, hasCompleted }
}
