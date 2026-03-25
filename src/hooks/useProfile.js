import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useProfile(userId) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const targetId = userId || user?.id

  const fetchProfile = useCallback(async () => {
    if (!targetId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single()

    if (!error) setProfile(data)
    setLoading(false)
  }, [targetId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return { profile, loading, refetch: fetchProfile }
}

export function useUserBadges(userId) {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      const { data } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', userId)
      setBadges(data || [])
      setLoading(false)
    }
    fetch()
  }, [userId])

  return { badges, loading }
}

export function useAllBadges() {
  const [badges, setBadges] = useState([])
  useEffect(() => {
    supabase.from('badges').select('*').then(({ data }) => setBadges(data || []))
  }, [])
  return badges
}
