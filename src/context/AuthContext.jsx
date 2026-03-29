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
          // PGRST116 means "No rows found" - legitimate new user
          setProfile(null)
          profileCacheRef.current = null
        } else {
          console.error('[AuthContext] DB error:', error)
          // Fix: ONLY set error state if we don't already have a valid profile
          // This prevents kicking active users out if a background refresh fails
          setProfile(prev => prev ? prev : { error: true, message: error.message })
        }
        return
      }

      profileCacheRef.current = data
      setProfile(data)
    } catch (err) {
      console.error('[AuthContext] Fetch exception:', err)
      // Apply the same fix in the catch block
      setProfile(prev => prev ? prev : { error: true, message: err.message })
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

    const initSession = async () => {
  const timeoutId = setTimeout(() => {
    if (mounted) {
      setLoading(false)
      // Removed the code that sets profile to null here
      // We don't want to mistakenly log the user out on a slow 3G connection
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
