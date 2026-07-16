import { motion } from 'framer-motion'
import { HiOutlineAcademicCap } from 'react-icons/hi'
import './LoadingScreen.css'

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.5 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

const TITLE = 'Everkeep'

export default function LoadingScreen({ onDone }) {
  return (
    <motion.div
      className="loading-screen"
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      {/* Ambient glow blobs */}
      <div className="loading-screen__glow loading-screen__glow--1" />
      <div className="loading-screen__glow loading-screen__glow--2" />

      {/* Icon */}
      <motion.div
        className="loading-screen__icon"
        initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <HiOutlineAcademicCap size={56} />
      </motion.div>

      {/* Title — per-letter staggered reveal */}
      <h1 className="loading-screen__title" aria-label={TITLE}>
        {TITLE.split('').map((ch, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={letterVariants}
            initial="hidden"
            animate="visible"
            className={ch === ' ' ? 'loading-screen__space' : undefined}
          >
            {ch}
          </motion.span>
        ))}
      </h1>

      {/* Tagline */}
      <motion.p
        className="loading-screen__sub"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        Your academic life, organized.
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="loading-screen__bar-track"
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 240 }}
        transition={{ delay: 0.9, duration: 0.3 }}
      >
        <motion.div
          className="loading-screen__bar"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.4, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={onDone}
        />
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="loading-screen__particle"
          style={{
            left: `${15 + i * 14}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2.5 + i * 0.4}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{
            delay: 0.8 + i * 0.2,
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
      ))}
    </motion.div>
  )
}
