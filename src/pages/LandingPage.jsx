import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Trophy, ChevronRight, Zap, Target, Users } from 'lucide-react'

const features = [
  { icon: <Zap className="text-accent" size={28} />, title: 'Earn Points Helping', desc: 'Complete tasks for fellow students and build your campus economy.' },
  { icon: <Shield className="text-[#10B981]" size={28} />, title: 'Scam-Proof Escrow', desc: 'Points are locked until the task is done. Zero trust issues.' },
  { icon: <Trophy className="text-primary" size={28} />, title: 'Compete & Win', desc: 'Unlock unique badges and climb the global campus leaderboard.' }
]

const steps = [
  { num: '01', title: 'Post a Task', desc: 'Describe what you need help with and set a point reward.' },
  { num: '02', title: 'Pick a Helper', desc: 'Students apply. Pick the best one for your task.' },
  { num: '03', title: 'Get It Done', desc: 'Helper completes the task and submits proof.' },
  { num: '04', title: 'Get Paid', desc: 'Approve the proof, and the platform pays out.' }
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white selection:bg-primary/30 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold shadow-lg shadow-primary/25">H</div>
            <span className="font-heading text-2xl font-bold tracking-tight">HandyHub</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/auth')} 
              className="hidden md:block text-sm font-medium text-text-muted hover:text-white transition-colors"
              style={{ padding: '0.5rem 1rem' }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform active:scale-95 shadow-xl"
              style={{ padding: '0.625rem 1.5rem' }}
            >
              Start Earning
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="px-6 mb-32 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 backdrop-blur-md uppercase tracking-wide text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse w-max" />
              Smart Campus Economy
            </div>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-[5rem] font-bold tracking-tighter leading-[1.05] mb-6">
              Your Campus.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#A855F7] to-accent">Your Economy.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 mb-10 leading-relaxed max-w-lg">
              Turn every act of helping into real currency on campus. Post tasks, earn points, unlock elite badges, and build your reputation.
            </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-12">
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto bg-primary text-white rounded-full text-lg font-bold hover:bg-primary-hover hover:shadow-[0_0_30px_rgba(124,111,247,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ padding: '1rem 2rem' }}
            >
              Get Started Free <ArrowRight size={20} />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white rounded-full text-lg font-medium transition-all flex items-center justify-center gap-2 backdrop-blur-md border border-white/5"
              style={{ padding: '1rem 2rem' }}
            >
              How It Works
            </a>
          </div>
          </motion.div>

          {/* Floating Hero Visuals */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block h-[500px]"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/10 blur-3xl rounded-full opacity-50" />
            
            {/* Mock Task Card 1 */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute top-10 left-0 w-80 bg-[#1A1A23]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-20"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-md">Study Help</span>
                <span className="font-heading font-black text-xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">🪙 250</span>
              </div>
              <h3 className="font-bold text-lg mb-2 leading-tight">Exam Prep Tutor Needed</h3>
              <p className="text-xs text-white/50 line-clamp-2">Need someone to explain Data Structures before the midterm tomorrow!</p>
            </motion.div>

             {/* Mock Task Card 2 */}
            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-10 right-0 w-72 bg-[#1A1A23]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-30"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-black uppercase tracking-wider rounded-md">Physical</span>
                <span className="font-heading font-black text-xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">🪙 150</span>
              </div>
              <h3 className="font-bold text-base mb-2 leading-tight">Help carrying boxes</h3>
              <p className="text-xs text-white/50 line-clamp-2">Moving dorms. Just need 30 mins of help.</p>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24 bg-white/[0.02] border-y border-white/5 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">Why use HandyHub?</h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">
                Built strictly for students to trade help, securely and instantly.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="bg-[#1A1A23] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
                  <div className="bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3">{f.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-32 mt-12 max-w-7xl mx-auto relative z-20">
          <div className="text-center mb-24">
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
              How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Works</span>
            </h2>
            <p className="text-lg text-white/50">Four simple steps to campus supremacy.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
            <div className="hidden lg:block absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 z-0" />

            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative text-center bg-[#1A1A23]/50 p-8 rounded-3xl border border-white/5 lg:border-none lg:bg-transparent lg:p-0 z-10"
              >
                <div className="w-14 h-14 rounded-full bg-[#1A1A23] border-2 border-primary/30 text-primary font-heading text-xl font-bold flex items-center justify-center mx-auto mb-6 relative z-10 shadow-[0_0_15px_rgba(124,111,247,0.2)]">
                  {s.num}
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-[200px] mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats Banner */}
        <section className="px-6 py-10 mt-20 mb-32 max-w-7xl mx-auto z-20 relative">
          <div className="bg-gradient-to-r from-primary/20 via-[#A855F7]/20 to-accent/20 rounded-[2.5rem] p-1 shadow-2xl">
            <div className="bg-[#0A0A0F] rounded-[2.4rem] py-16 px-8 grid sm:grid-cols-3 gap-10 text-center backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
              {[
                { value: '1,000', label: 'Starting Points' },
                { value: '14', label: 'Target Badges' },
                { value: '100%', label: 'Scam-Proof' }
              ].map(s => (
                <div key={s.label} className="relative z-10">
                  <p className="font-heading text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-md">{s.value}</p>
                  <p className="text-white/50 font-medium tracking-wide uppercase text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-32 pt-10 max-w-4xl mx-auto text-center relative z-20">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">Ready to join?</h2>
          <p className="text-lg md:text-xl text-white/50 mb-10">Sign up now and get <strong className="text-accent">1,000 bonus points</strong> instantly.</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-white text-black px-12 py-5 rounded-full text-lg font-bold hover:scale-105 transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] focus:outline-none block mx-auto"
            style={{ padding: '1.25rem 3rem' }}
          >
            Create Free Account
          </button>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-white/40 text-sm bg-black/20">
        <p>© {new Date().getFullYear()} HandyHub 3.0. Built for the modern student.</p>
      </footer>
    </div>
  )
}
