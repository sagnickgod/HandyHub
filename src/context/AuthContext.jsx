import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)   // undefined = not yet determined
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

  // Cache the profile to avoid re-fetching on every tab-switch / TOKEN_REFRESHED event
  const profileCacheRef = useRef(null)
  // Dedup concurrent fetchProfile calls
  const fetchPromiseRef = useRef(null)

  const fetchProfile = async (userId, force = false) => {
    // Return cached profile immediately (no unnecessary DB call)
    if (!force && profileCacheRef.current && profileCacheRef.current.id === userId) {
      setProfile(profileCacheRef.current)
      return profileCacheRef.current
    }

    // Deduplicate concurrent requests — wait for the one already in-flight
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current
    }

    const promise = (async () => {
      try {
        // Add aggressive 8s timeout to prevent infinite suspension on flaky networks
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase query took too long to resolve')), 8000)
        )
        
        const dbQuery = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        const { data, error } = await Promise.race([dbQuery, timeoutPromise])

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile row does not exist yet → send to onboarding
            setProfile(null)
            profileCacheRef.current = null
          } else {
            console.error('[AuthContext] fetchProfile DB error:', error)
            // Network/DB error — keep any existing cached profile so the user isn't locked out
            setProfile(prev => prev ? prev : { error: true, message: error.message || 'Could not load your profile' })
          }
          return null
        }

        profileCacheRef.current = data
        setProfile(data)
        return data
      } catch (err) {
        console.error('[AuthContext] fetchProfile exception:', err)
        setProfile(prev => prev ? prev : { error: true, message: err.message || 'Network timeout: Database did not respond.' })
        return null
      } finally {
        fetchPromiseRef.current = null
      }
    })()

    fetchPromiseRef.current = promise
    return promise
  }

  useEffect(() => {
    let mounted = true

    // Set a fallback timeout for the loading state:
    // If Supabase completely fails to fire INITIAL_SESSION for any reason
    // within 8 seconds, we terminate the loading state.
    const fallbackTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        console.log('[AuthContext] event:', event, '| user:', session?.user?.id ?? 'none')

        if (event === 'INITIAL_SESSION') {
          clearTimeout(fallbackTimeout)
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
            profileCacheRef.current = null
          }
          if (mounted) setLoading(false)
          return
        }

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          profileCacheRef.current = null
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setUser(session.user)
            const isSameUser = profileCacheRef.current?.id === session.user.id
            if (!isSameUser) {
              profileCacheRef.current = null
              setProfile(undefined)
            }
            await fetchProfile(session.user.id, !isSameUser)
          }
          if (mounted) setLoading(false)
          return
        }

        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id, false)
          }
          if (mounted) setLoading(false)
          return
        }
      }
    )

    // Trigger a manual getSession strictly to kickstart the onAuthStateChange listener
    // in older/flaky Supabase versions, but WE DONT RELY ON ITS RESULT.
    supabase.auth.getSession().catch(() => {})

    return () => {
      mounted = false
      clearTimeout(fallbackTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    profileCacheRef.current = null
    fetchPromiseRef.current = null
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      profileCacheRef.current = null
      fetchPromiseRef.current = null
      await fetchProfile(user.id, true)
    }
  }

  const updateLastActive = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ last_active_date: new Date().toISOString().split('T')[0] })
        .eq('id', user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateLastActive,
      isAdmin: profile?.is_admin ?? false
    }}>
      {children}
    </AuthContext.Provider>
  )
}
