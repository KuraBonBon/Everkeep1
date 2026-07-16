/* ── Shared formatting utilities ─────────────────────────────────
   Single source of truth for date/size formatting across all pages.
   ──────────────────────────────────────────────────────────────── */

export const pad = (n) => String(n).padStart(2, '0')

/** Returns today as a YYYY-MM-DD string (local time) */
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Mar 18, 2026"  — used by Dashboard, Artifacts, Journal */
export function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** "Mar 18"  — used by Finance (no year) */
export function fmtDateShort(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

/** "March 18, 2026"  — used by Timeline (long month) */
export function fmtDateLong(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

/** Human-readable file size, e.g. "1.4 MB" */
export function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** Days from today until dateStr (negative = past) */
export function daysUntil(dateStr) {
  const today = new Date(todayStr() + 'T00:00:00')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}
