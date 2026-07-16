/* ── Shared Framer Motion variants ───────────────────────────────
   Import these instead of redefining containerV / itemV per page.
   ──────────────────────────────────────────────────────────────── */

export const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

export const itemV = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
