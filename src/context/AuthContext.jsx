import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)
  // Cache the profile to avoid re-fetching on every tab-switch / TOKEN_REFRESHED event
  const profileCacheRef = useRef(null)

  const fetchProfile = async (userId, force = false) => {
    // If we have a cached profile and this isn't a forced refresh, return early
    if (!force && profileCacheRef.current && profileCacheRef.current.id === userId) {
      setProfile(profileCacheRef.current)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setProfile(null)
          profileCacheRef.current = null
        } else {
          console.error('[AuthContext] DB error:', error)
          // Don't overwrite a good cached profile with an error state
          if (!profileCacheRef.current) {
            setProfile({ error: true, message: error.message })
          }
        }
        return
      }

      profileCacheRef.current = data
      setProfile(data)
    } catch (err) {
      console.error('[AuthContext] Fetch exception:', err)
      if (!profileCacheRef.current) {
        setProfile({ error: true, message: err.message })
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      const timeoutId = setTimeout(() => {
        if (mounted) {
          setLoading(false)
          // Don't wipe profile on timeout — if we have a cache, keep it
          if (profile === undefined && !profileCacheRef.current) {
            setProfile(null)
          }
        }
      }, 8000)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          profileCacheRef.current = null
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err)
        if (mounted && !profileCacheRef.current) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        clearTimeout(timeoutId)
        if (mounted) setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        console.log('[AuthContext] Event:', event)

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          profileCacheRef.current = null
          setLoading(false)
          return
        }

        if (event === 'INITIAL_SESSION') {
          // Handled by initSession above, skip
          return
        }

        if (session?.user) {
          setUser(session.user)

          if (event === 'SIGNED_IN') {
            // Fresh login — force a real fetch, ignore any stale cache
            profileCacheRef.current = null
            setProfile(undefined)
            await fetchProfile(session.user.id, true)
          } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            // Tab switch or token refresh — re-use cache, don't show spinner
            await fetchProfile(session.user.id, false)
          }
        }
      }
    )

    return () => {
      mounted = false
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      profileCacheRef.current = null
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
