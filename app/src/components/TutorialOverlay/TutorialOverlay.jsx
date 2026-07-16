import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineX,
  HiOutlineCursorClick,
} from 'react-icons/hi'
import useTutorialStore from '../../stores/useTutorialStore'
import './TutorialOverlay.css'

export default function TutorialOverlay() {
  const navigate = useNavigate()
  const active = useTutorialStore((s) => s.tutorialActive)
  const step = useTutorialStore((s) => s.currentStep)
  const activeSteps = useTutorialStore((s) => s.activeSteps)
  const next = useTutorialStore((s) => s.nextStep)
  const prev = useTutorialStore((s) => s.prevStep)
  const skip = useTutorialStore((s) => s.skipTutorial)

  const [spotlightRect, setSpotlightRect] = useState(null)
  const current = activeSteps[step]
  const isClickStep = current?.type === 'click'

  /* Auto-navigate to the step's designated route */
  useEffect(() => {
    if (!active || !current?.route) return
    navigate(current.route)
  }, [active, step, current, navigate])

  /* Measure the target element's position */
  const measureTarget = useCallback(() => {
    if (!current?.target) { setSpotlightRect(null); return }
    const el = document.querySelector(current.target)
    if (!el) { setSpotlightRect(null); return }
    const r = el.getBoundingClientRect()
    setSpotlightRect({
      x: r.left - 6,
      y: r.top - 6,
      w: r.width + 12,
      h: r.height + 12,
    })
  }, [current])

  useEffect(() => {
    if (!active) return
    /* Brief delay so page transitions settle before measuring */
    const timer = setTimeout(measureTarget, 120)
    window.addEventListener('resize', measureTarget)
    return () => { clearTimeout(timer); window.removeEventListener('resize', measureTarget) }
  }, [active, step, measureTarget])

  /* Keyboard: Escape always skips; arrows/Enter only for info steps */
  useEffect(() => {
    if (!active) return
    const handler = (e) => {
      if (e.key === 'Escape') skip()
      if (isClickStep) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, isClickStep, next, prev, skip])

  if (!active || !current) return null

  const isCenter = !spotlightRect
  const isFirst = step === 0
  const isLast = step === activeSteps.length - 1
  const progress = ((step + 1) / activeSteps.length) * 100

  /* Click-zone handler for interactive steps */
  const handleClickZone = () => {
    if (current.navigateTo) navigate(current.navigateTo)
    setTimeout(() => next(), 150)
  }

  /* Tooltip position */
  const tooltipStyle = {}
  if (spotlightRect) {
    if (current.position === 'right') {
      tooltipStyle.left = spotlightRect.x + spotlightRect.w + 18
      tooltipStyle.top = spotlightRect.y + spotlightRect.h / 2
      tooltipStyle.transform = 'translateY(-50%)'
    } else if (current.position === 'bottom') {
      tooltipStyle.left = spotlightRect.x + spotlightRect.w / 2
      tooltipStyle.top = spotlightRect.y + spotlightRect.h + 18
      tooltipStyle.transform = 'translateX(-50%)'
    } else if (current.position === 'left') {
      tooltipStyle.right = window.innerWidth - spotlightRect.x + 18
      tooltipStyle.top = spotlightRect.y + spotlightRect.h / 2
      tooltipStyle.transform = 'translateY(-50%)'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* SVG mask — dark overlay with spotlight cutout */}
        <svg className="tutorial-overlay__mask" width="100%" height="100%">
          <defs>
            <mask id="tutorial-spotlight">
              <rect width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.x}
                  y={spotlightRect.y}
                  width={spotlightRect.w}
                  height={spotlightRect.h}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tutorial-spotlight)"
          />
          {/* Glow ring around target */}
          {spotlightRect && (
            <rect
              x={spotlightRect.x - 2}
              y={spotlightRect.y - 2}
              width={spotlightRect.w + 4}
              height={spotlightRect.h + 4}
              rx="14"
              fill="none"
              stroke="rgba(129,140,248,0.5)"
              strokeWidth="2"
              className={`tutorial-overlay__glow-ring ${isClickStep ? 'tutorial-overlay__glow-ring--click' : ''}`}
            />
          )}
        </svg>

        {/* Transparent click-zone over the target for interactive steps */}
        {isClickStep && spotlightRect && (
          <div
            className="tutorial-overlay__click-zone"
            style={{
              left: spotlightRect.x,
              top: spotlightRect.y,
              width: spotlightRect.w,
              height: spotlightRect.h,
            }}
            onClick={handleClickZone}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          key={step}
          className={`tutorial-tooltip ${isCenter ? 'tutorial-tooltip--center' : ''}`}
          style={isCenter ? {} : tooltipStyle}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Step counter + skip */}
          <div className="tutorial-tooltip__top">
            <span className="tutorial-tooltip__counter">
              {step + 1} / {activeSteps.length}
            </span>
            <button className="tutorial-tooltip__skip" onClick={skip}>
              Skip tour <HiOutlineX size={14} />
            </button>
          </div>

          <h3 className="tutorial-tooltip__title">{current.title}</h3>
          <div className="tutorial-tooltip__body">
            {current.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {/* Progress bar */}
          <div className="tutorial-tooltip__progress-track">
            <motion.div
              className="tutorial-tooltip__progress"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Navigation */}
          <div className="tutorial-tooltip__nav">
            {!isFirst ? (
              <button className="tutorial-tooltip__btn tutorial-tooltip__btn--back" onClick={prev}>
                <HiOutlineArrowLeft size={14} /> Back
              </button>
            ) : (
              <div />
            )}

            {isClickStep ? (
              <div className="tutorial-tooltip__click-hint">
                <HiOutlineCursorClick size={16} />
                <span>Click the highlighted element</span>
              </div>
            ) : (
              <button className="tutorial-tooltip__btn tutorial-tooltip__btn--next" onClick={next}>
                {isLast ? 'Finish Tour' : 'Next'} {!isLast && <HiOutlineArrowRight size={14} />}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
