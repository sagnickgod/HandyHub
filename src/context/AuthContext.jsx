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

<<<<<<< HEAD
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
            if (!profileCacheRef.current) {
              setProfile({ error: true, message: error.message || 'Could not load your profile' })
            }
          }
          return null
=======
      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 means "No rows found" - legitimate new user
          setProfile(null)
          profileCacheRef.current = null
        } else {
          console.error('[AuthContext] DB error:', error)
          // Fix: ONLY set error state if we don't already have a valid profile
          // This prevents kicking active users out if a background refresh fails
          setProfile(prev => prev ? prev : { error: true, message: error.message })
>>>>>>> 93f7ad95b3997df3f0200ac8c9d13d2570f9192a
        }

<<<<<<< HEAD
        profileCacheRef.current = data
        setProfile(data)
        return data
      } catch (err) {
        console.error('[AuthContext] fetchProfile exception:', err)
        if (!profileCacheRef.current) {
          setProfile({ error: true, message: err.message || 'Network timeout: Database did not respond.' })
        }
        return null
      } finally {
        fetchPromiseRef.current = null
      }
    })()

    fetchPromiseRef.current = promise
    return promise
=======
      profileCacheRef.current = data
      setProfile(data)
    } catch (err) {
      console.error('[AuthContext] Fetch exception:', err)
      // Apply the same fix in the catch block
      setProfile(prev => prev ? prev : { error: true, message: err.message })
    }
>>>>>>> 93f7ad95b3997df3f0200ac8c9d13d2570f9192a
  }

  useEffect(() => {
    let mounted = true

<<<<<<< HEAD
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
=======
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

    const initSession = async () => {
  const timeoutId = setTimeout(() => {
    if (mounted) {
      setLoading(false)
      // Removed the code that sets profile to null here
      // We don't want to mistakenly log the user out on a slow 3G connection
>>>>>>> 93f7ad95b3997df3f0200ac8c9d13d2570f9192a
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
    // Only set to null if we don't have a cached profile
    if (mounted && !profileCacheRef.current) {
      setUser(null)
      setProfile(null)
    }
  } finally {
    clearTimeout(timeoutId)
    if (mounted) setLoading(false)
  }
}

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
    const handleLogin = async (e) => {
  e.preventDefault()
  
  // Basic Validation
  if (!loginEmail.trim() || !loginPassword.trim()) {
    addToast('Please enter both email and password.', 'error')
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(loginEmail)) {
    addToast('Please enter a valid email address.', 'error')
    return
  }

  setLoading(true)
  
  try {
    const { error } = await signIn(loginEmail, loginPassword)
    if (error) {
      addToast(error.message, 'error')
      setLoading(false)
    } else {
      addToast('Welcome back!', 'success')
      // Navigation handled by the useEffect listener on `user`
    }
  } catch (err) {
    console.error('Login error:', err)
    addToast(err.message || 'An unexpected error occurred.', 'error')
    setLoading(false)
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
