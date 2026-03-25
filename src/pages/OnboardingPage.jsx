import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import PointsDisplay from '../components/ui/PointsDisplay'
import { Check, ChevronRight, ArrowLeft } from 'lucide-react'

const skillOptions = [
  { id: 'coding', label: 'Coding & IT', emoji: '💻', desc: 'Programming, websites, tech setup' },
  { id: 'study', label: 'Study Tutoring', emoji: '📚', desc: 'Exam prep, essays, math help' },
  { id: 'physical', label: 'Physical Labor', emoji: '🏃', desc: 'Moving boxes, furniture, errands' },
  { id: 'creative', label: 'Creative Work', emoji: '🎨', desc: 'Design, video editing, photography' },
  { id: 'event', label: 'Event Help', emoji: '🎉', desc: 'Setup, promotion, management' },
  { id: 'tech', label: 'Tech Repair', emoji: '🔧', desc: 'Fixing phones, laptops, electronics' }
]

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
  const [skills, setSkills] = useState([])
  const [availability, setAvailability] = useState('anytime')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleSkill = (id) => setSkills(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])

  const withTimeout = (promise, ms, name) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`[Network Hang] ${name} timed out after ${ms/1000}s. Your firewall/network might be blocking requests to the database.`)), ms))
    ])
  }

  const handleComplete = async () => {
    try {
      console.log("[Onboarding] Starting completion...")
      setLoading(true)
      const metadata = user?.user_metadata || {}

      // Upsert profile: handles both new users (INSERT) and re-submitters (UPDATE).
      // Critically sets onboarding_completed = true so the redirect logic never
      // sends this user back to /onboarding again.
      const { error: upsertError } = await withTimeout(
        supabase.from('profiles').upsert({
          id: user.id,
          full_name: metadata.full_name || 'Student',
          username: metadata.username || `user_${Date.now()}`,
          college_email: user.email,
          course: metadata.course || null,
          year: metadata.year ? parseInt(metadata.year, 10) : null,
          skills,
          availability,
          bio: bio ? bio.trim() : null,
          points_balance: 1000,
          onboarding_completed: true, // <-- THE KEY FLAG
        }, { onConflict: 'id' }),
        8000,
        'Profile Upsert'
      )

      if (upsertError) {
        console.error("[Onboarding] Upsert error:", upsertError)
        addToast(upsertError.message, 'error')
        setLoading(false)
        return
      }

      // Insert welcome bonus (best-effort — don't block navigation if it fails)
      supabase.from('point_transactions').insert({
        user_id: user.id,
        type: 'bonus',
        amount: 1000,
        description: 'Welcome bonus'
      }).then(({ error }) => {
        if (error) console.warn("[Onboarding] Bonus point insert warning:", error)
      })

      // Refresh AuthContext so ProtectedRoute reads the updated onboarding_completed
      await withTimeout(refreshProfile(), 8000, 'Context Refresh')

      addToast('Welcome to HandyHub! 🎉', 'success')
      navigate('/feed')
      setLoading(false)

    } catch (err) {
      console.error('[Onboarding] Exception:', err)
      addToast(err.message || 'An unexpected error occurred', 'error')
      setLoading(false)
    }
  }

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95 })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/15 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="w-full max-w-2xl z-10">
        {/* Header & Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(124,111,247,0.3)]">H</div>
            <span className="font-heading text-2xl font-bold tracking-tight">HandyHub</span>
          </div>

          <div className="flex justify-between items-center max-w-md mx-auto relative hidden sm:flex">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 w-full z-0" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary transition-all duration-500 z-0" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            
            {[1, 2, 3].map(num => (
              <div key={num} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${step >= num ? 'bg-primary text-white shadow-[0_0_15px_rgba(124,111,247,0.5)]' : 'bg-[#1A1A23] text-white/40 border border-white/10'}`}>
                {step > num ? <Check size={18} /> : num}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-[#1A1A23]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait" custom={step}>
            
            {/* STEP 1: SKILLS */}
            {step === 1 && (
              <motion.div key="1" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, type: "spring", bounce: 0.2 }} className="flex-1 flex flex-col">
                <div className="mb-8 text-center">
                  <h2 className="font-heading text-3xl font-bold mb-3">Your Campus Superpowers.</h2>
                  <p className="text-white/50">Select what you're good at. You can pick multiple.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-10 flex-1 content-start">
                  {skillOptions.map(s => {
                    const selected = skills.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSkill(s.id)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all group ${selected ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,111,247,0.15)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-3xl transition-transform ${selected ? 'scale-110' : 'group-hover:scale-110'}`}>{s.emoji}</div>
                          <div>
                            <h3 className={`font-bold ${selected ? 'text-primary' : 'text-white'}`}>{s.label}</h3>
                            <p className="text-xs text-white/40 mt-1">{s.desc}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => skills.length > 0 && setStep(2)}
                  disabled={skills.length === 0}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold tracking-wide hover:shadow-[0_0_20px_rgba(124,111,247,0.4)] transition-all btn-press disabled:opacity-30 disabled:hover:shadow-none flex items-center justify-center gap-2 mt-auto"
                >
                  Next Step <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {/* STEP 2: AVAILABILITY & BIO */}
            {step === 2 && (
              <motion.div key="2" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, type: "spring", bounce: 0.2 }} className="flex-1 flex flex-col">
                <button onClick={() => setStep(1)} className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors p-2 -ml-2"><ArrowLeft size={24} /></button>
                
                <div className="mb-10 text-center px-12">
                  <h2 className="font-heading text-3xl font-bold mb-3">Tell us about yourself.</h2>
                  <p className="text-white/50">Details help you get picked for tasks.</p>
                </div>

                <div className="space-y-8 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-white/70 mb-4">When are you usually free?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['morning', 'evening', 'anytime'].map(a => (
                        <button
                          key={a}
                          onClick={() => setAvailability(a)}
                          className={`py-4 rounded-2xl font-bold text-sm capitalize transition-all border-2 ${availability === a ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(124,111,247,0.2)]' : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'}`}
                        >
                          <div className="text-2xl mb-2">{a === 'morning' ? '🌅' : a === 'evening' ? '🌙' : '⚡'}</div>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-white/70">A short bio</label>
                      <span className="text-xs font-bold text-white/30">{bio.length}/120</span>
                    </div>
                    <textarea
                      value={bio}
                      onChange={e => e.target.value.length <= 120 && setBio(e.target.value)}
                      placeholder="I'm a sophomore CS major. I build keyboards and love helping with math!"
                      rows={4}
                      className="w-full bg-[#0A0A0F] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (skills.length === 0) {
                      addToast('Please select at least 1 skill', 'error')
                      return
                    }
                    setStep(3)
                  }}
                  className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all mt-auto flex items-center justify-center gap-2 ${skills.length === 0 ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-primary text-white hover:shadow-[0_0_20px_rgba(124,111,247,0.4)] btn-press'}`}
                >
                  {skills.length === 0 ? 'Select at least 1 skill' : 'Final Step'} <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {/* STEP 3: WELCOME */}
            {step === 3 && (
              <motion.div key="3" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: "spring" }} className="flex-1 flex flex-col items-center justify-center text-center">
                
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12, delay: 0.2 }} className="w-32 h-32 mb-8 relative">
                   <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-40 animate-pulse" />
                   <div className="relative w-full h-full bg-gradient-to-br from-yellow-300 via-accent to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] border-4 border-white/20">
                     <span className="text-6xl font-black text-white drop-shadow-md">H</span>
                   </div>
                </motion.div>

                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-heading text-4xl font-bold mb-3">
                  You're all set!
                </motion.h2>
                
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-white/50 text-lg mb-10 max-w-sm">
                  We've deposited a welcome bonus into your secure wallet.
                </motion.p>

                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: 'spring' }} className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-12 backdrop-blur-md inline-block relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full bg-accent/10 blur-[50px]" />
                  <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Starting Balance</p>
                  <div className="relative z-10">
                    <PointsDisplay amount={1000} size="lg" animated />
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all btn-press disabled:opacity-50 mt-auto"
                >
                  {loading ? 'Entering Campus...' : 'Enter the Economy'}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
