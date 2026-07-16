import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineAcademicCap,
  HiOutlinePencilAlt,
  HiOutlineArchive,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCash,
  HiOutlineArrowRight,
  HiOutlineViewGrid,
} from 'react-icons/hi'
import useProfileStore from '../../stores/useProfileStore'
import useTutorialStore from '../../stores/useTutorialStore'
import './Onboarding.css'

const ROLES = ['Student', 'Faculty', 'Staff', 'Alumni', 'Other']

const FEATURES = [
  { icon: HiOutlineViewGrid, title: 'Dashboard', desc: 'Everything at a glance', color: '#c084fc' },
  { icon: HiOutlinePencilAlt, title: 'Journal', desc: 'Daily reflections & notes', color: '#818cf8' },
  { icon: HiOutlineArchive, title: 'Artifacts', desc: 'Documents & files vault', color: '#34d399' },
  { icon: HiOutlineClock, title: 'Timeline', desc: 'Milestones & deadlines', color: '#fbbf24' },
  { icon: HiOutlineSparkles, title: 'AI Insights', desc: 'Smart analysis of your work', color: '#f472b6' },
  { icon: HiOutlineCash, title: 'Finance', desc: 'Budget & expense tracking', color: '#60a5fa' },
]

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [role, setRole] = useState('Student')

  const updateProfile = useProfileStore((s) => s.updateProfile)
  const completeOnboarding = useTutorialStore((s) => s.completeOnboarding)

  const goNext = () => {
    setDirection(1)
    setStep((s) => s + 1)
  }

  const handleProfileSubmit = () => {
    const trimmed = name.trim()
    if (trimmed) {
      const initials = trimmed.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
      updateProfile({ fullName: trimmed, role, avatarInitials: initials })
    } else {
      updateProfile({ role })
    }
    goNext()
  }

  const handleFinish = (startTour) => completeOnboarding(startTour)

  const totalSteps = 3

  return (
    <div className="onboarding">
      {/* Background effects */}
      <div className="onboarding__glow onboarding__glow--1" />
      <div className="onboarding__glow onboarding__glow--2" />
      <div className="onboarding__glow onboarding__glow--3" />

      {/* Progress dots */}
      <div className="onboarding__dots">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''} ${i < step ? 'onboarding__dot--done' : ''}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* ── Step 0: Welcome ─────────────────── */}
        {step === 0 && (
          <motion.div
            key="welcome"
            className="onboarding__slide"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="onboarding__icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <HiOutlineAcademicCap size={64} />
            </motion.div>

            <h1 className="onboarding__title">Welcome to Everkeep</h1>
            <p className="onboarding__subtitle">
              Your personal academic companion — journal, plan, store, and grow.
            </p>

            <button className="onboarding__btn onboarding__btn--primary" onClick={goNext}>
              Get Started <HiOutlineArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ── Step 1: Profile Setup ───────────── */}
        {step === 1 && (
          <motion.div
            key="profile"
            className="onboarding__slide"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="onboarding__title onboarding__title--sm">Tell us about yourself</h2>
            <p className="onboarding__subtitle">
              This personalizes your experience. You can always update it later in Settings.
            </p>

            <div className="onboarding__form">
              <label className="onboarding__label">
                What should we call you?
                <input
                  className="onboarding__input"
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={60}
                />
              </label>

              <label className="onboarding__label">
                Your role
                <div className="onboarding__roles">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`onboarding__role-btn ${role === r ? 'onboarding__role-btn--active' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <button className="onboarding__btn onboarding__btn--primary" onClick={handleProfileSubmit}>
              Continue <HiOutlineArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Feature Overview + Finish ── */}
        {step === 2 && (
          <motion.div
            key="overview"
            className="onboarding__slide"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="onboarding__title onboarding__title--sm">Here&apos;s what you can do</h2>
            <p className="onboarding__subtitle">
              Everkeep is packed with tools to organize your academic life.
            </p>

            <div className="onboarding__features">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="onboarding__feature-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <div
                    className="onboarding__feature-icon"
                    style={{ color: f.color, background: `${f.color}15` }}
                  >
                    <f.icon size={22} />
                  </div>
                  <div>
                    <div className="onboarding__feature-title">{f.title}</div>
                    <div className="onboarding__feature-desc">{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="onboarding__actions">
              <button
                className="onboarding__btn onboarding__btn--primary"
                onClick={() => handleFinish(true)}
              >
                Take the Guided Tour <HiOutlineArrowRight size={18} />
              </button>
              <button
                className="onboarding__btn onboarding__btn--ghost"
                onClick={() => handleFinish(false)}
              >
                Skip — I&apos;ll explore on my own
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
