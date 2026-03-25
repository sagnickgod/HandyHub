import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Eye, EyeOff, Sparkles, ShieldCheck, Gamepad2 } from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const { user, signIn, signUp } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Auto-redirect if already logged in (e.g. after successful signIn)
  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)

  // Register state
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [errors, setErrors] = useState({})

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error } = await signIn(loginEmail, loginPassword)
      if (error) {
        addToast(error.message, 'error')
        setLoading(false)
      } else {
        addToast('Welcome back!', 'success')
        // We will NOT call navigate('/feed') here. 
        // We let the useEffect([user]) catch the context update and navigate safely.
        // It prevents the race condition where handleLogin navigates before the context updates.
      }
    } catch (err) {
      console.error('Login error:', err)
      addToast(err.message || 'An unexpected error occurred.', 'error')
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Required'
    if (!username.trim()) errs.username = 'Required'
    if (username.includes(' ')) errs.username = 'No spaces allowed'
    if (!regEmail.trim()) errs.email = 'Required'
    if (regPassword.length < 8) errs.password = 'Min 8 characters'
    if (regPassword !== confirmPassword) errs.confirm = 'Passwords don\'t match'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const { error } = await signUp(regEmail, regPassword, {
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      course: course.trim(),
      year: year ? parseInt(year) : null
    })

    if (error) {
      addToast(error.message, 'error')
      setLoading(false)
    } else {
      addToast('Verification email sent! Please check your inbox.', 'success')
      
      // Clear password field
      setRegPassword('')
      setConfirmPassword('')
      
      // Wait 3 seconds, then switch to login tab
      setTimeout(() => {
        setTab('login')
        setLoading(false)
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0A0A0F] text-white selection:bg-primary/30 font-sans">
      {/* Left Decoration / Marketing Side for Desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#12121A] to-[#0A0A0F] flex-col justify-center items-center overflow-hidden border-r border-white/5">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[130px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-accent-2/10 blur-[130px] rounded-full mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 p-16 max-w-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/25 cursor-pointer" onClick={() => navigate('/')}>H</div>
            <span className="font-heading text-3xl font-bold tracking-tight">HandyHub</span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="font-heading text-6xl font-black mb-8 leading-[1.1] tracking-tighter">
            Your Campus.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#A855F7] to-accent">Unlocked.</span>
          </motion.h1>
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-6">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="p-3 bg-accent/20 rounded-xl"><Sparkles className="text-accent" size={24} /></div>
              <div>
                <h3 className="font-bold text-lg">Earn Real Rewards</h3>
                <p className="text-white/50 text-sm">Turn your extra time into campus currency.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="p-3 bg-[#10B981]/20 rounded-xl"><ShieldCheck className="text-[#10B981]" size={24} /></div>
              <div>
                <h3 className="font-bold text-lg">100% Scam-Proof</h3>
                <p className="text-white/50 text-sm">Points are locked in escrow until the job is done.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="p-3 bg-primary/20 rounded-xl"><Gamepad2 className="text-primary" size={24} /></div>
              <div>
                <h3 className="font-bold text-lg">Gamified Experience</h3>
                <p className="text-white/50 text-sm">Level up, win elite badges, and climb leaderboards.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 block lg:hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-[80%] h-[50%] bg-primary/10 blur-[100px] rounded-full mix-blend-screen" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25">H</div>
            <span className="font-heading text-2xl font-bold tracking-tight">HandyHub</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl font-bold mb-2">{tab === 'login' ? 'Welcome Back' : 'Join the Economy'}</h2>
            <p className="text-white/50">{tab === 'login' ? 'Sign in to access your wallet and tasks.' : 'Create your secure HandyHub account.'}</p>
          </div>

          {/* Premium Tabs */}
          <div className="flex bg-[#1A1A23] p-1.5 rounded-2xl mb-8 border border-white/5 relative">
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#2A2A35] rounded-xl transition-transform duration-300 ease-in-out shadow-sm ${tab === 'register' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`} />
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-bold transition-colors relative z-10 capitalize ${tab === t ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">College Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="your@college.edu" required className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-white/70">Password</label>
                    <a href="#" className="text-xs font-bold text-primary hover:text-primary-hover transition-colors">Forgot?</a>
                  </div>
                  <input type={showLoginPass ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none pr-10" />
                  <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} className="absolute right-3 bottom-3 text-white/40 hover:text-white/80 transition-colors">
                    {showLoginPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold tracking-wide hover:shadow-[0_0_20px_rgba(124,111,247,0.4)] transition-all btn-press disabled:opacity-50 mt-4">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-2">Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none" />
                    {errors.fullName && <p className="text-danger text-xs mt-1 font-medium">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-2">Username</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="janedoe" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none" />
                    {errors.username && <p className="text-danger text-xs mt-1 font-medium">{errors.username}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">College Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jane@college.edu" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none" />
                  {errors.email && <p className="text-danger text-xs mt-1 font-medium">{errors.email}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-2">Course <span className="text-white/40 font-normal">(Opt)</span></label>
                    <input value={course} onChange={e => setCourse(e.target.value)} placeholder="CS, Business" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-2">Year <span className="text-white/40 font-normal">(Opt)</span></label>
                    <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none appearance-none focus:border-primary transition-all cursor-pointer">
                      <option value="" className="text-neutral-500">Select</option>
                      {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-white/70 mb-2">Password</label>
                  <input type={showRegPass ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min 8 characters" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none pr-10" />
                  <button type="button" onClick={() => setShowRegPass(!showRegPass)} className="absolute right-3 bottom-3 text-white/40 hover:text-white/80 transition-colors">
                    {showRegPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.password && <p className="text-danger text-xs mt-1 font-medium">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#1A1A23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-primary transition-all outline-none" />
                  {errors.confirm && <p className="text-danger text-xs mt-1 font-medium">{errors.confirm}</p>}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-accent text-bg py-4 rounded-xl font-extrabold tracking-wide hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all btn-press disabled:opacity-50 mt-6 text-lg">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
