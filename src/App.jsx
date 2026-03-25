import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Topbar from './components/layout/Topbar'
import LoadingSpinner from './components/ui/LoadingSpinner'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import FeedPage from './pages/FeedPage'
import TaskDetailPage from './pages/TaskDetailPage'
import PostTaskPage from './pages/PostTaskPage'
import ProfilePage from './pages/ProfilePage'
import WalletPage from './pages/WalletPage'
import LeaderboardPage from './pages/LeaderboardPage'
import NotificationsPage from './pages/NotificationsPage'
import BadgesPage from './pages/BadgesPage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const { user, loading, profile, refreshProfile } = useAuth()
  const location = useLocation()

  // 1. Initial login/session loading
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg"><LoadingSpinner text="Loading..." /></div>
  
  // 2. Not logged in
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />

  // 3. Logged in, but profile fetch failed (Network Error)
  if (profile && profile.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0F] p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connection Issue</h2>
        <p className="text-white/50 mb-8 max-w-sm">We couldn't reach the campus database. This is usually caused by an ad-blocker or a slow network.</p>
        <button 
          onClick={() => refreshProfile()}
          className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/20"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  // 4. Logged in, but profile fetch is in-flight (Spinner)
  if (profile === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-bg"><LoadingSpinner text="Connecting to profile..." /></div>
  }

  // 5. Decision: profile is null (New User) or incomplete row
  const needsOnboarding = profile === null || !profile.onboarding_completed

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/feed" replace />
  }

  return children
}

function AppLayout({ children }) {
  const { user } = useAuth()
  if (!user) return children

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full">
        <Topbar />
        <main className="flex-1 pb-20 lg:pb-0 relative overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><AppLayout><FeedPage /></AppLayout></ProtectedRoute>} />
          <Route path="/tasks/:id" element={<ProtectedRoute><AppLayout><TaskDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/post-task" element={<ProtectedRoute><AppLayout><PostTaskPage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><AppLayout><WalletPage /></AppLayout></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/badges" element={<ProtectedRoute><AppLayout><BadgesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminPage /></AppLayout></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <AnimatedRoutes />
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
