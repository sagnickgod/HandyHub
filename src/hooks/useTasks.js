import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(filters = {}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const fetchTasks = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, poster:profiles!poster_id(id, full_name, username, avatar_url, reputation_score, completion_rate)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters.urgency === 'high') {
      query = query.eq('urgency', 'high')
    }
    if (filters.state) {
      query = query.eq('state', filters.state)
    }
    if (filters.posterId) {
      query = query.eq('poster_id', filters.posterId)
    }
    if (filters.helperId) {
      query = query.eq('selected_helper_id', filters.helperId)
    }
    if (filters.minPoints) {
      query = query.gte('points_offered', filters.minPoints)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    if (filters.sortBy === 'points') {
      query = query.order('points_offered', { ascending: false })
    } else if (filters.sortBy === 'urgency') {
      query = query.order('urgency', { ascending: false })
    }
    if (filters.deadlineSoon) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 2)
      query = query.lte('deadline', tomorrow.toISOString()).gte('deadline', new Date().toISOString())
    }

    const { data, error } = await query
    if (!error && data) {
      if (append) {
        setTasks(prev => [...prev, ...data])
      } else {
        setTasks(data)
      }
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [filters.category, filters.urgency, filters.state, filters.posterId, filters.helperId, filters.minPoints, filters.search, filters.sortBy, filters.deadlineSoon])

  useEffect(() => {
    setPage(0)
    fetchTasks(0, false)
  }, [fetchTasks])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTasks(nextPage, true)
  }

  return { tasks, loading, hasMore, loadMore, refetch: () => fetchTasks(0, false), setTasks }
}

export function useTask(taskId) {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!poster_id(id, full_name, username, avatar_url, reputation_score, completion_rate),
        helper:profiles!selected_helper_id(id, full_name, username, avatar_url, reputation_score, completion_rate),
        task_attachments(*),
        proofs(*),
        ratings(*),
        disputes(*)
      `)
      .eq('id', taskId)
      .single()

    if (!error) setTask(data)
    setLoading(false)
  }, [taskId])

  useEffect(() => { fetchTask() }, [fetchTask])

  return { task, loading, refetch: fetchTask }
}

export function useApplications(taskId) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!taskId) return
    const fetch = async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, applicant:profiles!applicant_id(id, full_name, username, avatar_url, reputation_score, completion_rate)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      setApplications(data || [])
      setLoading(false)
    }
    fetch()
  }, [taskId])

  return { applications, loading, refetch: () => {
    supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(id, full_name, username, avatar_url, reputation_score, completion_rate)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setApplications(data || []))
  }}
}

export function useUserApplications(userId) {
  const [applicationTaskIds, setApplicationTaskIds] = useState(new Set())

  useEffect(() => {
    if (!userId) return
    supabase
      .from('applications')
      .select('task_id')
      .eq('applicant_id', userId)
      .then(({ data }) => {
        setApplicationTaskIds(new Set((data || []).map(a => a.task_id)))
      })
  }, [userId])

  return applicationTaskIds
}
